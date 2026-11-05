import { createServer } from 'node:http';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, audit, getDashboard, recordIntegrationError } from './lib/database.mjs';
import { processIntegrationEvent } from './lib/integration.mjs';
import { PayloadError, validateEnvelope } from './lib/validation.mjs';
import { createAgentProposal } from './lib/agent.mjs';
import { sendTelegram, telegramClientMessage } from './lib/telegram.mjs';
import { demoEvents } from './lib/demo-data.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = resolve(process.env.DATA_DIR || join(ROOT, 'data'));
const DB_FILE = join(DATA_DIR, 'sensoria-operations.sqlite');

const ENV = {
  PORT: Number(process.env.PORT || 8080),
  ADMIN_USER: process.env.ADMIN_USER || 'admin@sensoria.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  INTEGRATION_SHARED_SECRET: process.env.INTEGRATION_SHARED_SECRET || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_REVIEW_CHAT_ID: process.env.TELEGRAM_REVIEW_CHAT_ID || '',
  TELEGRAM_CLIENT_CHAT_ID: process.env.TELEGRAM_CLIENT_CHAT_ID || '',
  FRONTOFFICE_URL: process.env.FRONTOFFICE_URL || 'https://www.sensoria.onl',
  SEED_DEMO_DATA: String(process.env.SEED_DEMO_DATA || '').toLowerCase() === 'true'
};

if (!ENV.ADMIN_PASSWORD || !ENV.INTEGRATION_SHARED_SECRET) {
  throw new Error('Configura ADMIN_PASSWORD e INTEGRATION_SHARED_SECRET antes de iniciar Operations.');
}

const db = openDatabase(DB_FILE);
if (ENV.SEED_DEMO_DATA && db.prepare('SELECT COUNT(*) total FROM integration_events').get().total === 0) {
  for (const event of demoEvents) processIntegrationEvent(db, event);
  console.log('Escenarios academicos de demostracion cargados.');
}
const sessions = new Map();
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp'
};

function secureHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
}

function json(res, status, data) {
  secureHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data, (_, value) => typeof value === 'bigint' ? Number(value) : value));
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [decodeURIComponent(index >= 0 ? part.slice(0, index) : part), decodeURIComponent(index >= 0 ? part.slice(index + 1) : '')];
  }));
}

function sessionUser(req) {
  const token = parseCookies(req).sensoria_ops_session;
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  return session.user;
}

function requireAuth(req, res) {
  const user = sessionUser(req);
  if (!user) {
    json(res, 401, { error: 'AUTH_REQUIRED', message: 'Inicia sesion para acceder al back-office' });
    return null;
  }
  return user;
}

async function readBody(req, maxBytes = 1_000_000) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > maxBytes) throw new PayloadError('PAYLOAD_TOO_LARGE', 'El payload supera el limite permitido');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function verifySignature(raw, signature) {
  if (!ENV.INTEGRATION_SHARED_SECRET) return false;
  const expected = createHmac('sha256', ENV.INTEGRATION_SHARED_SECRET).update(raw).digest('hex');
  const received = String(signature || '').replace(/^sha256=/, '');
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

function listOrders() {
  return db.prepare(`SELECT o.*,c.name customer_name,c.email customer_email,
    (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) item_count
    FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC`).all().map(order => ({
      ...order,
      items: db.prepare(`SELECT product_external_id,sku,product_name,quantity,unit_price,
        quantity*unit_price line_total FROM order_items WHERE order_id=? ORDER BY id`).all(order.id)
    }));
}

function listCases() {
  return db.prepare(`SELECT ca.*,c.name customer_name,c.email customer_email,o.order_number,
    (SELECT COUNT(*) FROM agent_proposals ap WHERE ap.case_id=ca.id) proposal_count
    FROM cases ca LEFT JOIN customers c ON c.id=ca.customer_id
    LEFT JOIN orders o ON o.id=ca.order_id ORDER BY ca.id DESC`).all();
}

function listProposals() {
  return db.prepare(`SELECT ap.*,ca.external_id case_reference,ca.subject,c.name customer_name,c.email customer_email,o.order_number
    FROM agent_proposals ap JOIN cases ca ON ca.id=ap.case_id
    LEFT JOIN customers c ON c.id=ca.customer_id LEFT JOIN orders o ON o.id=ca.order_id
    ORDER BY ap.id DESC`).all().map(row => ({
      ...row,
      consulted_data: JSON.parse(row.consulted_data_json || '{}'),
      risks: JSON.parse(row.risks_json || '[]')
    }));
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = resolve(PUBLIC_DIR, '.' + requested);
  if (!file.startsWith(PUBLIC_DIR)) return false;
  try {
    if (!statSync(file).isFile()) return false;
    secureHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', mime[extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', extname(file) === '.html' ? 'no-cache' : 'public, max-age=300');
    res.end(readFileSync(file));
    return true;
  } catch {
    return false;
  }
}

async function handleApi(req, res, url) {
  const { pathname } = url;

  if (pathname === '/api/health' && req.method === 'GET') {
    return json(res, 200, {
      status: 'ok', service: 'sensoria-operations', version: '2.0.0',
      database: 'ready', academic_prototype: true,
      agent_mode: ENV.GEMINI_API_KEY ? 'GEMINI_SUPERVISED' : 'CONTINGENCY_RULES',
      telegram_mode: ENV.TELEGRAM_BOT_TOKEN ? 'CONFIGURED' : 'SIMULATED'
    });
  }

  if (pathname === '/api/auth/session' && req.method === 'GET') {
    return json(res, 200, { user: sessionUser(req) });
  }

  if (pathname === '/api/auth/config' && req.method === 'GET') {
    return json(res, 200, { login_email: ENV.ADMIN_USER });
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    const submittedUser = String(body.email || '').trim().toLowerCase();
    const submittedHash = scryptSync(String(body.password || ''), 'sensoria-operations-demo', 32);
    const expectedHash = scryptSync(ENV.ADMIN_PASSWORD, 'sensoria-operations-demo', 32);
    if (submittedUser !== ENV.ADMIN_USER.toLowerCase() || !timingSafeEqual(submittedHash, expectedHash)) {
      audit(db, { actorType: 'USER', actorId: submittedUser || 'unknown', action: 'login.failed', entityType: 'session', details: {} });
      return json(res, 401, { error: 'INVALID_CREDENTIALS', message: 'Correo o contrasena incorrectos' });
    }
    const token = randomBytes(32).toString('hex');
    const user = { email: ENV.ADMIN_USER, role: 'ADMIN', name: 'Equipo Sensoria' };
    sessions.set(token, { user, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    secureHeaders(res);
    res.setHeader('Set-Cookie', `sensoria_ops_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
    audit(db, { actorType: 'USER', actorId: user.email, action: 'login.success', entityType: 'session', details: {} });
    return json(res, 200, { user });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = parseCookies(req).sensoria_ops_session;
    if (token) sessions.delete(token);
    secureHeaders(res);
    res.setHeader('Set-Cookie', 'sensoria_ops_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/integrations/events' && req.method === 'POST') {
    const raw = await readBody(req);
    let parsed = {};
    try { parsed = JSON.parse(raw.toString('utf8')); } catch { throw new PayloadError('INVALID_JSON', 'JSON no valido'); }
    if (!verifySignature(raw, req.headers['x-sensoria-signature'])) {
      recordIntegrationError(db, parsed, 'INVALID_SIGNATURE', 'Firma HMAC ausente o no valida');
      return json(res, 401, { error: 'INVALID_SIGNATURE', message: 'Firma de integracion no valida' });
    }
    const event = validateEnvelope({ ...parsed, idempotency_key: req.headers['x-idempotency-key'] || parsed.idempotency_key });
    try {
      const result = processIntegrationEvent(db, event);
      return json(res, result.duplicate ? 200 : 201, { ok: true, ...result, trace_id: event.event_id });
    } catch (error) {
      return json(res, error instanceof PayloadError ? 422 : 500, {
        error: error.code || 'PROCESSING_ERROR', message: error.message,
        details: error.details || [], trace_id: event.event_id
      });
    }
  }

  const user = requireAuth(req, res);
  if (!user) return;

  if (pathname === '/api/config' && req.method === 'GET') {
    return json(res, 200, {
      academic_prototype: true,
      frontoffice_url: ENV.FRONTOFFICE_URL,
      agent_mode: ENV.GEMINI_API_KEY ? 'GEMINI_SUPERVISED' : 'CONTINGENCY_RULES',
      telegram_mode: ENV.TELEGRAM_BOT_TOKEN ? 'CONFIGURED' : 'SIMULATED',
      human_review_required: true
    });
  }
  if (pathname === '/api/dashboard' && req.method === 'GET') return json(res, 200, getDashboard(db));
  if (pathname === '/api/orders' && req.method === 'GET') return json(res, 200, { orders: listOrders() });
  if (pathname === '/api/cases' && req.method === 'GET') return json(res, 200, { cases: listCases() });
  if (pathname === '/api/agent/proposals' && req.method === 'GET') return json(res, 200, { proposals: listProposals() });
  if (pathname === '/api/integrations' && req.method === 'GET') {
    return json(res, 200, { integrations: db.prepare('SELECT * FROM integration_events ORDER BY id DESC LIMIT 200').all() });
  }
  if (pathname === '/api/audit' && req.method === 'GET') {
    return json(res, 200, { audit: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all() });
  }
  if (pathname === '/api/sync-tasks' && req.method === 'GET') {
    return json(res, 200, { tasks: db.prepare('SELECT * FROM sync_tasks ORDER BY id DESC LIMIT 200').all() });
  }

  let match = pathname.match(/^\/api\/orders\/(\d+)\/status$/);
  if (match && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    const allowed = new Set(['PAGO_SIMULADO','PREPARACION','ENVIADO','ENTREGADO','CANCELADO']);
    const status = String(body.status || '').toUpperCase();
    if (!allowed.has(status)) return json(res, 422, { error: 'INVALID_STATUS', message: 'Estado no valido' });
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(Number(match[1]));
    if (!order) return json(res, 404, { error: 'NOT_FOUND', message: 'Pedido no encontrado' });
    db.prepare('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, order.id);
    const task = db.prepare(`INSERT INTO sync_tasks(entity_type,entity_id,action,target_system,payload_json)
      VALUES('order',?,'order.status_changed','sensoria-frontoffice',?)`).run(
      String(order.external_id), JSON.stringify({ order_id: order.external_id, order_number: order.order_number, status })
    );
    audit(db, { actorType: 'USER', actorId: user.email, action: 'order.status.proposed_sync', entityType: 'order', entityId: order.id, details: { status, sync_task_id: Number(task.lastInsertRowid) } });
    return json(res, 200, { ok: true, status, sync_task_id: Number(task.lastInsertRowid), sync_status: 'PENDING' });
  }

  match = pathname.match(/^\/api\/cases\/(\d+)\/analyze$/);
  if (match && req.method === 'POST') {
    const proposal = await createAgentProposal(db, Number(match[1]), ENV);
    return json(res, 201, { proposal });
  }

  match = pathname.match(/^\/api\/agent\/proposals\/(\d+)\/(approve|reject)$/);
  if (match && req.method === 'POST') {
    const proposal = db.prepare('SELECT * FROM agent_proposals WHERE id=?').get(Number(match[1]));
    if (!proposal) return json(res, 404, { error: 'NOT_FOUND', message: 'Propuesta no encontrada' });
    if (proposal.status !== 'PENDIENTE_REVISION') return json(res, 409, { error: 'ALREADY_REVIEWED', message: 'La propuesta ya fue revisada' });
    const supportCase = db.prepare('SELECT * FROM cases WHERE id=?').get(proposal.case_id);
    if (match[2] === 'reject') {
      db.prepare(`UPDATE agent_proposals SET status='RECHAZADA',reviewer=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?`).run(user.email, proposal.id);
      audit(db, { actorType: 'USER', actorId: user.email, action: 'proposal.rejected', entityType: 'agent_proposal', entityId: proposal.id, details: { case_id: supportCase.id } });
      return json(res, 200, { ok: true, status: 'RECHAZADA' });
    }
    const customer = supportCase.customer_id ? db.prepare('SELECT * FROM customers WHERE id=?').get(supportCase.customer_id) : null;
    const chatId = customer?.telegram_chat_id || ENV.TELEGRAM_CLIENT_CHAT_ID;
    const result = await sendTelegram({ token: ENV.TELEGRAM_BOT_TOKEN, chatId, text: telegramClientMessage(supportCase, proposal) });
    const finalStatus = result.status === 'SENT' ? 'EJECUTADA' : result.status === 'SIMULATED' ? 'EJECUTADA_SIMULADA' : 'APROBADA';
    db.prepare('UPDATE agent_proposals SET status=?,reviewer=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?').run(finalStatus, user.email, proposal.id);
    db.prepare(`INSERT INTO notifications(case_id,channel,recipient,body,status,provider_id,error_message)
      VALUES(?,'TELEGRAM',?,?,?,?,?)`).run(supportCase.id, chatId || 'SIMULATED_CLIENT', proposal.response_draft, result.status, result.provider_id, result.error);
    db.prepare(`INSERT INTO case_messages(case_id,direction,channel,body,delivery_status)
      VALUES(?,'OUT','TELEGRAM',?,?)`).run(supportCase.id, proposal.response_draft, result.status);
    audit(db, { actorType: 'USER', actorId: user.email, action: 'proposal.approved', entityType: 'agent_proposal', entityId: proposal.id, details: { case_id: supportCase.id, telegram_status: result.status } });
    return json(res, 200, { ok: true, status: finalStatus, notification: result });
  }

  return json(res, 404, { error: 'NOT_FOUND', message: 'Ruta API no encontrada' });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (serveStatic(req, res, url.pathname)) return;
    if (serveStatic(req, res, '/index.html')) return;
    json(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    const status = error instanceof SyntaxError || error instanceof PayloadError ? 400 : 500;
    json(res, status, { error: error.code || 'SERVER_ERROR', message: error.message || 'Error interno', details: error.details || [] });
  }
});

server.listen(ENV.PORT, '0.0.0.0', () => {
  console.log(`Sensoria Operations escuchando en http://0.0.0.0:${ENV.PORT}`);
  console.log(`Base de datos: ${DB_FILE}`);
});

export { server, db, ENV };

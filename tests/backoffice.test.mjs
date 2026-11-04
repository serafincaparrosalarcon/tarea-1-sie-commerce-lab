import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const port = 18181;
const base = `http://127.0.0.1:${port}`;
const secret = randomBytes(32).toString('hex');
const adminPassword = randomBytes(24).toString('base64url');
const dataDir = mkdtempSync(join(tmpdir(), 'sensoria-operations-test-'));
let child;
let cookie = '';

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('El servidor de prueba no arrancó a tiempo');
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const data = await response.json();
  return { response, data };
}

async function sendEvent(filename, signature = true) {
  const raw = readFileSync(join(root, 'payloads', filename));
  const payload = JSON.parse(raw);
  const signed = createHmac('sha256', secret).update(raw).digest('hex');
  return api('/api/integrations/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sensoria-signature': signature ? `sha256=${signed}` : 'sha256=00',
      'x-idempotency-key': payload.idempotency_key
    },
    body: raw
  });
}

test.before(async () => {
  child = spawn(process.execPath, ['backoffice/server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, INTEGRATION_SHARED_SECRET: secret, ADMIN_PASSWORD: adminPassword },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitForServer();
});

test.after(() => {
  child?.kill('SIGTERM');
  rmSync(dataDir, { recursive: true, force: true });
});

test('salud pública y control de acceso', async () => {
  const health = await api('/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.data.service, 'sensoria-operations');
  const dashboard = await api('/api/dashboard');
  assert.equal(dashboard.response.status, 401);
});

test('rechaza integraciones sin firma HMAC válida', async () => {
  const result = await sendEvent('order-created.json', false);
  assert.equal(result.response.status, 401);
  assert.equal(result.data.error, 'INVALID_SIGNATURE');
});

test('procesa los tres escenarios e impide duplicados', async () => {
  for (const filename of ['order-created.json', 'order-status-changed.json', 'support-requested.json']) {
    const result = await sendEvent(filename);
    assert.equal(result.response.status, 201, `${filename}: ${JSON.stringify(result.data)}`);
    assert.equal(result.data.status, 'SUCCESS');
  }
  const duplicate = await sendEvent('order-created.json');
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.data.duplicate, true);
});

test('autentica y muestra pedidos con sus productos', async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sensoria.local', password: adminPassword })
  });
  assert.equal(login.response.status, 200);
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  const orders = await api('/api/orders');
  assert.equal(orders.data.orders.length, 1);
  assert.equal(orders.data.orders[0].status, 'PREPARACION');
  assert.equal(orders.data.orders[0].items.length, 2);
  assert.equal(orders.data.orders[0].items[0].product_name, 'Aura Wave');
});

test('calcula métricas reales y crea sincronización saliente', async () => {
  const dashboard = await api('/api/dashboard');
  assert.equal(dashboard.data.kpis.orders, 1);
  assert.equal(dashboard.data.kpis.open_cases, 1);
  assert.ok(dashboard.data.kpis.integration_success >= 3);
  const orders = await api('/api/orders');
  const change = await api(`/api/orders/${orders.data.orders[0].id}/status`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'ENVIADO' })
  });
  assert.equal(change.response.status, 200);
  assert.equal(change.data.sync_status, 'PENDING');
});

test('agente propone y solo Telegram se ejecuta tras revisión humana', async () => {
  const cases = await api('/api/cases');
  const analyzed = await api(`/api/cases/${cases.data.cases[0].id}/analyze`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  assert.equal(analyzed.response.status, 201);
  assert.equal(analyzed.data.proposal.status, 'PENDIENTE_REVISION');
  const approved = await api(`/api/agent/proposals/${analyzed.data.proposal.id}/approve`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  assert.equal(approved.response.status, 200);
  assert.equal(approved.data.status, 'EJECUTADA_SIMULADA');
  assert.equal(approved.data.notification.status, 'SIMULATED');
});

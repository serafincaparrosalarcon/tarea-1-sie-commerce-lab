import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS integration_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('RECEIVED','SUCCESS','ERROR')),
  error_code TEXT,
  error_message TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  telegram_chat_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  shipping REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  placed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_external_id TEXT,
  sku TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  sku TEXT UNIQUE,
  product_name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  case_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  order_id INTEGER REFERENCES orders(id),
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  status TEXT NOT NULL DEFAULT 'ABIERTA',
  source TEXT NOT NULL DEFAULT 'FRONTOFFICE',
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK(direction IN ('IN','OUT','INTERNAL')),
  channel TEXT NOT NULL,
  body TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  case_type TEXT NOT NULL,
  consulted_data_json TEXT NOT NULL,
  proposed_action TEXT NOT NULL,
  response_draft TEXT NOT NULL,
  justification TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  priority TEXT NOT NULL,
  risks_json TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION',
  reviewer TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER REFERENCES cases(id),
  channel TEXT NOT NULL,
  recipient TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_system TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integration_status ON integration_events(status, received_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, placed_at);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status, opened_at);
CREATE INDEX IF NOT EXISTS idx_agent_status ON agent_proposals(status, created_at);
`;

export function openDatabase(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

export function audit(db, { actorType, actorId, action, entityType, entityId = null, details = {} }) {
  db.prepare(`INSERT INTO audit_log(actor_type,actor_id,action,entity_type,entity_id,details_json)
              VALUES(?,?,?,?,?,?)`).run(
    actorType,
    actorId,
    action,
    entityType,
    entityId === null ? null : String(entityId),
    JSON.stringify(details)
  );
}

export function recordIntegrationError(db, event, code, message) {
  // Un rechazo previo a la autenticación nunca debe reservar el identificador
  // legítimo del evento: un atacante podría bloquear entregas válidas.
  const originalEventId = String(event?.event_id || 'unknown');
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const eventId = `rejected-${originalEventId}-${suffix}`;
  const idempotencyKey = `rejected-${String(event?.idempotency_key || originalEventId)}-${suffix}`;
  try {
    db.prepare(`INSERT INTO integration_events
      (event_id,event_type,source,idempotency_key,payload_json,status,error_code,error_message,processed_at)
      VALUES(?,?,?,?,?,'ERROR',?,?,CURRENT_TIMESTAMP)`).run(
      eventId,
      String(event?.event_type || 'unknown'),
      String(event?.source || 'unknown'),
      idempotencyKey,
      JSON.stringify(event || {}),
      code,
      message
    );
  } catch {
    // La idempotencia puede hacer que el error ya este registrado.
  }
}

export function getDashboard(db) {
  const scalar = (sql) => db.prepare(sql).get();
  const orderSummary = scalar(`SELECT COUNT(*) orders, COALESCE(SUM(total),0) revenue FROM orders`);
  const openCases = scalar(`SELECT COUNT(*) count FROM cases WHERE status NOT IN ('RESUELTA','CERRADA')`).count;
  const resolved = scalar(`SELECT COUNT(*) count,
      COALESCE(AVG((julianday(resolved_at)-julianday(opened_at))*24),0) avg_hours
      FROM cases WHERE resolved_at IS NOT NULL`);
  const integrations = scalar(`SELECT
      SUM(CASE WHEN status='SUCCESS' THEN 1 ELSE 0 END) success,
      SUM(CASE WHEN status='ERROR' THEN 1 ELSE 0 END) errors,
      COUNT(*) total
      FROM integration_events`);
  const proposals = scalar(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN status IN ('APROBADA','EJECUTADA_SIMULADA','EJECUTADA') THEN 1 ELSE 0 END) approved,
      SUM(CASE WHEN status='PENDIENTE_REVISION' THEN 1 ELSE 0 END) pending
      FROM agent_proposals`);

  return {
    kpis: {
      orders: Number(orderSummary.orders || 0),
      revenue: Number(orderSummary.revenue || 0),
      open_cases: Number(openCases || 0),
      avg_resolution_hours: Number(resolved.avg_hours || 0),
      integration_success: Number(integrations.success || 0),
      integration_errors: Number(integrations.errors || 0),
      integration_conversion: integrations.total ? Number(integrations.success || 0) / Number(integrations.total) : 0,
      agent_total: Number(proposals.total || 0),
      agent_approved: Number(proposals.approved || 0),
      agent_pending: Number(proposals.pending || 0)
    },
    orders_by_status: db.prepare(`SELECT status label, COUNT(*) value FROM orders GROUP BY status ORDER BY value DESC`).all(),
    top_products: db.prepare(`SELECT product_name label, SUM(quantity) value FROM order_items GROUP BY product_name ORDER BY value DESC LIMIT 5`).all(),
    orders_by_day: db.prepare(`SELECT substr(placed_at,1,10) label, COUNT(*) value FROM orders GROUP BY substr(placed_at,1,10) ORDER BY label DESC LIMIT 10`).all().reverse(),
    cases_by_type: db.prepare(`SELECT case_type label, COUNT(*) value FROM cases GROUP BY case_type ORDER BY value DESC`).all(),
    errors_by_type: db.prepare(`SELECT COALESCE(error_code,'SIN_CODIGO') label, COUNT(*) value FROM integration_events WHERE status='ERROR' GROUP BY error_code ORDER BY value DESC`).all()
  };
}

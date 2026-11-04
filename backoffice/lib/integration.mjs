import { audit } from './database.mjs';
import { PayloadError, validateCasePayload, validateOrderPayload } from './validation.mjs';

function upsertCustomer(db, customer) {
  const email = String(customer.email).trim().toLowerCase();
  db.prepare(`INSERT INTO customers(external_id,name,email,phone,telegram_chat_id)
    VALUES(?,?,?,?,?)
    ON CONFLICT(email) DO UPDATE SET
      external_id=COALESCE(excluded.external_id,customers.external_id),
      name=excluded.name,
      phone=COALESCE(excluded.phone,customers.phone),
      telegram_chat_id=COALESCE(excluded.telegram_chat_id,customers.telegram_chat_id),
      updated_at=CURRENT_TIMESTAMP`).run(
    customer.id ? String(customer.id) : null,
    String(customer.name).trim(),
    email,
    customer.phone ? String(customer.phone).trim() : null,
    customer.telegram_chat_id ? String(customer.telegram_chat_id).trim() : null
  );
  return db.prepare('SELECT * FROM customers WHERE email=?').get(email);
}

function upsertOrder(db, event) {
  const payload = event.payload;
  validateOrderPayload(payload);
  const customer = upsertCustomer(db, payload.customer);
  db.prepare(`INSERT INTO orders
    (external_id,order_number,customer_id,status,subtotal,discount,shipping,total,currency,placed_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(external_id) DO UPDATE SET
      order_number=excluded.order_number,
      customer_id=excluded.customer_id,
      status=excluded.status,
      subtotal=excluded.subtotal,
      discount=excluded.discount,
      shipping=excluded.shipping,
      total=excluded.total,
      currency=excluded.currency,
      placed_at=excluded.placed_at,
      updated_at=CURRENT_TIMESTAMP`).run(
    String(payload.order_id),
    payload.order_number.trim(),
    customer.id,
    payload.status.trim(),
    Number(payload.subtotal || payload.total || 0),
    Number(payload.discount || 0),
    Number(payload.shipping || 0),
    Number(payload.total || 0),
    String(payload.currency || 'EUR').toUpperCase(),
    payload.placed_at ? new Date(payload.placed_at).toISOString() : event.occurred_at
  );
  const order = db.prepare('SELECT * FROM orders WHERE external_id=?').get(String(payload.order_id));
  db.prepare('DELETE FROM order_items WHERE order_id=?').run(order.id);
  const insertItem = db.prepare(`INSERT INTO order_items
    (order_id,product_external_id,sku,product_name,quantity,unit_price) VALUES(?,?,?,?,?,?)`);
  for (const item of payload.items) {
    insertItem.run(
      order.id,
      item.product_id ? String(item.product_id) : null,
      item.sku || null,
      String(item.product_name).trim(),
      Number(item.quantity),
      Number(item.unit_price)
    );
  }
  return { type: 'order', id: order.id };
}

function updateOrderStatus(db, event) {
  const payload = event.payload;
  const externalId = String(payload.order_id || '');
  const status = String(payload.status || '').trim();
  if (!externalId || !status) throw new PayloadError('STATUS_VALIDATION_ERROR', 'order_id y status son obligatorios');
  const order = db.prepare('SELECT * FROM orders WHERE external_id=? OR order_number=?').get(externalId, externalId);
  if (!order) throw new PayloadError('ORDER_NOT_FOUND', 'El pedido no existe en el back-office');
  db.prepare('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, order.id);
  return { type: 'order', id: order.id };
}

function updateStock(db, event) {
  const payload = event.payload;
  if (!payload.product_id && !payload.sku) throw new PayloadError('STOCK_VALIDATION_ERROR', 'product_id o sku es obligatorio');
  if (!Number.isInteger(Number(payload.stock)) || Number(payload.stock) < 0) throw new PayloadError('STOCK_VALIDATION_ERROR', 'stock debe ser un entero positivo');
  const externalId = payload.product_id ? String(payload.product_id) : null;
  const sku = payload.sku ? String(payload.sku) : null;
  const existing = db.prepare('SELECT id FROM inventory WHERE external_id=? OR sku=?').get(externalId, sku);
  if (existing) {
    db.prepare(`UPDATE inventory SET
      external_id=COALESCE(?,external_id),sku=COALESCE(?,sku),product_name=?,stock=?,available=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=?`).run(
      externalId,
      sku,
      String(payload.product_name || sku || externalId),
      Number(payload.stock),
      Number(payload.stock) > 0 ? 1 : 0,
      existing.id
    );
  } else {
    db.prepare(`INSERT INTO inventory(external_id,sku,product_name,stock,available)
      VALUES(?,?,?,?,?)`).run(
      externalId,
      sku,
      String(payload.product_name || sku || externalId),
      Number(payload.stock),
      Number(payload.stock) > 0 ? 1 : 0
    );
  }
  const product = db.prepare('SELECT * FROM inventory WHERE external_id=? OR sku=?').get(externalId, sku);
  return { type: 'inventory', id: product.id };
}

function upsertCase(db, event) {
  const payload = event.payload;
  validateCasePayload(payload);
  const customer = upsertCustomer(db, payload.customer);
  let order = null;
  if (payload.order_id || payload.order_number) {
    const reference = String(payload.order_id || payload.order_number);
    order = db.prepare('SELECT * FROM orders WHERE external_id=? OR order_number=?').get(reference, reference);
  }
  const externalId = String(payload.case_id || payload.reference);
  db.prepare(`INSERT INTO cases
    (external_id,case_type,subject,customer_id,order_id,message,priority,status,source)
    VALUES(?,?,?,?,?,?,?,'ABIERTA','FRONTOFFICE')
    ON CONFLICT(external_id) DO UPDATE SET
      case_type=excluded.case_type,
      subject=excluded.subject,
      customer_id=excluded.customer_id,
      order_id=COALESCE(excluded.order_id,cases.order_id),
      message=excluded.message,
      priority=excluded.priority,
      updated_at=CURRENT_TIMESTAMP`).run(
    externalId,
    String(payload.case_type).toUpperCase(),
    String(payload.subject).trim(),
    customer.id,
    order?.id || null,
    String(payload.message).trim(),
    String(payload.priority || 'MEDIA').toUpperCase()
  );
  const supportCase = db.prepare('SELECT * FROM cases WHERE external_id=?').get(externalId);
  const messageExists = db.prepare(`SELECT id FROM case_messages WHERE case_id=? AND direction='IN' AND body=?`).get(supportCase.id, String(payload.message).trim());
  if (!messageExists) {
    db.prepare(`INSERT INTO case_messages(case_id,direction,channel,body,delivery_status)
      VALUES(?,'IN',?,?, 'RECEIVED')`).run(supportCase.id, String(payload.channel || 'WEB').toUpperCase(), String(payload.message).trim());
  }
  return { type: 'case', id: supportCase.id };
}

export function processIntegrationEvent(db, event) {
  const duplicate = db.prepare('SELECT * FROM integration_events WHERE event_id=? OR idempotency_key=?').get(event.event_id, event.idempotency_key);
  if (duplicate) {
    return { duplicate: true, integration_id: duplicate.id, status: duplicate.status, entity_type: duplicate.entity_type, entity_id: duplicate.entity_id };
  }

  db.prepare(`INSERT INTO integration_events(event_id,event_type,source,idempotency_key,payload_json,status)
    VALUES(?,?,?,?,?,'RECEIVED')`).run(event.event_id, event.event_type, event.source, event.idempotency_key, JSON.stringify(event.payload));
  const integration = db.prepare('SELECT * FROM integration_events WHERE event_id=?').get(event.event_id);

  db.exec('BEGIN IMMEDIATE');
  try {
    let entity;
    if (event.event_type === 'order.created' || event.event_type === 'payment.simulated') entity = upsertOrder(db, event);
    else if (event.event_type === 'order.status_changed') entity = updateOrderStatus(db, event);
    else if (event.event_type === 'stock.changed') entity = updateStock(db, event);
    else if (['support.requested', 'return.requested', 'incident.created'].includes(event.event_type)) entity = upsertCase(db, event);
    else throw new PayloadError('UNSUPPORTED_EVENT', 'Evento no soportado');

    db.prepare(`UPDATE integration_events SET status='SUCCESS',entity_type=?,entity_id=?,processed_at=CURRENT_TIMESTAMP WHERE id=?`).run(entity.type, entity.id, integration.id);
    audit(db, {
      actorType: 'INTEGRATION', actorId: event.source, action: event.event_type,
      entityType: entity.type, entityId: entity.id,
      details: { event_id: event.event_id, idempotency_key: event.idempotency_key }
    });
    db.exec('COMMIT');
    return { duplicate: false, integration_id: integration.id, status: 'SUCCESS', entity_type: entity.type, entity_id: entity.id };
  } catch (error) {
    db.exec('ROLLBACK');
    db.prepare(`UPDATE integration_events SET status='ERROR',error_code=?,error_message=?,processed_at=CURRENT_TIMESTAMP WHERE id=?`).run(
      error.code || 'PROCESSING_ERROR', String(error.message || error).slice(0, 500), integration.id
    );
    throw error;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_EVENTS = new Set([
  'order.created',
  'payment.simulated',
  'order.status_changed',
  'stock.changed',
  'support.requested',
  'return.requested',
  'incident.created'
]);

export class PayloadError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = 'PayloadError';
    this.code = code;
    this.details = details;
  }
}

function requiredString(value, field, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} es obligatorio`);
}

export function validateEnvelope(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new PayloadError('INVALID_JSON', 'El cuerpo debe ser un objeto JSON');
  }
  requiredString(input.event_id, 'event_id', errors);
  requiredString(input.event_type, 'event_type', errors);
  requiredString(input.occurred_at, 'occurred_at', errors);
  requiredString(input.source, 'source', errors);
  if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) errors.push('payload debe ser un objeto');
  if (input.event_type && !ALLOWED_EVENTS.has(input.event_type)) errors.push('event_type no soportado');
  if (input.occurred_at && Number.isNaN(Date.parse(input.occurred_at))) errors.push('occurred_at no tiene formato ISO-8601');
  if (errors.length) throw new PayloadError('VALIDATION_ERROR', 'Payload incompleto o no valido', errors);
  return {
    event_id: input.event_id.trim(),
    event_type: input.event_type.trim(),
    occurred_at: new Date(input.occurred_at).toISOString(),
    source: input.source.trim(),
    idempotency_key: String(input.idempotency_key || input.event_id).trim(),
    payload: input.payload
  };
}

export function validateOrderPayload(payload) {
  const errors = [];
  requiredString(String(payload.order_id ?? ''), 'payload.order_id', errors);
  requiredString(payload.order_number, 'payload.order_number', errors);
  requiredString(payload.status, 'payload.status', errors);
  if (!payload.customer || typeof payload.customer !== 'object') errors.push('payload.customer es obligatorio');
  if (payload.customer) {
    requiredString(payload.customer.name, 'payload.customer.name', errors);
    if (!EMAIL.test(String(payload.customer.email || ''))) errors.push('payload.customer.email no es valido');
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) errors.push('payload.items debe contener al menos una linea');
  for (const [index, item] of (payload.items || []).entries()) {
    requiredString(item.product_name, `payload.items[${index}].product_name`, errors);
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) errors.push(`payload.items[${index}].quantity no es valido`);
    if (!Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0) errors.push(`payload.items[${index}].unit_price no es valido`);
  }
  if (!Number.isFinite(Number(payload.total)) || Number(payload.total) < 0) errors.push('payload.total no es valido');
  if (errors.length) throw new PayloadError('ORDER_VALIDATION_ERROR', 'Pedido no valido', errors);
}

export function validateCasePayload(payload) {
  const errors = [];
  requiredString(payload.case_id || payload.reference, 'payload.case_id', errors);
  requiredString(payload.case_type, 'payload.case_type', errors);
  requiredString(payload.subject, 'payload.subject', errors);
  requiredString(payload.message, 'payload.message', errors);
  if (!payload.customer || !EMAIL.test(String(payload.customer.email || ''))) errors.push('payload.customer.email no es valido');
  if (errors.length) throw new PayloadError('CASE_VALIDATION_ERROR', 'Incidencia no valida', errors);
}

export const demoEvents = [
  {
    event_id: 'evt-order-demo-001',
    event_type: 'order.created',
    occurred_at: '2026-11-04T10:15:00.000Z',
    source: 'sensoria-frontoffice',
    idempotency_key: 'order-SEN-2026-1104-001-v1',
    payload: {
      order_id: '1001',
      order_number: 'SEN-2026-1104-001',
      status: 'PAGO_SIMULADO',
      currency: 'EUR',
      subtotal: 93.85,
      discount: 0,
      shipping: 0,
      total: 93.85,
      placed_at: '2026-11-04T10:14:45.000Z',
      customer: {
        id: 'demo-customer-001',
        name: 'Cliente Demo',
        email: 'cliente.demo@sensoria.local',
        phone: '+34600000000'
      },
      items: [
        { product_id: '1', sku: 'PRD-001', product_name: 'Aura Wave', quantity: 1, unit_price: 74.9 },
        { product_id: '4', sku: 'PRD-004', product_name: 'Pebble Calm', quantity: 1, unit_price: 18.95 }
      ]
    }
  },
  {
    event_id: 'evt-status-demo-001',
    event_type: 'order.status_changed',
    occurred_at: '2026-11-04T10:30:00.000Z',
    source: 'sensoria-frontoffice',
    idempotency_key: 'order-SEN-2026-1104-001-status-preparacion',
    payload: {
      order_id: '1001',
      order_number: 'SEN-2026-1104-001',
      previous_status: 'PAGO_SIMULADO',
      status: 'PREPARACION',
      changed_by: 'admin.demo@sensoria.local'
    }
  },
  {
    event_id: 'evt-support-demo-001',
    event_type: 'support.requested',
    occurred_at: '2026-11-04T10:45:00.000Z',
    source: 'sensoria-frontoffice',
    idempotency_key: 'support-SOP-20261104-001',
    payload: {
      case_id: 'SOP-20261104-001',
      case_type: 'INCIDENCIA',
      subject: 'Producto recibido con una pieza dañada',
      message: 'La base de Aura Wave presenta una grieta. Solicito ayuda para revisar el pedido y conocer las opciones disponibles.',
      priority: 'ALTA',
      channel: 'WEB',
      order_id: '1001',
      order_number: 'SEN-2026-1104-001',
      customer: {
        id: 'demo-customer-001',
        name: 'Cliente Demo',
        email: 'cliente.demo@sensoria.local',
        phone: '+34600000000'
      }
    }
  }
];

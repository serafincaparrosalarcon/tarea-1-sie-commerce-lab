export const seedProducts = [
  { sku: "PRD-001", name: "Producto Nova", category: "Colección A", description: "Opción principal con acabado premium y uso versátil.", price: 89.9, stock: 18, accent: "violet" },
  { sku: "PRD-002", name: "Producto Pulse", category: "Colección A", description: "Equilibrio entre rendimiento, sencillez y precio.", price: 64.5, stock: 25, accent: "blue" },
  { sku: "PRD-003", name: "Producto Core", category: "Colección B", description: "La alternativa esencial para empezar con garantías.", price: 42, stock: 32, accent: "cyan" },
  { sku: "PRD-004", name: "Producto Orbit", category: "Colección B", description: "Diseño compacto y materiales resistentes para diario.", price: 55.95, stock: 14, accent: "orange" },
  { sku: "PRD-005", name: "Producto Apex", category: "Colección C", description: "Gama avanzada para quienes buscan mejores prestaciones.", price: 119, stock: 9, accent: "rose" },
  { sku: "PRD-006", name: "Producto Flow", category: "Colección C", description: "Ligero, práctico y disponible en edición limitada.", price: 72.9, stock: 11, accent: "emerald" },
  { sku: "PRD-007", name: "Producto Link", category: "Complementos", description: "Complemento compatible con toda la colección.", price: 18.5, stock: 48, accent: "indigo" },
  { sku: "PRD-008", name: "Producto Mini", category: "Complementos", description: "Formato reducido para añadir funcionalidad sin ocupar espacio.", price: 12.95, stock: 60, accent: "amber" },
];
export const allowedEvents = new Set(["product.viewed", "cart.item_added", "cart.item_removed", "checkout.started", "order.created", "payment.simulated", "support.requested"]);
export const orderStatuses = ["CREADO", "PAGO_SIMULADO", "PREPARACIÓN", "ENVIADO", "CANCELADO"] as const;

export const seedProducts = [
  { sku: "PRD-001", name: "Aura Wave", category: "Visual", description: "Proyector de ondas suaves con intensidad y color regulables.", price: 74.9, stock: 18, accent: "violet" },
  { sku: "PRD-002", name: "Halo Sunset", category: "Visual", description: "Lámpara de atardecer para crear una luz cálida y envolvente.", price: 46.5, stock: 25, accent: "orange" },
  { sku: "PRD-003", name: "Nebula Mini", category: "Visual", description: "Proyector compacto de cielo estrellado para espacios pequeños.", price: 39.9, stock: 32, accent: "blue" },
  { sku: "PRD-004", name: "Pebble Calm", category: "Táctil", description: "Piedra sensorial de silicona con tres relieves antiestrés.", price: 18.95, stock: 44, accent: "rose" },
  { sku: "PRD-005", name: "Loom Roller", category: "Táctil", description: "Rodillo de mano con texturas intercambiables y presión suave.", price: 24.5, stock: 29, accent: "emerald" },
  { sku: "PRD-006", name: "Cloud Weight", category: "Táctil", description: "Cojín lastrado de sobremesa para favorecer una pausa consciente.", price: 42.9, stock: 16, accent: "cyan" },
  { sku: "PRD-007", name: "Hush One", category: "Sonoro", description: "Dispositivo de sonido ambiental con seis paisajes relajantes.", price: 59.9, stock: 21, accent: "indigo" },
  { sku: "PRD-008", name: "Tide Pocket", category: "Sonoro", description: "Generador portátil de ruido blanco, lluvia y oleaje.", price: 34.95, stock: 37, accent: "amber" },
];
export const allowedEvents = new Set(["product.viewed", "cart.item_added", "cart.item_removed", "checkout.started", "order.created", "payment.simulated", "support.requested"]);
export const orderStatuses = ["CREADO", "PAGO_SIMULADO", "PREPARACIÓN", "ENVIADO", "CANCELADO"] as const;

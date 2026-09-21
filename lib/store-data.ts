export const seedProducts = [
  { sku: "PRD-001", name: "Aura Wave", category: "Visual", description: "Proyector de ondas suaves con intensidad y color regulables.", price: 74.9, stock: 18, accent: "violet" },
  { sku: "PRD-002", name: "Halo Sunset", category: "Visual", description: "Lámpara de atardecer para crear una luz cálida y envolvente.", price: 46.5, stock: 25, accent: "orange" },
  { sku: "PRD-003", name: "Nebula Mini", category: "Visual", description: "Proyector compacto de cielo estrellado para espacios pequeños.", price: 39.9, stock: 32, accent: "blue" },
  { sku: "PRD-004", name: "Pebble Calm", category: "Táctil", description: "Piedra sensorial de silicona con tres relieves antiestrés.", price: 18.95, stock: 44, accent: "rose" },
  { sku: "PRD-005", name: "Loom Roller", category: "Táctil", description: "Rodillo de mano con texturas intercambiables y presión suave.", price: 24.5, stock: 29, accent: "emerald" },
  { sku: "PRD-006", name: "Cloud Weight", category: "Táctil", description: "Cojín lastrado de sobremesa para favorecer una pausa consciente.", price: 42.9, stock: 16, accent: "cyan" },
  { sku: "PRD-007", name: "Hush One", category: "Sonoro", description: "Dispositivo de sonido ambiental con seis paisajes relajantes.", price: 59.9, stock: 21, accent: "indigo" },
  { sku: "PRD-008", name: "Tide Pocket", category: "Sonoro", description: "Generador portátil de ruido blanco, lluvia y oleaje.", price: 34.95, stock: 37, accent: "amber" },
  { sku: "PRD-009", name: "Prism Flow", category: "Visual", description: "Prisma luminoso que proyecta reflejos de color suaves y cambiantes.", price: 68.9, stock: 14, accent: "violet" },
  { sku: "PRD-010", name: "Terra Touch", category: "Táctil", description: "Trío de piedras cerámicas con relieves para pausas conscientes.", price: 29.9, stock: 26, accent: "emerald" },
  { sku: "PRD-011", name: "Rain Column", category: "Sonoro", description: "Columna de lluvia ambiental con sonido de agua regulable.", price: 84.5, stock: 12, accent: "blue" },
  { sku: "PRD-012", name: "Quiet Loop", category: "Táctil", description: "Aro sensorial lastrado y flexible con tejido de tacto suave.", price: 32.9, stock: 20, accent: "indigo" },
  { sku: "PRD-013", name: "Luma Breath", category: "Visual", description: "Lámpara de respiración con pulsos cálidos para marcar un ritmo pausado.", price: 56.9, stock: 22, accent: "amber" },
  { sku: "PRD-014", name: "Moss Press", category: "Táctil", description: "Cojín de presión para las manos con tejido bouclé de alta densidad.", price: 36.5, stock: 19, accent: "emerald" },
  { sku: "PRD-015", name: "Drift Radio", category: "Sonoro", description: "Paisajes de naturaleza con control analógico y sonido envolvente.", price: 72, stock: 15, accent: "blue" },
  { sku: "PRD-016", name: "Ember Arc", category: "Visual", description: "Arco luminoso de sobremesa con tres temperaturas de luz indirecta.", price: 89.9, stock: 10, accent: "orange" },
  { sku: "PRD-017", name: "Grain Set", category: "Táctil", description: "Cuatro discos de madera con relieves inspirados en formas naturales.", price: 38.9, stock: 28, accent: "rose" },
  { sku: "PRD-018", name: "Night Current", category: "Sonoro", description: "Altavoz nocturno con ruido marrón, ventilador y luz de orientación.", price: 64.9, stock: 17, accent: "cyan" },
];
export const allowedEvents = new Set(["product.viewed", "cart.item_added", "cart.item_removed", "checkout.started", "order.created", "payment.simulated", "support.requested", "return.requested"]);
export const orderStatuses = ["CREADO", "PAGO_SIMULADO", "PREPARACIÓN", "ENVIADO", "ENTREGADO", "CANCELADO"] as const;

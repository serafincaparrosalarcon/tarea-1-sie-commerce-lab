SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category ENUM('Visual','Táctil','Sonoro') NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_active_category (active, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  user_id INT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(15) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  coupon_code VARCHAR(40) NULL,
  payment_method VARCHAR(40) NOT NULL,
  status ENUM('PAGO_SIMULADO','PREPARACION','ENVIADO','ENTREGADO','CANCELADO') NOT NULL DEFAULT 'PAGO_SIMULADO',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_orders_email (customer_email),
  INDEX idx_orders_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_percent INT UNSIGNED NOT NULL,
  minimum_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses INT UNSIGNED NOT NULL DEFAULT 100,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS returns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  reason VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  status ENUM('SOLICITADA','APROBADA','RECHAZADA','REEMBOLSO_SIMULADO') NOT NULL DEFAULT 'SOLICITADA',
  refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_returns_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_returns_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  recipient VARCHAR(190) NOT NULL,
  template VARCHAR(50) NOT NULL,
  delivery_status ENUM('SIMULADO','ENVIADO','ERROR') NOT NULL DEFAULT 'SIMULADO',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(60) NOT NULL,
  session_id VARCHAR(80) NOT NULL,
  product_id INT UNSIGNED NULL,
  order_id INT UNSIGNED NULL,
  payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_type_created (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO coupons (code, discount_percent, minimum_amount, max_uses, starts_at, ends_at, active)
VALUES ('CALMA10', 10, 0, 9999, '2026-01-01', '2030-12-31', 1);

INSERT IGNORE INTO products (sku,name,category,description,long_description,price,stock,image) VALUES
('PRD-001','Aura Wave','Visual','Proyector de ondas suaves con intensidad y color regulables.','Convierte paredes y techos en un paisaje de luz en movimiento para reducir estímulos al final del día.',74.90,18,'assets/products/aura-wave.jpg'),
('PRD-002','Halo Sunset','Visual','Lámpara de atardecer para crear una luz cálida y envolvente.','Luz circular cálida que crea un rincón acogedor sin iluminar toda la estancia.',46.50,25,'assets/products/halo-sunset.jpg'),
('PRD-003','Nebula Mini','Visual','Proyector compacto de cielo estrellado para espacios pequeños.','Proyección estelar compacta con patrón sereno, rotación lenta y apagado automático.',39.90,32,'assets/products/nebula-mini.jpg'),
('PRD-004','Pebble Calm','Táctil','Piedra sensorial de silicona con tres relieves antiestrés.','Pieza silenciosa de bolsillo para mantener las manos ocupadas y descargar tensión.',18.95,44,'assets/products/pebble-calm.jpg'),
('PRD-005','Loom Roller','Táctil','Rodillo de mano con texturas intercambiables y presión suave.','Rodillo manual con bandas intercambiables que ofrece presión controlada.',24.50,29,'assets/products/loom-roller.jpg'),
('PRD-006','Cloud Weight','Táctil','Cojín lastrado de sobremesa para favorecer una pausa consciente.','Peso distribuido para una sensación de apoyo estable durante el descanso o el trabajo.',42.90,16,'assets/products/cloud-weight.jpg'),
('PRD-007','Hush One','Sonoro','Dispositivo de sonido ambiental con seis paisajes relajantes.','Sonidos envolventes de lluvia, bosque y mar con temporizador y volumen gradual.',59.90,21,'assets/products/hush-one.jpg'),
('PRD-008','Tide Pocket','Sonoro','Generador portátil de ruido blanco, lluvia y oleaje.','Formato de bolsillo con batería recargable y tres perfiles sonoros.',34.95,37,'assets/products/tide-pocket.jpg'),
('PRD-009','Prism Flow','Visual','Prisma luminoso que proyecta reflejos de color suaves y cambiantes.','Reflejos lentos y regulables para pausas visuales en espacios de descanso.',68.90,14,'assets/products/prism-flow.jpg'),
('PRD-010','Terra Touch','Táctil','Trío de piedras cerámicas con relieves para pausas conscientes.','Tres acabados inspirados en formas naturales y presentados en estuche.',29.90,26,'assets/products/terra-touch.jpg'),
('PRD-011','Rain Column','Sonoro','Columna de lluvia ambiental con sonido de agua regulable.','Movimiento y sonido de agua para crear un punto sensorial estable.',84.50,12,'assets/products/rain-column.jpg'),
('PRD-012','Quiet Loop','Táctil','Aro sensorial lastrado y flexible con tejido de tacto suave.','Aro ergonómico para manos inquietas con funda lavable.',32.90,20,'assets/products/quiet-loop.jpg'),
('PRD-013','Luma Breath','Visual','Lámpara de respiración con pulsos cálidos para marcar un ritmo pausado.','Secuencias luminosas que acompañan ejercicios de respiración.',56.90,22,'assets/products/luma-breath.jpg'),
('PRD-014','Moss Press','Táctil','Cojín de presión para las manos con tejido bouclé de alta densidad.','Textura mullida y resistencia gradual para descargar tensión.',36.50,19,'assets/products/moss-press.jpg'),
('PRD-015','Drift Radio','Sonoro','Paisajes de naturaleza con control analógico y sonido envolvente.','Selector físico de ambientes y temporizador de descanso.',72.00,15,'assets/products/drift-radio.jpg'),
('PRD-016','Ember Arc','Visual','Arco luminoso de sobremesa con tres temperaturas de luz indirecta.','Diseño escultórico con control táctil y memoria de intensidad.',89.90,10,'assets/products/ember-arc.jpg'),
('PRD-017','Grain Set','Táctil','Cuatro discos de madera con relieves inspirados en formas naturales.','Set portátil de acabados seguros y distintas sensaciones táctiles.',38.90,28,'assets/products/grain-set.jpg'),
('PRD-018','Night Current','Sonoro','Altavoz nocturno con ruido marrón, ventilador y luz de orientación.','Sonidos graves constantes con luz tenue y apagado gradual.',64.90,17,'assets/products/night-current.jpg');

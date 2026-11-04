CREATE TABLE IF NOT EXISTS crm_customers (
  customer_email VARCHAR(190) PRIMARY KEY,
  status ENUM('ACTIVO','EN_RIESGO','INACTIVO','BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  lifecycle_stage ENUM('LEAD','PRIMERA_COMPRA','CLIENTE','FIDELIZADO') NOT NULL DEFAULT 'CLIENTE',
  owner VARCHAR(120) NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'TIENDA_ONLINE',
  phone VARCHAR(30) NULL,
  tags VARCHAR(500) NULL,
  notes TEXT NULL,
  next_follow_up_at DATETIME NULL,
  last_contact_at DATETIME NULL,
  consent_marketing TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_crm_status_follow_up (status, next_follow_up_at),
  INDEX idx_crm_owner (owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_interactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_email VARCHAR(190) NOT NULL,
  interaction_type ENUM('NOTA','LLAMADA','EMAIL','TAREA','CAMBIO_ESTADO') NOT NULL DEFAULT 'NOTA',
  subject VARCHAR(190) NOT NULL,
  body TEXT NULL,
  outcome VARCHAR(190) NULL,
  follow_up_at DATETIME NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_crm_interaction_customer FOREIGN KEY (customer_email) REFERENCES crm_customers(customer_email) ON DELETE CASCADE,
  INDEX idx_crm_interactions_customer_created (customer_email, created_at),
  INDEX idx_crm_interactions_follow_up (completed, follow_up_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO crm_customers (customer_email, status, lifecycle_stage, phone)
SELECT
  LOWER(customer_email),
  CASE WHEN MAX(created_at) < DATE_SUB(NOW(), INTERVAL 180 DAY) THEN 'INACTIVO'
       WHEN MAX(created_at) < DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'EN_RIESGO'
       ELSE 'ACTIVO' END,
  CASE WHEN COUNT(*) = 1 THEN 'PRIMERA_COMPRA'
       WHEN COUNT(*) >= 4 OR SUM(total) >= 500 THEN 'FIDELIZADO'
       ELSE 'CLIENTE' END,
  MAX(phone)
FROM orders
GROUP BY LOWER(customer_email);

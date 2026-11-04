CREATE TABLE IF NOT EXISTS integration_outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(80) NOT NULL UNIQUE,
  event_type VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(190) NOT NULL UNIQUE,
  payload_json JSON NOT NULL,
  status ENUM('PENDING','DELIVERED','ERROR','SIMULATED') NOT NULL DEFAULT 'PENDING',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  http_status SMALLINT UNSIGNED NULL,
  response_body TEXT NULL,
  last_error VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  INDEX idx_outbox_status_created (status, created_at),
  INDEX idx_outbox_type_created (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  order_id INT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  case_type VARCHAR(60) NOT NULL,
  subject VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('ABIERTA','EN_REVISION','RESUELTA','CERRADA') NOT NULL DEFAULT 'ABIERTA',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_support_status_created (status, created_at),
  INDEX idx_support_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(80) NOT NULL,
  notification_type VARCHAR(60) NOT NULL,
  recipient_email VARCHAR(190) NOT NULL,
  subject VARCHAR(190) NOT NULL,
  delivery_status ENUM('SIMULADO','ENVIADO','ERROR') NOT NULL,
  provider_id VARCHAR(190) NULL,
  error_message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_notifications_status_created (delivery_status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

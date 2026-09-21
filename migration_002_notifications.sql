-- Ejecuta este archivo una sola vez si ya instalaste una versión anterior.
-- Si todavía no has ejecutado install.php, no lo necesitas.

ALTER TABLE notifications
  CHANGE recipient recipient_email VARCHAR(190) NULL,
  ADD channel ENUM('EMAIL','SMS') NOT NULL DEFAULT 'EMAIL' AFTER order_id,
  ADD recipient_phone VARCHAR(30) NULL AFTER recipient_email,
  ADD subject VARCHAR(190) NOT NULL DEFAULT 'Actualización de tu pedido' AFTER template,
  ADD body TEXT NOT NULL AFTER subject,
  ADD provider_id VARCHAR(190) NULL AFTER delivery_status,
  ADD error_message VARCHAR(255) NULL AFTER provider_id,
  ADD INDEX idx_notifications_order_channel (order_id, channel),
  ADD INDEX idx_notifications_status_created (delivery_status, created_at);

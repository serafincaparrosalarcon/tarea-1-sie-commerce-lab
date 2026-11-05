<?php

declare(strict_types=1);

require dirname(__DIR__) . '/config.php';

/*
 * Compatibilidad con instalaciones anteriores de Sensoria.
 * DonDominio conserva config.php entre despliegues para no sobrescribir
 * credenciales, así que las opciones añadidas en versiones nuevas deben tener
 * valores seguros cuando todavía no existen en la configuración del servidor.
 */
$adminNotificationEmail = getenv('ADMIN_NOTIFICATION_EMAIL') ?: '';
if (!filter_var($adminNotificationEmail, FILTER_VALIDATE_EMAIL)) {
    $adminNotificationEmail = defined('SMTP_FROM_EMAIL') && filter_var(SMTP_FROM_EMAIL, FILTER_VALIDATE_EMAIL)
        ? SMTP_FROM_EMAIL
        : 'soporte@sensoria.onl';
}

$optionalConfigDefaults = [
    'MAIL_ENABLED' => false,
    'SMS_ENABLED' => false,
    'ADMIN_NOTIFICATION_EMAIL' => $adminNotificationEmail,
    'INTEGRATION_ENABLED' => false,
    'INTEGRATION_WEBHOOK_URL' => '',
    'INTEGRATION_SHARED_SECRET' => '',
    'INTEGRATION_TIMEOUT_SECONDS' => 8,
];
foreach ($optionalConfigDefaults as $constantName => $defaultValue) {
    if (!defined($constantName)) {
        define($constantName, $defaultValue);
    }
}

require dirname(__DIR__) . '/lib/notifications.php';
require dirname(__DIR__) . '/lib/integration.php';

session_set_cookie_params([
    'lifetime' => SESSION_LIFETIME,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => SESSION_SAMESITE,
]);
session_start();

$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($action === 'products' && $method === 'GET') {
        $all = filter_var($_GET['all'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $sql = 'SELECT * FROM products' . ($all ? '' : ' WHERE active=1') . ' ORDER BY id';
        respond(['products' => db()->query($sql)->fetchAll()]);
    }

    if ($action === 'session' && $method === 'GET') {
        respond(['user' => $_SESSION['user'] ?? null, 'csrf' => csrf_token()]);
    }

    if ($action === 'invoice' && $method === 'GET') {
        $user = require_login();
        $stmt = db()->prepare('SELECT * FROM orders WHERE id=? AND (user_id=? OR customer_email=?)');
        $stmt->execute([(int)($_GET['order_id'] ?? 0), $user['id'], $user['email']]);
        $order = $stmt->fetch();
        if (!$order) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            exit('Factura no encontrada');
        }
        $order = attach_order_data([$order])[0];
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: private, no-store');
        echo invoice_html($order, true);
        exit;
    }

    if ($action === 'register' && $method === 'POST') {
        $b = json_input();
        require_csrf($b);
        $name = trim((string)($b['name'] ?? ''));
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $password = (string)($b['password'] ?? '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            respond(['error' => 'Revisa el nombre, correo y contraseña (mínimo 8 caracteres)'], 422);
        }

        $stmt = db()->prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)');
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);

        session_regenerate_id(true);
        $_SESSION['user'] = ['id' => (int) db()->lastInsertId(), 'name' => $name, 'email' => $email, 'role' => 'customer'];
        respond(['user' => $_SESSION['user'], 'csrf' => csrf_token()], 201);
    }

    if ($action === 'login' && $method === 'POST') {
        $b = json_input();
        require_csrf($b);
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $stmt = db()->prepare('SELECT * FROM users WHERE email=?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !password_verify((string)($b['password'] ?? ''), (string)($user['password_hash'] ?? ''))) {
            respond(['error' => 'Correo o contraseña incorrectos'], 401);
        }

        session_regenerate_id(true);
        $_SESSION['user'] = ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']];
        respond(['user' => $_SESSION['user'], 'csrf' => csrf_token()]);
    }

    if ($action === 'logout' && $method === 'POST') {
        $b = json_input();
        require_csrf($b);
        session_destroy();
        respond(['ok' => true]);
    }

    if ($action === 'coupon' && $method === 'GET') {
        $code = strtoupper(trim((string)($_GET['code'] ?? '')));
        $subtotal = (float)($_GET['subtotal'] ?? 0);
        $stmt = db()->prepare('SELECT * FROM coupons WHERE code=? AND active=1 AND starts_at<=CURDATE() AND ends_at>=CURDATE()');
        $stmt->execute([$code]);
        $c = $stmt->fetch();
        $valid = $c && $subtotal >= (float)$c['minimum_amount'] && (int)$c['used_count'] < (int)$c['max_uses'];
        respond([
            'valid' => (bool)$valid,
            'discount_percent' => $valid ? (int)$c['discount_percent'] : 0,
            'minimum_amount' => $c ? (float)$c['minimum_amount'] : 0,
        ]);
    }

    if ($action === 'checkout' && $method === 'POST') {
        $b = json_input();
        require_csrf($b);
        $items = $b['items'] ?? [];
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $name = trim((string)($b['name'] ?? ''));
        $phone = trim((string)($b['phone'] ?? ''));
        $address = trim((string)($b['address'] ?? ''));
        $city = trim((string)($b['city'] ?? ''));
        $postalCode = trim((string)($b['postal_code'] ?? ''));
        $paymentMethod = strtoupper(trim((string)($b['payment_method'] ?? 'PAYPAL_SIMULADO')));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_array($items) || count($items) === 0 || $name === '' || $phone === '' || $address === '' || $city === '' || $postalCode === '') {
            respond(['error' => 'Datos de compra incompletos'], 422);
        }
        if ($paymentMethod !== 'PAYPAL_SIMULADO') {
            respond(['error' => 'Método de pago no válido'], 422);
        }

        $pdo = db();
        $pdo->beginTransaction();
        $ids = array_values(array_unique(array_map(fn ($i) => (int)($i['id'] ?? 0), $items)));
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare('SELECT * FROM products WHERE active=1 AND id IN (' . $marks . ')');
        $stmt->execute($ids);
        $products = [];
        foreach ($stmt->fetchAll() as $row) {
            $products[(int) $row['id']] = $row;
        }

        $subtotal = 0.0;
        $lines = [];
        foreach ($items as $i) {
            $id = (int)($i['id'] ?? 0);
            $qty = max(1, min(10, (int)($i['quantity'] ?? 1)));
            if (!isset($products[$id]) || $qty > (int)$products[$id]['stock']) {
                throw new RuntimeException('Uno de los productos no está disponible en la cantidad solicitada.');
            }
            $unit = (float)$products[$id]['price'];
            $subtotal += $unit * $qty;
            $lines[] = ['id' => $id, 'qty' => $qty, 'unit' => $unit];
        }

        $coupon = strtoupper(trim((string)($b['coupon'] ?? '')));
        $couponId = null;
        $percent = 0;
        if ($coupon !== '') {
            $cstmt = $pdo->prepare('SELECT * FROM coupons WHERE code=? AND active=1 AND starts_at<=CURDATE() AND ends_at>=CURDATE()');
            $cstmt->execute([$coupon]);
            $couponRow = $cstmt->fetch();
            if ($couponRow && $subtotal >= (float)$couponRow['minimum_amount'] && (int)$couponRow['used_count'] < (int)$couponRow['max_uses']) {
                $percent = (int)$couponRow['discount_percent'];
                $couponId = (int)$couponRow['id'];
            }
        }

        $discount = round($subtotal * $percent / 100, 2);
        $shipping = ($b['shipping'] ?? 'standard') === 'express' ? 8.95 : ($subtotal >= 80 ? 0 : 4.95);
        // Los precios del catálogo son precios finales para consumidor, con IVA incluido.
        $total = round($subtotal - $discount + $shipping, 2);
        $tax = round($total - ($total / 1.21), 2);

        $orderNumber = 'SEN-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
        $stmt = $pdo->prepare('INSERT INTO orders(order_number,user_id,customer_name,customer_email,phone,address,city,postal_code,subtotal,discount,shipping,tax,total,coupon_code,payment_method) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $orderNumber,
            $_SESSION['user']['id'] ?? null,
            $name,
            $email,
            $phone,
            $address,
            $city,
            $postalCode,
            $subtotal,
            $discount,
            $shipping,
            $tax,
            $total,
            $coupon !== '' ? $coupon : null,
            $paymentMethod,
        ]);
        $orderId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price) VALUES(?,?,?,?,?)');
        $stockStmt = $pdo->prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?');
        foreach ($lines as $line) {
            $itemStmt->execute([$orderId, $line['id'], $products[$line['id']]['name'], $line['qty'], $line['unit']]);
            $stockStmt->execute([$line['qty'], $line['id'], $line['qty']]);
            if ($stockStmt->rowCount() !== 1) {
                throw new RuntimeException('No se pudo reservar el stock del producto ' . $products[$line['id']]['name']);
            }
        }

        if ($couponId) {
            $pdo->prepare('UPDATE coupons SET used_count=used_count+1 WHERE id=?')->execute([$couponId]);
        }

        $pdo->prepare('INSERT INTO events(event_type,session_id,order_id,payload) VALUES(?,?,?,?)')->execute([
            'order.created',
            (string)($b['session_id'] ?? 'WEB'),
            $orderId,
            json_encode(['total' => $total, 'coupon' => $coupon, 'payment_method' => $paymentMethod]),
        ]);

        $order = [
            'id' => $orderId,
            'order_number' => $orderNumber,
            'customer_name' => $name,
            'customer_email' => $email,
            'phone' => $phone,
            'address' => $address,
            'city' => $city,
            'postal_code' => $postalCode,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'shipping' => $shipping,
            'tax' => $tax,
            'total' => $total,
            'coupon_code' => $coupon !== '' ? $coupon : null,
            'status' => 'PAGO_SIMULADO',
            'payment_method' => $paymentMethod,
            'created_at' => date('Y-m-d H:i:s'),
            'items' => array_map(static fn (array $line): array => [
                'product_id' => $line['id'],
                'sku' => $products[$line['id']]['sku'],
                'product_name' => $products[$line['id']]['name'],
                'quantity' => $line['qty'],
                'unit_price' => $line['unit'],
            ], $lines),
        ];

        $pdo->prepare('INSERT INTO events(event_type,session_id,order_id,payload) VALUES(?,?,?,?)')->execute([
            'payment.simulated',
            (string)($b['session_id'] ?? 'WEB'),
            $orderId,
            json_encode(['amount' => $total, 'currency' => 'EUR', 'method' => $paymentMethod]),
        ]);

        try {
            $notifications = dispatch_order_notifications($pdo, $order, 'PAGO_SIMULADO');
        } catch (Throwable $notificationError) {
            $notifications = [['channel' => 'SISTEMA', 'recipient' => '', 'delivery_status' => 'ERROR', 'error_message' => $notificationError->getMessage()]];
        }

        $pdo->commit();
        try {
            $integration = integration_emit($pdo, 'order.created', [
                'order_id' => (string)$order['id'],
                'order_number' => $order['order_number'],
                'status' => $order['status'],
                'currency' => 'EUR',
                'subtotal' => $order['subtotal'],
                'discount' => $order['discount'],
                'shipping' => $order['shipping'],
                'total' => $order['total'],
                'placed_at' => date(DATE_ATOM, strtotime((string)$order['created_at'])),
                'customer' => [
                    'id' => isset($_SESSION['user']['id']) ? (string)$_SESSION['user']['id'] : null,
                    'name' => $order['customer_name'],
                    'email' => $order['customer_email'],
                    'phone' => $order['phone'],
                ],
                'items' => $order['items'],
            ], 'order-' . $order['id'] . '-created-v1');
        } catch (Throwable $integrationError) {
            $integration = ['status' => 'ERROR', 'error' => $integrationError->getMessage()];
        }
        respond(['order' => $order, 'notifications' => $notifications, 'integration' => $integration], 201);
    }

    if ($action === 'my_orders' && $method === 'GET') {
        $user = require_login();
        $stmt = db()->prepare('SELECT * FROM orders WHERE user_id=? OR customer_email=? ORDER BY id DESC');
        $stmt->execute([$user['id'], $user['email']]);
        respond(['orders' => attach_order_data($stmt->fetchAll())]);
    }

    if ($action === 'return_request' && $method === 'POST') {
        $user = require_login();
        $b = json_input();
        require_csrf($b);
        $stmt = db()->prepare('SELECT * FROM orders WHERE id=? AND (user_id=? OR customer_email=?)');
        $stmt->execute([(int)($b['order_id'] ?? 0), $user['id'], $user['email']]);
        $order = $stmt->fetch();
        if (!$order) respond(['error' => 'Pedido no encontrado'], 404);
        $reason = trim((string)($b['reason'] ?? ''));
        $details = trim((string)($b['details'] ?? ''));
        if ($reason === '' || $details === '' || strlen($details) > 3000) respond(['error' => 'Indica el motivo y una explicación breve'], 422);
        $stmt = db()->prepare('INSERT INTO returns(order_id,reason,details,status) VALUES(?,?,?,"SOLICITADA")');
        $stmt->execute([(int)$order['id'], $reason, $details]);
        $returnId = (int)db()->lastInsertId();
        $reference = 'RET-' . date('Ymd') . '-' . str_pad((string)$returnId, 5, '0', STR_PAD_LEFT);
        db()->prepare('INSERT INTO events(event_type,session_id,order_id,payload) VALUES(?,?,?,?)')->execute([
            'support.requested',
            (string)($b['session_id'] ?? 'WEB'),
            (int)$order['id'],
            json_encode(['kind' => 'return', 'reason' => $reason]),
        ]);
        db()->prepare('INSERT INTO events(event_type,session_id,order_id,payload) VALUES(?,?,?,?)')->execute([
            'return.requested',
            (string)($b['session_id'] ?? 'WEB'),
            (int)$order['id'],
            json_encode(['reason' => $reason]),
        ]);
        $case = [
            'reference' => $reference,
            'case_type' => 'DEVOLUCION',
            'subject' => 'Solicitud de devolución · ' . $reason,
            'message' => $details,
            'order_number' => $order['order_number'],
            'customer_name' => $order['customer_name'],
            'customer_email' => $order['customer_email'],
        ];
        db()->prepare('INSERT INTO support_requests(reference,order_id,customer_name,customer_email,case_type,subject,message) VALUES(?,?,?,?,?,?,?)')
            ->execute([$reference, (int)$order['id'], $order['customer_name'], $order['customer_email'], 'DEVOLUCION', $case['subject'], $details]);
        try {
            $adminNotification = dispatch_admin_case_notification(db(), $case);
        } catch (Throwable $notificationError) {
            $adminNotification = ['delivery_status' => 'ERROR', 'error_message' => $notificationError->getMessage()];
        }
        try {
            $integration = integration_emit(db(), 'return.requested', [
                'case_id' => $reference,
                'case_type' => 'DEVOLUCION',
                'subject' => $case['subject'],
                'message' => $details,
                'priority' => 'ALTA',
                'channel' => 'WEB',
                'order_id' => (string)$order['id'],
                'order_number' => $order['order_number'],
                'customer' => ['id' => (string)$user['id'], 'name' => $order['customer_name'], 'email' => $order['customer_email'], 'phone' => $order['phone']],
            ], 'return-' . $returnId . '-requested-v1');
        } catch (Throwable $integrationError) {
            $integration = ['status' => 'ERROR', 'error' => $integrationError->getMessage()];
        }
        respond(['ok' => true, 'reference' => $reference, 'admin_notification' => $adminNotification, 'integration' => $integration], 201);
    }

    if ($action === 'support' && $method === 'POST') {
        $b = json_input();
        require_csrf($b);
        $name = trim((string)($b['name'] ?? ''));
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $kind = trim((string)($b['kind'] ?? 'Consulta'));
        $orderNumber = trim((string)($b['order_number'] ?? ''));
        $message = trim((string)($b['message'] ?? ''));
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '' || strlen($message) > 4500) {
            respond(['error' => 'Revisa el nombre, correo y mensaje'], 422);
        }
        $orderId = null;
        if ($orderNumber !== '') {
            $stmt = db()->prepare('SELECT id FROM orders WHERE order_number=? AND customer_email=?');
            $stmt->execute([$orderNumber, $email]);
            $found = $stmt->fetch();
            $orderId = $found ? (int)$found['id'] : null;
        }
        $sessionId = substr(preg_replace('/[^A-Za-z0-9_-]/', '', (string)($b['session_id'] ?? '')), 0, 80) ?: 'WEB';
        $reference = 'SOP-' . date('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(2)));
        db()->prepare('INSERT INTO events(event_type,session_id,order_id,payload) VALUES(?,?,?,?)')->execute([
            'support.requested',
            $sessionId,
            $orderId,
            json_encode(['name' => $name, 'email' => $email, 'kind' => $kind, 'order_number' => $orderNumber, 'message' => $message], JSON_UNESCAPED_UNICODE),
        ]);
        $subject = $kind . ($orderNumber !== '' ? ' · pedido ' . $orderNumber : '');
        db()->prepare('INSERT INTO support_requests(reference,order_id,customer_name,customer_email,case_type,subject,message) VALUES(?,?,?,?,?,?,?)')
            ->execute([$reference, $orderId, $name, $email, strtoupper($kind), $subject, $message]);
        $case = ['reference' => $reference, 'case_type' => strtoupper($kind), 'subject' => $subject, 'message' => $message, 'order_number' => $orderNumber, 'customer_name' => $name, 'customer_email' => $email];
        try {
            $adminNotification = dispatch_admin_case_notification(db(), $case);
        } catch (Throwable $notificationError) {
            $adminNotification = ['delivery_status' => 'ERROR', 'error_message' => $notificationError->getMessage()];
        }
        try {
            $integration = integration_emit(db(), 'support.requested', [
                'case_id' => $reference,
                'case_type' => strtoupper($kind),
                'subject' => $subject,
                'message' => $message,
                'priority' => 'MEDIA',
                'channel' => 'WEB',
                'order_id' => $orderId !== null ? (string)$orderId : null,
                'order_number' => $orderNumber !== '' ? $orderNumber : null,
                'customer' => ['id' => null, 'name' => $name, 'email' => $email],
            ], 'support-' . $reference . '-v1');
        } catch (Throwable $integrationError) {
            $integration = ['status' => 'ERROR', 'error' => $integrationError->getMessage()];
        }
        respond(['ok' => true, 'reference' => $reference, 'admin_notification' => $adminNotification, 'integration' => $integration], 201);
    }

    if ($action === 'recommend' && $method === 'POST') {
        $b = json_input();
        require_csrf($b);
        $userPrompt = trim((string)($b['query'] ?? ''));

        if ($userPrompt === '') {
            respond(['error' => 'Debes indicar qué necesitas o qué estás buscando.'], 422);
        }

        $products = db()->query('SELECT id, name, category, price, description FROM products WHERE active=1 ORDER BY id')->fetchAll();
        if (!$products) {
            respond(['recommendation' => 'No hay productos disponibles actualmente en el catálogo.']);
        }

        $catalogText = "Catálogo de productos disponibles:\n";
        foreach ($products as $p) {
            $catalogText .= "- [ID: {$p['id']}] {$p['name']} ({$p['category']}) - {$p['price']}€: {$p['description']}\n";
        }

        $systemInstruction = "Eres un asistente de compras de nuestra tienda Sensoria. Recomienda el mejor producto de nuestro catálogo según la necesidad del cliente y explica brevemente por qué. Responde siempre en español.";

        $apiKey = defined('GEMINI_API_KEY') ? (string) GEMINI_API_KEY : '';
        if ($apiKey === '' || $apiKey === 'TU_GEMINI_API_KEY') {
            respond(smart_catalog_recommendation($products, $userPrompt));
        }

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' . $apiKey;
        $payload = [
            'contents' => [[
                'parts' => [[ 'text' => $systemInstruction . "\n\n" . $catalogText . "\n\nConsulta del cliente: " . $userPrompt ]],
            ]],
        ];

        $modelsToTry = ['gemini-2.5-flash'];
        $response = false;
        $httpCode = 0;
        $lastError = '';

        foreach ($modelsToTry as $modelName) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelName}:generateContent?key=" . $apiKey;
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_TIMEOUT, 4);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                break;
            }

            $lastError = "HTTP $httpCode - " . ($curlErr ?: $response ?: 'Sin respuesta');
        }

        if ($httpCode === 200 && $response) {
            $resData = json_decode($response, true);
            $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? 'No se pudo generar recomendación.';
            respond(['recommendation' => $text]);
        }

        respond(smart_catalog_recommendation($products, $userPrompt));
    }

    if ($action === 'admin_data' && $method === 'GET') {
        require_admin();
        $orders = attach_order_data(db()->query('SELECT * FROM orders ORDER BY id DESC LIMIT 100')->fetchAll());
        $products = db()->query('SELECT * FROM products ORDER BY id')->fetchAll();
        $customers = db()->query("SELECT customer_email email,MAX(customer_name) name,COUNT(*) orders,ROUND(SUM(total),2) spend,MAX(created_at) last_order FROM orders GROUP BY customer_email ORDER BY spend DESC LIMIT 30")->fetchAll();
        $notifications = db()->query('SELECT * FROM notifications ORDER BY id DESC LIMIT 50')->fetchAll();
        $coupons = db()->query('SELECT * FROM coupons ORDER BY id DESC')->fetchAll();
        $events = db()->query('SELECT * FROM events ORDER BY id DESC LIMIT 80')->fetchAll();
        $returns = db()->query('SELECT r.*,o.order_number,o.customer_name,o.customer_email,o.total order_total FROM returns r JOIN orders o ON o.id=r.order_id ORDER BY r.id DESC LIMIT 50')->fetchAll();
        $supportRequests = db()->query('SELECT * FROM support_requests ORDER BY id DESC LIMIT 80')->fetchAll();
        $adminNotifications = db()->query('SELECT * FROM admin_notifications ORDER BY id DESC LIMIT 80')->fetchAll();
        $integrationOutbox = db()->query('SELECT id,event_id,event_type,status,attempts,http_status,last_error,created_at,delivered_at FROM integration_outbox ORDER BY id DESC LIMIT 100')->fetchAll();
        respond(['orders' => $orders, 'products' => $products, 'customers' => $customers, 'notifications' => $notifications, 'coupons' => $coupons, 'events' => $events, 'returns' => $returns, 'support_requests' => $supportRequests, 'admin_notifications' => $adminNotifications, 'integration_outbox' => $integrationOutbox, 'notification_config' => ['email_enabled' => MAIL_ENABLED, 'sms_enabled' => SMS_ENABLED, 'admin_email' => ADMIN_NOTIFICATION_EMAIL], 'integration_config' => ['enabled' => INTEGRATION_ENABLED]]);
    }

    if ($action === 'crm' && $method === 'GET') {
        require_admin();
        respond(crm_dashboard_data());
    }

    if ($action === 'crm_customer' && $method === 'GET') {
        require_admin();
        $email = strtolower(trim((string)($_GET['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Cliente no válido'], 422);
        crm_seed_customer($email);

        $profileStmt = db()->prepare("SELECT c.*,a.name,a.phone order_phone,a.orders,a.spend,a.average_order,a.first_order,a.last_order,
            CASE WHEN c.status='BLOQUEADO' THEN 'BLOQUEADO' WHEN a.spend>=500 OR a.orders>=4 THEN 'VIP'
                 WHEN c.status IN ('EN_RIESGO','INACTIVO') THEN c.status WHEN a.orders=1 THEN 'NUEVO' ELSE 'ACTIVO' END segment
            FROM crm_customers c
            JOIN (SELECT LOWER(customer_email) email,MAX(customer_name) name,MAX(phone) phone,COUNT(*) orders,
                         ROUND(SUM(total),2) spend,ROUND(AVG(total),2) average_order,MIN(created_at) first_order,MAX(created_at) last_order
                  FROM orders GROUP BY LOWER(customer_email)) a ON a.email=c.customer_email
            WHERE c.customer_email=?");
        $profileStmt->execute([$email]);
        $profile = $profileStmt->fetch();
        if (!$profile) respond(['error' => 'Cliente no encontrado'], 404);

        $ordersStmt = db()->prepare('SELECT * FROM orders WHERE LOWER(customer_email)=? ORDER BY id DESC');
        $ordersStmt->execute([$email]);
        $orders = attach_order_data($ordersStmt->fetchAll());
        $supportStmt = db()->prepare('SELECT * FROM support_requests WHERE LOWER(customer_email)=? ORDER BY id DESC');
        $supportStmt->execute([$email]);
        $returnsStmt = db()->prepare('SELECT r.*,o.order_number FROM returns r JOIN orders o ON o.id=r.order_id WHERE LOWER(o.customer_email)=? ORDER BY r.id DESC');
        $returnsStmt->execute([$email]);
        $interactionsStmt = db()->prepare('SELECT * FROM crm_interactions WHERE customer_email=? ORDER BY id DESC LIMIT 100');
        $interactionsStmt->execute([$email]);
        respond(['customer' => $profile, 'orders' => $orders, 'support' => $supportStmt->fetchAll(), 'returns' => $returnsStmt->fetchAll(), 'interactions' => $interactionsStmt->fetchAll()]);
    }

    if ($action === 'crm_customer_save' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        $email = strtolower(trim((string)($b['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Correo de cliente no válido'], 422);
        $status = (string)($b['status'] ?? 'ACTIVO');
        $stage = (string)($b['lifecycle_stage'] ?? 'CLIENTE');
        if (!in_array($status, ['ACTIVO','EN_RIESGO','INACTIVO','BLOQUEADO'], true)) respond(['error' => 'Estado CRM no válido'], 422);
        if (!in_array($stage, ['LEAD','PRIMERA_COMPRA','CLIENTE','FIDELIZADO'], true)) respond(['error' => 'Etapa no válida'], 422);
        crm_seed_customer($email);
        $nextFollowUp = crm_datetime_or_null($b['next_follow_up_at'] ?? null);
        $stmt = db()->prepare('UPDATE crm_customers SET status=?,lifecycle_stage=?,owner=?,source=?,phone=?,tags=?,notes=?,next_follow_up_at=?,consent_marketing=? WHERE customer_email=?');
        $stmt->execute([
            $status,
            $stage,
            substr(trim((string)($b['owner'] ?? '')), 0, 120) ?: null,
            substr(trim((string)($b['source'] ?? 'TIENDA_ONLINE')), 0, 80) ?: 'TIENDA_ONLINE',
            substr(trim((string)($b['phone'] ?? '')), 0, 30) ?: null,
            substr(trim((string)($b['tags'] ?? '')), 0, 500) ?: null,
            substr(trim((string)($b['notes'] ?? '')), 0, 5000) ?: null,
            $nextFollowUp,
            !empty($b['consent_marketing']) ? 1 : 0,
            $email,
        ]);
        respond(['ok' => true]);
    }

    if ($action === 'crm_interaction_create' && $method === 'POST') {
        $admin = require_admin();
        $b = json_input();
        require_csrf($b);
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $type = (string)($b['interaction_type'] ?? 'NOTA');
        $subject = trim((string)($b['subject'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $subject === '') respond(['error' => 'Faltan el cliente o el asunto'], 422);
        if (!in_array($type, ['NOTA','LLAMADA','EMAIL','TAREA','CAMBIO_ESTADO'], true)) respond(['error' => 'Tipo de actividad no válido'], 422);
        crm_seed_customer($email);
        $followUp = crm_datetime_or_null($b['follow_up_at'] ?? null);
        $stmt = db()->prepare('INSERT INTO crm_interactions(customer_email,interaction_type,subject,body,outcome,follow_up_at,created_by) VALUES(?,?,?,?,?,?,?)');
        $stmt->execute([$email, $type, substr($subject, 0, 190), substr(trim((string)($b['body'] ?? '')), 0, 5000) ?: null, substr(trim((string)($b['outcome'] ?? '')), 0, 190) ?: null, $followUp, (string)$admin['email']]);
        if (in_array($type, ['LLAMADA','EMAIL'], true)) {
            db()->prepare('UPDATE crm_customers SET last_contact_at=NOW() WHERE customer_email=?')->execute([$email]);
        }
        if ($followUp) {
            db()->prepare('UPDATE crm_customers SET next_follow_up_at=? WHERE customer_email=?')->execute([$followUp, $email]);
        }
        respond(['ok' => true, 'id' => (int)db()->lastInsertId()], 201);
    }

    if ($action === 'crm_interaction_complete' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        $id = (int)($b['id'] ?? 0);
        $stmt = db()->prepare('SELECT customer_email FROM crm_interactions WHERE id=?');
        $stmt->execute([$id]);
        $interaction = $stmt->fetch();
        if (!$interaction) respond(['error' => 'Actividad no encontrada'], 404);
        db()->prepare('UPDATE crm_interactions SET completed=1,completed_at=NOW() WHERE id=?')->execute([$id]);
        $nextStmt = db()->prepare('SELECT MIN(follow_up_at) next_follow_up FROM crm_interactions WHERE customer_email=? AND completed=0 AND follow_up_at IS NOT NULL');
        $nextStmt->execute([$interaction['customer_email']]);
        $next = $nextStmt->fetch();
        db()->prepare('UPDATE crm_customers SET next_follow_up_at=? WHERE customer_email=?')->execute([$next['next_follow_up'] ?? null, $interaction['customer_email']]);
        respond(['ok' => true]);
    }

    if ($action === 'order_status' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        $valid = ['PAGO_SIMULADO', 'PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
        $status = (string)($b['status'] ?? '');
        if (!in_array($status, $valid, true)) respond(['error' => 'Estado no válido'], 422);
        $beforeStmt = db()->prepare('SELECT * FROM orders WHERE id=?');
        $beforeStmt->execute([(int)($b['order_id'] ?? 0)]);
        $before = $beforeStmt->fetch();
        if (!$before) respond(['error' => 'Pedido no encontrado'], 404);
        $stmt = db()->prepare('UPDATE orders SET status=? WHERE id=?');
        $stmt->execute([$status, (int)($b['order_id'] ?? 0)]);
        $orderStmt = db()->prepare('SELECT * FROM orders WHERE id=?');
        $orderStmt->execute([(int)($b['order_id'] ?? 0)]);
        $order = $orderStmt->fetch();
        $notifications = [];
        if ($order) {
            $order = attach_order_data([$order])[0];
            try {
                $notifications = dispatch_order_notifications(db(), $order, $status);
            } catch (Throwable $notificationError) {
                $notifications = [['channel' => 'SISTEMA', 'delivery_status' => 'ERROR', 'error_message' => $notificationError->getMessage()]];
            }
        }
        try {
            $integration = integration_emit(db(), 'order.status_changed', [
                'order_id' => (string)$before['id'], 'order_number' => $before['order_number'],
                'previous_status' => $before['status'], 'status' => $status,
                'changed_by' => (string)($_SESSION['user']['email'] ?? 'admin'),
            ], 'order-' . $before['id'] . '-status-' . strtolower($status) . '-' . time());
        } catch (Throwable $integrationError) {
            $integration = ['status' => 'ERROR', 'error' => $integrationError->getMessage()];
        }
        respond(['ok' => true, 'notifications' => $notifications, 'integration' => $integration]);
    }

    if ($action === 'product_save' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        $id = (int)($b['id'] ?? 0);
        $name = trim((string)($b['name'] ?? ''));
        $description = trim((string)($b['description'] ?? ''));
        if ($name === '' || $description === '') respond(['error' => 'Faltan datos del producto'], 422);
        if ($id) {
            $stmt = db()->prepare('UPDATE products SET name=?,category=?,description=?,long_description=?,price=?,stock=?,image=? WHERE id=?');
            $stmt->execute([$name, trim((string)($b['category'] ?? 'Visual')), $description, trim((string)($b['long_description'] ?? $description)), (float)($b['price'] ?? 0), max(0, (int)($b['stock'] ?? 0)), trim((string)($b['image'] ?? '')), $id]);
        } else {
            $stmt = db()->prepare('INSERT INTO products(sku,name,category,description,long_description,price,stock,image) VALUES(?,?,?,?,?,?,?,?)');
            $sku = 'PRD-' . date('ymd') . '-' . random_int(100, 999);
            $stmt->execute([$sku, $name, trim((string)($b['category'] ?? 'Visual')), $description, trim((string)($b['long_description'] ?? $description)), (float)($b['price'] ?? 0), max(0, (int)($b['stock'] ?? 0)), trim((string)($b['image'] ?? ''))]);
            $id = (int)db()->lastInsertId();
        }
        $productStmt = db()->prepare('SELECT id,sku,name,stock FROM products WHERE id=?');
        $productStmt->execute([$id]);
        $product = $productStmt->fetch();
        try {
            $integration = integration_emit(db(), 'stock.changed', [
                'product_id' => (string)$product['id'], 'sku' => $product['sku'],
                'product_name' => $product['name'], 'stock' => (int)$product['stock'],
            ], 'product-' . $product['id'] . '-stock-' . $product['stock'] . '-' . time());
        } catch (Throwable $integrationError) {
            $integration = ['status' => 'ERROR', 'error' => $integrationError->getMessage()];
        }
        respond(['ok' => true, 'integration' => $integration]);
    }

    if ($action === 'product_toggle' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        db()->prepare('UPDATE products SET active=? WHERE id=?')->execute([(int)!empty($b['active']), (int)($b['id'] ?? 0)]);
        respond(['ok' => true]);
    }

    if ($action === 'coupon_create' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        $stmt = db()->prepare('INSERT INTO coupons(code,discount_percent,minimum_amount,max_uses,starts_at,ends_at,active) VALUES(?,?,?,?,?,?,1)');
        $stmt->execute([
            strtoupper(trim((string)($b['code'] ?? ''))),
            max(1, min(100, (int)($b['discount_percent'] ?? 0))),
            max(0, (float)($b['minimum_amount'] ?? 0)),
            max(1, (int)($b['max_uses'] ?? 1)),
            trim((string)($b['starts_at'] ?? date('Y-m-d'))),
            trim((string)($b['ends_at'] ?? date('Y-m-d'))),
        ]);
        respond(['ok' => true], 201);
    }

    if ($action === 'coupon_toggle' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        db()->prepare('UPDATE coupons SET active=? WHERE id=?')->execute([(int)!empty($b['active']), (int)($b['id'] ?? 0)]);
        respond(['ok' => true]);
    }

    if ($action === 'return_status' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        $valid = ['SOLICITADA', 'APROBADA', 'RECHAZADA', 'REEMBOLSO_SIMULADO'];
        if (!in_array((string)($b['status'] ?? ''), $valid, true)) respond(['error' => 'Estado de devolución no válido'], 422);
        db()->prepare('UPDATE returns SET status=? WHERE id=?')->execute([(string)($b['status'] ?? ''), (int)($b['id'] ?? 0)]);
        respond(['ok' => true]);
    }

    if ($action === 'event' && $method === 'POST') {
        $b = json_input();
        require_csrf($b);
        $allowed = ['product.viewed', 'cart.item_added', 'cart.item_removed', 'cart.added', 'cart.removed', 'order.created', 'checkout.started', 'payment.simulated', 'support.requested', 'return.requested'];
        $type = trim((string)($b['type'] ?? ''));
        if (!in_array($type, $allowed, true)) {
            respond(['error' => 'Tipo de evento no permitido'], 422);
        }
        $sessionId = substr(preg_replace('/[^A-Za-z0-9_-]/', '', (string)($b['session_id'] ?? '')), 0, 80);
        $productId = isset($b['product_id']) ? (int)$b['product_id'] : null;
        $stmt = db()->prepare('INSERT INTO events(event_type,session_id,product_id,payload) VALUES(?,?,?,?)');
        $stmt->execute([$type, $sessionId !== '' ? $sessionId : 'WEB', $productId, json_encode($b['payload'] ?? [])]);
        respond(['ok' => true], 201);
    }

    respond(['error' => 'Ruta no encontrada'], 404);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $code = (int)$e->getCode() === 23000 ? 409 : 500;
    respond(['error' => $code === 409 ? 'El registro ya existe' : 'Error de base de datos. Revisa config.php e install.php'], $code);
} catch (RuntimeException $e) {
    if ($e->getMessage() === 'Token CSRF inválido.') {
        respond([
            'error' => 'La sesión ha caducado. Estamos renovando la conexión segura.',
            'code' => 'csrf_expired',
            'csrf' => csrf_token(),
        ], 419);
    }
    respond(['error' => $e->getMessage()], 500);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(['error' => $e->getMessage()], 500);
}

function crm_datetime_or_null(mixed $value): ?string {
    $raw = trim((string)($value ?? ''));
    if ($raw === '') return null;
    $timestamp = strtotime($raw);
    if ($timestamp === false) respond(['error' => 'Fecha de seguimiento no válida'], 422);
    return date('Y-m-d H:i:s', $timestamp);
}

function crm_seed_customer(string $email): void {
    $stmt = db()->prepare("INSERT IGNORE INTO crm_customers(customer_email,status,lifecycle_stage,phone)
        SELECT LOWER(customer_email),
               CASE WHEN MAX(created_at)<DATE_SUB(NOW(),INTERVAL 180 DAY) THEN 'INACTIVO'
                    WHEN MAX(created_at)<DATE_SUB(NOW(),INTERVAL 90 DAY) THEN 'EN_RIESGO' ELSE 'ACTIVO' END,
               CASE WHEN COUNT(*)=1 THEN 'PRIMERA_COMPRA'
                    WHEN COUNT(*)>=4 OR SUM(total)>=500 THEN 'FIDELIZADO' ELSE 'CLIENTE' END,
               MAX(phone)
        FROM orders WHERE LOWER(customer_email)=? GROUP BY LOWER(customer_email)");
    $stmt->execute([$email]);
}

function crm_dashboard_data(): array {
    db()->exec("INSERT IGNORE INTO crm_customers(customer_email,status,lifecycle_stage,phone)
        SELECT LOWER(customer_email),
               CASE WHEN MAX(created_at)<DATE_SUB(NOW(),INTERVAL 180 DAY) THEN 'INACTIVO'
                    WHEN MAX(created_at)<DATE_SUB(NOW(),INTERVAL 90 DAY) THEN 'EN_RIESGO' ELSE 'ACTIVO' END,
               CASE WHEN COUNT(*)=1 THEN 'PRIMERA_COMPRA'
                    WHEN COUNT(*)>=4 OR SUM(total)>=500 THEN 'FIDELIZADO' ELSE 'CLIENTE' END,
               MAX(phone)
        FROM orders GROUP BY LOWER(customer_email)");
    $sql = "SELECT a.email,a.name,COALESCE(NULLIF(c.phone,''),a.phone) phone,a.orders,a.spend,a.average_order,a.first_order,a.last_order,
                   c.status,c.lifecycle_stage,c.owner,c.source,c.tags,c.next_follow_up_at,c.last_contact_at,c.consent_marketing,
                   (SELECT COUNT(*) FROM support_requests s WHERE LOWER(s.customer_email)=a.email AND s.status IN ('ABIERTA','EN_REVISION')) open_cases,
                   (SELECT COUNT(*) FROM returns r JOIN orders ro ON ro.id=r.order_id WHERE LOWER(ro.customer_email)=a.email AND r.status IN ('SOLICITADA','APROBADA')) open_returns,
                   CASE WHEN c.status='BLOQUEADO' THEN 'BLOQUEADO' WHEN a.spend>=500 OR a.orders>=4 THEN 'VIP'
                        WHEN c.status IN ('EN_RIESGO','INACTIVO') THEN c.status WHEN a.orders=1 THEN 'NUEVO' ELSE 'ACTIVO' END segment
            FROM (SELECT LOWER(customer_email) email,MAX(customer_name) name,MAX(phone) phone,COUNT(*) orders,
                         ROUND(SUM(total),2) spend,ROUND(AVG(total),2) average_order,MIN(created_at) first_order,MAX(created_at) last_order
                  FROM orders GROUP BY LOWER(customer_email)) a
            JOIN crm_customers c ON c.customer_email=a.email
            ORDER BY a.spend DESC,a.last_order DESC LIMIT 500";
    $customers = db()->query($sql)->fetchAll();
    $totalSpend = 0.0;
    $repeat = 0;
    $vip = 0;
    $openCases = 0;
    $followUpsDue = 0;
    foreach ($customers as $customer) {
        $totalSpend += (float)$customer['spend'];
        if ((int)$customer['orders'] > 1) $repeat++;
        if ($customer['segment'] === 'VIP') $vip++;
        $openCases += (int)$customer['open_cases'];
        if (!empty($customer['next_follow_up_at']) && strtotime((string)$customer['next_follow_up_at']) <= time()) $followUpsDue++;
    }
    $count = count($customers);
    return [
        'customers' => $customers,
        'metrics' => [
            'total_customers' => $count,
            'total_spend' => round($totalSpend, 2),
            'average_value' => $count ? round($totalSpend / $count, 2) : 0,
            'repeat_rate' => $count ? round(($repeat / $count) * 100, 1) : 0,
            'vip_count' => $vip,
            'open_cases' => $openCases,
            'follow_ups_due' => $followUpsDue,
        ],
        'generated_at' => date(DATE_ATOM),
    ];
}

function normalize_recommendation_text(string $value): string {
    return strtolower(strtr($value, [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
        'ü' => 'u', 'ñ' => 'n', 'Á' => 'a', 'É' => 'e', 'Í' => 'i',
        'Ó' => 'o', 'Ú' => 'u', 'Ü' => 'u', 'Ñ' => 'n',
    ]));
}

function smart_catalog_recommendation(array $products, string $prompt): array {
    $query = normalize_recommendation_text($prompt);
    $tokens = array_values(array_filter(
        preg_split('/[^a-z0-9]+/', $query) ?: [],
        static fn (string $token): bool => strlen($token) >= 4
    ));
    $rules = [
        [
            'terms' => ['dormir', 'sueno', 'noche', 'descanso', 'insomnio'],
            'category' => 'Sonoro',
            'hints' => ['nocturno', 'ruido', 'lluvia', 'oleaje', 'ambiental'],
            'reason' => 'Su estímulo continuo ayuda a crear una transición suave hacia el descanso.',
        ],
        [
            'terms' => ['concentrar', 'concentracion', 'foco', 'estudiar', 'trabajar', 'distracciones'],
            'category' => 'Táctil',
            'hints' => ['mano', 'presion', 'silencioso', 'pausa', 'antiestrés'],
            'reason' => 'Ofrece una vía discreta para mantener las manos ocupadas y recuperar el foco.',
        ],
        [
            'terms' => ['estres', 'ansiedad', 'calma', 'relajar', 'relajacion', 'desconectar'],
            'category' => 'Visual',
            'hints' => ['suave', 'calma', 'respiracion', 'luz', 'movimiento'],
            'reason' => 'Su estímulo gradual favorece una pausa visual y un ambiente de calma.',
        ],
        [
            'terms' => ['luz', 'visual', 'color', 'proyector', 'ambiente'],
            'category' => 'Visual',
            'hints' => ['luz', 'color', 'proyecta', 'luminoso'],
            'reason' => 'Encaja con tu preferencia por una experiencia visual envolvente.',
        ],
        [
            'terms' => ['tacto', 'textura', 'manos', 'presion', 'sensorial'],
            'category' => 'Táctil',
            'hints' => ['textura', 'manos', 'presion', 'relieve'],
            'reason' => 'Está pensado para canalizar la atención mediante textura y presión controlada.',
        ],
        [
            'terms' => ['sonido', 'ruido', 'audio', 'musica', 'escuchar'],
            'category' => 'Sonoro',
            'hints' => ['sonido', 'ruido', 'paisajes', 'lluvia'],
            'reason' => 'Aporta un fondo sonoro estable que ayuda a regular el ambiente.',
        ],
    ];

    $scores = array_fill(0, count($products), 0);
    $reasons = [];
    foreach ($products as $index => $product) {
        $haystack = normalize_recommendation_text(implode(' ', [
            (string)($product['name'] ?? ''),
            (string)($product['category'] ?? ''),
            (string)($product['description'] ?? ''),
        ]));
        foreach ($tokens as $token) {
            if (str_contains($haystack, $token)) $scores[$index] += 2;
        }
    }

    foreach ($rules as $rule) {
        $matchesIntent = false;
        foreach ($rule['terms'] as $term) {
            if (str_contains($query, $term)) {
                $matchesIntent = true;
                break;
            }
        }
        if (!$matchesIntent) continue;
        $reasons[] = $rule['reason'];
        foreach ($products as $index => $product) {
            if (normalize_recommendation_text((string)($product['category'] ?? '')) === normalize_recommendation_text($rule['category'])) {
                $scores[$index] += 7;
            }
            $haystack = normalize_recommendation_text((string)($product['description'] ?? ''));
            foreach ($rule['hints'] as $hint) {
                if (str_contains($haystack, normalize_recommendation_text($hint))) $scores[$index] += 3;
            }
        }
    }

    if (str_contains($query, 'barato') || str_contains($query, 'economico') || str_contains($query, 'precio')) {
        foreach ($products as $index => $product) {
            $scores[$index] += max(0, 5 - (int)floor((float)($product['price'] ?? 0) / 20));
        }
        $reasons[] = 'Además, mantiene una relación equilibrada entre utilidad y precio.';
    }

    $bestIndex = 0;
    foreach ($scores as $index => $score) {
        if ($score > $scores[$bestIndex]) $bestIndex = $index;
    }
    $product = $products[$bestIndex];
    $reason = $reasons[0] ?? 'Es una opción versátil para empezar una rutina sensorial sencilla.';
    $price = number_format((float)($product['price'] ?? 0), 2, ',', '.');

    return [
        'recommendation' => sprintf(
            '%s es nuestra mejor recomendación para ti. %s Su precio es %s € y puedes encontrarlo ahora mismo en el catálogo.',
            (string)$product['name'],
            $reason,
            $price
        ),
        'product' => [
            'id' => (int)($product['id'] ?? 0),
            'name' => (string)($product['name'] ?? ''),
            'category' => (string)($product['category'] ?? ''),
            'price' => (float)($product['price'] ?? 0),
        ],
        'mode' => 'catalog_intelligence',
    ];
}

function attach_order_data(array $orders): array {
    if (!$orders) return [];
    $ids = array_column($orders, 'id');
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare("SELECT * FROM order_items WHERE order_id IN ($marks)");
    $stmt->execute($ids);
    $itemsByOrder = [];
    foreach ($stmt->fetchAll() as $item) {
        $itemsByOrder[(int) $item['order_id']][] = $item;
    }

    foreach ($orders as &$order) {
        $order['items'] = $itemsByOrder[(int)$order['id']] ?? [];
    }
    unset($order);
    return $orders;
}

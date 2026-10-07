<?php

declare(strict_types=1);
session_set_cookie_params([
    'lifetime' => SESSION_LIFETIME,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => SESSION_SAMESITE,
]);
session_start();

require dirname(__DIR__) . '/config.php';
require dirname(__DIR__) . '/lib/notifications.php';

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

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_array($items) || count($items) === 0 || $name === '' || $phone === '' || $address === '' || $city === '' || $postalCode === '') {
            respond(['error' => 'Datos de compra incompletos'], 422);
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
        $tax = round(($subtotal - $discount + $shipping) * 0.21, 2);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

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
            'PAGO_SIMULADO',
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
            json_encode(['total' => $total, 'coupon' => $coupon]),
        ]);

        $order = [
            'id' => $orderId,
            'order_number' => $orderNumber,
            'customer_name' => $name,
            'customer_email' => $email,
            'phone' => $phone,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'shipping' => $shipping,
            'tax' => $tax,
            'total' => $total,
            'coupon_code' => $coupon !== '' ? $coupon : null,
            'status' => 'PAGO_SIMULADO',
            'payment_method' => 'PAGO_SIMULADO',
            'created_at' => date('Y-m-d H:i:s'),
        ];

        try {
            $notifications = dispatch_order_notifications($pdo, $order, 'PAGO_SIMULADO');
        } catch (Throwable $notificationError) {
            $notifications = [['channel' => 'SISTEMA', 'recipient' => '', 'delivery_status' => ['status' => 'ERROR', 'provider_id' => null, 'error' => $notificationError->getMessage()]]];
        }

        $pdo->commit();
        respond(['order' => $order, 'notifications' => $notifications], 201);
    }

    if ($action === 'my_orders' && $method === 'GET') {
        $user = require_login();
        $stmt = db()->prepare('SELECT * FROM orders WHERE user_id=? OR customer_email=? ORDER BY id DESC');
        $stmt->execute([$user['id'], $user['email']]);
        respond(['orders' => $stmt->fetchAll()]);
    }

    if ($action === 'return_request' && $method === 'POST') {
        $user = require_login();
        $b = json_input();
        require_csrf($b);
        $stmt = db()->prepare('SELECT * FROM orders WHERE id=? AND (user_id=? OR customer_email=?)');
        $stmt->execute([(int)($b['order_id'] ?? 0), $user['id'], $user['email']]);
        $order = $stmt->fetch();
        if (!$order) respond(['error' => 'Pedido no encontrado'], 404);
        $stmt = db()->prepare('INSERT INTO returns(order_id,reason,details,status) VALUES(?,?,?,"SOLICITADA")');
        $stmt->execute([(int)$order['id'], trim((string)($b['reason'] ?? '')), trim((string)($b['details'] ?? ''))]);
        respond(['ok' => true], 201);
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
            respond(['recommendation' => 'Modo demostración: configura la clave GEMINI_API_KEY en el servidor para habilitar respuestas en tiempo real.']);
        }

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' . $apiKey;
        $payload = [
            'contents' => [[
                'parts' => [[ 'text' => $systemInstruction . "\n\n" . $catalogText . "\n\nConsulta del cliente: " . $userPrompt ]],
            ]],
        ];

        $modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
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
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);

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

        respond(['error' => $lastError], 500);
    }

    if ($action === 'admin_data' && $method === 'GET') {
        require_admin();
        $orders = attach_order_data(db()->query('SELECT * FROM orders ORDER BY id DESC LIMIT 100')->fetchAll());
        $products = db()->query('SELECT * FROM products ORDER BY id')->fetchAll();
        $customers = db()->query("SELECT customer_email email,MAX(customer_name) name,COUNT(*) orders,ROUND(SUM(total),2) spend,MAX(created_at) last_order FROM orders GROUP BY customer_email ORDER BY spend DESC LIMIT 30")->fetchAll();
        $notifications = db()->query('SELECT * FROM notifications ORDER BY id DESC LIMIT 50')->fetchAll();
        $coupons = db()->query('SELECT * FROM coupons ORDER BY id DESC')->fetchAll();
        respond(['orders' => $orders, 'products' => $products, 'customers' => $customers, 'notifications' => $notifications, 'coupons' => $coupons, 'notification_config' => ['email_enabled' => true, 'sms_enabled' => false]]);
    }

    if ($action === 'crm' && $method === 'GET') {
        require_admin();
        $sql = "SELECT customer_email email,MAX(customer_name) name,COUNT(*) orders,ROUND(SUM(total),2) spend,MAX(created_at) last_order,CASE WHEN SUM(total)>=500 OR COUNT(*)>=4 THEN 'VIP' ELSE 'REGULAR' END segment FROM orders GROUP BY customer_email ORDER BY spend DESC LIMIT 20";
        respond(['customers' => db()->query($sql)->fetchAll()]);
    }

    if ($action === 'order_status' && $method === 'POST') {
        require_admin();
        $b = json_input();
        require_csrf($b);
        $valid = ['PAGO_SIMULADO', 'PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
        $status = (string)($b['status'] ?? '');
        if (!in_array($status, $valid, true)) respond(['error' => 'Estado no válido'], 422);
        $stmt = db()->prepare('UPDATE orders SET status=? WHERE id=?');
        $stmt->execute([$status, (int)($b['order_id'] ?? 0)]);
        respond(['ok' => true]);
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
        }
        respond(['ok' => true]);
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
        $allowed = ['product.viewed', 'cart.added', 'cart.removed', 'order.created', 'checkout.started', 'return.requested'];
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
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(['error' => $e->getMessage()], 500);
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

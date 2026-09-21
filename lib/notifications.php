<?php
declare(strict_types=1);

/** Envía correo y SMS (o los registra como simulados) sin interrumpir el pedido. */
function dispatch_order_notifications(PDO $pdo, array $order, string $template): array {
    $message = notification_message($order, $template);
    $email = send_smtp_notification((string)$order['customer_email'], $message['subject'], $message['html']);
    save_notification($pdo, $order, 'EMAIL', $template, $message['subject'], $message['text'], $email);

    $phone = normalize_phone((string)($order['phone'] ?? ''));
    $sms = $phone === ''
        ? ['status'=>'ERROR','provider_id'=>null,'error'=>'Teléfono no válido']
        : send_twilio_sms($phone, $message['sms']);
    save_notification($pdo, $order, 'SMS', $template, 'SMS · ' . $message['subject'], $message['sms'], $sms, $phone);

    return [
        ['channel'=>'EMAIL','recipient'=>(string)$order['customer_email'],'delivery_status'=>$email['status'],'error_message'=>$email['error']],
        ['channel'=>'SMS','recipient'=>$phone ?: (string)($order['phone'] ?? ''),'delivery_status'=>$sms['status'],'error_message'=>$sms['error']],
    ];
}

function notification_message(array $order, string $template): array {
    $titles = [
        'PAGO_SIMULADO' => 'Hemos recibido tu pedido',
        'PREPARACION' => 'Estamos preparando tu pedido',
        'ENVIADO' => 'Tu pedido está en camino',
        'ENTREGADO' => 'Tu pedido ha sido entregado',
        'CANCELADO' => 'Tu pedido ha sido cancelado',
    ];
    $details = [
        'PAGO_SIMULADO' => 'Tu pedido ha quedado confirmado y el pago de demostración se ha registrado correctamente.',
        'PREPARACION' => 'Nuestro equipo ya está preparando tus instrumentos sensoriales.',
        'ENVIADO' => 'Tu pedido ha salido de nuestro almacén y va de camino a la dirección indicada.',
        'ENTREGADO' => 'El pedido figura como entregado. Esperamos que disfrutes de tu nuevo ritual sensorial.',
        'CANCELADO' => 'El pedido figura como cancelado. Si tienes dudas, responde a este correo.',
    ];
    $subject = ($titles[$template] ?? 'Actualización de tu pedido') . ' · ' . $order['order_number'];
    $detail = $details[$template] ?? 'Hay una actualización disponible para tu pedido.';
    $name = htmlspecialchars((string)$order['customer_name'], ENT_QUOTES, 'UTF-8');
    $number = htmlspecialchars((string)$order['order_number'], ENT_QUOTES, 'UTF-8');
    $total = number_format((float)$order['total'], 2, ',', '.') . ' €';
    $html = '<!doctype html><html lang="es"><body style="margin:0;background:#edf3f5;font-family:Arial,sans-serif;color:#102a3c">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px">'
        . '<table role="presentation" width="620" style="max-width:100%;background:#fff;border-radius:20px;overflow:hidden">'
        . '<tr><td style="background:#102a3c;color:#fff;padding:28px 34px"><b style="font-size:24px;letter-spacing:2px">SENSORIA</b><br><span style="color:#bdd0db">Tu pausa empieza aquí</span></td></tr>'
        . '<tr><td style="padding:34px"><p style="color:#315f78;font-weight:bold">PEDIDO ' . $number . '</p><h1 style="font-size:28px">' . htmlspecialchars($subject, ENT_QUOTES, 'UTF-8') . '</h1>'
        . '<p>Hola ' . $name . ',</p><p style="font-size:17px;line-height:1.6">' . htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<div style="background:#fff3df;border-radius:14px;padding:18px;margin:24px 0"><span>Total del pedido</span><b style="float:right;font-size:20px">' . $total . '</b></div>'
        . '<p style="color:#647786;font-size:13px">Este mensaje se ha generado automáticamente desde la tienda académica Sensoria.</p></td></tr></table>'
        . '</td></tr></table></body></html>';
    $text = "Hola {$order['customer_name']}. {$detail} Pedido {$order['order_number']}. Total: {$total}.";
    $sms = "Sensoria: {$detail} Pedido {$order['order_number']}.";
    if (strlen($sms) > 300) $sms = substr($sms, 0, 297) . '...';
    return compact('subject', 'html', 'text', 'sms');
}

function send_smtp_notification(string $recipient, string $subject, string $html): array {
    if (!MAIL_ENABLED) return ['status'=>'SIMULADO','provider_id'=>null,'error'=>null];
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) return ['status'=>'ERROR','provider_id'=>null,'error'=>'Correo no válido'];
    $socket = null;
    try {
        $socket = stream_socket_client('tcp://' . SMTP_HOST . ':' . SMTP_PORT, $errno, $errstr, 15);
        if (!$socket) throw new RuntimeException("Conexión SMTP: {$errstr}");
        stream_set_timeout($socket, 15);
        smtp_expect($socket, [220]);
        smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);
        smtp_command($socket, 'STARTTLS', [220]);
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('No se pudo activar TLS');
        smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);
        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode(SMTP_USER), [334]);
        smtp_command($socket, base64_encode(SMTP_PASS), [235]);
        smtp_command($socket, 'MAIL FROM:<' . SMTP_FROM_EMAIL . '>', [250]);
        smtp_command($socket, 'RCPT TO:<' . $recipient . '>', [250,251]);
        smtp_command($socket, 'DATA', [354]);
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . SMTP_FROM_NAME . ' <' . SMTP_FROM_EMAIL . '>',
            'To: <' . $recipient . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . ($_SERVER['SERVER_NAME'] ?? 'sensoria.local') . '>',
        ];
        $data = implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n.", "\n..", str_replace(["\r\n", "\r"], "\n", $html));
        fwrite($socket, str_replace("\n", "\r\n", $data) . "\r\n.\r\n");
        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221]);
        fclose($socket);
        return ['status'=>'ENVIADO','provider_id'=>null,'error'=>null];
    } catch (Throwable $e) {
        if (is_resource($socket)) fclose($socket);
        return ['status'=>'ERROR','provider_id'=>null,'error'=>substr($e->getMessage(), 0, 255)];
    }
}

function smtp_command($socket, string $command, array $codes): string {
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $codes);
}

function smtp_expect($socket, array $codes): string {
    $response = '';
    do {
        $line = fgets($socket, 515);
        if ($line === false) throw new RuntimeException('El servidor SMTP no respondió');
        $response .= $line;
    } while (isset($line[3]) && $line[3] === '-');
    if (!in_array((int)substr($response, 0, 3), $codes, true)) throw new RuntimeException('SMTP: ' . trim($response));
    return $response;
}

function send_twilio_sms(string $recipient, string $body): array {
    if (!SMS_ENABLED) return ['status'=>'SIMULADO','provider_id'=>null,'error'=>null];
    if (!function_exists('curl_init')) return ['status'=>'ERROR','provider_id'=>null,'error'=>'La extensión cURL no está activa'];
    $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode(TWILIO_ACCOUNT_SID) . '/Messages.json';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(['From'=>TWILIO_FROM_NUMBER,'To'=>$recipient,'Body'=>$body]),
        CURLOPT_USERPWD => TWILIO_ACCOUNT_SID . ':' . TWILIO_AUTH_TOKEN,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $raw = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    $data = json_decode((string)$raw, true);
    if ($raw === false || $http < 200 || $http >= 300) {
        $error = $data['message'] ?? $curlError ?: 'El proveedor SMS rechazó el envío';
        return ['status'=>'ERROR','provider_id'=>null,'error'=>substr((string)$error, 0, 255)];
    }
    return ['status'=>'ENVIADO','provider_id'=>$data['sid'] ?? null,'error'=>null];
}

function normalize_phone(string $phone): string {
    $phone = preg_replace('/[^0-9+]/', '', trim($phone)) ?? '';
    if (str_starts_with($phone, '00')) $phone = '+' . substr($phone, 2);
    if (preg_match('/^[6789][0-9]{8}$/', $phone)) $phone = '+34' . $phone;
    return preg_match('/^\+[1-9][0-9]{7,14}$/', $phone) ? $phone : '';
}

function save_notification(PDO $pdo, array $order, string $channel, string $template, string $subject, string $body, array $result, string $phone = ''): void {
    $stmt = $pdo->prepare('INSERT INTO notifications(order_id,channel,recipient_email,recipient_phone,template,subject,body,delivery_status,provider_id,error_message) VALUES(?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $order['id'], $channel,
        $channel === 'EMAIL' ? $order['customer_email'] : null,
        $channel === 'SMS' ? ($phone ?: ($order['phone'] ?? null)) : null,
        $template, $subject, $body, $result['status'], $result['provider_id'], $result['error'],
    ]);
}

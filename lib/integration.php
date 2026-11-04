<?php
declare(strict_types=1);

/**
 * Crea un evento en el outbox local y trata de entregarlo a n8n.
 * Un fallo de integración nunca rompe una compra o una solicitud de soporte.
 */
function integration_emit(PDO $pdo, string $eventType, array $payload, string $idempotencyKey): array {
    $eventId = 'evt-' . bin2hex(random_bytes(12));
    $event = [
        'event_id' => $eventId,
        'event_type' => $eventType,
        'occurred_at' => gmdate('c'),
        'source' => 'sensoria-frontoffice',
        'idempotency_key' => $idempotencyKey,
        'payload' => $payload,
    ];
    $raw = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $status = INTEGRATION_ENABLED ? 'PENDING' : 'SIMULATED';
    $stmt = $pdo->prepare('INSERT INTO integration_outbox(event_id,event_type,idempotency_key,payload_json,status) VALUES(?,?,?,?,?)');
    $stmt->execute([$eventId, $eventType, $idempotencyKey, $raw, $status]);

    if (!INTEGRATION_ENABLED) {
        return ['event_id' => $eventId, 'status' => 'SIMULATED', 'message' => 'Activa INTEGRATION_ENABLED al desplegar n8n'];
    }
    return integration_deliver($pdo, $eventId, $raw);
}

function integration_deliver(PDO $pdo, string $eventId, string $raw): array {
    if (!function_exists('curl_init')) {
        return integration_fail($pdo, $eventId, 'La extensión cURL no está disponible');
    }
    $signature = hash_hmac('sha256', $raw, INTEGRATION_SHARED_SECRET);
    $event = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    $ch = curl_init(INTEGRATION_WEBHOOK_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $raw,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => INTEGRATION_TIMEOUT_SECONDS,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-Sensoria-Signature: sha256=' . $signature,
            'X-Idempotency-Key: ' . $event['idempotency_key'],
        ],
    ]);
    $response = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false || $http < 200 || $http >= 300) {
        return integration_fail($pdo, $eventId, $error ?: 'n8n respondió HTTP ' . $http, $http, (string)$response);
    }
    $pdo->prepare("UPDATE integration_outbox SET status='DELIVERED',attempts=attempts+1,http_status=?,response_body=?,last_error=NULL,delivered_at=NOW(),updated_at=NOW() WHERE event_id=?")
        ->execute([$http, substr((string)$response, 0, 4000), $eventId]);
    return ['event_id' => $eventId, 'status' => 'DELIVERED', 'http_status' => $http];
}

function integration_fail(PDO $pdo, string $eventId, string $message, ?int $http = null, string $response = ''): array {
    $pdo->prepare("UPDATE integration_outbox SET status='ERROR',attempts=attempts+1,http_status=?,response_body=?,last_error=?,updated_at=NOW() WHERE event_id=?")
        ->execute([$http, substr($response, 0, 4000), substr($message, 0, 500), $eventId]);
    return ['event_id' => $eventId, 'status' => 'ERROR', 'http_status' => $http, 'error' => $message];
}

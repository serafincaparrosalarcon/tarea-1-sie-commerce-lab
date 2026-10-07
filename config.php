<?php

declare(strict_types=1);

/*
 * Completa estos cuatro datos desde el panel de DonDominio.
 * No publiques este archivo con contraseñas reales en GitHub.
 */
const DB_HOST = 'localhost';
const DB_NAME = 'TU_BASE_DE_DATOS';
const DB_USER = 'TU_USUARIO';
const DB_PASS = 'TU_CONTRASENA';

const APP_NAME = 'Sensoria';
const APP_ACADEMIC = true;

const SESSION_LIFETIME = 1800;
const SESSION_SAMESITE = 'Strict';

/*
 * AVISOS REALES (deja false hasta completar las credenciales).
 * En DonDominio crea primero una cuenta como pedidos@tu-dominio.es.
 * Nunca publiques contraseñas o tokens reales en GitHub.
 */
const MAIL_ENABLED = false;
const SMTP_HOST = 'smtp.dondominio.com';
const SMTP_PORT = 587;
const SMTP_USER = 'pedidos@TU_DOMINIO.es';
const SMTP_PASS = 'TU_CONTRASENA_DE_CORREO';
const SMTP_FROM_EMAIL = 'pedidos@TU_DOMINIO.es';
const SMTP_FROM_NAME = 'Sensoria';

/* Destinatario del aviso interno de cada nuevo pedido. */
const ORDER_NOTIFICATION_EMAIL = 'ventas@sensoria.onl';

/* SMS reales mediante Twilio. El número debe estar en formato internacional. */
const SMS_ENABLED = false;
const TWILIO_ACCOUNT_SID = 'TU_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = 'TU_AUTH_TOKEN';
const TWILIO_FROM_NUMBER = '+10000000000';

const PAYPAL_MODE = 'sandbox'; // cambia a 'live' cuando estés listo
const PAYPAL_CLIENT_ID = 'TU_CLIENT_ID_PUBLICO';
const PAYPAL_CLIENT_SECRET = 'TU_CLIENT_SECRET_SECRETA';
const PAYPAL_BASE_URL = PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

/* Configuración de IA (la clave real se debe guardar en variables de entorno o secretos del hosting) */
const GEMINI_API_KEY = getenv('GEMINI_API_KEY') ?: 'TU_GEMINI_API_KEY';

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_input(int $maxBytes = 1048576): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    if (strlen($raw) > $maxBytes) {
        throw new InvalidArgumentException('Payload demasiado grande.');
    }
    $body = json_decode($raw, true);
    return is_array($body) ? $body : [];
}

function respond(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf_token'];
}

function require_csrf(?array $payload = null): void {
    $expected = $_SESSION['csrf_token'] ?? '';
    $received = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($payload !== null && $received === '') {
        $received = trim((string) ($payload['csrf'] ?? ''));
    }
    if ($expected === '' || !hash_equals($expected, $received)) {
        throw new RuntimeException('Token CSRF inválido.');
    }
}

function require_login(): array {
    if (empty($_SESSION['user'])) respond(['error' => 'Debes iniciar sesión'], 401);
    return $_SESSION['user'];
}

function require_admin(): array {
    $user = require_login();
    if (($user['role'] ?? '') !== 'admin') respond(['error' => 'Acceso restringido'], 403);
    return $user;
}

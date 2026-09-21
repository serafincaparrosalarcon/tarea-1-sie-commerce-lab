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

/* SMS reales mediante Twilio. El número debe estar en formato internacional. */
const SMS_ENABLED = false;
const TWILIO_ACCOUNT_SID = 'TU_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = 'TU_AUTH_TOKEN';
const TWILIO_FROM_NUMBER = '+10000000000';

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

function json_input(): array {
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    return is_array($body) ? $body : [];
}

function respond(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
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

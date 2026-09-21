<?php
declare(strict_types=1);
session_start();
$message = '';
$ok = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/config.php';
    try {
        $sql = file_get_contents(__DIR__ . '/database.sql');
        if ($sql === false) throw new RuntimeException('No se encuentra database.sql');
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
            db()->exec($statement);
        }
        $name = trim((string)($_POST['name'] ?? 'Administrador'));
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            throw new RuntimeException('Introduce un correo válido y una contraseña de al menos 8 caracteres.');
        }
        $stmt = db()->prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,\'admin\') ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=\'admin\'');
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        $ok = true;
        $message = 'Instalación completada. Ya puedes entrar en Sensoria y eliminar install.php del servidor.';
    } catch (Throwable $e) {
        $message = 'No se pudo instalar: ' . $e->getMessage();
    }
}
?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instalar Sensoria</title><style>
body{margin:0;background:#eef3f5;color:#102a3c;font:16px system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}.card{width:min(520px,calc(100% - 40px));background:#fff;border-radius:22px;padding:32px;box-shadow:0 24px 70px #102a3c20}h1{font-size:34px;margin:0 0 8px}p{color:#647786;line-height:1.55}.notice{padding:13px;border-radius:10px;background:<?= $ok?'#e5f4eb':'#fff3dd' ?>;color:#234e3e;margin:18px 0}label{display:grid;gap:7px;margin:14px 0;font-weight:700;font-size:14px}input{border:1px solid #cedbe2;border-radius:10px;padding:12px;font:inherit}button,a{display:block;width:100%;box-sizing:border-box;border:0;border-radius:10px;background:#244a68;color:#fff;padding:13px;text-align:center;text-decoration:none;font-weight:800;margin-top:18px}small{display:block;margin-top:18px;color:#7a8992;line-height:1.5}
</style></head><body><main class="card"><span>CONFIGURACIÓN INICIAL</span><h1>Sensoria</h1><p>Primero completa los datos de MySQL en <b>config.php</b>. Después crea aquí la cuenta administradora.</p><?php if($message):?><div class="notice"><?=htmlspecialchars($message)?></div><?php endif;?><?php if($ok):?><a href="index.php">Abrir la tienda</a><?php else:?><form method="post"><label>Nombre del administrador<input name="name" required value="Administrador Sensoria"></label><label>Correo electrónico<input type="email" name="email" required></label><label>Contraseña<input type="password" name="password" minlength="8" required></label><button>Instalar base de datos</button></form><?php endif;?><small>Prototipo académico. No se procesan pagos ni reembolsos reales.</small></main></body></html>

<?php

declare(strict_types=1);

$message = '';
$ok = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/config.php';
    if (file_exists(__DIR__ . '/INSTALLED')) {
        http_response_code(403);
        exit('La instalación ya ha sido completada.');
    }
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
        file_put_contents(__DIR__ . '/INSTALLED', '1');
        $ok = true;
        $message = 'Instalación completada. Ya puedes entrar en Sensoria y eliminar install.php del servidor.';
    } catch (Throwable $e) {
        $message = 'No se pudo instalar: ' . $e->getMessage();
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Instalar Sensoria</title>
  <style>
    body{margin:0;background:#eef3f5;color:#102a3c;font:16px system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}
    .card{width:min(520px,calc(100% - 40px));background:#fff;border-radius:18px;box-shadow:0 18px 48px rgba(16,42,60,.12);padding:32px}
    .badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#dfeef5;color:#102a3c;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    h1{margin:14px 0 8px;font-size:2rem}
    .muted{color:#5b7187;line-height:1.6;margin-bottom:20px}
    label{display:block;margin-bottom:12px;font-weight:600}
    input{width:100%;padding:12px 14px;border:1px solid #d9e3ea;border-radius:10px;box-sizing:border-box;font:inherit;margin-top:6px}
    button{appearance:none;border:0;border-radius:10px;background:#102a3c;color:#fff;padding:12px 18px;cursor:pointer;font-weight:700;width:100%;margin-top:12px}
    .ok{padding:12px;border-radius:10px;background:#e8fff0;color:#175b39;border:1px solid #aee0b7;margin-top:18px}
    .fail{padding:12px;border-radius:10px;background:#fff1f1;color:#8b2334;border:1px solid #f0b7bf;margin-top:18px}
  </style>
</head>
<body>
  <main class="card">
    <span class="badge">Configuración inicial</span>
    <h1>Sensoria</h1>
    <p class="muted">Primero completa los datos de MySQL en <b>config.php</b>. Después crea aquí la cuenta administradora. Una vez instalada la base de datos, elimina <b>install.php</b> del servidor.</p>
    <?php if ($message !== ''): ?>
      <div class="<?= $ok ? 'ok' : 'fail' ?>"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endif; ?>
    <?php if (!$ok): ?>
      <form method="post">
        <label>Nombre del administrador<input name="name" value="Administrador" required></label>
        <label>Correo electrónico<input type="email" name="email" required></label>
        <label>Contraseña<input type="password" name="password" minlength="8" required></label>
        <button type="submit">Crear cuenta administradora</button>
      </form>
    <?php endif; ?>
  </main>
</body>
</html>

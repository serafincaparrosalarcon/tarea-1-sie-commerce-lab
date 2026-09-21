# Configurar correo y SMS reales

## Correo desde DonDominio

1. Crea la cuenta `pedidos@tu-dominio.es` en el panel de correo del dominio.
2. Edita únicamente el `config.php` que está en el servidor:

```php
const MAIL_ENABLED = true;
const SMTP_HOST = 'smtp.dondominio.com';
const SMTP_PORT = 587;
const SMTP_USER = 'pedidos@tu-dominio.es';
const SMTP_PASS = 'CONTRASEÑA_REAL';
const SMTP_FROM_EMAIL = 'pedidos@tu-dominio.es';
const SMTP_FROM_NAME = 'Sensoria';
```

La aplicación usa conexión autenticada, STARTTLS y una plantilla HTML responsive. Si falla, el pedido se conserva y el error aparece en **Gestión → Comunicaciones**.

## SMS mediante Twilio

1. Crea una cuenta de Twilio y consigue un número capaz de enviar SMS.
2. Copia el Account SID, Auth Token y número emisor en `config.php`:

```php
const SMS_ENABLED = true;
const TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const TWILIO_AUTH_TOKEN = 'TOKEN_REAL';
const TWILIO_FROM_NUMBER = '+10000000000';
```

Twilio puede exigir verificar el teléfono destinatario si la cuenta está en modo de prueba. El hosting también debe tener habilitada la extensión PHP cURL.

## Cuándo se avisa

Se intenta enviar un correo y un SMS en estos momentos:

- pedido confirmado;
- preparación;
- enviado;
- entregado;
- cancelado.

Cada intento queda registrado como `ENVIADO`, `SIMULADO` o `ERROR`. Nunca publiques las contraseñas reales ni el Auth Token en GitHub.

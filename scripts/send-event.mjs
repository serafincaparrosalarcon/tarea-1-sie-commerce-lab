import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [file, endpoint = 'http://localhost:8080/api/integrations/events'] = process.argv.slice(2);
if (!file) {
  console.error('Uso: node scripts/send-event.mjs payloads/order-created.json [URL]');
  process.exit(1);
}

const raw = readFileSync(file);
const secret = process.env.INTEGRATION_SHARED_SECRET;
if (!secret) {
  console.error('Configura INTEGRATION_SHARED_SECRET antes de enviar eventos.');
  process.exit(1);
}
const signature = createHmac('sha256', secret).update(raw).digest('hex');
const payload = JSON.parse(raw.toString('utf8'));
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-sensoria-signature': `sha256=${signature}`,
    'x-idempotency-key': payload.idempotency_key
  },
  body: raw
});

const result = await response.json().catch(() => ({}));
console.log(JSON.stringify({ http_status: response.status, ...result }, null, 2));
if (!response.ok) process.exitCode = 1;

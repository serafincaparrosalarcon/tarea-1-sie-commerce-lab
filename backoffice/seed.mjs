import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.env.BACKOFFICE_URL || `http://localhost:${process.env.PORT || 8080}`;
const secret = process.env.INTEGRATION_SHARED_SECRET;
if (!secret) throw new Error('Configura INTEGRATION_SHARED_SECRET antes de cargar datos.');
const files = ['order-created.json', 'order-status-changed.json', 'support-requested.json'];

for (const file of files) {
  const payload = JSON.parse(readFileSync(resolve('../payloads', file), 'utf8'));
  payload.event_id = `${payload.event_id}-seed-${Date.now()}`;
  payload.idempotency_key = payload.event_id;
  const raw = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(raw).digest('hex');
  const response = await fetch(`${baseUrl}/api/integrations/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sensoria-Signature': `sha256=${signature}`,
      'X-Idempotency-Key': payload.idempotency_key
    },
    body: raw
  });
  console.log(file, response.status, await response.text());
}

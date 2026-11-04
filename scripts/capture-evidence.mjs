import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const runtimeRoot = process.env.CODEX_PRIMARY_RUNTIME_ROOT;
if (!runtimeRoot) throw new Error('CODEX_PRIMARY_RUNTIME_ROOT no está definido');
const { chromium } = require(resolve(runtimeRoot, 'dependencies/node/node_modules/playwright'));
const baseUrl = process.env.BACKOFFICE_URL || 'http://127.0.0.1:8080';
const adminUser = process.env.ADMIN_USER || 'admin@sensoria.local';
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) throw new Error('Configura ADMIN_PASSWORD antes de capturar evidencias.');
const evidenceDir = resolve(process.env.EVIDENCE_DIR || 'evidence');
mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByLabel('Correo').fill(adminUser);
await page.getByLabel('Contraseña').fill(adminPassword);
await page.getByRole('button', { name: 'Entrar en Operations' }).click();
await page.getByText('PEDIDOS INTEGRADOS').waitFor();
await page.screenshot({ path: resolve(evidenceDir, '01-dashboard.png'), fullPage: true });

await page.getByRole('button', { name: /Pedidos/ }).click();
await page.getByText('SEN-2026-1104-001').waitFor();
await page.getByText('2 productos').click();
await page.screenshot({ path: resolve(evidenceDir, '02-pedidos-productos.png'), fullPage: true });

await page.getByRole('button', { name: /Postventa/ }).click();
await page.getByText('Producto recibido con una pieza dañada').waitFor();
await page.screenshot({ path: resolve(evidenceDir, '03-postventa.png'), fullPage: true });
await page.getByRole('button', { name: /Analizar con agente IA/ }).click();
await page.getByText(/PENDIENTE REVISION/i).waitFor();
await page.screenshot({ path: resolve(evidenceDir, '04-agente-supervisado.png'), fullPage: true });

await page.getByRole('button', { name: /Aprobar y notificar/ }).click();
await page.getByText(/EJECUTADA SIMULADA/i).waitFor();
await page.screenshot({ path: resolve(evidenceDir, '05-aprobacion-telegram.png'), fullPage: true });

await page.getByRole('button', { name: /Integraciones/ }).click();
await page.getByText('Historial de ejecuciones').waitFor();
await page.screenshot({ path: resolve(evidenceDir, '06-integraciones.png'), fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: /Resumen/ }).click();
await page.getByText('PEDIDOS INTEGRADOS').waitFor();
await page.screenshot({ path: resolve(evidenceDir, '07-responsive-mobile.png'), fullPage: true });
await browser.close();
console.log(`Evidencias creadas en ${evidenceDir}`);

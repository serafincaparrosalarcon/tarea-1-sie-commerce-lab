# Despliegue y URL finales

## Front-office

- Proveedor previsto: DonDominio.
- URL: `https://www.sensoria.onl`
- Ejecutar en orden `migration_003_task2_integration.sql` y `migration_004_crm.sql` en phpMyAdmin.
- Completar SMTP y `ADMIN_NOTIFICATION_EMAIL` para avisos reales.
- Configurar el webhook de n8n y activar la integración.

## Operations

Desplegar `backoffice/` mediante su `Dockerfile`, con volumen persistente en `/data` y variables de `backoffice/.env.example`. Exponer HTTPS y comprobar `/api/health`.

Para la entrega académica rápida se usa Railway conectado al repositorio de GitHub,
con `/backoffice` como directorio raíz, healthcheck `/api/health` y dominio público.
`SEED_DEMO_DATA=true` carga los tres escenarios académicos si la base SQLite está
vacía. Railway permite añadir posteriormente un volumen montado en `/data`.

- URL final pendiente: `https://____________________________`

## n8n

Desplegar n8n fuera de local con volumen persistente. Configurar `INTEGRATION_SHARED_SECRET`, `BACKOFFICE_URL`, `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, URL pública y cifrado. Importar el JSON y activar.

- URL final pendiente: `https://____________________________`
- Webhook final: `https://____________________________/webhook/sensoria-events`

## Verificación final

Abrir las tres URL desde un dispositivo distinto, ejecutar los tres payloads y guardar capturas de: ejecución verde, error controlado, pedido con productos, dashboard, caso, propuesta pendiente y aprobación.

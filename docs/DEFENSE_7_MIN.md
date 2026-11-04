# Defensa oral · máximo 7 minutos

## 0:00–0:45 · Problema y solución

“Sensoria ya tenía una tienda funcional. El reto era convertirla en un sistema empresarial integrado. Hemos creado un back-office independiente, n8n como middleware y un agente supervisado. No compartimos tablas: los sistemas intercambian eventos trazables.”

## 0:45–1:40 · Arquitectura

Mostrar la arquitectura. Explicar Store → n8n → Operations, contrato JSON, HMAC, idempotencia y outbox. Señalar que un fallo de integración no rompe el pedido.

## 1:40–3:20 · Demostración de escenarios

1. Abrir Pedidos: enseñar número, cliente, estado y desplegar Aura Wave/Pebble Calm.
2. Cambiar estado: mostrar tarea de sincronización y log.
3. Abrir Postventa: enseñar caso asociado al pedido.
4. Mostrar n8n con rama verde y una ejecución de error 422.

## 3:20–4:35 · Dashboard y trazabilidad

Enseñar cinco KPIs y dos gráficos. Abrir Integraciones y Auditoría. Explicar `trace_id`, idempotencia y causa de error.

## 4:35–5:45 · Agente supervisado

Generar propuesta. Señalar datos consultados, acción, borrador, confianza, prioridad y riesgos. Remarcar que permanece pendiente. Aprobar y enseñar Telegram simulado/real y auditoría del revisor.

## 5:45–6:30 · Decisión tecnológica

Mostrar la matriz. La híbrida obtiene 4,60/5; reduce riesgo y conserva control. n8n evita reconstruir orquestación; Operations demuestra programación y almacenamiento independiente.

## 6:30–7:00 · Cierre

“Cumplimos los tres escenarios, ramas de éxito y error, despliegue separado, métricas reales y agente con control humano. Las pruebas automáticas pasan 6 de 6 y toda acción sensible queda auditada.”

## Preguntas probables

- ¿Por qué SQLite? Por simplicidad reproducible; PostgreSQL sería la evolución para concurrencia.
- ¿Qué pasa si n8n cae? El outbox guarda el evento y la compra continúa.
- ¿Cómo evitáis duplicados? Claves únicas de evento e idempotencia.
- ¿La IA puede responder sola? No; solo propone y una persona aprueba.
- ¿Telegram es real? Se activa con credenciales; sin secretos se registra como simulado.

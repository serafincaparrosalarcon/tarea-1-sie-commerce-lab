# Plan y resultado de pruebas

## Automatizadas

Ejecutar `cd backoffice && npm test`.

| Prueba | Resultado esperado |
|---|---|
| Salud pública y acceso | `/api/health` 200; dashboard sin sesión 401 |
| Firma | firma HMAC inválida 401 y log de error |
| Escenarios | pedido, estado y soporte devuelven 201/SUCCESS |
| Idempotencia | repetición devuelve 200/duplicate sin duplicar |
| Pedido | contiene dos líneas y estado actualizado |
| Métricas | KPIs calculados desde datos persistidos |
| Sincronización | cambio del back-office crea tarea PENDING |
| Agente | propuesta PENDIENTE_REVISION |
| Aprobación | Telegram simulado solo después de aprobar |

Resultado verificado el 04/11/2026: **6/6 pruebas superadas**.

## Manuales

1. Importar y activar workflow de n8n.
2. Enviar `order-created.json`; comprobar ejecución verde, pedido y dos productos.
3. Reenviar el mismo archivo; comprobar `duplicate: true`.
4. Enviar `order-status-changed.json`; comprobar `PREPARACION`.
5. Enviar `support-requested.json`; comprobar caso asociado.
6. Enviar `invalid-event.json` al webhook n8n; comprobar rama 422.
7. Generar propuesta; comprobar campos estructurados y estado pendiente.
8. Rechazar una propuesta y aprobar otra; comprobar auditoría.
9. Sin token Telegram, comprobar `SIMULATED`; con credenciales de prueba, comprobar `SENT`.
10. Crear soporte y devolución desde la tienda; comprobar correo de administrador o estado simulado/error.

## Criterios de aceptación

- Ningún escenario depende de editar directamente la base de datos.
- Un fallo de n8n no anula una compra ya confirmada.
- Un duplicado no crea otra entidad.
- Todo error deja causa y fecha.
- Ningún mensaje de agente sale sin persona revisora.

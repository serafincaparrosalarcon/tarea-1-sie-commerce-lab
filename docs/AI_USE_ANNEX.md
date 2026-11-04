# Anexo actualizado de uso de IA

## Uso durante el desarrollo

Se utilizó IA generativa como apoyo para organizar requisitos, proponer estructura técnica, revisar casos límite y redactar documentación. El equipo revisó el código, ejecutó pruebas y conserva la responsabilidad sobre las decisiones y la entrega. No se introdujeron credenciales ni datos personales reales.

## IA incorporada al prototipo

El agente de Operations analiza casos postventa. Consulta mediante herramientas datos del caso, cliente, pedido, productos e historial. Devuelve JSON estructurado con tipo de caso, datos consultados, acción, borrador, justificación, confianza, prioridad, riesgos y estado.

La salida no se considera una decisión final. Se almacena como `PENDIENTE_REVISION`; un administrador debe aprobar o rechazar. La comunicación por Telegram solo ocurre después de aprobar y se registra en auditoría.

## Contingencia

Con `GEMINI_API_KEY` se usa Gemini con salida JSON. Sin clave se ejecutan reglas deterministas que conservan el contrato y permiten evaluar el flujo completo sin depender de un proveedor. La interfaz muestra claramente el modo activo.

## Riesgos y controles

| Riesgo | Control |
|---|---|
| Respuesta incorrecta | consulta de datos y revisión humana |
| Acción no autorizada | modo propuesta; endpoint de aprobación autenticado |
| Fuga de datos | datos académicos; secretos en entorno |
| Baja confianza | campo numérico y riesgos visibles |
| Falta de trazabilidad | propuesta, revisor, fecha, notificación y auditoría |

# Commerce Lab

Prototipo académico de un canal digital de venta para la asignatura **Sistemas de Información Empresarial**. La identidad y el catálogo son provisionales para poder adaptar la solución al tema definitivo sin rehacer la arquitectura.

## Funcionalidades terminadas

- Catálogo persistente con 8 productos, categorías, buscador y stock.
- Carrito con modificación de cantidades y eliminación de artículos.
- Reglas comerciales: cupón `AULA10`, envío gratuito desde 80 € e IVA del 21 %.
- Checkout con alias ficticio y tarjeta de prueba.
- Pago simulado e identificador único de pedido.
- Persistencia de pedidos, líneas de pedido y pagos.
- Zona interna de pedidos con cambio de estado.
- Registro de eventos: `product.viewed`, `cart.item_added`, `cart.item_removed`, `checkout.started`, `order.created` y `payment.simulated`.
- Diseño responsive para ordenador y móvil.
- Aviso visible de prototipo académico y prohibición de introducir datos reales.

## Arquitectura

- Interfaz: React + TypeScript.
- Aplicación: Next.js/Vinext.
- Persistencia: Cloudflare D1 (SQLite) y Drizzle ORM.
- Despliegue: Cloudflare Workers mediante Sites.

Tablas: `products`, `users`, `orders`, `order_items`, `payments`, `events` y `support_requests`.

## Puesta en marcha

```bash
pnpm install
pnpm run db:generate
pnpm run dev
```

No se necesitan claves de pago ni datos personales reales.

## Decisiones de diseño

- Se ha utilizado una identidad neutra para que el tema final solo requiera cambiar textos, colores y productos.
- Los cálculos importantes se repiten y validan en el servidor; el total enviado por el navegador nunca se acepta como fuente fiable.
- Los identificadores de pedido se generan en el servidor y son únicos.
- Los eventos se guardan con una sesión anónima y un `payload` limitado.

## Uso de IA generativa

Herramienta utilizada: ChatGPT/Codex.

Usos: propuesta inicial de arquitectura, generación de la base de código, revisión del modelo de datos, diseño responsive y apoyo en la documentación.

Validación realizada por el equipo: compilación de TypeScript, creación e inspección de la migración SQL y construcción completa de la aplicación. Antes de la entrega, cada integrante deberá recorrer manualmente el flujo de compra y poder explicar sus partes.

Ejemplo de incidencia detectada y corregida: la primera comprobación de TypeScript señaló respuestas JSON sin tipo conocido; se añadieron tipos explícitos antes de compilar de nuevo.

## Cambios pendientes cuando llegue el tema

1. Sustituir `Commerce Lab` por el nombre definitivo.
2. Cambiar categorías, nombres, descripciones, precios e imágenes.
3. Ajustar las reglas comerciales si el caso práctico lo exige.
4. Actualizar esta documentación y la memoria con las decisiones finales.

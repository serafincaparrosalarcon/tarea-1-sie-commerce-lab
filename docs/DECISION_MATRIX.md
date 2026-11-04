# Matriz de decisión tecnológica

Escala 1–5, donde 5 es el mejor resultado. Puntuación total = suma de peso × puntuación / 100.

| Criterio | Peso | Desarrollo propio | SaaS/CRM | Híbrida elegida |
|---|---:|---:|---:|---:|
| Funcionalidad | 20% | 5 | 4 | 5 |
| Coste | 12% | 5 | 2 | 4 |
| Esfuerzo de implantación | 10% | 3 | 2 | 4 |
| Escalabilidad | 10% | 4 | 5 | 5 |
| Integración | 12% | 5 | 3 | 5 |
| Seguridad y control | 10% | 5 | 4 | 4 |
| Trazabilidad | 10% | 5 | 4 | 5 |
| Dependencia del proveedor | 6% | 5 | 2 | 3 |
| Mantenimiento | 5% | 3 | 4 | 4 |
| Evolución | 5% | 5 | 3 | 5 |
| **Total / 5** | **100%** | **4,60** | **3,45** | **4,60** |

## Interpretación y recomendación

El desarrollo totalmente propio empata en puntuación, pero exige construir orquestación, reintentos y visualización de ejecuciones. Un SaaS acelera funciones CRM, aunque aumenta coste y dependencia y se adapta peor al ejercicio. Se elige la solución híbrida: conserva la tienda PHP, usa n8n como middleware visible y un back-office propio para demostrar programación, almacenamiento separado, trazabilidad y control del agente. El empate se resuelve por menor riesgo de entrega.

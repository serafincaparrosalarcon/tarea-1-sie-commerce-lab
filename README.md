# Sensoria — versión DonDominio

Tienda académica de instrumentos de bienestar sensorial. Esta edición está preparada para un hosting compartido con **PHP 8+ y MySQL/MariaDB**, sin Node.js, servicios de ChatGPT ni bases de datos externas.

## Funcionalidades

- Catálogo permanente con 18 productos, búsqueda, filtros y fichas detalladas.
- Carrito, cupones, checkout y pago completamente simulado.
- Registro e inicio de sesión de clientes.
- Área personal con pedidos, seguimiento, factura imprimible y devoluciones.
- Gestión de productos, stock, pedidos y estados.
- CRM con segmentación automática de clientes.
- Previsualización e historial de comunicaciones simuladas.
- Informes CSV y resumen imprimible en PDF.
- Gestión de devoluciones y reembolsos simulados.
- Creación y activación de promociones.
- Diseño responsive y accesible para móvil y ordenador.

## Requisitos

- PHP 8.0 o superior con PDO MySQL.
- MySQL 5.7+ o MariaDB equivalente.
- Apache con `.htaccess` habilitado, recomendado.

## Instalación rápida

1. Crea una base de datos MySQL en DonDominio.
2. Edita `config.php` con servidor, nombre, usuario y contraseña de la base de datos.
3. Sube todos los archivos a la carpeta web del dominio mediante FTP.
4. Abre `https://tu-dominio.es/install.php`.
5. Crea la cuenta administradora.
6. Elimina `install.php` del servidor después de instalar.
7. Entra en `https://tu-dominio.es/`.

Consulta [SUBIR_A_DONDOMINIO.md](SUBIR_A_DONDOMINIO.md) para ver el proceso completo.

## Acceso de administración

La cuenta administradora se crea durante la instalación. Después de iniciar sesión, utiliza el botón **Gestión**.

## Seguridad académica

- No existen cobros reales.
- No se deben introducir tarjetas reales.
- Los correos y reembolsos son simulados.
- Las contraseñas se almacenan con `password_hash`.
- Las consultas utilizan PDO y parámetros preparados.

## Estructura

```text
index.php             Tienda y panel principal
config.php            Conexión con MySQL
install.php           Instalador inicial
database.sql          Estructura y catálogo base
api/index.php         Operaciones de tienda y administración
assets/styles.css     Diseño responsive
assets/app.js         Interacciones de la aplicación
assets/products/      Fotografías optimizadas del catálogo
```

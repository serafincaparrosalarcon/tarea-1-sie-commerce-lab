# Cómo publicar Sensoria en DonDominio

## 1. Contratar o abrir el hosting

En el área de cliente de DonDominio, entra en el alojamiento asociado al dominio. La aplicación necesita PHP y una base de datos MySQL.

## 2. Crear la base de datos

En el panel del hosting:

1. Abre el apartado de bases de datos MySQL.
2. Crea una base de datos.
3. Guarda estos cuatro datos:
   - servidor MySQL;
   - nombre de la base de datos;
   - usuario;
   - contraseña.

## 3. Configurar la conexión

Abre `config.php` y sustituye:

```php
const DB_HOST = 'localhost';
const DB_NAME = 'TU_BASE_DE_DATOS';
const DB_USER = 'TU_USUARIO';
const DB_PASS = 'TU_CONTRASENA';
```

No subas las credenciales reales a GitHub.

## 4. Subir los archivos

Descomprime `sensoria-dondominio.zip` y sube **el contenido de la carpeta**, no la carpeta exterior, al directorio web del dominio mediante el gestor de archivos o FTP.

Al terminar, `index.php`, `config.php` e `install.php` deben estar en la raíz pública.

## 5. Ejecutar el instalador

Visita:

```text
https://tu-dominio.es/install.php
```

Escribe el nombre, correo y contraseña de la persona administradora. El instalador creará las tablas, los 18 productos y el cupón `CALMA10`.

## 6. Cerrar la instalación

Después de ver el mensaje de éxito:

1. Elimina `install.php` del servidor.
2. Abre la página principal.
3. Inicia sesión con la cuenta administradora.
4. Comprueba Tienda, Mis pedidos y Gestión.

## Comprobación de entrega

- La portada carga las fotografías.
- Se puede crear una cuenta de cliente.
- El código `CALMA10` aplica un 10 %.
- Una compra genera pedido y factura académica.
- El pedido aparece en el área personal y en Gestión.
- Los cambios de estado generan avisos simulados.
- Las devoluciones aparecen en el panel.
- Los informes CSV se descargan correctamente.

## Si aparece un error de base de datos

Revisa los cuatro valores de `config.php`. En algunos planes el servidor MySQL no es `localhost`; utiliza exactamente el valor indicado por DonDominio.

## Tamaño y compatibilidad

El proyecto evita frameworks de servidor, paquetes de Node.js y archivos innecesarios. Las fotografías están comprimidas y la aplicación funciona con PHP/MySQL estándar para facilitar su traslado al hosting académico.

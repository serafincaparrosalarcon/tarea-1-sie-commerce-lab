<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Sensoria: instrumentos de bienestar sensorial para adultos.">
  <meta name="theme-color" content="#102a3c">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://www.sensoria.onl/">
  <link rel="manifest" href="manifest.webmanifest">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_ES">
  <meta property="og:title" content="Sensoria · Bienestar sensorial para adultos">
  <meta property="og:description" content="Luz, tacto y sonido para crear pausas de calma, concentración y descanso.">
  <meta property="og:url" content="https://www.sensoria.onl/">
  <meta property="og:image" content="https://www.sensoria.onl/assets/products/aura-wave.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Sensoria · Bienestar sensorial">
  <meta name="twitter:description" content="Instrumentos sensoriales para crear pausas reales.">
  <meta name="twitter:image" content="https://www.sensoria.onl/assets/products/aura-wave.jpg">
  <title>Sensoria · Bienestar sensorial</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23244a68'/%3E%3Cpath d='M13 23c7-8 13 8 20 0s13 8 20 0M13 33c7-8 13 8 20 0s13 8 20 0M13 43c7-8 13 8 20 0s13 8 20 0' fill='none' stroke='%23ffc36b' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="assets/styles.css?v=2.2">
  <link rel="stylesheet" href="assets/paypal.css?v=1.0">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Sensoria","url":"https://www.sensoria.onl/","description":"Proyecto académico de comercio electrónico dedicado al bienestar sensorial para adultos."}</script>
</head>
<body>
  <a class="skip-link" href="#catalog">Saltar al catálogo</a>
  <div class="academic"><span>◈</span> PROTOTIPO ACADÉMICO · No se realizan pagos, envíos ni reembolsos reales</div>
  <header class="header">
    <button class="brand" data-view="shop"><span>≋</span><b>Sensoria</b></button>
    <nav id="mainNav" aria-label="Navegación principal">
      <button class="active" data-view="shop">Tienda</button>
      <button data-view="account">Mis pedidos</button>
      <button data-view="admin" data-admin-only hidden>Gestión</button>
    </nav>
    <div class="header-actions"><button id="accountBtn" class="soft">♙ <span>Mi cuenta</span></button><button id="cartBtn" class="cart">⌑ <span>Carrito</span> <b id="cartCount">0</b></button></div>
  </header>

  <main id="shopView" class="view active">
    <section class="hero shell">
      <div><p class="eyebrow">BIENESTAR SENSORIAL PARA ADULTOS</p><h1>Tu ritual de calma,<br><em>diseñado a medida.</em></h1><p class="lead">Luz, tacto y sonido para crear pausas reales en casa, en el trabajo o antes de dormir.</p><div class="hero-actions"><button class="primary" id="exploreBtn">Explorar productos →</button><button class="secondary" id="ritualBtn">Encontrar mi ritual</button></div><div class="trust"><span>Envío gratis +80 €</span><span>Compra de prueba segura</span><span>30 días simulados</span></div></div>
      <figure><img src="assets/products/aura-wave.jpg" alt="Ambiente de relajación con luz sensorial"><figcaption><small>Ritual recomendado</small><b>Luz baja · textura · sonido</b></figcaption></figure>
    </section>

    <section class="sensory shell" aria-label="Categorías sensoriales"><button data-category="Visual"><i>◐</i><span><b>Visual</b><small>Luz y proyección</small></span>→</button><button data-category="Táctil"><i>⌁</i><span><b>Táctil</b><small>Texturas antiestrés</small></span>→</button><button data-category="Sonoro"><i>♫</i><span><b>Sonoro</b><small>Ambientes de calma</small></span>→</button></section>

    <section id="advisor" class="advisor shell" aria-labelledby="advisorTitle">
      <div class="advisor-copy"><span class="advisor-mark" aria-hidden="true">✦</span><p class="eyebrow">ASESOR INTELIGENTE</p><h2 id="advisorTitle">Tu recomendación, en segundos.</h2><p>Cuéntanos qué necesitas y analizaremos el catálogo para encontrar la opción que mejor encaja contigo.</p></div>
      <div class="advisor-tool">
        <div class="advisor-status"><span><i aria-hidden="true"></i> Asesor activo</span><small>Analiza objetivo, momento y estímulo</small></div>
        <div class="advisor-chips" aria-label="Consultas rápidas"><button type="button" data-ai-prompt="Quiero dormir mejor y prefiero un estímulo suave">Dormir mejor</button><button type="button" data-ai-prompt="Necesito concentrarme sin distracciones">Concentrarme</button><button type="button" data-ai-prompt="Busco reducir el estrés al final del día">Reducir estrés</button></div>
        <div class="advisor-search"><label class="sr-only" for="ai-query">Describe lo que necesitas</label><span class="advisor-search-icon" aria-hidden="true">⌕</span><input type="text" id="ai-query" autocomplete="off" placeholder="Ej.: quiero desconectar antes de dormir"><button type="button" id="ai-btn" class="primary">Recomendarme <span aria-hidden="true">→</span></button></div>
        <div id="ai-result" class="advisor-result" role="status" aria-live="polite" hidden></div>
      </div>
    </section>
    
    <section id="catalog" class="catalog shell"><div class="section-head"><div><p class="eyebrow">COLECCIÓN PERMANENTE</p><h2>Instrumentos para cada sentido</h2><p>Seleccionados para acompañar concentración, descanso y regulación sensorial.</p></div><div class="catalog-tools"><label class="search">⌕<input id="searchInput" placeholder="Buscar producto" aria-label="Buscar producto"></label><select id="sortSelect" aria-label="Ordenar productos"><option value="featured">Destacados</option><option value="priceAsc">Precio: menor a mayor</option><option value="priceDesc">Precio: mayor a menor</option><option value="stock">Mayor disponibilidad</option></select></div></div><div id="categoryTabs" class="tabs"><button class="active" data-category="Todas">Todas</button><button data-category="Visual">Visual</button><button data-category="Táctil">Táctil</button><button data-category="Sonoro">Sonoro</button></div><div id="productGrid" class="product-grid" aria-live="polite"></div></section>

    <section class="finder shell"><div><p class="eyebrow">ENCUENTRA TU RITUAL</p><h2>¿Qué necesitas ahora?</h2><p>Elige un momento y descubre una selección pensada para acompañarlo.</p></div><div><button data-ritual="foco"><b>01</b><h3>Recuperar el foco</h3><p>Objetos silenciosos para manos inquietas y pausas breves.</p>→</button><button data-ritual="calma"><b>02</b><h3>Bajar el ritmo</h3><p>Luz indirecta y movimiento lento para cerrar el día.</p>→</button><button data-ritual="dormir"><b>03</b><h3>Dormir mejor</h3><p>Sonidos continuos que suavizan el ambiente nocturno.</p>→</button></div></section>

    <section class="service shell"><article><i>♢</i><h3>Selección experta</h3><p>Productos organizados por estímulo, intensidad y momento de uso.</p></article><article><i>◎</i><h3>Compra tranquila</h3><p>Checkout académico seguro, claro y sin cobros reales.</p></article><article><i>↻</i><h3>Devolución sencilla</h3><p>Solicitud y seguimiento dentro del área personal.</p></article><article><i>✉</i><h3>Acompañamiento</h3><p>Correo y SMS en cada fase del pedido.</p></article></section>

    <section class="reviews shell" aria-labelledby="reviewsTitle"><div class="section-head"><div><p class="eyebrow">EXPERIENCIAS DE DEMOSTRACIÓN</p><h2 id="reviewsTitle">Pequeños rituales, grandes pausas</h2><p>Valoraciones ficticias creadas para mostrar la experiencia completa del prototipo.</p></div><div class="review-score"><b>4,8</b><span aria-label="4,8 de 5 estrellas">★★★★★</span><small>126 valoraciones demo</small></div></div><div class="review-grid"><article><span>★★★★★</span><p>“La luz es suave y el diseño queda bien incluso cuando no está en uso.”</p><footer><b>Laura M.</b><small>Aura Wave · Compra demo verificada</small></footer></article><article><span>★★★★★</span><p>“El asesor acertó con una opción discreta para utilizar mientras trabajo.”</p><footer><b>Diego R.</b><small>Pebble Calm · Compra demo verificada</small></footer></article><article><span>★★★★☆</span><p>“El seguimiento del pedido y la factura hacen que la experiencia resulte muy completa.”</p><footer><b>Marta G.</b><small>Cloud Weight · Compra demo verificada</small></footer></article></div></section>

    <section class="final-cta shell"><div><p class="eyebrow">TU MOMENTO EMPIEZA AQUÍ</p><h2>Diseña una pausa que encaje contigo.</h2><p>Explora la colección o deja que el Asesor Sensoria encuentre una recomendación.</p></div><div><button class="primary" data-scroll="catalog">Ver colección</button><button class="secondary" data-scroll="advisor">Usar el asesor</button></div></section>
  </main>

  <main id="accountView" class="view shell workspace"><div class="workspace-head"><div><p class="eyebrow">ESPACIO PERSONAL</p><h1>Mis pedidos</h1><p>Historial, facturas, seguimiento y devoluciones.</p></div><button class="primary" data-view="shop">Volver a la tienda</button></div><div id="accountContent"></div></main>

  <main id="adminView" class="view shell workspace"><div class="workspace-head"><div><p class="eyebrow">CENTRO DE OPERACIONES</p><h1>Gestión integral</h1><p>Catálogo, clientes, comunicaciones, informes, devoluciones y promociones.</p></div><button id="refreshAdmin" class="secondary">↻ Actualizar datos</button></div><div id="adminContent"></div></main>

  <main id="aboutView" class="view shell workspace info-page">
    <div class="info-hero"><p class="eyebrow">CONOCE SENSORIA</p><h1>Quiénes somos</h1><p>Sensoria es una empresa ficticia creada para demostrar un canal digital de venta completo, responsable y trazable.</p></div>
    <div class="info-grid"><article><span>01</span><h2>Nuestra idea</h2><p>Acercar instrumentos de luz, tacto y sonido que ayuden a crear pausas de bienestar en la vida cotidiana.</p></article><article><span>02</span><h2>Nuestra selección</h2><p>Un catálogo coherente organizado por estímulo sensorial, momento de uso, precio y disponibilidad.</p></article><article><span>03</span><h2>Nuestro compromiso</h2><p>Una experiencia clara: precios desglosados, pago simulado, factura demostrativa, seguimiento y devolución.</p></article></div>
    <section class="info-card"><h2>Proyecto académico con funcionamiento realista</h2><p>La tienda persiste productos, clientes, pedidos, líneas, estados, comunicaciones y eventos de negocio. No existe actividad comercial ni cobros reales, y deben utilizarse únicamente datos de prueba.</p><button class="primary" data-view="shop">Ver catálogo</button></section>
  </main>

  <main id="returnsView" class="view shell workspace info-page">
    <div class="info-hero"><p class="eyebrow">POSTVENTA</p><h1>Política de devoluciones</h1><p>Proceso claro y trazable para desistimientos, incidencias y reembolsos simulados.</p></div>
    <div class="policy-layout"><section class="info-card"><h2>Plazo de 14 días naturales</h2><p>En una compra real, el cliente podría solicitar el desistimiento durante los 14 días naturales siguientes a la recepción, salvo las excepciones legalmente previstas. En Sensoria el flujo es exclusivamente demostrativo.</p><h3>Condiciones</h3><ul><li>Identificar el pedido y el motivo de la solicitud.</li><li>Conservar el producto sin daños y con sus accesorios.</li><li>No introducir datos personales o bancarios reales en este prototipo.</li><li>Los gastos y reembolsos mostrados son simulados.</li></ul></section><section class="steps-card"><h2>Cómo solicitarla</h2><ol><li><b>Inicia sesión</b><span>Accede con una cuenta de prueba.</span></li><li><b>Abre “Mis pedidos”</b><span>Localiza el pedido correspondiente.</span></li><li><b>Solicita la devolución</b><span>Indica motivo y detalles.</span></li><li><b>Sigue el estado</b><span>El equipo podrá aprobarla, rechazarla o simular el reembolso.</span></li></ol><button class="primary" data-view="account">Ir a mis pedidos</button></section></div>
    <section class="info-card"><h2>Incidencias y ayuda</h2><p>Para productos dañados, errores de pedido u otras consultas, utiliza el formulario de soporte. La solicitud genera el evento empresarial <code>support.requested</code>.</p><button class="secondary" data-view="contact">Contactar con soporte</button></section>
  </main>

  <main id="legalView" class="view shell workspace info-page">
    <div class="info-hero"><p class="eyebrow">TRANSPARENCIA</p><h1>Aviso legal y condiciones</h1><p>Información del responsable del canal y reglas de uso del prototipo.</p></div>
    <section class="info-card legal-copy"><h2>Identificación del prestador</h2><dl><div><dt>Denominación</dt><dd>Sensoria · Proyecto académico</dd></div><div><dt>Titular</dt><dd>Equipo Sensoria (entidad ficticia)</dd></div><div><dt>Domicilio</dt><dd>Calle de la Innovación, 24 · 28014 Madrid · España (dirección ficticia)</dd></div><div><dt>Correo</dt><dd><a href="mailto:soporte@sensoria.onl">soporte@sensoria.onl</a></dd></div><div><dt>Dominio</dt><dd>sensoria.onl</dd></div></dl><p class="legal-alert">No existe una empresa, establecimiento, NIF ni actividad comercial real detrás de este prototipo. La identificación y el domicilio son datos ficticios, de acuerdo con el requisito académico de no utilizar datos personales reales.</p><h2>Condiciones de compra</h2><p>Los productos, precios, impuestos, descuentos, portes, pagos, facturas, envíos y reembolsos son simulados. El usuario debe emplear datos de prueba. La confirmación crea un pedido persistente y eventos verificables, pero no constituye un contrato de compraventa real.</p><h2>Propiedad y responsabilidad</h2><p>Los contenidos se presentan con fines educativos. El acceso puede interrumpirse por mantenimiento y no se ofrece garantía comercial. Queda prohibido utilizar el servicio para introducir información sensible o intentar alterar el sistema.</p></section>
  </main>

  <main id="privacyView" class="view shell workspace info-page">
    <div class="info-hero"><p class="eyebrow">PRIVACIDAD</p><h1>Política de privacidad</h1><p>Tratamiento prudente de datos de prueba y explicación comprensible del flujo.</p></div>
    <section class="info-card legal-copy"><h2>Responsable y finalidad</h2><p>El responsable ficticio es Sensoria · Proyecto académico. Los datos introducidos se utilizan para registrar cuentas de prueba, tramitar pedidos simulados, mostrar el historial, gestionar devoluciones, enviar comunicaciones de demostración y registrar eventos empresariales.</p><h2>Datos tratados</h2><p>Nombre, correo, teléfono, dirección de entrega, credenciales cifradas, contenido del pedido, solicitudes de soporte y datos técnicos de sesión. No deben introducirse datos reales, bancarios, médicos ni especialmente sensibles.</p><h2>Base, conservación y destinatarios</h2><p>El tratamiento se produce por la acción voluntaria del usuario dentro de la demostración. La información permanece en la base de datos académica hasta su borrado por el equipo. No se vende ni se utiliza para publicidad; el hosting y el proveedor de correo actúan como infraestructura técnica.</p><h2>Derechos</h2><p>En el contexto académico se pueden solicitar acceso, rectificación o supresión mediante <a href="mailto:privacidad@sensoria.onl">privacidad@sensoria.onl</a>. No envíes documentación personal para ejercerlos.</p></section>
  </main>

  <main id="cookiesView" class="view shell workspace info-page">
    <div class="info-hero"><p class="eyebrow">CONTROL DEL USUARIO</p><h1>Política de cookies</h1><p>Solo utilizamos almacenamiento técnico necesario para que el prototipo funcione.</p></div>
    <section class="info-card legal-copy"><h2>Qué se guarda</h2><div class="cookie-table"><div><b>Sesión PHP</b><span>Cookie técnica</span><p>Mantiene la sesión iniciada y protege las solicitudes. Es necesaria y caduca automáticamente.</p></div><div><b>Carrito Sensoria</b><span>Almacenamiento local</span><p>Conserva los productos seleccionados en este navegador.</p></div><div><b>Preferencia de cookies</b><span>Almacenamiento local</span><p>Recuerda si aceptaste todas o solo las necesarias.</p></div></div><h2>Analítica y publicidad</h2><p>No se instalan cookies publicitarias ni de analítica de terceros. Por eso, “Aceptar todas” y “Solo necesarias” no activan rastreadores adicionales en esta versión.</p><button id="manageCookies" class="secondary">Cambiar mi elección</button></section>
  </main>

  <main id="contactView" class="view shell workspace info-page">
    <div class="info-hero"><p class="eyebrow">ATENCIÓN AL CLIENTE</p><h1>Contacto y soporte</h1><p>Deja constancia de una duda, incidencia o consulta postventa.</p></div>
    <div class="contact-layout"><section class="contact-details"><h2>Estamos para ayudarte</h2><p><b>Correo:</b> soporte@sensoria.onl</p><p><b>Horario simulado:</b> lunes a viernes, 9:00–18:00</p><p><b>Domicilio ficticio:</b> Calle de la Innovación, 24 · Madrid</p><div class="legal-alert">Usa únicamente datos de prueba. El formulario registra la solicitud y genera una referencia, pero no contacta con una empresa real.</div></section><form id="supportForm" class="support-form"><label>Nombre<input name="name" value="" maxlength="120" required></label><label>Correo electrónico<input type="email" name="email" maxlength="190" required></label><label>Tipo de consulta<select name="kind"><option>Consulta</option><option>Incidencia</option><option>Devolución</option><option>Factura</option></select></label><label>Número de pedido (opcional)<input name="order_number" placeholder="SEN-2026..." maxlength="40"></label><label class="wide">Mensaje<textarea name="message" maxlength="1500" required></textarea></label><label class="consent wide"><input type="checkbox" required><span>Confirmo que utilizo datos de prueba y he leído la política de privacidad.</span></label><button class="primary wide" type="submit">Enviar solicitud</button></form></div>
  </main>

  <footer><div class="shell"><div><span class="brand-mini">≋</span><b>Sensoria</b><p>Instrumentos de bienestar sensorial para adultos.</p><small>Proyecto académico · Sin actividad comercial real</small></div><div><b>Descubre</b><button data-view="about">Quiénes somos</button><button data-view="shop">Catálogo</button><button data-view="account">Mis pedidos</button><button data-view="contact">Contacto</button></div><div><b>Ayuda</b><button data-view="returns">Devoluciones</button><button data-view="cookies">Cookies</button><button data-view="privacy">Privacidad</button><button data-view="legal">Aviso legal</button></div><div><b>Información</b><span>Pagos y envíos simulados</span><span>Calle de la Innovación, 24</span><span>28014 Madrid · España</span><span>soporte@sensoria.onl</span></div></div></footer>

  <div id="modal" class="overlay" hidden><div class="modal" role="dialog" aria-modal="true"><button class="modal-close" aria-label="Cerrar">×</button><div id="modalBody"></div></div></div>
  <div id="cartDrawer" class="overlay drawer-overlay" hidden><aside class="drawer" aria-label="Carrito"><header><div><span>TU SELECCIÓN</span><h2>Carrito <b id="drawerCount">0</b></h2></div><button class="drawer-close" aria-label="Cerrar">×</button></header><div id="cartBody" class="drawer-body"></div></aside></div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <aside id="cookieBanner" class="cookie-banner" aria-label="Preferencias de cookies" hidden><div><b>Cookies y almacenamiento técnico</b><p>Usamos únicamente datos técnicos para la sesión, el carrito y tu elección. No hay publicidad ni analítica de terceros.</p><button data-view="cookies" class="cookie-link">Ver política</button></div><div class="cookie-actions"><button id="necessaryCookies" class="secondary">Solo necesarias</button><button id="acceptCookies" class="primary">Aceptar todas</button></div></aside>
  <script>window.SENSORIA={api:'api/index.php'};</script>
  <script src="assets/app.js?v=2.2" defer></script>
</body></html>

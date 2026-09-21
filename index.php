<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Sensoria: instrumentos de bienestar sensorial para adultos.">
  <meta name="theme-color" content="#102a3c">
  <title>Sensoria · Bienestar sensorial</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23244a68'/%3E%3Cpath d='M13 23c7-8 13 8 20 0s13 8 20 0M13 33c7-8 13 8 20 0s13 8 20 0M13 43c7-8 13 8 20 0s13 8 20 0' fill='none' stroke='%23ffc36b' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="assets/styles.css?v=1.0">
</head>
<body>
  <div class="academic"><span>◈</span> PROTOTIPO ACADÉMICO · No se realizan pagos, envíos ni reembolsos reales</div>
  <header class="header">
    <button class="brand" data-view="shop"><span>≋</span><b>Sensoria</b></button>
    <nav id="mainNav" aria-label="Navegación principal">
      <button class="active" data-view="shop">Tienda</button>
      <button data-view="account">Mis pedidos</button>
      <button data-view="admin">Gestión</button>
    </nav>
    <div class="header-actions"><button id="accountBtn" class="soft">♙ <span>Mi cuenta</span></button><button id="cartBtn" class="cart">⌑ <span>Carrito</span> <b id="cartCount">0</b></button></div>
  </header>

  <main id="shopView" class="view active">
    <section class="hero shell">
      <div><p class="eyebrow">BIENESTAR SENSORIAL PARA ADULTOS</p><h1>Tu ritual de calma,<br><em>diseñado a medida.</em></h1><p class="lead">Luz, tacto y sonido para crear pausas reales en casa, en el trabajo o antes de dormir.</p><div class="hero-actions"><button class="primary" id="exploreBtn">Explorar productos →</button><button class="secondary" id="ritualBtn">Encontrar mi ritual</button></div><div class="trust"><span>Envío gratis +80 €</span><span>Compra de prueba segura</span><span>30 días simulados</span></div></div>
      <figure><img src="assets/products/aura-wave.jpg" alt="Ambiente de relajación con luz sensorial"><figcaption><small>Ritual recomendado</small><b>Luz baja · textura · sonido</b></figcaption></figure>
    </section>

    <section class="sensory shell" aria-label="Categorías sensoriales"><button data-category="Visual"><i>◐</i><span><b>Visual</b><small>Luz y proyección</small></span>→</button><button data-category="Táctil"><i>⌁</i><span><b>Táctil</b><small>Texturas antiestrés</small></span>→</button><button data-category="Sonoro"><i>♫</i><span><b>Sonoro</b><small>Ambientes de calma</small></span>→</button></section>

    <section id="catalog" class="catalog shell"><div class="section-head"><div><p class="eyebrow">COLECCIÓN PERMANENTE</p><h2>Instrumentos para cada sentido</h2><p>Seleccionados para acompañar concentración, descanso y regulación sensorial.</p></div><div class="catalog-tools"><label class="search">⌕<input id="searchInput" placeholder="Buscar producto" aria-label="Buscar producto"></label><select id="sortSelect" aria-label="Ordenar productos"><option value="featured">Destacados</option><option value="priceAsc">Precio: menor a mayor</option><option value="priceDesc">Precio: mayor a menor</option><option value="stock">Mayor disponibilidad</option></select></div></div><div id="categoryTabs" class="tabs"><button class="active" data-category="Todas">Todas</button><button data-category="Visual">Visual</button><button data-category="Táctil">Táctil</button><button data-category="Sonoro">Sonoro</button></div><div id="productGrid" class="product-grid" aria-live="polite"></div></section>

    <section class="finder shell"><div><p class="eyebrow">ENCUENTRA TU RITUAL</p><h2>¿Qué necesitas ahora?</h2><p>Elige un momento y descubre una selección pensada para acompañarlo.</p></div><div><button data-ritual="foco"><b>01</b><h3>Recuperar el foco</h3><p>Objetos silenciosos para manos inquietas y pausas breves.</p>→</button><button data-ritual="calma"><b>02</b><h3>Bajar el ritmo</h3><p>Luz indirecta y movimiento lento para cerrar el día.</p>→</button><button data-ritual="dormir"><b>03</b><h3>Dormir mejor</h3><p>Sonidos continuos que suavizan el ambiente nocturno.</p>→</button></div></section>

    <section class="service shell"><article><i>♢</i><h3>Selección experta</h3><p>Productos organizados por estímulo, intensidad y momento de uso.</p></article><article><i>◎</i><h3>Compra tranquila</h3><p>Checkout académico seguro, claro y sin cobros reales.</p></article><article><i>↻</i><h3>Devolución sencilla</h3><p>Solicitud y seguimiento dentro del área personal.</p></article><article><i>✉</i><h3>Acompañamiento</h3><p>Avisos simulados durante cada fase del pedido.</p></article></section>
  </main>

  <main id="accountView" class="view shell workspace"><div class="workspace-head"><div><p class="eyebrow">ESPACIO PERSONAL</p><h1>Mis pedidos</h1><p>Historial, facturas, seguimiento y devoluciones.</p></div><button class="primary" data-view="shop">Volver a la tienda</button></div><div id="accountContent"></div></main>

  <main id="adminView" class="view shell workspace"><div class="workspace-head"><div><p class="eyebrow">CENTRO DE OPERACIONES</p><h1>Gestión integral</h1><p>Catálogo, clientes, comunicaciones, informes, devoluciones y promociones.</p></div><button id="refreshAdmin" class="secondary">↻ Actualizar datos</button></div><div id="adminContent"></div></main>

  <footer><div class="shell"><div><span class="brand-mini">≋</span><b>Sensoria</b><p>Instrumentos de bienestar sensorial para adultos.</p></div><div><b>Proyecto académico</b><a href="#catalog">Catálogo</a><button data-view="account">Mis pedidos</button><button data-view="admin">Gestión</button></div><div><b>Transparencia</b><span>Pagos simulados</span><span>Emails simulados</span><span>Sin datos bancarios reales</span></div></div></footer>

  <div id="modal" class="overlay" hidden><div class="modal" role="dialog" aria-modal="true"><button class="modal-close" aria-label="Cerrar">×</button><div id="modalBody"></div></div></div>
  <div id="cartDrawer" class="overlay drawer-overlay" hidden><aside class="drawer" aria-label="Carrito"><header><div><span>TU SELECCIÓN</span><h2>Carrito <b id="drawerCount">0</b></h2></div><button class="drawer-close" aria-label="Cerrar">×</button></header><div id="cartBody" class="drawer-body"></div></aside></div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script>window.SENSORIA={api:'api/index.php'};</script>
  <script src="assets/app.js?v=1.0" defer></script>
</body></html>

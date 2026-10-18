(() => {
  'use strict';
  const API = window.SENSORIA.api;
  const state = {
    products: [],
    cart: JSON.parse(localStorage.getItem('sensoria-cart') || '{}'),
    user: null,
    category: 'Todas',
    query: '',
    sort: 'featured',
    coupon: '',
    couponPercent: 0,
    admin: null,
    csrfToken: '',
    sessionId: (crypto?.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`),
    adminTab: 'dashboard',
  };

  const fallbackProducts = [
    ['Aura Wave', 'Visual', 74.90, 18, 'aura-wave', 'Proyector de ondas suaves con intensidad y color regulables.'],
    ['Halo Sunset', 'Visual', 46.50, 25, 'halo-sunset', 'Lámpara de atardecer para crear una luz cálida y envolvente.'],
    ['Nebula Mini', 'Visual', 39.90, 14, 'nebula-mini', 'Proyector compacto de cielo estrellado para espacios pequeños.'],
    ['Pebble Calm', 'Táctil', 18.95, 44, 'pebble-calm', 'Piedra sensorial de silicona con tres relieves antiestrés.'],
    ['Loom Roller', 'Táctil', 24.50, 29, 'loom-roller', 'Rodillo manual con bandas intercambiables que ofrece presión controlada.'],
    ['Cloud Weight', 'Táctil', 42.00, 12, 'cloud-weight', 'Cojín lastrado de sobremesa para favorecer una pausa consciente.'],
    ['Hush One', 'Sonoro', 59.90, 21, 'hush-one', 'Dispositivo de sonido ambiental con seis paisajes relajantes.'],
    ['Tide Pocket', 'Sonoro', 34.95, 37, 'tide-pocket', 'Generador portátil de ruido blanco, lluvia y oleaje.'],
    ['Prism Flow', 'Visual', 68.90, 14, 'prism-flow', 'Prisma luminoso que proyecta reflejos de color suaves y cambiantes.'],
    ['Terra Touch', 'Táctil', 29.90, 26, 'terra-touch', 'Trío de piedras cerámicas con relieves para pausas conscientes.'],
    ['Rain Column', 'Sonoro', 84.50, 12, 'rain-column', 'Columna de lluvia ambiental con sonido de agua regulable.'],
    ['Quiet Loop', 'Táctil', 32.90, 20, 'quiet-loop', 'Aro sensorial lastrado y flexible con tejido de tacto suave.'],
  ].map((p, i) => ({
    id: i + 1,
    sku: `PRD-${String(i + 1).padStart(3, '0')}`,
    name: p[0],
    category: p[1],
    price: p[2],
    stock: p[3],
    image: `assets/products/${p[4]}.jpg`,
    description: p[5],
    long_description: p[5],
    active: 1,
  }));

  const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"'`]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
  }[c]));

  const request = async (action, options = {}) => {
    const { params = {}, headers: optionHeaders = {}, ...fetchOptions } = options;
    const headers = {
      'Content-Type': 'application/json',
      ...(state.csrfToken ? { 'X-CSRF-Token': state.csrfToken } : {}),
      ...optionHeaders,
    };
    const query = new URLSearchParams({ action, ...params });
    const response = await fetch(`${API}?${query.toString()}`, {
      credentials: 'same-origin',
      headers,
      ...fetchOptions,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Error de la solicitud');
    }
    return data;
  };

  const toast = message => {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
  };

  const post = (action, body) => request(action, { method: 'POST', body: JSON.stringify(body) });
  const log = (type, productId = null, payload = {}) => post('event', { type, product_id: productId, session_id: state.sessionId, payload, csrf: state.csrfToken }).catch(() => {});

  async function init() {
    try {
      const [p, s] = await Promise.all([request('products'), request('session')]);
      state.products = p.products || [];
      state.user = s.user;
      state.csrfToken = s.csrf || '';
      window.SENSORIA.csrf = state.csrfToken;
      renderProducts();
    } catch {
      state.products = fallbackProducts;
      renderProducts();
      toast('Catálogo de muestra: falta conectar MySQL');
    }
    bindStatic();
    syncRoleUI();
    updateCartBadge();
    setupCookieConsent();
  }

  function syncRoleUI() {
    const isAdmin = state.user?.role === 'admin';
    $$('[data-admin-only]').forEach(element => {
      element.hidden = !isAdmin;
    });
    $('#accountBtn span').textContent = state.user ? state.user.name : 'Mi cuenta';
  }

  function bindStatic() {
    $$('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
    $$('#categoryTabs [data-category], .sensory [data-category]').forEach(b => b.addEventListener('click', () => {
      state.category = b.dataset.category;
      $$('#categoryTabs button').forEach(x => x.classList.toggle('active', x.dataset.category === state.category));
      renderProducts();
    }));
    $('#searchInput').addEventListener('input', e => {
      state.query = e.target.value;
      renderProducts();
    });
    $('#sortSelect').addEventListener('change', e => {
      state.sort = e.target.value;
      renderProducts();
    });
    $('#exploreBtn').addEventListener('click', () => $('#catalog').scrollIntoView({ behavior: 'smooth' }));
    $('#ritualBtn').addEventListener('click', () => $('.finder').scrollIntoView({ behavior: 'smooth' }));
    $$('[data-ritual]').forEach(b => b.addEventListener('click', () => {
      const map = { foco: 'Táctil', calma: 'Visual', dormir: 'Sonoro' };
      state.category = map[b.dataset.ritual];
      renderProducts();
      $('#catalog').scrollIntoView({ behavior: 'smooth' });
    }));
    $('#cartBtn').addEventListener('click', openCart);
    $('#accountBtn').addEventListener('click', openAccountModal);
    $('.modal-close').addEventListener('click', closeModal);
    $('#modal').addEventListener('mousedown', e => e.target === e.currentTarget && closeModal());
    $('.drawer-close').addEventListener('click', closeCart);
    $('#cartDrawer').addEventListener('mousedown', e => e.target === e.currentTarget && closeCart());
    $('#refreshAdmin').addEventListener('click', loadAdmin);
    $('#supportForm')?.addEventListener('submit', submitSupport);
    $('#acceptCookies')?.addEventListener('click', () => saveCookieChoice('all'));
    $('#necessaryCookies')?.addEventListener('click', () => saveCookieChoice('necessary'));
    $('#manageCookies')?.addEventListener('click', () => {
      $('#cookieBanner').hidden = false;
      $('#cookieBanner').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeModal();
        closeCart();
      }
    });
  }

  function showView(name) {
    if (name === 'admin' && state.user?.role !== 'admin') {
      toast('Acceso exclusivo para administradores');
      name = 'shop';
    }
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#${name}View`)?.classList.add('active');
    $$('#mainNav button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'account') loadAccount();
    if (name === 'admin') loadAdmin();
  }

  function renderProducts() {
    let rows = state.products.filter(p => (
      (state.category === 'Todas' || p.category === state.category) &&
      `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(state.query.toLowerCase())
    ));
    if (state.sort === 'priceAsc') rows.sort((a, b) => +a.price - +b.price);
    if (state.sort === 'priceDesc') rows.sort((a, b) => +b.price - +a.price);
    if (state.sort === 'stock') rows.sort((a, b) => +a.stock - +b.stock);
    $('#productGrid').innerHTML = rows.length ? rows.map(p => `
      <article class="product-card">
        <button class="product-image" data-detail="${p.id}"><img loading="lazy" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"></button>
        <div class="product-body">
          <div class="product-tag">${escapeHtml(p.category)}</div>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description)}</p>
          <div class="product-meta"><span>${money.format(+p.price)}</span><b>Stock ${p.stock}</b></div>
          <div class="product-actions"><button class="secondary" data-detail="${p.id}">Ver</button><button class="primary" data-add="${p.id}">Añadir</button></div>
        </div>
      </article>
    `).join('') : '<div class="empty panel"><span>⌕</span><h3>No hay productos para esta búsqueda</h3></div>';
    $$('[data-detail]').forEach(b => b.addEventListener('click', () => openProduct(+b.dataset.detail)));
    $$('[data-add]').forEach(b => b.addEventListener('click', () => addToCart(+b.dataset.add)));
  }

  function openProduct(id) {
    const p = state.products.find(x => +x.id === id);
    if (!p) return;
    log('product.viewed', id);
    openModal(`<div class="product-detail"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"><div><p class="eyebrow">${escapeHtml(p.category)}</p><h2>${escapeHtml(p.name)}</h2><p class="price">${money.format(+p.price)}</p><p>${escapeHtml(p.long_description || p.description)}</p><div class="product-actions"><button class="primary" data-add="${p.id}">Añadir al carrito</button></div></div></div>`);
    $('#modalBody [data-add]')?.addEventListener('click', () => addToCart(id));
  }

  function addToCart(id) {
    const p = state.products.find(x => +x.id === id);
    if (!p) return;
    state.cart[id] = Math.min((state.cart[id] || 0) + 1, Math.min(10, +p.stock));
    saveCart();
    toast(`${p.name} añadido al carrito`);
    log('cart.item_added', id);
  }

  function saveCart() {
    localStorage.setItem('sensoria-cart', JSON.stringify(state.cart));
    updateCartBadge();
  }

  function cartLines() {
    return Object.entries(state.cart).map(([id, quantity]) => ({ product: state.products.find(p => +p.id === +id), quantity })).filter(x => x.product);
  }

  function updateCartBadge() {
    const n = Object.values(state.cart).reduce((s, n) => s + n, 0);
    $('#cartCount').textContent = n;
    $('#drawerCount').textContent = n;
  }

  function totals() {
    const subtotal = cartLines().reduce((s, l) => s + l.quantity * +l.product.price, 0);
    const discount = subtotal * state.couponPercent / 100;
    const shipping = subtotal >= 80 ? 0 : (subtotal ? 4.95 : 0);
    const tax = (subtotal - discount + shipping) * 0.21;
    return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax };
  }

  function openCart() {
    renderCart();
    $('#cartDrawer').hidden = false;
    document.body.classList.add('locked');
  }

  function closeCart() {
    $('#cartDrawer').hidden = true;
    if ($('#modal').hidden) document.body.classList.remove('locked');
  }

  function renderCart() {
    const lines = cartLines();
    const t = totals();
    $('#cartBody').innerHTML = lines.length ? `
      <div class="cart-lines">
        ${lines.map(l => `
          <article class="cart-line">
            <img src="${escapeHtml(l.product.image)}" alt="${escapeHtml(l.product.name)}">
            <div>
              <h4>${escapeHtml(l.product.name)}</h4>
              <p>${money.format(+l.product.price)} × ${l.quantity}</p>
            </div>
            <div><span class="qty"><button type="button" data-qty="${l.product.id}" data-delta="-1">−</button><b>${l.quantity}</b><button type="button" data-qty="${l.product.id}" data-delta="1">+</button></span><button data-remove="${l.product.id}" class="tiny" aria-label="Eliminar ${escapeHtml(l.product.name)}">×</button></div>
          </article>
        `).join('')}
      </div>
      <div class="coupon"><input id="couponInput" value="${escapeHtml(state.coupon)}" placeholder="Código de descuento"><button type="button" id="couponBtn">Aplicar</button></div>
      <div class="summary">${summaryHtml(t)}</div>
      <button id="checkoutBtn" class="primary full">Ir a pagar</button>
    ` : '<div class="empty panel"><span>⌑</span><h3>Tu carrito está vacío</h3></div>';

    $$('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
      const id = +btn.dataset.remove;
      delete state.cart[id];
      saveCart();
      renderCart();
      log('cart.item_removed', id);
    }));

    $$('[data-qty]').forEach(btn => btn.addEventListener('click', () => {
      const id = +btn.dataset.qty;
      const product = state.products.find(item => +item.id === id);
      const next = Math.max(0, Math.min(Number(product?.stock || 0), (state.cart[id] || 0) + Number(btn.dataset.delta || 0)));
      if (next === 0) delete state.cart[id]; else state.cart[id] = next;
      saveCart();
      renderCart();
    }));

    $('#checkoutBtn')?.addEventListener('click', renderCheckout);
    $('#couponBtn')?.addEventListener('click', validateCoupon);
  }

  function summaryHtml(t) {
    return `
      <div class="summary-row"><span>Subtotal</span><b>${money.format(t.subtotal)}</b></div>
      ${t.discount ? `<div class="summary-row discount"><span>Descuento</span><b>−${money.format(t.discount)}</b></div>` : ''}
      <div class="summary-row"><span>Envío</span><b>${money.format(t.shipping)}</b></div>
      <div class="summary-row"><span>IVA</span><b>${money.format(t.tax)}</b></div>
      <div class="summary-row total"><span>Total</span><b>${money.format(t.total)}</b></div>
    `;
  }

  async function validateCoupon() {
    const input = $('#couponInput');
    state.coupon = input.value.trim().toUpperCase();
    if (!state.coupon) {
      state.couponPercent = 0;
      renderCart();
      return;
    }

    try {
      const data = await request('coupon', { method: 'GET', params: { code: state.coupon, subtotal: totals().subtotal } });
      state.couponPercent = data.valid ? data.discount_percent : 0;
      toast(data.valid ? `Cupón ${state.coupon} aplicado` : 'Cupón no válido');
      renderCart();
    } catch {
      toast('No se pudo comprobar el cupón');
    }
  }

  function renderCheckout() {
    log('checkout.started', null, { items: cartLines().length, total: totals().total });
    const t = totals();
    $('#cartBody').innerHTML = `
      <form id="checkoutForm" class="checkout">
        <button type="button" class="back" id="backCart">← Volver al carrito</button>
        <p class="eyebrow">FINALIZAR COMPRA</p>
        <h3>Datos del cliente</h3>
        <div class="form-grid">
          <label>Nombre<input name="name" value="${escapeHtml(state.user?.name || '')}" required></label>
          <label>Email<input type="email" name="email" value="${escapeHtml(state.user?.email || '')}" required></label>
          <label>Teléfono<input name="phone" required></label>
          <label>Código postal<input name="postal_code" required></label>
          <label class="wide">Dirección<input name="address" required></label>
          <label class="wide">Ciudad<input name="city" required></label>
        </div>
        <h3>Método de pago</h3>
        <label class="payment-option selected">
          <input type="radio" name="payment_method" value="PAYPAL_SIMULADO" checked>
          <span><b>PayPal</b><small>Pasarela académica simulada</small></span>
          <strong>PayPal</strong>
        </label>
        <small class="academic-note">No se solicitarán contraseñas ni se realizará ningún cobro real.</small>
        <div class="summary">${summaryHtml(t)}</div>
        <div class="checkout-actions"><button type="submit" class="paypal-button">Continuar con PayPal</button></div>
      </form>
    `;
    $('#backCart').addEventListener('click', openCart);
    $('#checkoutForm').addEventListener('submit', openPayPalGateway);
  }

  function openPayPalGateway(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!e.currentTarget.reportValidity()) return;
    const payload = {
      name: String(f.get('name') || ''),
      email: String(f.get('email') || ''),
      phone: String(f.get('phone') || ''),
      address: String(f.get('address') || ''),
      city: String(f.get('city') || ''),
      postal_code: String(f.get('postal_code') || ''),
      payment_method: 'PAYPAL_SIMULADO',
      items: Object.entries(state.cart).map(([id, quantity]) => ({ id: Number(id), quantity })),
      coupon: state.coupon,
      shipping: 'standard',
      session_id: state.sessionId,
      csrf: state.csrfToken,
    };
    const total = totals().total;

    openModal(`
      <section class="paypal-gateway" aria-labelledby="paypalTitle">
        <div class="paypal-brand"><b>Pay</b><strong>Pal</strong><span>SIMULACIÓN ACADÉMICA</span></div>
        <h2 id="paypalTitle">Confirma tu pago</h2>
        <p>Vas a autorizar un pago simulado a <b>Sensoria</b>.</p>
        <div class="paypal-summary">
          <span>Cuenta de demostración<small>${escapeHtml(payload.email)}</small></span>
          <span>Destinatario<small>ventas@sensoria.onl</small></span>
          <span class="paypal-total">Total<b>${money.format(total)}</b></span>
        </div>
        <div class="paypal-notice"><b>Entorno de prueba</b><span>No se enviará dinero ni se accederá a una cuenta real de PayPal.</span></div>
        <button type="button" class="paypal-confirm" id="confirmPayPal">Simular pago de ${money.format(total)}</button>
        <button type="button" class="paypal-cancel" id="cancelPayPal">Cancelar y volver</button>
      </section>
    `);
    $('#cancelPayPal').addEventListener('click', closeModal);
    $('#confirmPayPal').addEventListener('click', () => placeOrder(payload, total));
  }

  async function placeOrder(payload, total) {
    const button = $('#confirmPayPal');
    button.disabled = true;
    button.textContent = 'Procesando pago simulado...';

    try {
      const data = await request('checkout', { method: 'POST', body: JSON.stringify(payload) });
      state.cart = {};
      saveCart();
      closeModal();
      renderSuccess(data.order, payload.name, data.notifications || []);
    } catch (error) {
      toast(error.message || 'No se pudo confirmar el pedido');
    } finally {
      if (document.body.contains(button)) {
        button.disabled = false;
        button.textContent = `Simular pago de ${money.format(total)}`;
      }
    }
  }

  function renderSuccess(order, customer, notifications) {
    const notice = channel => {
      const n = notifications.find(x => x.channel === channel);
      if (!n) return `${channel === 'EMAIL' ? '✉' : '▣'} Aviso no disponible`;
      const labels = { ENVIADO: 'Enviado correctamente', SIMULADO: 'Registrado en modo simulación', ERROR: 'No se pudo enviar' };
      return `${channel === 'EMAIL' ? '✉' : '▣'} ${labels[n.delivery_status] || n.delivery_status || 'Registrado'}${n.error_message ? ` · ${n.error_message}` : ''}`;
    };

    $('#cartBody').innerHTML = `
      <div class="success panel">
        <span>✓</span>
        <h3>Pedido confirmado</h3>
        <p>Gracias, ${escapeHtml(customer)}. Tu pedido <b>${escapeHtml(order.order_number)}</b> está registrado.</p>
        <p>Hemos preparado la confirmación y la factura demostrativa para <b>${escapeHtml(order.customer_email || '')}</b>.</p>
        <ul>
          <li>${notice('EMAIL')}</li>
          <li>${notice('SMS')}</li>
        </ul>
        <button type="button" class="secondary" id="openInvoice">Ver factura</button>
      </div>
    `;
    $('#openInvoice')?.addEventListener('click', () => openInvoicePreview(order));
  }

  function openAccountModal() {
    if (state.user) {
      openModal(`<div class="account-card"><div class="avatar">${escapeHtml(state.user.name[0].toUpperCase())}</div><p>Hola,</p><h2>${escapeHtml(state.user.name)}</h2><div class="stack"><button data-auth="orders">Ver pedidos</button><button data-auth="logout">Cerrar sesión</button></div></div>`);
      $('#modalBody [data-auth="orders"]').addEventListener('click', () => {
        closeModal();
        showView('account');
      });
      $('#modalBody [data-auth="logout"]').addEventListener('click', logout);
      return;
    }
    renderAuth('login');
  }

  function renderAuth(mode) {
    openModal(`<div class="auth"><div class="auth-tabs"><button class="${mode === 'login' ? 'active' : ''}" data-auth="login">Iniciar sesión</button><button class="${mode === 'register' ? 'active' : ''}" data-auth="register">Registrarse</button></div><form id="authForm"><label>Nombre<input name="name" ${mode === 'login' ? 'hidden' : ''}></label><label>Email<input type="email" name="email" required></label><label>Contraseña<input type="password" name="password" required></label><button class="primary" type="submit">${mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button></form></div>`);
    $$('[data-auth]').forEach(btn => btn.addEventListener('click', () => renderAuth(btn.dataset.auth)));
    $('#authForm').addEventListener('submit', e => submitAuth(e, mode));
  }

  async function submitAuth(e, mode) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get('name') || ''),
      email: String(f.get('email') || ''),
      password: String(f.get('password') || ''),
      csrf: state.csrfToken,
    };

    try {
      const data = await request(mode, { method: 'POST', body: JSON.stringify(payload) });
      state.user = data.user;
      state.csrfToken = data.csrf || state.csrfToken;
      window.SENSORIA.csrf = state.csrfToken;
      syncRoleUI();
      closeModal();
      toast(mode === 'login' ? 'Sesión iniciada' : 'Cuenta creada');
      showView('account');
    } catch (error) {
      toast(error.message || 'No se pudo completar la operación');
    }
  }

  async function logout() {
    try {
      await request('logout', { method: 'POST', body: JSON.stringify({ csrf: state.csrfToken }) });
      state.user = null;
      const session = await request('session');
      state.csrfToken = session.csrf || '';
      window.SENSORIA.csrf = state.csrfToken;
      syncRoleUI();
      closeModal();
      showView('shop');
      toast('Sesión cerrada');
    } catch (error) {
      toast(error.message || 'No se pudo cerrar la sesión');
    }
  }

  async function loadAccount() {
    const root = $('#accountContent');
    if (!state.user) {
      root.innerHTML = '<div class="empty panel"><span>♙</span><h3>Inicia sesión para ver tus pedidos</h3><p>Tu historial de compras aparecerá aquí.</p></div>';
      return;
    }

    try {
      const data = await request('my_orders');
      root.innerHTML = data.orders?.length ? data.orders.map(orderCard).join('') : '<div class="empty panel"><span>♙</span><h3>Aún no tienes pedidos</h3><p>Tu primera compra aparecerá aquí.</p></div>';
      $$('[data-return-order]', root).forEach(button => button.addEventListener('click', () => openReturnForm(+button.dataset.returnOrder)));
    } catch {
      root.innerHTML = '<div class="empty panel"><span>⚠</span><h3>No se pudieron cargarse tus pedidos</h3></div>';
    }
  }

  function orderCard(o) {
    const steps = ['PAGO_SIMULADO', 'PREPARACION', 'ENVIADO', 'ENTREGADO'];
    const idx = Math.max(0, steps.indexOf(o.status));
    const itemSummary = (o.items || []).map(item => `${item.quantity}× ${escapeHtml(item.product_name)}`).join(' · ');
    return `<article class="order-card"><header><div><span>${escapeHtml(o.order_number)}</span><h3>${escapeHtml(o.customer_name)}</h3></div><b>${money.format(+o.total)}</b></header><div class="order-meta"><small>${escapeHtml(o.status)}</small><small>${escapeHtml(o.created_at)}</small></div>${itemSummary ? `<div class="order-items"><span>${itemSummary}</span></div>` : ''}<div class="progress">${steps.map((s, i) => `<span class="${i <= idx ? 'done' : ''}">${s.replace('_', ' ')}</span>`).join('')}</div><div class="order-buttons"><a href="${API}?action=invoice&amp;order_id=${encodeURIComponent(o.id)}" target="_blank" rel="noopener">Ver factura</a><button type="button" data-return-order="${o.id}">Solicitar devolución</button></div></article>`;
  }

  function openReturnForm(orderId) {
    openModal(`<section class="return-form"><p class="eyebrow">POSTVENTA</p><h2>Solicitar devolución</h2><p>La solicitud quedará registrada para que pueda revisarse desde administración.</p><form id="returnRequestForm"><label>Motivo<select name="reason" required><option value="">Selecciona un motivo</option><option>Desistimiento</option><option>Producto con incidencia</option><option>Pedido incorrecto</option><option>Otro</option></select></label><label>Detalles<textarea name="details" maxlength="1000" required placeholder="Describe brevemente la solicitud"></textarea></label><button class="primary" type="submit">Registrar solicitud</button></form></section>`);
    $('#returnRequestForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        await request('return_request', { method: 'POST', body: JSON.stringify({ order_id: orderId, reason: String(form.get('reason') || ''), details: String(form.get('details') || ''), session_id: state.sessionId, csrf: state.csrfToken }) });
        closeModal();
        toast('Devolución registrada correctamente');
      } catch (error) {
        toast(error.message || 'No se pudo registrar la devolución');
      }
    });
  }

  function openInvoicePreview(order) {
    const items = (order.items || []).map(item => `<tr><td>${escapeHtml(item.product_name)}</td><td>${Number(item.quantity)}</td><td>${money.format(+item.unit_price)}</td><td>${money.format(+item.unit_price * +item.quantity)}</td></tr>`).join('');
    const popup = window.open('', '_blank');
    if (!popup) {
      toast('Permite ventanas emergentes para abrir la factura');
      return;
    }
    popup.opener = null;
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura ${escapeHtml(order.order_number)}</title><style>body{margin:0;background:#edf3f5;color:#102a3c;font:15px Arial,sans-serif}.toolbar,.invoice{max-width:820px;margin:20px auto}.toolbar{text-align:right}.toolbar button{border:0;border-radius:8px;background:#244a68;color:#fff;padding:11px 16px;font-weight:bold}.invoice{background:#fff;padding:34px}.warning{background:#fff3df;border:1px solid #f0c983;padding:10px;text-align:center;font-size:11px;font-weight:bold}.head{display:flex;justify-content:space-between;padding:25px 0;border-bottom:2px solid #102a3c}.head strong{font-size:27px;letter-spacing:3px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0}.meta div{display:flex;flex-direction:column;gap:4px}table{width:100%;border-collapse:collapse}th,td{padding:11px 8px;border-bottom:1px solid #dce5ea;text-align:left}th{background:#102a3c;color:#fff}.totals{width:330px;max-width:100%;margin:22px 0 0 auto}.totals p{display:flex;justify-content:space-between}.totals .total{border-top:2px solid #102a3c;padding-top:10px;font-size:19px}.note{color:#647786;font-size:12px;margin-top:25px}@media print{body{background:#fff}.toolbar{display:none}.invoice{margin:0;max-width:none}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / guardar PDF</button></div><main class="invoice"><div class="warning">FACTURA DEMOSTRATIVA · SIN VALIDEZ FISCAL</div><div class="head"><strong>SENSORIA</strong><div><b>${escapeHtml(order.order_number)}</b><br>${escapeHtml(order.created_at || '')}</div></div><div class="meta"><div><small>EMISOR FICTICIO</small><b>Sensoria · Proyecto académico</b><span>Calle de la Innovación, 24 · Madrid</span></div><div><small>CLIENTE</small><b>${escapeHtml(order.customer_name || '')}</b><span>${escapeHtml(order.customer_email || '')}</span><span>${escapeHtml(order.address || '')}</span></div></div><table><thead><tr><th>Producto</th><th>Ud.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>${items}</tbody></table><div class="totals"><p><span>Subtotal</span><b>${money.format(+order.subtotal)}</b></p><p><span>Descuento</span><b>−${money.format(+order.discount)}</b></p><p><span>Envío</span><b>${money.format(+order.shipping)}</b></p><p><span>IVA</span><b>${money.format(+order.tax)}</b></p><p class="total"><span>Total</span><b>${money.format(+order.total)}</b></p></div><p class="note">No se ha realizado ningún cobro ni envío real. Documento generado como evidencia funcional del prototipo académico.</p></main></body></html>`);
    popup.document.close();
  }

  async function submitSupport(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Registrando...';
    try {
      const data = await request('support', { method: 'POST', body: JSON.stringify({ name: String(form.get('name') || ''), email: String(form.get('email') || ''), kind: String(form.get('kind') || ''), order_number: String(form.get('order_number') || ''), message: String(form.get('message') || ''), session_id: state.sessionId, csrf: state.csrfToken }) });
      event.currentTarget.reset();
      toast(`Solicitud registrada: ${data.reference}`);
    } catch (error) {
      toast(error.message || 'No se pudo registrar la solicitud');
    } finally {
      button.disabled = false;
      button.textContent = 'Enviar solicitud';
    }
  }

  function setupCookieConsent() {
    const choice = localStorage.getItem('sensoria-cookie-choice');
    $('#cookieBanner').hidden = Boolean(choice);
  }

  function saveCookieChoice(choice) {
    localStorage.setItem('sensoria-cookie-choice', choice);
    $('#cookieBanner').hidden = true;
    toast(choice === 'all' ? 'Preferencias guardadas' : 'Solo almacenamiento necesario');
  }

  function renderAdmin() {
    const root = $('#adminContent');
    if (!state.user || state.user.role !== 'admin') {
      root.innerHTML = '<div class="empty panel"><span>⌘</span><h3>Acceso de administración</h3><p>Necesitas permisos de administrador.</p></div>';
      return;
    }

    try {
      const data = state.admin;
      if (!data) {
        root.innerHTML = '<div class="loading">Cargando datos de gestión…</div>';
        return;
      }
      const orders = data.orders || [];
      const products = data.products || [];
      const events = data.events || [];
      const returns = data.returns || [];
      const notifications = data.notifications || [];
      const customers = data.customers || [];
      const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const eventPayload = event => {
        try {
          const parsed = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
          return Object.entries(parsed || {}).slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(' · ');
        } catch {
          return '';
        }
      };
      const statusOptions = current => ['PAGO_SIMULADO', 'PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO'].map(status => `<option value="${status}" ${status === current ? 'selected' : ''}>${status.replace('_', ' ')}</option>`).join('');
      const returnOptions = current => ['SOLICITADA', 'APROBADA', 'RECHAZADA', 'REEMBOLSO_SIMULADO'].map(status => `<option value="${status}" ${status === current ? 'selected' : ''}>${status.replace('_', ' ')}</option>`).join('');

      const dashboard = `<div class="kpis"><article><span>Pedidos</span><b>${orders.length}</b><small>Persistidos</small></article><article><span>Ventas simuladas</span><b>${money.format(revenue)}</b><small>Sin cobros reales</small></article><article><span>Eventos</span><b>${events.length}</b><small>Trazabilidad reciente</small></article><article><span>Devoluciones</span><b>${returns.length}</b><small>Solicitudes</small></article></div><div class="admin-grid"><section class="admin-card"><h2>Últimos pedidos</h2>${orders.slice(0, 6).map(order => `<div class="admin-row"><span><b>${escapeHtml(order.order_number)}</b><small>${escapeHtml(order.customer_name)} · ${escapeHtml(order.status)}</small></span><strong>${money.format(+order.total)}</strong></div>`).join('') || '<p>Sin pedidos.</p>'}</section><section class="admin-card"><h2>Últimos eventos</h2><div class="feed">${events.slice(0, 8).map(event => `<div><i>●</i><span><b>${escapeHtml(event.event_type)}</b><small>${escapeHtml(eventPayload(event) || event.session_id)}</small></span><em>${escapeHtml(event.created_at)}</em></div>`).join('') || '<p>Sin eventos.</p>'}</div></section></div>`;
      const orderList = `<section class="admin-card"><div class="card-head"><div><h2>Pedidos y estados</h2><p>Cambiar un estado genera la comunicación correspondiente.</p></div></div>${orders.map(order => `<div class="admin-row"><span><b>${escapeHtml(order.order_number)}</b><small>${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_email)} · ${money.format(+order.total)}</small></span><select data-order-status="${order.id}">${statusOptions(order.status)}</select></div>`).join('') || '<p>Sin pedidos.</p>'}</section>`;
      const catalog = `<section class="admin-card"><h2>Catálogo y stock</h2>${products.map(product => `<div class="admin-row"><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.sku)} · ${escapeHtml(product.category)}</small></span><b>${money.format(+product.price)}</b><span class="badge">Stock ${product.stock}</span></div>`).join('')}</section>`;
      const crm = `<section class="admin-card"><h2>Clientes</h2>${customers.map(customer => `<div class="admin-row"><span><b>${escapeHtml(customer.name)}</b><small>${escapeHtml(customer.email)} · Último pedido ${escapeHtml(customer.last_order)}</small></span><span class="badge">${customer.orders} pedidos</span><b>${money.format(+customer.spend)}</b></div>`).join('') || '<p>Sin clientes.</p>'}</section>`;
      const communications = `<section class="admin-card"><div class="card-head"><div><h2>Comunicaciones</h2><p>Correo ${data.notification_config?.email_enabled ? 'activo' : 'simulado'} · SMS ${data.notification_config?.sms_enabled ? 'activo' : 'simulado'}</p></div></div>${notifications.map(item => `<div class="admin-row"><span><b>${escapeHtml(item.subject)}</b><small>${escapeHtml(item.channel)} · ${escapeHtml(item.recipient_email || item.recipient_phone || '')}</small></span><span class="badge ${item.delivery_status === 'ERROR' ? 'red' : ''}">${escapeHtml(item.delivery_status)}</span></div>`).join('') || '<p>Sin comunicaciones.</p>'}</section>`;
      const returnList = `<section class="admin-card"><h2>Devoluciones</h2>${returns.map(item => `<div class="admin-row"><span><b>${escapeHtml(item.order_number)} · ${escapeHtml(item.reason)}</b><small>${escapeHtml(item.customer_name)} · ${escapeHtml(item.details)}</small></span><select data-return-status="${item.id}">${returnOptions(item.status)}</select></div>`).join('') || '<p>Sin devoluciones.</p>'}</section>`;
      const eventList = `<section class="admin-card"><h2>Registro de eventos</h2><div class="feed">${events.map(event => `<div><i>↳</i><span><b>${escapeHtml(event.event_type)}</b><small>${escapeHtml(eventPayload(event) || event.session_id)}${event.order_id ? ` · pedido ${event.order_id}` : ''}</small></span><em>${escapeHtml(event.created_at)}</em></div>`).join('') || '<p>Sin eventos.</p>'}</div></section>`;
      const contents = { dashboard, orders: orderList, catalog, crm, communications, returns: returnList, events: eventList };

      root.innerHTML = `<div class="admin-tabs"><button data-tab="dashboard" class="${state.adminTab === 'dashboard' ? 'active' : ''}">Resumen</button><button data-tab="orders" class="${state.adminTab === 'orders' ? 'active' : ''}">Pedidos</button><button data-tab="events" class="${state.adminTab === 'events' ? 'active' : ''}">Eventos</button><button data-tab="returns" class="${state.adminTab === 'returns' ? 'active' : ''}">Devoluciones</button><button data-tab="communications" class="${state.adminTab === 'communications' ? 'active' : ''}">Comunicaciones</button><button data-tab="catalog" class="${state.adminTab === 'catalog' ? 'active' : ''}">Catálogo</button><button data-tab="crm" class="${state.adminTab === 'crm' ? 'active' : ''}">CRM</button></div><div class="admin-panel">${contents[state.adminTab] || dashboard}</div>`;
      $$('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
        state.adminTab = btn.dataset.tab;
        renderAdmin();
      }));
      $$('[data-order-status]').forEach(select => select.addEventListener('change', async () => {
        select.disabled = true;
        try {
          await request('order_status', { method: 'POST', body: JSON.stringify({ order_id: Number(select.dataset.orderStatus), status: select.value, csrf: state.csrfToken }) });
          toast('Estado actualizado y comunicación registrada');
          await loadAdmin();
        } catch (error) {
          toast(error.message || 'No se pudo actualizar el pedido');
          select.disabled = false;
        }
      }));
      $$('[data-return-status]').forEach(select => select.addEventListener('change', async () => {
        select.disabled = true;
        try {
          await request('return_status', { method: 'POST', body: JSON.stringify({ id: Number(select.dataset.returnStatus), status: select.value, csrf: state.csrfToken }) });
          toast('Devolución actualizada');
          await loadAdmin();
        } catch (error) {
          toast(error.message || 'No se pudo actualizar la devolución');
          select.disabled = false;
        }
      }));
    } catch {
      root.innerHTML = '<div class="empty panel"><span>⚠</span><h3>Error cargando administración</h3></div>';
    }
  }

  async function loadAdmin() {
    const root = $('#adminContent');
    if (!state.user || state.user.role !== 'admin') return;
    try {
      const data = await request('admin_data');
      state.admin = data;
      renderAdmin();
    } catch (error) {
      root.innerHTML = `<div class="empty panel"><span>⚠</span><h3>No se pudo cargar la administración</h3><p>${escapeHtml(error.message || 'Error')}</p></div>`;
    }
  }

  function openModal(html) {
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    document.body.classList.add('locked');
  }

  function closeModal() {
    $('#modal').hidden = true;
    $('#modalBody').innerHTML = '';
    if ($('#cartDrawer').hidden) document.body.classList.remove('locked');
  }

  init();
})();

document.getElementById('ai-btn')?.addEventListener('click', async () => {
  const input = document.getElementById('ai-query');
  const resultBox = document.getElementById('ai-result');
  const query = input?.value.trim();

  if (!query) {
    alert('Por favor, describe qué estás buscando.');
    return;
  }

  resultBox.style.display = 'block';
  resultBox.textContent = 'Consultando catálogo con la IA...';

  try {
    const res = await fetch('api/index.php?action=recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.SENSORIA?.csrf || '' },
      body: JSON.stringify({ query, csrf: window.SENSORIA?.csrf || '' })
    });
    const data = await res.json();
    if (data.recommendation) {
      const safeRecommendation = String(data.recommendation).replace(/[&<>"'`]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[character]));
      resultBox.innerHTML = `<strong>Recomendación personalizada:</strong><br>${safeRecommendation.replace(/\n/g, '<br>')}`;
    } else {
      resultBox.textContent = data.error || 'No se pudo generar recomendación.';
    }
  } catch (e) {
    resultBox.textContent = 'Error de conexión con el servicio.';
  }
});

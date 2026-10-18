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
    adminSearch: '',
    lastFocus: null,
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
  const ratingFor = id => (4.5 + ((Number(id) * 7) % 5) / 10).toFixed(1).replace('.', ',');
  const reviewCountFor = id => 18 + ((Number(id) * 23) % 119);
  const productBadge = product => Number(product.stock) <= 8 ? 'ÚLTIMAS UNIDADES' : Number(product.id) % 5 === 0 ? 'NOVEDAD' : Number(product.id) % 3 === 0 ? 'MÁS VENDIDO' : '';
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

  const request = async (action, options = {}, retryingAfterCsrfRefresh = false) => {
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
    if (response.status === 419 && data.code === 'csrf_expired' && data.csrf && !retryingAfterCsrfRefresh) {
      state.csrfToken = data.csrf;
      window.SENSORIA.csrf = data.csrf;
      return request(action, options, true);
    }
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
      const s = await request('session');
      state.user = s.user;
      state.csrfToken = s.csrf || '';
      window.SENSORIA.csrf = state.csrfToken;
      const p = await request('products');
      state.products = p.products || [];
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
    $$('[data-scroll]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.scroll}`)?.scrollIntoView({ behavior: 'smooth' })));
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
      if (e.key === 'Tab') {
        const layer = !$('#modal').hidden ? $('#modal') : !$('#cartDrawer').hidden ? $('#cartDrawer') : null;
        if (!layer) return;
        const focusable = $$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]', layer).filter(item => item.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
        ${productBadge(p) ? `<span class="product-badge">${productBadge(p)}</span>` : ''}
        <button class="product-image" data-detail="${p.id}"><img loading="lazy" decoding="async" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"></button>
        <div class="product-body">
          <div class="product-tag">${escapeHtml(p.category)}</div>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="rating" aria-label="${ratingFor(p.id)} de 5 estrellas"><span>★★★★★</span><small>${ratingFor(p.id)} · ${reviewCountFor(p.id)} opiniones demo</small></div>
          <p>${escapeHtml(p.description)}</p>
          <div class="product-meta"><span>${money.format(+p.price)}<small class="vat-note">IVA incluido</small></span><b>Stock ${p.stock}</b></div>
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
    const profile = p.category === 'Visual' ? ['Luz suave', 'Baja intensidad', 'Descanso'] : p.category === 'Sonoro' ? ['Sonido continuo', 'Volumen regulable', 'Sueño'] : ['Tacto agradable', 'Presión media', 'Concentración'];
    const related = state.products.filter(item => item.category === p.category && +item.id !== id).slice(0, 3);
    openModal(`<div class="product-detail"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"><div><p class="eyebrow">${escapeHtml(p.category)}</p><h2>${escapeHtml(p.name)}</h2><div class="detail-rating"><span>★★★★★</span><small>${ratingFor(p.id)} · ${reviewCountFor(p.id)} opiniones demo</small></div><p class="price">${money.format(+p.price)} <small>IVA incluido</small></p><p class="detail-lead">${escapeHtml(p.long_description || p.description)}</p><div class="sensory-profile">${profile.map((value, index) => `<span><small>${['ESTÍMULO','INTENSIDAD','MOMENTO'][index]}</small><b>${value}</b></span>`).join('')}</div><ul class="detail-benefits"><li>Diseñado para adultos y espacios cotidianos</li><li>Uso sencillo con instrucciones incluidas</li><li>Entrega estándar estimada: 2–4 días laborables</li></ul><div class="detail-buy"><div><strong>${money.format(+p.price)}</strong><small class="vat-note">IVA incluido · Envío gratis desde 80 €</small></div><button class="primary" data-add="${p.id}">Añadir al carrito</button></div>${related.length ? `<p class="related-title">TAMBIÉN TE PUEDE GUSTAR</p><div class="related-products">${related.map(item => `<button type="button" data-related="${item.id}">${escapeHtml(item.name)}</button>`).join('')}</div>` : ''}</div></div>`);
    $('#modalBody [data-add]')?.addEventListener('click', () => addToCart(id));
    $$('[data-related]', $('#modalBody')).forEach(button => button.addEventListener('click', () => openProduct(+button.dataset.related)));
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
    const total = subtotal - discount + shipping;
    const tax = total - (total / 1.21);
    return { subtotal, discount, shipping, tax, total };
  }

  function openCart() {
    state.lastFocus = document.activeElement;
    renderCart();
    $('#cartDrawer').hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(() => $('.drawer-close')?.focus());
  }

  function closeCart() {
    if ($('#cartDrawer').hidden) return;
    $('#cartDrawer').hidden = true;
    if ($('#modal').hidden) document.body.classList.remove('locked');
    state.lastFocus?.focus?.();
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
      <div class="summary-row"><span>Productos</span><b>${money.format(t.subtotal)}</b></div>
      ${t.discount ? `<div class="summary-row discount"><span>Descuento</span><b>−${money.format(t.discount)}</b></div>` : ''}
      <div class="summary-row"><span>Envío</span><b>${money.format(t.shipping)}</b></div>
      <div class="summary-row"><span>IVA incluido (21 %)</span><b>${money.format(t.tax)}</b></div>
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
        <div class="checkout-steps" aria-label="Progreso de compra"><span><i>✓</i>Carrito</span><span class="active"><i>2</i>Datos</span><span><i>3</i>Confirmación</span></div>
        <p class="eyebrow">FINALIZAR COMPRA</p>
        <h3>Datos del cliente</h3>
        <div class="form-grid">
          <label>Nombre<input name="name" autocomplete="name" maxlength="120" value="${escapeHtml(state.user?.name || '')}" required></label>
          <label>Email<input type="email" name="email" autocomplete="email" maxlength="190" value="${escapeHtml(state.user?.email || '')}" required></label>
          <label>Teléfono<input name="phone" autocomplete="tel" inputmode="tel" pattern="[0-9 +()-]{7,20}" maxlength="20" required><small>Ej.: 600 000 000</small></label>
          <label>Código postal<input name="postal_code" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required><small>5 cifras</small></label>
          <label class="wide">Dirección<input name="address" autocomplete="street-address" maxlength="190" required></label>
          <label class="wide">Ciudad<input name="city" autocomplete="address-level2" maxlength="120" required></label>
        </div>
        <div class="checkout-review"><h4>Tu pedido</h4>${cartLines().map(line => `<p><span>${line.quantity} × ${escapeHtml(line.product.name)}</span><b>${money.format(line.quantity * +line.product.price)}</b></p>`).join('')}</div>
        <h3>Método de pago</h3>
        <label class="payment-option selected">
          <input type="radio" name="payment_method" value="PAYPAL_SIMULADO" checked>
          <span><b>PayPal</b><small>Pasarela académica simulada</small></span>
          <strong>PayPal</strong>
        </label>
        <small class="academic-note">No se solicitarán contraseñas ni se realizará ningún cobro real.</small>
        <div class="summary">${summaryHtml(t)}</div>
        <label class="consent-check"><input type="checkbox" required><span>Acepto las condiciones del prototipo y confirmo que utilizaré únicamente datos de prueba.</span></label>
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
    const cityLine = `${escapeHtml(order.postal_code || '')} ${escapeHtml(order.city || '')}`.trim();
    const popup = window.open('', '_blank');
    if (!popup) {
      toast('Permite ventanas emergentes para abrir la factura');
      return;
    }
    popup.opener = null;
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factura ${escapeHtml(order.order_number)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#eaf1f2;color:#102a3c;font:15px Arial,sans-serif}.toolbar{max-width:900px;margin:20px auto;text-align:right}.toolbar button{border:0;border-radius:12px;background:#173f55;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer;box-shadow:0 8px 18px #102a3c25}.invoice{max-width:820px;margin:0 auto 32px;background:#fff;padding:0 38px 34px;box-shadow:0 18px 50px #102a3c20;border-radius:20px;overflow:hidden}.head{margin:0 -38px;display:flex;justify-content:space-between;align-items:center;gap:25px;padding:30px 38px;background:linear-gradient(135deg,#102a3c,#245f6b);color:#fff}.brand{display:flex;align-items:center;gap:14px}.mark{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;background:#e3b87a;color:#102a3c;font-size:28px;font-weight:bold}.brand>div,.title{display:flex;flex-direction:column}.brand strong{font-size:24px;letter-spacing:.14em}.brand span,.title span{color:#d8e7e9}.title{text-align:right}.title small{color:#c0d7dc;letter-spacing:.12em}.title b{font-size:23px;margin:4px 0}.warning{display:flex;align-items:center;gap:16px;margin:24px 0;padding:13px 16px;border-radius:12px;background:#fff5e7;border:1px solid #efd2a8}.warning b{color:#9a5e16;font-size:11px;letter-spacing:.08em;white-space:nowrap}.warning span{color:#684c2d;font-size:12px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:24px 0}.parties>div{display:flex;flex-direction:column;gap:5px;padding:18px;border-radius:14px;background:#f4f8f8;border:1px solid #dce8e9}small{color:#47707b;font-weight:bold;letter-spacing:.06em}.order-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.order-meta>span{display:flex;flex-direction:column;gap:5px;padding:13px 14px;border-radius:12px;background:#eaf3f3}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border-radius:14px;border:1px solid #d8e4e6}th,td{padding:13px 11px;border-bottom:1px solid #dce5ea;text-align:left}th{background:#173f55;color:#fff;font-size:12px;letter-spacing:.04em}tbody tr:nth-child(even){background:#f7fafb}tbody tr:last-child td{border-bottom:0}.totals{width:370px;max-width:100%;margin:24px 0 24px auto;padding:14px 16px;border-radius:14px;background:#f4f8f8}.totals p{display:flex;justify-content:space-between;margin:0;padding:7px}.totals .total{margin-top:6px;padding-top:13px;border-top:2px solid #2a6f78;color:#173f55;font-size:21px}.footer{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-top:30px;padding-top:20px;border-top:1px solid #d8e4e6}.footer>div{display:flex;flex-direction:column;color:#2a6f78}.footer p{max-width:420px;margin:0;color:#6b7f88;font-size:11px;line-height:1.5;text-align:right}@media(max-width:600px){.invoice{padding:0 18px 24px;border-radius:0}.head{margin:0 -18px;padding:24px 18px;align-items:flex-start}.title b{font-size:18px}.parties,.order-meta{grid-template-columns:1fr}.warning,.footer{align-items:flex-start;flex-direction:column}.footer p{text-align:left}.mark{display:none}}@media print{body{background:#fff}.toolbar{display:none}.invoice{box-shadow:none;margin:0;max-width:none;border-radius:0}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / guardar como PDF</button></div><main class="invoice"><header class="head"><div class="brand"><span class="mark">≋</span><div><strong>SENSORIA</strong><span>Bienestar sensorial</span></div></div><div class="title"><small>DOCUMENTO DE COMPRA</small><b>Factura demostrativa</b><span>${escapeHtml(order.order_number)}</span></div></header><div class="warning"><b>PROTOTIPO ACADÉMICO</b><span>Documento demostrativo sin validez fiscal. No se ha realizado ningún cobro real.</span></div><section class="parties"><div><small>EMISOR FICTICIO</small><b>Sensoria · Proyecto académico</b><span>Calle de la Innovación, 24</span><span>28014 Madrid · España</span><span>pedidos@sensoria.onl</span></div><div><small>CLIENTE</small><b>${escapeHtml(order.customer_name || '')}</b><span>${escapeHtml(order.customer_email || '')}</span><span>${escapeHtml(order.address || '')}</span><span>${cityLine}</span></div></section><div class="order-meta"><span><small>FECHA</small><b>${escapeHtml(order.created_at || '')}</b></span><span><small>PAGO</small><b>PayPal simulado</b></span><span><small>ESTADO</small><b>${escapeHtml(order.status || 'PAGO_SIMULADO')}</b></span></div><table><thead><tr><th>Producto</th><th>Ud.</th><th>Precio final</th><th>Importe</th></tr></thead><tbody>${items}</tbody></table><div class="totals"><p><span>Productos (IVA incl.)</span><b>${money.format(+order.subtotal)}</b></p><p><span>Descuento</span><b>−${money.format(+order.discount)}</b></p><p><span>Envío</span><b>${money.format(+order.shipping)}</b></p><p><span>IVA incluido (21 %)</span><b>${money.format(+order.tax)}</b></p><p class="total"><span>Total</span><b>${money.format(+order.total)}</b></p></div><footer class="footer"><div><b>Gracias por elegir Sensoria</b><span>Tu pausa empieza aquí.</span></div><p>Documento generado exclusivamente como evidencia funcional del prototipo académico Sensoria.</p></footer></main></body></html>`);
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
      const days = Array.from({ length: 7 }, (_, offset) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - offset));
        const key = date.toISOString().slice(0, 10);
        return { key, label: new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date), count: orders.filter(order => String(order.created_at || '').startsWith(key)).length };
      });
      const chartMax = Math.max(1, ...days.map(day => day.count));
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

      const dashboard = `<div class="kpis"><article><span>Pedidos</span><b>${orders.length}</b><small>Persistidos</small></article><article><span>Ventas simuladas</span><b>${money.format(revenue)}</b><small>Sin cobros reales</small></article><article><span>Eventos</span><b>${events.length}</b><small>Trazabilidad reciente</small></article><article><span>Devoluciones</span><b>${returns.length}</b><small>Solicitudes</small></article></div><section class="admin-card"><div class="card-head"><div><h2>Actividad de pedidos</h2><p>Últimos siete días</p></div><button type="button" class="secondary" id="exportOrders">Exportar CSV</button></div><div class="mini-chart" aria-label="Pedidos de los últimos siete días">${days.map(day => `<span style="height:${Math.max(5, day.count / chartMax * 100)}%"><b>${day.count}</b><small>${day.label}</small></span>`).join('')}</div></section><div class="admin-grid"><section class="admin-card"><h2>Últimos pedidos</h2>${orders.slice(0, 6).map(order => `<div class="admin-row"><span><b>${escapeHtml(order.order_number)}</b><small>${escapeHtml(order.customer_name)} · ${escapeHtml(order.status)}</small></span><strong>${money.format(+order.total)}</strong></div>`).join('') || '<p>Sin pedidos.</p>'}</section><section class="admin-card"><h2>Últimos eventos</h2><div class="feed">${events.slice(0, 8).map(event => `<div><i>●</i><span><b>${escapeHtml(event.event_type)}</b><small>${escapeHtml(eventPayload(event) || event.session_id)}</small></span><em>${escapeHtml(event.created_at)}</em></div>`).join('') || '<p>Sin eventos.</p>'}</div></section></div>`;
      const orderList = `<section class="admin-card"><div class="card-head"><div><h2>Pedidos y estados</h2><p>Cambiar un estado genera la comunicación correspondiente.</p></div></div>${orders.map(order => `<div class="admin-row"><span><b>${escapeHtml(order.order_number)}</b><small>${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_email)} · ${money.format(+order.total)}</small></span><select data-order-status="${order.id}">${statusOptions(order.status)}</select></div>`).join('') || '<p>Sin pedidos.</p>'}</section>`;
      const filteredProducts = products.filter(product => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(state.adminSearch.toLowerCase()));
      const catalog = `<section class="admin-card"><div class="card-head"><div><h2>Catálogo y stock</h2><p>Edita precios, disponibilidad y contenido del producto.</p></div><button type="button" class="primary" data-product-edit="0">Nuevo producto</button></div><div class="admin-tools"><input id="adminProductSearch" value="${escapeHtml(state.adminSearch)}" placeholder="Buscar por nombre, SKU o categoría"><select id="adminProductCategory"><option value="">Todas las categorías</option><option>Visual</option><option>Táctil</option><option>Sonoro</option></select></div><div id="adminProductRows">${filteredProducts.map(product => `<div class="admin-row" data-admin-product-category="${escapeHtml(product.category)}"><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.sku)} · ${escapeHtml(product.category)} · ${product.active ? 'Activo' : 'Oculto'}</small></span><b>${money.format(+product.price)}</b><span class="badge">Stock ${product.stock}</span><button type="button" data-product-edit="${product.id}">Editar</button></div>`).join('') || '<p>Sin productos coincidentes.</p>'}</div></section>`;
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
      $('#exportOrders')?.addEventListener('click', () => {
        const rows = [['Pedido','Fecha','Cliente','Correo','Estado','Total'], ...orders.map(order => [order.order_number, order.created_at, order.customer_name, order.customer_email, order.status, order.total])];
        const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
        link.download = `pedidos-sensoria-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      });
      $('#adminProductSearch')?.addEventListener('input', event => {
        state.adminSearch = event.target.value;
        const category = $('#adminProductCategory')?.value || '';
        $$('[data-admin-product-category]').forEach(row => {
          row.hidden = !row.innerText.toLowerCase().includes(state.adminSearch.toLowerCase()) || (category && row.dataset.adminProductCategory !== category);
        });
      });
      $('#adminProductCategory')?.addEventListener('change', event => {
        const category = event.target.value;
        $$('[data-admin-product-category]').forEach(row => {
          row.hidden = (category && row.dataset.adminProductCategory !== category) || !row.innerText.toLowerCase().includes(state.adminSearch.toLowerCase());
        });
      });
      $$('[data-product-edit]').forEach(button => button.addEventListener('click', () => openProductAdmin(Number(button.dataset.productEdit))));
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

  function openProductAdmin(id) {
    const product = (state.admin?.products || []).find(item => +item.id === id) || { id: 0, name: '', category: 'Visual', description: '', long_description: '', price: 0, stock: 0, image: 'assets/products/' };
    openModal(`<section class="admin-form-modal"><p class="eyebrow">GESTIÓN DE CATÁLOGO</p><h2>${id ? 'Editar producto' : 'Nuevo producto'}</h2><form id="productAdminForm" class="form-grid"><label>Nombre<input name="name" maxlength="150" value="${escapeHtml(product.name)}" required></label><label>Categoría<select name="category"><option ${product.category === 'Visual' ? 'selected' : ''}>Visual</option><option ${product.category === 'Táctil' ? 'selected' : ''}>Táctil</option><option ${product.category === 'Sonoro' ? 'selected' : ''}>Sonoro</option></select></label><label>Precio final (IVA incluido)<input name="price" type="number" min="0" step="0.01" value="${Number(product.price).toFixed(2)}" required></label><label>Stock<input name="stock" type="number" min="0" step="1" value="${Number(product.stock)}" required></label><label class="wide">Descripción corta<input name="description" maxlength="240" value="${escapeHtml(product.description)}" required></label><label class="wide">Descripción completa<textarea name="long_description" maxlength="1200" required>${escapeHtml(product.long_description || product.description)}</textarea></label><label class="wide">Ruta de imagen<input name="image" value="${escapeHtml(product.image)}" required></label>${id ? `<label class="consent-check wide"><input type="checkbox" name="active" ${Number(product.active) ? 'checked' : ''}><span>Producto visible en la tienda</span></label>` : ''}<button class="primary wide" type="submit">Guardar producto</button></form></section>`);
    $('#productAdminForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const payload = Object.fromEntries(form.entries());
      payload.id = id;
      payload.csrf = state.csrfToken;
      try {
        await request('product_save', { method: 'POST', body: JSON.stringify(payload) });
        if (id) await request('product_toggle', { method: 'POST', body: JSON.stringify({ id, active: form.get('active') === 'on', csrf: state.csrfToken }) });
        closeModal();
        toast('Producto guardado correctamente');
        await loadAdmin();
        const data = await request('products');
        state.products = data.products || state.products;
        renderProducts();
      } catch (error) {
        toast(error.message || 'No se pudo guardar el producto');
      }
    });
  }

  function openModal(html) {
    state.lastFocus = document.activeElement;
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(() => $('.modal-close')?.focus());
  }

  function closeModal() {
    if ($('#modal').hidden) return;
    $('#modal').hidden = true;
    $('#modalBody').innerHTML = '';
    if ($('#cartDrawer').hidden) document.body.classList.remove('locked');
    state.lastFocus?.focus?.();
  }

  init();
})();

const runAdvisor = async () => {
  const input = document.getElementById('ai-query');
  const resultBox = document.getElementById('ai-result');
  const query = input?.value.trim();

  if (!query) {
    input?.focus();
    resultBox.hidden = false;
    resultBox.textContent = 'Cuéntanos brevemente qué necesitas para poder recomendarte un producto.';
    return;
  }

  resultBox.hidden = false;
  resultBox.textContent = 'Analizando el catálogo de Sensoria…';

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
};

document.getElementById('ai-btn')?.addEventListener('click', runAdvisor);
document.getElementById('ai-query')?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    runAdvisor();
  }
});
document.querySelectorAll('[data-ai-prompt]').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById('ai-query');
  input.value = button.dataset.aiPrompt;
  runAdvisor();
}));

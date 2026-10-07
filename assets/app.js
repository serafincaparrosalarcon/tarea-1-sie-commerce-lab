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
    const headers = {
      'Content-Type': 'application/json',
      ...(state.csrfToken ? { 'X-CSRF-Token': state.csrfToken } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
      credentials: 'same-origin',
      headers,
      ...options,
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
      renderProducts();
    } catch {
      state.products = fallbackProducts;
      renderProducts();
      toast('Catálogo de muestra: falta conectar MySQL');
    }
    bindStatic();
    syncRoleUI();
    updateCartBadge();
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
    log('cart.added', id);
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
    document.body.classList.remove('locked');
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
            <button data-remove="${l.product.id}" class="tiny">×</button>
          </article>
        `).join('')}
      </div>
      <div class="summary">${summaryHtml(t)}</div>
      <button id="checkoutBtn" class="primary full">Ir a pagar</button>
    ` : '<div class="empty panel"><span>⌑</span><h3>Tu carrito está vacío</h3></div>';

    $$('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
      const id = +btn.dataset.remove;
      delete state.cart[id];
      saveCart();
      renderCart();
      log('cart.removed', id);
    }));

    $('#checkoutBtn')?.addEventListener('click', renderCheckout);
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
      const data = await request('coupon', { method: 'GET' });
      state.couponPercent = data.valid ? data.discount_percent : 0;
      toast(data.valid ? `Cupón ${state.coupon} aplicado` : 'Cupón no válido');
      renderCart();
    } catch {
      toast('No se pudo comprobar el cupón');
    }
  }

  function renderCheckout() {
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
        <div class="summary">${summaryHtml(t)}</div>
        <div class="checkout-actions"><button type="submit" class="primary">Confirmar pedido</button></div>
      </form>
    `;
    $('#backCart').addEventListener('click', openCart);
    $('#checkoutForm').addEventListener('submit', placeOrder);
  }

  async function placeOrder(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const button = e.currentTarget.querySelector('button.primary');
    button.disabled = true;
    button.textContent = 'Procesando...';

    try {
      const payload = {
        name: String(f.get('name') || ''),
        email: String(f.get('email') || ''),
        phone: String(f.get('phone') || ''),
        address: String(f.get('address') || ''),
        city: String(f.get('city') || ''),
        postal_code: String(f.get('postal_code') || ''),
        items: Object.entries(state.cart).map(([id, quantity]) => ({ id: Number(id), quantity })),
        coupon: state.coupon,
        shipping: 'standard',
        session_id: state.sessionId,
        csrf: state.csrfToken,
      };

      const data = await request('checkout', { method: 'POST', body: JSON.stringify(payload) });
      state.cart = {};
      saveCart();
      renderSuccess(data.order, payload.name, data.notifications || []);
      log('order.created', null, { order_number: data.order.order_number, total: data.order.total });
    } catch (error) {
      toast(error.message || 'No se pudo confirmar el pedido');
    } finally {
      button.disabled = false;
      button.textContent = 'Confirmar pedido';
    }
  }

  function renderSuccess(order, customer, notifications) {
    const notice = channel => {
      const n = notifications.find(x => x.channel === channel);
      if (!n) return `${channel === 'EMAIL' ? '✉' : '▣'} Aviso no disponible`;
      return `${channel === 'EMAIL' ? '✉' : '▣'} ${n.delivery_status || 'SIMULADO'}${n.error_message ? ` · ${n.error_message}` : ''}`;
    };

    $('#cartBody').innerHTML = `
      <div class="success panel">
        <span>✓</span>
        <h3>Pedido confirmado</h3>
        <p>Gracias, ${escapeHtml(customer)}. Tu pedido <b>${escapeHtml(order.order_number)}</b> está registrado.</p>
        <ul>
          <li>${notice('EMAIL')}</li>
          <li>${notice('SMS')}</li>
        </ul>
      </div>
    `;
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
      state.csrfToken = '';
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
    } catch {
      root.innerHTML = '<div class="empty panel"><span>⚠</span><h3>No se pudieron cargarse tus pedidos</h3></div>';
    }
  }

  function orderCard(o) {
    const steps = ['PAGO_SIMULADO', 'PREPARACION', 'ENVIADO', 'ENTREGADO'];
    const idx = Math.max(0, steps.indexOf(o.status));
    return `<article class="order-card"><header><div><span>${escapeHtml(o.order_number)}</span><h3>${escapeHtml(o.customer_name)}</h3></div><b>${money.format(+o.total)}</b></header><div class="order-meta"><small>${escapeHtml(o.status)}</small><small>${escapeHtml(o.created_at)}</small></div><div class="progress">${steps.map((s, i) => `<span class="${i <= idx ? 'done' : ''}">${s}</span>`).join('')}</div></article>`;
  }

  function renderAdmin() {
    const root = $('#adminContent');
    if (!state.user || state.user.role !== 'admin') {
      root.innerHTML = '<div class="empty panel"><span>⌘</span><h3>Acceso de administración</h3><p>Necesitas permisos de administrador.</p></div>';
      return;
    }

    try {
      const data = state.admin || {};
      root.innerHTML = `
        <div class="admin-sidebar">
          <button data-tab="dashboard" class="${state.adminTab === 'dashboard' ? 'active' : ''}">Resumen</button>
          <button data-tab="catalog" class="${state.adminTab === 'catalog' ? 'active' : ''}">Catálogo</button>
          <button data-tab="crm" class="${state.adminTab === 'crm' ? 'active' : ''}">CRM</button>
          <button data-tab="communications" class="${state.adminTab === 'communications' ? 'active' : ''}">Comunicaciones</button>
        </div>
        <div class="admin-panel">${state.adminTab === 'dashboard' ? '<p>Cargando...</p>' : ''}</div>
      `;
      $$('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
        state.adminTab = btn.dataset.tab;
        renderAdmin();
      }));
      if (!state.admin) loadAdmin();
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
    document.body.classList.remove('locked');
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
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': document.cookie ? document.cookie.split('csrf=')[1]?.split(';')[0] || '' : '' },
      body: JSON.stringify({ query, csrf: document.cookie ? document.cookie.split('csrf=')[1]?.split(';')[0] || '' : '' })
    });
    const data = await res.json();
    if (data.recommendation) {
      resultBox.innerHTML = `<strong>Recomendación personalizada:</strong><br>${escapeHtml(data.recommendation).replace(/\n/g, '<br>')}`;
    } else {
      resultBox.textContent = data.error || 'No se pudo generar recomendación.';
    }
  } catch (e) {
    resultBox.textContent = 'Error de conexión con el servicio.';
  }
});

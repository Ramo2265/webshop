(function () {
  'use strict';

  const state = {
    user: null,
    products: [],
    cart: [], // { productId, name, price, image, quantity, stock }
  };

  const el = (id) => document.getElementById(id);
  const money = (n) => `${Number(n).toFixed(0)} ₺`;

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : undefined,
      ...options,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* bos govde */ }
    if (!res.ok) {
      const message = (data && data.error) || 'Bir hata oluştu.';
      throw new Error(message);
    }
    return data;
  }

  function toast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  function openModal(id) {
    el(id).classList.add('open');
    el(id.replace('Modal', 'Overlay')).classList.add('open');
  }
  function closeModal(id) {
    el(id).classList.remove('open');
    el(id.replace('Modal', 'Overlay')).classList.remove('open');
  }

  // ---------------- Auth ----------------
  async function loadUser() {
    state.user = await api('/api/auth/me');
    renderUserChip();
  }

  function renderUserChip() {
    const chip = el('userChip');
    chip.textContent = state.user ? state.user.name.split(' ')[0] : 'Giriş yap';
  }

  el('userChip').addEventListener('click', () => {
    if (state.user) {
      if (confirm('Çıkış yapmak istiyor musun?')) {
        api('/api/auth/logout', { method: 'POST' }).then(() => {
          state.user = null;
          renderUserChip();
          toast('Çıkış yapıldı');
          showTab('products');
        });
      }
    } else {
      openModal('loginModal');
    }
  });

  el('goRegister').addEventListener('click', () => { closeModal('loginModal'); openModal('registerModal'); });
  el('goLogin').addEventListener('click', () => { closeModal('registerModal'); openModal('loginModal'); });

  el('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = el('loginError');
    errBox.classList.remove('show');
    const fd = new FormData(e.target);
    try {
      state.user = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: fd.get('phone'), password: fd.get('password') }),
      });
      renderUserChip();
      closeModal('loginModal');
      e.target.reset();
      toast(`Hoş geldin, ${state.user.name.split(' ')[0]}`);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add('show');
    }
  });

  el('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = el('registerError');
    errBox.classList.remove('show');
    const fd = new FormData(e.target);
    try {
      state.user = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: fd.get('name'), phone: fd.get('phone'), password: fd.get('password') }),
      });
      renderUserChip();
      closeModal('registerModal');
      e.target.reset();
      toast(`Hoş geldin, ${state.user.name.split(' ')[0]}`);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add('show');
    }
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // ---------------- Products ----------------
  async function loadProducts() {
    state.products = await api('/api/products');
    renderProducts();
  }

  function renderProducts() {
    const grid = el('productGrid');
    if (state.products.length === 0) {
      grid.innerHTML = '<div class="empty-state"><span class="emoji">📦</span>Henüz ürün eklenmemiş</div>';
      return;
    }
    grid.innerHTML = state.products.map((p) => {
      const inCart = state.cart.find((c) => c.productId === p.id);
      const qty = inCart ? inCart.quantity : 0;
      const outOfStock = p.stock <= 0;
      const thumb = p.image
        ? `<div class="thumb" style="background-image:url('${p.image}')"></div>`
        : `<div class="thumb">fotoğraf yok</div>`;
      return `
        <div class="tag-card">
          <span class="punch"></span>
          ${thumb}
          <h3>${escapeHtml(p.name)}</h3>
          <div class="desc">${escapeHtml(p.description || '')}</div>
          <div class="price-row">
            <div>
              <div class="price">${money(p.price)}</div>
              <div class="stock-note ${outOfStock ? 'out' : ''}">${outOfStock ? 'Stokta yok' : `${p.stock} adet stokta`}</div>
            </div>
            ${outOfStock
              ? `<button class="btn btn-outline btn-sm" disabled>Tükendi</button>`
              : qty > 0
                ? `<div class="qty-stepper">
                     <button data-dec="${p.id}">−</button>
                     <span>${qty}</span>
                     <button data-inc="${p.id}">+</button>
                   </div>`
                : `<button class="btn btn-gold btn-sm" data-add="${p.id}">Sepete Ekle</button>`
            }
          </div>
        </div>`;
    }).join('');
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  el('productGrid').addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    if (add) addToCart(parseInt(add.dataset.add, 10));
    if (inc) changeQty(parseInt(inc.dataset.inc, 10), 1);
    if (dec) changeQty(parseInt(dec.dataset.dec, 10), -1);
  });

  // ---------------- Cart ----------------
  function addToCart(productId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;
    state.cart.push({ productId, name: product.name, price: product.price, image: product.image, quantity: 1, stock: product.stock });
    renderProducts();
    renderCart();
  }

  function changeQty(productId, delta) {
    const item = state.cart.find((c) => c.productId === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      state.cart = state.cart.filter((c) => c.productId !== productId);
    } else if (item.quantity > item.stock) {
      item.quantity = item.stock;
      toast('Stok limitine ulaştın');
    }
    renderProducts();
    renderCart();
  }

  function cartTotal() {
    return state.cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  }
  function cartCount() {
    return state.cart.reduce((sum, c) => sum + c.quantity, 0);
  }

  function renderCart() {
    const body = el('cartBody');
    const foot = el('cartFoot');
    const badge = el('cartBadge');
    const count = cartCount();

    badge.style.display = count > 0 ? 'flex' : 'none';
    badge.textContent = count;

    if (state.cart.length === 0) {
      body.innerHTML = '<div class="empty-state"><span class="emoji">🛍️</span>Sepetin boş</div>';
      foot.style.display = 'none';
      return;
    }

    foot.style.display = 'block';
    body.innerHTML = state.cart.map((c) => {
      const thumb = c.image
        ? `background-image:url('${c.image}')`
        : `background:var(--paper-2)`;
      return `
        <div class="cart-item">
          <div class="thumb-sm" style="${thumb}"></div>
          <div class="info">
            <h4>${escapeHtml(c.name)}</h4>
            <div class="row-between">
              <div class="qty-stepper">
                <button data-cdec="${c.productId}">−</button>
                <span>${c.quantity}</span>
                <button data-cinc="${c.productId}">+</button>
              </div>
              <strong>${money(c.price * c.quantity)}</strong>
            </div>
            <button class="remove-link" data-remove="${c.productId}">Kaldır</button>
          </div>
        </div>`;
    }).join('');
    el('cartTotal').textContent = money(cartTotal());
  }

  el('cartBody').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-cinc]');
    const dec = e.target.closest('[data-cdec]');
    const rm = e.target.closest('[data-remove]');
    if (inc) changeQty(parseInt(inc.dataset.cinc, 10), 1);
    if (dec) changeQty(parseInt(dec.dataset.cdec, 10), -1);
    if (rm) {
      state.cart = state.cart.filter((c) => c.productId !== parseInt(rm.dataset.remove, 10));
      renderProducts();
      renderCart();
    }
  });

  el('cartBtn').addEventListener('click', () => {
    el('cartDrawer').classList.add('open');
    el('cartOverlay').classList.add('open');
  });
  function closeCart() {
    el('cartDrawer').classList.remove('open');
    el('cartOverlay').classList.remove('open');
  }
  el('closeCart').addEventListener('click', closeCart);
  el('cartOverlay').addEventListener('click', closeCart);

  // ---------------- Checkout ----------------
  el('checkoutBtn').addEventListener('click', () => {
    if (!state.user) {
      toast('Sipariş vermek için önce giriş yap');
      closeCart();
      openModal('loginModal');
      return;
    }
    if (state.cart.length === 0) return;
    openModal('checkoutModal');
  });

  el('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = el('checkoutError');
    errBox.classList.remove('show');
    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';
    try {
      const items = state.cart.map((c) => ({ productId: c.productId, quantity: c.quantity }));
      await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ items, address: fd.get('address'), note: fd.get('note') }),
      });
      state.cart = [];
      renderCart();
      closeModal('checkoutModal');
      closeCart();
      e.target.reset();
      toast('Siparişin alındı! 🎉');
      await loadProducts();
      showTab('orders');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Siparişi Onayla';
    }
  });

  // ---------------- Orders (Siparişlerim) ----------------
  const STATUS_LABEL = {
    Yeni: 'Yeni', Hazirlaniyor: 'Hazırlanıyor', Kargoda: 'Kargoda', Tamamlandi: 'Tamamlandı', Iptal: 'İptal',
  };
  const STATUS_CLASS = {
    Yeni: 'st-yeni', Hazirlaniyor: 'st-hazirlaniyor', Kargoda: 'st-kargoda', Tamamlandi: 'st-tamamlandi', Iptal: 'st-iptal',
  };

  async function loadOrders() {
    if (!state.user) {
      el('ordersList').innerHTML = '<div class="empty-state"><span class="emoji">🔒</span>Siparişlerini görmek için giriş yap</div>';
      return;
    }
    el('ordersList').innerHTML = '<div class="loading-row">Yükleniyor...</div>';
    const orders = await api('/api/orders/mine');
    if (orders.length === 0) {
      el('ordersList').innerHTML = '<div class="empty-state"><span class="emoji">📦</span>Henüz siparişin yok</div>';
      return;
    }
    el('ordersList').innerHTML = orders.map((o) => {
      const itemsText = o.items.map((i) => `${i.quantity}x ${escapeHtml(i.product_name)}`).join(', ');
      const date = new Date(o.created_at.replace(' ', 'T') + 'Z').toLocaleString('tr-TR');
      return `
        <div class="order-card">
          <div class="row-between">
            <strong>Sipariş #${o.id}</strong>
            <span class="stamp ${STATUS_CLASS[o.status] || ''}">${STATUS_LABEL[o.status] || o.status}</span>
          </div>
          <div class="order-items">${itemsText}</div>
          <div class="row-between" style="margin-top:8px">
            <span class="order-date">${date}</span>
            <strong>${money(o.total)}</strong>
          </div>
        </div>`;
    }).join('');
  }

  // ---------------- Tabs ----------------
  function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    el('productsView').style.display = tab === 'products' ? 'block' : 'none';
    el('ordersView').style.display = tab === 'orders' ? 'block' : 'none';
    if (tab === 'orders') loadOrders();
  }
  document.querySelectorAll('.tab-btn').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------------- Init ----------------
  (async function init() {
    try {
      await Promise.all([loadUser(), loadProducts()]);
    } catch (err) {
      toast('Sunucuya bağlanılamadı');
    }
  })();
})();

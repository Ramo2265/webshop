(function () {
  'use strict';

  const state = {
    admin: null,
    orders: [],
    products: [],
    unseen: 0,
    socket: null,
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
    if (!res.ok) throw new Error((data && data.error) || 'Bir hata oluştu.');
    return data;
  }

  function toast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
  }

  function openModal(id) {
    el(id).classList.add('open');
    el(id.replace('Modal', 'ModalOverlay')).classList.add('open');
  }
  function closeModal(id) {
    el(id).classList.remove('open');
    el(id.replace('Modal', 'ModalOverlay')).classList.remove('open');
  }
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Basit bir "ding" sesi - disari dosya baglamadan Web Audio ile
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* ses calinamadi, sorun degil */ }
  }

  // ---------------- Giris / Cikis ----------------
  async function checkSession() {
    const me = await api('/api/admin/me');
    if (me) {
      state.admin = me;
      showDashboard();
    } else {
      el('loginWrap').style.display = 'flex';
      el('dashboard').style.display = 'none';
    }
  }

  el('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = el('adminLoginError');
    errBox.classList.remove('show');
    const fd = new FormData(e.target);
    try {
      state.admin = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
      });
      showDashboard();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add('show');
    }
  });

  el('adminLogoutBtn').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    if (state.socket) state.socket.disconnect();
    state.admin = null;
    el('loginWrap').style.display = 'flex';
    el('dashboard').style.display = 'none';
  });

  function showDashboard() {
    el('loginWrap').style.display = 'none';
    el('dashboard').style.display = 'block';
    loadOrders();
    loadProducts();
    connectSocket();
  }

  // ---------------- Canli bildirim (Socket.io) ----------------
  function connectSocket() {
    if (state.socket) return;
    state.socket = io();
    state.socket.on('newOrder', (order) => {
      state.orders.unshift(order);
      renderOrders(order.id);
      renderStats();
      state.unseen += 1;
      updateBadge();
      toast(`Yeni sipariş! ${order.customer_name} - ${money(order.total)}`);
      playBeep();
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('Yeni sipariş geldi 🎉', {
          body: `${order.customer_name} - ${money(order.total)}`,
        });
      }
    });
  }

  function updateBadge() {
    const badge = el('notifBadge');
    badge.style.display = state.unseen > 0 ? 'flex' : 'none';
    badge.textContent = state.unseen;
  }

  el('bellBtn').addEventListener('click', () => {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        toast(perm === 'granted' ? 'Bildirimler açıldı' : 'Bildirimlere izin verilmedi');
      });
    }
    state.unseen = 0;
    updateBadge();
  });

  // ---------------- Sekmeler ----------------
  document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.atab;
      el('ordersTab').style.display = tab === 'orders' ? 'block' : 'none';
      el('productsTab').style.display = tab === 'products' ? 'block' : 'none';
    });
  });

  // ---------------- Istatistikler ----------------
  function renderStats() {
    const total = state.orders.length;
    const yeni = state.orders.filter((o) => o.status === 'Yeni').length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = state.orders.filter((o) => (o.created_at || '').startsWith(todayStr)).length;
    const productCount = state.products.length;

    el('statRow').innerHTML = `
      <div class="stat-card"><div class="num">${total}</div><div class="label">Toplam Sipariş</div></div>
      <div class="stat-card"><div class="num">${yeni}</div><div class="label">Yeni Sipariş</div></div>
      <div class="stat-card"><div class="num">${today}</div><div class="label">Bugünkü Sipariş</div></div>
      <div class="stat-card"><div class="num">${productCount}</div><div class="label">Ürün Sayısı</div></div>
    `;
  }

  // ---------------- Siparisler ----------------
  const STATUS_LABEL = {
    Yeni: 'Yeni', Hazirlaniyor: 'Hazırlanıyor', Kargoda: 'Kargoda', Tamamlandi: 'Tamamlandı', Iptal: 'İptal',
  };

  async function loadOrders() {
    state.orders = await api('/api/admin/orders');
    renderOrders();
    renderStats();
  }

  function renderOrders(highlightId) {
    const container = el('ordersContainer');
    if (state.orders.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="emoji">📭</span>Henüz sipariş yok</div>';
      return;
    }
    container.innerHTML = state.orders.map((o) => {
      const itemsHtml = o.items.map((i) => `<li>${i.quantity}x ${escapeHtml(i.product_name)} — ${money(i.price * i.quantity)}</li>`).join('');
      const date = new Date(o.created_at.replace(' ', 'T') + 'Z').toLocaleString('tr-TR');
      const options = Object.keys(STATUS_LABEL).map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('');
      return `
        <div class="admin-order-card ${o.id === highlightId ? 'is-new' : ''}">
          <div class="row-between">
            <h4>Sipariş #${o.id} — ${money(o.total)}</h4>
            <select class="status-select" data-order="${o.id}">${options}</select>
          </div>
          <div class="cust">👤 ${escapeHtml(o.customer_name)} · 📞 ${escapeHtml(o.customer_phone)}</div>
          <ul class="items-list">${itemsHtml}</ul>
          <div class="addr">📍 ${escapeHtml(o.address)}${o.note ? ` · Not: ${escapeHtml(o.note)}` : ''}</div>
          <div class="order-date">${date}</div>
        </div>`;
    }).join('');
  }

  el('ordersContainer').addEventListener('change', async (e) => {
    const select = e.target.closest('.status-select');
    if (!select) return;
    const orderId = parseInt(select.dataset.order, 10);
    try {
      const updated = await api(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: select.value }),
      });
      const idx = state.orders.findIndex((o) => o.id === orderId);
      if (idx > -1) state.orders[idx].status = updated.status;
      renderStats();
      toast('Sipariş durumu güncellendi');
    } catch (err) {
      toast(err.message);
    }
  });

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : str;
    return d.innerHTML;
  }

  // ---------------- Urunler ----------------
  async function loadProducts() {
    state.products = await api('/api/admin/products');
    renderProductsTable();
    renderStats();
  }

  function renderProductsTable() {
    const body = el('productsTableBody');
    if (state.products.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="loading-row">Henüz ürün eklenmedi</td></tr>';
      return;
    }
    body.innerHTML = state.products.map((p) => `
      <tr class="${p.active ? '' : 'inactive-row'}">
        <td>${p.image ? `<img class="mini-thumb" src="${p.image}" />` : '<div class="mini-thumb"></div>'}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${money(p.price)}</td>
        <td>${p.stock}</td>
        <td>${p.active ? 'Aktif' : 'Gizli'}</td>
        <td class="row-actions">
          <button class="btn btn-outline btn-sm" data-edit="${p.id}">Düzenle</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">Sil</button>
        </td>
      </tr>`).join('');
  }

  el('productsTableBody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    if (editBtn) openProductModal(parseInt(editBtn.dataset.edit, 10));
    if (delBtn) deleteProduct(parseInt(delBtn.dataset.del, 10));
  });

  el('addProductBtn').addEventListener('click', () => openProductModal(null));

  function openProductModal(productId) {
    const form = el('productForm');
    form.reset();
    el('productError').classList.remove('show');
    el('imagePreview').style.backgroundImage = '';
    el('imagePreview').textContent = 'Fotoğraf seçmek için tıkla';

    if (productId) {
      const p = state.products.find((x) => x.id === productId);
      el('productModalTitle').textContent = 'Ürünü Düzenle';
      form.id.value = p.id;
      form.name.value = p.name;
      form.description.value = p.description || '';
      form.price.value = p.price;
      form.stock.value = p.stock;
      form.active.checked = !!p.active;
      el('activeField').style.display = 'block';
      if (p.image) {
        el('imagePreview').style.backgroundImage = `url('${p.image}')`;
        el('imagePreview').textContent = '';
      }
    } else {
      el('productModalTitle').textContent = 'Yeni Ürün';
      form.id.value = '';
      el('activeField').style.display = 'none';
    }
    openModal('productModal');
  }

  el('imagePreview').addEventListener('click', () => el('imageInput').click());
  el('imageInput').addEventListener('change', () => {
    const file = el('imageInput').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      el('imagePreview').style.backgroundImage = `url('${reader.result}')`;
      el('imagePreview').textContent = '';
    };
    reader.readAsDataURL(file);
  });

  el('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = el('productError');
    errBox.classList.remove('show');
    const form = e.target;
    const id = form.id.value;
    const fd = new FormData(form);
    if (!id) fd.delete('active'); // yeni urun her zaman aktif baslar
    else fd.set('active', form.active.checked ? 'true' : 'false');
    fd.delete('id');

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Kaydediliyor...';
    try {
      if (id) {
        await api(`/api/admin/products/${id}`, { method: 'PUT', body: fd });
      } else {
        await api('/api/admin/products', { method: 'POST', body: fd });
      }
      closeModal('productModal');
      toast('Ürün kaydedildi');
      await loadProducts();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kaydet';
    }
  });

  async function deleteProduct(id) {
    if (!confirm('Bu ürünü silmek istediğine emin misin?')) return;
    try {
      await api(`/api/admin/products/${id}`, { method: 'DELETE' });
      toast('Ürün silindi');
      await loadProducts();
    } catch (err) {
      toast(err.message);
    }
  }

  checkSession();
})();

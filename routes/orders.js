const express = require('express');
const store = require('../store');
const { requireCustomer } = require('../middleware');

const router = express.Router();

const byNewest = (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id;

router.post('/', requireCustomer, (req, res) => {
  const { items, address, note } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sepetin bos, en az bir urun ekle.' });
  }
  if (!address || !String(address).trim()) {
    return res.status(400).json({ error: 'Teslimat adresi gerekli.' });
  }

  const customer = store.data.customers.find((c) => c.id === req.session.customerId);
  if (!customer) return res.status(401).json({ error: 'Oturum gecersiz, tekrar giris yap.' });

  // Fiyat ve stok her zaman sunucudaki veriden alinir
  const resolved = [];
  let total = 0;
  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    const productId = parseInt(item.productId, 10);
    if (!productId || !qty || qty < 1) {
      return res.status(400).json({ error: 'Gecersiz sepet satiri.' });
    }
    const product = store.data.products.find((p) => p.id === productId && p.active);
    if (!product) {
      return res.status(400).json({ error: `Urun bulunamadi (id: ${item.productId}).` });
    }
    const already = resolved.filter((r) => r.product.id === productId).reduce((s, r) => s + r.qty, 0);
    if (product.stock < qty + already) {
      return res.status(400).json({ error: `"${product.name}" icin yeterli stok yok (kalan: ${product.stock}).` });
    }
    resolved.push({ product, qty });
    total += product.price * qty;
  }

  const order = {
    id: store.nextId('orders'),
    customer_id: customer.id,
    customer_name: customer.name,
    customer_phone: customer.phone,
    address: String(address).trim(),
    note: note ? String(note).trim() : '',
    total,
    status: 'Yeni',
    created_at: store.nowISO(),
  };
  store.data.orders.push(order);

  const orderItems = [];
  for (const { product, qty } of resolved) {
    const oi = {
      id: store.nextId('orderItems'),
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: qty,
    };
    store.data.orderItems.push(oi);
    orderItems.push(oi);
    product.stock -= qty;
  }
  store.save();

  const payload = { ...order, items: orderItems };
  const io = req.app.get('io');
  if (io) io.to('admin-room').emit('newOrder', payload);

  res.status(201).json(payload);
});

router.get('/mine', requireCustomer, (req, res) => {
  const orders = store.data.orders
    .filter((o) => o.customer_id === req.session.customerId)
    .sort(byNewest)
    .map((o) => ({ ...o, items: store.data.orderItems.filter((i) => i.order_id === o.id) }));
  res.json(orders);
});

module.exports = router;

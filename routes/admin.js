const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../store');
const { requireAdmin } = require('../middleware');
const upload = require('../upload');

const router = express.Router();

const byNewest = (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id;

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanici adi ve sifre gerekli.' });
  }
  const admin = store.data.admins.find((a) => a.username === String(username).trim());
  if (!admin || !bcrypt.compareSync(String(password), admin.password)) {
    return res.status(401).json({ error: 'Kullanici adi veya sifre hatali.' });
  }
  req.session.isAdmin = true;
  req.session.adminUsername = admin.username;
  res.json({ username: admin.username });
});

router.post('/logout', (req, res) => {
  delete req.session.isAdmin;
  delete req.session.adminUsername;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.isAdmin) return res.json(null);
  res.json({ username: req.session.adminUsername });
});

router.get('/products', requireAdmin, (req, res) => {
  res.json([...store.data.products].sort(byNewest));
});

router.post('/products', requireAdmin, upload.single('image'), (req, res) => {
  const { name, description, price, stock } = req.body;
  if (!name || price === undefined || price === '') {
    return res.status(400).json({ error: 'Urun adi ve fiyat zorunlu.' });
  }
  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'Gecerli bir fiyat gir.' });
  }
  const product = {
    id: store.nextId('products'),
    name: String(name).trim(),
    description: description ? String(description).trim() : '',
    price: priceNum,
    image: req.file ? `/uploads/${req.file.filename}` : '',
    stock: parseInt(stock, 10) || 0,
    active: 1,
    created_at: store.nowISO(),
  };
  store.data.products.push(product);
  store.save();
  res.status(201).json(product);
});

router.put('/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const product = store.data.products.find((p) => p.id === parseInt(req.params.id, 10));
  if (!product) return res.status(404).json({ error: 'Urun bulunamadi.' });

  const { name, description, price, stock, active } = req.body;
  if (name !== undefined) product.name = String(name).trim();
  if (description !== undefined) product.description = String(description).trim();
  if (price !== undefined) {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Gecerli bir fiyat gir.' });
    product.price = p;
  }
  if (stock !== undefined) product.stock = parseInt(stock, 10) || 0;
  if (req.file) product.image = `/uploads/${req.file.filename}`;
  if (active !== undefined) product.active = active === 'true' || active === true ? 1 : 0;

  store.save();
  res.json(product);
});

router.delete('/products/:id', requireAdmin, (req, res) => {
  const idx = store.data.products.findIndex((p) => p.id === parseInt(req.params.id, 10));
  if (idx === -1) return res.status(404).json({ error: 'Urun bulunamadi.' });
  store.data.products.splice(idx, 1);
  store.save();
  res.json({ ok: true });
});

router.get('/orders', requireAdmin, (req, res) => {
  const orders = [...store.data.orders]
    .sort(byNewest)
    .map((o) => ({ ...o, items: store.data.orderItems.filter((i) => i.order_id === o.id) }));
  res.json(orders);
});

const ALLOWED_STATUSES = ['Yeni', 'Hazirlaniyor', 'Kargoda', 'Tamamlandi', 'Iptal'];

router.patch('/orders/:id', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Gecersiz durum.' });
  }
  const order = store.data.orders.find((o) => o.id === parseInt(req.params.id, 10));
  if (!order) return res.status(404).json({ error: 'Siparis bulunamadi.' });
  order.status = status;
  store.save();
  res.json(order);
});

module.exports = router;

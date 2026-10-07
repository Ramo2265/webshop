const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../store');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Isim, telefon ve sifre zorunlu.' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: 'Sifre en az 4 karakter olmali.' });
  }
  const cleanPhone = String(phone).trim();
  if (store.data.customers.find((c) => c.phone === cleanPhone)) {
    return res.status(409).json({ error: 'Bu telefon numarasi zaten kayitli. Giris yapmayi dene.' });
  }
  const customer = {
    id: store.nextId('customers'),
    name: String(name).trim(),
    phone: cleanPhone,
    password: bcrypt.hashSync(String(password), 10),
    created_at: store.nowISO(),
  };
  store.data.customers.push(customer);
  store.save();

  req.session.customerId = customer.id;
  req.session.customerName = customer.name;
  res.json({ id: customer.id, name: customer.name, phone: customer.phone });
});

router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Telefon ve sifre gerekli.' });
  }
  const customer = store.data.customers.find((c) => c.phone === String(phone).trim());
  if (!customer || !bcrypt.compareSync(String(password), customer.password)) {
    return res.status(401).json({ error: 'Telefon veya sifre hatali.' });
  }
  req.session.customerId = customer.id;
  req.session.customerName = customer.name;
  res.json({ id: customer.id, name: customer.name, phone: customer.phone });
});

router.post('/logout', (req, res) => {
  delete req.session.customerId;
  delete req.session.customerName;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.customerId) return res.json(null);
  const customer = store.data.customers.find((c) => c.id === req.session.customerId);
  if (!customer) return res.json(null);
  res.json({ id: customer.id, name: customer.name, phone: customer.phone });
});

module.exports = router;

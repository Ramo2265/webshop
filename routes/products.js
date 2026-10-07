const express = require('express');
const store = require('../store');

const router = express.Router();

const byNewest = (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id;

router.get('/', (req, res) => {
  const products = store.data.products
    .filter((p) => p.active)
    .sort(byNewest)
    .map(({ id, name, description, price, image, stock }) => ({ id, name, description, price, image, stock }));
  res.json(products);
});

router.get('/:id', (req, res) => {
  const p = store.data.products.find((x) => x.id === parseInt(req.params.id, 10) && x.active);
  if (!p) return res.status(404).json({ error: 'Urun bulunamadi.' });
  res.json({ id: p.id, name: p.name, description: p.description, price: p.price, image: p.image, stock: p.stock });
});

module.exports = router;

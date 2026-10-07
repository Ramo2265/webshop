const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, 'shop-data.json');

function nowISO() {
  // 'YYYY-MM-DD HH:MM:SS' (UTC)
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

let data;

function nextId(table) {
  return data.seq[table]++;
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function seed() {
  const username = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin123';
  data.admins.push({ id: nextId('admins'), username, password: bcrypt.hashSync(pass, 10) });
  console.log(`[kurulum] Admin hesabi olusturuldu -> kullanici adi: "${username}"`);

  data.products.push({
    id: nextId('products'), name: 'Ornek Urun 1',
    description: 'Bu urunu admin panelinden silip kendi urunlerini ekleyebilirsin.',
    price: 150, image: '', stock: 10, active: 1, created_at: nowISO(),
  });
  data.products.push({
    id: nextId('products'), name: 'Ornek Urun 2',
    description: 'Fotografini admin panelinden yukleyebilirsin.',
    price: 250, image: '', stock: 5, active: 1, created_at: nowISO(),
  });
  console.log('[kurulum] Ornek urunler eklendi (admin panelinden duzenleyebilir/silebilirsin).');
}

function load() {
  if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return;
  }
  data = {
    customers: [], admins: [], products: [], orders: [], orderItems: [],
    seq: { customers: 1, admins: 1, products: 1, orders: 1, orderItems: 1 },
  };
  seed();
  save();
}

load();

module.exports = {
  get data() { return data; },
  save,
  nextId,
  nowISO,
};

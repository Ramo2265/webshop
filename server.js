require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'gelistirme-icin-gizli-anahtar';

// ---- Ortak middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gun
    secure: false, // yerel ag / http icin false kalmali
  },
});
app.use(sessionMiddleware);

// Statik dosyalar (musteri sitesi, admin paneli, yuklenen urun resimleri)
app.use(express.static(path.join(__dirname, 'public')));

// ---- API rotalari ----
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// ---- Socket.io: admin paneline canli siparis bildirimi ----
// Express session'i socket.io ile paylas, boylece sadece giris yapmis
// admin'ler bildirim odasina katilabilir.
io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
  const sess = socket.request.session;
  if (sess && sess.isAdmin) {
    socket.join('admin-room');
  }
});

app.set('io', io);

// Hata yakalama (ornegin resim yukleme limiti asilirsa)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Sunucu hatasi.' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✔ Magaza sunucusu calisiyor.`);
  console.log(`  Bu bilgisayardan:  http://localhost:${PORT}`);
  console.log(`  Admin paneli:      http://localhost:${PORT}/admin`);
  console.log(`  Ayni WiFi'daki telefondan girmek icin bilgisayarinin yerel IP adresini kullan.\n`);
});

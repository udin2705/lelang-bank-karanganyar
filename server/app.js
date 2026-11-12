const path = require('path');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');

const app = express();
const PORT = process.env.PORT || 3000;

// Mendukung reverse proxy (cPanel / Phusion Passenger / Nginx / Cloudflare)
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'bank-karanganyar-portal-aset-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8 // 8 jam
    }
  })
);

// Static files (frontend public + hasil upload gambar)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);

// Fallback halaman utama untuk route non-API (SPA-like, opsional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Endpoint tidak ditemukan.' });
});

app.listen(PORT, () => {
  console.log(`Portal Aset BPR Bank Karanganyar berjalan di http://localhost:${PORT}`);
});

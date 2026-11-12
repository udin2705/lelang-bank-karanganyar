const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');

const db = require('./db/database');
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper escape HTML untuk meta tag Open Graph
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatRupiahServer(angka) {
  const n = Number(angka) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

// Mendukung reverse proxy (cPanel / Phusion Passenger / Nginx / Cloudflare)
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

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

// Redirect otomatis jika admin sudah login dan mengakses halaman login /admin
app.get(['/admin', '/admin/', '/admin/login.html'], (req, res, next) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard.html');
  }
  if (req.path === '/admin' || req.path === '/admin/') {
    return res.redirect('/admin/login.html');
  }
  next();
});

// Proteksi halaman dashboard.html di sisi server jika belum login
app.get('/admin/dashboard.html', (req, res, next) => {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/admin/login.html');
  }
  next();
});

// Dynamic Open Graph Meta Tags untuk halaman detail aset (pratinjau WhatsApp / Facebook)
app.get('/detail.html', (req, res, next) => {
  const assetId = req.query.id;
  const detailPath = path.join(__dirname, '..', 'public', 'detail.html');

  fs.readFile(detailPath, 'utf8', (err, html) => {
    if (err) return next(err);
    if (!assetId) return res.send(html);

    try {
      const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
      if (!asset) return res.send(html);

      const firstImg = db
        .prepare('SELECT filename FROM asset_images WHERE asset_id = ? ORDER BY urutan ASC, id ASC LIMIT 1')
        .get(asset.id);

      const proto = req.headers['x-forwarded-proto']
        ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
        : req.protocol;
      const baseUrl = `${proto}://${req.get('host')}`;
      const pageUrl = `${baseUrl}/detail.html?id=${encodeURIComponent(asset.id)}`;
      const imageUrl = firstImg
        ? `${baseUrl}/uploads/${encodeURIComponent(firstImg.filename)}`
        : `${baseUrl}/img/logo.png`;
      let imgMime = 'image/jpeg';
      if (firstImg) {
        try {
          const imgPath = path.join(__dirname, '..', 'public', 'uploads', firstImg.filename);
          const fd = fs.openSync(imgPath, 'r');
          const buf = Buffer.alloc(4);
          fs.readSync(fd, buf, 0, 4, 0);
          fs.closeSync(fd);
          if (buf[0] === 0x89 && buf[1] === 0x50) imgMime = 'image/png';
          else if (buf[0] === 0xff && buf[1] === 0xd8) imgMime = 'image/jpeg';
        } catch (e) { /* default image/jpeg */ }
      }

      const tipeLabel = asset.tipe_penjualan === 'lelang' ? 'Lelang' : 'Pra-Lelang';
      const hargaFormatted = formatRupiahServer(asset.harga);
      const ogTitle = `${asset.judul} - ${hargaFormatted}`;

      const lokasiParts = [asset.kecamatan, asset.kabupaten_kota, asset.provinsi].filter(Boolean).join(', ');
      const rawDesc = (asset.deskripsi || '').replace(/\s+/g, ' ').trim();
      const descParts = [
        `[${tipeLabel}] ${hargaFormatted}`,
        lokasiParts ? `Lokasi: ${lokasiParts}` : '',
        rawDesc || 'Aset Jaminan PT. BPR Bank Karanganyar (Perseroda)'
      ].filter(Boolean);
      const ogDescription = descParts.join(' • ').slice(0, 220);

      const ogTags = [
        `<title>${escapeHtml(ogTitle)} | BPR Bank Karanganyar</title>`,
        `<meta name="description" content="${escapeHtml(ogDescription)}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="Portal Aset PT. BPR Bank Karanganyar (Perseroda)">`,
        `<meta property="og:title" content="${escapeHtml(ogTitle)}">`,
        `<meta property="og:description" content="${escapeHtml(ogDescription)}">`,
        `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
        `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">`,
        `<meta property="og:image:type" content="${imgMime}">`,
        `<meta property="og:image:width" content="1200">`,
        `<meta property="og:image:height" content="630">`,
        `<meta property="og:image:alt" content="${escapeHtml(ogTitle)}">`,
        `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
        `<meta itemprop="name" content="${escapeHtml(ogTitle)}">`,
        `<meta itemprop="description" content="${escapeHtml(ogDescription)}">`,
        `<meta itemprop="image" content="${escapeHtml(imageUrl)}">`,
        `<link rel="image_src" href="${escapeHtml(imageUrl)}">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${escapeHtml(ogTitle)}">`,
        `<meta name="twitter:description" content="${escapeHtml(ogDescription)}">`,
        `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`
      ].join('\n');

      const updatedHtml = html.replace(/<!--\s*OG_META_START\s*-->[\s\S]*?<!--\s*OG_META_END\s*-->/, ogTags);
      res.set('Content-Type', 'text/html; charset=UTF-8');
      return res.send(updatedHtml);
    } catch (e) {
      return res.send(html);
    }
  });
});

// Pastikan header Content-Type gambar di /uploads sesuai isi byte file (untuk WhatsApp crawler)
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(__dirname, '..', 'public', 'uploads', path.basename(req.path));
  try {
    if (fs.existsSync(filePath)) {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(4);
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      if (buf[0] === 0xff && buf[1] === 0xd8) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (buf[0] === 0x89 && buf[1] === 0x50) {
        res.setHeader('Content-Type', 'image/png');
      }
    }
  } catch (e) { /* lanjutkan */ }
  next();
});

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

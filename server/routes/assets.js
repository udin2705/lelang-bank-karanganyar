const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const WILAYAH_INDONESIA = require('../data/wilayah');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

function fileFilter(req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.'));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

function attachImages(asset) {
  const images = db
    .prepare('SELECT id, filename, urutan FROM asset_images WHERE asset_id = ? ORDER BY urutan ASC, id ASC')
    .all(asset.id);
  asset.images = images.map((img) => `/uploads/${img.filename}`);
  asset.imageIds = images.map((img) => img.id);
  return asset;
}

// =================== PUBLIC ENDPOINTS ===================

// GET /api/assets - daftar aset publik (dengan filter & search)
router.get('/', (req, res) => {
  const { kategori, status, q, provinsi, kabupaten_kota, kecamatan, tipe_penjualan, sort } = req.query;

  let sql = 'SELECT * FROM assets WHERE 1=1';
  const params = [];

  if (tipe_penjualan) {
    if (tipe_penjualan === 'pra_lelang' || tipe_penjualan === 'non_lelang') {
      sql += " AND (tipe_penjualan = 'pra_lelang' OR tipe_penjualan = 'non_lelang')";
    } else {
      sql += ' AND tipe_penjualan = ?';
      params.push(tipe_penjualan);
    }
  }
  if (kategori) {
    sql += ' AND kategori = ?';
    params.push(kategori);
  }
  if (status) {
    if (status !== 'semua') {
      sql += ' AND status = ?';
      params.push(status);
    }
  } else {
    sql += " AND status != 'terjual'";
  }
  if (provinsi) {
    sql += ' AND provinsi = ?';
    params.push(provinsi);
  }
  if (kabupaten_kota) {
    sql += ' AND (kabupaten_kota = ? OR kabupaten_kota LIKE ?)';
    params.push(kabupaten_kota, `%${kabupaten_kota.replace(/^(Kabupaten|Kota)\s+/i, '')}%`);
  }
  if (kecamatan) {
    sql += ' AND (kecamatan = ? OR kecamatan LIKE ?)';
    params.push(kecamatan, `%${kecamatan.replace(/^Kecamatan\s+/i, '')}%`);
  }
  if (q) {
    sql += ' AND (judul LIKE ? OR alamat LIKE ? OR kecamatan LIKE ? OR kabupaten_kota LIKE ? OR kode_aset LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  if (sort === 'harga_asc') sql += ' ORDER BY harga ASC';
  else if (sort === 'harga_desc') sql += ' ORDER BY harga DESC';
  else sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  const result = rows.map(attachImages);
  res.json({ ok: true, data: result });
});

// GET /api/assets/meta/wilayah - daftar lengkap provinsi & kabupaten/kota (untuk dropdown otomatis)
router.get('/meta/wilayah', (req, res) => {
  res.json({ ok: true, data: WILAYAH_INDONESIA });
});

// GET /api/assets/meta/provinsi - daftar provinsi unik (untuk kompatibilitas), harus di atas route /:id
router.get('/meta/provinsi', (req, res) => {
  const rows = db
    .prepare("SELECT DISTINCT provinsi FROM assets WHERE provinsi IS NOT NULL AND provinsi != '' ORDER BY provinsi ASC")
    .all();
  res.json({ ok: true, data: rows.map((r) => r.provinsi) });
});

const ALLOWED_FIELDS = [
  'kode_aset', 'kategori', 'tipe_penjualan', 'tanggal_lelang', 'link_lelang', 'uang_jaminan',
  'judul', 'deskripsi', 'harga',
  'provinsi', 'kabupaten_kota', 'kecamatan', 'alamat', 'luas_tanah', 'luas_bangunan', 'sertifikat',
  'merk', 'model', 'tahun', 'no_polisi', 'warna', 'spesifikasi', 'fasilitas',
  'kantor_cabang', 'no_whatsapp', 'status'
];

function pickAllowed(body) {
  const data = {};
  for (const field of ALLOWED_FIELDS) {
    data[field] = body[field] !== undefined && body[field] !== '' ? body[field] : null;
  }
  return data;
}

// GET /api/assets/admin/all - semua aset termasuk terjual (untuk dashboard admin), harus di atas /:id
router.get('/admin/all', requireLogin, (req, res) => {
  const rows = db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all();
  res.json({ ok: true, data: rows.map(attachImages) });
});

// GET /api/assets/:id - detail aset publik (+ increment dilihat)
router.get('/:id', (req, res) => {
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) return res.status(404).json({ ok: false, message: 'Aset tidak ditemukan.' });

  db.prepare('UPDATE assets SET dilihat = dilihat + 1 WHERE id = ?').run(asset.id);
  asset.dilihat += 1;

  res.json({ ok: true, data: attachImages(asset) });
});

// =================== ADMIN ENDPOINTS (butuh login) ===================

// POST /api/assets - tambah aset baru
router.post('/', requireLogin, (req, res) => {
  const data = pickAllowed(req.body);

  if (!data.kode_aset || !data.kategori || !data.judul || !req.body.harga || !data.no_whatsapp) {
    return res.status(400).json({ ok: false, message: 'Kode aset, kategori, judul, harga, dan nomor WhatsApp wajib diisi.' });
  }
  data.harga = Number(String(req.body.harga).replace(/\./g, '')) || 0;
  data.uang_jaminan = data.uang_jaminan !== null ? (Number(String(data.uang_jaminan).replace(/\./g, '')) || null) : null;
  data.tipe_penjualan = data.tipe_penjualan || 'pra_lelang';
  data.status = data.status || 'tersedia';
  data.kantor_cabang = 'BPR Bank Karanganyar';
  if (data.tipe_penjualan !== 'lelang') {
    data.tanggal_lelang = null;
    data.link_lelang = null;
    data.uang_jaminan = null;
  }
  if (data.kategori === 'kendaraan') {
    data.fasilitas = null;
  }

  const rawPubDate = req.body.tanggal_publikasi ? String(req.body.tanggal_publikasi).trim() : '';
  data.created_at = /^\d{4}-\d{2}-\d{2}$/.test(rawPubDate)
    ? `${rawPubDate} 08:00:00`
    : new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const stmt = db.prepare(`
      INSERT INTO assets (
        kode_aset, kategori, tipe_penjualan, tanggal_lelang, link_lelang, uang_jaminan,
        judul, deskripsi, harga,
        provinsi, kabupaten_kota, kecamatan, alamat, luas_tanah, luas_bangunan, sertifikat,
        merk, model, tahun, no_polisi, warna, spesifikasi, fasilitas,
        kantor_cabang, no_whatsapp, status, created_at
      ) VALUES (@kode_aset, @kategori, @tipe_penjualan, @tanggal_lelang, @link_lelang, @uang_jaminan,
        @judul, @deskripsi, @harga,
        @provinsi, @kabupaten_kota, @kecamatan, @alamat, @luas_tanah, @luas_bangunan, @sertifikat,
        @merk, @model, @tahun, @no_polisi, @warna, @spesifikasi, @fasilitas,
        @kantor_cabang, @no_whatsapp, @status, @created_at)
    `);
    const info = stmt.run(data);
    const created = db.prepare('SELECT * FROM assets WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ok: true, data: attachImages(created) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ ok: false, message: 'Kode aset sudah digunakan.' });
    }
    res.status(500).json({ ok: false, message: 'Gagal menyimpan aset.', error: err.message });
  }
});

// PUT /api/assets/:id - edit aset
router.put('/:id', requireLogin, (req, res) => {
  const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, message: 'Aset tidak ditemukan.' });

  const data = pickAllowed(req.body);
  if (!data.no_whatsapp) {
    return res.status(400).json({ ok: false, message: 'Nomor WhatsApp wajib diisi.' });
  }
  data.harga = req.body.harga !== undefined ? (Number(String(req.body.harga).replace(/\./g, '')) || 0) : existing.harga;
  data.uang_jaminan = data.uang_jaminan !== null ? (Number(String(data.uang_jaminan).replace(/\./g, '')) || null) : null;
  data.tipe_penjualan = data.tipe_penjualan || 'pra_lelang';
  data.status = data.status || 'tersedia';
  data.kantor_cabang = 'BPR Bank Karanganyar';
  if (data.tipe_penjualan !== 'lelang') {
    data.tanggal_lelang = null;
    data.link_lelang = null;
    data.uang_jaminan = null;
  }
  if (data.kategori === 'kendaraan') {
    data.fasilitas = null;
  }

  const rawPubDate = req.body.tanggal_publikasi ? String(req.body.tanggal_publikasi).trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawPubDate)) {
    const existingDatePart = existing.created_at ? String(existing.created_at).slice(0, 10) : '';
    const existingTimePart = existing.created_at && String(existing.created_at).length >= 19
      ? String(existing.created_at).slice(11, 19)
      : '08:00:00';
    data.created_at = existingDatePart === rawPubDate
      ? existing.created_at
      : `${rawPubDate} ${existingTimePart}`;
  } else {
    data.created_at = existing.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  data.id = req.params.id;

  try {
    db.prepare(`
      UPDATE assets SET
        kode_aset = @kode_aset, kategori = @kategori, tipe_penjualan = @tipe_penjualan,
        tanggal_lelang = @tanggal_lelang, link_lelang = @link_lelang, uang_jaminan = @uang_jaminan,
        judul = @judul, deskripsi = @deskripsi, harga = @harga,
        provinsi = @provinsi, kabupaten_kota = @kabupaten_kota, kecamatan = @kecamatan, alamat = @alamat,
        luas_tanah = @luas_tanah, luas_bangunan = @luas_bangunan, sertifikat = @sertifikat,
        merk = @merk, model = @model, tahun = @tahun, no_polisi = @no_polisi, warna = @warna,
        spesifikasi = @spesifikasi, fasilitas = @fasilitas,
        kantor_cabang = @kantor_cabang, no_whatsapp = @no_whatsapp,
        status = @status, created_at = @created_at, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run(data);

    const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    res.json({ ok: true, data: attachImages(updated) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ ok: false, message: 'Kode aset sudah digunakan.' });
    }
    res.status(500).json({ ok: false, message: 'Gagal memperbarui aset.', error: err.message });
  }
});

// DELETE /api/assets/:id - hapus aset beserta file gambarnya
router.delete('/:id', requireLogin, (req, res) => {
  const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, message: 'Aset tidak ditemukan.' });

  const images = db.prepare('SELECT filename FROM asset_images WHERE asset_id = ?').all(req.params.id);
  images.forEach((img) => {
    const filePath = path.join(uploadDir, img.filename);
    fs.unlink(filePath, () => {});
  });

  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.json({ ok: true, message: 'Aset berhasil dihapus.' });
});

// POST /api/assets/:id/images - upload satu atau beberapa gambar untuk aset
router.post('/:id/images', requireLogin, upload.array('images', 10), (req, res) => {
  const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, message: 'Aset tidak ditemukan.' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ ok: false, message: 'Tidak ada file yang diupload.' });
  }

  const maxUrutan = db
    .prepare('SELECT COALESCE(MAX(urutan), -1) AS m FROM asset_images WHERE asset_id = ?')
    .get(req.params.id).m;

  const insert = db.prepare('INSERT INTO asset_images (asset_id, filename, urutan) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  try {
    req.files.forEach((file, idx) => {
      insert.run(req.params.id, file.filename, maxUrutan + 1 + idx);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ ok: false, message: 'Gagal menyimpan gambar.', error: err.message });
  }


  const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  res.json({ ok: true, data: attachImages(updated) });
});

// DELETE /api/assets/:id/images/:imageId - hapus satu gambar aset
router.delete('/:id/images/:imageId', requireLogin, (req, res) => {
  const image = db
    .prepare('SELECT * FROM asset_images WHERE id = ? AND asset_id = ?')
    .get(req.params.imageId, req.params.id);

  if (!image) return res.status(404).json({ ok: false, message: 'Gambar tidak ditemukan.' });

  const filePath = path.join(uploadDir, image.filename);
  fs.unlink(filePath, () => {});
  db.prepare('DELETE FROM asset_images WHERE id = ?').run(image.id);

  const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  res.json({ ok: true, data: attachImages(updated) });
});

module.exports = router;






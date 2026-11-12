const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, 'marketplace.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode_aset TEXT UNIQUE NOT NULL,
  kategori TEXT NOT NULL,              -- 'tanah_bangunan' | 'kendaraan'
  tipe_penjualan TEXT NOT NULL DEFAULT 'pra_lelang', -- 'pra_lelang' | 'lelang'
  tanggal_lelang TEXT,                 -- format 'YYYY-MM-DD' jika tipe_penjualan = 'lelang'
  link_lelang TEXT,                    -- tautan lelang.go.id jika tipe_penjualan = 'lelang'
  uang_jaminan REAL,                   -- nilai uang jaminan jika tipe_penjualan = 'lelang'
  judul TEXT NOT NULL,
  deskripsi TEXT,
  harga REAL NOT NULL,                 -- Harga Penawaran jika pra_lelang, Nilai Limit jika lelang
  provinsi TEXT,
  kabupaten_kota TEXT,
  kecamatan TEXT,
  alamat TEXT,
  luas_tanah REAL,
  luas_bangunan REAL,
  sertifikat TEXT,
  merk TEXT,
  model TEXT,
  tahun INTEGER,
  no_polisi TEXT,
  warna TEXT,
  spesifikasi TEXT,
  fasilitas TEXT,
  kantor_cabang TEXT DEFAULT 'BPR Bank Karanganyar',
  no_whatsapp TEXT,
  status TEXT NOT NULL DEFAULT 'tersedia', -- 'tersedia' | 'terjual'
  dilihat INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Migrasi aman bila database lama sudah terbuat sebelumnya
try {
  const cols = db.prepare("PRAGMA table_info(assets)").all().map((c) => c.name);
  if (!cols.includes('tanggal_lelang')) {
    db.exec("ALTER TABLE assets ADD COLUMN tanggal_lelang TEXT;");
  }
  if (!cols.includes('link_lelang')) {
    db.exec("ALTER TABLE assets ADD COLUMN link_lelang TEXT;");
  }
  if (!cols.includes('no_whatsapp')) {
    db.exec("ALTER TABLE assets ADD COLUMN no_whatsapp TEXT;");
  }
  if (!cols.includes('kecamatan')) {
    db.exec("ALTER TABLE assets ADD COLUMN kecamatan TEXT;");
  }
  if (!cols.includes('uang_jaminan')) {
    db.exec("ALTER TABLE assets ADD COLUMN uang_jaminan REAL;");
  }
  // Migrasi data lama dari 'non_lelang' ke 'pra_lelang' dan 'proses' ke 'tersedia'
  db.exec("UPDATE assets SET tipe_penjualan = 'pra_lelang' WHERE tipe_penjualan = 'non_lelang';");
  db.exec("UPDATE assets SET status = 'tersedia' WHERE status = 'proses';");
  db.exec("UPDATE assets SET kantor_cabang = 'BPR Bank Karanganyar';");
} catch (e) {
  console.warn('Migrasi kolom assets:', e.message);
}

db.exec(`
CREATE TABLE IF NOT EXISTS asset_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
`);

// Auto-seed akun admin default jika tabel admins masih kosong (memudahkan deploy pertama kali di cPanel)
try {
  const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
  if (adminCount === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO admins (username, password_hash, nama) VALUES (?, ?, ?)'
    ).run('admin', hash, 'Administrator BPR Bank Karanganyar');
    console.log('Admin default otomatis dibuat -> username: admin, password: admin123');
  }
} catch (e) {
  console.warn('Auto-seed admin warning:', e.message);
}

module.exports = db;

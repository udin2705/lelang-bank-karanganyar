// Seed data awal: admin default + beberapa contoh aset
const bcrypt = require('bcryptjs');
const db = require('./database');

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO admins (username, password_hash, nama) VALUES (?, ?, ?)'
    ).run('admin', hash, 'Administrator BPR Bank Karanganyar');
    console.log('Admin default dibuat -> username: admin, password: admin123');
  } else {
    console.log('Admin default sudah ada, dilewati.');
  }
}

function seedAssets() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM assets').get().c;
  if (count > 0) {
    console.log('Data aset sudah ada, seed contoh dilewati.');
    return;
  }

  const insertAsset = db.prepare(`
    INSERT INTO assets (
      kode_aset, kategori, tipe_penjualan, tanggal_lelang, link_lelang,
      judul, deskripsi, harga,
      provinsi, kabupaten_kota, alamat, luas_tanah, luas_bangunan, sertifikat,
      merk, model, tahun, no_polisi, warna, spesifikasi, fasilitas,
      kantor_cabang, status
    ) VALUES (@kode_aset, @kategori, @tipe_penjualan, @tanggal_lelang, @link_lelang,
      @judul, @deskripsi, @harga,
      @provinsi, @kabupaten_kota, @alamat, @luas_tanah, @luas_bangunan, @sertifikat,
      @merk, @model, @tahun, @no_polisi, @warna, @spesifikasi, @fasilitas,
      @kantor_cabang, @status)
  `);

  const contoh = [
    {\r
      kode_aset: 'BK-0001',\r
      kategori: 'tanah_bangunan',\r
      tipe_penjualan: 'pra_lelang',\r
      tanggal_lelang: null,\r
      link_lelang: null,\r
      judul: 'Rumah di Jl. Lawu, Karanganyar',\r
      deskripsi: 'Rumah hunian 1 lantai, lingkungan asri, dekat pusat kota Karanganyar. Dijual sukarela oleh pihak bank (bisa negosiasi/KPR/Tunai).',\r
      harga: 350000000,\r
      provinsi: 'Jawa Tengah',\r
      kabupaten_kota: 'Karanganyar',\r
      alamat: 'Jl. Lawu No. 12, Karanganyar',\r
      luas_tanah: 150,\r
      luas_bangunan: 90,\r
      sertifikat: 'SHM',\r
      merk: null, model: null, tahun: null, no_polisi: null, warna: null,\r
      spesifikasi: '3 Kamar Tidur, 2 Kamar Mandi, Carport',\r
      fasilitas: 'Listrik PLN, Air PDAM, Akses Jalan Aspal',\r
      kantor_cabang: 'KC Karanganyar',\r
      status: 'tersedia'\r
    }\r
  ];

  const insertMany = (rows) => {
    db.exec('BEGIN');
    try {
      for (const row of rows) insertAsset.run(row);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  insertMany(contoh);
  console.log(`Berhasil seed ${contoh.length} contoh aset.`);
}

seedAdmin();
seedAssets();
console.log('Seeding selesai.');

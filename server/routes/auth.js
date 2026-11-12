const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Username dan password wajib diisi.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) {
    return res.status(401).json({ ok: false, message: 'Username atau password salah.' });
  }

  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ ok: false, message: 'Username atau password salah.' });
  }

  req.session.adminId = admin.id;
  req.session.adminNama = admin.nama;
  req.session.adminUsername = admin.username;
  res.json({ ok: true, id: admin.id, username: admin.username, nama: admin.nama });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({
      ok: true,
      loggedIn: true,
      id: req.session.adminId,
      username: req.session.adminUsername,
      nama: req.session.adminNama
    });
  }
  res.json({ ok: true, loggedIn: false });
});

// GET /api/auth/users - daftar semua akun admin
router.get('/users', requireLogin, (req, res) => {
  const rows = db.prepare('SELECT id, username, nama, created_at FROM admins ORDER BY id ASC').all();
  res.json({ ok: true, data: rows });
});

// POST /api/auth/users - tambah user admin baru
router.post('/users', requireLogin, (req, res) => {
  const username = String(req.body.username || '').trim();
  const nama = String(req.body.nama || '').trim();
  const password = String(req.body.password || '');

  if (!username || !nama || !password) {
    return res.status(400).json({ ok: false, message: 'Nama, username, dan password wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Password minimal 6 karakter.' });
  }

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ ok: false, message: 'Username sudah digunakan.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO admins (username, password_hash, nama) VALUES (?, ?, ?)')
    .run(username, hash, nama);

  const created = db.prepare('SELECT id, username, nama, created_at FROM admins WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ok: true, message: 'User admin berhasil ditambahkan.', data: created });
});

// PUT /api/auth/password - ganti password akun sendiri
router.put('/password', requireLogin, (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ ok: false, message: 'Password lama dan password baru wajib diisi.' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ ok: false, message: 'Password baru minimal 6 karakter.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!admin) {
    return res.status(404).json({ ok: false, message: 'Akun admin tidak ditemukan.' });
  }

  const valid = bcrypt.compareSync(old_password, admin.password_hash);
  if (!valid) {
    return res.status(400).json({ ok: false, message: 'Password lama tidak sesuai.' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  res.json({ ok: true, message: 'Password berhasil diperbarui.' });
});

// PUT /api/auth/users/:id/password - reset/ganti password user admin tertentu
router.put('/users/:id/password', requireLogin, (req, res) => {
  const { new_password } = req.body;
  if (!new_password || String(new_password).length < 6) {
    return res.status(400).json({ ok: false, message: 'Password baru minimal 6 karakter.' });
  }

  const target = db.prepare('SELECT id, username, nama FROM admins WHERE id = ?').get(req.params.id);
  if (!target) {
    return res.status(404).json({ ok: false, message: 'User admin tidak ditemukan.' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, target.id);
  res.json({ ok: true, message: `Password untuk "${target.username}" berhasil diubah.` });
});

// DELETE /api/auth/users/:id - hapus user admin lain
router.delete('/users/:id', requireLogin, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === Number(req.session.adminId)) {
    return res.status(400).json({ ok: false, message: 'Tidak dapat menghapus akun yang sedang Anda gunakan login.' });
  }

  const count = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
  if (count <= 1) {
    return res.status(400).json({ ok: false, message: 'Minimal harus ada 1 akun admin aktif.' });
  }

  const existing = db.prepare('SELECT id FROM admins WHERE id = ?').get(targetId);
  if (!existing) {
    return res.status(404).json({ ok: false, message: 'User admin tidak ditemukan.' });
  }

  db.prepare('DELETE FROM admins WHERE id = ?').run(targetId);
  res.json({ ok: true, message: 'User admin berhasil dihapus.' });
});

module.exports = router;

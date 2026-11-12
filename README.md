# Portal Aset Jaminan - PT. BPR Bank Karanganyar (Perseroda)

Portal marketplace untuk menampilkan dan mengelola daftar aset (tanah & bangunan, kendaraan) hasil penyelesaian kredit macet. Tampilan responsif untuk desktop maupun mobile (Android/iPhone), dengan panel admin untuk tambah/edit/hapus aset.

## Teknologi

- **Backend**: Node.js + Express
- **Database**: SQLite bawaan Node.js (`node:sqlite`, built-in sejak Node v22.5+, tidak perlu instalasi native/compiler tambahan)
- **Autentikasi admin**: express-session + bcryptjs
- **Upload gambar**: multer
- **Frontend**: HTML + CSS + Vanilla JavaScript (tanpa framework/build step)

## Struktur Folder

```
server/            -> backend Express (app.js, routes, db, middleware)
public/            -> frontend statis (index.html, detail.html, admin/, css/, js/, uploads/)
```

## Menjalankan di Lokal (Windows)

```
npm install
npm run seed      # buat admin default + contoh data (sekali saja)
npm start
```

Lalu buka `http://localhost:3000`.

- **Login admin**: `http://localhost:3000/admin/login.html`
- **Username default**: `admin`
- **Password default**: `admin123` (segera ganti setelah deploy produksi)

## Persyaratan Node.js

Gunakan **Node.js v22.5 atau lebih baru** (direkomendasikan v22 LTS / v24 LTS) karena aplikasi memakai modul `node:sqlite` bawaan Node, sehingga **tidak butuh Visual Studio Build Tools** atau compiler native apapun di server.

## Deployment di cPanel (via GitHub & Setup Node.js App)

Proyek ini sudah disiapkan agar dapat langsung dijalankan di **cPanel**:

### 1. Clone Repository dari GitHub di cPanel
1. Login ke **cPanel** Anda.
2. Buka menu **Git™ Version Control** (di bagian *Files*).
3. Klik **Create**, lalu isi:
   - **Clone URL**: `https://github.com/udin2705/lelang-bank-karanganyar.git`
   - **Repository Path**: misalnya `/home/username_cpanel/lelang-bank-karanganyar`
   - **Repository Name**: `lelang-bank-karanganyar`
4. Klik **Create** untuk mengunduh proyek dari GitHub ke cPanel.

### 2. Konfigurasi di Menu "Setup Node.js App" cPanel
1. Di halaman utama cPanel, buka menu **Setup Node.js App** (di bagian *Software*).
2. Klik **Create Application**, lalu isi form berikut:
   - **Node.js version**: Pilih versi **22.x** (minimal v22.5+) atau terbaru yang tersedia.
   - **Application mode**: `Production`
   - **Application root**: `lelang-bank-karanganyar` (sesuai path folder tempat Anda clone Git tadi)
   - **Application URL**: Pilih domain atau subdomain Anda (misal `lelang.bankkaranganyar.co.id`)
   - **Application startup file**: `app.js` (atau `server/app.js`)
3. (Opsional) Di bagian **Environment variables**, klik **Add Variable**:
   - Name: `SESSION_SECRET`, Value: isi dengan teks acak panjang untuk keamanan sesi login.
4. Klik **Create** di kanan atas.
5. Setelah aplikasi terbuat, klik tombol **Run NPM Install** agar cPanel menginstal seluruh paket (`express`, `express-session`, `bcryptjs`, `multer`).
6. Klik **Restart** pada aplikasi Node.js Anda.

### 3. Login Admin Pertama Kali di cPanel
- Saat aplikasi pertama kali dijalankan, database SQLite (`server/db/marketplace.sqlite`) dan akun admin default akan **otomatis dibuat** tanpa perlu menjalankan perintah seed manual:
  - **URL Login Admin**: `https://domain-anda.com/admin/login.html`
  - **Username**: `admin`
  - **Password**: `admin123`
- Setelah berhasil login, segera buka menu **Kelola Admin / Ganti Password** di panel admin untuk mengubah password default Anda.

---

## Deployment di aaPanel

aaPanel menyediakan fitur **Node.js App Manager** (tersedia setelah install plugin "Node.js Version Manager" / "PM2 Manager" dari App Store aaPanel). Berikut langkah deploy:

### 1. Siapkan Node.js di aaPanel
- Masuk ke **App Store** aaPanel, cari dan install **"Node.js Version Manager"** (atau "PM2 Manager", tergantung versi aaPanel Anda).
- Di dalam Node Version Manager, install Node.js versi **22.x atau 24.x LTS** (jangan di bawah 22.5).

### 2. Upload project
- Upload seluruh folder project (kecuali `node_modules` dan `server/db/*.sqlite`) ke direktori website, misalnya `/www/wwwroot/portal-aset-bk/`. Bisa lewat File Manager aaPanel (upload zip lalu extract) atau via Git.

### 3. Install dependency & seed database
- Buka **Terminal** aaPanel (atau SSH ke server), masuk ke folder project:
  ```
  cd /www/wwwroot/portal-aset-bk
  npm install --production
  npm run seed
  ```
- `npm run seed` hanya perlu dijalankan **sekali** saat pertama kali setup (membuat admin default & file database `server/db/marketplace.sqlite`).

### 4. Buat aplikasi Node di aaPanel
- Di menu **Node Project** / **PM2 Manager** aaPanel, klik **Add Node Project**.
- Isi konfigurasi:
  - **Project Directory**: `/www/wwwroot/portal-aset-bk`
  - **Startup File**: `server/app.js`
  - **Project Port**: misal `3000` (atau port lain yang belum terpakai)
  - **Run User**: www atau sesuai kebutuhan
  - **Node Version**: versi yang sudah diinstall di langkah 1
- Tambahkan environment variable (jika tersedia kolomnya di form aaPanel):
  - `PORT=3000` (samakan dengan Project Port di atas)
  - `SESSION_SECRET=` isi dengan string acak panjang, jangan pakai nilai default.
- Simpan dan **Start** project. aaPanel akan menjalankan proses via PM2 agar otomatis restart jika crash/reboot server.

### 5. Hubungkan ke domain (reverse proxy)
- Buat **Website** baru di aaPanel (atau pakai yang sudah ada) dengan domain Anda, misalnya `aset.bankkaranganyar.co.id`.
- Masuk ke pengaturan website tersebut, pilih **Reverse Proxy** (atau "Node Project Binding" jika tersedia), arahkan ke `http://127.0.0.1:3000` (port sesuai yang didaftarkan di langkah 4).
- Aktifkan **SSL** (Let's Encrypt gratis) di aaPanel untuk HTTPS.

### 6. Setelah aktif
- Akses situs via domain Anda, lalu buka `/admin/login.html` untuk login admin.
- **Segera ganti password default** admin (saat ini belum ada fitur ganti password dari UI; untuk mengganti, jalankan ulang seed dengan modifikasi, atau minta ditambahkan fitur ganti password sebagai pengembangan lanjutan).
- Folder `public/uploads/` menyimpan file foto aset yang diupload admin. Pastikan folder ini punya izin tulis untuk user yang menjalankan PM2, dan sertakan dalam backup rutin aaPanel karena tidak ikut tersimpan di git.

### Catatan Database
Database SQLite disimpan sebagai file lokal di `server/db/marketplace.sqlite`. Untuk skala kecil-menengah ini cukup, tapi pastikan file tersebut masuk dalam **backup rutin** aaPanel (Cron Backup) agar data aset tidak hilang.


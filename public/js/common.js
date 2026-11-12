// Helper umum dipakai di semua halaman publik

function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggal(isoString) {
  if (!isoString) return '-';
  const raw = String(isoString).trim();
  const d = raw.length === 10 ? new Date(raw + 'T00:00:00') : new Date(raw.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function kategoriLabel(kategori) {
  return kategori === 'kendaraan' ? 'Kendaraan' : 'Tanah & Bangunan';
}

function tipePenjualanLabel(tipe) {
  return tipe === 'lelang' ? 'Lelang' : 'Pra-Lelang';
}

function hargaLabel(tipe) {
  return tipe === 'lelang' ? 'Nilai Limit Lelang' : 'Harga Penawaran';
}

function statusLabel(status) {
  const map = { tersedia: 'Tersedia', terjual: 'Terjual' };
  return map[status] || status;
}

function placeholderImage() {
  return '/img/placeholder.svg';
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options
  });
  const data = await res.json().catch(() => ({ ok: false, message: 'Respons server tidak valid.' }));
  if (!res.ok) {
    throw new Error(data.message || `Permintaan gagal (${res.status})`);
  }
  return data;
}

function toggleMobileNav() {
  const nav = document.querySelector('.main-nav');
  if (nav) nav.classList.toggle('mobile-open');
}

function toggleAdminSidebar() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (sidebar) sidebar.classList.toggle('mobile-open');
}

// Data master Provinsi & Kabupaten/Kota se-Indonesia (tersedia langsung di frontend)
window.WILAYAH_INDONESIA = {
  'Jawa Tengah': [
    'Kabupaten Karanganyar', 'Kabupaten Boyolali', 'Kabupaten Klaten', 'Kabupaten Sragen',
    'Kabupaten Sukoharjo', 'Kabupaten Wonogiri', 'Kota Surakarta', 'Kabupaten Banjarnegara',
    'Kabupaten Banyumas', 'Kabupaten Batang', 'Kabupaten Blora', 'Kabupaten Brebes',
    'Kabupaten Cilacap', 'Kabupaten Demak', 'Kabupaten Grobogan', 'Kabupaten Jepara',
    'Kabupaten Kebumen', 'Kabupaten Kendal', 'Kabupaten Kudus', 'Kabupaten Magelang',
    'Kabupaten Pati', 'Kabupaten Pekalongan', 'Kabupaten Pemalang', 'Kabupaten Purbalingga',
    'Kabupaten Purworejo', 'Kabupaten Rembang', 'Kabupaten Semarang', 'Kabupaten Temanggung',
    'Kabupaten Tegal', 'Kabupaten Wonosobo', 'Kota Magelang', 'Kota Pekalongan',
    'Kota Salatiga', 'Kota Semarang', 'Kota Tegal'
  ],
  'D.I. Yogyakarta': [
    'Kabupaten Bantul', 'Kabupaten Gunungkidul', 'Kabupaten Kulon Progo', 'Kabupaten Sleman', 'Kota Yogyakarta'
  ],
  'Jawa Timur': [
    'Kabupaten Bangkalan', 'Kabupaten Banyuwangi', 'Kabupaten Blitar', 'Kabupaten Bojonegoro',
    'Kabupaten Bondowoso', 'Kabupaten Gresik', 'Kabupaten Jember', 'Kabupaten Jombang',
    'Kabupaten Kediri', 'Kabupaten Lamongan', 'Kabupaten Lumajang', 'Kabupaten Madiun',
    'Kabupaten Magetan', 'Kabupaten Malang', 'Kabupaten Mojokerto', 'Kabupaten Nganjuk',
    'Kabupaten Ngawi', 'Kabupaten Pacitan', 'Kabupaten Pamekasan', 'Kabupaten Pasuruan',
    'Kabupaten Ponorogo', 'Kabupaten Probolinggo', 'Kabupaten Sampang', 'Kabupaten Sidoarjo',
    'Kabupaten Situbondo', 'Kabupaten Sumenep', 'Kabupaten Trenggalek', 'Kabupaten Tuban',
    'Kabupaten Tulungagung', 'Kota Batu', 'Kota Blitar', 'Kota Kediri', 'Kota Madiun',
    'Kota Malang', 'Kota Mojokerto', 'Kota Pasuruan', 'Kota Probolinggo', 'Kota Surabaya'
  ],
  'Jawa Barat': [
    'Kabupaten Bandung', 'Kabupaten Bandung Barat', 'Kabupaten Bekasi', 'Kabupaten Bogor',
    'Kabupaten Ciamis', 'Kabupaten Cianjur', 'Kabupaten Cirebon', 'Kabupaten Garut',
    'Kabupaten Indramayu', 'Kabupaten Karawang', 'Kabupaten Kuningan', 'Kabupaten Majalengka',
    'Kabupaten Pangandaran', 'Kabupaten Purwakarta', 'Kabupaten Subang', 'Kabupaten Sukabumi',
    'Kabupaten Sumedang', 'Kabupaten Tasikmalaya', 'Kota Bandung', 'Kota Banjar',
    'Kota Bekasi', 'Kota Bogor', 'Kota Cimahi', 'Kota Cirebon', 'Kota Depok',
    'Kota Sukabumi', 'Kota Tasikmalaya'
  ],
  'DKI Jakarta': [
    'Kabupaten Kepulauan Seribu', 'Kota Jakarta Barat', 'Kota Jakarta Pusat',
    'Kota Jakarta Selatan', 'Kota Jakarta Timur', 'Kota Jakarta Utara'
  ],
  'Banten': [
    'Kabupaten Lebak', 'Kabupaten Pandeglang', 'Kabupaten Serang', 'Kabupaten Tangerang',
    'Kota Cilegon', 'Kota Serang', 'Kota Tangerang', 'Kota Tangerang Selatan'
  ],
  'Bali': [
    'Kabupaten Badung', 'Kabupaten Bangli', 'Kabupaten Buleleng', 'Kabupaten Gianyar',
    'Kabupaten Jembrana', 'Kabupaten Karangasem', 'Kabupaten Klungkung', 'Kabupaten Tabanan', 'Kota Denpasar'
  ]
};

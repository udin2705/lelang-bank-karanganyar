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

// Helper pendeteksi perangkat mobile (Android / iPhone / iPad)
function isMobileBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
  return mobileRegex.test(ua) || coarsePointer;
}

function showShareToast(message) {
  let toast = document.getElementById('shareToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'shareToast';
    toast.className = 'share-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__shareToastTimer);
  window.__shareToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

function closeAllSharePopovers() {
  document.querySelectorAll('.share-popover.open').forEach((el) => {
    el.classList.remove('open');
  });
  document.querySelectorAll('.btn-share-asset.active').forEach((btn) => {
    btn.classList.remove('active');
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.share-wrap')) {
    closeAllSharePopovers();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllSharePopovers();
});

async function copyShareLink(event, url, btnEl) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (btnEl) {
      const labelEl = btnEl.querySelector('.copy-label');
      const orig = labelEl ? labelEl.textContent : '';
      if (labelEl) labelEl.textContent = 'Tautan Tersalin!';
      btnEl.classList.add('copied');
      setTimeout(() => {
        if (labelEl) labelEl.textContent = orig || 'Salin Tautan';
        btnEl.classList.remove('copied');
      }, 1800);
    }
    showShareToast('✓ Tautan aset berhasil disalin!');
  } catch (err) {
    showShareToast('Gagal menyalin tautan.');
  }
}

async function handleShareAsset(event, btnEl) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const wrap = btnEl.closest('.share-wrap');
  if (!wrap) return;

  const title = wrap.dataset.title || document.title;
  const price = wrap.dataset.price || '';
  const url = wrap.dataset.url || window.location.href;
  const shareTitle = price ? `${title} - ${price}` : title;
  const shareText = `Lihat aset ${shareTitle} di Portal Aset PT. BPR Bank Karanganyar (Perseroda):`;

  // Jika dibuka di browser ponsel dan mendukung Web Share API (native share ke WA, FB, IG, dll.)
  if (isMobileBrowser() && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: `${shareText}\n`,
        url: url
      });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }

  // Mode Desktop (atau fallback): tampilkan popup kecil di dekat tombol
  const popover = wrap.querySelector('.share-popover');
  if (!popover) return;

  const isAlreadyOpen = popover.classList.contains('open');
  closeAllSharePopovers();

  if (!isAlreadyOpen) {
    popover.classList.add('open');
    btnEl.classList.add('active');
  }
}

function buildShareWidgetHtml(asset, options = {}) {
  const origin = window.location.origin;
  const detailUrl = `${origin}/detail.html?id=${encodeURIComponent(asset.id)}`;
  const priceText = formatRupiah(asset.harga);
  const titleText = String(asset.judul || 'Aset Jaminan BPR Bank Karanganyar');
  const waMessage = `Lihat aset *${titleText}* (${priceText}) di Portal Aset BPR Bank Karanganyar:\n${detailUrl}`;
  const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`;
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(detailUrl)}&quote=${encodeURIComponent(titleText + ' - ' + priceText)}`;

  const compactClass = options.compact ? 'share-wrap-compact' : '';
  const safeTitleAttr = titleText.replace(/"/g, '&quot;');
  const safePriceAttr = priceText.replace(/"/g, '&quot;');
  const safeUrlAttr = detailUrl.replace(/"/g, '&quot;');

  return `
    <div class="share-wrap ${compactClass}" data-title="${safeTitleAttr}" data-price="${safePriceAttr}" data-url="${safeUrlAttr}" onclick="event.stopPropagation()">
      <button type="button" class="btn-share-asset" onclick="handleShareAsset(event, this)" title="Bagikan aset ini" aria-label="Bagikan aset">
        <svg class="share-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        <span>Bagikan</span>
      </button>
      <div class="share-popover" role="menu" aria-label="Pilihan Bagikan">
        <div class="share-popover-head">Bagikan Aset</div>
        <a href="${waShareUrl}" target="_blank" rel="noopener noreferrer" class="share-option share-wa" onclick="closeAllSharePopovers()">
          <span class="share-opt-icon wa">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.52 3.48A11.82 11.82 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.74 1.46h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.07 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.75.98 1-3.65-.24-.38a9.85 9.85 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7c0 5.45-4.44 9.89-9.9 9.89zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>
          </span>
          <span>WhatsApp</span>
        </a>
        <button type="button" class="share-option share-copy" onclick="copyShareLink(event, '${safeUrlAttr}', this)">
          <span class="share-opt-icon copy">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </span>
          <span class="copy-label">Salin Tautan</span>
        </button>
        <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="share-option share-fb" onclick="closeAllSharePopovers()">
          <span class="share-opt-icon fb">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
          </span>
          <span>Facebook</span>
        </a>
      </div>
    </div>
  `;
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

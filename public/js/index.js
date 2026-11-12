(function () {
  const assetContainer = document.getElementById('assetContainer');
  const resultCount = document.getElementById('resultCount');
  const searchForm = document.getElementById('searchForm');
  const qInput = document.getElementById('qInput');
  const provinsiInput = document.getElementById('provinsiInput');
  const kabupatenInput = document.getElementById('kabupatenInput');
  const kecamatanInput = document.getElementById('kecamatanInput');
  const sortInput = document.getElementById('sortInput');
  const tipeFilter = document.getElementById('tipeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const resetFilter = document.getElementById('resetFilter');
  const categoryTabs = document.getElementById('categoryTabs');

  const params = new URLSearchParams(window.location.search);
  let currentKategori = params.get('kategori') || '';
  let wilayahMap = window.WILAYAH_INDONESIA || {};
  let kecamatanMap = window.KECAMATAN_INDONESIA || {};

  function setActiveTab() {
    categoryTabs.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.kategori === currentKategori);
    });
  }

  function renderCard(asset) {
    const img = asset.images && asset.images.length ? asset.images[0] : placeholderImage();
    const kecLabel = asset.kecamatan ? `Kec. ${asset.kecamatan.replace(/^Kecamatan\s+/i, '')}` : '';
    const lokasi = [kecLabel, asset.kabupaten_kota, asset.provinsi].filter(Boolean).join(', ') || '-';
    const specHtml = asset.kategori === 'kendaraan'
      ? `<span>${asset.merk || ''} ${asset.model || ''}</span><span>${asset.tahun || '-'}</span>`
      : `<span>LT ${asset.luas_tanah || '-'} m&sup2;</span><span>LB ${asset.luas_bangunan || '-'} m&sup2;</span>`;

    const isLelang = asset.tipe_penjualan === 'lelang';
    const isTerjual = asset.status === 'terjual';
    const jadwalHtml = isLelang && asset.tanggal_lelang
      ? `<div class="lelang-date-mini">&#128197; Lelang: ${formatTanggal(asset.tanggal_lelang)}</div>`
      : '';
    const terjualBadge = isTerjual ? `<span class="badge-terjual">TERJUAL</span>` : '';
    const shareCardHtml = typeof buildShareWidgetHtml === 'function' ? buildShareWidgetHtml(asset, { compact: true }) : '';

    return `
      <div class="asset-card ${isTerjual ? 'is-sold' : ''}" onclick="if(!event.target.closest('.share-wrap')){window.location.href='/detail.html?id=${asset.id}'}" role="link" tabindex="0">
        <a class="thumb-wrap" href="/detail.html?id=${asset.id}">
          <img src="${img}" alt="${asset.judul}" loading="lazy" onerror="this.src='${placeholderImage()}'">
          <span class="badge ${asset.tipe_penjualan}">${tipePenjualanLabel(asset.tipe_penjualan)}</span>
          <span class="badge-kategori">${kategoriLabel(asset.kategori)}</span>
          ${terjualBadge}
        </a>
        <div class="info">
          <p class="loc">${lokasi}</p>
          <h3><a href="/detail.html?id=${asset.id}">${asset.judul}</a></h3>
          <div class="card-price-share-row">
            <div>
              <span class="price-label">${hargaLabel(asset.tipe_penjualan)}</span>
              <p class="price" style="margin-bottom:0;">${formatRupiah(asset.harga)}</p>
            </div>
            ${shareCardHtml}
          </div>
          ${jadwalHtml}
          <div class="spec-row">${specHtml}</div>
        </div>
      </div>
    `;
  }

  async function loadAssets() {
    resultCount.textContent = 'Memuat data...';
    assetContainer.innerHTML = '<div class="loading-state">Memuat daftar aset...</div>';

    const query = new URLSearchParams();
    if (currentKategori) query.set('kategori', currentKategori);
    if (qInput.value.trim()) query.set('q', qInput.value.trim());
    if (provinsiInput.value) query.set('provinsi', provinsiInput.value);
    if (kabupatenInput && kabupatenInput.value) query.set('kabupaten_kota', kabupatenInput.value);
    if (kecamatanInput && kecamatanInput.value) query.set('kecamatan', kecamatanInput.value);
    if (sortInput.value) query.set('sort', sortInput.value);
    if (tipeFilter.value) query.set('tipe_penjualan', tipeFilter.value);
    if (statusFilter.value) query.set('status', statusFilter.value);

    try {
      const res = await apiFetch(`/api/assets?${query.toString()}`);
      const list = res.data;

      if (list.length === 0) {
        assetContainer.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;">
            <div class="icon">&#128269;</div>
            <p>Belum ada aset yang sesuai dengan pencarian Anda.</p>
          </div>`;
        resultCount.textContent = '0 aset ditemukan';
        return;
      }

      assetContainer.innerHTML = list.map(renderCard).join('');
      resultCount.textContent = `${list.length} aset ditemukan`;
    } catch (err) {
      assetContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Gagal memuat data: ${err.message}</div>`;
      resultCount.textContent = '';
    }
  }

  function getKecamatanListForKab(kab) {
    if (!kab) return [];
    if (kecamatanMap[kab]) return kecamatanMap[kab];
    const clean = kab.replace(/^(Kabupaten|Kota)\s+/i, '').trim();
    return kecamatanMap[`Kabupaten ${clean}`] || kecamatanMap[`Kota ${clean}`] || [];
  }

  function updateKecamatanDropdown() {
    if (!kecamatanInput) return;
    const kab = kabupatenInput ? kabupatenInput.value : '';
    kecamatanInput.innerHTML = '<option value="">Semua Kecamatan</option>';
    const list = getKecamatanListForKab(kab);
    if (!kab || list.length === 0) {
      kecamatanInput.disabled = true;
      return;
    }
    list.forEach((kec) => {
      const opt = document.createElement('option');
      opt.value = kec;
      opt.textContent = kec;
      kecamatanInput.appendChild(opt);
    });
    kecamatanInput.disabled = false;
  }

  function updateKabupatenDropdown() {
    if (!kabupatenInput) return;
    const prov = provinsiInput.value;
    kabupatenInput.innerHTML = '<option value="">Semua Kabupaten/Kota</option>';
    updateKecamatanDropdown();
    if (!prov || !wilayahMap[prov]) {
      kabupatenInput.disabled = true;
      return;
    }
    wilayahMap[prov].forEach((kab) => {
      const opt = document.createElement('option');
      opt.value = kab;
      opt.textContent = kab;
      kabupatenInput.appendChild(opt);
    });
    kabupatenInput.disabled = false;
  }

  function renderProvinsiOptions() {
    const current = provinsiInput.value;
    provinsiInput.innerHTML = '<option value="">Semua Provinsi</option>';
    Object.keys(wilayahMap).forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      if (p === current) opt.selected = true;
      provinsiInput.appendChild(opt);
    });
  }

  async function loadWilayah() {
    renderProvinsiOptions();
    try {
      const res = await apiFetch('/api/assets/meta/wilayah');
      if (res && res.data && Object.keys(res.data).length > 0) {
        wilayahMap = res.data;
        renderProvinsiOptions();
      }
    } catch (e) { /* gunakan fallback window.WILAYAH_INDONESIA */ }
  }

  categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    currentKategori = btn.dataset.kategori;
    setActiveTab();
    loadAssets();
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadAssets();
  });

  provinsiInput.addEventListener('change', () => {
    updateKabupatenDropdown();
    loadAssets();
  });

  if (kabupatenInput) {
    kabupatenInput.addEventListener('change', () => {
      updateKecamatanDropdown();
      loadAssets();
    });
  }

  [kecamatanInput, sortInput, tipeFilter, statusFilter].forEach((el) => {
    if (el) el.addEventListener('change', loadAssets);
  });

  resetFilter.addEventListener('click', () => {
    qInput.value = '';
    provinsiInput.value = '';
    updateKabupatenDropdown();
    sortInput.value = '';
    tipeFilter.value = '';
    statusFilter.value = '';
    currentKategori = '';
    setActiveTab();
    loadAssets();
  });

  setActiveTab();
  loadWilayah();
  loadAssets();
})();

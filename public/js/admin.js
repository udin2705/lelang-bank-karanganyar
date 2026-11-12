(function () {
  const statGrid = document.getElementById('statGrid');
  const yearFilterBar = document.getElementById('yearFilterBar');
  const tableBody = document.getElementById('assetTableBody');
  const formModal = document.getElementById('formModal');
  const formModalTitle = document.getElementById('formModalTitle');
  const formAlertBox = document.getElementById('formAlertBox');
  const assetForm = document.getElementById('assetForm');
  const btnAddAsset = document.getElementById('btnAddAsset');
  const closeFormModal = document.getElementById('closeFormModal');
  const logoutBtn = document.getElementById('logoutBtn');

  let editingId = null;
  let currentAdminId = null;
  let currentYearFilter = 'semua';
  let wilayahMap = window.WILAYAH_INDONESIA || {};
  let kecamatanMap = window.KECAMATAN_INDONESIA || {};

  async function checkAuth() {
    const res = await apiFetch('/api/auth/me');
    if (!res.loggedIn) {
      window.location.href = '/admin/login.html';
      return;
    }
    currentAdminId = res.id;
  }

  async function loadWilayah() {
    try {
      const res = await apiFetch('/api/assets/meta/wilayah');
      if (res && res.data && Object.keys(res.data).length > 0) {
        wilayahMap = res.data;
      }
    } catch (e) {
      if (!wilayahMap || Object.keys(wilayahMap).length === 0) {
        wilayahMap = window.WILAYAH_INDONESIA || {};
      }
    }
  }

  function renderStats(list) {
    const total = list.length;
    const praLelang = list.filter((a) => a.status !== 'terjual' && a.tipe_penjualan !== 'lelang').length;
    const lelang = list.filter((a) => a.status !== 'terjual' && a.tipe_penjualan === 'lelang').length;
    const terjual = list.filter((a) => a.status === 'terjual').length;

    statGrid.innerHTML = `
      <div class="stat-card"><div class="label">Total Aset</div><div class="value">${total}</div></div>
      <div class="stat-card"><div class="label">Pra-Lelang (Tersedia)</div><div class="value">${praLelang}</div></div>
      <div class="stat-card"><div class="label">Lelang (Tersedia)</div><div class="value">${lelang}</div></div>
      <div class="stat-card"><div class="label">Terjual</div><div class="value">${terjual}</div></div>
    `;
  }

  function getAssetYear(asset) {
    if (asset.created_at) {
      const m = String(asset.created_at).match(/^(\d{4})/);
      if (m) return m[1];
    }
    return String(new Date().getFullYear());
  }

  function renderRow(asset) {
    const img = asset.images && asset.images.length ? asset.images[0] : placeholderImage();
    const jadwalInfo = asset.tipe_penjualan === 'lelang' && asset.tanggal_lelang
      ? `<div style="font-size:0.75rem; color:var(--danger); margin-top:2px;">&#128197; Lelang: ${formatTanggal(asset.tanggal_lelang)}</div>`
      : '';
    const lokasiRingkas = [
      asset.kecamatan ? `Kec. ${asset.kecamatan.replace(/^Kecamatan\s+/i, '')}` : '',
      asset.kabupaten_kota
    ].filter(Boolean).join(', ');

    return `
      <tr>
        <td class="thumb-cell"><img src="${img}" onerror="this.src='${placeholderImage()}'" alt=""></td>
        <td>
          <strong>${asset.kode_aset}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Diposting: ${formatTanggal(asset.created_at)}</div>
        </td>
        <td>
          <div>${asset.judul}</div>
          ${lokasiRingkas ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">&#128205; ${lokasiRingkas}</div>` : ''}
          <span class="status-pill ${asset.tipe_penjualan}" style="margin-top:4px;">${tipePenjualanLabel(asset.tipe_penjualan)}</span>
          ${jadwalInfo}
        </td>
        <td>${kategoriLabel(asset.kategori)}</td>
        <td>
          <div style="font-size:0.72rem; color:var(--text-muted);">${hargaLabel(asset.tipe_penjualan)}</div>
          <strong>${formatRupiah(asset.harga)}</strong>
        </td>
        <td><span class="status-pill ${asset.status}">${statusLabel(asset.status)}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.openEditForm(${asset.id})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteAsset(${asset.id}, '${asset.judul.replace(/'/g, "\\'")}')">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }

  let cachedAssets = [];

  function renderYearClassification() {
    if (!yearFilterBar) return;
    const yearCounts = {};
    cachedAssets.forEach((a) => {
      const y = getAssetYear(a);
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    });
    const years = Object.keys(yearCounts).sort((a, b) => Number(b) - Number(a));

    if (currentYearFilter !== 'semua' && !yearCounts[currentYearFilter]) {
      currentYearFilter = 'semua';
    }

    const buttonsHtml = [
      `<button type="button" class="year-pill ${currentYearFilter === 'semua' ? 'active' : ''}" data-year="semua">Semua Tahun <span class="count">${cachedAssets.length}</span></button>`,
      ...years.map(
        (y) =>
          `<button type="button" class="year-pill ${currentYearFilter === y ? 'active' : ''}" data-year="${y}">&#128197; Postingan ${y} <span class="count">${yearCounts[y]}</span></button>`
      )
    ].join('');

    yearFilterBar.innerHTML = `
      <div class="year-filter-label">Klasifikasi Tahun Postingan:</div>
      <div class="year-pill-group">${buttonsHtml}</div>
    `;

    yearFilterBar.querySelectorAll('.year-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentYearFilter = btn.dataset.year;
        renderYearClassification();
        renderFilteredAssets();
      });
    });
  }

  function renderFilteredAssets() {
    const filtered = currentYearFilter === 'semua'
      ? cachedAssets
      : cachedAssets.filter((a) => getAssetYear(a) === currentYearFilter);

    renderStats(filtered);

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7">Belum ada aset. Klik "Tambah Aset" untuk mulai menambahkan.</td></tr>';
      return;
    }

    // Kelompokkan baris aset berdasarkan tahun postingan (terbaru ke terlama)
    const grouped = {};
    filtered.forEach((a) => {
      const y = getAssetYear(a);
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(a);
    });
    const sortedYears = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

    let html = '';
    sortedYears.forEach((year) => {
      const items = grouped[year];
      html += `
        <tr class="year-group-row">
          <td colspan="7">
            <div class="year-group-header">
              <span>&#128197; Kelompok Aset Postingan Tahun ${year}</span>
              <span class="year-group-badge">${items.length} Aset</span>
            </div>
          </td>
        </tr>
      `;
      html += items.map(renderRow).join('');
    });

    tableBody.innerHTML = html;
  }

  async function loadAssets() {
    tableBody.innerHTML = '<tr><td colspan="7">Memuat data...</td></tr>';
    try {
      const res = await apiFetch('/api/assets/admin/all');
      cachedAssets = res.data || [];
      renderYearClassification();
      renderFilteredAssets();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7">Gagal memuat data: ${err.message}</td></tr>`;
    }
  }

  checkAuth();
  loadWilayah();
  loadAssets();

  // ===================== FORM MODAL =====================

  function getWilayahMap() {
    if (wilayahMap && Object.keys(wilayahMap).length > 0) return wilayahMap;
    if (window.WILAYAH_INDONESIA && Object.keys(window.WILAYAH_INDONESIA).length > 0) {
      wilayahMap = window.WILAYAH_INDONESIA;
      return wilayahMap;
    }
    return {};
  }

  function fieldsByKategori(kategori, data = {}) {
    const g = (key, def = '') => (data[key] !== undefined && data[key] !== null ? data[key] : def);
    const tipe = g('tipe_penjualan', 'pra_lelang') === 'lelang' ? 'lelang' : 'pra_lelang';
    const isLelang = tipe === 'lelang';
    const activeWilayah = getWilayahMap();
    const selectedProv = g('provinsi', 'Jawa Tengah');
    const provList = Object.keys(activeWilayah);
    if (selectedProv && !provList.includes(selectedProv)) {
      provList.unshift(selectedProv);
    }
    const provinsiOptions = provList
      .map((p) => `<option value="${p}" ${p === selectedProv ? 'selected' : ''}>${p}</option>`)
      .join('');

    const common = `
      <div class="form-grid">
        <div class="form-group">
          <label>Kode Aset *</label>
          <input type="text" name="kode_aset" value="${g('kode_aset')}" required>
        </div>
        <div class="form-group">
          <label>Kategori *</label>
          <select name="kategori" id="kategoriSelect" required>
            <option value="tanah_bangunan" ${kategori === 'tanah_bangunan' ? 'selected' : ''}>Tanah &amp; Bangunan</option>
            <option value="kendaraan" ${kategori === 'kendaraan' ? 'selected' : ''}>Kendaraan</option>
          </select>
        </div>
        <div class="form-group">
          <label>Judul Aset *</label>
          <input type="text" name="judul" value="${g('judul')}" required>
        </div>
        <div class="form-group">
          <label>Tipe Penjualan *</label>
          <select name="tipe_penjualan" id="tipePenjualanSelect">
            <option value="pra_lelang" ${!isLelang ? 'selected' : ''}>Pra-Lelang (Jual Sukarela / Negosiasi)</option>
            <option value="lelang" ${isLelang ? 'selected' : ''}>Lelang (KPKNL / lelang.go.id)</option>
          </select>
        </div>
        <div class="form-group">
          <label id="hargaLabelEl">${isLelang ? 'Nilai Limit Lelang (Rp) *' : 'Harga Penawaran (Rp) *'}</label>
          <input type="number" name="harga" value="${g('harga')}" required min="0">
        </div>
        <div class="form-group">
          <label>Status *</label>
          <select name="status">
            <option value="tersedia" ${g('status', 'tersedia') !== 'terjual' ? 'selected' : ''}>Tersedia</option>
            <option value="terjual" ${g('status') === 'terjual' ? 'selected' : ''}>Terjual</option>
          </select>
        </div>

        <div class="form-group full-lelang" style="display:${isLelang ? 'block' : 'none'};">
          <label>Tanggal Pelaksanaan Lelang</label>
          <input type="date" name="tanggal_lelang" value="${g('tanggal_lelang')}">
        </div>
        <div class="form-group full-lelang" style="display:${isLelang ? 'block' : 'none'};">
          <label>Link Lelang (lelang.go.id)</label>
          <input type="url" name="link_lelang" value="${g('link_lelang')}" placeholder="https://lelang.go.id/...">
        </div>

        <div class="form-group">
          <label>Provinsi</label>
          <select name="provinsi" id="provinsiSelect">
            <option value="">-- Pilih Provinsi --</option>
            ${provinsiOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Kabupaten/Kota</label>
          <select name="kabupaten_kota" id="kabupatenSelect" data-initial="${g('kabupaten_kota', 'Kabupaten Karanganyar')}">
            <option value="">-- Pilih Kabupaten/Kota --</option>
          </select>
        </div>
        <div class="form-group">
          <label>Kecamatan</label>
          <select name="kecamatan" id="kecamatanSelect" data-initial="${g('kecamatan')}">
            <option value="">-- Pilih Kecamatan --</option>
          </select>
          <input type="text" id="kecamatanManualInput" placeholder="Ketik nama kecamatan..." style="display:none; margin-top:6px;">
        </div>
        <div class="form-group">
          <label>Nomor WhatsApp Kontak *</label>
          <input type="tel" name="no_whatsapp" value="${g('no_whatsapp')}" required placeholder="Contoh: 081234567890">
        </div>
        <div class="form-group full">
          <label>Alamat Lengkap</label>
          <input type="text" name="alamat" value="${g('alamat')}">
        </div>

        <div class="form-group full-tb" style="display:${kategori === 'kendaraan' ? 'none' : 'block'};">
          <label>Luas Tanah (m&sup2;)</label>
          <input type="number" name="luas_tanah" value="${g('luas_tanah')}" step="0.01">
        </div>
        <div class="form-group full-tb" style="display:${kategori === 'kendaraan' ? 'none' : 'block'};">
          <label>Luas Bangunan (m&sup2;)</label>
          <input type="number" name="luas_bangunan" value="${g('luas_bangunan')}" step="0.01">
        </div>
        <div class="form-group full-tb" style="display:${kategori === 'kendaraan' ? 'none' : 'block'};">
          <label>Sertifikat</label>
          <input type="text" name="sertifikat" value="${g('sertifikat')}" placeholder="SHM / HGB / dll">
        </div>
        <div class="form-group full-tb" style="display:${kategori === 'kendaraan' ? 'none' : 'block'};"></div>

        <div class="form-group full-kendaraan" style="display:${kategori === 'kendaraan' ? 'block' : 'none'};">
          <label>Merk</label>
          <input type="text" name="merk" value="${g('merk')}">
        </div>
        <div class="form-group full-kendaraan" style="display:${kategori === 'kendaraan' ? 'block' : 'none'};">
          <label>Model</label>
          <input type="text" name="model" value="${g('model')}">
        </div>
        <div class="form-group full-kendaraan" style="display:${kategori === 'kendaraan' ? 'block' : 'none'};">
          <label>Tahun</label>
          <input type="number" name="tahun" value="${g('tahun')}">
        </div>
        <div class="form-group full-kendaraan" style="display:${kategori === 'kendaraan' ? 'block' : 'none'};">
          <label>No. Polisi</label>
          <input type="text" name="no_polisi" value="${g('no_polisi')}">
        </div>
        <div class="form-group full-kendaraan" style="display:${kategori === 'kendaraan' ? 'block' : 'none'};">
          <label>Warna</label>
          <input type="text" name="warna" value="${g('warna')}">
        </div>

        <div class="form-group full">
          <label>Spesifikasi Tambahan</label>
          <input type="text" name="spesifikasi" value="${g('spesifikasi')}">
        </div>
        <div class="form-group full full-tb" style="display:${kategori === 'kendaraan' ? 'none' : 'block'};">
          <label>Fasilitas / Akses</label>
          <input type="text" name="fasilitas" value="${g('fasilitas')}">
        </div>
        <div class="form-group full">
          <label>Deskripsi Aset</label>
          <textarea name="deskripsi">${g('deskripsi')}</textarea>
        </div>
      </div>
    `;
    return common;
  }

  function imageManagerHtml(asset) {
    if (!asset) return '';
    const images = asset.images || [];
    const imageIds = asset.imageIds || [];
    const itemsHtml = images.map((img, idx) => `
      <div class="img-item" data-image-url="${img}">
        <img src="${img}" onerror="this.src='${placeholderImage()}'">
        <button type="button" class="remove-btn" onclick="window.removeExistingImage(this, '${img}')">&times;</button>
      </div>
    `).join('');

    return `
      <div class="form-group full">
        <label>Foto Aset Tersimpan</label>
        <div class="image-preview-grid">${itemsHtml || '<span style="color:var(--text-muted); font-size:0.85rem;">Belum ada foto.</span>'}</div>
      </div>
    `;
  }

  function buildForm(kategori, data, asset) {
    assetForm.innerHTML = `
      ${fieldsByKategori(kategori, data)}
      ${asset ? imageManagerHtml(asset) : ''}
      <div class="form-group full">
        <label>${asset ? 'Tambah Foto Baru' : 'Upload Foto Aset (bisa lebih dari 1)'}</label>
        <input type="file" name="images" id="imagesInput" accept="image/png,image/jpeg,image/webp" multiple>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelFormBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${asset ? 'Simpan Perubahan' : 'Simpan Aset'}</button>
      </div>
    `;

    const kategoriSelect = document.getElementById('kategoriSelect');
    kategoriSelect.addEventListener('change', () => {
      const isKendaraan = kategoriSelect.value === 'kendaraan';
      document.querySelectorAll('.full-tb').forEach((el) => (el.style.display = isKendaraan ? 'none' : 'block'));
      document.querySelectorAll('.full-kendaraan').forEach((el) => (el.style.display = isKendaraan ? 'block' : 'none'));
    });

    const tipePenjualanSelect = document.getElementById('tipePenjualanSelect');
    const hargaLabelEl = document.getElementById('hargaLabelEl');
    tipePenjualanSelect.addEventListener('change', () => {
      const isLelang = tipePenjualanSelect.value === 'lelang';
      hargaLabelEl.textContent = isLelang ? 'Nilai Limit Lelang (Rp) *' : 'Harga Penawaran (Rp) *';
      document.querySelectorAll('.full-lelang').forEach((el) => (el.style.display = isLelang ? 'block' : 'none'));
    });

    const provinsiSelect = document.getElementById('provinsiSelect');
    const kabupatenSelect = document.getElementById('kabupatenSelect');
    const kecamatanSelect = document.getElementById('kecamatanSelect');
    const kecamatanManualInput = document.getElementById('kecamatanManualInput');

    function getKecamatanList(kab) {
      if (!kab) return [];
      const map = window.KECAMATAN_INDONESIA || kecamatanMap || {};
      if (map[kab]) return map[kab];
      const clean = String(kab).replace(/^(Kabupaten|Kota)\s+/i, '').trim();
      return map[`Kabupaten ${clean}`] || map[`Kota ${clean}`] || [];
    }

    function populateKecamatan(selectedKec) {
      const kab = kabupatenSelect.value;
      const list = getKecamatanList(kab);
      kecamatanSelect.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
      let matched = false;
      const cleanSelected = selectedKec ? String(selectedKec).replace(/^Kecamatan\s+/i, '').trim() : '';

      list.forEach((kec) => {
        const isMatch = cleanSelected && kec.toLowerCase() === cleanSelected.toLowerCase();
        if (isMatch) matched = true;
        const opt = document.createElement('option');
        opt.value = kec;
        opt.textContent = kec;
        if (isMatch) opt.selected = true;
        kecamatanSelect.appendChild(opt);
      });

      if (cleanSelected && !matched) {
        const opt = document.createElement('option');
        opt.value = cleanSelected;
        opt.textContent = cleanSelected;
        opt.selected = true;
        kecamatanSelect.appendChild(opt);
      }

      const manualOpt = document.createElement('option');
      manualOpt.value = '__manual__';
      manualOpt.textContent = '+ Ketik Kecamatan Lainnya...';
      kecamatanSelect.appendChild(manualOpt);
      kecamatanManualInput.style.display = 'none';
      kecamatanManualInput.value = '';
    }

    kecamatanSelect.addEventListener('change', () => {
      if (kecamatanSelect.value === '__manual__') {
        kecamatanManualInput.style.display = 'block';
        kecamatanManualInput.focus();
      } else {
        kecamatanManualInput.style.display = 'none';
        kecamatanManualInput.value = '';
      }
    });

    function populateKabupaten(selectedValue) {
      const prov = provinsiSelect.value;
      const activeWilayah = getWilayahMap();
      const list = activeWilayah[prov] || [];
      kabupatenSelect.innerHTML = '<option value="">-- Pilih Kabupaten/Kota --</option>';
      let matched = false;
      list.forEach((kab) => {
        const isMatch = selectedValue && (
          kab === selectedValue ||
          kab.toLowerCase() === `kabupaten ${String(selectedValue).toLowerCase()}` ||
          kab.toLowerCase() === `kota ${String(selectedValue).toLowerCase()}`
        );
        if (isMatch) matched = true;
        const opt = document.createElement('option');
        opt.value = kab;
        opt.textContent = kab;
        if (isMatch) opt.selected = true;
        kabupatenSelect.appendChild(opt);
      });
      if (selectedValue && !matched) {
        const opt = document.createElement('option');
        opt.value = selectedValue;
        opt.textContent = selectedValue;
        opt.selected = true;
        kabupatenSelect.appendChild(opt);
      }
    }

    populateKabupaten(kabupatenSelect.dataset.initial || '');
    populateKecamatan(kecamatanSelect.dataset.initial || '');

    provinsiSelect.addEventListener('change', () => {
      populateKabupaten('');
      populateKecamatan('');
    });
    kabupatenSelect.addEventListener('change', () => {
      populateKecamatan('');
    });

    document.getElementById('cancelFormBtn').addEventListener('click', closeModal);
  }

  function openModal() {
    formModal.classList.add('open');
  }

  function closeModal() {
    formModal.classList.remove('open');
    formAlertBox.innerHTML = '';
    assetForm.innerHTML = '';
    editingId = null;
  }

  window.removeExistingImage = async function (btn, imgUrl) {
    if (!editingId) return;
    if (!confirm('Hapus foto ini?')) return;
    const asset = cachedAssets.find((a) => a.id === editingId);
    const idx = asset.images.indexOf(imgUrl);
    const imageId = asset.imageIds ? asset.imageIds[idx] : null;
    if (!imageId) return;
    try {
      await apiFetch(`/api/assets/${editingId}/images/${imageId}`, { method: 'DELETE' });
      btn.closest('.img-item').remove();
      await loadAssets();
    } catch (err) {
      alert('Gagal menghapus foto: ' + err.message);
    }
  };

  window.openEditForm = async function (id) {
    const asset = cachedAssets.find((a) => a.id === id);
    if (!asset) return;
    editingId = id;
    formModalTitle.textContent = `Edit Aset: ${asset.judul}`;
    buildForm(asset.kategori, asset, asset);
    openModal();
  };

  window.deleteAsset = async function (id, judul) {
    if (!confirm(`Hapus aset "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
      await loadAssets();
    } catch (err) {
      alert('Gagal menghapus aset: ' + err.message);
    }
  };

  btnAddAsset.addEventListener('click', () => {
    editingId = null;
    formModalTitle.textContent = 'Tambah Aset Baru';
    buildForm('tanah_bangunan', {}, null);
    openModal();
  });

  closeFormModal.addEventListener('click', closeModal);
  formModal.addEventListener('click', (e) => {
    if (e.target === formModal) closeModal();
  });

  // Kompresi otomatis gambar di browser sebelum upload agar ukuran < 250KB (wajib agar muncul di preview WhatsApp)
  function compressImageFile(file, maxDim = 1200, quality = 0.8) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) return resolve(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              const baseName = file.name.replace(/\.[^.]+$/, '') || 'asset';
              const compressedFile = new File([blob], `${baseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = ev.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  assetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlertBox.innerHTML = '';
    const fd = new FormData(assetForm);
    const payload = {};
    fd.forEach((value, key) => { if (key !== 'images') payload[key] = value; });
    const manualKecEl = document.getElementById('kecamatanManualInput');
    if (payload.kecamatan === '__manual__') {
      payload.kecamatan = manualKecEl ? manualKecEl.value.trim() : '';
    }

    try {
      let savedAsset;
      if (editingId) {
        const res = await apiFetch(`/api/assets/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        savedAsset = res.data;
      } else {
        const res = await apiFetch('/api/assets', { method: 'POST', body: JSON.stringify(payload) });
        savedAsset = res.data;
      }

      const imagesInput = document.getElementById('imagesInput');
      if (imagesInput.files && imagesInput.files.length > 0) {
        const uploadFd = new FormData();
        const compressedFiles = await Promise.all(
          Array.from(imagesInput.files).map((file) => compressImageFile(file))
        );
        compressedFiles.forEach((file) => uploadFd.append('images', file));
        await fetch(`/api/assets/${savedAsset.id}/images`, {
          method: 'POST',
          body: uploadFd,
          credentials: 'same-origin'
        });
      }

      closeModal();
      await loadAssets();
    } catch (err) {
      formAlertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  });

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await apiFetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  // ===================== KELOLA ADMIN & PASSWORD =====================
  const navDashboardAssets = document.getElementById('navDashboardAssets');
  const navAdminUsers = document.getElementById('navAdminUsers');
  const sectionAssets = document.getElementById('sectionAssets');
  const sectionUsers = document.getElementById('sectionUsers');
  const adminUsersTableBody = document.getElementById('adminUsersTableBody');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const addUserForm = document.getElementById('addUserForm');
  const pwdAlertBox = document.getElementById('pwdAlertBox');
  const userAlertBox = document.getElementById('userAlertBox');

  if (navDashboardAssets && navAdminUsers) {
    navDashboardAssets.addEventListener('click', (e) => {
      e.preventDefault();
      navDashboardAssets.classList.add('active');
      navAdminUsers.classList.remove('active');
      sectionAssets.style.display = 'block';
      sectionUsers.style.display = 'none';
    });

    navAdminUsers.addEventListener('click', (e) => {
      e.preventDefault();
      navAdminUsers.classList.add('active');
      navDashboardAssets.classList.remove('active');
      sectionAssets.style.display = 'none';
      sectionUsers.style.display = 'block';
      loadAdminUsers();
    });
  }

  async function loadAdminUsers() {
    if (!adminUsersTableBody) return;
    adminUsersTableBody.innerHTML = '<tr><td colspan="5">Memuat daftar admin...</td></tr>';
    try {
      const res = await apiFetch('/api/auth/users');
      const users = res.data || [];
      adminUsersTableBody.innerHTML = users
        .map((u) => {
          const isMe = Number(u.id) === Number(currentAdminId);
          return `
            <tr>
              <td>#${u.id}</td>
              <td><strong>${u.username}</strong> ${isMe ? '<span class="status-pill tersedia" style="margin-left:6px;">Anda</span>' : ''}</td>
              <td>${u.nama}</td>
              <td>${formatTanggal(u.created_at)}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-secondary" onclick="window.resetUserPassword(${u.id}, '${u.username.replace(/'/g, "\\'")}')">Ubah Password</button>
                  ${!isMe ? `<button class="btn btn-sm btn-danger" onclick="window.deleteUser(${u.id}, '${u.username.replace(/'/g, "\\'")}')">Hapus</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      adminUsersTableBody.innerHTML = `<tr><td colspan="5">Gagal memuat daftar admin: ${err.message}</td></tr>`;
    }
  }

  window.resetUserPassword = async function (id, username) {
    const newPassword = prompt(`Masukkan password baru untuk akun "${username}" (minimal 6 karakter):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('Password baru minimal harus 6 karakter.');
      return;
    }
    try {
      const res = await apiFetch(`/api/auth/users/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ new_password: newPassword })
      });
      alert(res.message || 'Password berhasil diubah.');
    } catch (err) {
      alert('Gagal mengubah password: ' + err.message);
    }
  };

  window.deleteUser = async function (id, username) {
    if (!confirm(`Hapus user admin "${username}"?`)) return;
    try {
      await apiFetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      await loadAdminUsers();
    } catch (err) {
      alert('Gagal menghapus user: ' + err.message);
    }
  };

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      pwdAlertBox.innerHTML = '';
      const fd = new FormData(changePasswordForm);
      const old_password = fd.get('old_password');
      const new_password = fd.get('new_password');
      const confirm_password = fd.get('confirm_password');

      if (new_password !== confirm_password) {
        pwdAlertBox.innerHTML = '<div class="alert alert-error">Konfirmasi password baru tidak cocok.</div>';
        return;
      }

      try {
        const res = await apiFetch('/api/auth/password', {
          method: 'PUT',
          body: JSON.stringify({ old_password, new_password })
        });
        pwdAlertBox.innerHTML = `<div class="alert alert-success">${res.message}</div>`;
        changePasswordForm.reset();
      } catch (err) {
        pwdAlertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      }
    });
  }

  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      userAlertBox.innerHTML = '';
      const fd = new FormData(addUserForm);
      const payload = {
        nama: fd.get('nama'),
        username: fd.get('username'),
        password: fd.get('password')
      };

      try {
        const res = await apiFetch('/api/auth/users', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        userAlertBox.innerHTML = `<div class="alert alert-success">${res.message}</div>`;
        addUserForm.reset();
        await loadAdminUsers();
      } catch (err) {
        userAlertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      }
    });
  }
})();



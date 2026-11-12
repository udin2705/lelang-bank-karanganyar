(function () {
  const breadcrumb = document.getElementById('breadcrumb');
  const detailWrap = document.getElementById('detailWrap');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    detailWrap.innerHTML = '<div class="empty-state">Aset tidak ditemukan.</div>';
    return;
  }

  function specRows(asset) {
    const lelangRows = asset.tipe_penjualan === 'lelang'
      ? `
        <tr><td>Tipe Penjualan</td><td>Lelang KPKNL</td></tr>
        <tr><td>Tanggal Lelang</td><td>${asset.tanggal_lelang ? formatTanggal(asset.tanggal_lelang) : 'Menunggu Jadwal KPKNL'}</td></tr>
        ${asset.link_lelang ? `<tr><td>Tautan Lelang</td><td><a href="${asset.link_lelang}" target="_blank" rel="noopener noreferrer" style="color:var(--primary); text-decoration:underline;">Buka di lelang.go.id &rarr;</a></td></tr>` : ''}
      `
      : `<tr><td>Tipe Penjualan</td><td>Pra-Lelang (Penjualan Sukarela / Damai)</td></tr>`;

    if (asset.kategori === 'kendaraan') {
      return `
        <table class="spec-table">
          ${lelangRows}
          <tr><td>Merk / Model</td><td>${asset.merk || '-'} ${asset.model || ''}</td></tr>
          <tr><td>Tahun</td><td>${asset.tahun || '-'}</td></tr>
          <tr><td>No. Polisi</td><td>${asset.no_polisi || '-'}</td></tr>
          <tr><td>Warna</td><td>${asset.warna || '-'}</td></tr>
          <tr><td>Spesifikasi Tambahan</td><td>${asset.spesifikasi || '-'}</td></tr>
        </table>`;
    }
    return `
      <table class="spec-table">
        ${lelangRows}
        <tr><td>Luas Tanah</td><td>${asset.luas_tanah || '-'} m&sup2;</td></tr>
        <tr><td>Luas Bangunan</td><td>${asset.luas_bangunan || '-'} m&sup2;</td></tr>
        <tr><td>Sertifikat</td><td>${asset.sertifikat || '-'}</td></tr>
        <tr><td>Spesifikasi Tambahan</td><td>${asset.spesifikasi || '-'}</td></tr>
      </table>`;
  }

  function render(asset) {
    document.title = `${asset.judul} - Portal BPR Bank Karanganyar`;

    breadcrumb.innerHTML = `
      <a href="/">Home</a>
      <span class="sep">&rsaquo;</span>
      <a href="/index.html?kategori=${asset.kategori}">${kategoriLabel(asset.kategori)}</a>
      <span class="sep">&rsaquo;</span>
      <span class="current">${asset.judul}</span>
    `;

    const images = asset.images && asset.images.length ? asset.images : [placeholderImage()];
    const thumbsHtml = images.slice(0, 4).map((img, idx) => {
      const isLast = idx === 3 && images.length > 4;
      return `<div class="thumb-item ${idx === 0 ? 'active' : ''} ${isLast ? 'more-overlay' : ''}" data-more="+${images.length - 4} foto" data-src="${img}" onclick="window.setMainImage(this,'${img}')">
        <img src="${img}" alt="Foto aset" onerror="this.src='${placeholderImage()}'">
      </div>`;
    }).join('');

    const kecLabel = asset.kecamatan ? `Kec. ${asset.kecamatan.replace(/^Kecamatan\s+/i, '')}` : '';
    const lokasi = [kecLabel, asset.kabupaten_kota, asset.provinsi].filter(Boolean).join(', ') || '-';
    const specSidebar = asset.kategori === 'kendaraan'
      ? `<div class="spec-item"><b>${asset.tahun || '-'}</b>Tahun</div><div class="divider"></div><div class="spec-item"><b>${asset.merk || '-'}</b>Merk</div>`
      : `<div class="spec-item"><b>LT ${asset.luas_tanah || '-'}</b>m&sup2;</div><div class="divider"></div><div class="spec-item"><b>LB ${asset.luas_bangunan || '-'}</b>m&sup2;</div>`;

    const rawPhone = String(asset.no_whatsapp || '081234567890').replace(/\D/g, '');
    const waPhone = rawPhone.startsWith('0')
      ? '62' + rawPhone.slice(1)
      : (rawPhone.startsWith('62') ? rawPhone : '62' + rawPhone);

    const isLelang = asset.tipe_penjualan === 'lelang';
    const isTerjual = asset.status === 'terjual';
    const lelangInfoHtml = isLelang
      ? `
        <div class="lelang-info-box">
          <div class="lelang-date-row">
            <span>&#128197; Tanggal Lelang:</span>
            <strong>${asset.tanggal_lelang ? formatTanggal(asset.tanggal_lelang) : 'Menunggu Jadwal KPKNL'}</strong>
          </div>
          ${asset.link_lelang ? `<a href="${asset.link_lelang}" target="_blank" rel="noopener noreferrer" class="btn-block btn-lelang">&#128279; Ikuti Lelang di lelang.go.id</a>` : ''}
        </div>
      `
      : '';

    detailWrap.innerHTML = `
      <div class="detail-layout">
        <div>
          <div class="gallery-main">
            <img id="mainImage" src="${images[0]}" alt="${asset.judul}" onerror="this.src='${placeholderImage()}'">
            ${isTerjual ? '<span class="badge-terjual">TERJUAL</span>' : ''}
          </div>
          <div class="gallery-thumbs">${thumbsHtml}</div>
        </div>

        <aside class="price-card">
          <div class="top">
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
              <span class="tag ${asset.tipe_penjualan}" style="margin-bottom:0;">${tipePenjualanLabel(asset.tipe_penjualan)}</span>
              <span class="status-pill ${asset.status}">${statusLabel(asset.status)}</span>
            </div>
            <p class="loc">${lokasi}</p>
            <h2>${asset.judul}</h2>
            <p class="kode">Kode Aset: ${asset.kode_aset}</p>
          </div>
          <div class="body">
            <span class="price-label">${hargaLabel(asset.tipe_penjualan)}</span>
            <p class="harga">${formatRupiah(asset.harga)}</p>
            ${lelangInfoHtml}
            <div class="spec-box">${specSidebar}</div>
            <a href="https://wa.me/${waPhone}?text=${encodeURIComponent('Saya tertarik dengan aset ' + asset.judul + ' (Kode: ' + asset.kode_aset + ')')}" target="_blank" rel="noopener noreferrer" class="btn-block btn-whatsapp">Hubungi Kami (WhatsApp)</a>
            <a href="tel:0271495489" class="btn-block btn-outline">(0271) 495-489</a>
            <p class="jam-op">Jam operasional: Senin-Jumat, 07.30-16.30 WIB</p>
          </div>
        </aside>
      </div>

      <div class="publish-bar">
        <span>Dipublikasikan pada ${formatTanggal(asset.created_at)} &middot; dikelola oleh Kantor Pusat Operasional</span>
        <span class="kategori-tag">${kategoriLabel(asset.kategori)}</span>
      </div>

      <div class="detail-tabs" id="detailTabs">
        <button class="active" data-tab="deskripsi">Deskripsi</button>
        <button data-tab="spesifikasi">Spesifikasi</button>
        <button data-tab="lokasi">Lokasi</button>
        ${asset.kategori !== 'kendaraan' ? '<button data-tab="fasilitas">Akses &amp; Fasilitas</button>' : ''}
      </div>
      <div class="detail-tab-content">
        <div class="detail-tab-pane active" data-pane="deskripsi">
          <h4>Deskripsi Aset</h4>
          <p class="text-block">${asset.deskripsi || 'Belum ada deskripsi untuk aset ini.'}</p>
        </div>
        <div class="detail-tab-pane" data-pane="spesifikasi">
          <h4>Spesifikasi Aset</h4>
          ${specRows(asset)}
        </div>
        <div class="detail-tab-pane" data-pane="lokasi">
          <h4>Lokasi Aset</h4>
          <p class="text-block">${asset.alamat || '-'}</p>
        </div>
        ${asset.kategori !== 'kendaraan' ? `
        <div class="detail-tab-pane" data-pane="fasilitas">
          <h4>Akses &amp; Fasilitas</h4>
          <p class="text-block">${asset.fasilitas || 'Tidak ada informasi fasilitas tambahan.'}</p>
        </div>` : ''}
      </div>
    `;

    document.getElementById('detailTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      document.querySelectorAll('#detailTabs button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.detail-tab-pane').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`.detail-tab-pane[data-pane="${btn.dataset.tab}"]`).classList.add('active');
    });
  }

  window.setMainImage = function (el, src) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.thumb-item').forEach((t) => t.classList.remove('active'));
    el.classList.add('active');
  };

  async function load() {
    try {
      const res = await apiFetch(`/api/assets/${id}`);
      render(res.data);
    } catch (err) {
      detailWrap.innerHTML = `<div class="empty-state">Aset tidak ditemukan atau terjadi kesalahan: ${err.message}</div>`;
    }
  }

  load();
})();


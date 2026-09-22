<?php
/**
 * Kelola galeri foto kegiatan
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$galat = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();

    if (input('aksi') === 'hapus') {
        $id = (int) input('id');
        $st = $pdo->prepare('SELECT gambar FROM galeri WHERE id = ?');
        $st->execute([$id]);
        hapus_berkas($st->fetchColumn() ?: null, 'galeri');
        $pdo->prepare('DELETE FROM galeri WHERE id = ?')->execute([$id]);
        set_flash('success', 'Foto berhasil dihapus dari galeri.');
        redirect('admin/galeri.php');
    }

    $judulFoto  = input('judul');
    $kategori   = input('kategori');
    $keterangan = input('keterangan');

    if ($judulFoto === '') {
        $galat[] = 'Judul foto wajib diisi.';
    }
    [$namaGambar, $galatGambar] = unggah_berkas($_FILES['gambar'] ?? [], 'galeri', ['jpg', 'jpeg', 'png']);
    if ($galatGambar) {
        $galat[] = $galatGambar;
    } elseif (!$namaGambar) {
        $galat[] = 'Foto wajib dipilih.';
    }

    if ($galat) {
        hapus_berkas($namaGambar, 'galeri');
        set_flash('danger', '<strong>Gagal menyimpan:</strong><ul class="mb-0 mt-1 ps-3"><li>'
                          . implode('</li><li>', array_map('e', $galat)) . '</li></ul>');
    } else {
        $pdo->prepare('INSERT INTO galeri (judul, kategori, gambar, keterangan) VALUES (?,?,?,?)')
            ->execute([$judulFoto, $kategori ?: null, $namaGambar, $keterangan ?: null]);
        set_flash('success', 'Foto berhasil ditambahkan ke galeri.');
    }
    redirect('admin/galeri.php');
}

$daftar = $pdo->query('SELECT * FROM galeri ORDER BY created_at DESC')->fetchAll();
$kategoriAda = $pdo->query("SELECT DISTINCT kategori FROM galeri WHERE kategori IS NOT NULL AND kategori <> ''")->fetchAll(PDO::FETCH_COLUMN);

$judul      = 'Kelola Galeri';
$menu_aktif = 'galeri';
require_once __DIR__ . '/includes/header.php';
?>

<div class="row g-3">
  <div class="col-lg-4">
    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-cloud-upload text-primary"></i><h2>Tambah Foto</h2></div>
      <div class="panel-isi">
        <form method="post" enctype="multipart/form-data" class="perlu-validasi" novalidate>
          <?= csrf_field() ?>
          <div class="mb-3">
            <label class="form-label" for="g-judul">Judul Foto <span class="wajib">*</span></label>
            <input type="text" class="form-control" id="g-judul" name="judul" required maxlength="160"
                   placeholder="Contoh: Kegiatan Pramuka 2026">
            <div class="invalid-feedback">Judul wajib diisi.</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="g-kategori">Kategori</label>
            <input type="text" class="form-control" id="g-kategori" name="kategori" maxlength="60"
                   list="daftarKategori" placeholder="Contoh: Ekstrakurikuler">
            <datalist id="daftarKategori">
              <?php foreach ($kategoriAda as $k): ?><option value="<?= e($k) ?>"><?php endforeach; ?>
            </datalist>
          </div>
          <div class="mb-3">
            <label class="form-label" for="g-gambar">Berkas Foto <span class="wajib">*</span></label>
            <input type="file" class="form-control" id="g-gambar" name="gambar" accept="image/jpeg,image/png" required>
            <div class="form-text">JPG atau PNG, maksimal 2 MB.</div>
            <div class="invalid-feedback">Foto wajib dipilih.</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="g-ket">Keterangan</label>
            <textarea class="form-control" id="g-ket" name="keterangan" rows="3" maxlength="300"></textarea>
          </div>
          <button class="btn btn-daftar w-100"><i class="bi bi-plus-lg me-2"></i>Unggah Foto</button>
        </form>
      </div>
    </div>
  </div>

  <div class="col-lg-8">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-images text-primary"></i><h2>Daftar Foto</h2>
        <span class="badge bg-light text-dark ms-auto"><?= count($daftar) ?> foto</span>
      </div>
      <div class="panel-isi">
        <?php if (!$daftar): ?>
          <div class="text-center text-muted py-5">
            <i class="bi bi-images fs-1 d-block mb-2 opacity-50"></i>Galeri masih kosong.
          </div>
        <?php else: ?>
          <div class="row g-3">
            <?php foreach ($daftar as $g): ?>
              <div class="col-6 col-md-4">
                <div class="border rounded-3 overflow-hidden h-100 d-flex flex-column">
                  <a href="<?= e(url_upload($g['gambar'], 'galeri')) ?>" target="_blank" rel="noopener">
                    <img src="<?= e(url_upload($g['gambar'], 'galeri')) ?>" alt="<?= e($g['judul']) ?>"
                         class="w-100" style="aspect-ratio:4/3;object-fit:cover">
                  </a>
                  <div class="p-2 flex-grow-1">
                    <div class="fw-semibold small"><?= e(potong($g['judul'], 40)) ?></div>
                    <?php if ($g['kategori']): ?>
                      <span class="badge bg-light text-dark" style="font-size:10px"><?= e($g['kategori']) ?></span>
                    <?php endif; ?>
                    <div class="text-muted" style="font-size:11px"><?= e(tgl_indo($g['created_at'])) ?></div>
                  </div>
                  <form method="post" class="p-2 pt-0">
                    <?= csrf_field() ?>
                    <input type="hidden" name="aksi" value="hapus">
                    <input type="hidden" name="id" value="<?= (int) $g['id'] ?>">
                    <button class="btn btn-sm btn-outline-danger w-100"
                            data-konfirmasi="Hapus foto &quot;<?= e($g['judul']) ?>&quot; dari galeri?">
                      <i class="bi bi-trash me-1"></i>Hapus
                    </button>
                  </form>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

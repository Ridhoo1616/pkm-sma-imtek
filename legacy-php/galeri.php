<?php
require_once __DIR__ . '/includes/functions.php';
$judul_halaman     = 'Galeri Kegiatan';
$deskripsi_halaman = 'Dokumentasi kegiatan peserta didik dan sekolah di ' . setting('nama_sekolah') . '.';
$halaman_aktif     = 'galeri';

$kategori = input('kategori', 'get', '');
$perHal   = 12;
$hal      = max(1, (int) input('hal', 'get', 1));

$where = $kategori !== '' ? 'WHERE kategori = ?' : '';
$par   = $kategori !== '' ? [$kategori] : [];

$st = $pdo->prepare("SELECT COUNT(*) FROM galeri $where");
$st->execute($par);
$total   = (int) $st->fetchColumn();
$halTot  = max(1, (int) ceil($total / $perHal));
$hal     = min($hal, $halTot);
$offset  = ($hal - 1) * $perHal;

$st = $pdo->prepare("SELECT * FROM galeri $where ORDER BY created_at DESC LIMIT $perHal OFFSET $offset");
$st->execute($par);
$galeri = $st->fetchAll();

$daftarKategori = $pdo->query("SELECT DISTINCT kategori FROM galeri WHERE kategori IS NOT NULL AND kategori <> '' ORDER BY kategori")->fetchAll(PDO::FETCH_COLUMN);
include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Galeri Kegiatan</h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item active" aria-current="page">Galeri</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <?php if ($daftarKategori): ?>
      <div class="d-flex flex-wrap gap-2 mb-4">
        <a href="galeri.php" class="btn btn-sm <?= $kategori === '' ? 'btn-primary' : 'btn-outline-primary' ?>">Semua</a>
        <?php foreach ($daftarKategori as $k): ?>
          <a href="galeri.php?kategori=<?= urlencode($k) ?>"
             class="btn btn-sm <?= $kategori === $k ? 'btn-primary' : 'btn-outline-primary' ?>"><?= e($k) ?></a>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <?php if (!$galeri): ?>
      <div class="alert alert-info">Belum ada foto pada galeri.</div>
    <?php else: ?>
      <div class="row g-3">
        <?php foreach ($galeri as $g): ?>
          <div class="col-6 col-md-4 col-lg-3">
            <div class="item-galeri" data-gambar="<?= e(url_upload($g['gambar'], 'galeri')) ?>" data-judul="<?= e($g['judul']) ?>">
              <img src="<?= e(url_upload($g['gambar'], 'galeri')) ?>" alt="<?= e($g['judul']) ?>" loading="lazy">
              <div class="tirai"><?= e($g['judul']) ?></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>

      <?php if ($halTot > 1): ?>
        <nav class="mt-5" aria-label="Navigasi halaman">
          <ul class="pagination justify-content-center">
            <?php for ($i = 1; $i <= $halTot; $i++): ?>
              <li class="page-item <?= $i === $hal ? 'active' : '' ?>">
                <a class="page-link" href="?hal=<?= $i ?><?= $kategori !== '' ? '&kategori=' . urlencode($kategori) : '' ?>"><?= $i ?></a>
              </li>
            <?php endfor; ?>
          </ul>
        </nav>
      <?php endif; ?>
    <?php endif; ?>
  </div>
</section>

<div class="modal fade" id="modalGaleri" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title"></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
      </div>
      <div class="modal-body p-0"><img src="" class="w-100" alt=""></div>
    </div>
  </div>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
require_once __DIR__ . '/includes/functions.php';
$judul_halaman     = 'Fasilitas Sekolah';
$deskripsi_halaman = 'Sarana dan prasarana pendukung pembelajaran di ' . setting('nama_sekolah') . '.';
$halaman_aktif     = 'fasilitas';
$fasilitas = $pdo->query('SELECT * FROM fasilitas ORDER BY urutan, id')->fetchAll();
include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Fasilitas Sekolah</h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item active" aria-current="page">Fasilitas</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <?php if (!$fasilitas): ?>
      <div class="alert alert-info">Data fasilitas belum tersedia.</div>
    <?php else: ?>
      <div class="row g-4">
        <?php foreach ($fasilitas as $f): ?>
          <div class="col-md-6 col-lg-4">
            <div class="kartu-berita">
              <?php if ($f['gambar']): ?>
                <img class="gambar" src="<?= e(url_upload($f['gambar'], 'galeri')) ?>" alt="<?= e($f['nama']) ?>" loading="lazy">
              <?php endif; ?>
              <div class="isi">
                <div class="kartu-ikon"><i class="bi <?= e($f['icon'] ?: 'bi-building') ?>"></i></div>
                <h5><?= e($f['nama']) ?></h5>
                <p class="small text-muted mb-0"><?= nl2br(e($f['deskripsi'])) ?></p>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

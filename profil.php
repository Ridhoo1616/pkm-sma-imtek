<?php
require_once __DIR__ . '/includes/functions.php';
$judul_halaman     = 'Profil Sekolah';
$deskripsi_halaman = 'Sejarah, visi, misi, dan identitas ' . setting('nama_sekolah') . '.';
$halaman_aktif     = 'profil';
$jurusan = $pdo->query('SELECT * FROM jurusan WHERE aktif = 1 ORDER BY urutan')->fetchAll();
include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Profil Sekolah</h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item active" aria-current="page">Profil</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <div class="row g-5">
      <div class="col-lg-8">
        <h2 class="h4 mb-3"><i class="bi bi-book text-primary me-2"></i>Sejarah Singkat</h2>
        <p class="text-muted"><?= nl2br(e(setting('sejarah'))) ?></p>

        <h2 class="h4 mt-5 mb-3"><i class="bi bi-chat-quote text-primary me-2"></i>Sambutan Kepala Sekolah</h2>
        <blockquote class="border-start border-4 border-primary ps-3 text-muted fst-italic">
          <?= nl2br(e(setting('sambutan'))) ?>
        </blockquote>
        <p class="fw-bold mb-0"><?= e(setting('kepala_sekolah')) ?></p>
        <p class="small text-muted">Kepala <?= e(setting('nama_sekolah')) ?></p>

        <h2 class="h4 mt-5 mb-3"><i class="bi bi-bullseye text-primary me-2"></i>Visi</h2>
        <div class="kartu bg-light border-0">
          <p class="mb-0 fs-5 fst-italic">&ldquo;<?= e(setting('visi')) ?>&rdquo;</p>
        </div>

        <h2 class="h4 mt-5 mb-3"><i class="bi bi-list-check text-primary me-2"></i>Misi</h2>
        <ol class="d-grid gap-2 ps-3">
          <?php foreach (setting_list('misi') as $m): ?>
            <li class="text-muted"><?= e($m) ?></li>
          <?php endforeach; ?>
        </ol>

        <?php if ($jurusan): ?>
        <h2 class="h4 mt-5 mb-3"><i class="bi bi-mortarboard text-primary me-2"></i>Peminatan</h2>
        <div class="row g-3">
          <?php foreach ($jurusan as $j): ?>
            <div class="col-md-6">
              <div class="kartu h-100">
                <div class="kartu-ikon"><i class="bi <?= e($j['icon'] ?: 'bi-mortarboard') ?>"></i></div>
                <h5><?= e($j['nama']) ?></h5>
                <p><?= e($j['deskripsi']) ?></p>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>
      </div>

      <div class="col-lg-4">
        <div class="kartu-form position-sticky" style="top:100px">
          <h5 class="mb-3"><i class="bi bi-info-circle text-primary me-2"></i>Identitas Sekolah</h5>
          <table class="table table-sm mb-4">
            <tbody class="small">
              <tr><th class="text-muted fw-normal">Nama</th><td class="fw-semibold"><?= e(setting('nama_sekolah')) ?></td></tr>
              <tr><th class="text-muted fw-normal">NPSN</th><td class="fw-semibold"><?= e(setting('npsn')) ?></td></tr>
              <tr><th class="text-muted fw-normal">Akreditasi</th><td class="fw-semibold"><?= e(setting('akreditasi')) ?></td></tr>
              <tr><th class="text-muted fw-normal">Status</th><td class="fw-semibold"><?= e(setting('status_sekolah', '-')) ?></td></tr>
              <tr><th class="text-muted fw-normal">Kepala Sekolah</th><td class="fw-semibold"><?= e(setting('kepala_sekolah')) ?></td></tr>
              <tr><th class="text-muted fw-normal">Alamat</th><td class="fw-semibold"><?= e(setting('alamat')) ?></td></tr>
              <tr><th class="text-muted fw-normal">Telepon</th><td class="fw-semibold"><?= e(setting('telepon')) ?></td></tr>
              <tr><th class="text-muted fw-normal">Email</th><td class="fw-semibold"><?= e(setting('email')) ?></td></tr>
              <tr><th class="text-muted fw-normal">Jam Layanan</th><td class="fw-semibold"><?= e(setting('jam_operasional')) ?></td></tr>
            </tbody>
          </table>
          <a href="<?= e(BASE_URL) ?>ppdb-daftar.php" class="btn btn-daftar w-100">
            <i class="bi bi-person-plus me-2"></i>Daftar PPDB Online
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

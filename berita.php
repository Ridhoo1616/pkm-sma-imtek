<?php
require_once __DIR__ . '/includes/functions.php';
$judul_halaman     = 'Berita & Pengumuman';
$deskripsi_halaman = 'Berita, pengumuman, dan prestasi terbaru dari ' . setting('nama_sekolah') . '.';
$halaman_aktif     = 'berita';

$cari     = input('cari', 'get', '');
$kategori = input('kategori', 'get', '');
$perHal   = 6;
$hal      = max(1, (int) input('hal', 'get', 1));

$syarat = ['publish = 1'];
$par    = [];
if ($cari !== '') {
    $syarat[] = '(judul LIKE ? OR isi LIKE ?)';
    $par[] = '%' . $cari . '%';
    $par[] = '%' . $cari . '%';
}
if ($kategori !== '') {
    $syarat[] = 'kategori = ?';
    $par[] = $kategori;
}
$where = 'WHERE ' . implode(' AND ', $syarat);

$st = $pdo->prepare("SELECT COUNT(*) FROM berita $where");
$st->execute($par);
$total  = (int) $st->fetchColumn();
$halTot = max(1, (int) ceil($total / $perHal));
$hal    = min($hal, $halTot);
$offset = ($hal - 1) * $perHal;

$st = $pdo->prepare("SELECT * FROM berita $where ORDER BY created_at DESC LIMIT $perHal OFFSET $offset");
$st->execute($par);
$berita = $st->fetchAll();

$populer = $pdo->query('SELECT judul, slug, dibaca, created_at FROM berita WHERE publish = 1 ORDER BY dibaca DESC LIMIT 5')->fetchAll();
$queryLain = fn(array $ubah) => '?' . http_build_query(array_filter(array_merge(
    ['cari' => $cari, 'kategori' => $kategori, 'hal' => $hal], $ubah
), fn($v) => $v !== '' && $v !== null));

include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Berita &amp; Pengumuman</h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item active" aria-current="page">Berita</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <div class="row g-5">
      <div class="col-lg-8">
        <?php if ($cari !== '' || $kategori !== ''): ?>
          <p class="text-muted small">Menampilkan <?= $total ?> hasil
            <?= $cari !== '' ? 'untuk pencarian "' . e($cari) . '"' : '' ?>
            <?= $kategori !== '' ? 'pada kategori ' . e($kategori) : '' ?>.
            <a href="berita.php">Reset</a>
          </p>
        <?php endif; ?>

        <?php if (!$berita): ?>
          <div class="alert alert-info">Belum ada berita yang sesuai.</div>
        <?php else: ?>
          <div class="row g-4">
            <?php foreach ($berita as $b): ?>
              <div class="col-md-6">
                <article class="kartu-berita">
                  <img class="gambar" src="<?= e(url_upload($b['gambar'], 'berita')) ?>" alt="<?= e($b['judul']) ?>" loading="lazy">
                  <div class="isi">
                    <span class="label-kategori mb-2"><?= e($b['kategori']) ?></span>
                    <h5><a href="berita-detail.php?slug=<?= e($b['slug']) ?>"><?= e($b['judul']) ?></a></h5>
                    <p class="small text-muted flex-grow-1"><?= e(potong($b['ringkasan'] ?: $b['isi'], 120)) ?></p>
                    <div class="small text-muted border-top pt-2 d-flex justify-content-between">
                      <span><i class="bi bi-calendar3 me-1"></i><?= e(tgl_indo($b['created_at'])) ?></span>
                      <span><i class="bi bi-eye me-1"></i><?= (int) $b['dibaca'] ?></span>
                    </div>
                  </div>
                </article>
              </div>
            <?php endforeach; ?>
          </div>

          <?php if ($halTot > 1): ?>
            <nav class="mt-5" aria-label="Navigasi halaman">
              <ul class="pagination justify-content-center">
                <li class="page-item <?= $hal <= 1 ? 'disabled' : '' ?>">
                  <a class="page-link" href="<?= e($queryLain(['hal' => $hal - 1])) ?>">Sebelumnya</a>
                </li>
                <?php for ($i = 1; $i <= $halTot; $i++): ?>
                  <li class="page-item <?= $i === $hal ? 'active' : '' ?>">
                    <a class="page-link" href="<?= e($queryLain(['hal' => $i])) ?>"><?= $i ?></a>
                  </li>
                <?php endfor; ?>
                <li class="page-item <?= $hal >= $halTot ? 'disabled' : '' ?>">
                  <a class="page-link" href="<?= e($queryLain(['hal' => $hal + 1])) ?>">Berikutnya</a>
                </li>
              </ul>
            </nav>
          <?php endif; ?>
        <?php endif; ?>
      </div>

      <aside class="col-lg-4">
        <div class="kartu-form mb-4">
          <h6 class="mb-3"><i class="bi bi-search text-primary me-2"></i>Cari Berita</h6>
          <form method="get" action="berita.php" class="d-flex gap-2">
            <input type="search" name="cari" class="form-control" placeholder="Kata kunci..." value="<?= e($cari) ?>">
            <button class="btn btn-daftar"><i class="bi bi-search"></i></button>
          </form>
        </div>

        <div class="kartu-form mb-4">
          <h6 class="mb-3"><i class="bi bi-tags text-primary me-2"></i>Kategori</h6>
          <div class="d-grid gap-2">
            <?php foreach (['Berita', 'Pengumuman', 'Prestasi', 'Kegiatan'] as $k):
              $c = $pdo->prepare('SELECT COUNT(*) FROM berita WHERE publish = 1 AND kategori = ?');
              $c->execute([$k]); ?>
              <a class="d-flex justify-content-between align-items-center text-decoration-none <?= $kategori === $k ? 'fw-bold text-primary' : 'text-dark' ?>"
                 href="berita.php?kategori=<?= urlencode($k) ?>">
                <span><i class="bi bi-chevron-right small me-1"></i><?= e($k) ?></span>
                <span class="badge bg-light text-dark"><?= (int) $c->fetchColumn() ?></span>
              </a>
            <?php endforeach; ?>
          </div>
        </div>

        <?php if ($populer): ?>
        <div class="kartu-form mb-4">
          <h6 class="mb-3"><i class="bi bi-fire text-primary me-2"></i>Paling Banyak Dibaca</h6>
          <ol class="ps-3 d-grid gap-2 mb-0 small">
            <?php foreach ($populer as $p): ?>
              <li><a class="text-dark text-decoration-none" href="berita-detail.php?slug=<?= e($p['slug']) ?>"><?= e($p['judul']) ?></a>
                <span class="d-block text-muted" style="font-size:12px"><?= e(tgl_indo($p['created_at'])) ?></span></li>
            <?php endforeach; ?>
          </ol>
        </div>
        <?php endif; ?>

        <div class="kartu-form text-center bg-primary text-white border-0">
          <i class="bi bi-person-plus fs-1"></i>
          <h6 class="text-white mt-2">PPDB <?= e(setting('ppdb_tahun')) ?></h6>
          <p class="small opacity-90"><?= ppdb_dibuka() ? 'Pendaftaran sedang dibuka.' : 'Pendaftaran belum dibuka.' ?></p>
          <a href="<?= e(BASE_URL) ?>ppdb-daftar.php" class="btn btn-emas w-100">Daftar Sekarang</a>
        </div>
      </aside>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

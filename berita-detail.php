<?php
require_once __DIR__ . '/includes/functions.php';

$slug = input('slug', 'get', '');
$st = $pdo->prepare('SELECT * FROM berita WHERE slug = ? AND publish = 1');
$st->execute([$slug]);
$b = $st->fetch();

if (!$b) {
    http_response_code(404);
    $judul_halaman = 'Berita Tidak Ditemukan';
    $halaman_aktif = 'berita';
    include __DIR__ . '/includes/header.php';
    echo '<section class="bagian"><div class="container text-center py-5">'
       . '<i class="bi bi-file-earmark-x display-1 text-muted"></i>'
       . '<h1 class="h3 mt-3">Berita tidak ditemukan</h1>'
       . '<p class="text-muted">Tautan mungkin salah atau berita telah dihapus.</p>'
       . '<a href="' . e(BASE_URL) . 'berita.php" class="btn btn-daftar mt-2">Kembali ke Daftar Berita</a>'
       . '</div></section>';
    include __DIR__ . '/includes/footer.php';
    exit;
}

// Tambah penghitung dibaca (sekali per sesi per artikel)
if (empty($_SESSION['dibaca'][$b['id']])) {
    $pdo->prepare('UPDATE berita SET dibaca = dibaca + 1 WHERE id = ?')->execute([$b['id']]);
    $_SESSION['dibaca'][$b['id']] = true;
    $b['dibaca']++;
}

$judul_halaman     = $b['judul'];
$deskripsi_halaman = $b['ringkasan'] ?: potong($b['isi'], 155);
$halaman_aktif     = 'berita';

$lain = $pdo->prepare('SELECT judul, slug, gambar, created_at FROM berita WHERE publish = 1 AND id <> ? ORDER BY created_at DESC LIMIT 3');
$lain->execute([$b['id']]);
$lain = $lain->fetchAll();

$urlIni = BASE_URL . 'berita-detail.php?slug=' . $b['slug'];
include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <span class="badge bg-warning text-dark mb-2"><?= e($b['kategori']) ?></span>
    <h1><?= e($b['judul']) ?></h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>berita.php">Berita</a></li>
        <li class="breadcrumb-item active" aria-current="page">Detail</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <div class="row g-5">
      <div class="col-lg-8">
        <div class="d-flex flex-wrap gap-3 small text-muted mb-3">
          <span><i class="bi bi-calendar3 me-1"></i><?= e(tgl_indo($b['created_at'], true)) ?></span>
          <?php if ($b['penulis']): ?><span><i class="bi bi-person me-1"></i><?= e($b['penulis']) ?></span><?php endif; ?>
          <span><i class="bi bi-eye me-1"></i><?= (int) $b['dibaca'] ?> kali dibaca</span>
        </div>

        <?php if ($b['gambar']): ?>
          <img class="w-100 rounded-4 mb-4" src="<?= e(url_upload($b['gambar'], 'berita')) ?>" alt="<?= e($b['judul']) ?>">
        <?php endif; ?>

        <?php if ($b['ringkasan']): ?>
          <p class="lead"><?= e($b['ringkasan']) ?></p>
        <?php endif; ?>

        <div class="fs-6 lh-lg text-secondary">
          <?php foreach (preg_split('/\n\s*\n/', trim($b['isi'])) as $paragraf): ?>
            <p><?= nl2br(e(trim($paragraf))) ?></p>
          <?php endforeach; ?>
        </div>

        <div class="border-top pt-4 mt-4 d-flex flex-wrap align-items-center gap-2">
          <span class="fw-semibold me-2"><i class="bi bi-share me-1"></i>Bagikan:</span>
          <a class="btn btn-sm btn-success" target="_blank" rel="noopener"
             href="https://wa.me/?text=<?= rawurlencode($b['judul'] . ' - ' . $urlIni) ?>"><i class="bi bi-whatsapp me-1"></i>WhatsApp</a>
          <a class="btn btn-sm btn-primary" target="_blank" rel="noopener"
             href="https://www.facebook.com/sharer/sharer.php?u=<?= rawurlencode($urlIni) ?>"><i class="bi bi-facebook me-1"></i>Facebook</a>
          <a class="btn btn-sm btn-info text-white" target="_blank" rel="noopener"
             href="https://t.me/share/url?url=<?= rawurlencode($urlIni) ?>&text=<?= rawurlencode($b['judul']) ?>"><i class="bi bi-telegram me-1"></i>Telegram</a>
          <a class="btn btn-sm btn-outline-secondary ms-auto" href="<?= e(BASE_URL) ?>berita.php">
            <i class="bi bi-arrow-left me-1"></i>Semua Berita
          </a>
        </div>
      </div>

      <aside class="col-lg-4">
        <?php if ($lain): ?>
        <div class="kartu-form mb-4">
          <h6 class="mb-3"><i class="bi bi-newspaper text-primary me-2"></i>Berita Lainnya</h6>
          <div class="d-grid gap-3">
            <?php foreach ($lain as $l): ?>
              <a class="d-flex gap-3 text-decoration-none" href="berita-detail.php?slug=<?= e($l['slug']) ?>">
                <img src="<?= e(url_upload($l['gambar'], 'berita')) ?>" alt="" width="78" height="60"
                     class="rounded object-fit-cover flex-shrink-0" style="object-fit:cover">
                <span class="small">
                  <span class="d-block text-dark fw-semibold lh-sm"><?= e(potong($l['judul'], 62)) ?></span>
                  <span class="text-muted" style="font-size:12px"><?= e(tgl_indo($l['created_at'])) ?></span>
                </span>
              </a>
            <?php endforeach; ?>
          </div>
        </div>
        <?php endif; ?>

        <div class="kartu-form text-center bg-primary text-white border-0">
          <i class="bi bi-person-plus fs-1"></i>
          <h6 class="text-white mt-2">PPDB <?= e(setting('ppdb_tahun')) ?></h6>
          <p class="small opacity-90 mb-3">Daftar online, gratis, dan dapat dipantau kapan saja.</p>
          <a href="<?= e(BASE_URL) ?>ppdb-daftar.php" class="btn btn-emas w-100">Daftar Sekarang</a>
        </div>
      </aside>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

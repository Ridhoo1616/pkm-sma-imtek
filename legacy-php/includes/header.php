<?php
/**
 * Layout bagian atas halaman publik
 * Variabel opsional: $judul_halaman, $deskripsi_halaman, $halaman_aktif
 */
require_once __DIR__ . '/functions.php';

$judul_halaman      = $judul_halaman      ?? setting('nama_sekolah');
$deskripsi_halaman  = $deskripsi_halaman  ?? setting('tagline');
$halaman_aktif      = $halaman_aktif      ?? '';

catat_kunjungan($pdo, basename($_SERVER['SCRIPT_NAME'], '.php'));

$menu = [
    'home'     => ['Beranda',    'index.php'],
    'profil'   => ['Profil',     'profil.php'],
    'fasilitas'=> ['Fasilitas',  'fasilitas.php'],
    'berita'   => ['Berita',     'berita.php'],
    'galeri'   => ['Galeri',     'galeri.php'],
    'kontak'   => ['Kontak',     'kontak.php'],
];
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($judul_halaman) ?> &mdash; <?= e(setting('nama_sekolah')) ?></title>

<meta name="description" content="<?= e(potong($deskripsi_halaman, 155)) ?>">
<meta name="keywords" content="<?= e(setting('nama_sekolah')) ?>, PPDB <?= e(setting('ppdb_tahun')) ?>, pendaftaran siswa baru, SMA, profil sekolah">
<meta name="author" content="<?= e(setting('nama_sekolah')) ?>">
<meta name="robots" content="index, follow">
<link rel="canonical" href="<?= e(BASE_URL . basename($_SERVER['REQUEST_URI'])) ?>">

<!-- Open Graph: tampilan saat tautan dibagikan ke WhatsApp / media sosial -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="<?= e(setting('nama_sekolah')) ?>">
<meta property="og:title"       content="<?= e($judul_halaman) ?>">
<meta property="og:description" content="<?= e(potong($deskripsi_halaman, 155)) ?>">
<meta property="og:image"       content="<?= e(BASE_URL) ?>assets/img/logo.svg">
<meta name="twitter:card"       content="summary_large_image">

<link rel="icon" href="<?= e(BASE_URL) ?>assets/img/logo.svg" type="image/svg+xml">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="<?= e(BASE_URL) ?>assets/css/style.css" rel="stylesheet">
</head>
<body>

<!-- Bar informasi atas -->
<div class="topbar d-none d-lg-block">
  <div class="container d-flex justify-content-between align-items-center">
    <div class="d-flex gap-4 small">
      <span><i class="bi bi-geo-alt me-1"></i><?= e(setting('alamat')) ?></span>
      <span><i class="bi bi-telephone me-1"></i><?= e(setting('telepon')) ?></span>
      <span><i class="bi bi-envelope me-1"></i><?= e(setting('email')) ?></span>
    </div>
    <div class="d-flex gap-3 align-items-center small">
      <?php if (setting('instagram')): ?><a href="<?= e(setting('instagram')) ?>" target="_blank" rel="noopener" aria-label="Instagram"><i class="bi bi-instagram"></i></a><?php endif; ?>
      <?php if (setting('facebook')): ?><a href="<?= e(setting('facebook')) ?>" target="_blank" rel="noopener" aria-label="Facebook"><i class="bi bi-facebook"></i></a><?php endif; ?>
      <?php if (setting('youtube')): ?><a href="<?= e(setting('youtube')) ?>" target="_blank" rel="noopener" aria-label="YouTube"><i class="bi bi-youtube"></i></a><?php endif; ?>
      <?php if (setting('tiktok')): ?><a href="<?= e(setting('tiktok')) ?>" target="_blank" rel="noopener" aria-label="TikTok"><i class="bi bi-tiktok"></i></a><?php endif; ?>
      <a href="<?= e(BASE_URL) ?>admin/login.php"><i class="bi bi-person-lock me-1"></i>Login Admin</a>
    </div>
  </div>
</div>

<!-- Navigasi utama -->
<nav class="navbar navbar-expand-lg navbar-utama sticky-top">
  <div class="container">
    <a class="navbar-brand d-flex align-items-center gap-2" href="<?= e(BASE_URL) ?>index.php">
      <img src="<?= e(BASE_URL) ?>assets/img/logo.svg" alt="Logo <?= e(setting('nama_sekolah')) ?>" height="46">
      <span class="brand-text">
        <strong><?= e(setting('nama_sekolah')) ?></strong>
        <small>Akreditasi <?= e(setting('akreditasi')) ?> &middot; NPSN <?= e(setting('npsn')) ?></small>
      </span>
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuUtama" aria-controls="menuUtama" aria-expanded="false" aria-label="Buka menu">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="menuUtama">
      <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1">
        <?php foreach ($menu as $kunci => [$label, $tautan]): ?>
          <li class="nav-item">
            <a class="nav-link <?= $halaman_aktif === $kunci ? 'active' : '' ?>" href="<?= e(BASE_URL . $tautan) ?>"><?= e($label) ?></a>
          </li>
        <?php endforeach; ?>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle <?= in_array($halaman_aktif, ['ppdb', 'daftar', 'cek'], true) ? 'active' : '' ?>"
             href="#" role="button" data-bs-toggle="dropdown">PPDB Online</a>
          <ul class="dropdown-menu dropdown-menu-end shadow">
            <li><a class="dropdown-item" href="<?= e(BASE_URL) ?>ppdb.php"><i class="bi bi-info-circle me-2"></i>Informasi PPDB</a></li>
            <li><a class="dropdown-item" href="<?= e(BASE_URL) ?>ppdb-daftar.php"><i class="bi bi-pencil-square me-2"></i>Formulir Pendaftaran</a></li>
            <li><a class="dropdown-item" href="<?= e(BASE_URL) ?>ppdb-cek.php"><i class="bi bi-search me-2"></i>Cek Status Pendaftaran</a></li>
          </ul>
        </li>
        <li class="nav-item ms-lg-2">
          <a class="btn btn-daftar" href="<?= e(BASE_URL) ?>ppdb-daftar.php">
            <i class="bi bi-person-plus me-1"></i>Daftar Sekarang
          </a>
        </li>
      </ul>
    </div>
  </div>
</nav>

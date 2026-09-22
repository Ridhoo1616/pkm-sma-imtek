<?php
/**
 * Layout atas panel admin (sidebar + topbar)
 * Variabel opsional: $judul, $menu_aktif, $aksi_kanan
 */
require_once __DIR__ . '/auth.php';
wajib_login();

$judul      = $judul      ?? 'Dashboard';
$menu_aktif = $menu_aktif ?? '';

// Penanda jumlah untuk lonceng notifikasi
$belumVerifikasi = (int) $pdo->query("SELECT COUNT(*) FROM pendaftar WHERE status = 'Menunggu Verifikasi'")->fetchColumn();
$pesanBaru       = (int) $pdo->query('SELECT COUNT(*) FROM pesan WHERE dibaca = 0')->fetchColumn();

$menuSidebar = [
    ['Utama', null, null, null],
    ['Dashboard',        'index.php',       'bi-speedometer2', 'dashboard'],
    ['PPDB', null, null, null],
    ['Data Pendaftar',   'pendaftar.php',   'bi-people',       'pendaftar'],
    ['Laporan & Statistik', 'laporan.php',  'bi-graph-up',     'laporan'],
    ['Peminatan',        'jurusan.php',     'bi-mortarboard',  'jurusan'],
    ['Konten Website', null, null, null],
    ['Berita',           'berita.php',      'bi-newspaper',    'berita'],
    ['Galeri',           'galeri.php',      'bi-images',       'galeri'],
    ['Fasilitas',        'fasilitas.php',   'bi-building',     'fasilitas'],
    ['Pesan Masuk',      'pesan.php',       'bi-envelope',     'pesan'],
    ['Sistem', null, null, null],
    ['Pengaturan',       'pengaturan.php',  'bi-gear',         'pengaturan'],
    ['Akun Pengguna',    'pengguna.php',    'bi-person-badge', 'pengguna'],
];
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($judul) ?> &mdash; Admin <?= e(setting('nama_sekolah')) ?></title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="<?= e(BASE_URL) ?>assets/img/logo.svg" type="image/svg+xml">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="<?= e(BASE_URL) ?>assets/css/style.css" rel="stylesheet">
<link href="<?= e(BASE_URL) ?>assets/css/admin.css" rel="stylesheet">
</head>
<body>
<div class="tata-admin">

  <!-- ============ SIDEBAR ============ -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-kepala">
      <img src="<?= e(BASE_URL) ?>assets/img/logo.svg" alt="Logo" height="38">
      <div>
        <strong>Panel Admin</strong>
        <small><?= e(setting('nama_sekolah')) ?></small>
      </div>
      <button class="btn btn-sm text-white d-lg-none ms-auto" id="tutupSidebar" aria-label="Tutup menu">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <nav class="sidebar-menu">
      <?php foreach ($menuSidebar as [$label, $tautan, $ikon, $kunci]):
        if ($tautan === null): ?>
          <div class="menu-grup"><?= e($label) ?></div>
        <?php else: ?>
          <a href="<?= e($tautan) ?>" class="<?= $menu_aktif === $kunci ? 'aktif' : '' ?>">
            <i class="bi <?= $ikon ?>"></i><span><?= e($label) ?></span>
            <?php if ($kunci === 'pendaftar' && $belumVerifikasi): ?>
              <span class="badge bg-warning text-dark ms-auto"><?= $belumVerifikasi ?></span>
            <?php elseif ($kunci === 'pesan' && $pesanBaru): ?>
              <span class="badge bg-danger ms-auto"><?= $pesanBaru ?></span>
            <?php endif; ?>
          </a>
        <?php endif;
      endforeach; ?>
    </nav>

    <div class="sidebar-kaki">
      <a href="<?= e(BASE_URL) ?>index.php" target="_blank"><i class="bi bi-box-arrow-up-right me-2"></i>Lihat Website</a>
      <a href="logout.php" class="text-warning"><i class="bi bi-box-arrow-right me-2"></i>Keluar</a>
    </div>
  </aside>

  <!-- ============ AREA UTAMA ============ -->
  <div class="isi-admin">
    <header class="topbar-admin">
      <button class="btn btn-sm btn-light d-lg-none" id="bukaSidebar" aria-label="Buka menu">
        <i class="bi bi-list fs-5"></i>
      </button>
      <div>
        <h1 class="h5 mb-0"><?= e($judul) ?></h1>
        <small class="text-muted"><?= e(tgl_indo(date('Y-m-d'))) ?></small>
      </div>

      <div class="ms-auto d-flex align-items-center gap-2">
        <div class="dropdown">
          <button class="btn btn-light position-relative" data-bs-toggle="dropdown" aria-label="Notifikasi">
            <i class="bi bi-bell"></i>
            <?php if ($belumVerifikasi + $pesanBaru > 0): ?>
              <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                <?= $belumVerifikasi + $pesanBaru ?>
              </span>
            <?php endif; ?>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow" style="min-width:280px">
            <li class="dropdown-header">Notifikasi</li>
            <?php if ($belumVerifikasi): ?>
              <li><a class="dropdown-item small" href="pendaftar.php?status=Menunggu+Verifikasi">
                <i class="bi bi-person-exclamation text-warning me-2"></i>
                <?= $belumVerifikasi ?> pendaftar menunggu verifikasi</a></li>
            <?php endif; ?>
            <?php if ($pesanBaru): ?>
              <li><a class="dropdown-item small" href="pesan.php">
                <i class="bi bi-envelope-exclamation text-danger me-2"></i>
                <?= $pesanBaru ?> pesan baru belum dibaca</a></li>
            <?php endif; ?>
            <?php if (!$belumVerifikasi && !$pesanBaru): ?>
              <li><span class="dropdown-item-text small text-muted">Tidak ada notifikasi baru.</span></li>
            <?php endif; ?>
          </ul>
        </div>

        <div class="dropdown">
          <button class="btn btn-light d-flex align-items-center gap-2" data-bs-toggle="dropdown">
            <span class="avatar-admin"><?= e(strtoupper(mb_substr(admin_nama(), 0, 1))) ?></span>
            <span class="d-none d-sm-inline small text-start">
              <strong class="d-block lh-1"><?= e(admin_nama()) ?></strong>
              <small class="text-muted text-capitalize"><?= e(admin_role()) ?></small>
            </span>
            <i class="bi bi-chevron-down small"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow">
            <li><a class="dropdown-item" href="pengguna.php?aksi=akun"><i class="bi bi-person-gear me-2"></i>Akun Saya</a></li>
            <li><a class="dropdown-item" href="<?= e(BASE_URL) ?>index.php" target="_blank"><i class="bi bi-globe me-2"></i>Lihat Website</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="logout.php"><i class="bi bi-box-arrow-right me-2"></i>Keluar</a></li>
          </ul>
        </div>
      </div>
    </header>

    <main class="konten-admin">
      <?= tampil_flash() ?>

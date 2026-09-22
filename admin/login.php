<?php
/**
 * Halaman masuk panel admin / panitia PPDB
 */
require_once __DIR__ . '/includes/auth.php';

if (sudah_login()) {
    redirect('admin/index.php');
}

$galat = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $username = input('username');
    $password = (string) input('password');

    // Pembatasan percobaan masuk: maksimal 5 kali dalam 10 menit
    $_SESSION['gagal_login'] = array_values(array_filter(
        $_SESSION['gagal_login'] ?? [],
        fn($t) => $t > time() - 600
    ));

    if (count($_SESSION['gagal_login']) >= 5) {
        $galat = 'Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam 10 menit.';
    } elseif ($username === '' || $password === '') {
        $galat = 'Nama pengguna dan kata sandi wajib diisi.';
    } else {
        $st = $pdo->prepare('SELECT * FROM users WHERE username = ?');
        $st->execute([$username]);
        $u = $st->fetch();

        if ($u && password_verify($password, $u['password'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id']    = (int) $u['id'];
            $_SESSION['admin_nama']  = $u['nama'];
            $_SESSION['admin_role']  = $u['role'];
            $_SESSION['admin_aktif'] = time();
            unset($_SESSION['gagal_login']);

            $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$u['id']]);

            $tujuan = $_SESSION['tujuan_setelah_login'] ?? '';
            unset($_SESSION['tujuan_setelah_login']);
            set_flash('success', 'Selamat datang kembali, <strong>' . e($u['nama']) . '</strong>.');
            redirect($tujuan && strpos($tujuan, 'login.php') === false ? $tujuan : 'admin/index.php');
        }

        $_SESSION['gagal_login'][] = time();
        $sisa  = max(0, 5 - count($_SESSION['gagal_login']));
        $galat = 'Nama pengguna atau kata sandi salah.' . ($sisa <= 2 ? ' Sisa percobaan: ' . $sisa . '.' : '');
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Masuk Panel Admin &mdash; <?= e(setting('nama_sekolah')) ?></title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="<?= e(BASE_URL) ?>assets/img/logo.svg" type="image/svg+xml">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link href="<?= e(BASE_URL) ?>assets/css/style.css" rel="stylesheet">
<style>
  body { min-height: 100vh; display: grid; place-items: center;
         background: linear-gradient(135deg, #0c3a69, #12508f 60%, #1b6cbd); padding: 24px; }
  .kotak-login { width: 100%; max-width: 420px; background: #fff; border-radius: 16px;
                 box-shadow: 0 20px 60px rgba(0,0,0,.28); padding: 34px 30px; }
</style>
</head>
<body>
<div class="kotak-login">
  <div class="text-center mb-4">
    <img src="<?= e(BASE_URL) ?>assets/img/logo.svg" alt="Logo" height="64">
    <h1 class="h5 mt-3 mb-1">Panel Admin PPDB</h1>
    <p class="text-muted small mb-0"><?= e(setting('nama_sekolah')) ?></p>
  </div>

  <?= tampil_flash() ?>
  <?php if ($galat): ?>
    <div class="alert alert-danger small"><i class="bi bi-exclamation-circle me-1"></i><?= e($galat) ?></div>
  <?php endif; ?>

  <form method="post" class="perlu-validasi" novalidate>
    <?= csrf_field() ?>
    <div class="mb-3">
      <label class="form-label" for="l-user">Nama Pengguna</label>
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-person"></i></span>
        <input type="text" class="form-control" id="l-user" name="username" required autofocus
               autocomplete="username" value="<?= e(input('username')) ?>">
      </div>
      <div class="invalid-feedback">Nama pengguna wajib diisi.</div>
    </div>
    <div class="mb-3">
      <label class="form-label" for="l-pass">Kata Sandi</label>
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-lock"></i></span>
        <input type="password" class="form-control" id="l-pass" name="password" required autocomplete="current-password">
        <button class="btn btn-outline-secondary" type="button" id="lihatSandi" aria-label="Tampilkan kata sandi">
          <i class="bi bi-eye"></i>
        </button>
      </div>
      <div class="invalid-feedback">Kata sandi wajib diisi.</div>
    </div>
    <button class="btn btn-daftar w-100 py-2"><i class="bi bi-box-arrow-in-right me-2"></i>Masuk</button>
  </form>

  <div class="text-center mt-4">
    <a href="<?= e(BASE_URL) ?>index.php" class="small text-decoration-none">
      <i class="bi bi-arrow-left me-1"></i>Kembali ke Website Sekolah
    </a>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="<?= e(BASE_URL) ?>assets/js/main.js"></script>
<script>
  document.getElementById('lihatSandi').addEventListener('click', function () {
    var i = document.getElementById('l-pass');
    i.type = i.type === 'password' ? 'text' : 'password';
    this.querySelector('i').className = i.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
  });
</script>
</body>
</html>

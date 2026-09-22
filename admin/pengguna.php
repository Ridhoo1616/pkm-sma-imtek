<?php
/**
 * Kelola akun pengguna panel admin & ubah kata sandi sendiri
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$adalahAdmin = admin_role() === 'admin';
$tab = input('aksi', 'get', $adalahAdmin ? 'daftar' : 'akun');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $aksi = input('aksi');

    /* --- Ubah kata sandi sendiri --- */
    if ($aksi === 'sandi_saya') {
        $lama  = (string) input('sandi_lama');
        $baru  = (string) input('sandi_baru');
        $ulang = (string) input('sandi_ulang');

        $st = $pdo->prepare('SELECT password FROM users WHERE id = ?');
        $st->execute([admin_id()]);
        $hash = $st->fetchColumn();

        if (!password_verify($lama, (string) $hash)) {
            set_flash('danger', 'Kata sandi lama tidak sesuai.');
        } elseif (mb_strlen($baru) < 8) {
            set_flash('danger', 'Kata sandi baru minimal 8 karakter.');
        } elseif ($baru !== $ulang) {
            set_flash('danger', 'Konfirmasi kata sandi baru tidak sama.');
        } else {
            $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')
                ->execute([password_hash($baru, PASSWORD_DEFAULT), admin_id()]);
            set_flash('success', 'Kata sandi Anda berhasil diperbarui.');
        }
        redirect('admin/pengguna.php?aksi=akun');
    }

    /* --- Ubah nama sendiri --- */
    if ($aksi === 'profil_saya') {
        $nama = input('nama');
        if ($nama === '') {
            set_flash('danger', 'Nama tidak boleh kosong.');
        } else {
            $pdo->prepare('UPDATE users SET nama = ? WHERE id = ?')->execute([$nama, admin_id()]);
            $_SESSION['admin_nama'] = $nama;
            set_flash('success', 'Nama pengguna berhasil diperbarui.');
        }
        redirect('admin/pengguna.php?aksi=akun');
    }

    /* --- Aksi khusus Administrator --- */
    if (!$adalahAdmin) {
        set_flash('danger', 'Hanya Administrator yang dapat mengelola akun pengguna.');
        redirect('admin/pengguna.php?aksi=akun');
    }

    if ($aksi === 'tambah') {
        $nama     = input('nama');
        $username = strtolower(preg_replace('/[^a-z0-9._-]/i', '', input('username')));
        $sandi    = (string) input('password');
        $role     = input('role') === 'admin' ? 'admin' : 'operator';

        $cek = $pdo->prepare('SELECT id FROM users WHERE username = ?');
        $cek->execute([$username]);

        if ($nama === '' || $username === '') {
            set_flash('danger', 'Nama dan nama pengguna wajib diisi.');
        } elseif (mb_strlen($username) < 4) {
            set_flash('danger', 'Nama pengguna minimal 4 karakter (huruf, angka, titik, garis bawah).');
        } elseif ($cek->fetch()) {
            set_flash('danger', 'Nama pengguna <strong>' . e($username) . '</strong> sudah digunakan.');
        } elseif (mb_strlen($sandi) < 8) {
            set_flash('danger', 'Kata sandi minimal 8 karakter.');
        } else {
            $pdo->prepare('INSERT INTO users (nama, username, password, role) VALUES (?,?,?,?)')
                ->execute([$nama, $username, password_hash($sandi, PASSWORD_DEFAULT), $role]);
            set_flash('success', 'Akun <strong>' . e($username) . '</strong> berhasil dibuat.');
        }
        redirect('admin/pengguna.php');
    }

    if ($aksi === 'reset') {
        $id    = (int) input('id');
        $sandi = (string) input('password');
        if (mb_strlen($sandi) < 8) {
            set_flash('danger', 'Kata sandi baru minimal 8 karakter.');
        } else {
            $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')
                ->execute([password_hash($sandi, PASSWORD_DEFAULT), $id]);
            set_flash('success', 'Kata sandi pengguna berhasil direset.');
        }
        redirect('admin/pengguna.php');
    }

    if ($aksi === 'hapus') {
        $id = (int) input('id');
        if ($id === admin_id()) {
            set_flash('danger', 'Anda tidak dapat menghapus akun Anda sendiri.');
        } else {
            $jmlAdmin = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
            $st = $pdo->prepare('SELECT role FROM users WHERE id = ?');
            $st->execute([$id]);
            if ($st->fetchColumn() === 'admin' && $jmlAdmin <= 1) {
                set_flash('danger', 'Tidak dapat menghapus satu-satunya akun Administrator.');
            } else {
                $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
                set_flash('success', 'Akun pengguna berhasil dihapus.');
            }
        }
        redirect('admin/pengguna.php');
    }
}

$daftar = $adalahAdmin ? $pdo->query('SELECT * FROM users ORDER BY role, nama')->fetchAll() : [];
$stSaya = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stSaya->execute([admin_id()]);
$saya = $stSaya->fetch();

$judul      = 'Akun Pengguna';
$menu_aktif = 'pengguna';
require_once __DIR__ . '/includes/header.php';
?>

<ul class="nav nav-pills mb-3">
  <?php if ($adalahAdmin): ?>
    <li class="nav-item">
      <a class="nav-link <?= $tab !== 'akun' ? 'active' : '' ?>" href="pengguna.php">
        <i class="bi bi-people me-1"></i>Daftar Pengguna
      </a>
    </li>
  <?php endif; ?>
  <li class="nav-item">
    <a class="nav-link <?= $tab === 'akun' ? 'active' : '' ?>" href="pengguna.php?aksi=akun">
      <i class="bi bi-person-gear me-1"></i>Akun Saya
    </a>
  </li>
</ul>

<?php if ($tab === 'akun'): ?>
  <div class="row g-3">
    <div class="col-lg-5">
      <div class="panel">
        <div class="panel-kepala"><i class="bi bi-person text-primary"></i><h2>Data Akun</h2></div>
        <div class="panel-isi">
          <form method="post" class="perlu-validasi" novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="aksi" value="profil_saya">
            <div class="mb-3">
              <label class="form-label" for="a-nama">Nama Lengkap</label>
              <input type="text" class="form-control" id="a-nama" name="nama" required maxlength="100" value="<?= e($saya['nama']) ?>">
              <div class="invalid-feedback">Nama wajib diisi.</div>
            </div>
            <div class="mb-3">
              <label class="form-label">Nama Pengguna</label>
              <input type="text" class="form-control" value="<?= e($saya['username']) ?>" disabled>
              <div class="form-text">Nama pengguna tidak dapat diubah.</div>
            </div>
            <div class="mb-3">
              <label class="form-label">Peran</label>
              <input type="text" class="form-control text-capitalize" value="<?= e($saya['role']) ?>" disabled>
            </div>
            <div class="mb-3">
              <label class="form-label">Masuk Terakhir</label>
              <input type="text" class="form-control" value="<?= e($saya['last_login'] ? tgl_indo($saya['last_login'], true) : 'Belum pernah') ?>" disabled>
            </div>
            <button class="btn btn-daftar w-100"><i class="bi bi-save me-2"></i>Simpan Nama</button>
          </form>
        </div>
      </div>
    </div>

    <div class="col-lg-7">
      <div class="panel">
        <div class="panel-kepala"><i class="bi bi-shield-lock text-primary"></i><h2>Ubah Kata Sandi</h2></div>
        <div class="panel-isi">
          <form method="post" class="perlu-validasi" novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="aksi" value="sandi_saya">
            <div class="mb-3">
              <label class="form-label" for="a-lama">Kata Sandi Saat Ini <span class="wajib">*</span></label>
              <input type="password" class="form-control" id="a-lama" name="sandi_lama" required autocomplete="current-password">
              <div class="invalid-feedback">Kata sandi saat ini wajib diisi.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="a-baru">Kata Sandi Baru <span class="wajib">*</span></label>
              <input type="password" class="form-control" id="a-baru" name="sandi_baru" required minlength="8" autocomplete="new-password">
              <div class="form-text">Minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol.</div>
              <div class="invalid-feedback">Kata sandi baru minimal 8 karakter.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="a-ulang">Ulangi Kata Sandi Baru <span class="wajib">*</span></label>
              <input type="password" class="form-control" id="a-ulang" name="sandi_ulang" required minlength="8" autocomplete="new-password">
              <div class="invalid-feedback">Ulangi kata sandi baru.</div>
            </div>
            <div class="alert alert-warning small">
              <i class="bi bi-exclamation-triangle me-1"></i>
              Jika Anda masih menggunakan kata sandi bawaan (<code>admin123</code>),
              segera ganti demi keamanan data pendaftar.
            </div>
            <button class="btn btn-daftar"><i class="bi bi-shield-check me-2"></i>Perbarui Kata Sandi</button>
          </form>
        </div>
      </div>
    </div>
  </div>

<?php else: ?>
  <div class="row g-3">
    <div class="col-lg-4">
      <div class="panel">
        <div class="panel-kepala"><i class="bi bi-person-plus text-primary"></i><h2>Tambah Pengguna</h2></div>
        <div class="panel-isi">
          <form method="post" class="perlu-validasi" novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="aksi" value="tambah">
            <div class="mb-3">
              <label class="form-label" for="p-nama">Nama Lengkap <span class="wajib">*</span></label>
              <input type="text" class="form-control" id="p-nama" name="nama" required maxlength="100">
              <div class="invalid-feedback">Nama wajib diisi.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="p-user">Nama Pengguna <span class="wajib">*</span></label>
              <input type="text" class="form-control" id="p-user" name="username" required minlength="4" maxlength="50">
              <div class="form-text">Huruf, angka, titik, atau garis bawah.</div>
              <div class="invalid-feedback">Minimal 4 karakter.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="p-sandi">Kata Sandi <span class="wajib">*</span></label>
              <input type="password" class="form-control" id="p-sandi" name="password" required minlength="8" autocomplete="new-password">
              <div class="invalid-feedback">Minimal 8 karakter.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="p-role">Peran</label>
              <select class="form-select" id="p-role" name="role">
                <option value="operator">Operator (panitia PPDB)</option>
                <option value="admin">Administrator (akses penuh)</option>
              </select>
              <div class="form-text">Operator tidak dapat menghapus data pendaftar dan mengubah pengaturan.</div>
            </div>
            <button class="btn btn-daftar w-100"><i class="bi bi-plus-lg me-2"></i>Buat Akun</button>
          </form>
        </div>
      </div>
    </div>

    <div class="col-lg-8">
      <div class="panel">
        <div class="panel-kepala">
          <i class="bi bi-people text-primary"></i><h2>Daftar Pengguna</h2>
          <span class="badge bg-light text-dark ms-auto"><?= count($daftar) ?> akun</span>
        </div>
        <div class="table-responsive">
          <table class="table tabel-admin mb-0">
            <thead><tr><th>Nama</th><th>Nama Pengguna</th><th>Peran</th><th>Masuk Terakhir</th><th class="text-center">Aksi</th></tr></thead>
            <tbody>
              <?php foreach ($daftar as $u): ?>
                <tr>
                  <td class="fw-semibold"><?= e($u['nama']) ?>
                    <?php if ((int) $u['id'] === admin_id()): ?>
                      <span class="badge bg-primary ms-1">Anda</span>
                    <?php endif; ?>
                  </td>
                  <td><code><?= e($u['username']) ?></code></td>
                  <td><span class="badge bg-<?= $u['role'] === 'admin' ? 'dark' : 'secondary' ?> text-capitalize"><?= e($u['role']) ?></span></td>
                  <td class="small text-muted"><?= e($u['last_login'] ? tgl_indo($u['last_login'], true) : 'Belum pernah') ?></td>
                  <td class="text-center" style="white-space:nowrap">
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal"
                            data-bs-target="#modalReset<?= (int) $u['id'] ?>" title="Reset kata sandi">
                      <i class="bi bi-key"></i>
                    </button>
                    <?php if ((int) $u['id'] !== admin_id()): ?>
                      <form method="post" class="d-inline">
                        <?= csrf_field() ?>
                        <input type="hidden" name="aksi" value="hapus">
                        <input type="hidden" name="id" value="<?= (int) $u['id'] ?>">
                        <button class="btn btn-sm btn-outline-danger"
                                data-konfirmasi="Hapus akun <?= e($u['username']) ?>?">
                          <i class="bi bi-trash"></i>
                        </button>
                      </form>
                    <?php endif; ?>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal reset kata sandi -->
  <?php foreach ($daftar as $u): ?>
    <div class="modal fade" id="modalReset<?= (int) $u['id'] ?>" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <form method="post" class="modal-content">
          <?= csrf_field() ?>
          <input type="hidden" name="aksi" value="reset">
          <input type="hidden" name="id" value="<?= (int) $u['id'] ?>">
          <div class="modal-header">
            <h5 class="modal-title">Reset Kata Sandi &mdash; <?= e($u['nama']) ?></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
          </div>
          <div class="modal-body">
            <label class="form-label" for="r-<?= (int) $u['id'] ?>">Kata Sandi Baru</label>
            <input type="text" class="form-control" id="r-<?= (int) $u['id'] ?>" name="password"
                   required minlength="8" placeholder="Minimal 8 karakter">
            <div class="form-text">Catat kata sandi ini dan sampaikan kepada pengguna bersangkutan.</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-daftar">Reset Kata Sandi</button>
          </div>
        </form>
      </div>
    </div>
  <?php endforeach; ?>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

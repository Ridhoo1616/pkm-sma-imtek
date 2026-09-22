<?php
/**
 * Kelola peminatan / program studi dan kuotanya
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$j = ['id' => 0, 'kode' => '', 'nama' => '', 'deskripsi' => '', 'kuota' => 0, 'icon' => 'bi-mortarboard', 'aktif' => 1, 'urutan' => 0];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $id = (int) input('id');

    if (input('aksi') === 'hapus') {
        $c = $pdo->prepare('SELECT COUNT(*) FROM pendaftar WHERE jurusan_id = ?');
        $c->execute([$id]);
        if ((int) $c->fetchColumn() > 0) {
            set_flash('warning', 'Peminatan tidak dapat dihapus karena sudah memiliki pendaftar. '
                               . 'Nonaktifkan saja agar tidak muncul pada formulir pendaftaran.');
        } else {
            $pdo->prepare('DELETE FROM jurusan WHERE id = ?')->execute([$id]);
            set_flash('success', 'Peminatan berhasil dihapus.');
        }
        redirect('admin/jurusan.php');
    }

    $kode  = strtoupper(input('kode'));
    $nama  = input('nama');
    $kuota = max(0, (int) input('kuota'));

    if ($kode === '' || $nama === '') {
        set_flash('danger', 'Kode dan nama peminatan wajib diisi.');
        redirect('admin/jurusan.php');
    }

    $cek = $pdo->prepare('SELECT id FROM jurusan WHERE kode = ?' . ($id ? ' AND id <> ?' : ''));
    $cek->execute($id ? [$kode, $id] : [$kode]);
    if ($cek->fetch()) {
        set_flash('danger', 'Kode peminatan <strong>' . e($kode) . '</strong> sudah digunakan.');
        redirect('admin/jurusan.php');
    }

    $nilai = [$kode, $nama, input('deskripsi') ?: null, $kuota,
              input('icon') ?: 'bi-mortarboard', input('aktif') ? 1 : 0, (int) input('urutan')];

    if ($id) {
        $pdo->prepare('UPDATE jurusan SET kode=?, nama=?, deskripsi=?, kuota=?, icon=?, aktif=?, urutan=? WHERE id=?')
            ->execute(array_merge($nilai, [$id]));
        set_flash('success', 'Data peminatan berhasil diperbarui.');
    } else {
        $pdo->prepare('INSERT INTO jurusan (kode, nama, deskripsi, kuota, icon, aktif, urutan) VALUES (?,?,?,?,?,?,?)')
            ->execute($nilai);
        set_flash('success', 'Peminatan baru berhasil ditambahkan.');
    }
    redirect('admin/jurusan.php');
}

if (input('aksi', 'get') === 'ubah') {
    $st = $pdo->prepare('SELECT * FROM jurusan WHERE id = ?');
    $st->execute([(int) input('id', 'get', 0)]);
    $j = $st->fetch() ?: $j;
}

$daftar = $pdo->prepare('SELECT j.*, COUNT(p.id) AS pendaftar FROM jurusan j
                         LEFT JOIN pendaftar p ON p.jurusan_id = j.id AND p.tahun_ajaran = ?
                         GROUP BY j.id ORDER BY j.urutan, j.id');
$daftar->execute([setting('ppdb_tahun')]);
$daftar = $daftar->fetchAll();

$judul      = 'Kelola Peminatan';
$menu_aktif = 'jurusan';
require_once __DIR__ . '/includes/header.php';
?>

<div class="row g-3">
  <div class="col-lg-4">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-mortarboard text-primary"></i>
        <h2><?= $j['id'] ? 'Ubah Peminatan' : 'Tambah Peminatan' ?></h2>
        <?php if ($j['id']): ?><a href="jurusan.php" class="btn btn-sm btn-outline-secondary ms-auto">Batal</a><?php endif; ?>
      </div>
      <div class="panel-isi">
        <form method="post" class="perlu-validasi" novalidate>
          <?= csrf_field() ?>
          <input type="hidden" name="id" value="<?= (int) $j['id'] ?>">

          <div class="row g-2 mb-3">
            <div class="col-5">
              <label class="form-label" for="j-kode">Kode <span class="wajib">*</span></label>
              <input type="text" class="form-control text-uppercase" id="j-kode" name="kode" required
                     maxlength="20" value="<?= e($j['kode']) ?>" placeholder="MIPA">
              <div class="invalid-feedback">Kode wajib diisi.</div>
            </div>
            <div class="col-7">
              <label class="form-label" for="j-kuota">Kuota</label>
              <input type="number" class="form-control" id="j-kuota" name="kuota" min="0" value="<?= (int) $j['kuota'] ?>">
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label" for="j-nama">Nama Peminatan <span class="wajib">*</span></label>
            <input type="text" class="form-control" id="j-nama" name="nama" required maxlength="100" value="<?= e($j['nama']) ?>">
            <div class="invalid-feedback">Nama wajib diisi.</div>
          </div>

          <div class="mb-3">
            <label class="form-label" for="j-deskripsi">Deskripsi</label>
            <textarea class="form-control" id="j-deskripsi" name="deskripsi" rows="4"><?= e($j['deskripsi']) ?></textarea>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-8">
              <label class="form-label" for="j-icon">Ikon</label>
              <select class="form-select" id="j-icon" name="icon">
                <?php foreach (['bi-mortarboard' => 'Umum', 'bi-calculator' => 'MIPA/Eksakta',
                                'bi-globe-americas' => 'IPS/Sosial', 'bi-translate' => 'Bahasa',
                                'bi-cpu' => 'Teknologi', 'bi-palette' => 'Seni'] as $kode => $lb): ?>
                  <option value="<?= e($kode) ?>" <?= $j['icon'] === $kode ? 'selected' : '' ?>><?= e($lb) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="col-4">
              <label class="form-label" for="j-urutan">Urutan</label>
              <input type="number" class="form-control" id="j-urutan" name="urutan" min="0" value="<?= (int) $j['urutan'] ?>">
            </div>
          </div>

          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" value="1" id="j-aktif" name="aktif" <?= $j['aktif'] ? 'checked' : '' ?>>
            <label class="form-check-label" for="j-aktif">Aktif (tampil pada formulir pendaftaran)</label>
          </div>

          <button class="btn btn-daftar w-100">
            <i class="bi bi-save me-2"></i><?= $j['id'] ? 'Simpan Perubahan' : 'Tambah Peminatan' ?>
          </button>
        </form>
      </div>
    </div>
  </div>

  <div class="col-lg-8">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-list-ul text-primary"></i><h2>Daftar Peminatan</h2>
        <span class="badge bg-light text-dark ms-auto">Tahun ajaran <?= e(setting('ppdb_tahun')) ?></span>
      </div>
      <div class="table-responsive">
        <table class="table tabel-admin mb-0">
          <thead><tr><th>Kode</th><th>Nama</th><th class="text-center">Kuota</th>
                     <th class="text-center">Pendaftar</th><th class="text-center">Keterisian</th>
                     <th class="text-center">Status</th><th class="text-center">Aksi</th></tr></thead>
          <tbody>
            <?php if (!$daftar): ?>
              <tr><td colspan="7" class="text-center text-muted py-5">Belum ada data peminatan.</td></tr>
            <?php else: foreach ($daftar as $r):
              $pj = $r['kuota'] > 0 ? min(100, round($r['pendaftar'] / $r['kuota'] * 100)) : 0; ?>
              <tr>
                <td><code><?= e($r['kode']) ?></code></td>
                <td><i class="bi <?= e($r['icon'] ?: 'bi-mortarboard') ?> text-primary me-2"></i>
                    <span class="fw-semibold"><?= e($r['nama']) ?></span></td>
                <td class="text-center"><?= (int) $r['kuota'] ?></td>
                <td class="text-center"><?= (int) $r['pendaftar'] ?></td>
                <td style="min-width:130px">
                  <div class="progress" style="height:8px">
                    <div class="progress-bar bg-<?= $pj >= 100 ? 'danger' : ($pj >= 75 ? 'warning' : 'success') ?>"
                         style="width:<?= $pj ?>%"></div>
                  </div>
                  <div class="small text-muted text-center"><?= $pj ?>%</div>
                </td>
                <td class="text-center">
                  <span class="badge bg-<?= $r['aktif'] ? 'success' : 'secondary' ?>">
                    <?= $r['aktif'] ? 'Aktif' : 'Nonaktif' ?>
                  </span>
                </td>
                <td class="text-center" style="white-space:nowrap">
                  <a href="jurusan.php?aksi=ubah&id=<?= (int) $r['id'] ?>" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-pencil"></i></a>
                  <form method="post" class="d-inline">
                    <?= csrf_field() ?>
                    <input type="hidden" name="aksi" value="hapus">
                    <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                    <button class="btn btn-sm btn-outline-danger"
                            data-konfirmasi="Hapus peminatan &quot;<?= e($r['nama']) ?>&quot;?">
                      <i class="bi bi-trash"></i>
                    </button>
                  </form>
                </td>
              </tr>
            <?php endforeach; endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

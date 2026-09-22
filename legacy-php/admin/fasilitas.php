<?php
/**
 * Kelola data fasilitas sekolah
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$f = ['id' => 0, 'nama' => '', 'deskripsi' => '', 'icon' => 'bi-building', 'urutan' => 0, 'gambar' => null];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $id = (int) input('id');

    if (input('aksi') === 'hapus') {
        $st = $pdo->prepare('SELECT gambar FROM fasilitas WHERE id = ?');
        $st->execute([$id]);
        hapus_berkas($st->fetchColumn() ?: null, 'galeri');
        $pdo->prepare('DELETE FROM fasilitas WHERE id = ?')->execute([$id]);
        set_flash('success', 'Data fasilitas berhasil dihapus.');
        redirect('admin/fasilitas.php');
    }

    $nama      = input('nama');
    $deskripsi = input('deskripsi');
    $icon      = input('icon') ?: 'bi-building';
    $urutan    = (int) input('urutan');

    if ($nama === '') {
        set_flash('danger', 'Nama fasilitas wajib diisi.');
        redirect('admin/fasilitas.php');
    }

    [$namaGambar, $galatGambar] = unggah_berkas($_FILES['gambar'] ?? [], 'galeri', ['jpg', 'jpeg', 'png']);
    if ($galatGambar) {
        set_flash('danger', 'Gambar: ' . e($galatGambar));
        redirect('admin/fasilitas.php');
    }

    if ($id) {
        $lama = $pdo->prepare('SELECT gambar FROM fasilitas WHERE id = ?');
        $lama->execute([$id]);
        $gambarLama = $lama->fetchColumn() ?: null;

        $pdo->prepare('UPDATE fasilitas SET nama=?, deskripsi=?, icon=?, urutan=?'
                    . ($namaGambar ? ', gambar=?' : '') . ' WHERE id=?')
            ->execute(array_merge([$nama, $deskripsi ?: null, $icon, $urutan],
                                  $namaGambar ? [$namaGambar] : [], [$id]));
        if ($namaGambar) {
            hapus_berkas($gambarLama, 'galeri');
        }
        set_flash('success', 'Data fasilitas berhasil diperbarui.');
    } else {
        $pdo->prepare('INSERT INTO fasilitas (nama, deskripsi, icon, urutan, gambar) VALUES (?,?,?,?,?)')
            ->execute([$nama, $deskripsi ?: null, $icon, $urutan, $namaGambar]);
        set_flash('success', 'Fasilitas baru berhasil ditambahkan.');
    }
    redirect('admin/fasilitas.php');
}

if (input('aksi', 'get') === 'ubah') {
    $st = $pdo->prepare('SELECT * FROM fasilitas WHERE id = ?');
    $st->execute([(int) input('id', 'get', 0)]);
    $f = $st->fetch() ?: $f;
}

$daftar = $pdo->query('SELECT * FROM fasilitas ORDER BY urutan, id')->fetchAll();

$judul      = 'Kelola Fasilitas';
$menu_aktif = 'fasilitas';
require_once __DIR__ . '/includes/header.php';
?>

<div class="row g-3">
  <div class="col-lg-4">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-building-add text-primary"></i>
        <h2><?= $f['id'] ? 'Ubah Fasilitas' : 'Tambah Fasilitas' ?></h2>
        <?php if ($f['id']): ?>
          <a href="fasilitas.php" class="btn btn-sm btn-outline-secondary ms-auto">Batal</a>
        <?php endif; ?>
      </div>
      <div class="panel-isi">
        <form method="post" enctype="multipart/form-data" class="perlu-validasi" novalidate>
          <?= csrf_field() ?>
          <input type="hidden" name="id" value="<?= (int) $f['id'] ?>">

          <div class="mb-3">
            <label class="form-label" for="f-nama">Nama Fasilitas <span class="wajib">*</span></label>
            <input type="text" class="form-control" id="f-nama" name="nama" required maxlength="120" value="<?= e($f['nama']) ?>">
            <div class="invalid-feedback">Nama fasilitas wajib diisi.</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="f-deskripsi">Deskripsi</label>
            <textarea class="form-control" id="f-deskripsi" name="deskripsi" rows="4"><?= e($f['deskripsi']) ?></textarea>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-8">
              <label class="form-label" for="f-icon">Ikon</label>
              <select class="form-select" id="f-icon" name="icon">
                <?php
                $ikonPilihan = ['bi-building' => 'Gedung', 'bi-pc-display' => 'Komputer', 'bi-eyedropper' => 'Laboratorium',
                    'bi-book' => 'Perpustakaan', 'bi-dribbble' => 'Olahraga', 'bi-moon-stars' => 'Ibadah',
                    'bi-easel' => 'Ruang Kelas', 'bi-heart-pulse' => 'Kesehatan/UKS', 'bi-shop' => 'Kantin/Koperasi',
                    'bi-music-note-beamed' => 'Seni/Musik', 'bi-wifi' => 'Internet', 'bi-camera-video' => 'Multimedia',
                    'bi-bus-front' => 'Transportasi', 'bi-tree' => 'Taman'];
                foreach ($ikonPilihan as $kode => $label): ?>
                  <option value="<?= e($kode) ?>" <?= $f['icon'] === $kode ? 'selected' : '' ?>><?= e($label) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="col-4">
              <label class="form-label" for="f-urutan">Urutan</label>
              <input type="number" class="form-control" id="f-urutan" name="urutan" min="0" value="<?= (int) $f['urutan'] ?>">
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="f-gambar">Foto Fasilitas</label>
            <input type="file" class="form-control" id="f-gambar" name="gambar" accept="image/jpeg,image/png">
            <div class="form-text">Opsional. JPG atau PNG, maksimal 2 MB.</div>
            <?php if (!empty($f['gambar'])): ?>
              <img src="<?= e(url_upload($f['gambar'], 'galeri')) ?>" alt="" class="pratinjau-gambar mt-2">
            <?php endif; ?>
          </div>
          <button class="btn btn-daftar w-100">
            <i class="bi bi-save me-2"></i><?= $f['id'] ? 'Simpan Perubahan' : 'Tambah Fasilitas' ?>
          </button>
        </form>
      </div>
    </div>
  </div>

  <div class="col-lg-8">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-list-ul text-primary"></i><h2>Daftar Fasilitas</h2>
        <span class="badge bg-light text-dark ms-auto"><?= count($daftar) ?> data</span>
      </div>
      <div class="table-responsive">
        <table class="table tabel-admin mb-0">
          <thead><tr><th class="text-center" style="width:56px">Urut</th><th>Fasilitas</th>
                     <th>Deskripsi</th><th class="text-center">Aksi</th></tr></thead>
          <tbody>
            <?php if (!$daftar): ?>
              <tr><td colspan="4" class="text-center text-muted py-5">Belum ada data fasilitas.</td></tr>
            <?php else: foreach ($daftar as $r): ?>
              <tr>
                <td class="text-center"><?= (int) $r['urutan'] ?></td>
                <td>
                  <i class="bi <?= e($r['icon'] ?: 'bi-building') ?> text-primary me-2"></i>
                  <span class="fw-semibold"><?= e($r['nama']) ?></span>
                </td>
                <td class="small text-muted"><?= e(potong($r['deskripsi'], 78)) ?></td>
                <td class="text-center" style="white-space:nowrap">
                  <a href="fasilitas.php?aksi=ubah&id=<?= (int) $r['id'] ?>" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-pencil"></i></a>
                  <form method="post" class="d-inline">
                    <?= csrf_field() ?>
                    <input type="hidden" name="aksi" value="hapus">
                    <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                    <button class="btn btn-sm btn-outline-danger"
                            data-konfirmasi="Hapus fasilitas &quot;<?= e($r['nama']) ?>&quot;?">
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

<?php
/**
 * Kelola berita & pengumuman (tambah, ubah, hapus)
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$kategoriSah = ['Berita', 'Pengumuman', 'Prestasi', 'Kegiatan'];
$aksi  = input('aksi', 'get', 'daftar');
$id    = (int) input('id', 'get', 0);
$galat = [];
$b     = ['judul' => '', 'kategori' => 'Berita', 'ringkasan' => '', 'isi' => '',
          'gambar' => null, 'penulis' => admin_nama(), 'publish' => 1];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $id   = (int) input('id');
    $aksi = input('aksi');

    if ($aksi === 'hapus') {
        $st = $pdo->prepare('SELECT gambar FROM berita WHERE id = ?');
        $st->execute([$id]);
        hapus_berkas($st->fetchColumn() ?: null, 'berita');
        $pdo->prepare('DELETE FROM berita WHERE id = ?')->execute([$id]);
        set_flash('success', 'Berita berhasil dihapus.');
        redirect('admin/berita.php');
    }

    if ($aksi === 'publish') {
        $pdo->prepare('UPDATE berita SET publish = 1 - publish WHERE id = ?')->execute([$id]);
        set_flash('success', 'Status publikasi berita berhasil diubah.');
        redirect('admin/berita.php');
    }

    /* Simpan (tambah / ubah) */
    $b = [
        'judul'     => input('judul'),
        'kategori'  => input('kategori'),
        'ringkasan' => input('ringkasan'),
        'isi'       => input('isi'),
        'penulis'   => input('penulis'),
        'publish'   => input('publish') ? 1 : 0,
        'gambar'    => null,
    ];

    if ($b['judul'] === '')                       $galat[] = 'Judul wajib diisi.';
    if (mb_strlen($b['isi']) < 20)                $galat[] = 'Isi berita minimal 20 karakter.';
    if (!in_array($b['kategori'], $kategoriSah, true)) $galat[] = 'Kategori tidak valid.';

    [$namaGambar, $galatGambar] = unggah_berkas($_FILES['gambar'] ?? [], 'berita', ['jpg', 'jpeg', 'png']);
    if ($galatGambar) {
        $galat[] = 'Gambar: ' . $galatGambar;
    }

    if ($galat) {
        hapus_berkas($namaGambar, 'berita');
    } else {
        $slug = slug_unik($pdo, 'berita', buat_slug($b['judul']), $id ?: null);
        if ($id) {
            $lama = $pdo->prepare('SELECT gambar FROM berita WHERE id = ?');
            $lama->execute([$id]);
            $gambarLama = $lama->fetchColumn() ?: null;

            $pdo->prepare('UPDATE berita SET judul=?, slug=?, kategori=?, ringkasan=?, isi=?, penulis=?, publish=?'
                        . ($namaGambar ? ', gambar=?' : '') . ' WHERE id=?')
                ->execute(array_merge(
                    [$b['judul'], $slug, $b['kategori'], $b['ringkasan'] ?: null, $b['isi'], $b['penulis'] ?: null, $b['publish']],
                    $namaGambar ? [$namaGambar] : [],
                    [$id]
                ));
            if ($namaGambar) {
                hapus_berkas($gambarLama, 'berita');
            }
            set_flash('success', 'Berita <strong>' . e($b['judul']) . '</strong> berhasil diperbarui.');
        } else {
            $pdo->prepare('INSERT INTO berita (judul, slug, kategori, ringkasan, isi, gambar, penulis, publish)
                           VALUES (?,?,?,?,?,?,?,?)')
                ->execute([$b['judul'], $slug, $b['kategori'], $b['ringkasan'] ?: null, $b['isi'],
                           $namaGambar, $b['penulis'] ?: null, $b['publish']]);
            set_flash('success', 'Berita baru berhasil ditambahkan.');
        }
        redirect('admin/berita.php');
    }
}

/* Ambil data untuk formulir ubah */
if ($aksi === 'ubah' && $id && !$galat) {
    $st = $pdo->prepare('SELECT * FROM berita WHERE id = ?');
    $st->execute([$id]);
    $b = $st->fetch();
    if (!$b) {
        set_flash('danger', 'Berita tidak ditemukan.');
        redirect('admin/berita.php');
    }
}

$judul      = $aksi === 'tambah' ? 'Tambah Berita' : ($aksi === 'ubah' ? 'Ubah Berita' : 'Kelola Berita');
$menu_aktif = 'berita';
require_once __DIR__ . '/includes/header.php';
?>

<?php if ($aksi === 'tambah' || $aksi === 'ubah'): ?>
  <div class="panel">
    <div class="panel-kepala">
      <i class="bi bi-pencil-square text-primary"></i>
      <h2><?= $aksi === 'ubah' ? 'Ubah Berita' : 'Tambah Berita Baru' ?></h2>
      <a href="berita.php" class="btn btn-sm btn-outline-secondary ms-auto">
        <i class="bi bi-arrow-left me-1"></i>Kembali
      </a>
    </div>
    <div class="panel-isi">
      <?php if ($galat): ?>
        <div class="alert alert-danger">
          <ul class="mb-0 ps-3"><?php foreach ($galat as $g): ?><li><?= e($g) ?></li><?php endforeach; ?></ul>
        </div>
      <?php endif; ?>

      <form method="post" enctype="multipart/form-data" class="row g-3 perlu-validasi" novalidate>
        <?= csrf_field() ?>
        <input type="hidden" name="aksi" value="simpan">
        <input type="hidden" name="id" value="<?= (int) $id ?>">

        <div class="col-md-8">
          <label class="form-label" for="b-judul">Judul Berita <span class="wajib">*</span></label>
          <input type="text" class="form-control" id="b-judul" name="judul" required maxlength="200" value="<?= e($b['judul']) ?>">
          <div class="invalid-feedback">Judul wajib diisi.</div>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="b-kategori">Kategori</label>
          <select class="form-select" id="b-kategori" name="kategori">
            <?php foreach ($kategoriSah as $k): ?>
              <option value="<?= e($k) ?>" <?= $b['kategori'] === $k ? 'selected' : '' ?>><?= e($k) ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="col-12">
          <label class="form-label" for="b-ringkasan">Ringkasan</label>
          <textarea class="form-control" id="b-ringkasan" name="ringkasan" rows="2" maxlength="300"
                    placeholder="Ringkasan singkat yang tampil pada daftar berita"><?= e($b['ringkasan']) ?></textarea>
          <div class="form-text">Maksimal 300 karakter. Bila kosong, sistem memotong dari isi berita.</div>
        </div>

        <div class="col-12">
          <label class="form-label" for="b-isi">Isi Berita <span class="wajib">*</span></label>
          <textarea class="form-control" id="b-isi" name="isi" rows="12" required minlength="20"><?= e($b['isi']) ?></textarea>
          <div class="form-text">Pisahkan antar paragraf dengan satu baris kosong.</div>
          <div class="invalid-feedback">Isi berita minimal 20 karakter.</div>
        </div>

        <div class="col-md-6">
          <label class="form-label" for="b-gambar">Gambar Utama</label>
          <input type="file" class="form-control" id="b-gambar" name="gambar" accept="image/jpeg,image/png">
          <div class="form-text">JPG atau PNG, maksimal 2 MB. <?= $aksi === 'ubah' ? 'Biarkan kosong bila tidak diganti.' : '' ?></div>
          <?php if (!empty($b['gambar'])): ?>
            <img src="<?= e(url_upload($b['gambar'], 'berita')) ?>" alt="Gambar saat ini" class="pratinjau-gambar mt-2">
          <?php endif; ?>
        </div>

        <div class="col-md-6">
          <label class="form-label" for="b-penulis">Penulis</label>
          <input type="text" class="form-control" id="b-penulis" name="penulis" maxlength="100" value="<?= e($b['penulis']) ?>">
          <div class="form-check mt-3">
            <input class="form-check-input" type="checkbox" value="1" id="b-publish" name="publish" <?= $b['publish'] ? 'checked' : '' ?>>
            <label class="form-check-label" for="b-publish">Tampilkan di website (publikasikan)</label>
          </div>
        </div>

        <div class="col-12">
          <button class="btn btn-daftar"><i class="bi bi-save me-2"></i>Simpan Berita</button>
          <a href="berita.php" class="btn btn-outline-secondary">Batal</a>
        </div>
      </form>
    </div>
  </div>

<?php else:
  $cari  = input('cari', 'get', '');
  $where = $cari !== '' ? 'WHERE judul LIKE ?' : '';
  $par   = $cari !== '' ? ['%' . $cari . '%'] : [];
  $st    = $pdo->prepare("SELECT * FROM berita $where ORDER BY created_at DESC");
  $st->execute($par);
  $daftar = $st->fetchAll();
?>
  <div class="panel">
    <div class="panel-kepala">
      <i class="bi bi-newspaper text-primary"></i>
      <h2>Daftar Berita</h2>
      <span class="badge bg-light text-dark"><?= count($daftar) ?> berita</span>
      <form method="get" class="ms-auto d-flex gap-2">
        <input type="search" name="cari" class="form-control form-control-sm" placeholder="Cari judul..." value="<?= e($cari) ?>">
        <button class="btn btn-sm btn-outline-primary"><i class="bi bi-search"></i></button>
        <a href="berita.php?aksi=tambah" class="btn btn-sm btn-daftar"><i class="bi bi-plus-lg me-1"></i>Tambah</a>
      </form>
    </div>
    <div class="table-responsive">
      <table class="table tabel-admin mb-0">
        <thead>
          <tr><th style="width:86px">Gambar</th><th>Judul</th><th>Kategori</th>
              <th class="text-center">Dibaca</th><th>Tanggal</th><th class="text-center">Status</th>
              <th class="text-center">Aksi</th></tr>
        </thead>
        <tbody>
          <?php if (!$daftar): ?>
            <tr><td colspan="7" class="text-center text-muted py-5">
              <i class="bi bi-newspaper fs-1 d-block mb-2 opacity-50"></i>Belum ada berita.
              <div class="mt-2"><a href="berita.php?aksi=tambah" class="btn btn-sm btn-daftar">Tambah Berita Pertama</a></div>
            </td></tr>
          <?php else: foreach ($daftar as $r): ?>
            <tr>
              <td><img src="<?= e(url_upload($r['gambar'], 'berita')) ?>" alt="" width="70" height="50"
                       class="rounded" style="object-fit:cover"></td>
              <td>
                <div class="fw-semibold"><?= e(potong($r['judul'], 66)) ?></div>
                <div class="small text-muted"><?= e($r['penulis'] ?: '-') ?></div>
              </td>
              <td><span class="badge bg-light text-dark"><?= e($r['kategori']) ?></span></td>
              <td class="text-center"><?= (int) $r['dibaca'] ?></td>
              <td class="small text-muted"><?= e(tgl_indo($r['created_at'])) ?></td>
              <td class="text-center">
                <form method="post" class="d-inline">
                  <?= csrf_field() ?>
                  <input type="hidden" name="aksi" value="publish">
                  <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                  <button class="btn btn-sm btn-<?= $r['publish'] ? 'success' : 'secondary' ?>"
                          title="Klik untuk mengubah status publikasi">
                    <?= $r['publish'] ? 'Terbit' : 'Draf' ?>
                  </button>
                </form>
              </td>
              <td class="text-center" style="white-space:nowrap">
                <a href="<?= e(BASE_URL) ?>berita-detail.php?slug=<?= e($r['slug']) ?>" target="_blank"
                   class="btn btn-sm btn-outline-secondary" title="Lihat di website"><i class="bi bi-eye"></i></a>
                <a href="berita.php?aksi=ubah&id=<?= (int) $r['id'] ?>" class="btn btn-sm btn-outline-primary" title="Ubah">
                  <i class="bi bi-pencil"></i></a>
                <form method="post" class="d-inline">
                  <?= csrf_field() ?>
                  <input type="hidden" name="aksi" value="hapus">
                  <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                  <button class="btn btn-sm btn-outline-danger" title="Hapus"
                          data-konfirmasi="Hapus berita &quot;<?= e($r['judul']) ?>&quot;?">
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
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

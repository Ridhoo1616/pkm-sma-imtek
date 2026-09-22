<?php
/**
 * Kelola data pendaftar PPDB: daftar, filter, ubah status massal, hapus, ekspor CSV
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$statusSah = ['Menunggu Verifikasi', 'Terverifikasi', 'Diterima', 'Cadangan', 'Ditolak'];

/* ------------------------------------------------------------------
 |  Aksi POST (ubah status massal / hapus)
 * ------------------------------------------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $aksi = input('aksi');
    $ids  = array_map('intval', (array) ($_POST['pilih'] ?? []));
    $ids  = array_values(array_filter($ids));

    if (!$ids) {
        set_flash('warning', 'Tidak ada data yang dipilih.');
    } elseif ($aksi === 'ubah_status' && in_array(input('status_baru'), $statusSah, true)) {
        $tanda = implode(',', array_fill(0, count($ids), '?'));
        $st = $pdo->prepare("UPDATE pendaftar SET status = ?, diverifikasi_oleh = ? WHERE id IN ($tanda)");
        $st->execute(array_merge([input('status_baru'), admin_id()], $ids));
        set_flash('success', 'Status <strong>' . count($ids) . ' pendaftar</strong> berhasil diubah menjadi '
                           . e(input('status_baru')) . '.');
    } elseif ($aksi === 'hapus' && admin_role() === 'admin') {
        $tanda = implode(',', array_fill(0, count($ids), '?'));
        $st = $pdo->prepare("SELECT file_foto, file_ijazah, file_kk, file_akta, file_raport, file_prestasi
                             FROM pendaftar WHERE id IN ($tanda)");
        $st->execute($ids);
        foreach ($st->fetchAll() as $row) {
            foreach ($row as $berkas) {
                hapus_berkas($berkas, 'pendaftar');
            }
        }
        $pdo->prepare("DELETE FROM pendaftar WHERE id IN ($tanda)")->execute($ids);
        set_flash('success', count($ids) . ' data pendaftar beserta dokumennya telah dihapus.');
    } elseif ($aksi === 'hapus') {
        set_flash('danger', 'Hanya Administrator yang dapat menghapus data pendaftar.');
    }
    redirect('admin/pendaftar.php?' . ($_SERVER['QUERY_STRING'] ?? ''));
}

/* ------------------------------------------------------------------
 |  Filter & pencarian
 * ------------------------------------------------------------------ */
$cari     = input('cari', 'get', '');
$fStatus  = input('status', 'get', '');
$fJalur   = input('jalur', 'get', '');
$fJurusan = input('jurusan', 'get', '');
$fTahun   = input('tahun', 'get', setting('ppdb_tahun'));
$urut     = input('urut', 'get', 'baru');

$syarat = [];
$par    = [];
if ($fTahun !== '')  { $syarat[] = 'p.tahun_ajaran = ?';  $par[] = $fTahun; }
if ($fStatus !== '' && in_array($fStatus, $statusSah, true)) { $syarat[] = 'p.status = ?'; $par[] = $fStatus; }
if ($fJalur !== '')  { $syarat[] = 'p.jalur = ?';         $par[] = $fJalur; }
if ($fJurusan !== ''){ $syarat[] = 'p.jurusan_id = ?';    $par[] = (int) $fJurusan; }
if ($cari !== '') {
    $syarat[] = '(p.nama_lengkap LIKE ? OR p.no_registrasi LIKE ? OR p.nisn LIKE ? OR p.asal_sekolah LIKE ? OR p.no_hp LIKE ?)';
    array_push($par, ...array_fill(0, 5, '%' . $cari . '%'));
}
$where = $syarat ? 'WHERE ' . implode(' AND ', $syarat) : '';

$urutSql = [
    'baru' => 'p.created_at DESC',
    'lama' => 'p.created_at ASC',
    'nama' => 'p.nama_lengkap ASC',
    'nilai'=> 'p.nilai_rata2 DESC',
][$urut] ?? 'p.created_at DESC';

/* ------------------------------------------------------------------
 |  Ekspor CSV
 * ------------------------------------------------------------------ */
if (input('ekspor', 'get') === 'csv') {
    $st = $pdo->prepare("SELECT p.*, j.nama AS nama_jurusan FROM pendaftar p
                         LEFT JOIN jurusan j ON j.id = p.jurusan_id $where ORDER BY $urutSql");
    $st->execute($par);

    $namaFile = 'data-pendaftar-ppdb-' . date('Ymd-His') . '.csv';
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $namaFile . '"');
    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM agar rapi di Excel
    fputcsv($out, [
        'No. Registrasi', 'Tahun Ajaran', 'Jalur', 'Peminatan', 'Nama Lengkap', 'NISN', 'NIK',
        'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Agama', 'Alamat', 'Kelurahan', 'Kecamatan',
        'Kota', 'Provinsi', 'No. HP', 'Email', 'Asal Sekolah', 'NPSN Sekolah', 'Tahun Lulus',
        'Nilai Rata-rata', 'Nama Ayah', 'Pekerjaan Ayah', 'Nama Ibu', 'Pekerjaan Ibu', 'Penghasilan',
        'No. HP Orang Tua', 'Sumber Informasi', 'Status', 'Catatan Admin', 'Waktu Mendaftar',
    ], ';');
    foreach ($st as $r) {
        fputcsv($out, [
            $r['no_registrasi'], $r['tahun_ajaran'], $r['jalur'], $r['nama_jurusan'], $r['nama_lengkap'],
            $r['nisn'], $r['nik'], $r['jenis_kelamin'] === 'L' ? 'Laki-laki' : 'Perempuan',
            $r['tempat_lahir'], $r['tanggal_lahir'], $r['agama'], $r['alamat'], $r['kelurahan'],
            $r['kecamatan'], $r['kota'], $r['provinsi'], $r['no_hp'], $r['email'], $r['asal_sekolah'],
            $r['npsn_sekolah'], $r['tahun_lulus'], $r['nilai_rata2'], $r['nama_ayah'], $r['pekerjaan_ayah'],
            $r['nama_ibu'], $r['pekerjaan_ibu'], $r['penghasilan'], $r['no_hp_ortu'],
            $r['sumber_informasi'], $r['status'], $r['catatan_admin'], $r['created_at'],
        ], ';');
    }
    fclose($out);
    exit;
}

/* ------------------------------------------------------------------
 |  Data halaman
 * ------------------------------------------------------------------ */
$perHal = 20;
$hal    = max(1, (int) input('hal', 'get', 1));

$stT = $pdo->prepare("SELECT COUNT(*) FROM pendaftar p $where");
$stT->execute($par);
$total  = (int) $stT->fetchColumn();
$halTot = max(1, (int) ceil($total / $perHal));
$hal    = min($hal, $halTot);
$offset = ($hal - 1) * $perHal;

$st = $pdo->prepare("SELECT p.*, j.nama AS nama_jurusan FROM pendaftar p
                     LEFT JOIN jurusan j ON j.id = p.jurusan_id
                     $where ORDER BY $urutSql LIMIT $perHal OFFSET $offset");
$st->execute($par);
$data = $st->fetchAll();

$jurusan = $pdo->query('SELECT id, nama FROM jurusan ORDER BY urutan')->fetchAll();
$tahunAda = $pdo->query('SELECT DISTINCT tahun_ajaran FROM pendaftar ORDER BY tahun_ajaran DESC')->fetchAll(PDO::FETCH_COLUMN);

$qs = fn(array $ubah = []) => '?' . http_build_query(array_filter(array_merge([
    'cari' => $cari, 'status' => $fStatus, 'jalur' => $fJalur, 'jurusan' => $fJurusan,
    'tahun' => $fTahun, 'urut' => $urut, 'hal' => $hal,
], $ubah), fn($v) => $v !== '' && $v !== null));

$judul      = 'Data Pendaftar';
$menu_aktif = 'pendaftar';
require_once __DIR__ . '/includes/header.php';
?>

<!-- Filter -->
<div class="panel">
  <div class="panel-isi">
    <form method="get" class="row g-2 align-items-end">
      <div class="col-md-3">
        <label class="form-label small">Cari</label>
        <input type="search" name="cari" class="form-control form-control-sm"
               placeholder="Nama, no. registrasi, NISN, HP" value="<?= e($cari) ?>">
      </div>
      <div class="col-md-2">
        <label class="form-label small">Status</label>
        <select name="status" class="form-select form-select-sm">
          <option value="">Semua status</option>
          <?php foreach ($statusSah as $s): ?>
            <option value="<?= e($s) ?>" <?= $fStatus === $s ? 'selected' : '' ?>><?= e($s) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">Jalur</label>
        <select name="jalur" class="form-select form-select-sm">
          <option value="">Semua jalur</option>
          <?php foreach (['Reguler', 'Prestasi', 'Afirmasi', 'Perpindahan Tugas Orang Tua'] as $j): ?>
            <option value="<?= e($j) ?>" <?= $fJalur === $j ? 'selected' : '' ?>><?= e($j) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">Peminatan</label>
        <select name="jurusan" class="form-select form-select-sm">
          <option value="">Semua peminatan</option>
          <?php foreach ($jurusan as $j): ?>
            <option value="<?= (int) $j['id'] ?>" <?= $fJurusan === (string) $j['id'] ? 'selected' : '' ?>><?= e($j['nama']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">Tahun Ajaran</label>
        <select name="tahun" class="form-select form-select-sm">
          <option value="">Semua tahun</option>
          <?php foreach (array_unique(array_merge([setting('ppdb_tahun')], $tahunAda)) as $t): ?>
            <option value="<?= e($t) ?>" <?= $fTahun === $t ? 'selected' : '' ?>><?= e($t) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-md-1">
        <label class="form-label small">Urut</label>
        <select name="urut" class="form-select form-select-sm">
          <option value="baru"  <?= $urut === 'baru'  ? 'selected' : '' ?>>Terbaru</option>
          <option value="lama"  <?= $urut === 'lama'  ? 'selected' : '' ?>>Terlama</option>
          <option value="nama"  <?= $urut === 'nama'  ? 'selected' : '' ?>>Nama</option>
          <option value="nilai" <?= $urut === 'nilai' ? 'selected' : '' ?>>Nilai</option>
        </select>
      </div>
      <div class="col-12 d-flex flex-wrap gap-2 mt-2">
        <button class="btn btn-sm btn-daftar"><i class="bi bi-funnel me-1"></i>Terapkan Filter</button>
        <a href="pendaftar.php" class="btn btn-sm btn-outline-secondary">Reset</a>
        <a href="pendaftar.php<?= e($qs(['ekspor' => 'csv', 'hal' => ''])) ?>" class="btn btn-sm btn-success ms-auto">
          <i class="bi bi-file-earmark-excel me-1"></i>Ekspor CSV (<?= $total ?> data)
        </a>
      </div>
    </form>
  </div>
</div>

<!-- Tabel -->
<form method="post" id="formMassal">
  <?= csrf_field() ?>
  <div class="panel">
    <div class="panel-kepala">
      <i class="bi bi-people text-primary"></i>
      <h2>Daftar Pendaftar</h2>
      <span class="badge bg-light text-dark"><?= $total ?> data</span>

      <div class="ms-auto d-flex flex-wrap gap-2 align-items-center">
        <select name="status_baru" class="form-select form-select-sm" style="width:auto">
          <option value="">-- Ubah status terpilih --</option>
          <?php foreach ($statusSah as $s): ?>
            <option value="<?= e($s) ?>"><?= e($s) ?></option>
          <?php endforeach; ?>
        </select>
        <button type="submit" name="aksi" value="ubah_status" class="btn btn-sm btn-primary"
                data-konfirmasi="Ubah status pendaftar yang dipilih?">
          <i class="bi bi-check2-square me-1"></i>Terapkan
        </button>
        <?php if (admin_role() === 'admin'): ?>
          <button type="submit" name="aksi" value="hapus" class="btn btn-sm btn-outline-danger"
                  data-konfirmasi="Hapus data pendaftar yang dipilih beserta seluruh dokumennya? Tindakan ini tidak dapat dibatalkan.">
            <i class="bi bi-trash me-1"></i>Hapus
          </button>
        <?php endif; ?>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table tabel-admin mb-0">
        <thead>
          <tr>
            <th style="width:34px"><input type="checkbox" class="form-check-input" id="pilihSemua" aria-label="Pilih semua"></th>
            <th>No. Registrasi</th><th>Nama / Kontak</th><th>Peminatan &amp; Jalur</th>
            <th>Asal Sekolah</th><th class="text-center">Nilai</th><th>Sumber</th>
            <th>Waktu</th><th>Status</th><th class="text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <?php if (!$data): ?>
            <tr><td colspan="10" class="text-center text-muted py-5">
              <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
              Tidak ada data pendaftar yang sesuai dengan filter.
            </td></tr>
          <?php else: foreach ($data as $p): ?>
            <tr>
              <td><input type="checkbox" class="form-check-input pilih-baris" name="pilih[]"
                         value="<?= (int) $p['id'] ?>" aria-label="Pilih <?= e($p['nama_lengkap']) ?>"></td>
              <td><code class="small"><?= e($p['no_registrasi']) ?></code></td>
              <td>
                <div class="fw-semibold"><?= e($p['nama_lengkap']) ?></div>
                <div class="small text-muted">
                  <?= $p['jenis_kelamin'] === 'L' ? 'L' : 'P' ?> &bull;
                  <i class="bi bi-telephone"></i> <?= e($p['no_hp']) ?>
                </div>
              </td>
              <td>
                <div class="small"><?= e($p['nama_jurusan'] ?? '-') ?></div>
                <span class="badge bg-light text-dark" style="font-size:10.5px"><?= e($p['jalur']) ?></span>
              </td>
              <td class="small"><?= e(potong($p['asal_sekolah'], 26)) ?></td>
              <td class="text-center small">
                <?= $p['nilai_rata2'] !== null ? number_format((float) $p['nilai_rata2'], 2, ',', '.') : '-' ?>
              </td>
              <td class="small text-muted"><?= e($p['sumber_informasi'] ?: '-') ?></td>
              <td class="small text-muted" style="white-space:nowrap"><?= date('d/m/y H:i', strtotime($p['created_at'])) ?></td>
              <td><span class="badge bg-<?= warna_status($p['status']) ?>"><?= e($p['status']) ?></span></td>
              <td class="text-center" style="white-space:nowrap">
                <a href="pendaftar-detail.php?id=<?= (int) $p['id'] ?>" class="btn btn-sm btn-outline-primary" title="Detail">
                  <i class="bi bi-eye"></i>
                </a>
                <a href="<?= e(BASE_URL) ?>ppdb-cetak.php?no=<?= urlencode($p['no_registrasi']) ?>" target="_blank"
                   class="btn btn-sm btn-outline-secondary" title="Cetak formulir">
                  <i class="bi bi-printer"></i>
                </a>
              </td>
            </tr>
          <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>

    <?php if ($halTot > 1): ?>
      <div class="panel-isi border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="small text-muted">
          Menampilkan <?= $offset + 1 ?>&ndash;<?= min($offset + $perHal, $total) ?> dari <?= $total ?> data
        </span>
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item <?= $hal <= 1 ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= e($qs(['hal' => $hal - 1])) ?>">&laquo;</a>
          </li>
          <?php
          $dari = max(1, $hal - 2);
          $ke   = min($halTot, $dari + 4);
          for ($i = $dari; $i <= $ke; $i++): ?>
            <li class="page-item <?= $i === $hal ? 'active' : '' ?>">
              <a class="page-link" href="<?= e($qs(['hal' => $i])) ?>"><?= $i ?></a>
            </li>
          <?php endfor; ?>
          <li class="page-item <?= $hal >= $halTot ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= e($qs(['hal' => $hal + 1])) ?>">&raquo;</a>
          </li>
        </ul>
      </div>
    <?php endif; ?>
  </div>
</form>

<script>
  document.getElementById('pilihSemua').addEventListener('change', function () {
    document.querySelectorAll('.pilih-baris').forEach(function (c) { c.checked = this.checked; }, this);
  });
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

<?php
/**
 * Dashboard panel admin
 */
$judul      = 'Dashboard';
$menu_aktif = 'dashboard';
require_once __DIR__ . '/includes/header.php';

$ta = setting('ppdb_tahun');

/* Ringkasan pendaftar */
$st = $pdo->prepare('SELECT status, COUNT(*) AS jml FROM pendaftar WHERE tahun_ajaran = ? GROUP BY status');
$st->execute([$ta]);
$perStatus = array_column($st->fetchAll(), 'jml', 'status');
$totalPendaftar = array_sum($perStatus);

$kuota  = max(1, (int) setting('ppdb_kuota', '1'));
$persen = min(100, round($totalPendaftar / $kuota * 100));

/* Pendaftar hari ini & minggu ini */
$hariIni   = (int) $pdo->query("SELECT COUNT(*) FROM pendaftar WHERE DATE(created_at) = CURDATE()")->fetchColumn();
$mingguIni = (int) $pdo->query("SELECT COUNT(*) FROM pendaftar WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")->fetchColumn();

/* Per peminatan */
$perJurusan = $pdo->prepare('SELECT j.nama, j.kuota, COUNT(p.id) AS jml
                             FROM jurusan j
                             LEFT JOIN pendaftar p ON p.jurusan_id = j.id AND p.tahun_ajaran = ?
                             WHERE j.aktif = 1 GROUP BY j.id ORDER BY j.urutan');
$perJurusan->execute([$ta]);
$perJurusan = $perJurusan->fetchAll();

/* Per jalur */
$perJalur = $pdo->prepare('SELECT jalur, COUNT(*) AS jml FROM pendaftar WHERE tahun_ajaran = ? GROUP BY jalur ORDER BY jml DESC');
$perJalur->execute([$ta]);
$perJalur = $perJalur->fetchAll();

/* Sumber informasi (efektivitas promosi) */
$perSumber = $pdo->prepare("SELECT COALESCE(NULLIF(sumber_informasi, ''), 'Tidak diisi') AS sumber, COUNT(*) AS jml
                            FROM pendaftar WHERE tahun_ajaran = ? GROUP BY sumber ORDER BY jml DESC LIMIT 8");
$perSumber->execute([$ta]);
$perSumber = $perSumber->fetchAll();
$maksSumber = max(1, (int) ($perSumber[0]['jml'] ?? 1));

/* Tren pendaftaran 14 hari terakhir */
$tren = $pdo->query("SELECT DATE(created_at) AS tgl, COUNT(*) AS jml FROM pendaftar
                     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
                     GROUP BY DATE(created_at)")->fetchAll();
$trenMap = array_column($tren, 'jml', 'tgl');
$deret = [];
for ($i = 13; $i >= 0; $i--) {
    $t = date('Y-m-d', strtotime("-$i day"));
    $deret[$t] = (int) ($trenMap[$t] ?? 0);
}
$maksTren = max(1, max($deret));

/* Kunjungan website */
$kunjunganHariIni = (int) $pdo->query('SELECT COALESCE(SUM(jumlah),0) FROM statistik_kunjungan WHERE tanggal = CURDATE()')->fetchColumn();
$kunjungan30      = (int) $pdo->query('SELECT COALESCE(SUM(jumlah),0) FROM statistik_kunjungan WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)')->fetchColumn();

/* Pendaftar terbaru */
$terbaru = $pdo->prepare('SELECT p.*, j.nama AS nama_jurusan FROM pendaftar p
                          LEFT JOIN jurusan j ON j.id = p.jurusan_id
                          WHERE p.tahun_ajaran = ? ORDER BY p.created_at DESC LIMIT 8');
$terbaru->execute([$ta]);
$terbaru = $terbaru->fetchAll();

$pesanBelum = (int) $pdo->query('SELECT COUNT(*) FROM pesan WHERE dibaca = 0')->fetchColumn();
?>

<!-- Status PPDB -->
<div class="alert <?= ppdb_dibuka() ? 'alert-success' : 'alert-secondary' ?> d-flex flex-wrap align-items-center gap-3">
  <i class="bi <?= ppdb_dibuka() ? 'bi-unlock-fill' : 'bi-lock-fill' ?> fs-4"></i>
  <div class="flex-grow-1">
    <strong>PPDB <?= e($ta) ?> &mdash; <?= ppdb_dibuka() ? 'DIBUKA' : 'DITUTUP' ?></strong>
    <div class="small">Periode <?= e(tgl_indo(setting('ppdb_mulai'))) ?> s.d. <?= e(tgl_indo(setting('ppdb_selesai'))) ?>
      &bull; Kuota <?= $kuota ?> peserta didik</div>
  </div>
  <a href="pengaturan.php#ppdb" class="btn btn-sm btn-outline-dark"><i class="bi bi-gear me-1"></i>Ubah Pengaturan PPDB</a>
</div>

<!-- Kartu ringkasan -->
<div class="row g-3 mb-1">
  <?php
  $ringkas = [
      ['Total Pendaftar',      $totalPendaftar,                          'bi-people',             '#12508f'],
      ['Menunggu Verifikasi',  $perStatus['Menunggu Verifikasi'] ?? 0,    'bi-hourglass-split',    '#f59e0b'],
      ['Terverifikasi',        $perStatus['Terverifikasi'] ?? 0,          'bi-patch-check',        '#0ea5e9'],
      ['Diterima',             $perStatus['Diterima'] ?? 0,               'bi-person-check',       '#16a34a'],
      ['Cadangan',             $perStatus['Cadangan'] ?? 0,               'bi-list-ol',            '#eab308'],
      ['Ditolak',              $perStatus['Ditolak'] ?? 0,                'bi-person-dash',        '#dc2626'],
      ['Pendaftar Hari Ini',   $hariIni,                                  'bi-calendar-day',       '#7c3aed'],
      ['Pesan Belum Dibaca',   $pesanBelum,                               'bi-envelope-exclamation','#db2777'],
  ];
  foreach ($ringkas as [$label, $angka, $ikon, $warna]): ?>
    <div class="col-6 col-md-4 col-xl-3">
      <div class="kartu-ringkas" style="--warna:<?= $warna ?>">
        <div class="ikon"><i class="bi <?= $ikon ?>"></i></div>
        <div>
          <div class="angka"><?= (int) $angka ?></div>
          <div class="label"><?= e($label) ?></div>
        </div>
      </div>
    </div>
  <?php endforeach; ?>
</div>

<div class="row g-3 mt-2">
  <!-- Tren pendaftaran -->
  <div class="col-xl-8">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-bar-chart text-primary"></i>
        <h2>Tren Pendaftaran 14 Hari Terakhir</h2>
        <span class="ms-auto small text-muted">Total <?= array_sum($deret) ?> pendaftar</span>
      </div>
      <div class="panel-isi">
        <div class="d-flex align-items-end gap-2" style="height:180px">
          <?php foreach ($deret as $tgl => $jml):
            $tinggi = $maksTren ? max(3, round($jml / $maksTren * 150)) : 3; ?>
            <div class="flex-fill text-center" style="max-width:76px" title="<?= e(tgl_indo($tgl)) ?>: <?= $jml ?> pendaftar">
              <div class="small fw-bold text-primary" style="font-size:11px"><?= $jml ?: '' ?></div>
              <div style="height:<?= $tinggi ?>px;background:linear-gradient(180deg,#2b7fd4,#12508f);border-radius:5px 5px 0 0"></div>
              <div class="text-muted" style="font-size:10px"><?= date('d/m', strtotime($tgl)) ?></div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>

    <!-- Efektivitas promosi -->
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-megaphone text-primary"></i>
        <h2>Efektivitas Kanal Promosi</h2>
        <a href="laporan.php" class="ms-auto small">Laporan lengkap <i class="bi bi-arrow-right"></i></a>
      </div>
      <div class="panel-isi">
        <p class="small text-muted">Berdasarkan jawaban pendaftar atas pertanyaan
          &ldquo;dari mana Anda mengetahui sekolah ini?&rdquo;</p>
        <?php if (!$perSumber): ?>
          <div class="text-muted small">Belum ada data. Grafik terisi setelah ada pendaftar masuk.</div>
        <?php else: foreach ($perSumber as $s): ?>
          <div class="batang-baris">
            <span class="nama text-truncate" title="<?= e($s['sumber']) ?>"><?= e($s['sumber']) ?></span>
            <span class="jalur"><span class="isi" style="width:<?= round($s['jml'] / $maksSumber * 100) ?>%"></span></span>
            <span class="nilai"><?= (int) $s['jml'] ?>
              <small class="text-muted fw-normal">(<?= $totalPendaftar ? round($s['jml'] / $totalPendaftar * 100) : 0 ?>%)</small>
            </span>
          </div>
        <?php endforeach; endif; ?>
      </div>
    </div>
  </div>

  <!-- Kolom kanan -->
  <div class="col-xl-4">
    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-pie-chart text-primary"></i><h2>Keterisian Kuota</h2></div>
      <div class="panel-isi">
        <div class="text-center mb-3">
          <div class="display-5 fw-bold text-primary"><?= $persen ?>%</div>
          <div class="small text-muted"><?= $totalPendaftar ?> dari <?= $kuota ?> kursi</div>
        </div>
        <div class="progress mb-4" style="height:10px">
          <div class="progress-bar bg-primary" style="width:<?= $persen ?>%"></div>
        </div>

        <h6 class="small text-uppercase text-muted mb-3">Per Peminatan</h6>
        <?php foreach ($perJurusan as $j):
          $pj = $j['kuota'] > 0 ? min(100, round($j['jml'] / $j['kuota'] * 100)) : 0; ?>
          <div class="mb-3">
            <div class="d-flex justify-content-between small mb-1">
              <span><?= e($j['nama']) ?></span>
              <strong><?= (int) $j['jml'] ?>/<?= (int) $j['kuota'] ?></strong>
            </div>
            <div class="progress" style="height:7px">
              <div class="progress-bar bg-<?= $pj >= 100 ? 'danger' : ($pj >= 75 ? 'warning' : 'success') ?>"
                   style="width:<?= $pj ?>%"></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-signpost-split text-primary"></i><h2>Per Jalur Pendaftaran</h2></div>
      <div class="panel-isi">
        <?php if (!$perJalur): ?>
          <div class="text-muted small">Belum ada data.</div>
        <?php else: foreach ($perJalur as $jl): ?>
          <div class="d-flex justify-content-between align-items-center border-bottom py-2 small">
            <span><i class="bi bi-dot"></i><?= e($jl['jalur']) ?></span>
            <span class="badge bg-light text-dark"><?= (int) $jl['jml'] ?> orang</span>
          </div>
        <?php endforeach; endif; ?>
      </div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-eye text-primary"></i><h2>Kunjungan Website</h2></div>
      <div class="panel-isi">
        <div class="row text-center g-2">
          <div class="col-6 border-end">
            <div class="h4 mb-0 text-primary"><?= number_format($kunjunganHariIni, 0, ',', '.') ?></div>
            <div class="small text-muted">Hari ini</div>
          </div>
          <div class="col-6">
            <div class="h4 mb-0 text-primary"><?= number_format($kunjungan30, 0, ',', '.') ?></div>
            <div class="small text-muted">30 hari terakhir</div>
          </div>
        </div>
        <div class="small text-muted mt-3 mb-0">
          <i class="bi bi-info-circle me-1"></i>Indikator jangkauan promosi digital sekolah.
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Pendaftar terbaru -->
<div class="panel">
  <div class="panel-kepala">
    <i class="bi bi-clock-history text-primary"></i>
    <h2>Pendaftar Terbaru</h2>
    <a href="pendaftar.php" class="btn btn-sm btn-outline-primary ms-auto">Lihat Semua Pendaftar</a>
  </div>
  <div class="table-responsive">
    <table class="table tabel-admin mb-0">
      <thead>
        <tr>
          <th>No. Registrasi</th><th>Nama</th><th>Peminatan</th><th>Jalur</th>
          <th>Asal Sekolah</th><th>Waktu</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        <?php if (!$terbaru): ?>
          <tr><td colspan="8" class="text-center text-muted py-4">
            Belum ada pendaftar pada tahun ajaran <?= e($ta) ?>.
          </td></tr>
        <?php else: foreach ($terbaru as $p): ?>
          <tr>
            <td><code><?= e($p['no_registrasi']) ?></code></td>
            <td class="fw-semibold"><?= e($p['nama_lengkap']) ?></td>
            <td><?= e($p['nama_jurusan'] ?? '-') ?></td>
            <td><span class="small"><?= e($p['jalur']) ?></span></td>
            <td class="small"><?= e(potong($p['asal_sekolah'], 28)) ?></td>
            <td class="small text-muted"><?= e(tgl_indo($p['created_at'], true)) ?></td>
            <td><span class="badge bg-<?= warna_status($p['status']) ?>"><?= e($p['status']) ?></span></td>
            <td>
              <a href="pendaftar-detail.php?id=<?= (int) $p['id'] ?>" class="btn btn-sm btn-outline-primary" title="Lihat detail">
                <i class="bi bi-eye"></i>
              </a>
            </td>
          </tr>
        <?php endforeach; endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

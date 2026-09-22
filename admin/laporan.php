<?php
/**
 * Laporan & statistik PPDB, termasuk evaluasi efektivitas promosi
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$ta = input('tahun', 'get', setting('ppdb_tahun'));

/* Ekspor rekap promosi ke CSV */
if (input('ekspor', 'get') === 'promosi') {
    $st = $pdo->prepare("SELECT COALESCE(NULLIF(sumber_informasi,''),'Tidak diisi') AS sumber,
                                COUNT(*) AS jml,
                                SUM(status = 'Diterima') AS diterima
                         FROM pendaftar WHERE tahun_ajaran = ?
                         GROUP BY sumber ORDER BY jml DESC");
    $st->execute([$ta]);
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="rekap-efektivitas-promosi-' . date('Ymd') . '.csv"');
    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
    fputcsv($out, ['Kanal Promosi', 'Jumlah Pendaftar', 'Diterima', 'Tahun Ajaran'], ';');
    foreach ($st as $r) {
        fputcsv($out, [$r['sumber'], $r['jml'], $r['diterima'], $ta], ';');
    }
    fclose($out);
    exit;
}

$q = function (string $sql, array $par = []) use ($pdo) {
    $st = $pdo->prepare($sql);
    $st->execute($par);
    return $st->fetchAll();
};

$stT = $pdo->prepare('SELECT COUNT(*) FROM pendaftar WHERE tahun_ajaran = ?');
$stT->execute([$ta]);
$totalTahun = (int) $stT->fetchColumn();

$perSumber  = $q("SELECT COALESCE(NULLIF(sumber_informasi,''),'Tidak diisi') AS label,
                         COUNT(*) AS jml, SUM(status = 'Diterima') AS diterima
                  FROM pendaftar WHERE tahun_ajaran = ? GROUP BY label ORDER BY jml DESC", [$ta]);
$perStatus  = $q('SELECT status AS label, COUNT(*) AS jml FROM pendaftar WHERE tahun_ajaran = ? GROUP BY status', [$ta]);
$perJalur   = $q('SELECT jalur AS label, COUNT(*) AS jml FROM pendaftar WHERE tahun_ajaran = ? GROUP BY jalur ORDER BY jml DESC', [$ta]);
$perJurusan = $q('SELECT j.nama AS label, COUNT(p.id) AS jml, j.kuota FROM jurusan j
                  LEFT JOIN pendaftar p ON p.jurusan_id = j.id AND p.tahun_ajaran = ?
                  GROUP BY j.id ORDER BY j.urutan', [$ta]);
$perJk      = $q("SELECT IF(jenis_kelamin='L','Laki-laki','Perempuan') AS label, COUNT(*) AS jml
                  FROM pendaftar WHERE tahun_ajaran = ? GROUP BY jenis_kelamin", [$ta]);
$perSekolah = $q('SELECT asal_sekolah AS label, COUNT(*) AS jml FROM pendaftar
                  WHERE tahun_ajaran = ? GROUP BY asal_sekolah ORDER BY jml DESC LIMIT 12', [$ta]);
$perBulan   = $q("SELECT DATE_FORMAT(created_at, '%Y-%m') AS bulan, COUNT(*) AS jml
                  FROM pendaftar WHERE tahun_ajaran = ? GROUP BY bulan ORDER BY bulan", [$ta]);
$halPopuler = $q('SELECT halaman AS label, SUM(jumlah) AS jml FROM statistik_kunjungan
                  WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                  GROUP BY halaman ORDER BY jml DESC LIMIT 10');
$sumberRujukan = $q("SELECT referer AS label, COUNT(*) AS jml FROM statistik_kunjungan
                     WHERE referer IS NOT NULL AND referer <> '' AND tanggal >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                     GROUP BY referer ORDER BY jml DESC LIMIT 8");

$tahunAda = $pdo->query('SELECT DISTINCT tahun_ajaran FROM pendaftar ORDER BY tahun_ajaran DESC')->fetchAll(PDO::FETCH_COLUMN);

/** Cetak deret batang horizontal */
function batang(array $data, int $total, string $kunciNilai = 'jml'): void
{
    if (!$data) {
        echo '<div class="text-muted small">Belum ada data.</div>';
        return;
    }
    $maks = max(1, max(array_map(fn($d) => (int) $d[$kunciNilai], $data)));
    foreach ($data as $d) {
        $jml = (int) $d[$kunciNilai];
        printf(
            '<div class="batang-baris"><span class="nama text-truncate" title="%1$s">%1$s</span>'
            . '<span class="jalur"><span class="isi" style="width:%2$d%%"></span></span>'
            . '<span class="nilai">%3$d <small class="text-muted fw-normal">(%4$s%%)</small></span></div>',
            e($d['label'] ?: 'Tidak diisi'),
            round($jml / $maks * 100),
            $jml,
            $total ? round($jml / $total * 100) : 0
        );
    }
}

$judul      = 'Laporan & Statistik';
$menu_aktif = 'laporan';
require_once __DIR__ . '/includes/header.php';
?>

<div class="panel">
  <div class="panel-isi d-flex flex-wrap gap-2 align-items-end">
    <form method="get" class="d-flex gap-2 align-items-end">
      <div>
        <label class="form-label small mb-1">Tahun Ajaran</label>
        <select name="tahun" class="form-select form-select-sm" onchange="this.form.submit()">
          <?php foreach (array_unique(array_merge([setting('ppdb_tahun')], $tahunAda)) as $t): ?>
            <option value="<?= e($t) ?>" <?= $ta === $t ? 'selected' : '' ?>><?= e($t) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </form>
    <div class="ms-auto d-flex gap-2 no-cetak">
      <a href="?tahun=<?= urlencode($ta) ?>&ekspor=promosi" class="btn btn-sm btn-success">
        <i class="bi bi-file-earmark-excel me-1"></i>Ekspor Rekap Promosi
      </a>
      <a href="pendaftar.php?tahun=<?= urlencode($ta) ?>&ekspor=csv" class="btn btn-sm btn-outline-success">
        <i class="bi bi-download me-1"></i>Ekspor Data Pendaftar
      </a>
      <button onclick="window.print()" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-printer me-1"></i>Cetak Laporan
      </button>
    </div>
  </div>
</div>

<div class="alert alert-light border small">
  <strong><i class="bi bi-file-text me-1"></i>Laporan PPDB Tahun Ajaran <?= e($ta) ?></strong> &mdash;
  <?= e(setting('nama_sekolah')) ?>. Total <strong><?= $totalTahun ?> pendaftar</strong> dari kuota
  <?= e(setting('ppdb_kuota')) ?> kursi. Dicetak <?= e(tgl_indo(date('Y-m-d H:i:s'), true)) ?>.
</div>

<div class="row g-3">
  <!-- Efektivitas promosi: bagian utama -->
  <div class="col-xl-7">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-megaphone text-primary"></i>
        <h2>Efektivitas Kanal Promosi</h2>
      </div>
      <div class="panel-isi">
        <p class="small text-muted">Distribusi pendaftar berdasarkan kanal yang membuat mereka
          mengetahui sekolah. Kolom <em>konversi</em> menunjukkan berapa pendaftar dari kanal
          tersebut yang akhirnya diterima.</p>
        <?php batang($perSumber, $totalTahun); ?>

        <?php if ($perSumber): ?>
          <div class="table-responsive mt-4">
            <table class="table table-sm tabel-admin mb-0">
              <thead>
                <tr><th>Kanal Promosi</th><th class="text-center">Pendaftar</th>
                    <th class="text-center">Porsi</th><th class="text-center">Diterima</th>
                    <th class="text-center">Konversi</th></tr>
              </thead>
              <tbody>
                <?php foreach ($perSumber as $s):
                  $konv = $s['jml'] > 0 ? round($s['diterima'] / $s['jml'] * 100) : 0; ?>
                  <tr>
                    <td><?= e($s['label']) ?></td>
                    <td class="text-center fw-semibold"><?= (int) $s['jml'] ?></td>
                    <td class="text-center"><?= $totalTahun ? round($s['jml'] / $totalTahun * 100) : 0 ?>%</td>
                    <td class="text-center"><?= (int) $s['diterima'] ?></td>
                    <td class="text-center">
                      <span class="badge bg-<?= $konv >= 60 ? 'success' : ($konv >= 30 ? 'warning' : 'secondary') ?>">
                        <?= $konv ?>%
                      </span>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
              <tfoot>
                <tr class="fw-bold">
                  <td>Total</td>
                  <td class="text-center"><?= $totalTahun ?></td>
                  <td class="text-center">100%</td>
                  <td class="text-center"><?= array_sum(array_column($perSumber, 'diterima')) ?></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <?php
          $teratas = $perSumber[0];
          $porsi   = $totalTahun ? round($teratas['jml'] / $totalTahun * 100) : 0;
          ?>
          <div class="alert alert-info small mt-3 mb-0">
            <i class="bi bi-lightbulb me-1"></i>
            <strong>Interpretasi:</strong> kanal <strong><?= e($teratas['label']) ?></strong> menyumbang
            porsi terbesar yaitu <?= $porsi ?>% dari seluruh pendaftar. Kanal dengan porsi rendah
            dapat menjadi prioritas perbaikan strategi promosi pada periode berikutnya.
          </div>
        <?php endif; ?>
      </div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-building text-primary"></i><h2>Sebaran Asal Sekolah (12 Teratas)</h2></div>
      <div class="panel-isi"><?php batang($perSekolah, $totalTahun); ?></div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-calendar-month text-primary"></i><h2>Pendaftar per Bulan</h2></div>
      <div class="panel-isi">
        <?php if (!$perBulan): ?>
          <div class="text-muted small">Belum ada data.</div>
        <?php else:
          $maksBulan = max(1, max(array_column($perBulan, 'jml'))); ?>
          <div class="d-flex align-items-end justify-content-center gap-3" style="height:170px">
            <?php foreach ($perBulan as $b): ?>
              <div class="flex-fill text-center" style="max-width:96px">
                <div class="small fw-bold text-primary"><?= (int) $b['jml'] ?></div>
                <div style="height:<?= max(4, round($b['jml'] / $maksBulan * 130)) ?>px;
                            background:linear-gradient(180deg,#2b7fd4,#12508f);border-radius:5px 5px 0 0"></div>
                <div class="small text-muted mt-1" style="font-size:11px">
                  <?= e(date('M Y', strtotime($b['bulan'] . '-01'))) ?>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </div>

  <!-- Kolom kanan -->
  <div class="col-xl-5">
    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-clipboard-data text-primary"></i><h2>Rekap Status Seleksi</h2></div>
      <div class="panel-isi"><?php batang($perStatus, $totalTahun); ?></div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-signpost-split text-primary"></i><h2>Rekap Jalur Pendaftaran</h2></div>
      <div class="panel-isi"><?php batang($perJalur, $totalTahun); ?></div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-mortarboard text-primary"></i><h2>Rekap Peminatan</h2></div>
      <div class="panel-isi">
        <?php batang($perJurusan, $totalTahun); ?>
        <div class="table-responsive mt-3">
          <table class="table table-sm mb-0">
            <thead><tr><th>Peminatan</th><th class="text-center">Kuota</th><th class="text-center">Pendaftar</th><th class="text-center">Rasio</th></tr></thead>
            <tbody>
              <?php foreach ($perJurusan as $j): ?>
                <tr class="small">
                  <td><?= e($j['label']) ?></td>
                  <td class="text-center"><?= (int) $j['kuota'] ?></td>
                  <td class="text-center"><?= (int) $j['jml'] ?></td>
                  <td class="text-center"><?= $j['kuota'] > 0 ? round($j['jml'] / $j['kuota'] * 100) : 0 ?>%</td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-gender-ambiguous text-primary"></i><h2>Jenis Kelamin</h2></div>
      <div class="panel-isi"><?php batang($perJk, $totalTahun); ?></div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-eye text-primary"></i><h2>Halaman Terpopuler (30 Hari)</h2></div>
      <div class="panel-isi">
        <p class="small text-muted">Indikator jangkauan promosi digital melalui website sekolah.</p>
        <?php batang($halPopuler, (int) array_sum(array_column($halPopuler, 'jml'))); ?>
      </div>
    </div>

    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-link-45deg text-primary"></i><h2>Sumber Rujukan Kunjungan</h2></div>
      <div class="panel-isi">
        <?php if (!$sumberRujukan): ?>
          <div class="text-muted small">Belum ada data rujukan. Data terisi ketika pengunjung datang
            dari tautan luar seperti media sosial atau mesin pencari.</div>
        <?php else: ?>
          <ul class="list-unstyled small mb-0 d-grid gap-2">
            <?php foreach ($sumberRujukan as $r): ?>
              <li class="d-flex justify-content-between gap-2 border-bottom pb-2">
                <span class="text-truncate" title="<?= e($r['label']) ?>"><?= e(potong($r['label'], 46)) ?></span>
                <strong><?= (int) $r['jml'] ?></strong>
              </li>
            <?php endforeach; ?>
          </ul>
        <?php endif; ?>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

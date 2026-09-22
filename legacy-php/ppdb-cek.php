<?php
/**
 * Cek status pendaftaran PPDB (nomor registrasi + tanggal lahir)
 */
require_once __DIR__ . '/includes/functions.php';

$judul_halaman     = 'Cek Status Pendaftaran';
$deskripsi_halaman = 'Pantau status verifikasi dan hasil seleksi pendaftaran PPDB '
                   . setting('nama_sekolah') . ' menggunakan nomor registrasi.';
$halaman_aktif     = 'cek';

$p      = null;
$galat  = '';
$noAwal = input('no', 'get', '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $no  = input('no_registrasi');
    $tgl = input('tanggal_lahir');

    if ($no === '' || $tgl === '') {
        $galat = 'Nomor registrasi dan tanggal lahir wajib diisi.';
    } else {
        $st = $pdo->prepare('SELECT p.*, j.nama AS nama_jurusan FROM pendaftar p
                             LEFT JOIN jurusan j ON j.id = p.jurusan_id
                             WHERE p.no_registrasi = ? AND p.tanggal_lahir = ?');
        $st->execute([$no, $tgl]);
        $p = $st->fetch();
        if (!$p) {
            $galat = 'Data pendaftaran tidak ditemukan. Pastikan nomor registrasi dan tanggal lahir sesuai dengan yang Anda daftarkan.';
        } else {
            $_SESSION['akses_cetak'][$p['no_registrasi']] = true;
        }
    }
}
include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Cek Status Pendaftaran</h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>ppdb.php">PPDB</a></li>
        <li class="breadcrumb-item active" aria-current="page">Cek Status</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-7">
        <div class="kartu-form">
          <h4 class="mb-1">Lacak Pendaftaran Anda</h4>
          <p class="text-muted small mb-4">Masukkan nomor registrasi dan tanggal lahir yang Anda daftarkan.</p>

          <?php if ($galat): ?>
            <div class="alert alert-danger"><i class="bi bi-x-circle me-1"></i><?= e($galat) ?></div>
          <?php endif; ?>

          <form method="post" class="row g-3 perlu-validasi" novalidate>
            <?= csrf_field() ?>
            <div class="col-md-7">
              <label class="form-label" for="c-no">Nomor Registrasi <span class="wajib">*</span></label>
              <input type="text" class="form-control text-uppercase" id="c-no" name="no_registrasi" required
                     value="<?= e(input('no_registrasi') ?: $noAwal) ?>" placeholder="PPDB-2627-0001">
              <div class="invalid-feedback">Nomor registrasi wajib diisi.</div>
            </div>
            <div class="col-md-5">
              <label class="form-label" for="c-tgl">Tanggal Lahir <span class="wajib">*</span></label>
              <input type="date" class="form-control" id="c-tgl" name="tanggal_lahir" required
                     value="<?= e(input('tanggal_lahir')) ?>">
              <div class="invalid-feedback">Tanggal lahir wajib diisi.</div>
            </div>
            <div class="col-12">
              <button class="btn btn-daftar w-100"><i class="bi bi-search me-2"></i>Cek Status Sekarang</button>
            </div>
          </form>
        </div>

        <?php if ($p):
          $tahap = [
              'Menunggu Verifikasi' => 1,
              'Terverifikasi'       => 2,
              'Diterima'            => 3,
              'Cadangan'            => 3,
              'Ditolak'             => 3,
          ][$p['status']] ?? 1;
        ?>
          <div class="kartu-form mt-4">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
              <div>
                <div class="small text-muted text-uppercase" style="letter-spacing:1px">Nomor Registrasi</div>
                <div class="h4 mb-0 text-primary fw-bold"><?= e($p['no_registrasi']) ?></div>
              </div>
              <span class="badge bg-<?= warna_status($p['status']) ?> fs-6 py-2 px-3"><?= e($p['status']) ?></span>
            </div>

            <!-- Tahapan -->
            <div class="d-flex text-center mb-4">
              <?php
              $labelTahap = ['Terkirim', 'Verifikasi Berkas', 'Hasil Seleksi'];
              foreach ($labelTahap as $i => $lb):
                $aktif = ($i + 1) <= $tahap; ?>
                <div class="flex-fill">
                  <div class="mx-auto d-grid place-items-center rounded-circle mb-2
                              <?= $aktif ? 'bg-primary text-white' : 'bg-light text-muted' ?>"
                       style="width:42px;height:42px;align-content:center">
                    <i class="bi <?= $aktif ? 'bi-check-lg' : 'bi-dash-lg' ?>"></i>
                  </div>
                  <div class="small <?= $aktif ? 'fw-semibold text-primary' : 'text-muted' ?>"><?= e($lb) ?></div>
                </div>
              <?php endforeach; ?>
            </div>

            <?php
            $pesanStatus = [
                'Menunggu Verifikasi' => ['info',    'Pendaftaran Anda sudah masuk dan sedang menunggu pemeriksaan berkas oleh panitia. Mohon menunggu maksimal 3 hari kerja.'],
                'Terverifikasi'       => ['primary', 'Berkas Anda dinyatakan lengkap dan sah. Pendaftaran Anda mengikuti proses seleksi. Pengumuman hasil: ' . tgl_indo(setting('ppdb_pengumuman')) . '.'],
                'Diterima'            => ['success', 'Selamat! Anda DITERIMA sebagai peserta didik baru ' . setting('nama_sekolah') . '. Silakan menghubungi sekolah untuk proses daftar ulang.'],
                'Cadangan'            => ['warning', 'Anda masuk daftar CADANGAN. Sekolah akan menghubungi Anda apabila terdapat kursi yang tersedia.'],
                'Ditolak'             => ['danger',  'Mohon maaf, pendaftaran Anda belum dapat diterima. Silakan hubungi panitia untuk penjelasan lebih lanjut.'],
            ][$p['status']] ?? ['secondary', ''];
            ?>
            <div class="alert alert-<?= $pesanStatus[0] ?>"><?= e($pesanStatus[1]) ?></div>

            <?php if ($p['catatan_admin']): ?>
              <div class="alert alert-light border">
                <strong class="small d-block mb-1"><i class="bi bi-chat-left-text me-1"></i>Catatan dari Panitia:</strong>
                <span class="small"><?= nl2br(e($p['catatan_admin'])) ?></span>
              </div>
            <?php endif; ?>

            <div class="table-responsive">
              <table class="table table-sm mb-0">
                <tbody class="small">
                  <tr><th class="text-muted fw-normal" style="width:40%">Nama Lengkap</th><td class="fw-semibold"><?= e($p['nama_lengkap']) ?></td></tr>
                  <tr><th class="text-muted fw-normal">Tahun Ajaran</th><td class="fw-semibold"><?= e($p['tahun_ajaran']) ?></td></tr>
                  <tr><th class="text-muted fw-normal">Jalur</th><td class="fw-semibold"><?= e($p['jalur']) ?></td></tr>
                  <tr><th class="text-muted fw-normal">Peminatan</th><td class="fw-semibold"><?= e($p['nama_jurusan'] ?? '-') ?></td></tr>
                  <tr><th class="text-muted fw-normal">Asal Sekolah</th><td class="fw-semibold"><?= e($p['asal_sekolah']) ?></td></tr>
                  <tr><th class="text-muted fw-normal">Tanggal Mendaftar</th><td class="fw-semibold"><?= e(tgl_indo($p['created_at'], true)) ?></td></tr>
                  <tr><th class="text-muted fw-normal">Pembaruan Terakhir</th><td class="fw-semibold"><?= e(tgl_indo($p['updated_at'], true)) ?></td></tr>
                </tbody>
              </table>
            </div>

            <div class="d-flex flex-wrap gap-2 mt-4">
              <a href="ppdb-cetak.php?no=<?= urlencode($p['no_registrasi']) ?>" target="_blank" class="btn btn-daftar">
                <i class="bi bi-printer me-2"></i>Cetak Bukti Pendaftaran
              </a>
              <?php if (setting('whatsapp')): ?>
                <a class="btn btn-outline-success" target="_blank" rel="noopener"
                   href="https://wa.me/<?= e(setting('whatsapp')) ?>?text=<?= rawurlencode('Halo panitia PPDB, saya ingin bertanya mengenai pendaftaran nomor ' . $p['no_registrasi'] . '.') ?>">
                  <i class="bi bi-whatsapp me-2"></i>Tanya Panitia
                </a>
              <?php endif; ?>
            </div>
          </div>
        <?php endif; ?>

        <div class="alert alert-light border mt-4 small">
          <i class="bi bi-question-circle me-1"></i>
          <strong>Lupa nomor registrasi?</strong> Hubungi panitia PPDB melalui
          <?= e(setting('telepon')) ?> atau WhatsApp sekolah dengan menyebutkan nama lengkap
          dan tanggal lahir calon peserta didik.
        </div>
      </div>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

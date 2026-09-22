<?php
/**
 * Halaman konfirmasi setelah formulir PPDB berhasil dikirim
 */
require_once __DIR__ . '/includes/functions.php';

$noReg = $_SESSION['ppdb_sukses'] ?? '';
if (!$noReg) {
    redirect('ppdb-daftar.php');
}
unset($_SESSION['ppdb_sukses']);

$st = $pdo->prepare('SELECT p.*, j.nama AS nama_jurusan FROM pendaftar p
                     LEFT JOIN jurusan j ON j.id = p.jurusan_id
                     WHERE p.no_registrasi = ?');
$st->execute([$noReg]);
$p = $st->fetch();
if (!$p) {
    redirect('ppdb-daftar.php');
}

// Simpan sementara agar tombol cetak dapat diakses tanpa mengisi ulang
$_SESSION['akses_cetak'][$p['no_registrasi']] = true;

$judul_halaman = 'Pendaftaran Berhasil';
$halaman_aktif = 'daftar';
include __DIR__ . '/includes/header.php';
?>
<section class="bagian">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="kartu-form text-center">
          <div class="mx-auto mb-3 d-grid place-items-center rounded-circle bg-success bg-opacity-10"
               style="width:86px;height:86px;align-content:center">
            <i class="bi bi-check-circle-fill text-success" style="font-size:44px"></i>
          </div>
          <h1 class="h3">Pendaftaran Berhasil Dikirim</h1>
          <p class="text-muted">Data Anda telah kami terima dan akan diverifikasi oleh panitia
            maksimal <strong>3 hari kerja</strong>.</p>

          <div class="bg-light border rounded-3 p-4 my-4">
            <div class="small text-muted text-uppercase" style="letter-spacing:1px">Nomor Registrasi Anda</div>
            <div class="display-6 fw-bold text-primary my-2" style="letter-spacing:2px"><?= e($p['no_registrasi']) ?></div>
            <div class="small text-danger">
              <i class="bi bi-exclamation-triangle me-1"></i>
              Simpan atau catat nomor ini. Nomor registrasi diperlukan untuk memantau status pendaftaran.
            </div>
          </div>

          <div class="table-responsive text-start">
            <table class="table table-sm">
              <tbody class="small">
                <tr><th class="text-muted fw-normal" style="width:42%">Nama Calon Peserta Didik</th><td class="fw-semibold"><?= e($p['nama_lengkap']) ?></td></tr>
                <tr><th class="text-muted fw-normal">Tahun Ajaran</th><td class="fw-semibold"><?= e($p['tahun_ajaran']) ?></td></tr>
                <tr><th class="text-muted fw-normal">Jalur Pendaftaran</th><td class="fw-semibold"><?= e($p['jalur']) ?></td></tr>
                <tr><th class="text-muted fw-normal">Peminatan</th><td class="fw-semibold"><?= e($p['nama_jurusan'] ?? '-') ?></td></tr>
                <tr><th class="text-muted fw-normal">Asal Sekolah</th><td class="fw-semibold"><?= e($p['asal_sekolah']) ?></td></tr>
                <tr><th class="text-muted fw-normal">Waktu Pendaftaran</th><td class="fw-semibold"><?= e(tgl_indo($p['created_at'], true)) ?></td></tr>
                <tr><th class="text-muted fw-normal">Status</th>
                    <td><span class="badge bg-<?= warna_status($p['status']) ?>"><?= e($p['status']) ?></span></td></tr>
              </tbody>
            </table>
          </div>

          <div class="d-flex flex-wrap gap-2 justify-content-center mt-4">
            <a href="ppdb-cetak.php?no=<?= urlencode($p['no_registrasi']) ?>" target="_blank" class="btn btn-daftar">
              <i class="bi bi-printer me-2"></i>Cetak Bukti Pendaftaran
            </a>
            <a href="ppdb-cek.php?no=<?= urlencode($p['no_registrasi']) ?>" class="btn btn-outline-primary">
              <i class="bi bi-search me-2"></i>Cek Status
            </a>
            <?php if (setting('whatsapp')): ?>
              <a class="btn btn-success" target="_blank" rel="noopener"
                 href="https://wa.me/<?= e(setting('whatsapp')) ?>?text=<?= rawurlencode('Halo panitia PPDB, saya sudah mendaftar dengan nomor registrasi ' . $p['no_registrasi'] . ' atas nama ' . $p['nama_lengkap'] . '.') ?>">
                <i class="bi bi-whatsapp me-2"></i>Konfirmasi ke Panitia
              </a>
            <?php endif; ?>
          </div>

          <div class="alert alert-info text-start small mt-4 mb-0">
            <strong><i class="bi bi-list-check me-1"></i>Langkah selanjutnya:</strong>
            <ol class="mb-0 mt-2 ps-3">
              <li>Cetak atau simpan bukti pendaftaran.</li>
              <li>Tunggu proses verifikasi berkas oleh panitia (maksimal 3 hari kerja).</li>
              <li>Pantau status melalui menu <em>Cek Status Pendaftaran</em>.</li>
              <li>Pengumuman hasil seleksi: <strong><?= e(tgl_indo(setting('ppdb_pengumuman'))) ?></strong>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

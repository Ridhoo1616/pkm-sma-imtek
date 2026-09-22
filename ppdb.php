<?php
require_once __DIR__ . '/includes/functions.php';
$judul_halaman     = 'Informasi PPDB ' . setting('ppdb_tahun');
$deskripsi_halaman = 'Jadwal, syarat, jalur, dan alur Penerimaan Peserta Didik Baru '
                   . setting('nama_sekolah') . ' tahun ajaran ' . setting('ppdb_tahun') . '.';
$halaman_aktif     = 'ppdb';

$jurusan = $pdo->query('SELECT * FROM jurusan WHERE aktif = 1 ORDER BY urutan')->fetchAll();
$total   = jumlah_pendaftar($pdo);
include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Penerimaan Peserta Didik Baru <?= e(setting('ppdb_tahun')) ?></h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item active" aria-current="page">Informasi PPDB</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <?php if (!ppdb_dibuka()): ?>
      <div class="alert alert-warning d-flex gap-3 align-items-start">
        <i class="bi bi-exclamation-triangle fs-4"></i>
        <div>
          <strong>Pendaftaran sedang ditutup.</strong><br>
          Periode pendaftaran: <?= e(tgl_indo(setting('ppdb_mulai'))) ?> s.d. <?= e(tgl_indo(setting('ppdb_selesai'))) ?>.
          Silakan pantau halaman ini atau hubungi sekolah untuk informasi terbaru.
        </div>
      </div>
    <?php else: ?>
      <div class="alert alert-success d-flex gap-3 align-items-start">
        <i class="bi bi-check-circle fs-4"></i>
        <div>
          <strong>Pendaftaran sedang dibuka.</strong> Formulir dapat diisi hingga
          <?= e(tgl_indo(setting('ppdb_selesai'))) ?>. <?= e(setting('ppdb_biaya')) ?>.
        </div>
      </div>
    <?php endif; ?>

    <div class="row g-4 mb-5">
      <?php
      $ringkas = [
          ['bi-calendar-check', 'Periode Pendaftaran', tgl_indo(setting('ppdb_mulai')) . ' s.d. ' . tgl_indo(setting('ppdb_selesai'))],
          ['bi-people',         'Kuota Penerimaan',    setting('ppdb_kuota') . ' peserta didik'],
          ['bi-person-check',   'Sudah Mendaftar',     $total . ' pendaftar'],
          ['bi-megaphone',      'Pengumuman Hasil',    tgl_indo(setting('ppdb_pengumuman'))],
      ];
      foreach ($ringkas as [$ikon, $label, $nilai]): ?>
        <div class="col-md-6 col-lg-3">
          <div class="kartu">
            <div class="kartu-ikon"><i class="bi <?= $ikon ?>"></i></div>
            <h6 class="text-muted small text-uppercase"><?= e($label) ?></h6>
            <p class="fw-bold text-dark mb-0" style="font-size:15px"><?= e($nilai) ?></p>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <div class="row g-5">
      <div class="col-lg-7">
        <h2 class="h4 mb-3"><i class="bi bi-signpost-split text-primary me-2"></i>Jalur Pendaftaran</h2>
        <div class="row g-3 mb-5">
          <?php
          $jalur = [
              ['Reguler',   'bi-person',        'Jalur umum berdasarkan hasil seleksi administrasi dan nilai rapor.'],
              ['Prestasi',  'bi-trophy',        'Bagi calon peserta didik dengan prestasi akademik maupun non-akademik. Wajib melampirkan sertifikat.'],
              ['Afirmasi',  'bi-heart',         'Bagi calon peserta didik dari keluarga ekonomi tidak mampu (pemegang KIP/PKH) atau penyandang disabilitas.'],
              ['Perpindahan Tugas Orang Tua', 'bi-house-door', 'Bagi calon peserta didik yang orang tuanya berpindah tugas ke wilayah sekolah. Wajib melampirkan surat tugas.'],
          ];
          foreach ($jalur as [$nm, $ik, $ket]): ?>
            <div class="col-md-6">
              <div class="kartu h-100">
                <div class="kartu-ikon"><i class="bi <?= $ik ?>"></i></div>
                <h5><?= e($nm) ?></h5>
                <p><?= e($ket) ?></p>
              </div>
            </div>
          <?php endforeach; ?>
        </div>

        <h2 class="h4 mb-3"><i class="bi bi-list-ol text-primary me-2"></i>Alur Pendaftaran</h2>
        <div class="mb-5">
          <?php
          $alur = [
              ['Siapkan dokumen persyaratan', 'Pindai atau foto seluruh dokumen. Format JPG, PNG, atau PDF dengan ukuran maksimal 2 MB per berkas.'],
              ['Isi formulir pendaftaran online', 'Buka menu Formulir Pendaftaran, lengkapi data diri, asal sekolah, data orang tua, lalu unggah dokumen.'],
              ['Simpan nomor registrasi', 'Setelah formulir terkirim, sistem menerbitkan nomor registrasi. Cetak atau simpan bukti pendaftaran Anda.'],
              ['Verifikasi oleh panitia', 'Panitia memeriksa kelengkapan berkas maksimal 3 hari kerja sejak pendaftaran diterima.'],
              ['Cek status pendaftaran', 'Pantau hasil verifikasi melalui menu Cek Status dengan nomor registrasi dan tanggal lahir.'],
              ['Pengumuman hasil seleksi', 'Hasil seleksi diumumkan pada ' . tgl_indo(setting('ppdb_pengumuman')) . ' melalui website dan papan pengumuman sekolah.'],
          ];
          foreach ($alur as $i => [$jd, $kt]): ?>
            <div class="langkah" data-nomor="<?= $i + 1 ?>">
              <h6><?= e($jd) ?></h6>
              <p><?= e($kt) ?></p>
            </div>
          <?php endforeach; ?>
        </div>

        <?php if ($jurusan): ?>
        <h2 class="h4 mb-3"><i class="bi bi-mortarboard text-primary me-2"></i>Kuota per Peminatan</h2>
        <div class="table-responsive">
          <table class="table table-bordered align-middle">
            <thead>
              <tr><th>Peminatan</th><th class="text-center">Kuota</th><th class="text-center">Pendaftar</th><th class="text-center">Sisa</th></tr>
            </thead>
            <tbody>
              <?php foreach ($jurusan as $j):
                $c = $pdo->prepare('SELECT COUNT(*) FROM pendaftar WHERE jurusan_id = ? AND tahun_ajaran = ?');
                $c->execute([$j['id'], setting('ppdb_tahun')]);
                $jml  = (int) $c->fetchColumn();
                $sisa = max(0, (int) $j['kuota'] - $jml); ?>
                <tr>
                  <td><i class="bi <?= e($j['icon'] ?: 'bi-mortarboard') ?> text-primary me-2"></i><?= e($j['nama']) ?></td>
                  <td class="text-center"><?= (int) $j['kuota'] ?></td>
                  <td class="text-center"><?= $jml ?></td>
                  <td class="text-center">
                    <span class="badge bg-<?= $sisa > 0 ? 'success' : 'danger' ?>"><?= $sisa > 0 ? $sisa . ' kursi' : 'Penuh' ?></span>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
        <?php endif; ?>
      </div>

      <aside class="col-lg-5">
        <div class="kartu-form mb-4">
          <h5 class="mb-3"><i class="bi bi-file-earmark-check text-primary me-2"></i>Syarat Pendaftaran</h5>
          <ul class="list-unstyled d-grid gap-2 mb-0 small">
            <?php foreach (setting_list('ppdb_syarat') as $s): ?>
              <li class="d-flex gap-2"><i class="bi bi-check2-circle text-success mt-1"></i><span><?= e($s) ?></span></li>
            <?php endforeach; ?>
          </ul>
        </div>

        <div class="kartu-form mb-4">
          <h5 class="mb-3"><i class="bi bi-cash-coin text-primary me-2"></i>Biaya Pendaftaran</h5>
          <p class="mb-0"><?= e(setting('ppdb_biaya')) ?></p>
        </div>

        <div class="kartu-form mb-4">
          <h5 class="mb-3"><i class="bi bi-patch-question text-primary me-2"></i>Pertanyaan Umum</h5>
          <div class="accordion accordion-flush" id="faq">
            <?php
            $faq = [
                ['Apakah pendaftaran harus datang ke sekolah?', 'Tidak. Seluruh proses pengisian formulir dan unggah dokumen dilakukan online. Verifikasi berkas fisik hanya diminta bila diperlukan panitia.'],
                ['Bagaimana jika saya salah mengisi data?', 'Hubungi panitia melalui WhatsApp atau telepon sekolah dengan menyebutkan nomor registrasi Anda. Panitia akan membantu memperbaiki data.'],
                ['Apakah bisa mendaftar lebih dari satu kali?', 'Tidak perlu. Satu calon peserta didik cukup mendaftar satu kali. Pendaftaran ganda akan diverifikasi dan digabungkan oleh panitia.'],
                ['Kapan hasil seleksi diumumkan?', 'Hasil seleksi diumumkan pada ' . tgl_indo(setting('ppdb_pengumuman')) . ' dan dapat dilihat melalui menu Cek Status Pendaftaran.'],
                ['Dokumen apa saja yang perlu diunggah?', 'Foto 3x4, ijazah/SKL, rapor, Kartu Keluarga, dan akta kelahiran. Sertifikat prestasi hanya untuk pendaftar jalur prestasi.'],
            ];
            foreach ($faq as $i => [$t, $j]): ?>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed small fw-semibold" type="button"
                          data-bs-toggle="collapse" data-bs-target="#faq<?= $i ?>"><?= e($t) ?></button>
                </h2>
                <div id="faq<?= $i ?>" class="accordion-collapse collapse" data-bs-parent="#faq">
                  <div class="accordion-body small text-muted"><?= e($j) ?></div>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        </div>

        <div class="kartu-form text-center bg-primary text-white border-0">
          <i class="bi bi-pencil-square fs-1"></i>
          <h5 class="text-white mt-2">Siap Mendaftar?</h5>
          <p class="small opacity-90">Pengisian formulir hanya butuh sekitar 15 menit.</p>
          <a href="<?= e(BASE_URL) ?>ppdb-daftar.php" class="btn btn-emas w-100 mb-2">Isi Formulir Pendaftaran</a>
          <a href="<?= e(BASE_URL) ?>ppdb-cek.php" class="btn btn-garis-putih w-100">Cek Status Pendaftaran</a>
        </div>
      </aside>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

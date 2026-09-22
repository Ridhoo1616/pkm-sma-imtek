<?php
/**
 * Halaman Beranda
 */
require_once __DIR__ . '/includes/functions.php';

$judul_halaman     = 'Beranda';
$deskripsi_halaman = setting('nama_sekolah') . ' - ' . setting('tagline')
                   . '. Informasi profil sekolah dan pendaftaran peserta didik baru (PPDB) '
                   . setting('ppdb_tahun') . ' secara online.';
$halaman_aktif     = 'home';

$jurusan   = $pdo->query('SELECT * FROM jurusan WHERE aktif = 1 ORDER BY urutan')->fetchAll();
$fasilitas = $pdo->query('SELECT * FROM fasilitas ORDER BY urutan LIMIT 6')->fetchAll();
$berita    = $pdo->query('SELECT * FROM berita WHERE publish = 1 ORDER BY created_at DESC LIMIT 3')->fetchAll();
$galeri    = $pdo->query('SELECT * FROM galeri ORDER BY created_at DESC LIMIT 8')->fetchAll();

$totalPendaftar = jumlah_pendaftar($pdo);
$sisaHari = ppdb_dibuka() && setting('ppdb_selesai')
    ? max(0, (int) floor((strtotime(setting('ppdb_selesai')) - strtotime(date('Y-m-d'))) / 86400))
    : null;

include __DIR__ . '/includes/header.php';
?>

<!-- ============ HERO ============ -->
<section class="hero">
  <div class="container position-relative">
    <div class="row align-items-center g-5">
      <div class="col-lg-7">
        <span class="hero-badge mb-3">
          <i class="bi <?= ppdb_dibuka() ? 'bi-megaphone' : 'bi-info-circle' ?>"></i>
          <?php if (ppdb_dibuka()): ?>
            PPDB <?= e(setting('ppdb_tahun')) ?> Telah Dibuka
          <?php else: ?>
            Informasi PPDB <?= e(setting('ppdb_tahun')) ?>
          <?php endif; ?>
        </span>
        <h1 class="mb-3">Selamat Datang di<br><?= e(setting('nama_sekolah')) ?></h1>
        <p class="lead mb-4"><?= e(setting('tagline')) ?>. Daftar menjadi peserta didik baru
          sepenuhnya secara online &mdash; tanpa perlu datang ke sekolah untuk mengisi formulir.</p>

        <div class="d-flex flex-wrap gap-3 mb-4">
          <a href="<?= e(BASE_URL) ?>ppdb-daftar.php" class="btn btn-emas btn-lg">
            <i class="bi bi-person-plus me-2"></i>Daftar PPDB Online
          </a>
          <a href="<?= e(BASE_URL) ?>ppdb.php" class="btn btn-garis-putih btn-lg">
            <i class="bi bi-journal-text me-2"></i>Informasi PPDB
          </a>
        </div>

        <div class="d-flex flex-wrap gap-4 small opacity-90">
          <span><i class="bi bi-check2-circle me-2"></i><?= e(setting('ppdb_biaya')) ?></span>
          <span><i class="bi bi-clock-history me-2"></i>Selesai dalam 15 menit</span>
          <?php if ($sisaHari !== null): ?>
            <span><i class="bi bi-calendar-event me-2"></i>Sisa <?= $sisaHari ?> hari lagi</span>
          <?php endif; ?>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="bg-white text-dark rounded-4 shadow-lg p-4">
          <h5 class="mb-3"><i class="bi bi-speedometer2 text-primary me-2"></i>Status PPDB <?= e(setting('ppdb_tahun')) ?></h5>
          <ul class="list-unstyled small d-grid gap-3 mb-3">
            <li class="d-flex justify-content-between">
              <span class="text-muted">Status pendaftaran</span>
              <strong class="<?= ppdb_dibuka() ? 'text-success' : 'text-secondary' ?>">
                <?= ppdb_dibuka() ? 'DIBUKA' : 'DITUTUP' ?>
              </strong>
            </li>
            <li class="d-flex justify-content-between">
              <span class="text-muted">Periode</span>
              <strong class="text-end"><?= e(tgl_indo(setting('ppdb_mulai'))) ?> &ndash;<br><?= e(tgl_indo(setting('ppdb_selesai'))) ?></strong>
            </li>
            <li class="d-flex justify-content-between">
              <span class="text-muted">Kuota</span>
              <strong><?= e(setting('ppdb_kuota')) ?> peserta didik</strong>
            </li>
            <li class="d-flex justify-content-between">
              <span class="text-muted">Sudah mendaftar</span>
              <strong><?= $totalPendaftar ?> orang</strong>
            </li>
            <li class="d-flex justify-content-between">
              <span class="text-muted">Pengumuman hasil</span>
              <strong><?= e(tgl_indo(setting('ppdb_pengumuman'))) ?></strong>
            </li>
          </ul>
          <?php
            $kuota  = max(1, (int) setting('ppdb_kuota', '1'));
            $persen = min(100, round($totalPendaftar / $kuota * 100));
          ?>
          <div class="progress mb-1" style="height:9px" role="progressbar" aria-valuenow="<?= $persen ?>" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar bg-primary" style="width:<?= $persen ?>%"></div>
          </div>
          <div class="d-flex justify-content-between small text-muted mb-3">
            <span>Kuota terisi <?= $persen ?>%</span>
            <span><?= $totalPendaftar ?>/<?= $kuota ?></span>
          </div>
          <a href="<?= e(BASE_URL) ?>ppdb-cek.php" class="btn btn-outline-primary w-100">
            <i class="bi bi-search me-2"></i>Cek Status Pendaftaran Saya
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ STATISTIK ============ -->
<div class="container statistik-wrap">
  <div class="row g-3">
    <?php
    $statistik = [
        ['bi-people',         setting('jml_siswa'),    'Peserta Didik Aktif'],
        ['bi-person-workspace', setting('jml_guru'),   'Guru &amp; Tenaga Pendidik'],
        ['bi-trophy',         setting('jml_prestasi'), 'Prestasi Diraih'],
        ['bi-mortarboard',    setting('jml_alumni'),   'Alumni Tersebar'],
    ];
    foreach ($statistik as [$ikon, $nilai, $label]): ?>
      <div class="col-6 col-lg-3">
        <div class="kartu-statistik">
          <i class="bi <?= $ikon ?> mb-2"></i>
          <div class="angka"><span data-hitung="<?= (int) $nilai ?>">0</span><?= (int) $nilai >= 100 ? '+' : '' ?></div>
          <div class="label"><?= $label ?></div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div>

<!-- ============ SAMBUTAN ============ -->
<section class="bagian">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-5">
        <div class="position-relative">
          <div class="rounded-4 overflow-hidden shadow-sm">
            <img src="<?= e(BASE_URL) ?>assets/img/no-image.svg" class="w-100" alt="Kepala Sekolah <?= e(setting('nama_sekolah')) ?>">
          </div>
          <div class="bg-primary text-white rounded-3 p-3 position-absolute bottom-0 start-0 m-3 shadow">
            <strong class="d-block small"><?= e(setting('kepala_sekolah')) ?></strong>
            <small class="opacity-75">Kepala Sekolah</small>
          </div>
        </div>
      </div>
      <div class="col-lg-7">
        <span class="kicker text-primary fw-bold small text-uppercase">Sambutan</span>
        <h2 class="mt-2 mb-3">Kata Sambutan Kepala Sekolah</h2>
        <p class="text-muted"><?= nl2br(e(setting('sambutan'))) ?></p>
        <div class="row g-3 mt-4">
          <div class="col-sm-6">
            <div class="d-flex gap-3">
              <i class="bi bi-bullseye text-primary fs-4"></i>
              <div><strong class="d-block">Visi</strong>
                <span class="small text-muted"><?= e(potong(setting('visi'), 110)) ?></span></div>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="d-flex gap-3">
              <i class="bi bi-list-check text-primary fs-4"></i>
              <div><strong class="d-block">Misi</strong>
                <span class="small text-muted"><?= count(setting_list('misi')) ?> butir misi sekolah</span></div>
            </div>
          </div>
        </div>
        <a href="<?= e(BASE_URL) ?>profil.php" class="btn btn-daftar mt-4">
          Selengkapnya tentang Sekolah <i class="bi bi-arrow-right ms-1"></i>
        </a>
      </div>
    </div>
  </div>
</section>

<!-- ============ PEMINATAN ============ -->
<?php if ($jurusan): ?>
<section class="bagian bagian-abu">
  <div class="container">
    <div class="judul-bagian">
      <span class="kicker">Program</span>
      <h2>Peminatan yang Tersedia</h2>
      <p>Pilih peminatan yang sesuai dengan minat dan rencana pendidikan lanjutan Anda.</p>
    </div>
    <div class="row g-4">
      <?php foreach ($jurusan as $j):
        $terisi = $pdo->prepare("SELECT COUNT(*) FROM pendaftar WHERE jurusan_id = ? AND tahun_ajaran = ? AND status IN ('Terverifikasi','Diterima')");
        $terisi->execute([$j['id'], setting('ppdb_tahun')]);
        $jml = (int) $terisi->fetchColumn(); ?>
        <div class="col-md-4">
          <div class="kartu">
            <div class="kartu-ikon"><i class="bi <?= e($j['icon'] ?: 'bi-mortarboard') ?>"></i></div>
            <h5><?= e($j['nama']) ?></h5>
            <p class="mb-3"><?= e($j['deskripsi']) ?></p>
            <div class="d-flex justify-content-between small text-muted border-top pt-3">
              <span><i class="bi bi-people me-1"></i>Kuota <?= (int) $j['kuota'] ?></span>
              <span><i class="bi bi-person-check me-1"></i>Terisi <?= $jml ?></span>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ============ ALUR PENDAFTARAN ============ -->
<section class="bagian">
  <div class="container">
    <div class="row g-5 align-items-start">
      <div class="col-lg-5">
        <span class="kicker text-primary fw-bold small text-uppercase">PPDB Online</span>
        <h2 class="mt-2 mb-3">Empat Langkah Mudah Mendaftar</h2>
        <p class="text-muted">Seluruh proses pendaftaran dilakukan dari rumah melalui ponsel
          atau komputer. Panitia akan memverifikasi berkas Anda maksimal 3 hari kerja.</p>
        <a href="<?= e(BASE_URL) ?>ppdb-daftar.php" class="btn btn-daftar mt-2">
          <i class="bi bi-pencil-square me-2"></i>Mulai Mendaftar
        </a>
      </div>
      <div class="col-lg-7">
        <?php
        $langkah = [
            ['Siapkan Dokumen', 'Pindai atau foto ijazah/SKL, rapor, Kartu Keluarga, akta kelahiran, dan foto 3x4. Maksimal 2 MB per berkas.'],
            ['Isi Formulir Online', 'Lengkapi data calon peserta didik, asal sekolah, dan data orang tua pada formulir pendaftaran.'],
            ['Cetak Bukti Pendaftaran', 'Sistem menerbitkan nomor registrasi. Simpan dan cetak bukti pendaftaran Anda.'],
            ['Pantau Hasil Verifikasi', 'Cek status pendaftaran kapan saja menggunakan nomor registrasi dan tanggal lahir.'],
        ];
        foreach ($langkah as $i => [$judul, $ket]): ?>
          <div class="langkah" data-nomor="<?= $i + 1 ?>">
            <h6><?= e($judul) ?></h6>
            <p><?= e($ket) ?></p>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

<!-- ============ FASILITAS ============ -->
<section class="bagian bagian-abu">
  <div class="container">
    <div class="judul-bagian">
      <span class="kicker">Sarana</span>
      <h2>Fasilitas Pendukung Pembelajaran</h2>
      <p>Sarana dan prasarana yang menunjang kegiatan akademik maupun pengembangan minat bakat.</p>
    </div>
    <div class="row g-4">
      <?php foreach ($fasilitas as $f): ?>
        <div class="col-md-6 col-lg-4">
          <div class="kartu">
            <div class="kartu-ikon"><i class="bi <?= e($f['icon'] ?: 'bi-building') ?>"></i></div>
            <h5><?= e($f['nama']) ?></h5>
            <p><?= e(potong($f['deskripsi'], 110)) ?></p>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="text-center mt-4">
      <a href="<?= e(BASE_URL) ?>fasilitas.php" class="btn btn-outline-primary">Lihat Semua Fasilitas</a>
    </div>
  </div>
</section>

<!-- ============ BERITA ============ -->
<?php if ($berita): ?>
<section class="bagian">
  <div class="container">
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
      <div>
        <span class="kicker text-primary fw-bold small text-uppercase">Informasi</span>
        <h2 class="mt-2 mb-0">Berita &amp; Pengumuman Terbaru</h2>
      </div>
      <a href="<?= e(BASE_URL) ?>berita.php" class="btn btn-outline-primary">
        Semua Berita <i class="bi bi-arrow-right ms-1"></i>
      </a>
    </div>
    <div class="row g-4">
      <?php foreach ($berita as $b): ?>
        <div class="col-md-4">
          <article class="kartu-berita">
            <img class="gambar" src="<?= e(url_upload($b['gambar'], 'berita')) ?>" alt="<?= e($b['judul']) ?>" loading="lazy">
            <div class="isi">
              <span class="label-kategori mb-2"><?= e($b['kategori']) ?></span>
              <h5><a href="<?= e(BASE_URL) ?>berita-detail.php?slug=<?= e($b['slug']) ?>"><?= e($b['judul']) ?></a></h5>
              <p class="small text-muted flex-grow-1"><?= e(potong($b['ringkasan'] ?: $b['isi'], 115)) ?></p>
              <div class="small text-muted border-top pt-2 mt-2 d-flex justify-content-between">
                <span><i class="bi bi-calendar3 me-1"></i><?= e(tgl_indo($b['created_at'])) ?></span>
                <span><i class="bi bi-eye me-1"></i><?= (int) $b['dibaca'] ?></span>
              </div>
            </div>
          </article>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ============ GALERI ============ -->
<?php if ($galeri): ?>
<section class="bagian bagian-abu">
  <div class="container">
    <div class="judul-bagian">
      <span class="kicker">Galeri</span>
      <h2>Dokumentasi Kegiatan Sekolah</h2>
    </div>
    <div class="row g-3">
      <?php foreach ($galeri as $g): ?>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="item-galeri" data-gambar="<?= e(url_upload($g['gambar'], 'galeri')) ?>" data-judul="<?= e($g['judul']) ?>">
            <img src="<?= e(url_upload($g['gambar'], 'galeri')) ?>" alt="<?= e($g['judul']) ?>" loading="lazy">
            <div class="tirai"><?= e($g['judul']) ?></div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="text-center mt-4">
      <a href="<?= e(BASE_URL) ?>galeri.php" class="btn btn-outline-primary">Lihat Galeri Lengkap</a>
    </div>
  </div>
</section>

<div class="modal fade" id="modalGaleri" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title"></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
      </div>
      <div class="modal-body p-0"><img src="" class="w-100" alt=""></div>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- ============ AJAKAN ============ -->
<section class="py-5" style="background:linear-gradient(135deg,var(--biru-tua),var(--biru));color:#fff">
  <div class="container">
    <div class="row align-items-center g-4">
      <div class="col-lg-8">
        <h2 class="text-white mb-2">Siap Bergabung dengan <?= e(setting('nama_sekolah')) ?>?</h2>
        <p class="mb-0 opacity-90">Pendaftaran peserta didik baru tahun ajaran
          <?= e(setting('ppdb_tahun')) ?> dapat dilakukan sekarang secara online.
          <?= e(setting('ppdb_biaya')) ?>.</p>
      </div>
      <div class="col-lg-4 text-lg-end">
        <a href="<?= e(BASE_URL) ?>ppdb-daftar.php" class="btn btn-emas btn-lg">
          <i class="bi bi-person-plus me-2"></i>Daftar Sekarang
        </a>
      </div>
    </div>
  </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>

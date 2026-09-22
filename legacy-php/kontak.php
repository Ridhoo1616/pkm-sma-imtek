<?php
require_once __DIR__ . '/includes/functions.php';
$judul_halaman     = 'Kontak Kami';
$deskripsi_halaman = 'Alamat, nomor telepon, dan formulir pertanyaan untuk ' . setting('nama_sekolah') . '.';
$halaman_aktif     = 'kontak';

$galat = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $nama   = input('nama');
    $email  = input('email');
    $noHp   = input('no_hp');
    $subjek = input('subjek');
    $isi    = input('isi');

    if ($nama === '')                                        $galat[] = 'Nama wajib diisi.';
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $galat[] = 'Format email tidak valid.';
    if ($email === '' && $noHp === '')                       $galat[] = 'Isi email atau nomor HP agar kami dapat membalas.';
    if (mb_strlen($isi) < 10)                                $galat[] = 'Pesan minimal 10 karakter.';

    if (!$galat) {
        $pdo->prepare('INSERT INTO pesan (nama, email, no_hp, subjek, isi) VALUES (?,?,?,?,?)')
            ->execute([$nama, $email ?: null, $noHp ?: null, $subjek ?: null, $isi]);
        set_flash('success', '<strong>Pesan terkirim.</strong> Terima kasih, pesan Anda telah kami terima dan akan segera ditindaklanjuti.');
        redirect('kontak.php');
    }
}
include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Kontak Kami</h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item active" aria-current="page">Kontak</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <?= tampil_flash() ?>
    <div class="row g-4 mb-5">
      <?php
      $kontak = [
          ['bi-geo-alt',   'Alamat',   setting('alamat')],
          ['bi-telephone', 'Telepon',  setting('telepon')],
          ['bi-envelope',  'Email',    setting('email')],
          ['bi-clock',     'Jam Layanan', setting('jam_operasional')],
      ];
      foreach ($kontak as [$ikon, $label, $nilai]): ?>
        <div class="col-md-6 col-lg-3">
          <div class="kartu text-center">
            <div class="kartu-ikon mx-auto"><i class="bi <?= $ikon ?>"></i></div>
            <h5><?= e($label) ?></h5>
            <p class="small"><?= e($nilai) ?></p>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <div class="row g-5">
      <div class="col-lg-7">
        <div class="kartu-form">
          <h4 class="mb-1">Kirim Pertanyaan</h4>
          <p class="text-muted small mb-4">Ada pertanyaan seputar PPDB atau program sekolah? Sampaikan melalui formulir berikut.</p>

          <?php if ($galat): ?>
            <div class="alert alert-danger">
              <strong>Periksa kembali isian Anda:</strong>
              <ul class="mb-0 mt-1 ps-3"><?php foreach ($galat as $g): ?><li><?= e($g) ?></li><?php endforeach; ?></ul>
            </div>
          <?php endif; ?>

          <form method="post" class="row g-3 perlu-validasi" novalidate>
            <?= csrf_field() ?>
            <div class="col-md-6">
              <label class="form-label" for="k-nama">Nama Lengkap <span class="wajib">*</span></label>
              <input type="text" class="form-control" id="k-nama" name="nama" required maxlength="100" value="<?= e(input('nama')) ?>">
              <div class="invalid-feedback">Nama wajib diisi.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="k-email">Email</label>
              <input type="email" class="form-control" id="k-email" name="email" maxlength="120" value="<?= e(input('email')) ?>">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="k-hp">Nomor HP / WhatsApp</label>
              <input type="tel" class="form-control" id="k-hp" name="no_hp" maxlength="25" value="<?= e(input('no_hp')) ?>">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="k-subjek">Subjek</label>
              <input type="text" class="form-control" id="k-subjek" name="subjek" maxlength="160" value="<?= e(input('subjek')) ?>">
            </div>
            <div class="col-12">
              <label class="form-label" for="k-isi">Pesan <span class="wajib">*</span></label>
              <textarea class="form-control" id="k-isi" name="isi" rows="5" required minlength="10"><?= e(input('isi')) ?></textarea>
              <div class="invalid-feedback">Pesan minimal 10 karakter.</div>
            </div>
            <div class="col-12">
              <button type="submit" class="btn btn-daftar"><i class="bi bi-send me-2"></i>Kirim Pesan</button>
              <?php if (setting('whatsapp')): ?>
                <a class="btn btn-success ms-2" target="_blank" rel="noopener"
                   href="https://wa.me/<?= e(setting('whatsapp')) ?>"><i class="bi bi-whatsapp me-2"></i>Chat WhatsApp</a>
              <?php endif; ?>
            </div>
          </form>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="kartu-form p-0 overflow-hidden">
          <?php if (setting('maps_embed')): ?>
            <iframe src="<?= e(setting('maps_embed')) ?>" width="100%" height="380" style="border:0"
                    loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Peta lokasi sekolah"></iframe>
          <?php else: ?>
            <div class="d-grid place-items-center text-center p-5 bg-light" style="min-height:380px;align-content:center">
              <i class="bi bi-map display-4 text-muted"></i>
              <p class="text-muted small mt-3 mb-0">Peta lokasi belum diatur.<br>
                Admin dapat menambahkan kode embed Google Maps<br>pada menu Pengaturan.</p>
            </div>
          <?php endif; ?>
        </div>
        <div class="kartu-form mt-4">
          <h6 class="mb-3"><i class="bi bi-share text-primary me-2"></i>Media Sosial</h6>
          <div class="d-grid gap-2 small">
            <?php
            $sosial = [['instagram', 'bi-instagram', 'Instagram'], ['facebook', 'bi-facebook', 'Facebook'],
                       ['youtube', 'bi-youtube', 'YouTube'], ['tiktok', 'bi-tiktok', 'TikTok']];
            $ada = false;
            foreach ($sosial as [$k, $ik, $lb]):
              if (setting($k)): $ada = true; ?>
                <a class="text-dark text-decoration-none" href="<?= e(setting($k)) ?>" target="_blank" rel="noopener">
                  <i class="bi <?= $ik ?> me-2 text-primary"></i><?= e($lb) ?>
                </a>
            <?php endif; endforeach;
            if (!$ada) echo '<span class="text-muted">Belum ada tautan media sosial.</span>'; ?>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
/**
 * Pengaturan profil sekolah, kontak, dan PPDB
 */
require_once __DIR__ . '/includes/auth.php';
wajib_admin();

/* Daftar field yang boleh disimpan, dikelompokkan untuk tampilan tab */
$kelompok = [
    'sekolah' => ['Profil Sekolah', 'bi-building', [
        'nama_sekolah'   => ['Nama Sekolah', 'text'],
        'tagline'        => ['Tagline / Slogan', 'text'],
        'npsn'           => ['NPSN', 'text'],
        'akreditasi'     => ['Akreditasi', 'text'],
        'status_sekolah' => ['Status Sekolah', 'pilih:Negeri=Negeri|Swasta=Swasta'],
        'kepala_sekolah' => ['Nama Kepala Sekolah', 'text'],
        'sambutan'       => ['Sambutan Kepala Sekolah', 'textarea'],
        'sejarah'        => ['Sejarah Singkat', 'textarea'],
        'visi'           => ['Visi', 'textarea'],
        'misi'           => ['Misi (satu baris = satu poin)', 'textarea'],
    ]],
    'kontak' => ['Kontak & Media Sosial', 'bi-telephone', [
        'alamat'          => ['Alamat Lengkap', 'textarea'],
        'kota'            => ['Kota (untuk kop surat / bukti pendaftaran)', 'text'],
        'telepon'         => ['Telepon', 'text'],
        'whatsapp'        => ['Nomor WhatsApp (format 62xxx, tanpa + atau spasi)', 'text'],
        'email'           => ['Email', 'text'],
        'jam_operasional' => ['Jam Layanan', 'text'],
        'instagram'       => ['Tautan Instagram', 'text'],
        'facebook'        => ['Tautan Facebook', 'text'],
        'youtube'         => ['Tautan YouTube', 'text'],
        'tiktok'          => ['Tautan TikTok', 'text'],
        'maps_embed'      => ['Kode src iframe Google Maps', 'textarea'],
    ]],
    'ppdb' => ['Pengaturan PPDB', 'bi-person-plus', [
        'ppdb_status'     => ['Status Pendaftaran', 'pilih:buka=Dibuka|tutup=Ditutup'],
        'ppdb_tahun'      => ['Tahun Ajaran Aktif', 'text'],
        'ppdb_mulai'      => ['Tanggal Mulai Pendaftaran', 'date'],
        'ppdb_selesai'    => ['Tanggal Akhir Pendaftaran', 'date'],
        'ppdb_pengumuman' => ['Tanggal Pengumuman Hasil', 'date'],
        'ppdb_kuota'      => ['Total Kuota Penerimaan', 'number'],
        'ppdb_biaya'      => ['Informasi Biaya Pendaftaran', 'text'],
        'ppdb_syarat'     => ['Syarat Pendaftaran (satu baris = satu poin)', 'textarea'],
    ]],
    'statistik' => ['Angka Statistik Beranda', 'bi-bar-chart', [
        'jml_siswa'    => ['Jumlah Peserta Didik', 'number'],
        'jml_guru'     => ['Jumlah Guru & Tenaga Pendidik', 'number'],
        'jml_alumni'   => ['Jumlah Alumni', 'number'],
        'jml_prestasi' => ['Jumlah Prestasi', 'number'],
    ]],
];

/* Kumpulkan semua nama field yang sah */
$fieldSah = [];
foreach ($kelompok as [, , $field]) {
    $fieldSah = array_merge($fieldSah, array_keys($field));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $st = $pdo->prepare('INSERT INTO pengaturan (nama_setting, nilai) VALUES (?, ?)
                         ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)');
    $jml = 0;
    foreach ($fieldSah as $nama) {
        if (array_key_exists($nama, $_POST)) {
            $nilai = is_string($_POST[$nama]) ? trim($_POST[$nama]) : '';
            // Normalkan nomor WhatsApp: hanya angka
            if ($nama === 'whatsapp') {
                $nilai = preg_replace('/\D/', '', $nilai);
                if (str_starts_with($nilai, '0')) {
                    $nilai = '62' . substr($nilai, 1);
                }
            }
            $st->execute([$nama, $nilai]);
            $jml++;
        }
    }
    set_flash('success', '<strong>' . $jml . ' pengaturan</strong> berhasil disimpan.');
    redirect('admin/pengaturan.php');
}

$judul      = 'Pengaturan';
$menu_aktif = 'pengaturan';
require_once __DIR__ . '/includes/header.php';
?>

<form method="post">
  <?= csrf_field() ?>
  <div class="panel">
    <div class="panel-kepala">
      <i class="bi bi-gear text-primary"></i>
      <h2>Pengaturan Website &amp; PPDB</h2>
      <button class="btn btn-sm btn-daftar ms-auto"><i class="bi bi-save me-1"></i>Simpan Semua Perubahan</button>
    </div>

    <div class="panel-isi">
      <ul class="nav nav-tabs mb-4" role="tablist">
        <?php foreach ($kelompok as $kunci => [$label, $ikon, ]): ?>
          <li class="nav-item">
            <button class="nav-link <?= $kunci === 'sekolah' ? 'active' : '' ?>" type="button"
                    data-bs-toggle="tab" data-bs-target="#tab-<?= $kunci ?>">
              <i class="bi <?= $ikon ?> me-1"></i><?= e($label) ?>
            </button>
          </li>
        <?php endforeach; ?>
      </ul>

      <div class="tab-content">
        <?php foreach ($kelompok as $kunci => [$label, , $field]): ?>
          <div class="tab-pane fade <?= $kunci === 'sekolah' ? 'show active' : '' ?>" id="tab-<?= $kunci ?>">

            <?php if ($kunci === 'ppdb'): ?>
              <div class="alert alert-info small">
                <i class="bi bi-info-circle me-1"></i>
                Formulir pendaftaran hanya dapat diisi jika status <strong>Dibuka</strong>
                <em>dan</em> tanggal hari ini berada dalam rentang tanggal mulai sampai tanggal akhir.
                Status saat ini: <strong><?= ppdb_dibuka() ? 'pendaftaran DIBUKA' : 'pendaftaran DITUTUP' ?></strong>.
              </div>
            <?php endif; ?>

            <div class="row g-3">
              <?php foreach ($field as $nama => [$labelField, $tipe]):
                $nilai = setting($nama);
                $lebar = in_array($tipe, ['textarea'], true) ? 'col-12' : 'col-md-6'; ?>
                <div class="<?= $lebar ?>">
                  <label class="form-label" for="s-<?= e($nama) ?>"><?= e($labelField) ?></label>

                  <?php if ($tipe === 'textarea'): ?>
                    <textarea class="form-control" id="s-<?= e($nama) ?>" name="<?= e($nama) ?>"
                              rows="<?= in_array($nama, ['misi', 'ppdb_syarat', 'sambutan', 'sejarah'], true) ? 6 : 3 ?>"><?= e($nilai) ?></textarea>

                  <?php elseif (str_starts_with($tipe, 'pilih:')):
                    $opsi = [];
                    foreach (explode('|', substr($tipe, 6)) as $o) {
                        [$k, $lb] = explode('=', $o);
                        $opsi[$k] = $lb;
                    } ?>
                    <select class="form-select" id="s-<?= e($nama) ?>" name="<?= e($nama) ?>">
                      <?php foreach ($opsi as $k => $lb): ?>
                        <option value="<?= e($k) ?>" <?= $nilai === $k ? 'selected' : '' ?>><?= e($lb) ?></option>
                      <?php endforeach; ?>
                    </select>

                  <?php else: ?>
                    <input type="<?= e($tipe) ?>" class="form-control" id="s-<?= e($nama) ?>"
                           name="<?= e($nama) ?>" value="<?= e($nilai) ?>">
                  <?php endif; ?>

                  <?php if ($nama === 'maps_embed'): ?>
                    <div class="form-text">Buka Google Maps &rarr; Bagikan &rarr; Sematkan peta, lalu
                      salin <strong>hanya nilai atribut src</strong> dari kode iframe.</div>
                  <?php elseif ($nama === 'whatsapp'): ?>
                    <div class="form-text">Contoh: 6281234567890. Nomor berawalan 0 akan otomatis diubah ke 62.</div>
                  <?php elseif ($nama === 'ppdb_tahun'): ?>
                    <div class="form-text">Format: 2026/2027. Menentukan penomoran registrasi pendaftar baru.</div>
                  <?php endif; ?>
                </div>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="panel-isi border-top">
      <button class="btn btn-daftar"><i class="bi bi-save me-2"></i>Simpan Semua Perubahan</button>
      <a href="<?= e(BASE_URL) ?>index.php" target="_blank" class="btn btn-outline-secondary">
        <i class="bi bi-box-arrow-up-right me-1"></i>Lihat Hasil di Website
      </a>
    </div>
  </div>
</form>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

<?php
/**
 * Cetak bukti pendaftaran PPDB
 * Akses hanya diberikan setelah pendaftar berhasil mendaftar atau melewati cek status,
 * atau oleh admin yang sudah login.
 */
require_once __DIR__ . '/includes/functions.php';

$no = input('no', 'get', '');
$bolehAdmin = !empty($_SESSION['admin_id']);
$bolehUser  = !empty($_SESSION['akses_cetak'][$no]);

if (!$no || (!$bolehAdmin && !$bolehUser)) {
    http_response_code(403);
    exit('<div style="font:15px/1.6 system-ui;max-width:560px;margin:80px auto;text-align:center">'
       . '<h2>Akses ditolak</h2><p>Untuk mencetak bukti pendaftaran, silakan lakukan '
       . '<a href="' . e(BASE_URL) . 'ppdb-cek.php">Cek Status Pendaftaran</a> terlebih dahulu.</p></div>');
}

$st = $pdo->prepare('SELECT p.*, j.nama AS nama_jurusan FROM pendaftar p
                     LEFT JOIN jurusan j ON j.id = p.jurusan_id
                     WHERE p.no_registrasi = ?');
$st->execute([$no]);
$p = $st->fetch();
if (!$p) {
    http_response_code(404);
    exit('Data pendaftaran tidak ditemukan.');
}

$baris = fn(string $label, ?string $nilai) =>
    '<tr><th>' . e($label) . '</th><td>: ' . e($nilai !== null && $nilai !== '' ? $nilai : '-') . '</td></tr>';
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bukti Pendaftaran <?= e($p['no_registrasi']) ?></title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; margin: 0; padding: 20px; }
  .lembar { max-width: 780px; margin: 0 auto; }
  .kop { display: flex; align-items: center; gap: 16px; border-bottom: 3px double #000; padding-bottom: 12px; }
  .kop img { width: 78px; height: 78px; }
  .kop .teks { text-align: center; flex: 1; }
  .kop h1 { font-size: 17pt; margin: 0; letter-spacing: .5px; }
  .kop h2 { font-size: 13pt; margin: 2px 0; font-weight: normal; }
  .kop p  { font-size: 10pt; margin: 2px 0 0; }
  .judul { text-align: center; margin: 22px 0 6px; }
  .judul h3 { font-size: 14pt; margin: 0; text-decoration: underline; letter-spacing: 1px; }
  .judul p  { font-size: 11pt; margin: 4px 0 0; }
  .noreg { text-align: center; margin: 14px 0 22px; }
  .noreg span { display: inline-block; border: 2px solid #000; padding: 7px 22px; font-size: 15pt;
                font-weight: bold; letter-spacing: 3px; font-family: 'Courier New', monospace; }
  table.data { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table.data th { width: 33%; text-align: left; font-weight: normal; vertical-align: top; padding: 3px 0; }
  table.data td { padding: 3px 0; vertical-align: top; }
  .seksi { font-weight: bold; text-transform: uppercase; font-size: 11pt; background: #eee;
           padding: 4px 8px; margin: 16px 0 8px; border-left: 4px solid #000; }
  .dua-kolom { display: flex; gap: 24px; }
  .dua-kolom > div { flex: 1; }
  .blok-identitas { width: 100%; border-collapse: collapse; }
  .blok-identitas > tbody > tr > td { vertical-align: top; padding: 0; }
  .blok-identitas .kol-foto { width: 127px; text-align: right; }
  .foto { width: 113px; height: 151px; border: 1px solid #000; object-fit: cover; }
  .foto-kosong { width: 113px; height: 151px; border: 1px solid #000; box-sizing: border-box;
                 display: grid; place-items: center; font-size: 9pt; text-align: center; color: #555; }
  .status { border: 1px solid #000; padding: 8px 12px; margin: 14px 0; font-size: 11pt; }
  .catatan { border: 1px dashed #555; padding: 10px 12px; font-size: 10pt; margin-top: 18px; }
  .catatan ol { margin: 6px 0 0; padding-left: 20px; }
  .ttd { margin-top: 26px; display: flex; justify-content: space-between; }
  .ttd div { text-align: center; width: 45%; font-size: 11pt; }
  .ttd .ruang { height: 62px; }
  .kaki { margin-top: 28px; border-top: 1px solid #999; padding-top: 6px;
          font-size: 8.5pt; color: #444; text-align: center; }
  .tombol { text-align: center; margin: 22px 0; }
  .tombol button, .tombol a { font-family: system-ui, sans-serif; font-size: 13px; padding: 9px 18px;
    border: 1px solid #12508f; background: #12508f; color: #fff; border-radius: 7px; cursor: pointer; text-decoration: none; }
  .tombol a { background: #fff; color: #12508f; margin-left: 8px; }
  @media print { .tombol { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="lembar">

  <div class="tombol">
    <button onclick="window.print()">Cetak / Simpan sebagai PDF</button>
    <a href="<?= e(BASE_URL) ?>ppdb-cek.php">Kembali</a>
  </div>

  <div class="kop">
    <img src="<?= e(BASE_URL) ?>assets/img/logo.svg" alt="Logo">
    <div class="teks">
      <h2>PEMERINTAH / YAYASAN PENYELENGGARA PENDIDIKAN</h2>
      <h1><?= e(strtoupper(setting('nama_sekolah'))) ?></h1>
      <p><?= e(setting('alamat')) ?></p>
      <p>Telp. <?= e(setting('telepon')) ?> &bull; Email: <?= e(setting('email')) ?>
         &bull; NPSN: <?= e(setting('npsn')) ?></p>
    </div>
  </div>

  <div class="judul">
    <h3>BUKTI PENDAFTARAN PESERTA DIDIK BARU</h3>
    <p>Tahun Ajaran <?= e($p['tahun_ajaran']) ?></p>
  </div>

  <div class="noreg"><span><?= e($p['no_registrasi']) ?></span></div>

  <div class="seksi">A. Data Calon Peserta Didik</div>
  <table class="blok-identitas"><tr><td>
  <table class="data">
    <?= $baris('Nama Lengkap', $p['nama_lengkap']) ?>
    <?= $baris('NISN', $p['nisn']) ?>
    <?= $baris('NIK', $p['nik']) ?>
    <?= $baris('Jenis Kelamin', $p['jenis_kelamin'] === 'L' ? 'Laki-laki' : 'Perempuan') ?>
    <?= $baris('Tempat, Tanggal Lahir', $p['tempat_lahir'] . ', ' . tgl_indo($p['tanggal_lahir'])) ?>
    <?= $baris('Agama', $p['agama']) ?>
    <?= $baris('Anak Ke / Jumlah Saudara', trim(($p['anak_ke'] ?: '-') . ' / ' . ($p['jumlah_saudara'] ?: '-'))) ?>
    <?= $baris('Alamat', $p['alamat']) ?>
    <?= $baris('Kelurahan / Kecamatan', trim(($p['kelurahan'] ?: '-') . ' / ' . ($p['kecamatan'] ?: '-'))) ?>
    <?= $baris('Kota / Provinsi', trim(($p['kota'] ?: '-') . ' / ' . ($p['provinsi'] ?: '-'))) ?>
    <?= $baris('No. HP / WhatsApp', $p['no_hp']) ?>
    <?= $baris('Email', $p['email']) ?>
  </table>
  </td><td class="kol-foto">
    <?php if ($p['file_foto'] && preg_match('/\.(jpe?g|png)$/i', $p['file_foto'])): ?>
      <img class="foto" src="<?= e(url_upload($p['file_foto'], 'pendaftar')) ?>" alt="Foto pendaftar">
    <?php else: ?>
      <div class="foto-kosong">Foto<br>3 x 4</div>
    <?php endif; ?>
  </td></tr></table>

  <div class="seksi">B. Pilihan Pendaftaran</div>
  <table class="data">
    <?= $baris('Jalur Pendaftaran', $p['jalur']) ?>
    <?= $baris('Peminatan', $p['nama_jurusan']) ?>
    <?= $baris('Tanggal Mendaftar', tgl_indo($p['created_at'], true)) ?>
  </table>

  <div class="seksi">C. Data Asal Sekolah</div>
  <table class="data">
    <?= $baris('Nama Sekolah', $p['asal_sekolah']) ?>
    <?= $baris('NPSN', $p['npsn_sekolah']) ?>
    <?= $baris('Alamat Sekolah', $p['alamat_sekolah']) ?>
    <?= $baris('Tahun Lulus', $p['tahun_lulus']) ?>
    <?= $baris('Nilai Rata-rata Rapor', $p['nilai_rata2'] !== null ? number_format((float) $p['nilai_rata2'], 2, ',', '.') : null) ?>
  </table>

  <div class="seksi">D. Data Orang Tua / Wali</div>
  <table class="data">
    <?= $baris('Nama Ayah', $p['nama_ayah']) ?>
    <?= $baris('Pekerjaan / Pendidikan Ayah', trim(($p['pekerjaan_ayah'] ?: '-') . ' / ' . ($p['pendidikan_ayah'] ?: '-'))) ?>
    <?= $baris('Nama Ibu', $p['nama_ibu']) ?>
    <?= $baris('Pekerjaan / Pendidikan Ibu', trim(($p['pekerjaan_ibu'] ?: '-') . ' / ' . ($p['pendidikan_ibu'] ?: '-'))) ?>
    <?= $baris('Penghasilan Orang Tua', $p['penghasilan']) ?>
    <?= $baris('No. HP Orang Tua', $p['no_hp_ortu']) ?>
    <?= $baris('Nama Wali', $p['nama_wali']) ?>
  </table>

  <div class="seksi">E. Kelengkapan Dokumen</div>
  <table class="data">
    <?php
    $dok = [
        'Foto 3x4'             => $p['file_foto'],
        'Ijazah / SKL'         => $p['file_ijazah'],
        'Kartu Keluarga'       => $p['file_kk'],
        'Akta Kelahiran'       => $p['file_akta'],
        'Rapor'                => $p['file_raport'],
        'Sertifikat Prestasi'  => $p['file_prestasi'],
    ];
    foreach ($dok as $label => $berkas):
        echo '<tr><th>' . e($label) . '</th><td>: '
           . ($berkas ? '&#10003; Sudah diunggah' : '&#10007; Belum diunggah') . '</td></tr>';
    endforeach; ?>
  </table>

  <div class="status">
    <strong>Status Pendaftaran:</strong> <?= e(strtoupper($p['status'])) ?>
    <?php if ($p['catatan_admin']): ?>
      <br><strong>Catatan Panitia:</strong> <?= e($p['catatan_admin']) ?>
    <?php endif; ?>
  </div>

  <div class="catatan">
    <strong>PERHATIAN:</strong>
    <ol>
      <li>Simpan lembar ini sebagai bukti pendaftaran yang sah.</li>
      <li>Verifikasi berkas dilakukan panitia maksimal 3 hari kerja sejak pendaftaran.</li>
      <li>Status pendaftaran dapat dipantau di <?= e(rtrim(BASE_URL, '/')) ?>/ppdb-cek.php
          menggunakan nomor registrasi dan tanggal lahir.</li>
      <li>Pengumuman hasil seleksi: <?= e(tgl_indo(setting('ppdb_pengumuman'))) ?>.</li>
      <li>Data yang terbukti tidak benar dapat menyebabkan pendaftaran dibatalkan.</li>
    </ol>
  </div>

  <div class="ttd">
    <div>
      <p>Calon Peserta Didik / Orang Tua</p>
      <div class="ruang"></div>
      <p><u><?= e($p['nama_lengkap']) ?></u></p>
    </div>
    <div>
      <p><?= e(setting('kota', 'Kota')) ?>, <?= e(tgl_indo(date('Y-m-d'))) ?><br>Panitia PPDB</p>
      <div class="ruang"></div>
      <p><u>........................................</u></p>
    </div>
  </div>

  <div class="kaki">
    Dokumen ini dicetak dari Sistem Informasi PPDB Online <?= e(setting('nama_sekolah')) ?>
    pada <?= e(tgl_indo(date('Y-m-d H:i:s'), true)) ?>. Dokumen sah tanpa tanda tangan basah panitia.
  </div>
</div>
</body>
</html>

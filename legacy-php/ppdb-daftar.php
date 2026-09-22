<?php
/**
 * Formulir Pendaftaran Peserta Didik Baru (PPDB) Online
 */
require_once __DIR__ . '/includes/functions.php';

$judul_halaman     = 'Formulir Pendaftaran PPDB';
$deskripsi_halaman = 'Formulir pendaftaran peserta didik baru ' . setting('nama_sekolah')
                   . ' tahun ajaran ' . setting('ppdb_tahun') . ' secara online.';
$halaman_aktif     = 'daftar';

$jurusan = $pdo->query('SELECT * FROM jurusan WHERE aktif = 1 ORDER BY urutan')->fetchAll();
$galat   = [];
$d       = [];   // data isian untuk ditampilkan ulang bila ada galat

/* ------------------------------------------------------------------
 |  Proses pengiriman formulir
 * ------------------------------------------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ppdb_dibuka()) {
    csrf_verify();

    // Perangkap spam: kolom tersembunyi yang tidak boleh terisi
    if ((string) input('website', 'post', '') !== '') {
        exit('Permintaan ditolak.');
    }

    $teksWajib = [
        'nama_lengkap'  => 'Nama lengkap',
        'jenis_kelamin' => 'Jenis kelamin',
        'tempat_lahir'  => 'Tempat lahir',
        'tanggal_lahir' => 'Tanggal lahir',
        'agama'         => 'Agama',
        'alamat'        => 'Alamat tempat tinggal',
        'no_hp'         => 'Nomor HP/WhatsApp',
        'asal_sekolah'  => 'Asal sekolah',
        'nama_ayah'     => 'Nama ayah',
        'nama_ibu'      => 'Nama ibu',
        'jalur'         => 'Jalur pendaftaran',
    ];

    $kolom = array_merge(array_keys($teksWajib), [
        'nisn', 'nik', 'anak_ke', 'jumlah_saudara', 'kelurahan', 'kecamatan', 'kota', 'provinsi',
        'kode_pos', 'email', 'npsn_sekolah', 'alamat_sekolah', 'tahun_lulus', 'nilai_rata2',
        'pekerjaan_ayah', 'pendidikan_ayah', 'pekerjaan_ibu', 'pendidikan_ibu', 'penghasilan',
        'no_hp_ortu', 'nama_wali', 'sumber_informasi', 'catatan_sumber', 'jurusan_id',
    ]);
    foreach ($kolom as $k) {
        $d[$k] = input($k, 'post', '');
    }

    /* ---- Validasi ---- */
    foreach ($teksWajib as $k => $label) {
        if ($d[$k] === '') {
            $galat[] = $label . ' wajib diisi.';
        }
    }

    if ($d['jenis_kelamin'] !== '' && !in_array($d['jenis_kelamin'], ['L', 'P'], true)) {
        $galat[] = 'Jenis kelamin tidak valid.';
    }

    $jalurSah = ['Reguler', 'Prestasi', 'Afirmasi', 'Perpindahan Tugas Orang Tua'];
    if ($d['jalur'] !== '' && !in_array($d['jalur'], $jalurSah, true)) {
        $galat[] = 'Jalur pendaftaran tidak valid.';
    }

    // Peminatan hanya diwajibkan bila sekolah memang membuka pilihan peminatan.
    // Sekolah yang tidak menjuruskan peserta didik sejak pendaftaran cukup
    // menonaktifkan seluruh peminatan; kolom ini otomatis hilang dari formulir.
    if ($jurusan) {
        $idJurusanSah = array_map('intval', array_column($jurusan, 'id'));
        if ($d['jurusan_id'] === '' || !in_array((int) $d['jurusan_id'], $idJurusanSah, true)) {
            $galat[] = 'Peminatan wajib dipilih.';
        }
    } else {
        $d['jurusan_id'] = '';
    }

    if ($d['tanggal_lahir'] !== '') {
        $ts = strtotime($d['tanggal_lahir']);
        if (!$ts || $d['tanggal_lahir'] !== date('Y-m-d', $ts)) {
            $galat[] = 'Format tanggal lahir tidak valid.';
        } else {
            $umur = (int) ((time() - $ts) / 31556952);
            if ($umur < 11 || $umur > 25) {
                $galat[] = 'Tanggal lahir tidak wajar untuk calon peserta didik SMA (usia terhitung ' . $umur . ' tahun).';
            }
        }
    }

    if ($d['nisn'] !== '' && !preg_match('/^\d{10}$/', $d['nisn'])) {
        $galat[] = 'NISN harus berupa 10 angka.';
    }
    if ($d['nik'] !== '' && !preg_match('/^\d{16}$/', $d['nik'])) {
        $galat[] = 'NIK harus berupa 16 angka.';
    }
    if (!preg_match('/^[0-9+\-\s()]{9,25}$/', $d['no_hp'])) {
        $galat[] = 'Nomor HP tidak valid (gunakan 9-15 angka).';
    }
    if ($d['email'] !== '' && !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
        $galat[] = 'Format email tidak valid.';
    }
    if ($d['nilai_rata2'] !== '') {
        if (!is_numeric($d['nilai_rata2']) || $d['nilai_rata2'] < 0 || $d['nilai_rata2'] > 100) {
            $galat[] = 'Nilai rata-rata harus berupa angka 0 sampai 100.';
        }
    }

    if (empty($_POST['pernyataan'])) {
        $galat[] = 'Anda harus menyetujui pernyataan kebenaran data.';
    }

    // Cegah pendaftaran ganda pada tahun ajaran yang sama
    if ($d['nama_lengkap'] !== '' && $d['tanggal_lahir'] !== '') {
        $cek = $pdo->prepare('SELECT no_registrasi FROM pendaftar
                              WHERE nama_lengkap = ? AND tanggal_lahir = ? AND tahun_ajaran = ?');
        $cek->execute([$d['nama_lengkap'], $d['tanggal_lahir'], setting('ppdb_tahun')]);
        if ($noLama = $cek->fetchColumn()) {
            $galat[] = 'Data dengan nama dan tanggal lahir yang sama sudah terdaftar dengan nomor registrasi <strong>'
                     . e($noLama) . '</strong>. Gunakan menu Cek Status untuk memantau pendaftaran tersebut.';
        }
    }

    /* ---- Unggah dokumen ---- */
    $berkasWajib = [
        'file_foto'   => ['Foto 3x4',             ['jpg', 'jpeg', 'png']],
        'file_ijazah' => ['Ijazah / SKL',         ['jpg', 'jpeg', 'png', 'pdf']],
        'file_kk'     => ['Kartu Keluarga',       ['jpg', 'jpeg', 'png', 'pdf']],
    ];
    $berkasOpsional = [
        'file_akta'     => ['Akta Kelahiran', ['jpg', 'jpeg', 'png', 'pdf']],
        'file_raport'   => ['Rapor',          ['jpg', 'jpeg', 'png', 'pdf']],
        'file_prestasi' => ['Sertifikat Prestasi', ['jpg', 'jpeg', 'png', 'pdf']],
    ];

    $terunggah = [];
    foreach ($berkasWajib + $berkasOpsional as $kunci => [$label, $tipe]) {
        $adaBerkas = isset($_FILES[$kunci]) && $_FILES[$kunci]['error'] !== UPLOAD_ERR_NO_FILE;
        if (!$adaBerkas) {
            if (isset($berkasWajib[$kunci])) {
                $galat[] = $label . ' wajib diunggah.';
            }
            $terunggah[$kunci] = null;
            continue;
        }
        [$nama, $pesanGalat] = unggah_berkas($_FILES[$kunci], 'pendaftar', $tipe);
        if ($pesanGalat) {
            $galat[] = $label . ': ' . $pesanGalat;
        }
        $terunggah[$kunci] = $nama;
    }

    if ($d['jalur'] === 'Prestasi' && empty($terunggah['file_prestasi'])) {
        $galat[] = 'Jalur Prestasi mewajibkan unggahan sertifikat prestasi.';
    }

    /* ---- Simpan ---- */
    if ($galat) {
        // Bersihkan berkas yang sudah tersimpan agar tidak menjadi sampah
        foreach ($terunggah as $nama) {
            hapus_berkas($nama, 'pendaftar');
        }
    } else {
        try {
            $pdo->beginTransaction();
            $noReg = buat_no_registrasi($pdo, setting('ppdb_tahun'));

            $sql = 'INSERT INTO pendaftar (
                no_registrasi, tahun_ajaran, jalur, jurusan_id,
                nama_lengkap, nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
                anak_ke, jumlah_saudara, alamat, kelurahan, kecamatan, kota, provinsi, kode_pos,
                no_hp, email, asal_sekolah, npsn_sekolah, alamat_sekolah, tahun_lulus, nilai_rata2,
                nama_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, pekerjaan_ibu, pendidikan_ibu,
                penghasilan, no_hp_ortu, nama_wali,
                file_foto, file_ijazah, file_kk, file_akta, file_raport, file_prestasi,
                sumber_informasi, catatan_sumber, ip_pendaftar
            ) VALUES (' . rtrim(str_repeat('?,', 44), ',') . ')';

            $pdo->prepare($sql)->execute([
                $noReg, setting('ppdb_tahun'), $d['jalur'], $d['jurusan_id'] !== '' ? (int) $d['jurusan_id'] : null,
                $d['nama_lengkap'], $d['nisn'] ?: null, $d['nik'] ?: null, $d['jenis_kelamin'],
                $d['tempat_lahir'], $d['tanggal_lahir'], $d['agama'],
                $d['anak_ke'] ?: null, $d['jumlah_saudara'] ?: null, $d['alamat'],
                $d['kelurahan'] ?: null, $d['kecamatan'] ?: null, $d['kota'] ?: null,
                $d['provinsi'] ?: null, $d['kode_pos'] ?: null,
                $d['no_hp'], $d['email'] ?: null,
                $d['asal_sekolah'], $d['npsn_sekolah'] ?: null, $d['alamat_sekolah'] ?: null,
                $d['tahun_lulus'] ?: null, $d['nilai_rata2'] !== '' ? $d['nilai_rata2'] : null,
                $d['nama_ayah'], $d['pekerjaan_ayah'] ?: null, $d['pendidikan_ayah'] ?: null,
                $d['nama_ibu'], $d['pekerjaan_ibu'] ?: null, $d['pendidikan_ibu'] ?: null,
                $d['penghasilan'] ?: null, $d['no_hp_ortu'] ?: null, $d['nama_wali'] ?: null,
                $terunggah['file_foto'], $terunggah['file_ijazah'], $terunggah['file_kk'],
                $terunggah['file_akta'], $terunggah['file_raport'], $terunggah['file_prestasi'],
                $d['sumber_informasi'] ?: null, $d['catatan_sumber'] ?: null,
                $_SERVER['REMOTE_ADDR'] ?? null,
            ]);

            $pdo->commit();
            $_SESSION['ppdb_sukses'] = $noReg;
            redirect('ppdb-sukses.php');
        } catch (PDOException $ex) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            foreach ($terunggah as $nama) {
                hapus_berkas($nama, 'pendaftar');
            }
            $galat[] = 'Data gagal disimpan. Silakan coba lagi beberapa saat.'
                     . (MODE_PENGEMBANGAN ? ' (' . e($ex->getMessage()) . ')' : '');
        }
    }
}

$v = fn(string $k, string $bawaan = '') => e($d[$k] ?? $bawaan);
$terpilih = fn(string $k, string $nilai) => (($d[$k] ?? '') === $nilai) ? 'selected' : '';

include __DIR__ . '/includes/header.php';
?>
<section class="header-halaman">
  <div class="container">
    <h1>Formulir Pendaftaran PPDB <?= e(setting('ppdb_tahun')) ?></h1>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
        <li class="breadcrumb-item"><a href="<?= e(BASE_URL) ?>ppdb.php">PPDB</a></li>
        <li class="breadcrumb-item active" aria-current="page">Formulir Pendaftaran</li>
      </ol>
    </nav>
  </div>
</section>

<section class="bagian">
  <div class="container">
    <?php if (!ppdb_dibuka()): ?>
      <div class="row justify-content-center">
        <div class="col-lg-7 text-center">
          <div class="kartu-form py-5">
            <i class="bi bi-lock display-1 text-secondary"></i>
            <h2 class="h4 mt-3">Pendaftaran Sedang Ditutup</h2>
            <p class="text-muted">Periode pendaftaran PPDB <?= e(setting('ppdb_tahun')) ?> adalah
              <strong><?= e(tgl_indo(setting('ppdb_mulai'))) ?></strong> s.d.
              <strong><?= e(tgl_indo(setting('ppdb_selesai'))) ?></strong>.</p>
            <p class="text-muted small">Silakan hubungi sekolah untuk informasi lebih lanjut.</p>
            <a href="<?= e(BASE_URL) ?>ppdb.php" class="btn btn-daftar mt-2">Lihat Informasi PPDB</a>
          </div>
        </div>
      </div>

    <?php else: ?>
      <div class="row g-4">
        <div class="col-lg-8">
          <?php if ($galat): ?>
            <div class="alert alert-danger">
              <strong><i class="bi bi-exclamation-triangle me-1"></i>Pendaftaran belum dapat diproses.</strong>
              <ul class="mb-0 mt-2 ps-3">
                <?php foreach ($galat as $g): ?><li><?= $g ?></li><?php endforeach; ?>
              </ul>
              <hr class="my-2">
              <span class="small">Catatan: berkas yang sudah Anda pilih perlu dipilih ulang setelah perbaikan.</span>
            </div>
          <?php endif; ?>

          <form method="post" enctype="multipart/form-data" class="kartu-form perlu-validasi" novalidate>
            <?= csrf_field() ?>
            <input type="text" name="website" value="" tabindex="-1" autocomplete="off"
                   style="position:absolute;left:-9999px" aria-hidden="true">

            <!-- ============ 1. PILIHAN PENDAFTARAN ============ -->
            <div class="judul-seksi"><span class="nomor">1</span>Pilihan Pendaftaran</div>
            <div class="row g-3">
              <div class="<?= $jurusan ? 'col-md-6' : 'col-12' ?>">
                <label class="form-label" for="f-jalur">Jalur Pendaftaran <span class="wajib">*</span></label>
                <select class="form-select" id="f-jalur" name="jalur" required>
                  <option value="">-- Pilih jalur --</option>
                  <?php foreach (['Reguler', 'Prestasi', 'Afirmasi', 'Perpindahan Tugas Orang Tua'] as $jl): ?>
                    <option value="<?= e($jl) ?>" <?= $terpilih('jalur', $jl) ?>><?= e($jl) ?></option>
                  <?php endforeach; ?>
                </select>
                <div class="form-text">Jalur Prestasi wajib mengunggah sertifikat prestasi.</div>
                <div class="invalid-feedback">Jalur pendaftaran wajib dipilih.</div>
              </div>
              <?php if ($jurusan): ?>
              <div class="col-md-6">
                <label class="form-label" for="f-jurusan">Peminatan yang Dipilih <span class="wajib">*</span></label>
                <select class="form-select" id="f-jurusan" name="jurusan_id" required>
                  <option value="">-- Pilih peminatan --</option>
                  <?php foreach ($jurusan as $j): ?>
                    <option value="<?= (int) $j['id'] ?>" <?= $terpilih('jurusan_id', (string) $j['id']) ?>>
                      <?= e($j['nama']) ?> (kuota <?= (int) $j['kuota'] ?>)
                    </option>
                  <?php endforeach; ?>
                </select>
                <div class="invalid-feedback">Peminatan wajib dipilih.</div>
              </div>
              <?php endif; ?>
            </div>

            <!-- ============ 2. DATA CALON PESERTA DIDIK ============ -->
            <div class="judul-seksi"><span class="nomor">2</span>Data Calon Peserta Didik</div>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label" for="f-nama">Nama Lengkap <span class="wajib">*</span></label>
                <input type="text" class="form-control" id="f-nama" name="nama_lengkap" required maxlength="120"
                       value="<?= $v('nama_lengkap') ?>" placeholder="Sesuai ijazah/akta kelahiran">
                <div class="invalid-feedback">Nama lengkap wajib diisi.</div>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-jk">Jenis Kelamin <span class="wajib">*</span></label>
                <select class="form-select" id="f-jk" name="jenis_kelamin" required>
                  <option value="">-- Pilih --</option>
                  <option value="L" <?= $terpilih('jenis_kelamin', 'L') ?>>Laki-laki</option>
                  <option value="P" <?= $terpilih('jenis_kelamin', 'P') ?>>Perempuan</option>
                </select>
                <div class="invalid-feedback">Jenis kelamin wajib dipilih.</div>
              </div>

              <div class="col-md-6">
                <label class="form-label" for="f-nisn">NISN</label>
                <input type="text" class="form-control" id="f-nisn" name="nisn" maxlength="10"
                       pattern="\d{10}" inputmode="numeric" value="<?= $v('nisn') ?>" placeholder="10 angka">
                <div class="form-text">Nomor Induk Siswa Nasional dari SMP/MTs.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="f-nik">NIK</label>
                <input type="text" class="form-control" id="f-nik" name="nik" maxlength="16"
                       pattern="\d{16}" inputmode="numeric" value="<?= $v('nik') ?>" placeholder="16 angka sesuai KK">
              </div>

              <div class="col-md-6">
                <label class="form-label" for="f-tempat">Tempat Lahir <span class="wajib">*</span></label>
                <input type="text" class="form-control" id="f-tempat" name="tempat_lahir" required maxlength="80"
                       value="<?= $v('tempat_lahir') ?>">
                <div class="invalid-feedback">Tempat lahir wajib diisi.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="f-tgl">Tanggal Lahir <span class="wajib">*</span></label>
                <input type="date" class="form-control" id="f-tgl" name="tanggal_lahir" required
                       max="<?= date('Y-m-d') ?>" value="<?= $v('tanggal_lahir') ?>">
                <div class="invalid-feedback">Tanggal lahir wajib diisi.</div>
              </div>

              <div class="col-md-4">
                <label class="form-label" for="f-agama">Agama <span class="wajib">*</span></label>
                <select class="form-select" id="f-agama" name="agama" required>
                  <option value="">-- Pilih --</option>
                  <?php foreach (['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'] as $ag): ?>
                    <option value="<?= e($ag) ?>" <?= $terpilih('agama', $ag) ?>><?= e($ag) ?></option>
                  <?php endforeach; ?>
                </select>
                <div class="invalid-feedback">Agama wajib dipilih.</div>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-anak">Anak Ke-</label>
                <input type="number" class="form-control" id="f-anak" name="anak_ke" min="1" max="20" value="<?= $v('anak_ke') ?>">
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-saudara">Jumlah Saudara</label>
                <input type="number" class="form-control" id="f-saudara" name="jumlah_saudara" min="0" max="20" value="<?= $v('jumlah_saudara') ?>">
              </div>

              <div class="col-12">
                <label class="form-label" for="f-alamat">Alamat Tempat Tinggal <span class="wajib">*</span></label>
                <textarea class="form-control" id="f-alamat" name="alamat" rows="2" required
                          placeholder="Nama jalan, nomor rumah, RT/RW"><?= $v('alamat') ?></textarea>
                <div class="invalid-feedback">Alamat wajib diisi.</div>
              </div>

              <div class="col-md-3">
                <label class="form-label" for="f-kel">Kelurahan/Desa</label>
                <input type="text" class="form-control" id="f-kel" name="kelurahan" maxlength="80" value="<?= $v('kelurahan') ?>">
              </div>
              <div class="col-md-3">
                <label class="form-label" for="f-kec">Kecamatan</label>
                <input type="text" class="form-control" id="f-kec" name="kecamatan" maxlength="80" value="<?= $v('kecamatan') ?>">
              </div>
              <div class="col-md-3">
                <label class="form-label" for="f-kota">Kota/Kabupaten</label>
                <input type="text" class="form-control" id="f-kota" name="kota" maxlength="80" value="<?= $v('kota') ?>">
              </div>
              <div class="col-md-3">
                <label class="form-label" for="f-prov">Provinsi</label>
                <input type="text" class="form-control" id="f-prov" name="provinsi" maxlength="80" value="<?= $v('provinsi') ?>">
              </div>

              <div class="col-md-3">
                <label class="form-label" for="f-pos">Kode Pos</label>
                <input type="text" class="form-control" id="f-pos" name="kode_pos" maxlength="10" inputmode="numeric" value="<?= $v('kode_pos') ?>">
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-hp">No. HP / WhatsApp <span class="wajib">*</span></label>
                <input type="tel" class="form-control" id="f-hp" name="no_hp" required maxlength="25"
                       value="<?= $v('no_hp') ?>" placeholder="08xxxxxxxxxx">
                <div class="form-text">Nomor aktif untuk pemberitahuan hasil seleksi.</div>
                <div class="invalid-feedback">Nomor HP wajib diisi.</div>
              </div>
              <div class="col-md-5">
                <label class="form-label" for="f-email">Email</label>
                <input type="email" class="form-control" id="f-email" name="email" maxlength="120" value="<?= $v('email') ?>">
              </div>
            </div>

            <!-- ============ 3. ASAL SEKOLAH ============ -->
            <div class="judul-seksi"><span class="nomor">3</span>Data Asal Sekolah</div>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label" for="f-sekolah">Nama SMP/MTs Asal <span class="wajib">*</span></label>
                <input type="text" class="form-control" id="f-sekolah" name="asal_sekolah" required maxlength="140" value="<?= $v('asal_sekolah') ?>">
                <div class="invalid-feedback">Asal sekolah wajib diisi.</div>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-npsn">NPSN Sekolah Asal</label>
                <input type="text" class="form-control" id="f-npsn" name="npsn_sekolah" maxlength="20" value="<?= $v('npsn_sekolah') ?>">
              </div>
              <div class="col-12">
                <label class="form-label" for="f-alsek">Alamat Sekolah Asal</label>
                <input type="text" class="form-control" id="f-alsek" name="alamat_sekolah" maxlength="200" value="<?= $v('alamat_sekolah') ?>">
              </div>
              <div class="col-md-6">
                <label class="form-label" for="f-lulus">Tahun Lulus</label>
                <input type="number" class="form-control" id="f-lulus" name="tahun_lulus"
                       min="2000" max="<?= date('Y') + 1 ?>" value="<?= $v('tahun_lulus', date('Y')) ?>">
              </div>
              <div class="col-md-6">
                <label class="form-label" for="f-nilai">Nilai Rata-rata Rapor</label>
                <input type="number" step="0.01" min="0" max="100" class="form-control" id="f-nilai"
                       name="nilai_rata2" value="<?= $v('nilai_rata2') ?>" placeholder="Contoh: 85.50">
                <div class="form-text">Rata-rata rapor semester 1 s.d. 5.</div>
              </div>
            </div>

            <!-- ============ 4. DATA ORANG TUA ============ -->
            <div class="judul-seksi"><span class="nomor">4</span>Data Orang Tua / Wali</div>
            <div class="row g-3">
              <div class="col-md-5">
                <label class="form-label" for="f-ayah">Nama Ayah <span class="wajib">*</span></label>
                <input type="text" class="form-control" id="f-ayah" name="nama_ayah" required maxlength="120" value="<?= $v('nama_ayah') ?>">
                <div class="invalid-feedback">Nama ayah wajib diisi.</div>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-kerja-ayah">Pekerjaan Ayah</label>
                <input type="text" class="form-control" id="f-kerja-ayah" name="pekerjaan_ayah" maxlength="80" value="<?= $v('pekerjaan_ayah') ?>">
              </div>
              <div class="col-md-3">
                <label class="form-label" for="f-didik-ayah">Pendidikan Ayah</label>
                <select class="form-select" id="f-didik-ayah" name="pendidikan_ayah">
                  <option value="">-- Pilih --</option>
                  <?php foreach (['SD', 'SMP', 'SMA/SMK', 'D1-D3', 'S1', 'S2', 'S3', 'Tidak Sekolah'] as $pd): ?>
                    <option value="<?= e($pd) ?>" <?= $terpilih('pendidikan_ayah', $pd) ?>><?= e($pd) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>

              <div class="col-md-5">
                <label class="form-label" for="f-ibu">Nama Ibu <span class="wajib">*</span></label>
                <input type="text" class="form-control" id="f-ibu" name="nama_ibu" required maxlength="120" value="<?= $v('nama_ibu') ?>">
                <div class="invalid-feedback">Nama ibu wajib diisi.</div>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-kerja-ibu">Pekerjaan Ibu</label>
                <input type="text" class="form-control" id="f-kerja-ibu" name="pekerjaan_ibu" maxlength="80" value="<?= $v('pekerjaan_ibu') ?>">
              </div>
              <div class="col-md-3">
                <label class="form-label" for="f-didik-ibu">Pendidikan Ibu</label>
                <select class="form-select" id="f-didik-ibu" name="pendidikan_ibu">
                  <option value="">-- Pilih --</option>
                  <?php foreach (['SD', 'SMP', 'SMA/SMK', 'D1-D3', 'S1', 'S2', 'S3', 'Tidak Sekolah'] as $pd): ?>
                    <option value="<?= e($pd) ?>" <?= $terpilih('pendidikan_ibu', $pd) ?>><?= e($pd) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label" for="f-hasil">Penghasilan Orang Tua</label>
                <select class="form-select" id="f-hasil" name="penghasilan">
                  <option value="">-- Pilih --</option>
                  <?php foreach (['< Rp1.000.000', 'Rp1.000.000 - Rp2.500.000', 'Rp2.500.000 - Rp5.000.000',
                                  'Rp5.000.000 - Rp10.000.000', '> Rp10.000.000'] as $ph): ?>
                    <option value="<?= e($ph) ?>" <?= $terpilih('penghasilan', $ph) ?>><?= e($ph) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-hp-ortu">No. HP Orang Tua</label>
                <input type="tel" class="form-control" id="f-hp-ortu" name="no_hp_ortu" maxlength="25" value="<?= $v('no_hp_ortu') ?>">
              </div>
              <div class="col-md-4">
                <label class="form-label" for="f-wali">Nama Wali <span class="text-muted small">(bila ada)</span></label>
                <input type="text" class="form-control" id="f-wali" name="nama_wali" maxlength="120" value="<?= $v('nama_wali') ?>">
              </div>
            </div>

            <!-- ============ 5. DOKUMEN ============ -->
            <div class="judul-seksi"><span class="nomor">5</span>Unggah Dokumen</div>
            <div class="alert alert-info small">
              <i class="bi bi-info-circle me-1"></i>
              Format berkas: JPG, PNG, atau PDF. Ukuran maksimal <strong>2 MB</strong> per berkas.
              Pastikan berkas terbaca jelas.
            </div>
            <div class="row g-3">
              <?php
              $inputBerkas = [
                  ['file_foto',     'Foto Berwarna 3x4',     true,  'Hanya JPG atau PNG.', 'image/jpeg,image/png'],
                  ['file_ijazah',   'Ijazah / SKL SMP-MTs',  true,  'Hasil pindai atau foto yang jelas.', 'image/jpeg,image/png,application/pdf'],
                  ['file_kk',       'Kartu Keluarga',        true,  '', 'image/jpeg,image/png,application/pdf'],
                  ['file_akta',     'Akta Kelahiran',        false, '', 'image/jpeg,image/png,application/pdf'],
                  ['file_raport',   'Rapor Semester 1-5',    false, 'Dapat digabung menjadi satu PDF.', 'image/jpeg,image/png,application/pdf'],
                  ['file_prestasi', 'Sertifikat Prestasi',   false, 'Wajib untuk jalur Prestasi.', 'image/jpeg,image/png,application/pdf'],
              ];
              foreach ($inputBerkas as [$nm, $lb, $wajib, $ket, $accept]): ?>
                <div class="col-md-6">
                  <label class="form-label" for="f-<?= $nm ?>"><?= e($lb) ?> <?= $wajib ? '<span class="wajib">*</span>' : '<span class="text-muted small">(opsional)</span>' ?></label>
                  <input type="file" class="form-control" id="f-<?= $nm ?>" name="<?= $nm ?>"
                         accept="<?= $accept ?>" <?= $wajib ? 'required' : '' ?>>
                  <?php if ($ket): ?><div class="form-text"><?= e($ket) ?></div><?php endif; ?>
                  <div class="invalid-feedback">Dokumen ini wajib diunggah.</div>
                </div>
              <?php endforeach; ?>
            </div>

            <!-- ============ 6. SUMBER INFORMASI ============ -->
            <div class="judul-seksi"><span class="nomor">6</span>Sumber Informasi</div>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="f-sumber">Dari mana Anda mengetahui <?= e(setting('nama_sekolah')) ?>?</label>
                <select class="form-select" id="f-sumber" name="sumber_informasi">
                  <option value="">-- Pilih --</option>
                  <?php foreach (daftar_sumber_informasi() as $nilai => $label): ?>
                    <option value="<?= e($nilai) ?>" <?= $terpilih('sumber_informasi', $nilai) ?>><?= e($label) ?></option>
                  <?php endforeach; ?>
                </select>
                <div class="form-text">Jawaban Anda membantu sekolah menilai efektivitas promosi.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="f-catatan-sumber">Keterangan Tambahan</label>
                <input type="text" class="form-control" id="f-catatan-sumber" name="catatan_sumber"
                       maxlength="160" value="<?= $v('catatan_sumber') ?>" placeholder="Misal: nama akun, nama guru, atau lokasi spanduk">
              </div>
            </div>

            <!-- ============ PERNYATAAN ============ -->
            <div class="alert alert-light border mt-4">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" value="1" id="f-pernyataan" name="pernyataan" required
                       <?= !empty($_POST['pernyataan']) ? 'checked' : '' ?>>
                <label class="form-check-label small" for="f-pernyataan">
                  Saya menyatakan bahwa seluruh data dan dokumen yang saya isikan adalah
                  <strong>benar dan dapat dipertanggungjawabkan</strong>. Saya memahami bahwa data yang tidak benar
                  dapat menyebabkan pendaftaran dibatalkan, serta menyetujui data ini digunakan oleh
                  <?= e(setting('nama_sekolah')) ?> untuk keperluan proses seleksi PPDB. <span class="wajib">*</span>
                </label>
                <div class="invalid-feedback">Pernyataan wajib disetujui.</div>
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2 mt-4">
              <button type="submit" class="btn btn-daftar btn-lg">
                <i class="bi bi-send-check me-2"></i>Kirim Formulir Pendaftaran
              </button>
              <a href="<?= e(BASE_URL) ?>ppdb.php" class="btn btn-outline-secondary btn-lg">Batal</a>
            </div>
          </form>
        </div>

        <!-- Panduan samping -->
        <aside class="col-lg-4">
          <div class="kartu-form mb-4 position-sticky" style="top:100px">
            <h6 class="mb-3"><i class="bi bi-clipboard-check text-primary me-2"></i>Sebelum Mengisi, Siapkan:</h6>
            <ul class="list-unstyled small d-grid gap-2 mb-4">
              <?php foreach (setting_list('ppdb_syarat') as $s): ?>
                <li class="d-flex gap-2"><i class="bi bi-check2-square text-success mt-1"></i><span><?= e($s) ?></span></li>
              <?php endforeach; ?>
            </ul>

            <h6 class="mb-2"><i class="bi bi-lightbulb text-warning me-2"></i>Tips Pengisian</h6>
            <ul class="small text-muted ps-3 mb-4">
              <li>Tulis nama sesuai ijazah atau akta kelahiran.</li>
              <li>Gunakan nomor HP yang aktif WhatsApp.</li>
              <li>Pastikan hasil pindai dokumen tidak terpotong.</li>
              <li>Simpan nomor registrasi setelah pendaftaran berhasil.</li>
            </ul>

            <div class="alert alert-warning small mb-3">
              <i class="bi bi-exclamation-circle me-1"></i>
              Batas akhir pendaftaran: <strong><?= e(tgl_indo(setting('ppdb_selesai'))) ?></strong>
            </div>

            <?php if (setting('whatsapp')): ?>
              <a class="btn btn-success w-100" target="_blank" rel="noopener"
                 href="https://wa.me/<?= e(setting('whatsapp')) ?>?text=<?= rawurlencode('Halo panitia PPDB, saya butuh bantuan pengisian formulir pendaftaran online.') ?>">
                <i class="bi bi-whatsapp me-2"></i>Butuh Bantuan? Chat Panitia
              </a>
            <?php endif; ?>
          </div>
        </aside>
      </div>
    <?php endif; ?>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
/**
 * Detail pendaftar: lihat seluruh data, dokumen, ubah status & catatan
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

$id = (int) input('id', 'get', 0);
$statusSah = ['Menunggu Verifikasi', 'Terverifikasi', 'Diterima', 'Cadangan', 'Ditolak'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $id = (int) input('id');

    if (input('aksi') === 'hapus') {
        if (admin_role() !== 'admin') {
            set_flash('danger', 'Hanya Administrator yang dapat menghapus data pendaftar.');
            redirect('admin/pendaftar-detail.php?id=' . $id);
        }
        $st = $pdo->prepare('SELECT file_foto, file_ijazah, file_kk, file_akta, file_raport, file_prestasi FROM pendaftar WHERE id = ?');
        $st->execute([$id]);
        foreach ((array) $st->fetch() as $berkas) {
            hapus_berkas($berkas, 'pendaftar');
        }
        $pdo->prepare('DELETE FROM pendaftar WHERE id = ?')->execute([$id]);
        set_flash('success', 'Data pendaftar beserta dokumennya telah dihapus.');
        redirect('admin/pendaftar.php');
    }

    $status  = input('status');
    $catatan = input('catatan_admin');
    if (!in_array($status, $statusSah, true)) {
        set_flash('danger', 'Status yang dipilih tidak valid.');
    } else {
        $pdo->prepare('UPDATE pendaftar SET status = ?, catatan_admin = ?, diverifikasi_oleh = ? WHERE id = ?')
            ->execute([$status, $catatan ?: null, admin_id(), $id]);
        set_flash('success', 'Status pendaftar berhasil diperbarui menjadi <strong>' . e($status) . '</strong>.');
    }
    redirect('admin/pendaftar-detail.php?id=' . $id);
}

$st = $pdo->prepare('SELECT p.*, j.nama AS nama_jurusan, u.nama AS nama_verifikator
                     FROM pendaftar p
                     LEFT JOIN jurusan j ON j.id = p.jurusan_id
                     LEFT JOIN users u   ON u.id = p.diverifikasi_oleh
                     WHERE p.id = ?');
$st->execute([$id]);
$p = $st->fetch();

if (!$p) {
    set_flash('danger', 'Data pendaftar tidak ditemukan.');
    redirect('admin/pendaftar.php');
}

$judul      = 'Detail Pendaftar';
$menu_aktif = 'pendaftar';
require_once __DIR__ . '/includes/header.php';

$baris = fn(string $label, ?string $nilai) =>
    '<tr><th class="text-muted fw-normal small" style="width:42%">' . e($label) . '</th>'
    . '<td class="small fw-semibold">' . e($nilai !== null && $nilai !== '' ? $nilai : '-') . '</td></tr>';
?>

<div class="d-flex flex-wrap gap-2 align-items-center mb-3">
  <a href="pendaftar.php" class="btn btn-sm btn-outline-secondary">
    <i class="bi bi-arrow-left me-1"></i>Kembali ke Daftar
  </a>
  <a href="<?= e(BASE_URL) ?>ppdb-cetak.php?no=<?= urlencode($p['no_registrasi']) ?>" target="_blank"
     class="btn btn-sm btn-outline-primary">
    <i class="bi bi-printer me-1"></i>Cetak Formulir
  </a>
  <a href="https://wa.me/<?= e(preg_replace('/^0/', '62', preg_replace('/\D/', '', $p['no_hp']))) ?>?text=<?= rawurlencode('Halo ' . $p['nama_lengkap'] . ', kami dari panitia PPDB ' . setting('nama_sekolah') . ' terkait pendaftaran nomor ' . $p['no_registrasi'] . '.') ?>"
     target="_blank" rel="noopener" class="btn btn-sm btn-success">
    <i class="bi bi-whatsapp me-1"></i>Hubungi Pendaftar
  </a>
  <span class="badge bg-<?= warna_status($p['status']) ?> ms-auto fs-6 py-2 px-3"><?= e($p['status']) ?></span>
</div>

<div class="row g-3">
  <!-- Kolom data -->
  <div class="col-xl-8">
    <div class="panel">
      <div class="panel-kepala">
        <i class="bi bi-person-vcard text-primary"></i>
        <h2><?= e($p['nama_lengkap']) ?></h2>
        <code class="ms-auto"><?= e($p['no_registrasi']) ?></code>
      </div>
      <div class="panel-isi">
        <div class="row g-4">
          <div class="col-md-4 text-center">
            <?php if ($p['file_foto'] && preg_match('/\.(jpe?g|png)$/i', $p['file_foto'])): ?>
              <img src="<?= e(url_upload($p['file_foto'], 'pendaftar')) ?>" alt="Foto pendaftar"
                   class="pratinjau-gambar" style="aspect-ratio:3/4">
            <?php else: ?>
              <div class="bg-light border rounded d-grid place-items-center mx-auto"
                   style="width:150px;aspect-ratio:3/4;align-content:center">
                <i class="bi bi-person fs-1 text-muted"></i>
                <span class="small text-muted">Tanpa foto</span>
              </div>
            <?php endif; ?>
          </div>
          <div class="col-md-8">
            <table class="table table-sm mb-0">
              <?= $baris('Jalur Pendaftaran', $p['jalur']) ?>
              <?= $baris('Peminatan', $p['nama_jurusan']) ?>
              <?= $baris('Tahun Ajaran', $p['tahun_ajaran']) ?>
              <?= $baris('Waktu Mendaftar', tgl_indo($p['created_at'], true)) ?>
              <?= $baris('Sumber Informasi', trim(($p['sumber_informasi'] ?: '-') . ($p['catatan_sumber'] ? ' (' . $p['catatan_sumber'] . ')' : ''))) ?>
              <?= $baris('Alamat IP Pendaftar', $p['ip_pendaftar']) ?>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-md-6">
        <div class="panel h-100">
          <div class="panel-kepala"><i class="bi bi-person text-primary"></i><h2>Data Calon Peserta Didik</h2></div>
          <div class="panel-isi pt-0">
            <table class="table table-sm mb-0">
              <?= $baris('Nama Lengkap', $p['nama_lengkap']) ?>
              <?= $baris('NISN', $p['nisn']) ?>
              <?= $baris('NIK', $p['nik']) ?>
              <?= $baris('Jenis Kelamin', $p['jenis_kelamin'] === 'L' ? 'Laki-laki' : 'Perempuan') ?>
              <?= $baris('Tempat, Tanggal Lahir', $p['tempat_lahir'] . ', ' . tgl_indo($p['tanggal_lahir'])) ?>
              <?= $baris('Agama', $p['agama']) ?>
              <?= $baris('Anak Ke / Jml Saudara', ($p['anak_ke'] ?: '-') . ' / ' . ($p['jumlah_saudara'] ?: '-')) ?>
              <?= $baris('Alamat', $p['alamat']) ?>
              <?= $baris('Kelurahan', $p['kelurahan']) ?>
              <?= $baris('Kecamatan', $p['kecamatan']) ?>
              <?= $baris('Kota / Provinsi', ($p['kota'] ?: '-') . ' / ' . ($p['provinsi'] ?: '-')) ?>
              <?= $baris('Kode Pos', $p['kode_pos']) ?>
              <?= $baris('No. HP / WhatsApp', $p['no_hp']) ?>
              <?= $baris('Email', $p['email']) ?>
            </table>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="panel">
          <div class="panel-kepala"><i class="bi bi-building text-primary"></i><h2>Asal Sekolah</h2></div>
          <div class="panel-isi pt-0">
            <table class="table table-sm mb-0">
              <?= $baris('Nama Sekolah', $p['asal_sekolah']) ?>
              <?= $baris('NPSN', $p['npsn_sekolah']) ?>
              <?= $baris('Alamat Sekolah', $p['alamat_sekolah']) ?>
              <?= $baris('Tahun Lulus', $p['tahun_lulus']) ?>
              <?= $baris('Nilai Rata-rata', $p['nilai_rata2'] !== null ? number_format((float) $p['nilai_rata2'], 2, ',', '.') : null) ?>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-kepala"><i class="bi bi-people text-primary"></i><h2>Data Orang Tua / Wali</h2></div>
          <div class="panel-isi pt-0">
            <table class="table table-sm mb-0">
              <?= $baris('Nama Ayah', $p['nama_ayah']) ?>
              <?= $baris('Pekerjaan Ayah', $p['pekerjaan_ayah']) ?>
              <?= $baris('Pendidikan Ayah', $p['pendidikan_ayah']) ?>
              <?= $baris('Nama Ibu', $p['nama_ibu']) ?>
              <?= $baris('Pekerjaan Ibu', $p['pekerjaan_ibu']) ?>
              <?= $baris('Pendidikan Ibu', $p['pendidikan_ibu']) ?>
              <?= $baris('Penghasilan', $p['penghasilan']) ?>
              <?= $baris('No. HP Orang Tua', $p['no_hp_ortu']) ?>
              <?= $baris('Nama Wali', $p['nama_wali']) ?>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Dokumen -->
    <div class="panel">
      <div class="panel-kepala"><i class="bi bi-paperclip text-primary"></i><h2>Dokumen Unggahan</h2></div>
      <div class="panel-isi">
        <div class="row g-3">
          <?php
          $dokumen = [
              'file_foto'     => ['Foto 3x4',            'bi-image'],
              'file_ijazah'   => ['Ijazah / SKL',        'bi-award'],
              'file_kk'       => ['Kartu Keluarga',      'bi-people'],
              'file_akta'     => ['Akta Kelahiran',      'bi-file-earmark-text'],
              'file_raport'   => ['Rapor',               'bi-journal-bookmark'],
              'file_prestasi' => ['Sertifikat Prestasi', 'bi-trophy'],
          ];
          foreach ($dokumen as $kunci => [$label, $ikon]):
            $ada = !empty($p[$kunci]);
            $url = $ada ? url_upload($p[$kunci], 'pendaftar') : '';
            $gambar = $ada && preg_match('/\.(jpe?g|png)$/i', $p[$kunci]); ?>
            <div class="col-6 col-md-4 col-lg-2">
              <div class="kotak-dokumen <?= $ada ? '' : 'bg-light' ?>">
                <?php if ($gambar): ?>
                  <a href="<?= e($url) ?>" target="_blank" rel="noopener">
                    <img src="<?= e($url) ?>" alt="<?= e($label) ?>" class="w-100 rounded mb-2"
                         style="height:84px;object-fit:cover">
                  </a>
                <?php else: ?>
                  <i class="bi <?= $ada ? 'bi-file-earmark-pdf text-danger' : $ikon . ' text-muted' ?> d-block mb-2"></i>
                <?php endif; ?>
                <div class="fw-semibold" style="font-size:12px"><?= e($label) ?></div>
                <?php if ($ada): ?>
                  <a href="<?= e($url) ?>" target="_blank" rel="noopener" class="small">Buka berkas</a>
                <?php else: ?>
                  <span class="small text-muted">Belum ada</span>
                <?php endif; ?>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
  </div>

  <!-- Kolom aksi -->
  <div class="col-xl-4">
    <div class="panel position-sticky" style="top:86px">
      <div class="panel-kepala"><i class="bi bi-clipboard-check text-primary"></i><h2>Verifikasi Pendaftaran</h2></div>
      <div class="panel-isi">
        <form method="post">
          <?= csrf_field() ?>
          <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">

          <div class="mb-3">
            <label class="form-label" for="d-status">Status Pendaftaran</label>
            <select class="form-select" id="d-status" name="status">
              <?php foreach ($statusSah as $s): ?>
                <option value="<?= e($s) ?>" <?= $p['status'] === $s ? 'selected' : '' ?>><?= e($s) ?></option>
              <?php endforeach; ?>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label" for="d-catatan">Catatan untuk Pendaftar</label>
            <textarea class="form-control" id="d-catatan" name="catatan_admin" rows="4"
                      placeholder="Contoh: Berkas rapor kurang jelas, mohon diunggah ulang."><?= e($p['catatan_admin']) ?></textarea>
            <div class="form-text">Catatan ini tampil pada halaman Cek Status milik pendaftar.</div>
          </div>

          <button class="btn btn-daftar w-100"><i class="bi bi-save me-2"></i>Simpan Perubahan</button>
        </form>

        <hr>
        <table class="table table-sm mb-0">
          <?= $baris('Diverifikasi Oleh', $p['nama_verifikator']) ?>
          <?= $baris('Diperbarui', tgl_indo($p['updated_at'], true)) ?>
        </table>

        <?php if (admin_role() === 'admin'): ?>
          <hr>
          <form method="post">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
            <input type="hidden" name="aksi" value="hapus">
            <button class="btn btn-outline-danger w-100 btn-sm"
                    data-konfirmasi="Hapus data pendaftar <?= e($p['nama_lengkap']) ?> beserta seluruh dokumennya? Tindakan ini tidak dapat dibatalkan.">
              <i class="bi bi-trash me-1"></i>Hapus Data Pendaftar
            </button>
          </form>
        <?php endif; ?>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

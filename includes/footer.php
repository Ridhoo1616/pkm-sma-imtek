<!-- Footer -->
<footer class="footer-utama mt-5">
  <div class="container">
    <div class="row g-4 py-5">
      <div class="col-lg-4">
        <div class="d-flex align-items-center gap-2 mb-3">
          <img src="<?= e(BASE_URL) ?>assets/img/logo.svg" alt="Logo" height="44">
          <div>
            <strong class="d-block"><?= e(setting('nama_sekolah')) ?></strong>
            <small class="opacity-75">NPSN <?= e(setting('npsn')) ?> &middot; Akreditasi <?= e(setting('akreditasi')) ?></small>
          </div>
        </div>
        <p class="small opacity-75 mb-3"><?= e(setting('tagline')) ?></p>
        <div class="d-flex gap-2">
          <?php foreach ([['instagram', 'bi-instagram'], ['facebook', 'bi-facebook'], ['youtube', 'bi-youtube'], ['tiktok', 'bi-tiktok']] as [$k, $ik]):
            if (setting($k)): ?>
              <a class="ikon-sosial" href="<?= e(setting($k)) ?>" target="_blank" rel="noopener" aria-label="<?= e($k) ?>"><i class="bi <?= $ik ?>"></i></a>
          <?php endif; endforeach; ?>
        </div>
      </div>

      <div class="col-sm-6 col-lg-2">
        <h6 class="footer-judul">Tautan</h6>
        <ul class="list-unstyled small">
          <li><a href="<?= e(BASE_URL) ?>index.php">Beranda</a></li>
          <li><a href="<?= e(BASE_URL) ?>profil.php">Profil Sekolah</a></li>
          <li><a href="<?= e(BASE_URL) ?>fasilitas.php">Fasilitas</a></li>
          <li><a href="<?= e(BASE_URL) ?>berita.php">Berita</a></li>
          <li><a href="<?= e(BASE_URL) ?>galeri.php">Galeri</a></li>
          <li><a href="<?= e(BASE_URL) ?>kontak.php">Kontak</a></li>
        </ul>
      </div>

      <div class="col-sm-6 col-lg-3">
        <h6 class="footer-judul">PPDB <?= e(setting('ppdb_tahun')) ?></h6>
        <ul class="list-unstyled small">
          <li><a href="<?= e(BASE_URL) ?>ppdb.php">Informasi &amp; Jadwal</a></li>
          <li><a href="<?= e(BASE_URL) ?>ppdb-daftar.php">Formulir Pendaftaran</a></li>
          <li><a href="<?= e(BASE_URL) ?>ppdb-cek.php">Cek Status Pendaftaran</a></li>
          <li><a href="<?= e(BASE_URL) ?>admin/login.php">Login Panitia</a></li>
        </ul>
        <span class="badge <?= ppdb_dibuka() ? 'bg-success' : 'bg-secondary' ?> mt-2">
          <i class="bi <?= ppdb_dibuka() ? 'bi-unlock' : 'bi-lock' ?> me-1"></i>
          Pendaftaran <?= ppdb_dibuka() ? 'Dibuka' : 'Ditutup' ?>
        </span>
      </div>

      <div class="col-lg-3">
        <h6 class="footer-judul">Hubungi Kami</h6>
        <ul class="list-unstyled small d-grid gap-2">
          <li><i class="bi bi-geo-alt me-2"></i><?= e(setting('alamat')) ?></li>
          <li><i class="bi bi-telephone me-2"></i><?= e(setting('telepon')) ?></li>
          <li><i class="bi bi-envelope me-2"></i><?= e(setting('email')) ?></li>
          <li><i class="bi bi-clock me-2"></i><?= e(setting('jam_operasional')) ?></li>
        </ul>
      </div>
    </div>

    <div class="border-top border-light border-opacity-10 py-3 d-md-flex justify-content-between small opacity-75">
      <span>&copy; <?= date('Y') ?> <?= e(setting('nama_sekolah')) ?>. Seluruh hak cipta dilindungi.</span>
      <span>Dikembangkan melalui Program Kreativitas Mahasiswa (PkM)</span>
    </div>
  </div>
</footer>

<?php if (setting('whatsapp')): ?>
<a class="tombol-wa" target="_blank" rel="noopener"
   href="https://wa.me/<?= e(setting('whatsapp')) ?>?text=<?= rawurlencode('Halo ' . setting('nama_sekolah') . ', saya ingin bertanya tentang PPDB ' . setting('ppdb_tahun') . '.') ?>"
   aria-label="Hubungi via WhatsApp">
  <i class="bi bi-whatsapp"></i><span>Tanya PPDB</span>
</a>
<?php endif; ?>

<button class="tombol-atas" id="tombolAtas" aria-label="Kembali ke atas"><i class="bi bi-arrow-up"></i></button>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="<?= e(BASE_URL) ?>assets/js/main.js"></script>
</body>
</html>

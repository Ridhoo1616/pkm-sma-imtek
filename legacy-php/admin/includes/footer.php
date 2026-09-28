    </main>

    <footer class="kaki-admin">
      <span>&copy; <?= date('Y') ?> <?= e(setting('nama_sekolah')) ?> &mdash; Sistem Informasi Profil Sekolah &amp; PPDB Online</span>
      <span class="d-none d-md-inline">Dikembangkan melalui Pengabdian Kepada Masyarakat (PkM) Universitas Pamulang</span>
    </footer>
  </div>
</div>

<div class="tirai-sidebar" id="tiraiSidebar"></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="<?= e(BASE_URL) ?>assets/js/main.js"></script>
<script>
  /* Buka-tutup sidebar pada layar kecil */
  var sb = document.getElementById('sidebar'),
      tirai = document.getElementById('tiraiSidebar');
  function bukaSb(buka) {
    sb.classList.toggle('tampil', buka);
    tirai.classList.toggle('tampil', buka);
  }
  document.getElementById('bukaSidebar')?.addEventListener('click', function () { bukaSb(true); });
  document.getElementById('tutupSidebar')?.addEventListener('click', function () { bukaSb(false); });
  tirai.addEventListener('click', function () { bukaSb(false); });

  /* Konfirmasi sebelum aksi hapus */
  document.querySelectorAll('[data-konfirmasi]').forEach(function (el) {
    el.addEventListener('click', function (ev) {
      if (!confirm(el.dataset.konfirmasi)) { ev.preventDefault(); }
    });
  });
</script>
</body>
</html>

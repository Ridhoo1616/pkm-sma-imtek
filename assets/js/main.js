/* Interaksi ringan untuk halaman publik */
(function () {
  'use strict';

  /* Tombol kembali ke atas */
  var tombolAtas = document.getElementById('tombolAtas');
  if (tombolAtas) {
    window.addEventListener('scroll', function () {
      tombolAtas.classList.toggle('tampil', window.scrollY > 380);
    });
    tombolAtas.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* Animasi angka statistik saat terlihat */
  var angka = document.querySelectorAll('[data-hitung]');
  if (angka.length && 'IntersectionObserver' in window) {
    var pengamat = new IntersectionObserver(function (entri) {
      entri.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target,
            akhir = parseInt(el.dataset.hitung, 10) || 0,
            mulai = null;
        function langkah(waktu) {
          if (!mulai) mulai = waktu;
          var progres = Math.min((waktu - mulai) / 1100, 1);
          el.textContent = Math.floor(progres * akhir).toLocaleString('id-ID');
          if (progres < 1) requestAnimationFrame(langkah);
        }
        requestAnimationFrame(langkah);
        pengamat.unobserve(el);
      });
    }, { threshold: 0.4 });
    angka.forEach(function (el) { pengamat.observe(el); });
  }

  /* Pratinjau gambar galeri di modal */
  var modalEl = document.getElementById('modalGaleri');
  if (modalEl) {
    document.querySelectorAll('[data-gambar]').forEach(function (item) {
      item.addEventListener('click', function () {
        modalEl.querySelector('img').src = item.dataset.gambar;
        modalEl.querySelector('.modal-title').textContent = item.dataset.judul || '';
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      });
    });
  }

  /* Validasi bawaan Bootstrap + fokus ke field pertama yang salah */
  document.querySelectorAll('.perlu-validasi').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      if (!form.checkValidity()) {
        ev.preventDefault();
        ev.stopPropagation();
        var salah = form.querySelector(':invalid');
        if (salah) {
          salah.scrollIntoView({ behavior: 'smooth', block: 'center' });
          salah.focus({ preventScroll: true });
        }
      } else {
        var tombol = form.querySelector('[type="submit"]');
        if (tombol) {
          tombol.disabled = true;
          tombol.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';
        }
      }
      form.classList.add('was-validated');
    });
  });

  /* Peringatan ukuran berkas sebelum dikirim ke server */
  document.querySelectorAll('input[type="file"]').forEach(function (input) {
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (f && f.size > 2 * 1024 * 1024) {
        alert('Ukuran berkas "' + f.name + '" adalah ' + (f.size / 1048576).toFixed(1) +
              ' MB, melebihi batas 2 MB. Silakan perkecil berkas terlebih dahulu.');
        input.value = '';
      }
    });
  });
})();

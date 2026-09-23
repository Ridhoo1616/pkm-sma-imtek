# Font di folder ini

`caveat-latin.woff2` — Caveat, huruf tulisan tangan, subset Latin.

Dipakai satu tempat saja: semboyan sekolah pada bagian sambutan kepala
sekolah di halaman Profil Sekolah.

**Berkasnya disimpan di dalam proyek, bukan dimuat dari Google Fonts.** Tiga
alasannya:

1. Halaman publik tidak memerlukan sambungan ke server pihak lain hanya untuk
   satu baris tulisan. Situs sekolah sering dibuka dari jaringan yang lambat,
   dan satu permintaan ke luar berarti satu titik gagal tambahan.
2. Alamat IP pengunjung tidak ikut terkirim ke Google setiap kali halaman
   dibuka. Pengunjung halaman ini termasuk calon peserta didik dan orang
   tuanya.
3. Demo statis di GitHub Pages ikut berjalan tanpa sambungan ke luar.

Lisensinya SIL Open Font License 1.1, ada di `caveat-OFL.txt`. Lisensi itu
mengizinkan berkasnya disertakan ulang, termasuk pada repositori publik.

Subsetnya hanya Latin, 74 KB. Bila kelak diperlukan huruf lain, ambil
alamatnya dari `https://fonts.googleapis.com/css2?family=Caveat` lalu unduh
berkas woff2 yang ditunjuk, jangan menautkan langsung ke Google.

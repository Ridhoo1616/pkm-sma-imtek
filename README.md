# Digitalisasi Profil Sekolah dan PPDB Berbasis Web — SMA IMTEK

Sistem informasi berbasis web yang menggabungkan **profil sekolah** dan **Pendaftaran
Peserta Didik Baru (PPDB) online** untuk meningkatkan efektivitas promosi SMA IMTEK.

Dikembangkan dalam rangka **Program Kreativitas Mahasiswa (PkM)**
bidang *Manajemen Komputer & Sistem*.

| | |
|---|---|
| **Judul** | Digitalisasi Profil Sekolah dan Pendaftaran Peserta Didik Baru (PPDB) Berbasis Web untuk Meningkatkan Efektivitas Promosi pada SMA IMTEK |
| **Bidang** | Manajemen Komputer & Sistem |
| **Teknologi** | PHP 7.4+ (native, tanpa framework), MySQL/MariaDB, Bootstrap 5 |
| **Dosen Pendamping** | Nurhayati, S.Kom., M.Kom. |
| **Reviewer** | Raditia Vindua, S.Si., M.Kom. |

---

## Ringkasan Fitur

### A. Website Profil Sekolah (publik)

| Halaman | Berkas | Isi |
|---|---|---|
| Beranda | `index.php` | Hero, status kuota PPDB waktu nyata, statistik sekolah, sambutan, peminatan, alur pendaftaran, fasilitas, berita, galeri |
| Profil Sekolah | `profil.php` | Sejarah, sambutan kepala sekolah, visi, misi, peminatan, identitas sekolah |
| Fasilitas | `fasilitas.php` | Daftar sarana dan prasarana |
| Berita | `berita.php`, `berita-detail.php` | Berita/pengumuman dengan pencarian, kategori, paginasi, penghitung baca, tombol bagikan |
| Galeri | `galeri.php` | Dokumentasi kegiatan dengan filter kategori dan pratinjau |
| Kontak | `kontak.php` | Alamat, peta, media sosial, formulir pertanyaan |

### B. PPDB Online

| Halaman | Berkas | Isi |
|---|---|---|
| Informasi PPDB | `ppdb.php` | Jadwal, 4 jalur pendaftaran, alur 6 langkah, syarat, kuota per peminatan, FAQ |
| Formulir Pendaftaran | `ppdb-daftar.php` | 6 seksi isian + unggah 6 dokumen + pernyataan kebenaran data |
| Pendaftaran Berhasil | `ppdb-sukses.php` | Nomor registrasi, ringkasan, langkah lanjutan |
| Cek Status | `ppdb-cek.php` | Lacak status dengan nomor registrasi + tanggal lahir, indikator tahapan, catatan panitia |
| Cetak Bukti | `ppdb-cetak.php` | Formulir bukti pendaftaran siap cetak/PDF dengan kop sekolah |

### C. Panel Admin / Panitia

| Halaman | Berkas | Isi |
|---|---|---|
| Dashboard | `admin/index.php` | 8 kartu ringkasan, tren 14 hari, grafik efektivitas promosi, keterisian kuota, kunjungan |
| Data Pendaftar | `admin/pendaftar.php` | Filter 5 kriteria, pencarian, ubah status massal, hapus, ekspor CSV |
| Detail Pendaftar | `admin/pendaftar-detail.php` | Seluruh data, pratinjau dokumen, verifikasi status, catatan, tombol WhatsApp |
| Laporan & Statistik | `admin/laporan.php` | Rekap promosi + konversi, asal sekolah, per bulan, status, jalur, peminatan, halaman terpopuler, ekspor CSV, siap cetak |
| Peminatan | `admin/jurusan.php` | CRUD peminatan dan kuota |
| Berita | `admin/berita.php` | CRUD berita, unggah gambar, terbit/draf |
| Galeri | `admin/galeri.php` | Unggah dan hapus foto |
| Fasilitas | `admin/fasilitas.php` | CRUD fasilitas dengan ikon |
| Pesan Masuk | `admin/pesan.php` | Pesan dari formulir kontak, balas email/WhatsApp |
| Pengaturan | `admin/pengaturan.php` | 32 pengaturan dalam 4 tab (khusus Administrator) |
| Akun Pengguna | `admin/pengguna.php` | Kelola akun, peran, reset & ganti kata sandi |

### D. Dukungan Tujuan "Meningkatkan Efektivitas Promosi"

Fitur berikut secara khusus mendukung tujuan penelitian dan menjadi sumber data
pembahasan laporan PkM:

1. **Pertanyaan sumber informasi** pada formulir pendaftaran (12 kanal promosi).
2. **Grafik efektivitas kanal promosi** di dashboard, lengkap dengan **angka konversi**
   (berapa pendaftar per kanal yang akhirnya diterima).
3. **Pencatatan kunjungan website** per halaman per hari beserta **sumber rujukan**
   (referer), sebagai indikator jangkauan promosi digital.
4. **Meta tag SEO dan Open Graph** agar tautan yang dibagikan ke WhatsApp dan media
   sosial tampil dengan judul, deskripsi, dan gambar.
5. **Tombol bagikan** ke WhatsApp, Facebook, dan Telegram pada setiap berita.
6. **Tombol WhatsApp mengapung** di semua halaman untuk menekan hambatan bertanya.
7. **Laporan siap cetak dan ekspor CSV** untuk lampiran laporan PkM.

---

## Keamanan yang Diterapkan

| Aspek | Penerapan |
|---|---|
| SQL Injection | Seluruh kueri memakai **PDO prepared statement** (`ATTR_EMULATE_PREPARES = false`) |
| XSS | Semua keluaran melewati fungsi `e()` (`htmlspecialchars`) |
| CSRF | Token 32 byte pada **setiap** formulir, diverifikasi dengan `hash_equals()` |
| Kata sandi | `password_hash()` / `password_verify()` (bcrypt), tidak pernah disimpan polos |
| Brute force | Maksimal 5 percobaan masuk per 10 menit |
| Sesi | `session_regenerate_id()` saat masuk, kedaluwarsa otomatis setelah 2 jam tidak aktif |
| Unggahan berkas | Validasi ekstensi **dan** tipe MIME asli (`mime_content_type`), batas 2 MB, nama berkas diacak, eksekusi skrip di folder `uploads/` dimatikan lewat `.htaccess` |
| Hak akses | Dua peran: `admin` (akses penuh) dan `operator` (tanpa hapus data & tanpa pengaturan) |
| Spam | Kolom perangkap (*honeypot*) tersembunyi pada formulir pendaftaran |
| Data pendaftar | Halaman cetak bukti hanya dapat diakses pemilik data (sesi) atau admin |
| Folder internal | `config/`, `includes/`, `database/` ditolak akses langsung lewat `.htaccess` |

---

## Struktur Berkas

```
pkm-sma-imtek/
├── index.php                  Beranda
├── profil.php                 Profil sekolah
├── fasilitas.php              Daftar fasilitas
├── berita.php                 Daftar berita
├── berita-detail.php          Detail berita
├── galeri.php                 Galeri kegiatan
├── kontak.php                 Kontak & formulir pertanyaan
├── ppdb.php                   Informasi PPDB
├── ppdb-daftar.php            Formulir pendaftaran
├── ppdb-sukses.php            Konfirmasi pendaftaran
├── ppdb-cek.php               Cek status pendaftaran
├── ppdb-cetak.php             Cetak bukti pendaftaran
├── .htaccess                  Keamanan dasar & batas unggahan
│
├── config/
│   └── database.php           Koneksi PDO, konstanta path & URL
├── includes/
│   ├── functions.php          23 fungsi bantu (keamanan, format, unggah, PPDB)
│   ├── header.php             Layout atas publik (navigasi, meta SEO)
│   └── footer.php             Layout bawah publik
├── database/
│   └── schema.sql             Struktur 9 tabel + data awal
├── assets/
│   ├── css/style.css          Gaya halaman publik
│   ├── css/admin.css          Gaya panel admin
│   ├── js/main.js             Interaksi (validasi, animasi, modal)
│   └── img/                   Logo & gambar cadangan (SVG)
├── uploads/
│   ├── berita/                Gambar berita
│   ├── galeri/                Foto galeri & fasilitas
│   └── pendaftar/             Dokumen pendaftar
└── admin/
    ├── login.php  logout.php
    ├── index.php              Dashboard
    ├── pendaftar.php  pendaftar-detail.php
    ├── laporan.php  jurusan.php
    ├── berita.php  galeri.php  fasilitas.php  pesan.php
    ├── pengaturan.php  pengguna.php
    └── includes/
        ├── auth.php           Penjaga akses & peran
        ├── header.php         Layout sidebar + topbar
        └── footer.php
```

## Struktur Basis Data (9 tabel)

| Tabel | Fungsi |
|---|---|
| `users` | Akun admin dan operator panitia |
| `pengaturan` | 32 pengaturan situs & PPDB (pasangan nama–nilai) |
| `jurusan` | Peminatan beserta kuota |
| `pendaftar` | Data pendaftar PPDB (58 kolom) |
| `berita` | Berita, pengumuman, prestasi, kegiatan |
| `galeri` | Foto dokumentasi kegiatan |
| `fasilitas` | Sarana dan prasarana sekolah |
| `pesan` | Pesan dari formulir kontak |
| `statistik_kunjungan` | Kunjungan per halaman per hari + sumber rujukan |

---

## Mencoba langsung dari browser, tanpa memasang apa pun

Repositori ini sudah dilengkapi konfigurasi **GitHub Codespaces**, sehingga
aplikasi dapat dijalankan langsung dari browser tanpa memasang XAMPP.

1. Pada halaman repositori, klik tombol hijau **Code**
2. Pilih tab **Codespaces**, lalu **Create codespace on main**
3. Tunggu penyiapan selesai (sekitar 2&ndash;3 menit pada pembuatan pertama).
   PHP dan MariaDB dipasang otomatis, `database/schema.sql` diimpor, dan
   server dijalankan di port 8080.
4. Buka tab **PORTS** di bagian bawah, lalu klik alamat pada port **8080**

| Bagian | Alamat |
|---|---|
| Website sekolah | alamat port 8080 |
| Panel admin | alamat port 8080 + `/admin/login.php` |

Akun bawaan: `admin` / `admin123`.

Agar tautannya dapat dibuka orang lain, klik kanan port 8080 pada tab PORTS
lalu pilih **Port Visibility &rarr; Public**. Perlu dicatat: tautan itu hanya
aktif selama Codespace berjalan, dan Codespace otomatis berhenti setelah
menganggur. Untuk pemakaian sungguhan oleh sekolah, tetap diperlukan hosting.

## Pemasangan di komputer sendiri

Lihat **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)** untuk langkah lengkap.

Ringkasnya:

1. Pasang **XAMPP**, jalankan **Apache** dan **MySQL**.
2. Salin folder ini ke `htdocs/` (contoh: `htdocs/sma-imtek`).
3. Buka **phpMyAdmin** → *Import* → pilih `database/schema.sql`.
4. Buka `http://localhost/sma-imtek/`.
5. Masuk panel admin di `http://localhost/sma-imtek/admin/login.php`.

**Akun bawaan:** `admin` / `admin123` — **wajib segera diganti** melalui menu
*Akun Pengguna → Akun Saya*.

---

## Status Pengujian

Seluruh alur telah diuji berjalan pada PHP 8.2 + MySQL 9.3 (mode `ONLY_FULL_GROUP_BY`
dan `STRICT_TRANS_TABLES` aktif):

- 32 berkas PHP lolos pemeriksaan sintaks, tanpa *warning* maupun *notice*.
- Pendaftaran lengkap dengan 4 dokumen → nomor registrasi terbit, data & berkas tersimpan.
- Validasi terbukti menolak: data ganda, jalur Prestasi tanpa sertifikat, kolom wajib kosong,
  NISN/NIK salah format, usia tidak wajar, email tidak valid, nilai di luar 0–100,
  berkas yang menyamarkan tipe aslinya, dan kiriman tanpa persetujuan pernyataan.
- Berkas unggahan dari kiriman yang gagal dibersihkan otomatis (tidak menumpuk).
- CSRF terbukti menolak kiriman tanpa token yang sah (HTTP 419).
- Cek status menolak kombinasi nomor registrasi + tanggal lahir yang salah.
- Cetak bukti menolak akses dari sesi yang tidak berhak (HTTP 403).
- Semua halaman admin mengalihkan pengunjung yang belum masuk ke halaman login.
- Peran `operator` terbukti tidak dapat membuka Pengaturan dan tidak dapat menghapus pendaftar.
- Ekspor CSV data pendaftar dan rekap promosi menghasilkan berkas yang benar.
- Aplikasi berjalan benar baik di akar domain maupun di **subfolder** `htdocs`.

---

## Lisensi

Kode sumber ini dirilis di bawah [MIT License](LICENSE). Bebas dipakai,
diubah, dan disebarkan, dengan syarat pemberitahuan hak cipta tetap disertakan.

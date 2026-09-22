# Panduan Instalasi & Penggunaan

Sistem Informasi Profil Sekolah & PPDB Online **SMA IMTEK**

---

## Bagian 1 — Kebutuhan Sistem

| Komponen | Versi minimum | Catatan |
|---|---|---|
| PHP | 7.4 (disarankan 8.0+) | Ekstensi wajib: `pdo_mysql`, `mbstring`, `fileinfo` |
| MySQL / MariaDB | MySQL 5.7 / MariaDB 10.3 | Sudah termasuk dalam XAMPP |
| Web server | Apache 2.4 | Sudah termasuk dalam XAMPP |
| Peramban | Chrome, Edge, Firefox, atau Safari versi terbaru | |

Cara termudah memenuhi semuanya sekaligus: pasang **XAMPP**.

---

## Bagian 2 — Memasang XAMPP

### Windows

1. Unduh XAMPP dari <https://www.apachefriends.org/download.html>
   (pilih versi dengan **PHP 8.x**).
2. Jalankan pemasang. Bila muncul peringatan UAC atau antivirus, izinkan.
3. Pada pilihan komponen, pastikan **Apache**, **MySQL**, **PHP**, dan **phpMyAdmin**
   tercentang.
4. Pasang ke lokasi bawaan `C:\xampp`.
5. Buka **XAMPP Control Panel**, klik **Start** pada baris **Apache** dan **MySQL**.
   Kedua baris akan berwarna hijau bila berhasil.

> **Apache gagal jalan?** Biasanya port 80 dipakai aplikasi lain (sering kali Skype atau
> IIS). Klik **Config → httpd.conf**, ganti `Listen 80` menjadi `Listen 8080` dan
> `ServerName localhost:80` menjadi `ServerName localhost:8080`, simpan, lalu Start ulang.
> Alamat situs menjadi `http://localhost:8080/...`

### macOS

1. Unduh **XAMPP for OS X** dari tautan yang sama.
2. Buka berkas `.dmg` dan seret XAMPP ke folder Applications.
3. Buka **XAMPP → Manage Servers**, jalankan **Apache Web Server** dan **MySQL Database**.
4. Folder web berada di `/Applications/XAMPP/xamppfiles/htdocs`.

---

## Bagian 3 — Memasang Aplikasi

### Langkah 1: salin berkas aplikasi

Salin seluruh isi folder proyek ini ke dalam folder `htdocs` XAMPP, di dalam sebuah
subfolder bernama `sma-imtek`:

- **Windows:** `C:\xampp\htdocs\sma-imtek`
- **macOS:** `/Applications/XAMPP/xamppfiles/htdocs/sma-imtek`

Struktur akhirnya harus seperti ini:

```
htdocs/sma-imtek/index.php
htdocs/sma-imtek/config/
htdocs/sma-imtek/admin/
htdocs/sma-imtek/database/schema.sql
...
```

> Aplikasi mendeteksi alamatnya sendiri, jadi nama subfolder bebas — boleh juga
> diletakkan langsung di akar `htdocs`.

### Langkah 2: membuat basis data

**Cara A — melalui phpMyAdmin (disarankan)**

1. Buka <http://localhost/phpmyadmin>
2. Klik tab **Import** (Impor) di menu atas.
3. Klik **Choose File**, pilih berkas `database/schema.sql` dari folder aplikasi.
4. Biarkan pengaturan lain apa adanya, gulir ke bawah, klik **Import**.
5. Akan muncul pesan sukses dan database **`sma_imtek`** tampil di panel kiri
   dengan 9 tabel.

> Berkas `schema.sql` sudah berisi perintah `CREATE DATABASE`, jadi Anda **tidak perlu**
> membuat database terlebih dahulu.

**Cara B — melalui terminal / Command Prompt**

```bash
# Windows
C:\xampp\mysql\bin\mysql.exe -u root < C:\xampp\htdocs\sma-imtek\database\schema.sql

# macOS
/Applications/XAMPP/xamppfiles/bin/mysql -u root < \
  /Applications/XAMPP/xamppfiles/htdocs/sma-imtek/database/schema.sql
```

### Langkah 3: memeriksa konfigurasi

Buka `config/database.php`. Untuk XAMPP bawaan, nilai berikut sudah benar dan
tidak perlu diubah:

```php
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'sma_imtek');
define('DB_USER', 'root');
define('DB_PASS', '');        // XAMPP bawaan: kosong
```

Ubah hanya bila MySQL Anda memakai kata sandi atau port lain.

### Langkah 4: izin menulis folder unggahan

Folder `uploads/` harus dapat ditulis oleh web server.

- **Windows:** biasanya sudah otomatis bisa.
- **macOS / Linux:**
  ```bash
  chmod -R 775 uploads
  ```

### Langkah 5: membuka aplikasi

| Bagian | Alamat |
|---|---|
| Website sekolah | <http://localhost/sma-imtek/> |
| Panel admin | <http://localhost/sma-imtek/admin/login.php> |

**Akun bawaan**

```
Nama pengguna : admin
Kata sandi    : admin123
```

> **Penting:** segera ganti kata sandi ini setelah masuk pertama kali, melalui
> **Akun Pengguna → Akun Saya → Ubah Kata Sandi**. Kata sandi bawaan tidak boleh
> dipakai saat sistem sudah digunakan sekolah.

---

## Bagian 4 — Pengaturan Awal Setelah Terpasang

Kerjakan urut agar website langsung tampil sesuai data sekolah yang sebenarnya.

### 1. Ganti kata sandi admin
**Akun Pengguna → Akun Saya → Ubah Kata Sandi.** Minimal 8 karakter.

### 2. Isi identitas sekolah
**Pengaturan → tab Profil Sekolah.** Isi nama sekolah, NPSN, akreditasi,
nama kepala sekolah, sambutan, sejarah, visi, dan misi.

> Kolom **Misi** dan **Syarat Pendaftaran** memakai aturan *satu baris = satu poin*.
> Tekan Enter untuk memisahkan poin, jangan memakai tanda hubung atau nomor manual.

### 3. Isi kontak dan media sosial
**Pengaturan → tab Kontak & Media Sosial.**

- **Nomor WhatsApp** boleh ditulis `081234567890`; sistem otomatis mengubahnya
  menjadi format `6281234567890`.
- **Kode src iframe Google Maps**: buka Google Maps → cari lokasi sekolah →
  **Bagikan → Sematkan peta → Salin HTML**, lalu ambil **hanya nilai `src="..."`**
  dari kode tersebut (tanpa tag `<iframe>`).

### 4. Atur periode PPDB
**Pengaturan → tab Pengaturan PPDB.**

Formulir pendaftaran hanya terbuka bila **dua syarat** terpenuhi:
1. Status pendaftaran = **Dibuka**, **dan**
2. Tanggal hari ini berada di antara tanggal mulai dan tanggal akhir.

Isi juga tahun ajaran (format `2027/2028`), total kuota, tanggal pengumuman,
informasi biaya, dan syarat pendaftaran.

> Tahun ajaran menentukan penomoran registrasi. `2027/2028` menghasilkan nomor
> berpola `PPDB-2728-0001`.

### 5. Atur peminatan dan kuota
**Peminatan.** Sesuaikan nama, kode, dan kuota tiap peminatan. Peminatan yang tidak
dibuka cukup di-**nonaktifkan** (jangan dihapus bila sudah ada pendaftar).

### 6. Isi fasilitas, berita, dan galeri
- **Fasilitas** — tambahkan sarana sekolah beserta ikon dan foto.
- **Berita** — terbitkan pengumuman pembukaan PPDB agar tampil di beranda.
- **Galeri** — unggah foto kegiatan. Inilah materi promosi paling menarik bagi
  calon peserta didik.

### 7. Buat akun operator untuk panitia
**Akun Pengguna → Tambah Pengguna**, pilih peran **Operator**. Operator dapat
memverifikasi pendaftar tetapi tidak dapat menghapus data maupun mengubah pengaturan.

### 8. Ganti logo sekolah (opsional)
Timpa berkas `assets/img/logo.svg` dengan logo sekolah. Bila logo Anda berupa PNG,
simpan sebagai `logo.png` lalu ganti kata `logo.svg` menjadi `logo.png` pada
`includes/header.php`, `includes/footer.php`, `admin/includes/header.php`,
`admin/login.php`, dan `ppdb-cetak.php`.

---

## Bagian 5 — Alur Kerja Harian Panitia PPDB

1. **Buka Dashboard** — lihat berapa pendaftar yang menunggu verifikasi.
2. **Data Pendaftar** — saring status *Menunggu Verifikasi*.
3. Klik **ikon mata** untuk membuka detail pendaftar.
4. Periksa dokumen unggahan (klik gambar/berkas untuk membukanya).
5. Ubah **Status Pendaftaran**:
   - **Terverifikasi** — berkas lengkap dan sah, lanjut ke seleksi.
   - **Diterima** — lulus seleksi.
   - **Cadangan** — masuk daftar tunggu.
   - **Ditolak** — tidak memenuhi syarat.
6. Tulis **Catatan untuk Pendaftar** bila ada berkas yang perlu diperbaiki.
   Catatan ini otomatis tampil di halaman *Cek Status* milik pendaftar.
7. Klik **Simpan Perubahan**.
8. Bila perlu, klik **Hubungi Pendaftar** untuk menghubungi via WhatsApp.

**Verifikasi banyak sekaligus:** di halaman Data Pendaftar, centang beberapa baris,
pilih status pada kotak di kanan atas, lalu klik **Terapkan**.

---

## Bagian 6 — Menyiapkan Data untuk Laporan PkM

Menu **Laporan & Statistik** menyediakan data yang langsung dapat dipakai pada bab
Hasil dan Pembahasan:

| Yang dibutuhkan laporan | Tempat mengambilnya |
|---|---|
| Efektivitas tiap kanal promosi | Tabel *Efektivitas Kanal Promosi* (jumlah, porsi, diterima, konversi) |
| Data mentah untuk diolah di Excel | Tombol **Ekspor Rekap Promosi** dan **Ekspor Data Pendaftar** (CSV) |
| Jangkauan promosi digital | Panel *Halaman Terpopuler* dan *Sumber Rujukan Kunjungan* |
| Sebaran asal sekolah | Panel *Sebaran Asal Sekolah* — menunjukkan jangkauan geografis promosi |
| Pola waktu pendaftaran | Grafik *Pendaftar per Bulan* dan *Tren 14 Hari* di dashboard |
| Lampiran laporan | Tombol **Cetak Laporan** (menyembunyikan menu, hanya mencetak isi laporan) |

**Membuka berkas CSV di Excel:** berkas memakai pemisah titik koma (`;`) dan sudah
diberi penanda BOM UTF-8, sehingga huruf beraksen dan rupiah tampil benar. Bila kolom
menumpuk dalam satu sel, gunakan **Data → Text to Columns → Delimited → Semicolon**.

---

## Bagian 7 — Mengatasi Masalah

| Gejala | Penyebab & solusi |
|---|---|
| **"Koneksi database gagal"** | MySQL belum dijalankan (Start di XAMPP Control Panel), atau `schema.sql` belum diimpor, atau `DB_PASS` di `config/database.php` tidak sesuai |
| **Halaman tampil sebagai kode PHP** | Berkas dibuka langsung lewat Windows Explorer. Harus diakses lewat `http://localhost/...`, bukan klik ganda berkas |
| **Tampilan berantakan tanpa warna** | Tidak ada koneksi internet (Bootstrap diambil dari CDN). Lihat catatan mode luring di bawah |
| **"Formulir pendaftaran ditutup" padahal status Dibuka** | Tanggal hari ini di luar rentang tanggal mulai–akhir. Perbaiki di Pengaturan → tab PPDB |
| **Gagal mengunggah dokumen** | Ukuran berkas di atas 2 MB, atau folder `uploads/` tidak dapat ditulis. Perkecil berkas atau perbaiki izin folder |
| **"Sesi Anda telah berakhir"** | Halaman terbuka terlalu lama. Muat ulang halaman lalu kirim kembali |
| **"Terlalu banyak percobaan masuk"** | Lima kali salah kata sandi. Tunggu 10 menit |
| **Lupa kata sandi admin** | Lihat bagian *Mereset Kata Sandi Admin* di bawah |
| **Gambar berita/galeri tidak tampil** | Berkas terhapus dari folder `uploads/`, atau aplikasi dipindah tanpa menyertakan folder `uploads/` |

### Mereset kata sandi admin

1. Buat berkas `reset.php` di folder aplikasi:
   ```php
   <?php
   require 'config/database.php';
   $baru = 'KataSandiBaruAnda';
   $pdo->prepare('UPDATE users SET password = ? WHERE username = ?')
       ->execute([password_hash($baru, PASSWORD_DEFAULT), 'admin']);
   echo 'Kata sandi admin berhasil direset.';
   ```
2. Buka `http://localhost/sma-imtek/reset.php`
3. **Hapus berkas `reset.php`** segera setelah berhasil.

### Menjalankan tanpa internet (mode luring)

Bootstrap dan Bootstrap Icons diambil dari CDN. Untuk demo di ruangan tanpa internet:

1. Unduh Bootstrap 5.3.3 dan Bootstrap Icons 1.11.3 saat masih ada internet.
2. Simpan menjadi:
   - `assets/vendor/bootstrap.min.css`
   - `assets/vendor/bootstrap.bundle.min.js`
   - `assets/vendor/bootstrap-icons.min.css` (beserta folder `fonts/`-nya)
3. Pada `includes/header.php`, `includes/footer.php`, `admin/includes/header.php`,
   `admin/includes/footer.php`, dan `admin/login.php`, ganti alamat `https://cdn.jsdelivr.net/...`
   menjadi `<?= e(BASE_URL) ?>assets/vendor/...`

---

## Bagian 8 — Sebelum Diserahkan ke Sekolah

Daftar periksa sebelum sistem benar-benar dipakai:

- [ ] Kata sandi `admin123` sudah diganti.
- [ ] Pada `config/database.php`, ubah `MODE_PENGEMBANGAN` menjadi `false`
      agar pesan galat teknis tidak tampil kepada pengunjung.
- [ ] Seluruh data contoh (berita, fasilitas, statistik, alamat) sudah diganti data asli.
- [ ] Berita dan foto galeri dari kegiatan sekolah yang sebenarnya sudah diunggah.
- [ ] Logo sekolah sudah menggantikan logo bawaan.
- [ ] Akun operator sudah dibuat untuk tiap anggota panitia.
- [ ] Periode PPDB sudah sesuai kalender akademik sekolah.
- [ ] Pendaftaran percobaan sudah diuji dari ponsel, bukan hanya dari komputer.
- [ ] Rencana pencadangan data sudah disiapkan: **phpMyAdmin → Export** untuk basis data,
      dan salin folder `uploads/` untuk dokumen pendaftar. Lakukan berkala selama
      masa pendaftaran.
- [ ] Bila akan dipasang di hosting berbayar (bukan localhost), pastikan situs memakai
      **HTTPS** karena sistem menyimpan data pribadi calon peserta didik.

---

## Bagian 9 — Catatan Pengembangan Lanjutan

Gagasan yang dapat dikerjakan bila PkM dilanjutkan:

- Pemberitahuan otomatis melalui email atau WhatsApp saat status pendaftaran berubah.
- Pemeringkatan otomatis pendaftar berdasarkan nilai rapor untuk seleksi jalur reguler.
- Cetak surat pengumuman kelulusan seleksi secara massal.
- Unggahan ulang dokumen oleh pendaftar sendiri bila berkas ditolak panitia.
- Integrasi data ke Dapodik.
- Arsip PPDB antar tahun ajaran dengan pembanding tren pendaftar.

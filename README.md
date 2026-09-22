# Digitalisasi Profil Sekolah dan PPDB Berbasis Web untuk SMA IMTEK

Sistem informasi berbasis web yang menggabungkan **profil sekolah** dan
**Pendaftaran Peserta Didik Baru (PPDB) online** untuk meningkatkan efektivitas
promosi SMA IMTEK.

Dikembangkan dalam rangka **Program Kreativitas Mahasiswa (PkM)**
bidang *Manajemen Komputer & Sistem*.

| | |
|---|---|
| **Judul** | Digitalisasi Profil Sekolah dan Pendaftaran Peserta Didik Baru (PPDB) Berbasis Web untuk Meningkatkan Efektivitas Promosi pada SMA IMTEK |
| **Sekolah** | SMA IMTEK (Swasta), NPSN 20613766, Akreditasi B<br>Jl. Raya Pagedangan, Cicalengka, Kec. Pagedangan, Kab. Tangerang, Banten 15339 |
| **Bidang** | Manajemen Komputer & Sistem |
| **Backend** | Go 1.27 (pustaka standar, tanpa kerangka kerja web) + MySQL/MariaDB |
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Framer Motion |
| **Dosen Pendamping** | Nurhayati, S.Kom., M.Kom. |
| **Reviewer** | Raditia Vindua, S.Si., M.Kom. |

---

## Susunan Proyek

Aplikasi dipisah menjadi dua bagian yang berjalan sendiri-sendiri dan
berhubungan lewat API JSON.

```
pkm-sma-imtek/
├── backend/        API JSON dengan Go, lihat backend/README.md
│   ├── main.go              daftar alamat API dan penyalaan server
│   ├── config.go            konfigurasi dari variabel lingkungan
│   ├── db.go                koneksi dan pelaksana migrasi
│   ├── aplikasi.go          lapisan tengah, cache pengaturan
│   ├── auth.go              token masuk, pembatas percobaan
│   ├── validasi.go          pemeriksaan isian formulir
│   ├── unggah.go            penyimpanan dan pemeriksaan berkas
│   ├── handler_*.go         penangan tiap kelompok alamat API
│   └── migrations/          skema basis data (9 tabel + data awal)
│
├── frontend/       Situs dan panel admin dengan Next.js
│   └── src/
│       ├── app/(publik)/    beranda, profil, fasilitas, berita, galeri,
│       │                    kontak, info PPDB, formulir, cek status
│       ├── app/admin/       11 halaman panel panitia
│       ├── komponen/        elemen tampilan bersama
│       └── lib/             lapisan API, tipe data, pembantu format
│
├── legacy-php/     Versi PHP pertama, diarsipkan sebagai rujukan perilaku
├── docs/           Demo statis untuk GitHub Pages
└── PANDUAN-INSTALASI.md
```

Pemisahan ini dipilih karena backend Go menghasilkan **satu berkas biner**
yang bisa dijalankan di mana saja tanpa memasang penerjemah bahasa, sementara
frontend-nya dapat dipindah ke layanan lain tanpa menyentuh logika data.

---

## Menjalankan

Dibutuhkan **Go 1.24+**, **Node.js 20+**, dan **MySQL/MariaDB**.

```bash
# 1. Backend
cd backend
cp .env.example .env          # sesuaikan kredensial basis data
go run .                      # skema diterapkan otomatis, jalan di :8090

# 2. Frontend (jendela terminal lain)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8090" > .env.local
npm run dev                   # jalan di :3000
```

Buka `http://localhost:3000`. Panel panitia ada di `/admin`.

**Akun bawaan:** `admin` / `admin123`. **Wajib segera diganti** lewat menu
*Ganti Sandi*, karena hash sandinya ada di dalam repositori publik ini.

Langkah lengkap beserta penyiapan untuk server ada di
**[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**.

### Menjalankan dari peramban, tanpa memasang apa pun

Repositori ini dilengkapi konfigurasi **GitHub Codespaces**, sehingga Go,
Node.js, dan MariaDB dipasang otomatis:

1. Pada halaman repositori, klik tombol hijau **Code**
2. Pilih tab **Codespaces**, lalu **Create codespace on main**
3. Tunggu penyiapan selesai (beberapa menit pada pembuatan pertama)
4. Buka tab **PORTS**, setel porta **8090** menjadi *Public*, lalu klik alamat
   pada porta **3000**

Porta 8090 perlu disetel publik karena peramban pengunjung memanggil API
secara langsung. Codespace berhenti sendiri setelah menganggur, jadi untuk
dipakai sekolah sungguhan tetap diperlukan hosting.

---

## Ringkasan Fitur

### A. Situs profil sekolah (publik)

| Halaman | Alamat | Isi |
|---|---|---|
| Beranda | `/` | Keadaan PPDB waktu nyata, kuota terisi, peminatan, fasilitas, berita terbaru |
| Profil Sekolah | `/profil` | Sambutan kepala sekolah, visi, misi, sejarah, data pokok, peta |
| Fasilitas | `/fasilitas` | Sarana dan prasarana beserta gambarnya |
| Berita | `/berita`, `/berita/{slug}` | Berita dengan pencarian, penyaring kategori, halaman, pencacah baca, berita terkait |
| Galeri | `/galeri` | Foto kegiatan dengan penyaring kategori dan tampilan besar |
| Kontak | `/kontak` | Alamat, jalur kontak, peta, formulir pertanyaan |

### B. PPDB online

| Halaman | Alamat | Isi |
|---|---|---|
| Informasi PPDB | `/ppdb` | Jadwal, empat jalur, alur, dokumen yang diminta, kuota per peminatan |
| Formulir Pendaftaran | `/ppdb/daftar` | Lima langkah pengisian + unggah enam dokumen + pernyataan kebenaran data |
| Cek Status | `/ppdb/cek` | Pantau hasil verifikasi dengan nomor registrasi + tanggal lahir |

Formulirnya dibagi lima langkah dan dapat dilompati bebas. Bila server menolak
isian, halaman otomatis kembali ke langkah yang memuat kesalahan pertama, dan
setiap keterangan kesalahan menempel di bawah kolomnya masing-masing.

### C. Panel panitia

| Halaman | Alamat | Isi |
|---|---|---|
| Dasbor | `/admin` | Angka ringkas, sebaran status, kanal promosi teratas, keterisian kuota, tren 30 hari |
| Data Pendaftar | `/admin/pendaftar` | Penyaring lima kriteria, pencarian, pengurutan, halaman, unduh CSV |
| Detail Pendaftar | `/admin/pendaftar/{id}` | Seluruh isian, dokumen terlindungi token, ubah status, catatan panitia |
| Laporan Promosi | `/admin/laporan` | Rekap per kanal, jalur, status, peminatan, jenis kelamin, asal sekolah, bulan |
| Peminatan | `/admin/jurusan` | Kelola peminatan dan kuotanya |
| Berita | `/admin/berita` | Tulis, ubah, hapus, terbit/draf, unggah gambar |
| Galeri | `/admin/galeri` | Unggah, ubah, hapus foto beserta kategorinya |
| Fasilitas | `/admin/fasilitas` | Kelola sarana beserta gambar dan urutannya |
| Pesan Masuk | `/admin/pesan` | Pesan dari halaman kontak, tanda baca, balas lewat email/WhatsApp |
| Pengaturan | `/admin/pengaturan` | Seluruh isi situs publik, dikelompokkan menjadi enam bagian |
| Pengguna | `/admin/pengguna` | Kelola akun petugas dan perannya |

Seluruh isi situs publik berasal dari menu **Pengaturan**, sehingga sekolah
dapat mengubah tampilan tanpa menyentuh kode. Setelah admin menyimpan,
halaman publik disegarkan seketika.

### D. Dukungan tujuan "meningkatkan efektivitas promosi"

Bagian inilah yang menjadi sumber data pembahasan laporan PkM:

1. **Pertanyaan sumber informasi** pada formulir pendaftaran, dengan dua belas
   pilihan kanal promosi dan satu kolom keterangan bebas.
2. **Laporan per kanal promosi** beserta porsinya terhadap seluruh pendaftar.
   Menjawab kanal mana yang benar-benar membawa pendaftar, bukan yang hanya
   dianggap ramai.
3. **Rekap asal sekolah** untuk menentukan SMP/MTs sasaran sosialisasi
   tahun berikutnya.
4. **Sebaran pendaftaran per bulan** untuk melihat bulan mana promosi
   paling berdampak.
5. **Porsi pendaftar yang tidak mengisi sumber informasi**, ditampilkan
   terang-terangan sebagai ukuran seberapa lengkap datanya.
6. **Unduh CSV** yang mengikuti penyaring yang sedang dipakai, untuk lampiran
   laporan.
7. **Meta tag SEO dan Open Graph** yang diambil dari data sekolah, sehingga
   tautan yang dibagikan ke WhatsApp dan media sosial tampil dengan judul dan
   keterangan yang benar.

---

## Keamanan yang Diterapkan

| Aspek | Penerapan |
|---|---|
| SQL Injection | Seluruh kueri memakai pernyataan tersiap; tidak ada perangkaian string SQL. Nama kolom pengurutan dipetakan dari daftar tetap, bukan diteruskan dari luar |
| XSS | Isi berita ditampilkan sebagai teks, bukan HTML, sehingga naskah dari basis data tidak dapat menyisipkan skrip |
| Kata sandi | bcrypt; tidak pernah disimpan polos maupun dikirim balik |
| Token masuk | JWT HS256 berlaku 8 jam; tanda tangannya dibandingkan dalam bentuk teks agar token yang karakter terakhirnya diubah tetap tertolak |
| Brute force | Maksimal lima percobaan masuk gagal per sepuluh menit per alamat IP |
| Pembatasan peran | `admin` mengelola pengaturan, peminatan, pengguna, dan penghapusan pendaftar; `operator` hanya mengelola pendaftar dan isi situs. Dijaga di backend, bukan hanya disembunyikan dari menu |
| Unggahan berkas | Ekstensi **dan** beberapa bita pertama isinya diperiksa, sehingga skrip bernama `.jpg` tertolak. Batas 2 MB, nama berkas diacak |
| Dokumen pendaftar | Kartu Keluarga, akta, dan ijazah hanya dapat diunduh dengan token petugas, dan tidak disimpan di cache bersama |
| Cek status | Nomor registrasi saja tidak cukup; tanggal lahir menjadi pasangan kunci agar data orang lain tidak terbuka dengan menebak nomor |
| Spam | Kolom perangkap tersembunyi pada formulir pendaftaran dan kontak |
| CORS | Asal yang diizinkan disebutkan satu per satu, bukan `*`, karena permintaannya membawa token |
| Kredensial | Seluruhnya dibaca dari variabel lingkungan. `JWT_SECRET` wajib diisi saat `APP_ENV=produksi`, dan berkas `.env` tidak ikut ke repositori |

---

## Basis Data (9 tabel)

| Tabel | Fungsi |
|---|---|
| `users` | Akun admin dan operator panitia |
| `pengaturan` | Pengaturan situs dan PPDB (pasangan nama–nilai) |
| `jurusan` | Peminatan beserta kuota |
| `pendaftar` | Data pendaftar PPDB (50 kolom) |
| `berita` | Berita, pengumuman, prestasi, kegiatan |
| `galeri` | Foto dokumentasi kegiatan |
| `fasilitas` | Sarana dan prasarana sekolah |
| `pesan` | Pesan dari formulir kontak |
| `statistik_kunjungan` | Kunjungan per halaman per hari + sumber rujukan |

Skema diterapkan otomatis saat backend pertama kali dijalankan. Basis data
yang sudah berisi tabel dari versi PHP dikenali dan **dilewati**, bukan
ditimpa.

---

## Demo langsung

**[ridhoo1616.github.io/pkm-sma-imtek](https://ridhoo1616.github.io/pkm-sma-imtek/)**

Tautan di atas membuka demo yang dapat diklik tanpa memasang apa pun. Alur yang
berjalan penuh:

1. Isi formulir pendaftaran lima langkah, termasuk pilih berkas untuk diunggah.
2. Terima nomor registrasi, lalu pantau statusnya di menu Cek Status.
3. Masuk panel panitia dengan `admin` / `admin123`, buka menu Pendaftar, ubah
   status dan tulis catatan verifikasi.
4. Buka kembali Cek Status memakai nomor registrasi tadi; statusnya sudah
   berubah beserta catatan panitianya.

Menu pengelolaan isi juga berfungsi: menulis berita, mengunggah foto galeri,
menambah fasilitas dan peminatan, membalas pesan masuk, sampai menutup
pendaftaran dari menu Pengaturan. Tersedia pula akun operator
`panitia` / `panitia123` untuk melihat perbedaan hak aksesnya.

**Bagaimana demo ini dibuat.** Tampilannya bukan dibuat ulang: HTML dan kelas
Tailwind-nya ditangkap langsung dari aplikasi Next.js yang berjalan, lalu
dirakit menjadi berkas statis. Yang ditulis ulang hanya lapisan datanya, karena
GitHub Pages tidak dapat menjalankan program di sisi server. Aturan pemeriksaan
isian disalin dari `backend/validasi.go` agar pesan yang muncul sama dengan
aplikasi sebenarnya.

Konsekuensinya perlu diketahui sebelum dipakai menilai:

- Data tersimpan di peramban masing-masing pengunjung, bukan di basis data
  bersama. Pendaftaran yang Anda kirim tidak terlihat oleh orang lain.
- Berkas yang dipilih tidak benar-benar diunggah ke mana pun; yang tersimpan
  hanya namanya.
- Foto sekolah belum tersedia, jadi demo memakai gambar pengganti yang diberi
  keterangan.
- Tombol **Mulai ulang demo** di bagian atas mengembalikan seluruh data contoh
  ke keadaan awal.

Isi folder `docs/` dihasilkan oleh perakit, bukan ditulis tangan. Untuk
memperbaruinya, aplikasi dijalankan lebih dulu, tampilannya ditangkap dari
peramban, lalu dirakit ulang menjadi `index.html`, `gaya.css`, `data.js`, dan
`demo.js`.

## Versi PHP (arsip)

Versi pertama aplikasi ini ditulis dengan PHP native dan kini berada di
`legacy-php/`. Berkasnya dipertahankan sebagai rujukan perilaku dan sebagai
bahan pembanding pada laporan PkM. Keterangannya ada di
[legacy-php/BACA-INI.md](legacy-php/BACA-INI.md).

---

## Status Pengujian

Diuji pada Go 1.27, Node.js 24, dan MySQL 9.3 (mode `ONLY_FULL_GROUP_BY` dan
`STRICT_TRANS_TABLES` aktif).

**Backend, 71 pemeriksaan terhadap API yang berjalan:**

- Pendaftaran lengkap dengan unggahan → nomor registrasi terbit, data dan
  berkas tersimpan.
- Validasi terbukti menolak: kolom wajib kosong, pendaftaran ganda dengan nama
  dan tanggal lahir sama, jalur Prestasi tanpa sertifikat, NISN/NIK salah
  jumlah angka, usia di luar 11–25 tahun, email tidak valid, nilai di luar
  0–100, dan pilihan sumber informasi yang tidak dikenal.
- Berkas PHP yang diberi nama `.jpg` tertolak karena isinya diperiksa.
- Unggahan dari kiriman yang gagal dibersihkan otomatis, tidak menumpuk.
- Token yang diubah pada karakter terakhir, tengah tanda tangan, maupun
  muatannya, ketiganya tertolak.
- Pembatas percobaan masuk terbukti mengunci setelah lima kegagalan.
- Dokumen pendaftar tanpa token menghasilkan 401; upaya keluar dari folder
  unggahan menghasilkan 404.
- Peran `operator` tertolak pada Pengaturan, Pengguna, dan penghapusan
  pendaftar.
- Menutup pendaftaran menutup jalur API-nya sekaligus.
- Migrasi pada basis data yang sudah berisi data terbukti tidak menggandakan
  maupun menimpa isinya.

**Frontend, 62 pemeriksaan di peramban sungguhan (Chrome, protokol DevTools):**

- Sepuluh alamat halaman memuat dengan judul dan data sekolah yang benar.
- Tidak ada gulir mendatar pada lebar 1440px maupun 390px.
- Formulir kontak dan formulir PPDB terkirim; galat dari server menempel di
  bawah kolomnya, dan formulir melompat ke langkah yang bermasalah.
- Unggahan empat dokumen lewat peramban tersimpan, nomor registrasi terbit,
  lalu dapat dilacak di Cek Status.
- Tanggal lahir yang salah terbukti tidak membuka data orang lain.
- Panel admin: pengalihan tanpa sesi, penolakan sandi salah, verifikasi
  pendaftar tersimpan beserta nama verifikatornya, penyaring dan pencarian
  bekerja, laporan promosi terisi.
- Berita yang disimpan langsung tampil di situs publik; setelah dijadikan
  draf, hilang dari situs publik.
- Menutup PPDB dari Pengaturan langsung menutup formulirnya di situs publik.
- Menu khusus admin hilang bagi operator, dan operator yang memaksa membuka
  alamatnya ditolak server.

Backend bersih dari `go vet` dan `gofmt`; frontend bersih dari `eslint` dan
`tsc`.

---

## Lisensi

Kode sumber ini dirilis di bawah [MIT License](LICENSE). Bebas dipakai,
diubah, dan disebarkan, dengan syarat pemberitahuan hak cipta tetap disertakan.

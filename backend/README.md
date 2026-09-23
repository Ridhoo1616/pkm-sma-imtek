# Backend API Profil Sekolah & PPDB SMA IMTEK

API JSON yang ditulis dengan **Go** memakai pustaka standar. Tidak memakai
kerangka kerja web maupun ORM, sehingga hasil kompilasinya satu berkas biner
tunggal yang bisa dijalankan di mana saja.

Basis datanya **PostgreSQL**. Pustaka luar yang dipakai hanya tiga:
`jackc/pgx/v5` sebagai penggerak basis data, `golang.org/x/crypto` untuk
bcrypt, dan `johnfercher/maroto/v2` untuk mencetak bukti pendaftaran PDF.

## Menjalankan

```bash
cp .env.example .env     # lalu sesuaikan kredensial basis data
go run .
```

Berkas `.env` di folder ini dibaca saat penyalaan, tetapi variabel lingkungan
yang sudah tersetel **tidak** ditimpa olehnya. Urutan itu disengaja: layanan
hosting menyuntikkan kredensialnya lewat lingkungan, dan nilai itu harus
menang atas berkas yang mungkin tertinggal di server.

Skema basis data diterapkan otomatis saat pertama kali dijalankan. Berkas
migrasi berada di `migrations/`, dan yang sudah dijalankan dicatat pada tabel
`migrasi` sehingga aman dipanggil berulang kali. Basis data yang sudah berisi
tabelnya dikenali dan dilewati, bukan ditimpa.

Migrasi yang sudah ada dua berkas: `001_skema.sql` untuk sembilan tabel awal,
dan `002_ujian_biaya_notifikasi.sql` untuk rincian biaya, bank soal, tes
seleksi, dan catatan notifikasi. Basis data warisan versi PHP melewati migrasi
**pertama** saja, lalu menerima migrasi berikutnya seperti biasa.

Untuk memindahkan data dari versi PHP yang memakai MySQL, lihat
`alat/pindah-mysql/` dan bagian 9 pada
[PANDUAN-INSTALASI.md](../PANDUAN-INSTALASI.md).

Membuat berkas biner untuk diunggah ke server:

```bash
go build -o server .
```

## Akun awal

`admin` / `admin123`. **Wajib diganti** sebelum dipakai sungguhan, karena
hash sandinya ada di dalam repositori publik ini. Gantilah lewat
`POST /api/saya/sandi` atau menu pengguna di panel admin.

## Susunan berkas

| Berkas | Isi |
|---|---|
| `main.go` | daftar alamat API dan penyalaan server |
| `config.go` | pembacaan konfigurasi dari variabel lingkungan |
| `db.go` | koneksi basis data dan pelaksana migrasi |
| `aplikasi.go` | struktur aplikasi, lapisan tengah, cache pengaturan |
| `auth.go` | token masuk, pembatas percobaan, ganti sandi |
| `validasi.go` | pemeriksaan isian formulir |
| `unggah.go` | penyimpanan berkas dan pemeriksaan tipe aslinya |
| `cetak.go` | bukti pendaftaran PDF, dirakit dengan Maroto |
| `cetak_kartu.go` | kartu peserta tes seleksi: barcode Code 128 dan kode QR |
| `notifikasi.go` | penyusunan naskah, pembersihan nomor, dan pengiriman WhatsApp |
| `handler_ujian.go` | bank soal, paket ujian, dan sesi tes seleksi |
| `handler_biaya.go` | rincian biaya per tahap pembayaran |
| `handler_notifikasi.go` | panel notifikasi: tinjau, kirim, batalkan |
| `model.go` | bentuk data dan daftar pilihan yang sah |
| `respon.go` | bentuk respons dan galat yang seragam |
| `handler_publik.go` | halaman publik: profil, jurusan, fasilitas, berita, galeri, kontak |
| `handler_pendaftar.go` | formulir PPDB dan cek status |
| `handler_admin.go` | dasbor, kelola pendaftar, laporan, ekspor CSV |
| `handler_konten.go` | jurusan, berita, galeri, fasilitas |
| `handler_pengaturan.go` | pesan masuk, pengaturan sekolah, pengguna |

## Daftar alamat API

### Tanpa perlu masuk

| Metode | Alamat | Keterangan |
|---|---|---|
| GET | `/api/sehat` | pemeriksaan kesehatan server |
| GET | `/api/profil` | pengaturan sekolah dan keadaan PPDB |
| GET | `/api/jurusan` | peminatan yang aktif |
| GET | `/api/fasilitas` | daftar fasilitas |
| GET | `/api/berita` | berita terbit, dengan halaman dan penyaring |
| GET | `/api/berita/{slug}` | satu berita beserta berita terkait |
| GET | `/api/galeri` | foto galeri dan daftar kategorinya |
| POST | `/api/pesan` | kirim pesan dari halaman kontak |
| POST | `/api/ppdb/daftar` | kirim formulir pendaftaran (multipart) |
| POST | `/api/ppdb/cek` | cek status dengan nomor registrasi + tanggal lahir |
| POST | `/api/ppdb/bukti` | unduh bukti pendaftaran PDF, kuncinya sama dengan cek status |
| POST | `/api/ppdb/kartu` | unduh kartu peserta tes seleksi (PDF, barcode + QR) |
| GET | `/api/biaya` | rincian biaya beserta total per tahap |
| GET | `/api/ppdb/ujian` | keadaan tes seleksi: dibuka atau belum |
| POST | `/api/ppdb/ujian/mulai` | mulai atau lanjutkan sesi, menerbitkan token peserta |
| POST | `/api/masuk` | masuk sebagai petugas |

### Perlu token (petugas)

| Metode | Alamat | Keterangan |
|---|---|---|
| GET | `/api/saya` | identitas pemilik token |
| POST | `/api/saya/sandi` | ganti kata sandi sendiri |
| GET | `/api/admin/dasbor` | ringkasan angka dan pendaftar terbaru |
| GET | `/api/admin/pendaftar` | daftar pendaftar, dengan penyaring dan pencarian |
| GET | `/api/admin/pendaftar/ekspor` | unduh CSV sesuai penyaring yang dipakai |
| GET | `/api/admin/pendaftar/{id}` | rincian satu pendaftar |
| GET | `/api/admin/pendaftar/{id}/bukti` | cetak bukti pendaftaran PDF |
| GET | `/api/admin/pendaftar/{id}/kartu` | cetak kartu peserta tes seleksi |
| PATCH | `/api/admin/pendaftar/{id}/ruang` | ruang dan nomor kursi pada kartu peserta |
| GET/POST/PUT/DELETE | `/api/admin/soal` | bank soal tes seleksi |
| GET | `/api/admin/paket-ujian/{id}/hasil` | rekap nilai satu paket |
| GET/POST/PATCH | `/api/admin/notifikasi` | tinjau, kirim, dan batalkan notifikasi |
| PATCH | `/api/admin/pendaftar/{id}/status` | verifikasi: ubah status dan catatan |
| GET | `/api/admin/laporan` | angka efektivitas promosi per kanal |
| GET | `/api/admin/jurusan` | seluruh peminatan, termasuk yang nonaktif |
| GET/POST/PUT/DELETE | `/api/admin/berita` | kelola berita |
| POST/PUT/DELETE | `/api/admin/galeri` | kelola foto galeri |
| POST/PUT/DELETE | `/api/admin/fasilitas` | kelola fasilitas |
| GET/PATCH/DELETE | `/api/admin/pesan` | pesan masuk dari halaman kontak |

### Khusus peran `admin`

| Metode | Alamat | Keterangan |
|---|---|---|
| DELETE | `/api/admin/pendaftar/{id}` | hapus pendaftar beserta dokumennya |
| POST/PUT/DELETE | `/api/admin/jurusan` | kelola peminatan |
| GET/PUT | `/api/admin/pengaturan` | pengaturan sekolah dan PPDB |
| GET/POST/PUT/DELETE | `/api/admin/pengguna` | kelola akun petugas |
| GET/POST/PUT/DELETE | `/api/admin/biaya` | kelola rincian biaya |
| POST/PUT/DELETE | `/api/admin/paket-ujian` | buka dan tutup jadwal tes seleksi |

### Berkas unggahan

`GET /unggahan/{folder}/{berkas}` melayani gambar berita, galeri, dan
fasilitas secara terbuka. Folder `pendaftar` berisi dokumen pribadi
(Kartu Keluarga, akta kelahiran, ijazah), sehingga wajib membawa token
petugas dan tidak disimpan di cache bersama.

## Bentuk galat

Seluruh galat memakai satu bentuk yang sama:

```json
{
  "pesan": "Data yang dikirim belum benar.",
  "kolom": { "nisn": "NISN harus berupa 10 angka." },
  "daftar": ["NISN harus berupa 10 angka."]
}
```

`kolom` dipakai frontend untuk menempelkan keterangan di bawah input yang
salah, sedangkan `daftar` untuk ringkasan di atas formulir.

## Catatan keamanan

- Sandi disimpan sebagai hash bcrypt.
- Seluruh kueri memakai pernyataan tersiap, tidak ada perangkaian string SQL.
- Percobaan masuk dibatasi lima kali gagal per sepuluh menit per alamat IP.
- Unggahan diperiksa ekstensi **dan** beberapa bita pertama isinya, sehingga
  berkas skrip yang diberi nama `.jpg` tertolak.
- Nama berkas unggahan diacak agar dokumen pribadi tidak dapat ditebak.
- Dokumen pendaftar hanya dapat diunduh dengan token petugas.
- Menutup pendaftaran juga menutup jalur API-nya, bukan hanya menyembunyikan
  tombolnya di frontend.
- Bukti pendaftaran PDF memakai kunci yang sama dengan cek status, yaitu nomor
  registrasi **beserta** tanggal lahir, dan dikirim dengan
  `Cache-Control: private, no-store` agar tidak tertinggal di cache proksi.
- Penomoran nomor registrasi dikunci dengan `pg_advisory_xact_lock` selama
  transaksi, sehingga pendaftaran yang datang bersamaan tidak memperoleh nomor
  yang sama.
- Peran diperiksa pada `wajibMasuk`, bukan hanya tanda tangan tokennya. Token
  peserta tes seleksi ditandatangani dengan kunci yang sama, jadi tanpa
  pemeriksaan peran seorang peserta dapat memakai token ujiannya untuk membuka
  data seluruh pendaftar.
- Kunci jawaban tes seleksi tidak pernah masuk ke respons yang diterima
  peserta, dan penilaiannya seluruhnya dikerjakan server.
- Batas waktu ujian ditegakkan pada setiap penyimpanan jawaban, bukan hanya
  saat soal diambil.
- Alamat gateway WhatsApp wajib `https`, kecuali bila menunjuk ke localhost
  karena lalu lintasnya tidak meninggalkan mesin itu.

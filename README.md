# Digitalisasi Profil Sekolah dan PPDB Berbasis Web untuk SMA IMTEK

Sistem informasi berbasis web yang menggabungkan **profil sekolah** dan
**Pendaftaran Peserta Didik Baru (PPDB) online** untuk meningkatkan efektivitas
promosi SMA IMTEK.

Dikembangkan oleh mahasiswa **Program Kreativitas Mahasiswa (PkM)**
**Jurusan Teknik Informatika**, bidang *Manajemen Komputer & Sistem*.

| | |
|---|---|
| **Judul** | Digitalisasi Profil Sekolah dan Pendaftaran Peserta Didik Baru (PPDB) Berbasis Web untuk Meningkatkan Efektivitas Promosi pada SMA IMTEK |
| **Sekolah** | SMA IMTEK (Swasta), NPSN 20613766, Akreditasi B<br>Jl. Raya Pagedangan, Cicalengka, Kec. Pagedangan, Kab. Tangerang, Banten 15339 |
| **Jurusan** | Teknik Informatika |
| **Bidang PkM** | Manajemen Komputer & Sistem |
| **Backend** | Go 1.27 (pustaka standar, tanpa kerangka kerja web) + PostgreSQL 17 + Maroto (cetak PDF) |
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Framer Motion + Lenis + Radix UI |
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
│   ├── validasi_identitas.go  struktur NISN dan NIK, beserta ujinya
│   ├── unggah.go            penyimpanan dan pemeriksaan berkas
│   ├── cetak.go             bukti pendaftaran PDF dengan Maroto
│   ├── cetak_kartu.go       kartu peserta ujian, barcode + kode QR
│   ├── notifikasi.go        penyusunan dan pengiriman notifikasi WhatsApp
│   ├── handler_*.go         penangan tiap kelompok alamat API
│   ├── handler_faq.go       tanya jawab
│   ├── handler_profil.go    profil sekolah, akademik, kesiswaan
│   └── migrations/          skema basis data (21 tabel + data awal)
│
├── frontend/       Situs dan panel admin dengan Next.js
│   └── src/
│       ├── app/(publik)/    beranda; menu Profil Sekolah, Akademik, dan
│       │                    Kesiswaan beserta halaman turunannya; berita,
│       │                    galeri, kontak, tanya jawab; info PPDB,
│       │                    formulir, cek status, tes seleksi
│       ├── app/admin/       20 halaman panel panitia
│       ├── komponen/        elemen tampilan bersama, termasuk jendela
│       │                    dan kabar berbasis Radix serta gulir Lenis
│       └── lib/             lapisan API, tipe data, pembantu format,
│                            susunan menu, pemeriksa NISN dan NIK
│       public/font/         huruf tulisan tangan Caveat beserta lisensinya
│
├── alat/
│   └── pindah-mysql/   Memindahkan data versi PHP (MySQL) ke PostgreSQL
│
├── .vscode/        Tugas, setelan, dan saran ekstensi untuk VS Code
├── legacy-php/     Versi PHP pertama, diarsipkan sebagai rujukan perilaku
├── docs/           Demo statis untuk GitHub Pages
└── PANDUAN-INSTALASI.md
```

Pemisahan ini dipilih karena backend Go menghasilkan **satu berkas biner**
yang bisa dijalankan di mana saja tanpa memasang penerjemah bahasa, sementara
frontend-nya dapat dipindah ke layanan lain tanpa menyentuh logika data.

---

## Menjalankan

Dibutuhkan **Go 1.24+**, **Node.js 20+**, dan **PostgreSQL 14+**.

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

Berkas `.env` dibaca saat penyalaan, tetapi variabel lingkungan yang sudah
tersetel tidak ditimpa olehnya, supaya kredensial dari layanan hosting menang
atas berkas yang mungkin tertinggal di server.

Langkah lengkap beserta penyiapan untuk server ada di
**[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**. Untuk memindahkan data dari
versi PHP yang memakai MySQL, lihat bagian 9 pada panduan itu.

### Menjalankan dari peramban, tanpa memasang apa pun

Repositori ini dilengkapi konfigurasi **GitHub Codespaces**, sehingga Go,
Node.js, dan PostgreSQL dipasang otomatis:

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
| Beranda | `/` | Profil sekolah dulu: nama, akreditasi, foto gedung, angka sekolah, keunggulan, peminatan, fasilitas, prestasi, berita. Keadaan PPDB berupa satu bilah ringkas, ajakan mendaftar di ujung halaman |
| Profil Sekolah | `/profil` | Sambutan kepala sekolah beserta fotonya, lalu pengantar ke enam halaman turunannya |
| Sejarah Sekolah | `/profil/sejarah` | Riwayat berdirinya sekolah |
| Data Sekolah | `/profil/data-sekolah` | NPSN, status, akreditasi, penyelenggara, alamat, jam layanan, peta |
| Visi & Misi | `/profil/visi-misi` | Rumusan visi beserta poin-poin misinya |
| Sarana dan Prasarana | `/fasilitas` | Sarana dan prasarana beserta gambarnya |
| Struktur Organisasi | `/profil/struktur-organisasi` | Bagan struktur beserta unsur pimpinan |
| Tenaga Pendidik | `/profil/tenaga-pendidik` | Guru dan tenaga kependidikan, dikelompokkan menurut kategorinya |
| Akademik | `/akademik` beserta turunannya | E-learning, jadwal pelajaran, kalender akademik, kurikulum, perpustakaan digital |
| Kesiswaan | `/kesiswaan` beserta turunannya | Ekstrakurikuler, OSIS, prestasi siswa, pendidikan karakter |
| Halaman naskah | `/halaman/{slug}` | Halaman profil bernaskah panjang yang dapat ditambah sekolah sendiri |
| Berita | `/berita`, `/berita/{slug}` | Berita dengan pencarian, penyaring kategori, halaman, pencacah baca, berita terkait |
| Galeri | `/galeri` | Foto kegiatan dengan penyaring kategori dan tampilan besar |
| Kontak | `/kontak` | Alamat, jalur kontak, peta, formulir pertanyaan |
| Tanya Jawab | `/faq` | 24 pertanyaan dengan penyaring kategori, pencarian, dan penanda yang sering ditanyakan |

### B. PPDB online

| Halaman | Alamat | Isi |
|---|---|---|
| Informasi PPDB | `/ppdb` | Jadwal, empat jalur, alur, dokumen yang diminta, kuota per peminatan, rincian biaya |
| Formulir Pendaftaran | `/ppdb/daftar` | Lima langkah pengisian + unggah enam dokumen + pernyataan kebenaran data |
| Cek Status | `/ppdb/cek` | Pantau hasil verifikasi, nilai tes seleksi, unduh bukti pendaftaran dan kartu peserta |
| Tes Seleksi | `/ppdb/ujian` | Kerjakan tes seleksi online, waktunya dihitung server |

Formulirnya dibagi lima langkah dan dapat dilompati bebas. Bila server menolak
isian, halaman otomatis kembali ke langkah yang memuat kesalahan pertama, dan
setiap keterangan kesalahan menempel di bawah kolomnya masing-masing.

### C. Panel panitia

| Halaman | Alamat | Isi |
|---|---|---|
| Dasbor | `/admin` | Angka ringkas, sebaran status, kanal promosi teratas, keterisian kuota, tren 30 hari |
| Data Pendaftar | `/admin/pendaftar` | Penyaring lima kriteria, pencarian, pengurutan, halaman, unduh CSV. Kolom status ditaruh tepat sesudah nama, karena tabelnya sebelas kolom dan selalu lebih lebar daripada jendela |
| Detail Pendaftar | `/admin/pendaftar/{id}` | Seluruh isian, dokumen terlindungi token, ubah status, catatan panitia, cetak bukti PDF |
| Laporan Promosi | `/admin/laporan` | Rekap per kanal, jalur, status, peminatan, jenis kelamin, asal sekolah, bulan |
| Peminatan | `/admin/jurusan` | Kelola peminatan dan kuotanya |
| Berita | `/admin/berita` | Tulis, ubah, hapus, terbit/draf, unggah gambar |
| Galeri | `/admin/galeri` | Unggah, ubah, hapus foto beserta kategorinya |
| Fasilitas | `/admin/fasilitas` | Kelola sarana beserta gambar dan urutannya |
| Pesan Masuk | `/admin/pesan` | Pesan dari halaman kontak, tanda baca, balas lewat email/WhatsApp |
| Pengaturan | `/admin/pengaturan` | Seluruh isi situs publik, dikelompokkan menjadi enam bagian |
| Notifikasi | `/admin/notifikasi` | Pesan WhatsApp yang disusun sistem, ditinjau lalu dikirim |
| Bank Soal | `/admin/soal` | Soal pilihan ganda untuk tes seleksi |
| Tes Seleksi | `/admin/ujian` | Jadwal tes, durasi, nilai minimum, dan rekap hasilnya |
| Rincian Biaya | `/admin/biaya` | Pos biaya per tahap; totalnya dihitung sistem |
Tanya Jawab | `/admin/faq` | Kelola pertanyaan, kategori, urutan, dan penanda sorot |
| Halaman Profil | `/admin/halaman` | Naskah halaman Kurikulum, OSIS, Pendidikan Karakter, dan halaman profil baru |
| Tenaga Pendidik | `/admin/tenaga` | Guru dan tenaga kependidikan beserta foto, jabatan, dan mata pelajarannya |
| Kalender Akademik | `/admin/kalender` | Tanggal kegiatan, ujian, hari libur, dan jadwal PPDB |
| Kegiatan Siswa | `/admin/kegiatan` | Ekstrakurikuler, OSIS, dan pembinaan beserta pembina dan jadwalnya |
| Perpustakaan | `/admin/pustaka` | Katalog koleksi digital: berkas unggahan atau tautan ke layanan lain |
| Pengguna | `/admin/pengguna` | Kelola akun petugas dan perannya |

Seluruh isi situs publik berasal dari menu **Pengaturan**, sehingga sekolah
dapat mengubah tampilan tanpa menyentuh kode. Setelah admin menyimpan,
halaman publik disegarkan seketika.

### D. Tes seleksi online, kartu peserta, dan notifikasi

**Tes seleksi (CBT).** Peserta masuk dengan nomor registrasi beserta tanggal
lahir, kunci yang sama dengan Cek Status, lalu menerima token berumur pendek
yang hanya berlaku untuk jalur ujian. Tiga hal yang menentukan bentuknya:

- Batas waktu disimpan sebagai waktu mutlak saat sesi dimulai, bukan dihitung
  ulang dari durasi pada setiap permintaan. Memuat ulang halaman tidak
  memperpanjang waktu, dan penghitung di layar hanyalah tampilan.
- Susunan soal dibekukan saat sesi dimulai, sehingga nomor soal tidak
  berpindah dan jawaban yang sudah diisi tidak salah tempat.
- Kunci jawaban tidak pernah dikirim ke peramban; penilaiannya seluruhnya di
  server.

Jawaban dikirim satu per satu begitu dipilih, jadi jaringan yang terputus di
tengah jalan tidak menghanguskan yang sudah dijawab. Waktu habis menutup sesi
sendiri dan tetap menilai jawaban yang ada.

**Kartu peserta.** PDF dengan barcode Code 128 dan kode QR, keduanya memuat
nomor registrasi. Barcode untuk pemindai garis yang biasa dipakai saat
presensi ruang ujian, kode QR untuk dipindai dengan telepon. Ruang dan nomor
kursinya diisi panitia pada halaman rincian pendaftar.

**Notifikasi WhatsApp.** Pesan disusun sistem saat status pendaftar diubah,
lalu **menunggu ditinjau** panitia, bukan langsung terkirim; pesan yang salah
tidak dapat ditarik kembali dari WhatsApp. Pengirimannya punya dua jalur:

| Jalur | Cara kerja | Kapan dipakai |
|---|---|---|
| Bawaan | Panitia menekan tombol, WhatsApp terbuka dengan pesan yang sudah terisi penuh, panitia menekan kirim | Tanpa biaya, tanpa risiko nomor sekolah diblokir |
| Gateway | `WA_GATEWAY_URL` disetel, server mengirim sendiri | Bila sekolah sudah punya akses WhatsApp Business API resmi |

Gateway tidak resmi yang menumpang WhatsApp Web milik nomor sekolah **tidak**
didukung dan tidak disarankan: itu melanggar ketentuan layanan, dan nomornya
berisiko diblokir justru pada masa PPDB. Setiap pesan dicatat beserta isinya,
sehingga panitia dapat menunjukkan persis apa yang diterima orang tua.

**Rincian biaya.** Setiap pos berdiri sendiri dengan tahap pembayarannya, dan
totalnya dihitung sistem. Pos yang besarannya belum ditetapkan sekolah tetap
ditampilkan dan ditandai, bukan disembunyikan maupun ditulis Rp0, karena
keduanya menyesatkan pada halaman yang judulnya transparansi biaya.

### E. Penuntun alur bagi pendaftar

Pertanyaan yang paling sering masuk ke panitia bukan pertanyaan sulit,
melainkan "saya harus ke mana sekarang". Tiga hal dibuat untuk menjawabnya
sebelum ditanyakan:

**Tombol bantuan melayang** di pojok kanan bawah setiap halaman publik.
Dibuka, tombolnya menampilkan enam langkah alur pendaftaran, menandai posisi
pengunjung dengan "Anda di sini", dan menyorot langkah berikutnya. Di
bawahnya ada jalur bertanya: WhatsApp, telepon, surel, dan tautan ke Tanya
Jawab. Bila nomor WhatsApp belum diisi sekolah, tombolnya tidak hilang; yang
hilang hanya pilihan WhatsApp-nya, karena penunjuk alurnya tetap berguna.

**Penunjuk alur** berupa bilah lima tahap di atas setiap halaman PPDB. Tahap
yang sudah lewat ditandai centang, tahap sekarang disorot, dan tahap yang
belum tercapai dibiarkan pudar. Tahap "Isi formulir" tidak dapat diklik bila
pendaftaran sedang ditutup, jadi pengunjung tidak dibawa ke halaman yang pasti
menolaknya.

**Arahan langkah berikutnya** pada halaman Info PPDB, yang isinya mengikuti
keadaan: terbuka mengarahkan ke formulir, tertutup menjelaskan apa yang masih
bisa dilakukan.

**Tanya jawab** berisi 24 pertanyaan dengan penyaring kategori dan pencarian.
Yang ditandai sorot muncul lebih dulu. Seluruh jawaban bawaannya hanya
menerangkan cara kerja sistem dan prosedurnya; angka dan tanggal milik sekolah
tidak dikarang di sana, melainkan diarahkan ke bagian yang datanya diisi
sekolah sendiri.

### F. Menu Profil Sekolah, Akademik, dan Kesiswaan

Situs sekolah dibaca dengan cara yang berbeda dari portal pendaftaran: orang
tua mencari satu hal tertentu, lalu keluar. Karena itu isinya dipecah menjadi
satu topik satu halaman, dikelompokkan pada tiga menu bertingkat.

| Menu | Halaman turunannya |
|---|---|
| Profil Sekolah | Sejarah Sekolah, Data Sekolah, Visi & Misi, Sarana dan Prasarana, Struktur Organisasi, Tenaga Pendidik dan Kependidikan |
| Akademik | E-Learning/LMS, Jadwal Pelajaran, Kalender Akademik, Kurikulum, Perpustakaan Digital |
| Kesiswaan | Ekstrakurikuler, OSIS, Prestasi Siswa, Pendidikan Karakter |

Empat butir di antaranya **tidak** memakai tempat penyimpanan baru, karena
datanya sudah ada dan menduplikasinya hanya membuat panitia mengisi dua kali:
Sejarah, Data Sekolah, serta Visi & Misi dibaca dari menu Pengaturan; Sarana
dan Prasarana adalah halaman Fasilitas yang sudah ada; dan Prestasi Siswa
mengambil berita berkategori Prestasi.

**Halaman Visi & Misi dibuka dengan orang-orangnya, bukan rumusannya.**
Bagian "Yang Menjalankannya" memuat tiga kartu berikon — guru dan tenaga
kependidikan, siswa dan siswi, serta pelaksanaan bersama — lalu rumusan visi
dan misinya di bawahnya. Visi dan misi yang berdiri sebagai dua blok teks
terbaca seperti dokumen, padahal yang mengerjakannya orang. Ikonnya
(`IkonGuru`, `IkonSiswa`, `IkonBersama`) digambar langsung sebagai SVG di
`komponen/Ikon.tsx`, bukan dimuat dari pustaka ikon, jadi ia ikut apa adanya
ke markup tangkapan demo dan tidak menambah satu pun permintaan jaringan.
Keterangan tiap kartu menerangkan **perannya** secara umum dan tidak memuat
penilaian apa pun tentang SMA IMTEK, karena penilaian seperti itu hanya boleh
datang dari sekolahnya sendiri.

**Kartu Visi dan Kartu Misi masing-masing dibagi dua kolom: naskah di kiri,
ilustrasi setinggi kartunya di kanan.** Kotak gambarnya persis setinggi kartu
pada setiap keadaan — 244 piksel saat rumusannya belum ada, 530 piksel saat
misinya lima poin — karena `self-stretch` pada petak mendatar. `object-contain`
menjaga perbandingan sisi gambarnya di dalam kotak itu; tanpa contain, menarik
tinggi gambar sampai setinggi kartu akan memipihkan orangnya. `object-bottom`
menaruh sisa ruangnya di atas, jadi sosok orangnya duduk di dasar kartu.

Margin negatif tegak dan kanan menghapus padding kartu pada tiga sisi itu
sehingga gambarnya benar-benar menyentuh tepi, dan kartunya mengurung isinya
sehingga gambarnya terpotong mengikuti sudut membulatnya. Naskahnya tidak
pernah bertemu gambar karena keduanya kolom yang berbeda — bukan karena
diberi jarak, dan bukan karena ada ruang cadangan.

**Susunannya sama di semua lebar, dan gambarnya selalu utuh.** Sempat dicoba
bertumpuk di layar sempit dengan gambar melebar penuh memakai `object-cover`,
supaya kotaknya terisi habis. Itu dibuang: kotak selebar 353 piksel setinggi
144 piksel berbanding 2,45 sedangkan gambarnya 0,90, jadi `cover` harus
membuang lebih dari separuh tinggi gambarnya — dan yang terbuang justru kepala
serta wajah orangnya. **Ruang kosong di atas gambar jauh lebih baik daripada
wajah yang terpotong.** Karena itu tetap `object-contain`, sisa ruangnya
ditaruh di atas oleh `object-bottom`, dan kolomnya sedikit dilebarkan pada
layar sempit supaya bukan bilah tipis.

Ruang cadangan itu memang pernah dipakai, dan itu kekeliruannya: gambar yang
ditempatkan mutlak tidak menempati ruang, jadi kartunya harus diberi ruang
kosong setinggi gambarnya, dan ruang itu tetap kosong walau rumusannya baru
satu kalimat — kartunya jadi 441 piksel. Letak atas atau bawah tidak pernah
menjadi sebabnya.

Tumpang tindihnya **tidak boleh** dinilai dari kotak pembatas elemen teks:
untuk gambar yang diapungkan, kotak paragraf tetap selebar kartu meski
baris-barisnya dipendekkan oleh gambar, sehingga pemeriksaan kotak memberi
kegagalan palsu. Yang diukur kotak TIAP BARIS lewat `Range.getClientRects()`.
Hasilnya nol baris bentrok pada 390, 640, 768, 1024, 1280, dan 1536 piksel.
Ilustrasinya dikirim user sebagai berkas SVG, tetapi isinya ternyata PNG yang
dibungkus wadah SVG — satu elemen `<image>` berisi data base64, tanpa satu
jalur vektor pun. Jadi tidak ada yang bisa diwarnai ulang, dan yang dikerjakan
tiga hal pada rasternya:

1. **Latarnya dibuang dengan perambatan dari tepi**, bukan penggantian warna
   menyeluruh. Bedanya menentukan: kemeja seragam pada gambar itu putih, sama
   dengan latarnya, jadi mengganti setiap piksel putih akan melubangi
   kemejanya. Perambatan hanya menjangkau yang bersambung dengan tepi gambar,
   dan garis tepi gambar yang gelap menahannya di luar sosok orangnya.
2. **Sisa tulisan dipotong.** Gambar misi terbawa dari gambar yang lebih
   besar, sehingga tepi kirinya masih memuat potongan kata — "didik",
   "aman,", "tua," — yang terbaca sebagai kekeliruan. Kolomnya dihitung:
   sampai x=34 isinya cuma 5–34 piksel per kolom, lalu melonjak ke ratusan
   begitu masuk sosoknya, jadi 36 kolom pertama dibuang.
3. **Warnanya dikurangi ke 64 dengan median cut**, sehingga 322 KB dan 294 KB
   menjadi 47 KB dan 35 KB. Cara "ambil warna yang paling sering" sudah
   dicoba dan gagal: puluhan ribu warnanya didominasi variasi putih, hitam,
   dan hijau, jadi empat puluh warna teratas sama sekali tidak memuat kuning
   kardigan maupun biru dasi — kardigannya berubah kelabu.

Berkas hasilnya ada di `frontend/public/ilustrasi/`, **bukan lewat unggahan**.
Karena itu pengaturan `visi_gambar` beserta kolom unggahnya dilepas kembali
(migrasi 007): tidak ada gunanya menyediakan kendali yang tidak mengerjakan
apa pun. Ilustrasi yang ditanam sebagai berkas juga tidak bisa hilang dari
basis data, dan demo statis dapat menyalinnya apa adanya — `rakit.py`
menyalinnya ke `docs/ilustrasi/` lalu membuat alamatnya relatif, sebab demo
dilayani di bawah `/pkm-sma-imtek/` sehingga alamat berawalan garis miring
berakhir 404. Disalin sebagai berkas, bukan disisipkan sebagai data URI
seperti gambar pengaturan, karena sebagai berkas terpisah ia dapat disimpan
cache peramban dan tidak menambah 110 KB pada `data.js`.

**Yang masih perlu diputuskan sekolah:** kedua ilustrasi itu memuat tulisan
yang ikut tergambar — "Belajar Bersama Meraih Masa Depan" dan "Pendidikan Hari
Ini Untuk Masa Depan". Keduanya semboyan pendidikan yang umum, bukan
pernyataan tentang SMA IMTEK, dan letaknya di dalam gambar sebagai tulisan
pada papan. Tetap dicatat di sini supaya sekolah sadar bahwa kalimat itu ada
dan bukan rumusan resmi mereka.

Percobaan sebelumnya yang dibuang: satu adegan ruang kelas digambar sendiri
sebagai SVG penuh, dan pada bidang sebesar itu bentuk badannya jadi seperti
bel, bukan orang. Foto pun bukan pilihan, karena berarti memakai wajah guru
dan siswa sungguhan tanpa izin mereka.

Dua butir sengaja berupa pintu masuk, bukan sistem yang dibangun sendiri.
E-Learning menampilkan tautan ke layanan yang sudah dipakai sekolah, misalnya
Google Classroom atau Moodle, dan Jadwal Pelajaran menunjuk berkas jadwalnya.
Membangun ruang kelas daring kedua hanya akan menghasilkan kelas kosong yang
harus dirawat, sedangkan satu tautan yang mudah ditemukan justru dipakai.

**Menu bertingkatnya dapat dipakai tanpa tetikus.** Pembukanya berupa
`<button aria-expanded>`, bukan tautan yang tidak pernah dituju, sehingga Tab
dan Enter bekerja seperti biasa; Escape menutupnya; dan pada layar kecil
bentuknya berubah menjadi daftar yang dapat dilipat, karena di sana tidak ada
hover sama sekali. Setiap halaman turunan juga membawa jejak lokasi beserta
tautan ke halaman sekelompok, jadi pengunjung dapat berpindah ke topik sebelah
tanpa kembali ke menu atas.

**Bagian sambutan kepala sekolah** disusun sebagai kartu berlatar gradasi:
potret kepala sekolah bersudut membulat, naskah sambutan sebagai kutipan
miring di antara dua tanda petik besar, foto gedung sekolah yang dipudarkan di
bagian bawah kartu, dan semboyan sekolah ditulis dengan huruf tulisan tangan.

**Potretnya sengaja menonjol ke luar kartu.** Ia dinaikkan sampai menembus
tepi atas kartu sekaligus garis pemisah di bawah kepala halaman, jadi satu
benda memotong dua bidang warna — itulah yang membuatnya terbaca sebagai foto
sungguhan, bukan gambar yang dijejalkan ke dalam kotak. Angkanya bukan
kira-kira: jarak kartu ke garis 3,5rem dan padding atas kartu 3rem, jadi
`md:-mt-40` menaikkannya 7rem di atas tepi kartu dan 3,5rem di atas garis,
berhenti di dalam padding bawah kepala halaman yang 4rem sehingga tidak
menimpa keterangan di sana. Pada ambang `sm` paddingnya lebih kecil, maka di
sana potret dinaikkan lebih sedikit; pada layar sempit tidak dinaikkan sama
sekali karena kolomnya bertumpuk. Konsekuensinya: kartu itu **tidak boleh**
memakai `overflow-hidden`, dan lapisan foto gedung diberi pengurung sendiri
supaya tetap terpotong mengikuti sudut kartu. Judul bagian pindah ke kolom
kanan bersama naskahnya — kalau melintang di atas kedua kolom, potret yang
dinaikkan akan menimpanya.

Garis emasnya satu saja, di bawah judul bagian. Sempat ada satu lagi di atas
potret, dan dua garis yang bentuknya sama persis dalam satu kartu terbaca
sebagai pengulangan, bukan aksen. Keterangan tentang bahan yang belum dikirim
sekolah memakai satu komponen yang sama, `Menunggu` di
`komponen/Halaman.tsx`, dan bentuknya **kartu biasa berisi teks miring redup**
— bukan kotak kuning bergaris putus-putus seperti dulu. Kotak berwarna adalah
bahasa untuk peringatan yang harus ditindak; catatan bahwa naskahnya belum
sampai bukan peringatan, dan dengan warna peringatan ia justru menarik mata
lebih kuat daripada isi halamannya sendiri. Kotak kuning tetap dipakai di
tempat yang memang peringatan: server tidak merespons, pos biaya masih nol,
nomor registrasi yang harus dicatat, dan konfirmasi hapus.

Keempat bahannya berasal dari menu Pengaturan, tidak satu pun ditulis di dalam
kode: `foto_kepsek`, `sambutan_kepsek`, `foto_depan`, dan `tagline`. Selama
salah satunya belum diunggah atau diisi, yang tampil kerangka berukuran sama
yang menyebutkan perbandingan sisi dan ukuran piksel yang diharapkan, bukan
tulisan karangan. Dengan begitu tata letak halaman sudah final sebelum
bahannya ada, dan panitia tahu apa yang perlu disiapkan. Hal yang sama berlaku
untuk bagan struktur organisasi.

Huruf tulisan tangannya **Caveat**, berlisensi SIL Open Font License, dan
berkasnya disimpan di dalam proyek pada `frontend/public/font`, bukan dimuat
dari Google Fonts. Tiga alasannya: halaman publik tidak memerlukan sambungan
ke server pihak lain hanya untuk satu baris tulisan; alamat IP pengunjung,
yang termasuk calon peserta didik dan orang tuanya, tidak ikut terkirim ke
Google setiap kali halaman dibuka; dan demo statis di GitHub Pages ikut
berjalan tanpa sambungan ke luar. Subsetnya Latin saja, 74 KB, dan dimuat
dengan `font-display: swap` sehingga tulisannya langsung terbaca dengan huruf
cadangan sebelum berkasnya siap.

Keempat pengaturan bergambar — logo, foto halaman depan, foto kepala sekolah,
dan bagan struktur organisasi — kini **diunggah** dari menu Pengaturan.
Sebelumnya isinya berupa kotak teks berisi nama berkas, padahal tidak ada cara
mengunggah berkasnya lewat aplikasi, sehingga keduanya tidak pernah dapat
dipakai.

Halaman yang naskahnya belum dikirim sekolah tidak ditampilkan sebagai halaman
kosong dan tidak diisi karangan: yang tampil adalah keterangan bahwa naskahnya
belum tersedia, beserta nama menu tempat naskahnya diisi.

### G. Pemeriksaan NISN dan NIK

Yang perlu diluruskan lebih dulu: sistem ini **tidak** mencocokkan NISN maupun
NIK ke basis data pemerintah, dan tidak pernah mengaku begitu.

- NIK hanya dapat diperiksa ke Dukcapil, dan aksesnya diberikan lewat
  perjanjian kerja sama resmi, bukan lewat alamat API terbuka.
- NISN dapat dicari satu per satu di <https://nisn.data.kemdikbud.go.id>,
  tetapi laman itu tidak menyediakan API yang boleh dipakai program lain.
- **PDDIKTI bukan sumber yang tepat**, karena isinya data pendidikan tinggi.
  Untuk jenjang SMA, sumbernya Dapodik beserta referensi NISN-nya.

Yang dikerjakan sistem adalah pemeriksaan **struktur** beserta **pencocokan
silang** dengan isian lain pada formulir yang sama. Hasilnya bukan "NIK ini
benar milik orang tersebut", melainkan "NIK ini tidak mungkin benar, dan
inilah bagian yang salahnya". Itu sudah menangkap kesalahan yang paling sering
terjadi: satu angka tertukar, digit kurang, atau nomor NISN diketik pada kolom
NIK.

NIK terdiri atas 16 angka yang isinya berarti:

| Angka | Arti |
|---|---|
| 1–2 | Kode provinsi. Kode di luar 38 provinsi yang ada pasti salah ketik |
| 3–4 | Kode kabupaten atau kota, tidak pernah 00 |
| 5–6 | Kode kecamatan, tidak pernah 00 |
| 7–8 | Tanggal lahir, **ditambah 40 bila perempuan** |
| 9–10 | Bulan lahir |
| 11–12 | Dua angka terakhir tahun lahir |
| 13–16 | Nomor urut, tidak pernah 0000 |

Bagian tanggal dan penanda perempuan itulah yang membuat pencocokan silang
mungkin, karena tanggal lahir dan jenis kelamin sudah diisi pendaftar di kolom
lain. Yang paling berguna: **kolom yang disalahkan dipilih sesuai bagian yang
bertentangan.** Bila tanggal dan bulannya cocok dengan NIK tetapi tahunnya
berbeda, yang ditandai adalah kolom Tanggal lahir beserta tahun yang terbaca
dari NIK, bukan kolom NIK yang sebenarnya sudah benar.

Contoh pesannya:

```
NIK ini memuat tanggal lahir 15 Mei 2011, sedangkan tanggal lahir yang
Anda isi 20 Mei 2011. Salah satu di antaranya keliru.

Dua angka pertama NIK adalah kode provinsi, dan 99 bukan kode provinsi
yang ada. Periksa kembali angka pertama NIK Anda.

NIK ini menunjukkan jenis kelamin perempuan, sedangkan yang Anda pilih
laki-laki. Pada NIK perempuan, tanggal lahirnya ditambah 40.

Yang Anda tulis 16 angka, itu panjang NIK. NISN terdiri atas 10 angka
dan tercantum pada rapor atau ijazah SMP.
```

Pemeriksaannya berjalan **saat pendaftar mengetik**, bukan hanya setelah
tombol kirim ditekan: di bawah kolomnya muncul satu baris keterangan yang
menghitung angka yang masih kurang, lalu berubah menjadi keterangan hijau
`NIK terbaca Banten, 15 Mei 2011.` begitu isinya cocok. Aturan yang sama
dijalankan ulang di backend, karena pemeriksaan di peramban tidak pernah
menjadi satu-satunya penjaga.

**NISN wajib diisi, dan tiga angka pertamanya harus sama dengan tiga angka
terakhir tahun lahir.** Aturan kedua itu semula hanya peringatan, dengan alasan
yang masih benar: penomorannya kebiasaan, bukan aturan yang mengikat, dan ada
NISN sah yang tidak mengikutinya. Tetapi sebagai peringatan ia membiarkan nomor
karangan lewat — `0000000098` diterima apa adanya: sepuluh angka, bukan nol
semuanya, jadi tidak ada satu pun aturan yang menolaknya — padahal nomor yang
dikarang jauh lebih sering daripada NISN sah yang menyimpang dari kebiasaan
penomorannya.

Konsekuensinya diterima dengan sadar: pendaftar yang NISN aslinya memang tidak
mengikuti kebiasaan itu **tidak dapat mengirim formulir sendiri**. Karena itu
pesan galatnya wajib menyebutkan jalan keluarnya — "bila keduanya sudah sesuai
rapor, hubungi panitia lewat halaman Kontak agar dicatat manual". Tanpa kalimat
itu, pendaftar yang datanya benar akan mengira dirinya yang salah.

Yang tetap **tidak** dapat dikerjakan: memastikan NISN-nya benar-benar ada dan
benar-benar milik pendaftar. Laman NISN Kemendikbud tidak menyediakan API, dan
Dapodik hanya terbuka bagi sekolah lewat akunnya sendiri. Kepastian itu tetap
harus datang dari panitia yang mencocokkan nomor pada rapor atau ijazah SMP
yang diunggah pendaftar — dan itulah sebabnya berkas itu diminta.

### H. Dukungan tujuan "meningkatkan efektivitas promosi"

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

### I. Bilah informasi berjalan

Di paling atas setiap halaman publik ada bilah berisi **tiga kabar yang
berjalan**, dan ketiganya diambil dari basis data — tidak satu pun ditulis di
dalam kode:

1. Keadaan PPDB beserta tanggalnya: sedang dibuka sampai kapan, atau dibuka
   mulai kapan.
2. Sisa kuota terhadap kuota yang disediakan, dihitung dari pendaftar yang
   aktif.
3. Pengumuman terbaru yang sudah diterbitkan sekolah; bila belum ada berita
   yang terbit, gantinya tanggal pengumuman hasil seleksi.

Kabar yang datanya belum ada **dibuang** dari daftar, bukan ditulis setengah
jadi, dan bila ketiganya tidak ada bilahnya tidak muncul sama sekali.

Tulisan berjalan itu bentuk yang mudah disalahgunakan: ia bergerak, dan yang
bergerak menarik mata dari isi halaman. Karena itu ada tiga pembatasnya.
Gerakannya **berhenti** saat penunjuk tetikus atau fokus papan tuntas berada
di atasnya, supaya kalimat yang sedang dibaca tidak kabur. Pada peramban yang
disetel mengurangi gerak (`prefers-reduced-motion`), gerakannya **dimatikan**
dan bilahnya menjadi daftar yang dapat digulir sendiri — bukan dipotong. Dan
seluruh kabar itu juga tetap ada di halamannya masing-masing, jadi tidak ada
satu pun informasi yang HANYA dapat dibaca dari bilah berjalan.

Daftarnya ditulis dua kali. Salinan kedua diberi `aria-hidden` dan hanya
berguna untuk menyambung gerakannya: begitu salinan pertama habis, yang kedua
sudah berada di tempatnya sehingga tidak ada jeda kosong, lalu geserannya
kembali ke nol tanpa kelihatan melompat. Saat gerakannya dimatikan, salinan
kedua ikut disembunyikan supaya tidak menjadi pengulangan yang membingungkan.

Sorotan beranda juga mendapat **satu kalimat pengantar yang selalu tampil**,
karena ketika semboyan sekolah belum dikirim bagian itu hanya berisi lambang,
nama, dan tombol. Kalimatnya sengaja menerangkan apa yang ada di situs ini,
bukan memuji sekolahnya: kalimat tentang mutu sekolah hanya boleh datang dari
sekolah sendiri, dan tempatnya sudah disediakan pada semboyan dan bagian
keunggulan.

### J. Sambutan kepala sekolah di beranda

Beranda memuat sambutan kepala sekolah dalam bentuk **ringkas**, tepat sesudah
bilah keadaan PPDB: potret kecil, nama, jabatan, satu paragraf pertama
naskahnya, dan tautan ke yang utuh. Yang lengkap tetap di halaman Profil
Sekolah — potret besar, naskah penuh, dan semboyan berhuruf tulisan tangan.
Menyalin kartu besarnya ke beranda hanya membuat pengunjung membaca hal yang
sama dua kali.

**Bagian ini tidak muncul selama sekolah belum mengirim apa pun.** Di halaman
Profil, kerangka kosong beserta keterangannya memang berguna: panitia melihat
sendiri bahan apa yang masih ditunggu. Di beranda tidak — yang membukanya
orang tua yang sedang menimbang sekolah, dan kerangka foto kosong di halaman
depan membuat sekolahnya tampak belum siap. Jadi bagiannya terbuka begitu
**ada** yang bisa ditampilkan (nama, foto, atau naskahnya), dan sebelum itu
tidak ada sama sekali.

Pada pemasangan sekolah sekarang ketiganya masih kosong, jadi bagian ini belum
tampil. Ia akan muncul sendiri begitu salah satunya diisi lewat menu
Pengaturan — tidak ada kode yang perlu diubah.

### K. Alur masalah dan jawabannya di beranda

Tepat sebelum ajakan mendaftar, beranda memuat tiga baris berpasangan: satu
keadaan yang biasa terjadi pada pendaftaran berkas kertas, dan di sebelahnya
apa yang dikerjakan sistem ini terhadap keadaan itu, beserta tautan supaya
pembaca dapat memeriksanya sendiri.

| Keadaan | Jawaban sistem | Tautan |
|---|---|---|
| Harus datang lebih dulu hanya untuk menanyakan jadwal, syarat, dan biaya | Semuanya terbuka di halaman Informasi PPDB | `/ppdb` |
| Berkas difotokopi berkali-kali, yang kurang baru diketahui di meja panitia | Dokumen diunggah dari ponsel, dan formulirnya menolak isian serta berkas yang kurang sebelum apa pun terkirim | `/ppdb/daftar` |
| Berkas sudah diserahkan, tidak ada cara mengetahui sudah diperiksa atau belum | Nomor registrasi terbit seketika; keadaan verifikasi dapat dilihat sendiri dengan nomor itu beserta tanggal lahir | `/ppdb/cek` |

Dua hal dijaga di bagian ini. Kalimat keadaannya **tentang cara manual, bukan
tentang SMA IMTEK** — tidak ada tuduhan bahwa sekolah ini pernah begitu. Dan
kalimat jawabannya menyebut perilaku yang benar-benar ada di sistem ini dan
dapat dibuktikan dengan membuka tautannya; bukan janji, dan bukan penilaian
mutu.

Keadaannya ditulis redup dan bernomor `01`–`03`, **tanpa tanda silang merah**.
Tanda silang akan membuatnya terbaca sebagai galat, padahal ia cuma keadaan
yang sudah biasa. Yang berikon centang hanya jawabannya.

Polanya diambil dari rancangan yang dikirim user — bagian `PROBLEM` pada satu
halaman produk — dan itu **satu-satunya bagian rancangan itu yang dipakai**.
Sisanya bergantung bahan yang belum dimiliki sekolah: foto orang hasil studio,
tangkapan antarmuka produk, dan baris logo "dipercaya oleh 123 merek" yang
tidak boleh dikarang.

### L. Beranda mendahulukan profil sekolah

Beranda semula dibuka dengan kartu putih besar berisi kuota PPDB, jumlah
pendaftar, sisa kuota, dan tanggal penutupan. Angka itu menjawab pertanyaan
orang yang **sudah** memutuskan mendaftar. Orang tua yang baru mencari sekolah
menanyakan hal lain lebih dulu: sekolahnya seperti apa, apa yang ditawarkan,
sebagus apa. Karena judul PkM ini tentang **promosi**, urutannya dibalik.

Urutan beranda sekarang:

1. **Sorotan sekolah** — nama, status, akreditasi, NPSN, semboyan, letak, foto
   gedung sekolah, dan tiga angka yang bisa diperiksa (jumlah peminatan,
   jumlah fasilitas, peringkat akreditasi). Tombol utamanya "Kenali Sekolah
   Kami", bukan "Daftar".
2. **Bilah keadaan PPDB** — satu baris: dibuka atau belum, tahun ajaran,
   tanggal penutupan, sisa kuota, beserta tombol Daftar dan Cek Status.
   Informasinya tidak hilang, hanya tidak lagi mengambil alih bagian atas.
3. **Yang Ditawarkan Sekolah Ini** — alasan memilih sekolah ini.
4. **Peminatan**, **Fasilitas**, **Catatan Prestasi**, **Berita**.
5. **Ajakan mendaftar** di ujung halaman.

Isi bagian keunggulan berasal dari pengaturan `keunggulan` (migrasi 005), satu
baris satu poin, diisi lewat menu Pengaturan di panel admin. **Tidak ada satu
kalimat pun tentang mutu sekolah yang ditulis di dalam kode.** Selama poinnya
masih bertanda `[kurung siku]`, poin itu tidak tampil; bila seluruhnya belum
diisi, bagiannya tidak ada sama sekali. Penandanya diperiksa **per baris**,
sehingga sekolah dapat mengisi sebagian dulu — sebelumnya pemeriksaan
dilakukan atas seluruh nilai sekaligus, dan nilai yang barisnya sebagian sudah
terisi tetap terbaca kosong karena masih diawali `[` dan diakhiri `]`.

Bagian **Catatan Prestasi** bukan klaim, melainkan berita berkategori
`Prestasi` yang memang sudah dicatat sekolah. Kosong berarti bagiannya tidak
muncul.

Jumlah kartu di beranda ditentukan isi basis data, bukan kode, sehingga baris
terakhirnya bisa tersisa satu kartu sendirian beserta ruang kosong selebar dua
kartu. `kelasKartuAkhir()` di `komponen/Bagian.tsx` melebarkan kartu terakhir
supaya barisnya habis, pada kedua ambang layar sekaligus. Dipakai bagian
keunggulan, peminatan, prestasi, dan kartu halaman turunan.

### M. Tautan WhatsApp beserta pesan bawaannya

Tautan `wa.me` ada di lima tempat: bilah atas, footer, halaman Kontak, tombol
bantuan melayang, dan panel pesan panitia. Empat di antaranya dulu mengarah ke
`wa.me` **tanpa pesan apa pun**, jadi yang membukanya menghadap ruang obrolan
kosong lalu harus menyusun sendiri pertanyaannya — dan sebagian akan
menutupnya begitu saja. Sekarang semuanya lewat `tautanWa()` di
`lib/format.ts`, dengan pesan yang sudah terisi:

- Pengunjung: "Assalamualaikum, saya ingin bertanya tentang PPDB
  {nama sekolah}."
- Panitia yang membalas dari panel pesan: menyebut subjek pertanyaannya,
  supaya penanya tahu balasan ini untuk yang mana — panitia sering membalas
  berhari-hari sesudah pertanyaannya masuk.

Nomor yang belum diisi membuat `tautanWa()` mengembalikan string kosong, dan
pemanggilnya menyembunyikan tombolnya. **Selama pengaturan Nomor WhatsApp
panitia masih kosong, seluruh tombol WhatsApp tidak muncul** — tombol yang
menuju entah ke mana lebih buruk daripada tombol yang tidak ada. Nomor telepon
sekolah tidak dipakai sebagai gantinya, karena nomornya nomor kabel yang tidak
punya WhatsApp.

### N. Lencana status

Seluruh status dalam sistem ini, baik status pendaftar, keadaan PPDB, peran
petugas, maupun keadaan notifikasi, memakai satu komponen yang sama:
`komponen/Bagian.tsx`. Bentuknya isian warna **padat** dengan tulisan putih
huruf kapital, tanpa garis tepi dan tanpa sudut bulat penuh.

Tiga hal dijaga di sana:

1. **Warnanya padat, tanpa transparansi.** Latar setengah tembus membuat
   warnanya berubah mengikuti apa pun yang ada di belakangnya, dan itu yang
   membuat lencananya terlihat mengambang.
2. **Tulisannya benar-benar di tengah**, dengan `inline-flex` beserta
   `leading-none` supaya tinggi barisnya tidak menggeser tulisan ke atas.
   Diukur pada pengujian: sisa ruang di atas dan di bawah tulisan harus sama.
3. **Warnanya dipilih lewat nama**, bukan lewat gabungan kelas yang dikirim
   setiap halaman. Sebelumnya sudah terkumpul sembilan variasi kelas yang
   seharusnya sama, dan bentuk statusnya menyimpang antar halaman.

| Nama | Dipakai untuk |
|---|---|
| `biru` | Terverifikasi, peran Admin |
| `hijau` | Diterima, Terkirim, PPDB dibuka, Tampil |
| `merah` | Ditolak, Gagal, dokumen Wajib |
| `emas` | Cadangan, Menunggu, belum terisi |
| `abu` | Menunggu Verifikasi, Dibatalkan, PPDB ditutup |
| `terang`, `putih` | Label yang bukan status: kategori berita, tahap biaya |

Seluruh warnanya lulus rasio kontras 4,5:1 terhadap tulisan putih.

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

## Basis Data (21 tabel)

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
| `biaya` | Pos rincian biaya per tahap pembayaran |
| `soal` | Bank soal pilihan ganda |
| `paket_ujian` | Jadwal tes seleksi beserta durasi dan nilai minimum |
| `sesi_ujian` | Satu sesi per peserta per paket, beserta nilainya |
| `sesi_soal` | Susunan soal yang dibekukan per sesi, beserta jawabannya |
| `notifikasi` | Catatan pesan WhatsApp beserta keadaan pengirimannya |
| `faq` | Tanya jawab beserta kategori dan penanda sorot |
| `halaman` | Halaman bernaskah panjang: Kurikulum, OSIS, Pendidikan Karakter |
| `tenaga_pendidik` | Guru dan tenaga kependidikan beserta jabatannya |
| `agenda` | Kalender akademik; satu baris boleh satu hari atau satu rentang |
| `kegiatan_siswa` | Ekstrakurikuler, kegiatan OSIS, dan pembinaan |
| `pustaka` | Katalog perpustakaan digital, berupa berkas atau tautan luar |

Isinya dapat ditengok dengan **DBeaver**: buat sambungan PostgreSQL baru
memakai host, porta, nama basis data, pengguna, dan sandi yang sama dengan
`backend/.env`.

Skema diterapkan otomatis saat backend pertama kali dijalankan. Basis data
yang sudah berisi tabelnya dikenali dan **dilewati**, bukan ditimpa.

Pemisah perintah pada pelaksana migrasi mengenali komentar `--`. Tanpa itu,
satu tanda titik koma di dalam komentar memotong perintah SQL di tengah jalan,
dan PostgreSQL menolaknya dengan `syntax error at end of input` yang sama
sekali tidak menyebut komentar.

Tiga keputusan skema dicatat di kepala `backend/migrations/001_skema.sql`:
pilihan yang terbatas ditulis sebagai `varchar` beserta `CHECK` dan bukan
`enum`, karena menambah satu pilihan pada `enum` PostgreSQL memerlukan
`ALTER TYPE`; kolom `updated_at` diisi oleh satu pemicu `plpgsql` bersama,
karena PostgreSQL tidak mengenal `ON UPDATE CURRENT_TIMESTAMP`; dan seluruh
nama ditulis huruf kecil, karena PostgreSQL melipat nama tanpa tanda kutip
menjadi huruf kecil.

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

Diuji pada Go 1.27, Node.js 24, dan PostgreSQL 17.4.

**Backend, 151 pemeriksaan terhadap API yang berjalan**, ditambah pemeriksaan
khusus fitur baru:

- Pendaftaran lengkap dengan unggahan → nomor registrasi terbit, data dan
  berkas tersimpan.
- Validasi terbukti menolak: kolom wajib kosong, pendaftaran ganda dengan nama
  dan tanggal lahir sama, jalur Prestasi tanpa sertifikat, usia di luar 11–25
  tahun, email tidak valid, nilai di luar 0–100, dan pilihan sumber informasi
  yang tidak dikenal.
- **NISN dan NIK, 26 pemeriksaan satuan (`go test ./...`) dan 19 pemeriksaan
  lewat API**: struktur NIK yang tidak mungkin, pencocokan silang dengan
  tanggal lahir beserta jenis kelamin, NIK yang diketik pada kolom NISN, dan
  yang terpenting, **kolom yang disalahkan harus tepat**. Galat yang menempel
  pada kolom yang salah sama tidak bergunanya dengan tidak ada pemeriksaan.
  Ditambah 11 pemeriksaan di peramban untuk keterangan yang muncul saat
  pendaftar mengetik.
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
- Bukti pendaftaran PDF terbit untuk pendaftar dan untuk panitia, dan
  permintaan dengan tanggal lahir yang salah tertolak.
- Dua belas pendaftaran yang dikirim serentak menghasilkan dua belas nomor
  registrasi yang berurutan tanpa kembar maupun lompatan, karena penomorannya
  dikunci dengan `pg_advisory_xact_lock`.

**Frontend, 73 pemeriksaan di peramban sungguhan (Chrome, protokol DevTools):**

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
- Jendela Radix: fokus terkurung di dalamnya, latar belakang diberi
  `aria-hidden`, gulir halaman terkunci, dan tombol Escape menutupnya.
- Gulir halus Lenis aktif di halaman publik dan tidak dipasang di panel.
- **Lencana status, 22 pemeriksaan**: tidak ada satu pun yang berlatar
  setengah tembus, tulisannya putih, tanpa garis tepi, sudutnya tidak bulat
  penuh, dan jarak sisa di atas-bawah serta kiri-kanan tulisan **diukur** dan
  harus sama, karena "di tengah" tidak dapat dipastikan dengan melihat saja.

**Menu Profil Sekolah, Akademik, dan Kesiswaan, 70 pemeriksaan:**

- Menu bertingkat: empat kelompok tampil di layar lebar, panelnya terbuka
  saat diklik, `aria-expanded` ikut berubah, Escape menutupnya, dan bilahnya
  tidak meluber pada 1440px.
- Berpindah halaman menutup menunya; sebelumnya panel turunan dapat
  menggantung di atas halaman baru.
- Pada 390px menunya berubah menjadi daftar yang dapat dilipat, dan keenam
  anak menu Profil Sekolah tetap dapat dijangkau.
- "Sarana dan Prasarana" terbukti menunjuk halaman Fasilitas yang sudah ada,
  bukan halaman kedua berisi data yang sama.
- Jejak lokasi beserta lima tautan sekelompok muncul di setiap halaman
  turunan, dan halaman yang sedang dibuka ditandai `aria-current`.
- Kerangka foto kepala sekolah berukuran 3:4 tampil selama fotonya belum ada,
  lalu diganti fotonya setelah diunggah dari panel.
- Naskah Kurikulum yang diisi dari panel langsung tampil di halaman publik,
  dipecah menjadi paragraf, dan penanda "menunggu naskah" hilang.
- Data tenaga pendidik tersimpan beserta fotonya; yang tanpa foto memakai
  inisial nama, bukan kotak kosong.
- Agenda dengan tanggal selesai lebih awal ditolak beserta pesan yang
  menjelaskan masalahnya, lalu yang sah tersimpan dan tampil pada kalender
  publik dengan rentang tanggal yang tidak mengulang nama bulan.
- Keempat pengaturan bergambar terunggah dari panel, dan kunci gambarnya
  tidak lagi muncul sebagai kotak teks berisi nama berkas.
- Halaman yang naskahnya belum dikirim sekolah tetap menampilkan keterangan,
  dan kerangka bertanda kurung siku tidak pernah bocor ke pengunjung.

**Tes seleksi, notifikasi, dan biaya, 28 pemeriksaan:**

- Alur ujian penuh di peramban sungguhan: masuk, penghitung mundur berjalan,
  lima jawaban tersimpan, ujian diselesaikan, nilai keluar, dan nilai itu ikut
  tampil di Cek Status.
- Kunci jawaban terbukti tidak ada di halaman yang diterima peserta.
- Token peserta yang dipakai membuka panel panitia tertolak dengan 403.
- Mulai ujian tertolak bila berkasnya belum diverifikasi, bila tanggal
  lahirnya salah, bila jadwalnya belum dibuka, dan bila sesinya sudah selesai.
- Jawaban tertolak sesudah sesi ditutup, dan soal dari sesi lain tertolak.
- Paket yang meminta lebih banyak soal daripada bank soal aktif tertolak saat
  hendak diaktifkan, beserta angka yang tersedia.
- Kunci jawaban yang menunjuk pilihan kosong tertolak, di API maupun di panel.
- Notifikasi tersusun sendiri dari perubahan status, tidak dapat dikirim dua
  kali, dan tidak dapat dibatalkan setelah terkirim.
- Kedua jalur pengiriman diuji: tanpa gateway menghasilkan tautan wa.me berisi
  pesan lengkap, dengan gateway pesannya benar-benar diterima gateway beserta
  token Bearer-nya, dan penolakan gateway tercatat sebagai Gagal beserta
  keterangannya.
- Kartu peserta terbit sebagai PDF berisi barcode dan kode QR.

**Demo statis, 203 pemeriksaan:** seluruh alur pendaftaran sampai verifikasi,
pengelolaan isi situs, batas hak akses operator, tes seleksi dari masuk sampai
nilai keluar, rincian biaya beserta totalnya, keempat menu panel baru, dan
tombol PDF yang menjelaskan bahwa berkasnya dibuat oleh server, penunjuk
alur, tombol bantuan melayang beserta penanda posisinya, dan tanya jawab
lengkap dengan penyaring serta pencariannya.

Termasuk 8 pemeriksaan bagian sambutan: kedua gambar pengaturan benar-benar
tersisip sebagai data URI dan termuat, foto gedungnya dipudarkan, semboyannya
memakai huruf Caveat yang berkasnya terbukti termuat, dan naskah beserta nama
kepala sekolahnya tampil. Gambar pengaturan tidak dapat diperlakukan seperti
gambar berita dan galeri yang digambar ulang kode demo: gambar ini berada di
dalam tangkapan markup yang dipasang apa adanya, jadi tanpa penyisipan itu
yang tampil hanya ikon gambar rusak.

Termasuk 6 pemeriksaan urutan kolom pada tabel pendaftar: barisnya digambar
kode demo sedangkan kepala kolomnya berasal dari tangkapan markup, jadi bila
keduanya tidak sejalan, statusnya muncul di kolom yang salah tanpa satu pun
galat yang menandainya.

Termasuk 30 pemeriksaan lencana status pada demo. Itu perlu berdiri sendiri
karena demo menggambar sebagian lencananya dengan kodenya sendiri, bukan hanya
menampilkan tangkapan markup: pernah terjadi tangkapannya sudah benar tetapi
kode demo menimpanya dengan pil pastel bergaya lama, dan pemeriksaan yang hanya
membaca tangkapan tidak akan melihatnya.

Termasuk 53 pemeriksaan untuk menu bertingkat: keempat kelompok terbuka dan
tertutup dengan Escape, panelnya tidak menggantung setelah pindah halaman,
ketujuh belas halaman turunan terbuka dan berisi, jejak lokasi beserta tautan
sekelompok bekerja, menu ponsel dapat dilipat, kelima menu panel baru memuat
barisnya, dan sidebar panel tampil dalam lima kelompok.

Pada demo, tes seleksi dijalankan di peramban pengunjung, jadi waktu dan kunci
jawabannya tidak terlindungi seperti pada aplikasi sebenarnya. Hal yang sama
berlaku untuk unggah gambar sekolah: pada aplikasi berkasnya disimpan server,
sedangkan di demo tombolnya menjelaskan bahwa berkasnya tidak dapat disimpan.
Kedua batasan itu disebutkan, bukan disembunyikan.

Backend bersih dari `go vet` dan `gofmt`; frontend bersih dari `eslint` dan
`tsc`.

---

## Lisensi

Kode sumber ini dirilis di bawah [MIT License](LICENSE). Bebas dipakai,
diubah, dan disebarkan, dengan syarat pemberitahuan hak cipta tetap disertakan.

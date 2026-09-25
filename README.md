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

### Memasang di server sungguhan

Langkah lengkapnya di [`deploy/README.md`](deploy/README.md), beserta berkas
yang siap dipakai: dua unit systemd, Caddyfile untuk HTTPS otomatis, serta
skrip cadangan beserta timer-nya.

Yang paling sering terlewat dan membuat pemasangan pertama gagal: pada VPS
2 GB, **swap wajib dibuat lebih dulu**. `next build` memuncak di 1.671 MB
(terukur, bukan dikira), dan tanpa swap prosesnya dihentikan kernel di tengah
jalan. Node.js juga tidak boleh dari `apt install nodejs`, sebab Ubuntu 24.04
membawa Node 18 sedangkan Next 16 menuntut yang lebih baru.

Berkas systemd dan Caddyfile itu belum pernah dijalankan pada server
sungguhan; ditulis dari pengukuran di komputer pengembang. Yang sudah diuji
sungguhan `cadangan.sh`, termasuk memulihkan hasilnya ke basis data kosong dan
memeriksa isinya kembali utuh.

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
| Tenaga Pendidik | `/profil/tenaga-pendidik` | Guru dan tenaga kependidikan beserta angka ringkas, pencarian, dan penyaring kategori serta mata pelajaran |
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


**Isian dan berkas yang wajib.** Awalnya hanya nama, jenis kelamin, tempat
dan tanggal lahir, agama, alamat, nomor HP, asal sekolah, nama ayah dan ibu,
serta jalur yang diwajibkan. Sisanya opsional — dan itu menghasilkan baris
pendaftar yang **tidak dapat diverifikasi panitia**: tanpa NISN dan NIK tidak
ada yang bisa dicocokkan ke data Dapodik maupun dokumen kependudukan; tanpa
kelurahan sampai kode pos, jalur zonasi tidak dapat dinilai dan surat
panggilan tidak dapat dikirim; tanpa NPSN dan tahun lulus, pendaftar tidak
dapat dicocokkan ke sekolah asalnya.

Yang kini wajib, di luar daftar awal itu:

| Isian | Aturan tambahan |
|---|---|
| NISN | 10 angka, tiga angka pertama = tiga angka terakhir tahun lahir |
| NIK | 16 angka, dicocokkan ke tanggal lahir dan jenis kelamin |
| Kelurahan/Desa, Kecamatan, Kota/Kabupaten, Provinsi | — |
| Kode pos | lima angka |
| NPSN sekolah asal | delapan angka |
| Alamat sekolah asal | — |
| Tahun lulus | 2000–2100 |
| Akta Kelahiran (berkas) | jpg, png, atau pdf |
| Rapor semester akhir (berkas) | jpg, png, atau pdf |

Sertifikat prestasi tetap opsional kecuali jalur Prestasi dipilih, dan surel
tetap opsional karena tidak semua pendaftar memilikinya. Aturannya dipasang di
**tiga tempat** supaya tidak ada yang menerima apa yang lain tolak: backend
(`handler_pendaftar.go`), formulir di peramban (`FormulirPpdb.tsx`), dan
pemeriksaan formulir demo (`demo-baru/js/05-ppdb.js`).
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
| Tenaga Pendidik | `/admin/tenaga` | Guru dan tenaga kependidikan beserta foto, jabatan, mata pelajaran, dan kelas yang diampunya sebagai wali kelas |
| Kalender Akademik | `/admin/kalender` | Tanggal kegiatan, ujian, hari libur, dan jadwal PPDB; inilah satu-satunya sumber isi halaman publiknya |
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

### Halaman bernaskah panjang: OSIS, Kurikulum, Pendidikan Karakter

Ketiganya satu berkas, `halaman/[slug]/page.tsx`, karena sekolah dapat
menambah halaman profil baru dari panel admin tanpa menunggu kodenya diubah.
Susunannya: kartu pembuka berilustrasi, daftar isi halaman, lalu naskahnya.

**Sub-menu di dalam halaman diambil dari naskahnya sendiri.** Paragraf yang
diawali `## ` menjadi judul bagian; dari judul-judul itulah deretan kartu di
bawah kartu pembuka disusun, dan tiap kartu menaut ke judulnya. Jadi tidak
pernah ada kartu yang menuju bagian yang belum ditulis sekolah, dan begitu
sekolah menambah satu bagian, kartunya muncul sendiri. Naskah tanpa penanda
`## ` tetap tampil apa adanya sebagai deretan paragraf biasa, sehingga halaman
yang sudah ada tidak berubah.

Rancangan acuan yang dikirim menampilkan empat kartu bernama tetap — Profil
OSIS, Program Kerja, Galeri Kegiatan, Struktur Organisasi. Keempatnya TIDAK
ditulis di dalam kode. Menuliskannya berarti membuat empat halaman baru yang
seluruhnya kosong, atau empat tautan yang menuju entah ke mana, sedangkan
naskah OSIS-nya sendiri belum dikirim sekolah. Dengan penanda `## `, panitia
yang menentukan bagiannya, lewat satu kotak teks yang sudah ada di panel
admin.

**Penanda kartunya nomor urut, bukan ikon per bagian.** Judul bagiannya
ditulis sekolah dan bisa apa saja, jadi ikon yang dipilih di sini pasti
sekadar tempelan pada sebagian judul. Nomor selalu benar, dan sekaligus
menerangkan urutan bacanya.

**Ilustrasinya ditempatkan mutlak di separuh kanan kartu dengan tepi kiri
dipudarkan lewat mask**, bukan sebagai kolom di samping naskah seperti pada
halaman Tenaga Pendidik dan Kalender. Sebabnya gambar ini berlatar penuh —
langit bergradasi, gedung sekolah, pepohonan. Sebagai kolom, tepi kirinya akan
berupa garis tegak tempat langit berhenti mendadak, dan itu terbaca sebagai
gambar yang ditempelkan. Di layar sempit gambarnya tidak ditumpuk di belakang
naskah — naskah di atas gambar seramai itu sulit dibaca — melainkan turun
menjadi pita setinggi 112 piksel di dasar kartu.

Berkasnya **JPEG**, berbeda dengan tiga ilustrasi sebelumnya yang PNG tembus
pandang. Latarnya bagian dari gambarnya, bukan bidang putih yang perlu
dibuang: perambatan dari tepi akan merusaknya, dan median cut ke 64 warna akan
membuat langitnya bergaris-garis. Karena tidak ada bagian tembus pandang yang
perlu dijaga, JPEG jauh lebih kecil untuk gambar bergradasi seperti ini — 1,6
MB menjadi 98 KB pada 1400×517. Pengubahannya lewat kanvas Chrome, sebab di
mesin ini tidak ada Pillow maupun ImageMagick.

**Halaman dapat menampilkan foto dokumentasi dari menu Galeri** (migrasi 012).
Yang ditambahkan hanya PENUNJUKNYA: kolom `galeri_kategori`, berisi nama
kategori galeri yang fotonya ditampilkan halaman itu. Fotonya sendiri tetap di
tabel `galeri` yang sudah ada beserta menu unggahnya, jadi satu foto yang
diunggah panitia muncul di dua tempat sekaligus — halaman Galeri dan halaman
ini. Tempat penyimpanan foto yang kedua hanya akan membuat panitia harus
mengingat foto mana diunggah ke mana, dan membuat halaman Galeri kehilangan
foto yang sebenarnya dokumentasi kegiatan sekolah juga.

Ditulis sebagai kolom, **bukan dicocokkan diam-diam dengan judul halamannya**,
karena pencocokan diam-diam tidak terlihat oleh siapa pun: panitia tidak akan
tahu bahwa kategori galeri harus dinamai persis sama dengan judul halaman, dan
kalau satu hurufnya berbeda tidak ada yang menerangkan kenapa fotonya tidak
muncul. Sebagai kolom, ia tampil sebagai isian di formulir halaman beserta
keterangannya. Migrasinya mengarahkan halaman OSIS ke kategori `OSIS`;
halaman lain dibiarkan kosong, dan bagiannya tidak tampil.

Petak fotonya memakai komponen `PetakGaleri` yang sama dengan halaman Galeri,
termasuk tampilan besar saat diklik, jadi cara memakainya sama di kedua tempat
dan tidak ada penampil foto kedua yang harus dirawat sendiri. Penyaring
kategori di dalamnya tidak ditampilkan — daftar kategorinya dikirim kosong —
sebab di sini seluruh fotonya memang satu kategori. Penyaringan fotonya
dikerjakan di halaman, bukan lewat parameter kueri ke API, karena jawaban
`/api/galeri` dipakai bersama seluruh halaman publik dan disimpan cache 30
detik; menambah parameter berarti menyimpan satu salinan cache per halaman
untuk data yang sama.

Diuji pada basis data sekali pakai `uji_012` dengan empat foto contoh, tiga
berkategori OSIS dan satu berkategori lain: 7 pemeriksaan lulus — hanya yang
berkategori OSIS yang tampil, yang lain tidak ikut, penyaring kategorinya
tidak muncul, tampilan besarnya terbuka saat foto diklik, dan halaman
Kurikulum yang penunjuknya kosong memang tidak menampilkan bagian itu.

Sampai sekarang yang punya ilustrasi dua halaman: OSIS dan Pendidikan
Karakter. Keduanya berasal dari berkas `.svg` kiriman user yang isinya PNG
base64 berlatar penuh, dan keduanya diolah dengan cara yang sama — 1,6 MB
menjadi 98 KB pada 1400×517 untuk OSIS, dan 1,9 MB menjadi 126 KB pada
1400×473 untuk Pendidikan Karakter. Halaman Kurikulum belum punya, dan kartu
pembukanya tampil tanpa gambar.

Daftar ilustrasinya ditulis sebagai peta slug, **tidak ditebak dari nama
slug-nya**. Menebak berarti halaman baru yang ditambahkan sekolah akan
menunjuk gambar yang tidak ada dan berakhir sebagai kotak rusak; halaman yang
belum punya ilustrasi tampil dengan kartu pembuka tanpa gambar, dan itu
keadaan yang wajar.

**Halaman dapat memuat visi dan misi MILIKNYA SENDIRI** (migrasi 011). Halaman
OSIS perlu memuat visi misi OSIS, dan itu bukan visi misi sekolah: yang di
menu Pengaturan milik sekolah dan tampil pada halaman Profil Sekolah. Memakai
ulang yang itu berarti halaman OSIS menampilkan rumusan yang bukan miliknya.

Kolomnya ditaruh di tabel `halaman`, bukan sebagai pengaturan bernama
`osis_visi` dan `osis_misi`. Dua alasannya: halaman naskah dapat ditambah
sekolah sendiri, sehingga pengaturan bernama khusus OSIS tidak menolong begitu
besok mereka membuat halaman Pramuka atau Rohis yang juga punya rumusan
sendiri; dan panitia mengisinya di formulir yang sama dengan naskah
halamannya, bukan berpindah ke menu Pengaturan untuk satu bagian dari halaman
yang sedang dikerjakannya.

Keduanya tidak wajib. Kosong berarti bagiannya tidak tampil sama sekali — dan
itu keadaan yang benar bagi Kurikulum maupun Pendidikan Karakter. Halaman OSIS
diberi penanda `[kurung siku]` oleh migrasinya supaya panitia melihat bagian
itu ada dan tahu bentuk isinya, sedangkan pengunjung melihat keterangan "belum
tersedia", bukan kalimat karangan. Misinya ditulis satu baris satu poin,
mengikuti cara pengaturan `misi` dan `keunggulan` yang sudah ada.

`bacaIsianHalaman` sekalian diubah mengembalikan struct, bukan deretan nilai
berurutan. Sebelumnya delapan nilai, dan penambahan visi beserta misi akan
menjadikannya sepuluh; sepuluh nilai berurutan pada tiga tempat pemanggilan
hanya menunggu dua di antaranya tertukar, dan keduanya bertipe string sehingga
penyusun kode pun tidak akan menegur.

**Keadaan kosongnya dibuat mencolok dan berada di tengah**, bukan satu baris
miring di pojok kartu: pada halaman yang naskahnya belum ada, itulah seluruh
isi halamannya. Kalimatnya tetap diambil dari komponen `Menunggu` supaya
susunan katanya sama dengan seluruh halaman lain yang juga menunggu naskah
sekolah, ditambah tombol ke halaman Kontak bagi pengunjung yang memang butuh
keterangannya sekarang.

Diuji pada basis data sekali pakai `uji_osis` dengan naskah contoh berisi
empat bagian: 10 pemeriksaan lulus — jumlah kartunya, tautannya ke id judul
yang benar, labelnya sama dengan judul bagiannya, lebar kartu naskah sama
dengan kartu pembuka, guliran saat kartunya diklik, dan keadaan kosong pada
halaman Kurikulum yang naskahnya memang belum ada.

### Halaman Kalender Akademik

Susunannya: kartu pembuka berilustrasi, bilah penyaring, lalu dua kolom —
lajur waktu kegiatan di kiri, petak satu bulan beserta rincian harinya di
kanan.

**Pemilih tahun ajarannya TIDAK di kepala halaman.** Pada rancangan acuan ia
menempel di sebelah judul; di sini ia turun ke bilah penyaring tersendiri di
bawah kartu pembuka, bersama penyaring kategori, sehingga kepala halamannya
hanya berisi judul dan keterangannya.

**Tahun ajaran dihitung Juli sampai Juni, bukan Januari sampai Desember.**
Memakai tahun kalender begitu saja akan memotong satu tahun ajaran menjadi
dua: 20 Desember 2026 dan 5 Januari 2027 ada pada tahun ajaran yang sama,
2026/2027, dan libur semester satu yang melintasi pergantian tahun akan
terlempar ke tahun yang keliru. Pilihan tahunnya hanya memuat tahun ajaran
yang benar-benar ada isinya.

**Warnanya seragam, pembedanya bentuk ikon.** Rancangan acuan memberi tiap
kategori rona sendiri — biru, hijau, kuning, ungu, merah — pada ikon, titik
penanda tanggal, dan lencananya. Semuanya kini biru sekolah di atas biru
muda. Tetapi menyamakan warna tanpa pengganti berarti membuang pembedanya,
jadi tugas itu diambil alih **bentuk ikonnya**: bendera untuk Kegiatan,
lembar naskah untuk Ujian, matahari untuk Libur, formulir untuk PPDB, dan
sosok berkumpul untuk Rapat. Namanya tetap tertulis di sebelahnya, jadi
pembedanya tidak bergantung pada kemampuan membedakan bentuk kecil.

**Kegiatan berhari-hari menandai seluruh hari dalam rentangnya** pada petak
bulan, bukan hari mulainya saja — libur semester yang berjalan dua minggu
memang dua minggu, dan pengunjung yang mengetuk tanggal di tengah rentang itu
harus menemukan kegiatannya.

**Rincian harinya sudah terbuka sejak halaman dibuka**, pada hari ini bila ada
kegiatannya, kalau tidak pada kegiatan pertama bulan yang tampil. Kolom kanan
yang menunggu diketuk lebih dulu terbaca sebagai kotak kosong. Berpindah bulan
mengembalikannya ke bawaan bulan yang baru, sebab rincian milik bulan lalu di
sebelah petak bulan ini akan menyesatkan.

**Yang sudah berlangsung dipisah dan disembunyikan di balik tombol.** Pada
tahun ajaran yang sedang berjalan separuh daftarnya bisa sudah lewat, dan di
layar ponsel itu ratusan piksel gulir yang jarang dibaca. Halaman berisi 13
kegiatan turun dari 4.673 piksel menjadi 4.309 piksel di ponsel, dan dari
3.021 menjadi 2.599 piksel di layar lebar.

**Disusun untuk jempol.** Di ponsel petak bulannya naik ke atas lajur waktu
lewat `order` — ia ringkasan satu bulan dalam satu layar, sedangkan lajur
waktunya panjang. Tiap sel tanggal setinggi 44 piksel, ukuran sasaran sentuh
terkecil yang nyaman, dan tanggal tanpa kegiatan memang tidak dapat ditekan
sehingga tidak ada ketukan yang tidak berakibat apa-apa. Kolom tanggal pada
lajur waktu hilang di bawah ambang `sm` dan tanggalnya pindah ke dalam
kartunya: kolom selebar 6,5 rem memakan hampir sepertiga lebar layar ponsel.

**Gerak masuknya memakai MunculNaik yang sudah ada**, memudar naik begitu
tergulir sampai terlihat, dengan jeda bertingkat 0,05 detik yang dipatok
delapan baris — lebih dari itu, baris terbawah menunggu terlalu lama dan
terbaca sebagai halaman yang lambat. Yang dikirim server tetap terbaca utuh
bila JavaScript gagal dimuat, dan permintaan "kurangi gerakan" membatalkan
penyembunyiannya sama sekali; keduanya diperiksa ulang pada halaman ini.

**Tanggalnya diurai sendiri, bukan lewat `new Date(teks)`.** Bentuk
`"2026-05-01"` dibaca sebagai tengah malam UTC, sehingga di sebelah barat
Greenwich tanggalnya mundur satu hari — dan kalender yang meleset satu hari
lebih buruk daripada tidak ada kalender.

**Tidak ada satu tanggal pun yang ditulis di dalam kodenya.** Seluruh isinya
dari menu Kalender Akademik di panel admin. Bila sekolah belum mengisi apa
pun, petak bulannya tetap tergambar dan lajur waktunya menerangkan bahwa
isinya belum ada — bukan halaman kosong, dan bukan tanggal karangan. Keadaan
itulah yang tampil sekarang, karena tabel agenda di pemasangan sekolah masih
kosong.

Ilustrasinya datang dari user dalam bentuk yang sama dengan tiga sebelumnya:
berkas `.svg` yang isinya satu elemen `<image>` berisi PNG base64, 1536×1024.
Alatnya pun sama — perambatan dari tepi lalu median cut ke 64 warna, 988 KB
menjadi 61 KB, 1671×645.

### Halaman Tenaga Pendidik dan Kependidikan

Susunannya: kartu pembuka berilustrasi, empat angka ringkas, pencarian
beserta penyaringnya, lalu petak kartu satu orang per kartu.

**Kartu pembukanya memakai susunan yang sama dengan kartu Visi dan Misi** —
naskah di kolom kiri, ilustrasi setinggi kartunya di kolom kanan, menempel
tepi lewat margin negatif, `object-contain` dan `object-bottom`. Ilustrasinya
datang dari user dalam bentuk yang persis sama dengan dua sebelumnya: berkas
berakhiran `.svg` yang isinya ternyata satu elemen `<image>` berisi PNG
base64, 1536×1024, tanpa satu jalur vektor pun. Jadi alatnya pun sama —
perambatan dari tepi untuk membuang latar, lalu median cut ke 64 warna: 1,2 MB
menjadi 109 KB, 1487×709.

Latar putihnya hilang seluruhnya, sedangkan gedung sekolah, pepohonan, dan
awan di belakang sosoknya **tetap tinggal**. Itu disengaja: ambang perambatan
membuang yang pucat dan bersambung dengan tepi gambar, dan ketiganya berwarna
cukup pekat untuk bertahan. Yang diminta memang latarnya, yaitu kotak putih
yang akan menabrak gradasi kartunya — bukan isi gambarnya.

**Satu hal berbeda dari kartu Visi dan Misi: di layar sempit ilustrasinya
turun ke bawah naskah, tidak bertahan di samping.** Gambar ini berbanding sisi
2,1 sedangkan gambar visi 0,90. Dipaksa menjadi kolom samping pada lebar
ponsel, kolomnya hanya menyisakan seratusan piksel dan kelima wajahnya tidak
terbaca lagi. Di bawah naskah ia melebar penuh melewati padding kartu dan
tetap utuh.

**Empat angka ringkasnya satu warna, bukan empat.** Rancangan acuan yang
dikirim user memberi tiap angka warna sendiri — biru, hijau, kuning, ungu.
Itu diganti: empat warna berbeda membuat deretan ini terbaca sebagai empat hal
yang tidak berhubungan, padahal keempatnya satu tabel yang sama. Semuanya kini
biru sekolah di atas biru muda, dengan angka tebal berukuran besar sebagai
pembeda antar kartu.

**Angka "Wali Kelas" punya kolomnya sendiri (migrasi 009), tidak ditebak dari
tulisan pada kolom jabatan.** Mencocokkan kata "wali kelas" di dalam jabatan
akan meleset begitu sekolah menulisnya dengan cara lain — "Walikelas",
"Wali Kls X-1", atau menaruhnya di kolom keterangan — dan angka yang salah
pada halaman profil lebih buruk daripada tidak ada angka. Isi kolomnya nama
kelasnya, misalnya `X-1`, bukan ya/tidak, sehingga satu isian menjawab dua
hal sekaligus: siapa wali kelasnya dan kelas mana yang diampunya. Keduanya
tampil pada kartu orangnya. Kosong berarti bukan wali kelas — keadaan yang
wajar bagi kepala sekolah, guru BK, dan seluruh tenaga kependidikan.

**Gerak saat kursor diarahkan ke satu kartu sengaja kecil dan berjumlah
tiga:** kartunya naik lima piksel, fotonya membesar empat persen di dalam
bingkainya, dan garis emas di bawah namanya tumbuh dari kiri. Tiga gerak kecil
yang serempak terbaca sebagai satu tanggapan; satu gerak besar terbaca sebagai
kartunya melompat. Fotonya yang membesar, bukan kartunya, supaya jarak antar
kartu tidak ikut bergeser. Hanya berlaku pada peranti bertetikus (`@media
(hover: hover)`), sebab pada layar sentuh `:hover` menempel sesudah disentuh
dan tidak lepas.

Pengujiannya menemukan satu cacat yang tidak kelihatan mata: **menulis
`transform: none` pada keadaan diam saja tidak menghentikan apa pun**, karena
`.kartu-orang:hover` lebih spesifik daripada `.kartu-orang`. Jadi pengunjung
yang menyalakan "kurangi gerakan" tetap melihat kartunya naik. Keadaan
`:hover` kini ikut disebut di dalam blok `prefers-reduced-motion`, dan
`.gerak-kartu` yang sudah ada lebih dulu ternyata mengidap cacat yang sama,
jadi sekalian dibetulkan. Yang tersisa saat gerakan dikurangi hanya
perubahan bayangan — penanda tanpa gerak.

**Panjang halaman di ponsel ditahan oleh tiga hal.** Pencarian dan penyaringnya
menghemat gulir bagi pengunjung yang mencari satu nama; fotonya persegi di
layar sempit dan 3:4 mulai ambang `sm`; dan yang tampil sebelum tombolnya
ditekan dua belas di layar lebar tetapi delapan di ponsel. Pembedanya **CSS,
bukan JavaScript**: mengukur lebar layar lalu mengatur ulang jumlahnya sesudah
halaman terpasang akan membuat empat kartu berkedip hilang di depan mata,
sebab markup yang dikirim server sudah memuat dua belas. Dengan
`max-sm:hidden`, yang dikirim server tetap satu bentuk dan perambanlah yang
menyembunyikan kelebihannya sejak lukisan pertama. Halaman berisi 16 orang
turun dari 4.797 piksel menjadi 3.829 piksel, dan tidak ada gulir mendatar
pada 390 maupun 1280 piksel.

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

**Logonya dipakai di lencana pada bilah atas**, menggantikan dua huruf inisial
nama sekolah. Sebelumnya pengaturan `logo` memang sudah ada — tersedia di
panel admin dan ikut dikirim API publik — tetapi tidak dipakai satu tampilan
pun, jadi mengunggahnya tidak mengubah apa-apa. Kotaknya tetap 44×44 piksel
pada kedua keadaan supaya tata letak bilahnya tidak bergeser saat sekolah
mengunggah logonya, dan latar birunya hanya dipasang untuk inisial: logo SMA
IMTEK bergaris biru tua di atas latar tembus pandang, jadi di atas bidang biru
garisnya akan hilang.

Berkasnya berasal dari logo `.webp` 2048×2048 yang ada di repositori,
dijadikan PNG 256×256. Pengubahannya lewat kanvas Chrome, sebab di mesin ini
tidak ada Pillow maupun ImageMagick dan Go tidak membaca webp. Warnanya lalu
dikurangi ke 48 dengan median cut — 63 KB menjadi 13 KB — tetapi **alfanya
dibiarkan apa adanya**, tidak dibulatkan ke tiga tingkat seperti pada
ilustrasi visi dan misi: tepi bintang pada logo ini serong, dan alfa tiga
tingkat membuatnya bergerigi pada ukuran kecil.

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

**Nomor karangan yang tiga angka pertamanya sengaja dibuat cocok.** Aturan
awalan tahun lahir di atas menjaring `0000000098` dan `9876543210`, tetapi
tidak menjaring `0111111111`, `0110000000`, maupun `0111234567` untuk
kelahiran 2011 — ketiganya berawalan `011` yang benar, dan seluruhnya
diterima apa adanya. Yang diperiksa sekarang juga **polanya**: deretan yang
seluruhnya angka sama, atau berurutan naik maupun turun satu per satu,
ditolak. Diperiksa dua kali — kesepuluh angkanya sekaligus, dan tujuh angka
sesudah awalan tahunnya — sebab yang bermasalah justru bagian sesudah awalan
itu.

Peluang NISN sungguhan kebetulan berpola begitu kira-kira satu berbanding
sejuta, sedangkan nomor yang dikarang hampir selalu berbentuk salah satunya.
Pesan penolakannya tetap menyebutkan jalan keluar lewat panitia bagi satu
dari sejuta itu. Pemeriksaannya diletakkan **sesudah** pemeriksaan awalan
tahun lahir, supaya nomor seperti `1111111111` tetap menerima pesan tentang
tahun lahir yang lebih menuntun bagi pendaftar yang sekadar salah ketik —
tetapi tetap berjalan ketika tanggal lahirnya belum terisi, sehingga tidak
ada celah di situ. Aturan yang sama ditulis dua kali, di
`backend/validasi_identitas.go` dan di `frontend/src/lib/identitas.ts`;
keduanya wajib sama, sebab kabar "bentuknya benar" yang disusul penolakan
server lebih membingungkan daripada tidak ada kabar sama sekali.

**Satu NISN hanya untuk satu pendaftar per tahun ajaran** (migrasi 010).
Sampai migrasi ini, tiga puluh kiriman dengan NISN yang sama akan tersimpan
seluruhnya, dan panitia baru menemukannya saat memverifikasi berkas satu per
satu. Penjaganya dua lapis: pemeriksaan di aplikasi yang memberi pesan yang
dapat dibaca pendaftar, dan indeks unik parsial di basis data yang menjaring
dua kiriman yang tepat bersamaan.

Pesan penolakannya **tidak menyebutkan nomor registrasi** milik pendaftaran
yang sudah ada, berbeda dengan penolakan nama-dengan-tanggal-lahir. Nama
beserta tanggal lahir hanya diketahui orang yang memang mengenal
pendaftarnya, sedangkan NISN satu nomor tunggal: kalau nomor registrasinya
ikut dikembalikan, formulir ini berubah menjadi alat penelusuran — cukup
mencoba satu per satu NISN untuk mengetahui siapa saja yang mendaftar.

**Migrasi 010 melewati pembuatan indeksnya bila datanya sudah memuat NISN
kembar**, alih-alih gagal. Migrasi dijalankan saat server menyala, dan
migrasi yang gagal menghentikan server lalu mematikan situsnya — persis yang
terjadi pada migrasi 008. Tetapi pelewatannya dilaporkan lewat `RAISE
NOTICE`, dan notice PostgreSQL tidak terbawa ke log aplikasi, sehingga
operator tidak menerima tanda apa pun. Karena itu `periksaIndeksNisn` di
`db.go` memeriksanya **setiap kali server menyala** dan menuliskan peringatan
beserta perintah SQL yang perlu dijalankan sesudah datanya dirapikan.
Catatan migrasinya sendiri sudah telanjur tercatat selesai dan tidak akan
diulang.

### H. Isian asal-asalan pada formulir pendaftaran

`teksWajar` di `validasi.go` menolak isian yang jelas bukan tulisan
sungguhan: `aaaa`, `123`, `.....`. Diterapkan pada nama lengkap, nama ayah,
nama ibu, tempat lahir, alamat, dan asal sekolah.

Aturannya sengaja **sempit**, sebab salah tolak pada kolom nama jauh lebih
merugikan daripada satu kiriman sampah yang lolos: pendaftar yang namanya
ditolak tidak punya jalan lain selain menghubungi panitia. Yang ditolak
hanya tiga hal yang tidak pernah ada pada nama maupun alamat orang
Indonesia: kurang dari tiga huruf sama sekali, tidak memuat satu pun huruf
hidup, dan tiga huruf sama berturut-turut. Huruf ganda seperti pada
"Abdullah" tetap lolos karena yang ditolak tiga berturut-turut, bukan dua.

Angka dilarang hanya pada kolom yang memang tidak pernah berangka — nama
orang — dan tetap diizinkan pada alamat, karena alamat justru hampir selalu
memuat nomor rumah. Contoh yang diuji dan harus tetap diterima:
"Abdullah Syafi'i", "R.A. Kartini", "Ng Wei Ming", dan
"Jl. Raya Pagedangan No. 12, RT 003/RW 002".

Yang **belum** ada: pembatas laju kiriman per alamat IP pada
`POST /api/ppdb/daftar`. Halaman masuk petugas punya pembatasnya, formulir
pendaftaran tidak. Sengaja belum dipasang karena risikonya nyata ke arah
sebaliknya: pendaftar yang mengisi formulir dari warnet atau dari
laboratorium komputer sekolah berbagi satu alamat IP, dan pembatas yang
terlalu rapat akan memblokir antrean yang sah pada hari terakhir
pendaftaran. Keputusan ambangnya milik sekolah, bukan milik kode ini.

### H2. Notifikasi diterima dan daftar ulang, lewat WhatsApp dan email

Begitu administrator menetapkan status seorang pendaftar menjadi **Diterima**,
sistem menyusun pesan berjenis `daftar_ulang` — satu baris untuk WhatsApp dan
satu untuk email — yang sekaligus mengabarkan hasilnya dan menerangkan langkah
daftar ulangnya.

Jenisnya sendiri, bukan memakai `kelulusan` yang sudah ada. Satu pesan yang
menjawab "diterima" dan "lalu saya harus apa" sekaligus lebih berguna daripada
dua pesan berurutan yang setengah-setengah, dan pertanyaan berikutnya orang tua
yang anaknya diterima memang selalu yang kedua itu. `kelulusan` tetap dipakai
untuk Ditolak dan Cadangan.

**Satu baris notifikasi per kanal yang benar-benar punya tujuan.** Pendaftar
yang mengisi nomor dan email menerima dua-duanya; yang hanya mengisi nomor
menerima WhatsApp saja. Nomor orang tua dipakai lebih dulu daripada nomor
pendaftarnya: yang mengurus daftar ulang dan pembayaran pada umumnya orang
tuanya.

**Rincian daftar ulangnya pengaturan tersendiri** — `daftar_ulang_jadwal`,
`daftar_ulang_tempat`, `daftar_ulang_syarat` — bukan dituliskan di dalam naskah
pesannya. Sekolah dapat mengubah jadwalnya tanpa menyentuh susunan kalimatnya,
dan rincian yang sama dapat dipakai di halaman publik nanti. Yang masih
bertanda kurung siku diganti kosong, bukan dikirim sebagai kalimat contoh.

**Email dikirim server; WhatsApp tidak.** Di situlah bedanya, dan itu
menentukan cara panel menerangkannya. Untuk WhatsApp, tombol kirim membuka
WhatsApp panitia dengan pesan terisi penuh — tidak berbiaya, dan nomor sekolah
tidak berisiko diblokir. Untuk email tidak ada tautan semacam itu: server yang
mengirim, jadi bila SMTP belum disetel pengirimannya memang tidak mungkin dan
panel mengatakannya apa adanya beserta nama variabel yang perlu diisi.

Keduanya tetap **menunggu peninjauan** panitia, tidak terkirim otomatis. Pesan
yang salah tidak dapat ditarik kembali, baik dari WhatsApp maupun dari email.

**Pengirimannya memakai `net/smtp` dari pustaka baku**, tanpa pustaka luar —
yang dibutuhkan cuma menyambung ke satu server, masuk dengan sandi aplikasi,
lalu mengirim satu pesan teks. Tidak memakai `smtp.SendMail` meski itu satu
baris: fungsi itu tidak menerima context dan tidak punya batas waktu sama
sekali, sehingga server SMTP yang menggantung akan menggantungkan penanganan
HTTP di panel. Penyambungannya dibuat sendiri dengan `DialTimeout` 15 detik.

STARTTLS **diwajibkan**: bila server tidak mendukungnya, pengiriman dibatalkan
alih-alih diteruskan tanpa enkripsi. Sandi aplikasi tidak boleh melintas
terbuka. Perihalnya disandikan MIME karena judul berbahasa Indonesia dapat
memuat huruf di luar ASCII, dan badannya base64 supaya baris panjang maupun
tanda baca tidak merusak bentuk pesannya.

Diuji dengan **server SMTP tiruan yang ditulis sendiri** — `smtpd` sudah
dibuang dari Python 3.12 dan `aiosmtpd` bukan pustaka baku — yang mendukung
STARTTLS dan AUTH PLAIN lalu menyimpan pesannya ke berkas. Dengan begitu yang
dibuktikan bukan "baris notifikasi ditandai terkirim", melainkan pesan lengkap
beserta kepala dan badan yang benar-benar diterima server email.

Dua hal ditemukan justru karena diuji sampai ke situ:

1. **Verifikasi TLS memang berjalan.** Sertifikat uji pertama ditolak Go
   karena hanya punya Common Name tanpa SAN, dan galatnya tercatat pada kolom
   `galat` notifikasi dalam kalimat yang dapat dibaca panitia.
2. **`susunPesan` melumat baris baru.** Penutupnya
   `strings.Join(strings.Fields(hasil), " ")` meratakan SELURUH spasi putih,
   termasuk baris baru, sehingga naskah daftar ulang yang memuat jadwal,
   tempat, dan daftar berkas berbaris-baris tiba sebagai satu paragraf rapat
   sepanjang lima ratus huruf. Cacat itu sudah ada sejak notifikasi pertama
   dibuat dan mengenai seluruh jenis pesannya; tidak pernah terlihat karena
   yang diperiksa selama ini isi kolom `pesan`, bukan pesan yang diterima.
   Perapiannya sekarang **per baris**: spasi berlebih di dalam satu baris
   diratakan, pemisah barisnya tetap, dan dua baris kosong atau lebih
   dirapatkan menjadi satu. Dijaga oleh `notifikasi_test.go`.

**Awalan `wa_notif_` pada kunci naskah dipertahankan** meski sekarang dipakai
kedua kanal. Menggantinya berarti memindahkan naskah yang sudah diisi sekolah,
dan risiko kehilangan naskah itu lebih besar daripada untungnya nama yang lebih
tepat. Ketidakcocokan namanya dicatat di sini dan di migrasi 014.

**Alamat pengirim email dapat diatur dari panel** (migrasi 015), pada
pengaturan `email_pengirim` dan `email_pengirim_nama`. Sekolah yang ingin
pesannya tampak datang dari ppdb@sekolah, bukan dari akun Gmail yang dipakai
mengirim, tidak perlu menyentuh server.

**Sandinya tetap di `.env`, dan itu disengaja.** Sandi aplikasi yang disimpan
di basis data akan ikut terbawa setiap kali basis datanya dicadangkan atau
disalin ke komputer lain, dan cadangan basis data beredar jauh lebih bebas
daripada berkas `.env`. Yang boleh diatur dari panel hanya alamat dan nama
pengirimnya.

Peringatan yang tercantum pada keterangan pengaturannya: Gmail MENOLAK alamat
pengirim yang bukan akun yang dipakai masuk, atau bukan alias yang sudah
diverifikasi di setelan Gmail. Mengisi alamat sembarangan membuat
pengirimannya gagal, dan galatnya tercatat pada daftar notifikasi. Kosong
berarti memakai alamat akunnya sendiri, yang selalu diterima.

**Nomor WhatsApp pengirim tidak dapat diatur, dan itu bukan kelalaian.**
Pesan WhatsApp dikirim dari akun WhatsApp panitia yang membuka tautannya, jadi
tidak ada nomor pengirim yang dapat disetel dari panel. Bila gateway resmi
dipakai, pengirimnya nomor gateway itu. Yang dapat diatur pengaturan
`whatsapp`, yaitu nomor yang DITAMPILKAN kepada pengunjung pada lima tombol
WhatsApp di situs; pengaturan itu masih kosong, dan selama kosong kelima
tombolnya tidak muncul. Pengaturan yang tidak mengerjakan apa pun sengaja
tidak dibuat.

### H3. Membalas pesan masuk dari dalam panel

Menu Pesan Masuk dulu hanya memasang dua tautan: `wa.me` dan `mailto:`. Yang
`wa.me` bekerja, tetapi yang `mailto:` TIDAK MELAKUKAN APA PUN di komputer
yang tidak punya aplikasi email terpasang, dan itulah keadaan sebagian besar
komputer sekolah. Panitia melihat tombol yang tidak dapat diklik. Itu yang
dilaporkan user, dan memang bukan dugaan: tautan `mailto:` menyerahkan
pekerjaannya kepada aplikasi email yang belum tentu ada.

Sekarang balasannya diarang di dalam panel:

- **Tombol Balas** pada setiap pesan membuka jendela berisi kanal, alamat
  tujuan, perihal, dan naskah balasan. Perihal beserta naskah awalnya sudah
  tersusun, menyapa pengirimnya dan menyebut pertanyaannya, sehingga panitia
  tinggal menuliskan jawabannya.
- **Alamat tujuannya dapat diubah.** Tidak dipaksa sama dengan yang tertulis
  pada pesannya: pengunjung kadang salah menulis alamatnya sendiri, dan yang
  harus dijawab kadang orang tuanya. Pesan yang pengirimnya tidak mencantumkan
  email maupun nomor pun tetap dapat dibalas, alamatnya diisi panitia.
- **Email dikirim server** lewat SMTP yang sama dengan notifikasi PPDB, dari
  alamat pengirim yang disetel di menu Pengaturan. Bila SMTP belum disetel,
  tombolnya dimatikan dan sebabnya diterangkan di tempat itu, bukan dibiarkan
  gagal saat ditekan.
- **WhatsApp tidak dikirim server**, sebab pengiriman otomatis hanya sah lewat
  WhatsApp Business API resmi. Tombolnya membuka WhatsApp dengan pesan yang
  sudah terisi; panitia menekan kirim dari akunnya sendiri. Sama dengan
  kebiasaan notifikasi PPDB, jadi panitia tidak menghadapi dua cara berbeda.
  Sengaja elemen `<a>`, bukan `<button>`: tautannya dibuka oleh ketukan
  panitia sendiri sehingga tidak pernah dihadang penghalang jendela sembulan.
- **Setiap balasan dicatat** di tabel `notifikasi`, satu tempat dengan pesan
  PPDB, beserta isinya. Barisnya tidak berpendaftar, jadi kolom pendaftarnya
  diberi keterangan "Pesan masuk".
- **Pesannya ditandai sudah dibalas** (`pesan.dibalas_pada` dan
  `dibalas_oleh`, migrasi 016), dan sekaligus sudah dibaca. Dibaca bukan
  dijawab: panitia yang bergantian jaga perlu tahu pertanyaan mana yang masih
  menganggur.

Migrasi 016 juga menambah `notifikasi.perihal`. Perihal balasan diketik
panitia saat itu dan tidak ada pengaturannya, jadi harus ikut tersimpan pada
barisnya; dengan begitu balasan yang gagal dapat dicoba ulang dari menu
Notifikasi dengan perihal yang sama. Notifikasi PPDB sengaja MEMBIARKANNYA
KOSONG, dan perihalnya dibaca dari pengaturan pada saat dikirim, supaya
sekolah yang membetulkan naskah perihalnya sesudah pesannya tersusun tetap
terpakai perbaikannya.

Yang diuji, memakai basis data sekali pakai beserta server SMTP tiruan:
email yang benar-benar tiba di server SMTP lengkap dengan pengirim, tujuan,
perihal, dan badan yang barisnya utuh; catatannya di tabel notifikasi;
penandaan sudah dibalas; nomor WhatsApp yang dinormalkan ke awalan 62; tujuh
penolakan isian yang salah; balasan yang gagal saat server email mati, yang
tercatat beserta sebabnya lalu berhasil dikirim ulang dari menu Notifikasi
dengan perihal tersimpan; dan penolakan 503 tanpa mencatat apa pun ketika
SMTP belum disetel sama sekali.

### Tanda pisah panjang tidak dipakai pada tulisan yang tampak

Tanda pisah panjang (em dash dan en dash) tidak lagi dipakai pada seluruh
tulisan yang dibaca pengunjung maupun panitia. Penggantinya titik dua, titik
koma, koma, atau kalimat yang dipecah, sesuai maksudnya; rentang tanggal
memakai tanda hubung biasa.

Yang diubah HANYA tulisan yang tampak, bukan komentar di dalam kode. Cara
mencarinya pun dari keluaran jadinya, bukan dari kodenya: teks tampak
dikeluarkan dari HTML ke-27 halaman publik yang benar-benar disajikan, dari
berkas JavaScript hasil build untuk teks panel admin, dan dari kolom `nilai`
serta `keterangan` pada tabel pengaturan. Sebelas tempat ditemukan; dari 109
baris kode yang memuat tanda itu, sisanya komentar.

Satu di antaranya ada di basis data, bukan di kode: keterangan pengaturan
`peta_koordinat` yang ditulis migrasi 008, dan tampil sebagai teks bantuan di
panel. Diganti lewat migrasi 015, sekaligus dibetulkan di sumber migrasi 008
supaya pemasangan baru tidak menuliskannya lagi.

### I. Dukungan tujuan "meningkatkan efektivitas promosi"

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

### J. Berita dan pengumuman sebagai karusel foto

Bagian Berita & Pengumuman di beranda berupa karusel berlatar gelap: satu foto
besar di tengah, tetangganya mengintip di kiri dan kanan, tombol panah pada
kedua tepi foto tengahnya, judul beserta tanggalnya di bawah, lalu titik
penanda. Sebelumnya tiga kartu berjajar.

Ia satu-satunya bagian beranda berlatar gelap selain sorotan atas dan ajakan
mendaftar di bawah, dan itu disengaja: bagian ini memecah deretan bagian
berlatar terang di tengah halaman, sekaligus membuat foto beritanya menonjol.
Latarnya foto yang sedang di tengah, diburamkan dan digelapkan, sehingga warna
seluruh bagian ini mengikuti fotonya.

**Seluruh berita berjajar pada satu rel, dan yang berpindah posisi relnya.**
Sebelumnya hanya foto tengahnya yang ditukar sumbernya, sehingga
perpindahannya berkedip tanpa arah. Perhitungan geserannya memakai satuan
`cqw`, bukan persen dan bukan piksel hasil pengukuran JavaScript: pada
`transform`, persen dihitung dari lebar elemen yang digeser — yaitu seluruh
relnya — bukan dari lebar jendela pandangnya, sedangkan mengukur dengan
JavaScript berarti lebarnya baru diketahui sesudah halaman terpasang sehingga
yang dikirim server tampil kacau sekejap. `cqw` dihitung dari lebar wadah yang
ditandai `@container`, jadi seluruhnya selesai di CSS dan benar sejak lukisan
pertama.

Relnya memuat **dua penutup ujung**: salinan butir terakhir di kepala dan
salinan butir pertama di ekor. Gunanya supaya tetangga yang mengintip selalu
ada di kedua sisi — tanpa itu, pada butir pertama sisi kirinya kosong dan pada
butir terakhir sisi kanannya kosong, dan karena tombolnya berputar ke ujung
yang lain kekosongan itu terbaca sebagai cacat, bukan sebagai tanda "sudah di
ujung". Keduanya semata hiasan: disembunyikan dari pembaca layar, dilepas dari
urutan papan ketik, dan tidak dapat ditekan.

Latar buramnya pun dirender keenam sekaligus lalu yang aktif saja yang dibuat
tampak, supaya pergantiannya memudar alih-alih berkedip. Alamatnya sama dengan
foto di relnya, jadi peramban memakai berkas yang sudah diambilnya.

**Karuselnya TIDAK berjalan sendiri.** Karusel yang berpindah otomatis
memindahkan bacaan orang yang sedang membacanya, dan pengunjung yang memakai
pembaca layar maupun yang lambat membaca paling dirugikan. Perpindahannya
karena ditekan: tombol panah, titik penanda, tombol panah papan ketik, atau
geseran jari sejauh lebih dari 48 piksel — cukup jauh untuk membedakan geseran
dari ketukan yang jarinya sedikit bergerak.

**Tetangga yang mengintip diberi aria-hidden dan tidak dapat ditekan.** Ia
hiasan yang menerangkan bahwa daftarnya bisa digeser; isi yang sungguhan —
judul, tanggal, dan tautannya — hanya satu, milik foto yang sedang di tengah.
Dengan begitu pembaca layar tidak membacakan tiga berita sekaligus dan papan
ketik tidak berhenti di tautan yang tidak terlihat. Keterangannya diberi
aria-live supaya berita yang baru muncul ikut disuarakan. Di bawah ambang lg
tetangganya tidak ditampilkan sama sekali: selebar seperlima layar ponsel ia
tidak terbaca sebagai foto, hanya sebagai pita berwarna yang menyempitkan yang
utama.

Yang diambil enam berita, bukan tiga seperti sebelumnya: tiga titik penanda
terbaca seperti daftar yang belum selesai dimuat. Berita tanpa gambar tetap
masuk karusel, dengan bidang biru bertuliskan kategorinya — bukan kotak
kosong, dan bukan foto karangan.

Diuji lewat protokol DevTools, 10 pemeriksaan lulus: jumlah titiknya,
perpindahan maju dan mundur, lompatan dari butir pertama ke butir terakhir,
penekanan titik penanda, pengganti bagi berita tanpa gambar, dan di lebar
ponsel tetangganya benar-benar tidak ditampilkan tanpa menimbulkan gulir
mendatar. Dua kegagalan yang sempat muncul salah pengujinya, bukan kodenya:
keenam titik ditekan di dalam satu panggilan sehingga React belum merender
ulang saat dibaca, dan pemeriksaan tetangga ikut menghitung lapisan latar yang
juga ber-aria-hidden tetapi memang harus terlihat.

**Catatan tentang tampilannya di pemasangan sekolah sekarang:** ketujuh gambar
berita yang ada berukuran 409 bita dan isinya identik — satu JPEG mungil
berwarna rata, sisa pengujian. Ia termuat, tetapi direntangkan sebesar kartu
hasilnya bidang rata, sehingga kartunya tampak kosong. Itu keadaan datanya,
bukan tata letaknya; bagian ini akan tampil sebagaimana mestinya begitu
sekolah mengunggah foto yang sungguhan.

### K. Diagram lingkaran dan angka kunjungan situs di panel

**Waktu pendaftaran masuk digambar sebagai diagram lingkaran**, dengan tiga
tombol rentang: Tanggal, Bulan, Tahun. Sebelumnya berupa grafik bilah per hari,
dan pada data sekolah sekarang — dua belas formulir yang seluruhnya masuk pada
satu hari — yang tergambar cuma satu batang tunggal.

Yang perlu dicatat terus terang: **diagram lingkaran tidak memperlihatkan arah
naik-turunnya.** Ia menjawab pertanyaan komposisi — dari seluruh formulir yang
masuk, berapa bagian datang pada tanggal, bulan, atau tahun mana — bukan
pertanyaan tren. Untuk melihat apakah pendaftaran sedang ramai atau sepi,
bentuk bilah lebih menjawab, dan itu masih ada pada bagian Peminatan serta
Kanal Promosi di sebelahnya.

Ketiga rentangnya dihitung **terpisah di basis data**, bukan dari satu deret
harian yang dijumlahkan ulang di peramban: deret harian hanya memuat tiga
puluh hari, sehingga angka per tahun yang dihitung darinya akan salah.

Diagramnya digambar sebagai SVG di `komponen/DiagramLingkaran.tsx`, **tanpa
pustaka grafik**. Yang dibutuhkan cuma satu bentuk — busur dengan panjang
tertentu pada satu lingkaran — dan itu satu atribut CSS, `stroke-dasharray`.
Jari-jarinya 15,9155, yaitu 100/(2π), sehingga kelilingnya tepat 100 dan
panjang tiap busur dapat dituliskan langsung sebagai persennya; tidak ada
perhitungan keliling yang bisa salah. Komponennya tidak memakai satu baris
JavaScript pun, jadi dapat dipakai di komponen server dan tetap tergambar utuh
pada HTML yang dikirim server.

**Warnanya satu rona**, biru sekolah dengan kepekatan menurun dari irisan
terbesar ke terkecil, dibatasi 0,22 agar irisan terkecil masih terbaca. Diagram
lingkaran memang menuntut irisannya dapat dibedakan — di sini ia tidak bisa
seragam sepenuhnya seperti deretan angka di halaman lain — tetapi membedakan
dengan kepekatan, bukan dengan rona yang berbeda-beda, membuatnya tetap satu
keluarga warna dengan seluruh situs, dan urutan kepekatannya sendiri bermakna.

**Angka kunjungan situs (migrasi 013).** Tabel `statistik_kunjungan` sudah ada
sejak skema pertama, terbawa dari versi PHP, tetapi **tidak pernah ditulis satu
baris pun** oleh aplikasi Go: tidak ada satu kueri pun yang menyentuhnya, dan
di pemasangan sekolah isinya nol baris. Jadi angka kunjungan memang belum
pernah ada, bukan sekadar belum ditampilkan.

Pencatatannya dijalankan **dari peramban pengunjung**, bukan dihitung di
server, karena halaman publik disajikan sebagai halaman statis yang disimpan
cache — kunjungan tidak selalu sampai ke server, jadi tidak ada tempat di sisi
server yang dapat menghitungnya. Komponen `PencatatKunjungan` dipasang di tata
letak publik dan memantau `usePathname`, sebab perpindahan halaman di Next
tidak memuat ulang tata letaknya; tanpa itu hanya halaman pertama yang
terhitung. Gagalnya pengiriman diabaikan dengan sengaja: pencatat kunjungan
tidak boleh menjadi sebab halaman terasa rusak di sisi pengunjung.

**Alamat IP pengunjung TIDAK disimpan.** Kolom `ip` diganti nama menjadi
`penanda`, dan isinya enam belas huruf pertama SHA-256 atas gabungan rahasia
server, alamat IP, dan tanggalnya. Menyimpan alamat IP berarti menyimpan data
pribadi orang yang sekadar membuka halaman sekolah — termasuk calon peserta
didik dan orang tuanya — padahal yang dibutuhkan sekolah cuma jumlahnya. Karena
tanggalnya ikut menjadi bahan sidiknya, sidik orang yang sama pun berbeda dari
hari ke hari, sehingga riwayat kunjungan seseorang tidak dapat dirangkai dari
tabel ini. Namanya diganti, bukan dibiarkan `ip` dengan isi berbeda, supaya
siapa pun yang membaca skemanya nanti tidak menyangka tabel ini memuat alamat
IP.

Kolom `halaman` diisi **nama bagian situs**, bukan alamat lengkapnya. Alamat
yang segmen keduanya berupa satu butir isi dipangkas — `/berita/{slug}` menjadi
`/berita` — sedangkan halaman yang memang bernama dua segmen dibiarkan utuh,
misalnya `/profil/visi-misi`. Dua sebabnya: daftar bagian yang paling dibuka
jadi berisi bagian situs, bukan judul berita satu per satu; dan jumlah barisnya
tidak tumbuh mengikuti banyaknya berita maupun banyaknya alamat yang bisa
dikarang orang. Halaman panel panitia tidak dihitung sama sekali.

**Keterbatasannya disebutkan apa adanya di panel**, di bawah angkanya: angka
ini tidak sebanding dengan Google Analytics; pengunjung yang mematikan
JavaScript dan sebagian besar perayap mesin pencari tidak terhitung; dan satu
"pengunjung" berarti satu alamat jaringan per hari, sehingga dua orang pada
satu jaringan sekolah terhitung satu sedangkan satu orang yang berganti dari
Wi-Fi ke data seluler terhitung dua. Angka yang tidak diterangkan batasnya
lebih menyesatkan daripada tidak ada angka.

Diuji pada basis data sekali pakai `uji_013`: alamat panel ditolak, alamat
karangan ditolak, `/PROFIL` dinormalkan menjadi `/profil`, tiga alamat berita
berbeda menyatu menjadi satu baris `/berita`, tidak satu baris pun berisi
bentuk alamat IP, dan panjang penandanya tepat enam belas huruf. Tampilannya
diperiksa lewat protokol DevTools, 14 pemeriksaan lulus. Satu bug nyata
ditemukan ujinya: `api.kunjungan()` semula tidak membawa token sehingga
jawabannya 401 dan bagiannya tampil sebagai galat.

### L. Bilah informasi berjalan

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

### M. Sambutan kepala sekolah di beranda

Beranda memuat sambutan kepala sekolah tepat sesudah bilah keadaan PPDB,
mengikuti rancangan yang dikirim user: dua bidang bersebelahan. Panel biru
muda di kiri berisi semboyan bertulisan tangan bergaris emas, potret yang
berdiri di atas bulatan pucat, dan kartu nama putih di dasarnya. Panel putih
di kanan berisi eyebrow, judul, semboyan, garis emas, naskah sambutan dengan
salam pembuka ditebalkan, tombol **Lihat Profil Lengkap**, dan gedung sekolah
bergaya garis yang samar di pojok kanan bawah.

Bagian video pada rancangan itu tidak dibuat, atas permintaan user.

Tiga hal lain berbeda dari rancangan aslinya, dan ketiganya karena bahannya
harus datang dari sekolah:

1. Rancangan itu memuat **dua** kalimat bertulisan tangan yang berbeda. Yang
   tersedia hanya satu, yaitu pengaturan `tagline`; memakainya dua kali akan
   terbaca sebagai pengulangan, dan mengarang yang kedua tidak boleh. Jadi
   kotak kutipan di kanan atas tidak dibuat.
2. Kalimat "Mewujudkan lingkungan belajar yang aman, nyaman, dan berdaya
   saing" adalah penilaian tentang sekolahnya. Tempatnya di bawah judul diisi
   `tagline` bila ada, dan dibiarkan kosong bila tidak.
3. Tulisan tangan "Sekolah Unggul Generasi Hebat" di pojok kanan bawah juga
   semboyan yang bukan milik sekolah ini, jadi tidak dibuat. Yang tinggal di
   pojok itu gambar gedung bergaya garis — hiasan, tanpa satu kata.

Potretnya paling rapi berupa **PNG berlatar tembus pandang**, supaya berdiri
di atas bulatan pucat itu alih-alih tampil sebagai kotak persegi.

**Bagian ini selalu tampil**, termasuk sebelum sekolah mengirim apa pun.
Versi bersyaratnya sudah dicoba — hanya muncul kalau nama, foto, atau
naskahnya sudah ada — dan dibuang atas permintaan user, karena pada pemasangan
sekolah ketiganya masih kosong sehingga bagiannya tidak pernah terlihat.

Konsekuensinya ditangani di keadaan kosongnya, bukan diabaikan. Dua hal
berbeda dari kerangka di halaman Profil:

- **Tempat fotonya tidak memuat petunjuk unggah.** Di halaman Profil,
  keterangan "diunggah lewat menu Pengaturan" masih pantas karena panitia
  memang membacanya. Di beranda yang membaca orang tua, dan menyuruh mereka
  membuka panel admin tidak berarti apa-apa. Jadi yang tampil hanya lambang
  orang, tanpa satu kata pun.
- **Kalimat penggantinya mengarahkan, bukan melapor.** "Naskah belum dikirim
  sekolah" memberi tahu pengunjung sesuatu yang bukan urusannya, dan membuat
  sekolahnya terdengar lalai. Yang ditulis: sambutannya akan dimuat di sini,
  dan sementara itu profil sekolahnya dapat dibaca lebih dulu — beserta
  tautannya, yang ikut berubah menjadi "Buka Profil Sekolah".

Begitu nama, foto, atau naskahnya diisi lewat menu Pengaturan, bagian ini
berganti sendiri ke bentuk terisinya. Tidak ada kode yang perlu diubah.

**Gedung sekolah menjadi LATAR SEPENUH PANEL, dengan naskahnya di atasnya.**
Semula jalur SVG bergaya garis di pojok, lalu sempat menjadi gambar kecil di
pojok kanan bawah; keduanya terlalu kecil sehingga gedungnya nyaris tidak
terbaca. `object-right-bottom` menentukan bagian mana yang tersisa saat
dipotong: gambarnya berbanding 2:1 sedangkan panelnya jauh lebih jangkung,
jadi `object-cover` pasti memotong, dan gedungnya berada di sisi kanan bawah
gambar.

Yang menjaga naskah tetap terbaca **peredam di atas gambarnya**, bukan
kepucatan gambarnya sendiri. Dua bentuk, karena letak naskahnya berbeda: mulai
ambang `sm` naskahnya di kolom kiri sedangkan gedungnya di kanan, jadi
peredamnya bergradasi mendatar — hampir pekat di kiri tempat hurufnya,
menipis ke kanan supaya gedungnya tetap terlihat; di layar sempit naskahnya
memenuhi seluruh lebar panel sehingga peredamnya rata.

**Keterbacaannya diukur, bukan dikira.** Tiap petak teks dipotret sendiri
dengan seluruh tulisan di panel disembunyikan lebih dulu, sehingga yang
terpotret murni latarnya; warna paling gelap pada petak itu diambil, lalu
nisbah kontrasnya terhadap warna huruf dihitung menurut rumus WCAG. Hasil
akhirnya judul 8,49:1 dan naskah 11,82:1 di layar lebar, 10,38:1 dan 12,81:1
di ponsel — jauh di atas ambang 4,5 untuk teks isi.

Pengukuran itu menemukan satu masalah nyata: naskahnya semula `text-samar`
(#6b7280) dan di atas gambar latar turun ke **3,67:1**, di bawah ambang.
Bahkan di atas putih bersih abu-abu itu cuma 4,83:1. Karena itu naskah di
panel ini dinaikkan ke `text-teks`.

Tiga kekeliruan pengukuran ikut dibetulkan sebelum angkanya dipercaya:
`clip` pada `Page.captureScreenshot` memakai koordinat halaman sedangkan
`getBoundingClientRect()` memberi koordinat jendela, sehingga tanpa menambah
geseran gulir yang terpotret petak lain sama sekali; menyaring piksel huruf
menurut kedekatan warna ikut meloloskan piksel tepi huruf yang dihaluskan dan
membuat latar terbaca jauh lebih gelap daripada sebenarnya; dan tombol yang
punya latar penuh warnanya sendiri tidak boleh dinilai dengan cara ini, sebab
menyembunyikannya untuk mengukur latar justru salah sasaran.

**Berkas gambarnya JPEG, bukan PNG.** Aslinya PNG 1774×887 sebesar 1 MB tanpa
lapisan tembus pandang, dan karena tidak ada yang perlu dijaga tembusnya
sedangkan isinya bidang bergradasi, JPEG turun ke 28 KB.

Tepi kiri dan atasnya dipudarkan lewat mask supaya ia menyatu dengan kartunya
alih-alih terbaca sebagai foto yang ditempelkan. Sengaja tidak diberi opacity
tambahan: gambarnya sendiri sudah pucat, dan memudarkannya lagi membuat
gedungnya nyaris hilang.

Di layar sempit hiasan pojok itu **tidak dipakai**. Kartunya di sana hanya
selebar layar, naskahnya memenuhi seluruh lebarnya, dan gambar di pojok kanan
bawah menimpa paragraf terakhirnya — diukur, memang bertimpa pada lebar 390
piksel. Gantinya sebuah pita setinggi 96 piksel di dasar kartu, sesudah
naskahnya, sehingga tidak pernah menimpa apa pun. Berkasnya sama, jadi
peramban tidak mengunduh dua kali.

**`max-w-none` wajib menyertai `w-[calc(100%+3rem)]`.** Preflight Tailwind
memasang `img { max-width: 100% }` untuk seluruh gambar, dan aturan itu
memangkas lebar yang melebihi wadahnya kembali menjadi 100%. Akibatnya gambar
yang seharusnya melebar melewati padding kartu berhenti selebar isi kartu:
tepi kirinya menyentuh tepi kartu karena margin negatifnya, sedangkan tepi
kanannya berhenti 24 piksel sebelum tepi kartu.

Cacat itu ternyata sudah ada pada kartu Tenaga Pendidik dan Kalender Akademik
sejak keduanya dibuat, dan tidak tertangkap karena yang diperiksa waktu itu
hanya UKURAN gambarnya — 308 piksel terlihat masuk akal — bukan letak tepinya
terhadap tepi kartu. Ketiganya sekarang diperiksa per tepi: gambar 356 piksel
pada kartu 358 piksel, rata di kedua sisi, 9 pemeriksaan lulus.

### N. Peta lokasi dan pengukur jarak

Beranda memuat peta lokasi sekolah beserta tombol yang memungkinkan
pengunjung mengukur jarak dan waktu tempuh dari rumahnya, untuk tiga moda:
mobil, motor, dan angkutan umum.

**Perhitungannya tidak dikerjakan situs ini, dan itu keputusan yang
disengaja.** Menghitung jarak jalan beserta estimasi waktu memerlukan layanan
rute — Google Directions, Mapbox, atau sejenisnya — dan seluruhnya menuntut
kunci API yang ditagih per permintaan. Kunci itu tidak boleh diletakkan di
repositori publik, dan sekolah tidak punya anggaran langganan. Menghitung
sendiri dengan rumus jarak lurus juga bukan jalan keluar: jarak lurus 5 km
bisa berarti 12 km lewat jalan, dan **angka yang menyesatkan lebih buruk
daripada tidak ada angka**.

Jadi pengukurannya diserahkan ke Google Maps lewat tautan arah. Tautannya
sengaja **tanpa titik asal**: Google Maps yang kosong titik asalnya memakai
lokasi pengunjung sendiri, dan di ponsel ia membuka aplikasi Maps-nya — jadi
pengunjung tidak perlu mengetik alamat rumah sama sekali.

Ada keuntungan yang jarang disadari di situ: **lokasi rumah pengunjung tidak
pernah melewati server sekolah.** Kalau rutenya dihitung sendiri, alamat setiap
pengunjung akan tercatat di sana.

Titik tujuannya memakai pengaturan `peta_koordinat` (migrasi 008) bila sudah
diisi — bentuknya `lintang,bujur`, disalin dengan klik kanan pada Google Maps
— dan memakai alamat sekolah sebagai teks bila belum. Keduanya bekerja;
koordinat lebih tepat karena tidak bergantung pengenalan alamat.

Petanya sendiri memakai `peta_embed` yang sudah ada. Bila kosong, yang tampil
kerangka berukuran sama, dan **tombol penunjuk arahnya tetap bekerja** —
keduanya tidak saling bergantung.

### O. Alur masalah dan jawabannya di beranda

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

### P. Beranda mendahulukan profil sekolah

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

### Q. Tautan WhatsApp beserta pesan bawaannya

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

### R. Lencana status

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
| Brute force masuk panel | Maksimal lima percobaan masuk gagal per sepuluh menit per alamat IP |
| Pembatas laju rute publik | Tujuh rute publik dibatasi per alamat IP. Rute yang menyerahkan data pendaftar juga DIKUNCI PER NOMOR REGISTRASI sesudah sepuluh kegagalan dalam sejam, sehingga tanggal lahirnya tidak dapat ditebak habis dari banyak alamat IP sekaligus |
| Alamat pemanggil | `X-Forwarded-For` hanya dipercaya bila permintaannya datang dari jaringan tepercaya, dan yang diambil entri terkanan di luar jaringan itu; tanpa itu kepala karangan membuat seluruh pembatas laju tidak berarti |
| Pembatasan peran | `admin` mengelola pengaturan, peminatan, pengguna, dan penghapusan pendaftar; `operator` hanya mengelola pendaftar dan isi situs. Dijaga di backend, bukan hanya disembunyikan dari menu |
| Unggahan berkas | Ekstensi **dan** beberapa bita pertama isinya diperiksa, sehingga skrip bernama `.jpg` tertolak. Batas 2 MB, nama berkas diacak |
| Dokumen pendaftar | Kartu Keluarga, akta, dan ijazah hanya dapat diunduh dengan token petugas, dan tidak disimpan di cache bersama |
| Cek status | Nomor registrasi saja tidak cukup; tanggal lahir menjadi pasangan kunci agar data orang lain tidak terbuka dengan menebak nomor |
| Spam | Kolom perangkap tersembunyi pada formulir pendaftaran dan kontak |
| Sekolah asal | Dicocokkan ke daftar rujukan yang diimpor panitia; yang tidak cocok ditolak, kecuali pendaftar menyatakannya dan panitia memeriksa manual |
| CORS | Asal yang diizinkan disebutkan satu per satu, bukan `*`, karena permintaannya membawa token |
| Kepala keamanan HTTP | CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, dan HSTS saat produksi. Dipasang pada halaman Next maupun jawaban API, dengan isi yang berbeda sesuai apa yang dilayani masing-masing |
| Cadangan | Basis data dicadangkan harian (disimpan 14 hari) dan dokumen pendaftar pekanan (4 pekan) lewat systemd timer. Hasilnya diperiksa, bukan dianggap berhasil begitu `pg_dump` selesai |
| Kredensial | Seluruhnya dibaca dari variabel lingkungan. `JWT_SECRET` wajib diisi saat `APP_ENV=produksi`, dan berkas `.env` tidak ikut ke repositori |

### Pembatas laju pada rute publik

Yang dilindungi bukan hanya beban server. Tiga rute publik menyerahkan data
pribadi pendaftar dengan kunci nomor registrasi ditambah tanggal lahir: cek
status, bukti pendaftaran, dan kartu peserta. Nomor registrasinya berurutan
dan tercetak pada bukti pendaftaran, sedangkan tanggal lahir anak seusia calon
peserta didik SMA hanya sekitar seribu kemungkinan. Tanpa pembatas, seluruh
kemungkinan itu dapat dicoba satu per satu sampai ketemu.

Pembatasnya dua lapis, dan lapis keduanya yang menutup celah itu:

| Rute | Per alamat IP | Per nomor registrasi (kegagalan) |
|---|---|---|
| `POST /api/ppdb/cek` | 60 / 10 menit | 10 / jam |
| `POST /api/ppdb/bukti` | 60 / 10 menit | 10 / jam |
| `POST /api/ppdb/kartu` | 60 / 10 menit | 10 / jam |
| `POST /api/ppdb/ujian/mulai` | 60 / 10 menit | 10 / jam |
| `POST /api/ppdb/daftar` | 20 / jam | - |
| `POST /api/pesan` | 10 / jam | - |
| `POST /api/kunjungan` | 300 / 10 menit | - |

Pembatas per alamat IP sengaja LONGGAR, sebab satu sekolah, satu warnet, atau
satu kampung bisa berbagi satu alamat IP publik, dan pembatas yang ketat di
situ akan memblokir pendaftar yang tidak bersalah. Yang ketat justru pembatas
per nomor registrasi, dan itu hanya menghitung KEGAGALAN: pendaftar yang tahu
tanggal lahirnya sendiri tidak pernah gagal sepuluh kali, dan hitungannya
dinolkan begitu berhasil sekali.

Akibat yang diterima dengan sadar: sesudah sepuluh kegagalan, nomor itu
terkunci sejam bagi siapa pun, termasuk pemiliknya yang datang kemudian dengan
tanggal lahir yang benar. Itu memang harganya; membiarkan percobaan yang benar
lolos berarti membiarkan tebakan yang berhasil lolos juga, dan tebakan yang
berhasil itulah yang mau dicegah. Panitia tetap dapat membuka datanya dari
panel.

Jawabannya 429 beserta kepala `Retry-After`, dan pesannya menyebut lama
menunggu dalam kalimat Indonesia.

**`X-Forwarded-For` sebelumnya dipercaya apa adanya**, dengan alasan yang
tertulis di kodenya: "hanya untuk pembatas laju". Justru di situ salahnya.
Siapa pun dapat mengirim kepala itu berisi angka acak pada setiap permintaan,
sehingga setiap permintaan terhitung berasal dari alamat yang berbeda dan
SELURUH pembatas laju menjadi tidak berarti, termasuk pembatas percobaan masuk
panel yang sudah ada sejak awal. Sekarang kepala itu hanya dipercaya bila
permintaannya datang dari jaringan tepercaya (bawaannya loopback beserta
jaringan lokal, dapat diganti lewat `TRUSTED_PROXIES`), dan yang diambil entri
terkanan di luar jaringan itu, sebab bagian kirinya dapat diisi pemanggil
sendiri.

Hitungannya disimpan di memori, bukan di basis data maupun Redis: aplikasi ini
berjalan sebagai satu proses pada satu server, jadi hitungan di memori sudah
tepat. Catatan yang kedaluwarsa disapu setiap lima menit, supaya membanjiri
dari banyak alamat palsu tidak menghabiskan memorinya.

Sepuluh uji satuan mengunci perilakunya, termasuk empat uji khusus untuk
`X-Forwarded-For`. Diuji juga dari ujung ke ujung pada basis data sekali pakai:
sebelas percobaan tanggal lahir yang salah untuk satu nomor, yang ke-11
dijawab 429 dengan `Retry-After: 3600`; nomor lain tidak terpengaruh; dan
kepala karangan yang ditambahi alamat sebenarnya oleh proksi tetap terhitung
satu pengunjung.

### U. Menambah pendaftar dari panel, meski PPDB sudah ditutup

Keadaan yang sangat lazim dan sebelumnya tidak tertangani: ada calon yang
datang langsung ke sekolah SESUDAH pendaftaran ditutup, lalu kepala sekolah
memutuskan menerimanya. Formulir publik ditolak backend ketika PPDB tutup,
jadi satu-satunya jalan adalah membuka kembali PPDB untuk SEMUA ORANG,
memasukkan satu data, lalu menutupnya lagi. Selama jendela itu terbuka,
siapa pun di internet dapat mendaftar.

Sekarang ada menu **Pendaftar → Tambah Pendaftar**, satu halaman panjang yang
**tetap bekerja meski PPDB sudah ditutup**. Bentuknya bukan lima langkah
seperti formulir publik: yang mengisi petugas yang sudah hafal isinya dan
sedang menghadapi orang di meja pendaftaran.

Tiga hal yang berbeda dari formulir publik, dan masing-masing ada sebabnya:

| Beda | Sebabnya |
|---|---|
| Tidak memeriksa apakah PPDB dibuka | Itu seluruh gunanya |
| Tanpa unggahan berkas | Dokumennya diterima petugas dalam bentuk kertas; memaksa lima unggahan di meja pendaftaran membuat fiturnya tidak terpakai |
| Tanpa centang pernyataan kebenaran data | Yang menandatangani pernyataan itu pendaftarnya sendiri, dan petugas tidak dapat menandatanganinya atas nama orang lain |
| Sekolah di luar daftar rujukan tidak ditolak | Petugas memasukkan data dengan ijazahnya di tangan, jadi ia tahu lebih banyak daripada daftar rujukannya |

Pemeriksaan lain SELURUHNYA sama: NISN, NIK beserta pencocokan silangnya,
kewajaran tulisan, kode pos, NPSN, dan kedua penjaga pendaftaran ganda. Data
yang masuk lewat pintu ini tidak boleh lebih rendah mutunya.

Akibat yang diterima dengan sadar, dan dikatakan apa adanya di halamannya:
pendaftar yang dimasukkan dari sini **tidak punya berkas apa pun di sistem**,
jadi verifikasinya harus dicocokkan dari kertas. Karena itu rincian
pendaftar mendapat baris baru, **"Cara mendaftar"**, yang berbunyi
"Dimasukkan panitia: <nama petugas>" atau "Mengisi formulir online sendiri".
Penandanya dari kolom `pendaftar.dibuat_oleh` (migrasi 018); kosong berarti
pendaftar mengisi sendiri.

**Pemeriksaan isian kedua jalur kini SATU FUNGSI** (`periksaIsianPendaftar`
pada `pendaftar_isian.go`), begitu pula penyimpanannya (`simpanPendaftar`).
Alasannya konkret, bukan kerapian: dua jalur yang memeriksa isian yang sama
dengan kode yang berbeda pasti menyimpang satu sama lain. Contohnya sudah
terjadi di proyek ini — daftar dokumen di halaman Info PPDB menyebut Akta
Kelahiran dan Rapor bersifat **opsional** padahal backend mewajibkan
keduanya, sehingga halaman itu menjanjikan yang tidak benar dan pendaftar
yang mengikutinya akan ditolak formulirnya. Daftar itu ikut dibetulkan di
sini, dan diberi catatan bahwa isinya harus sama dengan `berkasPendaftar`.

Diuji pada basis data sekali pakai dengan PPDB DITUTUP: penambahan dari panel
berhasil (201) pada saat yang sama formulir publik ditolak (409); tanpa token
401; isian kosong ditolak dengan 21 galat per kolom; NIK yang jenis
kelaminnya bertentangan ditolak; pendaftaran ganda ditolak beserta nomor
registrasi yang sudah ada; dan `dibuat_oleh` tercatat. Formulir publik diuji
ulang sesudah penyatuan itu, lengkap dengan lima berkas unggahan, dan tetap
berhasil. Antarmukanya sembilan pemeriksaan lewat peramban.

### T. Dua gerak yang menyampaikan keadaan, bukan menghias

Situs ini sudah cukup banyak gerak hiasan: muncul-naik saat digulir di 26
halaman, gulir halus Lenis, kartu terangkat saat disorot, karusel berita, dan
percikan klik. Dua yang ditambahkan di sini jenis lain, yaitu gerak yang
memberi tahu keadaan.

**Bilah kemajuan saat mengunggah dokumen.** Formulir PPDB mengirim sampai enam
dokumen, masing-masing dibatasi 2 MB, jadi seluruhnya bisa 12 MB. Sebelum ini
tombolnya hanya berputar tanpa keterangan; di data seluler yang lambat itu
satu menit penuh, dan yang paling sering terjadi bukan pendaftar menunggu,
melainkan menekan kirim lagi atau menutup halamannya.

Sekarang tampil persennya beserta bita yang sudah terkirim dari totalnya.
Sesudah bita terakhir terkirim, tahapnya berganti sendiri menjadi "Menyimpan
di server" — sebab pada saat itu server masih menyimpan berkasnya dan
menerbitkan nomor registrasi, dan bilah yang berhenti di 100 persen tanpa
keterangan terbaca sebagai macet.

Pengirimannya karena itu memakai `XMLHttpRequest`, bukan `fetch`, dan itu
bukan pilihan gaya: **fetch tidak dapat melaporkan kemajuan unggahan sama
sekali.** Yang tersedia di fetch hanya kemajuan unduhan. Penanganan galatnya
disamakan dengan `permintaan()`, sehingga galat per kolom tetap menyorot
kolom yang bermasalah seperti sebelumnya.

**Kerangka muat pengganti bulatan berputar.** Daftar dan tabel di panel
sebelumnya menampilkan satu bulatan berputar di tengah ruang kosong, lalu
tata letaknya melompat begitu datanya tiba. Kerangka muat menahan bentuknya:
kepala tabel sudah terbaca, dan kotak abu berdenyut menempati tempat yang akan
diisi datanya.

Dipasang di enam tempat yang bentuknya sudah diketahui: dasbor, Pendaftar,
Notifikasi, Pengguna, Sekolah Asal, dan Pesan Masuk. Kepala tabelnya dijadikan
satu tetapan yang dipakai BERSAMA oleh kerangka dan tabel sesungguhnya,
sehingga jumlah kolom keduanya tidak mungkin berbeda. Halaman lain masih
memakai bulatan berputar; bentuknya belum tentu satu tabel, jadi kerangkanya
akan menipu kalau dipaksakan.

Dua hal teknis yang menentukan keduanya tetap ringan di ponsel murah:

- Bilah kemajuannya digerakkan dengan `transform: scaleX`, bukan `width`.
  Mengubah lebar memaksa peramban menghitung ulang tata letak pada setiap
  rangka, dan itu tersendat justru ketika sedang mengunggah.
- Denyut kerangkanya memakai `opacity`, bukan latar yang bergeser.

Keduanya menghormati setelan "kurangi gerak", tetapi TIDAK dengan cara yang
sama. Denyut kerangka berhenti sepenuhnya: bentuknya sendiri sudah
menyampaikan bahwa ada yang dimuat. Bilah kemajuan tetap bergerak, sebab ia
keterangan dan bukan hiasan; yang dihilangkan hanya kehalusan peralihannya,
sehingga angkanya melompat langsung ke tempatnya.

Diuji lewat peramban sungguhan. Bilah kemajuannya pada basis data sekali pakai
beserta salinan frontend tersendiri, bukan pada pemasangan user: formulir
diisi lengkap, lima berkas 1,7 MB dipasang lewat protokol DevTools, unggahannya
diperlambat ke 400 kB/s, lalu bilahnya terekam 139 kali dari "1%, 48 KB dari
8,3 MB" sampai 100 persen, berganti ke tahap "Menyimpan di server", dan
berakhir pada nomor registrasi yang benar-benar terbit. Kerangka muatnya pada
pemasangan user tetapi hanya dengan permintaan GET, jaringannya diperlambat
supaya keadaan muatnya dapat ditangkap: empat belas pemeriksaan pada lima
halaman, termasuk bahwa kepala tabelnya sudah terbaca saat memuat dan tidak
ada lagi bulatan berputar.

Tinggi halaman saat memuat dan sesudah datanya tiba diukur juga, sebab itu
inti gunanya: selisihnya 0 piksel pada Notifikasi dan Pengguna, 34 pada
Sekolah Asal, 59 pada Pendaftar, dan 402 pada Pesan Masuk. Yang terakhir
memang tidak dapat dibuat tepat: panjang badan pesan tidak diketahui sebelum
pesannya datang.

### Menu terpilih di panel tidak terlihat: dua warna yang bernilai sama

`--color-biru` dan `--color-biru-tua` sempat bernilai sama, `#0f2a4a`.
Akibatnya tidak tampak sebagai salah warna, melainkan sebagai fitur yang
hilang: latar menu terpilih di panel memakai `bg-biru` sedangkan sidebar-nya
`bg-biru-tua`, jadi menu yang sedang dibuka melebur ke latarnya dan tidak
terlihat sama sekali. Lima belas tombol yang memakai `hover:bg-biru-tua` juga
berhenti menanggapi kursor.

`--color-biru-tua` sekarang `#0a1c31`: rona dan kepekatan yang sama, hanya
lebih gelap, hsl(212, 66%, 17,5%) menjadi hsl(212, 66%, 11,5%). Warna utamanya
tetap seperti yang dipilih, yang dikembalikan hanya selisihnya.

Selisih kepekatan pada warna yang sudah gelap memang tipis: terukur 1,19:1,
atau ΔL* 6,8. Itu terlihat, tetapi tidak boleh menjadi satu-satunya penanda.
Karena itu menu terpilih juga diberi **penanda emas di tepi kirinya**,
sehingga terbaca dari bentuknya dan bukan dari warnanya saja: tetap jelas bagi
yang sukar membedakan warna, dan pada layar murah yang kontrasnya rendah.

Diperiksa ulang lewat peramban: latar menu terpilih benar-benar berbeda dari
latar sidebar, penanda emasnya ada dan hanya satu di seluruh sidebar, tombol
biru berubah warna saat disorot kursor, dan tidak ada satu pun tulisan
berkontras rendah di atas kesebelas bidang berlatar `biru-tua` pada beranda.
Pengukuran kontrasnya menggambar warna ke kanvas lalu membaca pikselnya, bukan
mengurai teks warnanya: `getComputedStyle` mengembalikan `oklab(...)` untuk
kelas seperti `text-white/90`, dan warna beralfa harus ditumpuk dulu di atas
latarnya.

### S. Sekolah asal harus ada, bukan sekolah khayalan

Nama SMP asal dulu diketik bebas. Yang diperiksa hanya kewajaran tulisannya
(lihat `teksWajar` pada `validasi.go`): huruf yang berulang tiga kali, tanpa
huruf hidup, dan sejenisnya. Itu menangkap "aaaa" dan "asdasd", tetapi TIDAK
menangkap "SMP Negeri 99 Antartika", yang tulisannya wajar tetapi sekolahnya
tidak ada.

**Yang perlu diluruskan lebih dulu, sebab menentukan bentuk seluruh
rancangannya: tidak ada API resmi yang dapat dipanggil untuk memastikan sebuah
sekolah benar-benar ada.** Laman Referensi Kemendikbud memuat seluruh NPSN
tetapi tidak menyediakan API yang boleh dipakai program lain; Dapodik hanya
terbuka bagi sekolah lewat akunnya sendiri; dan API pihak ketiga yang tidak
resmi tidak dapat dijadikan tumpuan sistem penerimaan sekolah, sebab ia bisa
mati kapan saja, tepat pada masa PPDB.

Karena itu rujukannya disimpan sendiri di tabel `sekolah_referensi`, diisi
sekolah dari data resmi yang mereka unduh untuk wilayahnya, lewat menu
**Sekolah Asal** di panel.

**Selama daftar itu kosong, pemeriksaannya tidak berjalan sama sekali** dan
formulirnya bekerja seperti sebelumnya. Itu disengaja: memaksa pencocokan ke
daftar yang belum diisi berarti menolak seluruh pendaftar.

Pada formulir, kolom nama sekolah mencari sambil diketik. Memilih dari daftar
mengisi nama DAN NPSN sekaligus dari satu baris data yang sama, sehingga
keduanya tidak mungkin saling tidak cocok; mengetik keduanya sendiri hampir
selalu menghasilkan salah satu yang salah.

Lima keadaan saat formulir dikirim, dan masing-masing menghasilkan pesan yang
menyebut apa yang harus dibetulkan:

| Keadaan | Hasil |
|---|---|
| Daftar rujukan kosong | Diterima, tidak ada yang diperiksa |
| NPSN ada, namanya cocok | Diterima, ditandai cocok |
| NPSN ada, namanya lain | Ditolak, pesannya MENYEBUTKAN nama yang terdaftar untuk NPSN itu |
| Nama ada, NPSN-nya tidak | Ditolak pada kolom NPSN, pesannya menyebutkan NPSN yang benar |
| Dua-duanya tidak ada | Ditolak, kecuali pendaftar menyatakan sekolahnya tidak terdaftar |

Pernyataan pada keadaan terakhir itu perlu, dan bukan kelonggaran yang asal:
daftar rujukan tidak akan pernah lengkap. Ada sekolah baru, ada pendaftar dari
luar wilayah, dan ada yang dari pendidikan kesetaraan. Yang menyatakan begitu
tetap diterima, tetapi ditandai `asal_sekolah_terdaftar = false`, dan
penandanya tampil pada rincian pendaftar sebagai "Tidak, periksa manual dari
ijazah". Jadi yang memutuskan tetap panitia, dengan ijazah yang sudah diunggah
di tangan.

Nama yang sama sering ditulis berbeda-beda, dan itu ikut diurus:
"SMP Negeri 1 Legok", "SMPN 1 Legok", "SMP N 1 Legok", dan "Sekolah Menengah
Pertama Negeri 1 Legok" dianggap satu sekolah, sedangkan "SMP Negeri 1 Legok"
dan "SMP Negeri 2 Legok" tetap berbeda. Sepuluh uji satuan mengunci perilaku
itu.

Impornya menerima TEMPELAN TEKS, bukan unggahan berkas, dan itu pilihan yang
sadar: panitia menyalin dari Excel atau dari laman Referensi Kemendikbud, dan
menempel jauh lebih mudah daripada menyimpan berkas lalu mengunggahnya.
Pemisahnya dikenali sendiri (titik koma, tab, atau koma), baris kepala tabel
dilewati, dan baris yang salah tidak menghentikan impor: yang salah
dilaporkan beserta nomor barisnya, sebab satu baris rusak di tengah berkas
tidak boleh membuang sembilan ratus baris yang benar.

Diuji dari ujung ke ujung pada basis data sekali pakai: kelima keadaan di atas
lewat pengiriman formulir yang sungguhan beserta berkas unggahannya; impor
dengan dua baris rusak yang dilaporkan beserta nomornya; dan pencarian yang
diam selama kata kuncinya kurang dari tiga huruf. Antarmukanya diuji lewat
peramban, sebelas pemeriksaan: saran yang muncul, pengisian nama beserta NPSN
sekaligus, centang pernyataan yang hanya ditawarkan bila memang perlu, dan
pemilihan lewat panah bawah beserta Enter. Panelnya tujuh pemeriksaan.

### Diagram lingkaran: tepi yang terpotong, dan nilai saat disorot

Dua hal yang dilaporkan user pada diagram di panel dasbor.

**Tepinya terpotong rata di keempat sisi.** Jari-jari lingkarannya 15,9155
satuan, ditambah separuh ketebalan garis 9 membuat tepi luar busurnya berada
di 20,4 dari pusat, sedangkan kotak gambarnya (`viewBox="0 0 40 40"`) hanya
sampai 20. Jadi 0,4 satuan terluar memang di luar kotak dan dipangkas
peramban. Kotaknya sekarang 42 satuan (`viewBox="-1 -1 42 42"`), bukan
jari-jarinya yang dikecilkan: angka 15,9155 itu 100/(2π), yang membuat keliling
lingkarannya tepat 100 sehingga panjang tiap busur dapat dituliskan langsung
sebagai persennya, dan mengubahnya berarti membawa kembali perhitungan
keliling yang justru mau dihindari.

**Nilainya muncul saat kursor diarahkan ke irisannya.** Yang disorot menebal
dan pekat penuh, yang lain diredupkan, dan angka di tengah lingkarannya
berganti dari total menjadi nilai irisan itu beserta persen dan namanya. Baris
keterangan di sebelahnya ikut tersorot, dan sebaliknya: menyorot barisnya juga
menyorot irisannya.

Karena itu komponennya sekarang komponen klien, yang sebelumnya sengaja
dihindari supaya dapat dipakai di komponen server. Satu-satunya pemakainya
panel dasbor yang memang komponen klien, jadi tidak ada yang hilang; dan bila
kelak dipakai di halaman yang dirender server, angkanya tetap tergambar utuh
pada HTML pertama, yang menuntut JavaScript hanya sorotannya.

Sorotannya HANYA untuk tetikus, diperiksa lewat `pointerType`. Pada layar
sentuh, `pointerenter` terpicu sekali lalu tertinggal menyala karena tidak ada
`pointerleave`, sehingga angka di tengahnya akan terkunci pada irisan yang
terakhir disentuh. Di layar sentuh nilainya sudah tertulis lengkap pada daftar
keterangan di sebelahnya, jadi tidak ada yang hilang.

Diuji lewat peramban sungguhan: ketiga diagram terbukti tidak lagi terpotong
(dihitung dari viewBox, jari-jari, dan ketebalan garisnya), kursor yang
diarahkan ke irisan terbesar memunculkan 70, 49%, dan "Beranda" di tengahnya,
kursor yang keluar mengembalikannya ke total, dan peristiwa sentuh sungguhan
tidak mengunci sorotannya.

### Kepala keamanan HTTP

Sebelumnya tidak ada satu pun, jadi peramban tidak diberi tahu apa pun tentang
batasan situs ini: boleh dibingkai situs lain, boleh menebak jenis berkas dari
isinya, dan boleh memuat skrip dari mana saja.

Dipasang di DUA tempat, dengan isi yang berbeda, sebab yang dilayani berbeda.

**Halaman Next** (`next.config.ts`): CSP `default-src 'self'` beserta
`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`,
`object-src 'self' blob:`, ditambah `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` yang mematikan kamera, mikrofon, lokasi, pembayaran, dan
USB, serta HSTS setahun pada build produksi.

Alamat API ikut disebut pada `connect-src` dan `img-src` karena backend berada
di asal yang berbeda: porta lain saat di komputer sendiri, subdomain lain di
server. Tanpa itu seluruh permintaan data dan seluruh foto yang dilayani
backend akan diblokir peramban. Nilainya dibaca dari `NEXT_PUBLIC_API_URL`
saat build, jadi tidak perlu disunting saat pindah ke server.

**Jawaban API** (lapisan `kepalaKeamanan`): CSP paling sempit yang mungkin,
`default-src 'none'`, sebab jawaban API tidak pernah boleh memuat apa pun.
`Referrer-Policy: no-referrer`, bukan strict-origin, karena alamat API memuat
nomor registrasi dan id pendaftar pada jalurnya dan itu tidak boleh ikut
terkirim ke situs lain. `nosniff` di sini penting tersendiri: dokumen
pendaftar diunggah orang luar, dan tanpa kepala itu berkas yang isinya HTML
dapat terbaca sebagai halaman pada asal backend.

Yang TIDAK diperketat sekarang, dan alasannya, supaya tidak terbaca sebagai
kelalaian:

- `script-src` masih memuat `'unsafe-inline'`. Next menyisipkan skrip sebaris
  untuk hidrasi, dan tanpa izin itu seluruh halaman berhenti bekerja. Yang
  benar nonce per permintaan, dan itu menuntut middleware Next tersendiri.
  Pekerjaan berikutnya, bukan sesuatu yang dilupakan.
- `style-src` juga, sebab React menulis gaya sebaris pada beberapa komponen,
  misalnya pergeseran karusel berita.
- `blob:` diizinkan pada `object-src`, `frame-src`, dan `media-src`. Bukti
  pendaftaran, kartu peserta, dan dokumen pendaftar diminta lewat fetch
  (alamatnya POST, atau memerlukan token petugas) lalu dibuka sebagai blob.
  Dokumen blob mewarisi CSP halaman yang membuatnya, jadi tanpa izin itu tab
  PDF-nya tampil kosong.
- `frame-src` juga memuat `https://maps.google.com` dan
  `https://www.google.com`, sebab peta lokasi sekolah disematkan sebagai
  iframe Google Maps dari pengaturan `peta_embed`. Yang diizinkan HANYA kedua
  tuan rumah itu, dan itu sekaligus membatasi akibatnya bila kode sematan yang
  ditempel panitia ternyata menunjuk ke tempat lain. Kode sematan dari
  penyedia peta yang lain akan diblokir sampai tuan rumahnya ditambahkan di
  sini.

**Kepala ini sempat mematikan peta lokasi di beranda**, dan uji CSP yang
pertama tidak menangkapnya. Pendengar `securitypolicyviolation` waktu itu
dipasang dengan `document.addEventListener` SESUDAH halaman dimuat, lalu
halamannya dimuat ulang; berpindah halaman membuang seluruh pendengar,
sehingga pelanggaran yang terjadi saat memuat tidak pernah tertangkap dan
ujinya melaporkan nol pelanggaran padahal kotak petanya kosong. Uji yang
sekarang memasang pendengarnya lewat `Page.addScriptToEvaluateOnNewDocument`,
yang dijalankan peramban sebelum skrip halaman pada setiap dokumen baru.

Dengan uji yang benar itu: nol pelanggaran pada 17 halaman publik, nol pada 22
halaman panel, nol pada alur cek status termasuk unduh bukti PDF, dan nol saat
dokumen PDF pendaftar dibuka dari panel sebagai blob. Tidak ada satu pun
gambar yang gagal dimuat, dan peta di beranda maupun di halaman Kontak
terpasang beserta petaknya, diperiksa lewat tangkapan layar.

---

## Basis Data (22 tabel)

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

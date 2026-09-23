# Panduan Instalasi

Panduan memasang dan menjalankan sistem Profil Sekolah & PPDB SMA IMTEK.

Aplikasi terdiri dari dua bagian:

- **backend**, API JSON ditulis dengan Go, berbicara dengan PostgreSQL
- **frontend**, situs dan panel admin ditulis dengan Next.js

Keduanya dijalankan terpisah. Frontend memanggil backend lewat HTTP, jadi
alamat backend harus dapat dijangkau dari peramban pengunjung.

---

## 1. Yang perlu dipasang lebih dulu

| Perangkat | Versi | Keterangan |
|---|---|---|
| **Go** | 1.24 atau lebih baru | [go.dev/dl](https://go.dev/dl/) |
| **Node.js** | 20 atau lebih baru | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | 14 atau lebih baru | [postgresql.org/download](https://www.postgresql.org/download/). Postgres.app dan pemasang resmi keduanya cukup |

Memeriksa hasil pemasangan:

```bash
go version      # contoh: go version go1.27.1
node -v         # contoh: v20.11.0
psql --version
```

Untuk melihat isi basis datanya, **DBeaver** dapat dipakai sebagai penjelajah
tabel: buat sambungan PostgreSQL baru, isikan host, porta, nama basis data,
pengguna, dan sandi yang sama dengan `.env` di bawah.

---

## 2. Menyiapkan basis data

Cukup membuat basis datanya saja. Tabel dan data awalnya dibuat otomatis oleh
backend saat pertama kali dijalankan.

Untuk pemakaian sungguhan, buatkan pengguna basis data tersendiri, jangan
memakai `postgres`. Jalankan lewat `psql -U postgres`:

```sql
CREATE ROLE ppdb LOGIN PASSWORD 'sandi-yang-panjang-dan-acak';
CREATE DATABASE sma_imtek OWNER ppdb ENCODING 'UTF8';
```

Pengguna itu perlu menjadi pemilik basis datanya, karena migrasi membuat
tabel, indeks, fungsi, dan pemicu. Bila basis datanya sudah ada dan pemiliknya
orang lain, berikan haknya secara terpisah:

```sql
GRANT ALL ON SCHEMA public TO ppdb;
```

Sekadar membuat basis data sudah cukup: tabel dan data awalnya dibuat oleh
backend saat pertama kali dijalankan.

---

## 3. Menjalankan backend

```bash
cd backend
cp .env.example .env
```

Buka `.env` dan sesuaikan:

```ini
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=sma_imtek
DB_USER=ppdb
DB_PASS=sandi-yang-panjang-dan-acak

# disable saat di komputer sendiri, require bila basis datanya terpisah
DB_SSLMODE=disable

# Kosongkan bila panitia mengirim WhatsApp sendiri lewat tautan yang disiapkan
# sistem. Isi hanya bila sekolah sudah punya WhatsApp Business API resmi.
# WA_GATEWAY_URL=
# WA_GATEWAY_TOKEN=

# Kunci penanda tangan token masuk. Buat nilai acak:
#   openssl rand -base64 48
JWT_SECRET=

APP_ENV=pengembangan
PORT=8090
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
UPLOAD_DIR=data/unggahan
UPLOAD_MAX_BYTES=2097152
```

Lalu jalankan:

```bash
go run .
```

Tampilan yang menandakan berhasil:

```
menjalankan migrasi 001_skema.sql
server berjalan di :8090 (lingkungan: pengembangan)
```

Memastikan hidup: buka `http://localhost:8090/api/sehat`, harus menjawab
`{"status":"baik"}`.

> **Berkas `.env` tidak ikut ke repositori** karena repositori ini publik.
> Jangan pernah menulis kredensial sungguhan ke `.env.example`.

---

## 4. Menjalankan frontend

Pada jendela terminal yang berbeda:

```bash
cd frontend
npm install
```

Buat berkas `.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8090
```

Lalu jalankan:

```bash
npm run dev
```

Buka `http://localhost:3000`.

| Bagian | Alamat |
|---|---|
| Situs sekolah | `http://localhost:3000` |
| Panel panitia | `http://localhost:3000/admin` |

**Akun bawaan:** `admin` / `admin123`

---

## 4b. Menjalankan dari VS Code, tanpa mengetik di terminal

Repositori ini sudah memuat setelan VS Code, sehingga seluruh perintah di
bagian 3 dan 4 dapat dijalankan lewat menu.

**Sekali saja, saat pertama kali:**

1. Pasang **Visual Studio Code** dari <https://code.visualstudio.com>. Unduh
   versi **Apple Silicon** bila Mac Anda memakai cip M1 sampai M4, atau
   **Intel** bila bukan. Seret berkasnya ke folder Applications.
2. Buka VS Code, pilih **File > Open Folder**, lalu pilih folder
   `pkm-sma-imtek`.
3. VS Code akan menawarkan memasang beberapa ekstensi yang disarankan proyek
   ini. Tekan **Install**. Daftarnya ada di `.vscode/extensions.json`: Go,
   Tailwind CSS IntelliSense, ESLint, dan beberapa lainnya.
4. Buka sekali saja terminal di dalam VS Code lewat **Terminal > New
   Terminal**, lalu jalankan `cd frontend && npm install`. Langkah ini hanya
   diperlukan sekali, dan sesudahnya tidak ada lagi perintah yang perlu
   diketik.

**Sehari-hari:** buka menu **Terminal > Run Task**, lalu pilih tugasnya.

| Tugas | Gunanya |
|---|---|
| Jalankan semua (PostgreSQL + backend + situs) | Menyalakan ketiganya berurutan. Juga terpasang sebagai tugas bawaan, jadi cukup tekan **Cmd+Shift+B** |
| Buka situs di peramban | Membuka `http://localhost:3000` |
| Buka panel panitia di peramban | Membuka `http://localhost:3000/admin` |
| Hentikan semua (porta 3000, 8090) | Menghentikan backend dan situs |
| Periksa seluruh kode | Menjalankan `gofmt`, `go vet`, `tsc`, dan `eslint` sekaligus |
| Bangun situs untuk server | `npm run build`, dipakai sebelum memindahkan ke server |

Backend dan situs berjalan di panel terminalnya masing-masing di dalam VS
Code, jadi catatannya tetap terlihat dan dapat dihentikan dengan menutup
panelnya.

**Menelusuri kode dengan titik henti:** buka panel **Run and Debug** di bilah
kiri, pilih **Backend + situs**, lalu tekan **F5**. Titik henti dipasang
dengan mengeklik nomor baris. Untuk backend Go, ekstensi Go akan menawarkan
memasang penelusur `dlv` sekali di awal; terima tawarannya.

**Melihat isi basis data:** ekstensi PostgreSQL yang disarankan dapat dipakai
langsung dari VS Code. Sambungannya: host `127.0.0.1`, porta `5432`, basis
data `sma_imtek`, beserta pengguna dan sandi yang sama dengan `backend/.env`.
DBeaver tetap dapat dipakai bila lebih terbiasa.

Go, Node, dan `psql` pada komputer pembuat tidak terpasang di folder sistem,
sehingga setiap tugas dan terminal di dalam VS Code menambahkan sendiri
letaknya ke `PATH`. Itu diatur di `.vscode/tasks.json` dan
`.vscode/settings.json`, dan sudah mencakup pemasangan lewat Homebrew, jadi
komputer rekan satu tim tidak perlu disetel ulang.

Dua setelan tambahan diperlukan karena alasan yang mudah terlewat: mengubah
`PATH` terminal saja tidak cukup, sebab ekstensi Go dan ESLint mencari binernya
di `PATH` proses VS Code, dan VS Code yang dibuka dari Finder tidak mewarisi
`PATH` dari profil shell. Karena itu `settings.json` juga menunjuk langsung
`go.goroot` dan `eslint.runtime`. Tanpa keduanya, ekstensi Go melaporkan
"go not found" dan ESLint mati tanpa pesan, padahal keduanya terpasang.
Komputer yang memasang Go dan Node lewat Homebrew tidak memerlukan dua baris
itu dan cukup menghapusnya.

---

## 5. Hal pertama yang wajib dilakukan

1. **Ganti kata sandi `admin`** lewat menu *Ganti Sandi*. Hash sandi bawaan ada
   di dalam repositori publik ini, jadi selama belum diganti, siapa pun yang
   menemukan alamat panel dapat masuk.
2. **Isi menu Pengaturan.** Seluruh isi situs publik berasal dari sana. Nilai
   yang masih berupa tulisan dalam `[kurung siku]` adalah data yang belum
   dikonfirmasi pihak sekolah, dan ditandai jelas pada halaman Pengaturan.
3. **Atur jadwal PPDB** (`ppdb_mulai`, `ppdb_selesai`, `ppdb_pengumuman`) dan
   ubah `ppdb_status` menjadi `buka` saat pendaftaran benar-benar dimulai.
   Status `tutup` menutup jalur API-nya sekaligus, bukan hanya menyembunyikan
   tombolnya.
4. **Buat akun operator** untuk panitia lain, supaya akun admin tidak dipakai
   bersama-sama.
5. **Unggah gambar sekolah** pada bagian *Gambar* di menu *Pengaturan*: logo,
   foto halaman depan, foto kepala sekolah, dan bagan struktur organisasi.
   Selama fotonya belum ada, halaman publik menampilkan kerangka berukuran
   sama yang menyebutkan perbandingan sisi dan ukuran piksel yang diharapkan,
   jadi tata letaknya tidak berubah setelah fotonya diunggah.
6. **Isi menu Profil Sekolah, Akademik, dan Kesiswaan** di panel:

   | Menu panel | Mengisi halaman publik |
   |---|---|
   | *Halaman Profil* | Kurikulum, OSIS, Pendidikan Karakter. Ketiganya sudah tersedia sebagai kerangka dan menunggu naskah dari sekolah |
   | *Tenaga Pendidik* | Halaman Tenaga Pendidik; yang berkategori Pimpinan juga tampil pada halaman Struktur Organisasi |
   | *Kalender Akademik* | Halaman Kalender Akademik |
   | *Kegiatan Siswa* | Halaman Ekstrakurikuler |
   | *Perpustakaan* | Halaman Perpustakaan Digital |

   Prestasi Siswa tidak punya menu sendiri: tulis capaiannya lewat menu
   *Berita* dengan kategori **Prestasi**, dan halaman Prestasi Siswa
   mengambilnya dari sana.
7. **Ketahui apa yang diperiksa sistem pada NISN dan NIK.** Sistem ini
   **tidak** mencocokkan keduanya ke basis data pemerintah, dan panitia
   sebaiknya tidak menjanjikan begitu kepada orang tua. NIK hanya dapat
   diperiksa ke Dukcapil lewat perjanjian kerja sama resmi, dan laman
   pencarian NISN Kemendikbud tidak menyediakan API untuk program lain.
   PDDIKTI juga bukan sumber yang tepat, karena isinya data pendidikan tinggi.

   Yang diperiksa sistem: strukturnya, beserta kecocokannya dengan tanggal
   lahir dan jenis kelamin yang diisi pendaftar. Itu cukup menangkap satu
   angka yang tertukar, digit yang kurang, atau NISN yang diketik pada kolom
   NIK, dan pesannya menyebut bagian mana yang salah. Verifikasi sebenarnya
   tetap dilakukan panitia dengan membandingkan Kartu Keluarga dan rapor yang
   diunggah.
8. **Isi `tautan_elearning` dan `tautan_jadwal`** pada menu *Pengaturan* bila
   sekolah sudah memakai layanan belajar daring, misalnya Google Classroom
   atau Moodle, dan sudah punya berkas jadwal pelajaran. Keduanya berupa
   pintu masuk ke layanan yang sudah ada, bukan sistem yang dibangun di sini.
   Dibiarkan kosong, halamannya menjelaskan bahwa layanannya belum tersedia,
   bukan menampilkan tautan mati.

---

## 6. Menyiapkan untuk server (produksi)

### 6a. Backend

Kompilasi menjadi satu berkas biner, lalu pindahkan ke server:

```bash
cd backend
go build -o server .

# Untuk server Linux dari komputer Windows atau macOS:
GOOS=linux GOARCH=amd64 go build -o server .
```

Berkas yang perlu dipindah ke server: `server` dan folder `migrations/`.
Selain itu tidak ada, karena Go tidak memerlukan penerjemah bahasa di server.

Setel variabel lingkungan untuk produksi:

```ini
APP_ENV=produksi
JWT_SECRET=<hasil openssl rand -base64 48>
CORS_ORIGINS=https://www.smaimtek.sch.id
DB_PASS=<sandi basis data>
UPLOAD_DIR=/var/lib/ppdb/unggahan
```

`JWT_SECRET` **wajib** diisi saat `APP_ENV=produksi`; bila kosong, server
menolak menyala. Ini disengaja agar kunci contoh tidak ikut terpakai.

Agar berjalan terus dan hidup kembali setelah server dimulai ulang, buat
layanan systemd di `/etc/systemd/system/ppdb.service`:

```ini
[Unit]
Description=API PPDB SMA IMTEK
After=network.target postgresql.service

[Service]
Type=simple
User=ppdb
WorkingDirectory=/opt/ppdb
EnvironmentFile=/etc/ppdb.env
ExecStart=/opt/ppdb/server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo chmod 600 /etc/ppdb.env        # memuat kredensial
sudo systemctl enable --now ppdb
sudo systemctl status ppdb
```

### 6b. Frontend

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=https://api.smaimtek.sch.id" > .env.production
npm ci
npm run build
npm run start      # jalan di porta 3000
```

Frontend memerlukan Node.js di server karena halaman publiknya dirakit di sisi
server. Itulah yang membuat judul dan keterangan halaman terbaca oleh mesin
pencari dan oleh pratinjau tautan WhatsApp. Tanpa itu, tujuan promosi proyek
ini justru berkurang.

Bila ingin dipasang di layanan yang tidak menyediakan Node.js, frontend dapat
diubah menjadi berkas statis, tetapi halaman publiknya kehilangan kemampuan
tersebut.

### 6c. Proksi dan HTTPS

Letakkan keduanya di belakang satu nama domain memakai Nginx:

```nginx
server {
    listen 443 ssl;
    server_name www.smaimtek.sch.id;

    # sertifikat dari Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/www.smaimtek.sch.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.smaimtek.sch.id/privkey.pem;

    # batas ukuran kiriman: enam dokumen × 2 MB, dilebihkan sedikit
    client_max_body_size 16m;

    # API dan berkas unggahan ke backend Go
    location /api/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    location /unggahan/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    # sisanya ke Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Dengan susunan ini, `NEXT_PUBLIC_API_URL` cukup diisi
`https://www.smaimtek.sch.id`, dan `CORS_ORIGINS` diisi nilai yang sama.

`X-Forwarded-For` perlu diteruskan agar pembatas percobaan masuk membaca
alamat IP pengunjung yang sebenarnya, bukan alamat proksi.

---

## 6c. Menyalakan tes seleksi online

Tes seleksi tertutup sampai tiga hal dipenuhi. Urutannya memang begitu, supaya
tes tidak pernah terbuka sebelum soalnya siap.

1. **Isi bank soal** lewat menu *Bank Soal* di panel. Soal yang berkeadaan
   aktif itulah yang dapat terpilih.
2. **Buat paket ujian** lewat menu *Tes Seleksi*: nama, lama pengerjaan,
   jumlah soal per peserta, nilai minimum, dan jadwalnya. Paket tidak dapat
   diaktifkan bila jumlah soal yang diminta melebihi jumlah soal aktif; pesan
   penolakannya menyebutkan angka yang tersedia.
3. **Setel `ujian_aktif` menjadi `1`** pada menu *Pengaturan*. Ini saklar
   induknya, supaya tes dapat ditutup seketika tanpa mengubah paketnya.

Sesudah itu pendaftar yang berkasnya sudah diverifikasi melihat ajakan
mengerjakan tes pada halaman Cek Status.

Yang perlu diketahui sebelum hari pelaksanaan:

- Waktu dihitung server. Peserta yang memuat ulang halaman tidak mendapat
  tambahan waktu, dan jawaban yang datang sesudah batas waktunya tertolak.
- Jawaban tersimpan satu per satu begitu dipilih. Jaringan yang terputus di
  tengah jalan tidak menghanguskan yang sudah dijawab.
- Waktu yang habis menutup sesinya sendiri dan tetap menilai jawaban yang ada.
- Soal yang sudah dipakai pada sebuah sesi tidak dapat dihapus, hanya
  dinonaktifkan, supaya hasil peserta tetap dapat ditelusuri.

---

## 7. Mencadangkan data

Dua hal yang harus dicadangkan bersamaan:

```bash
# 1. Basis data
pg_dump -U ppdb -Fc sma_imtek > cadangan-$(date +%F).dump

# 2. Folder unggahan, memuat dokumen pribadi pendaftar
tar czf unggahan-$(date +%F).tar.gz -C /var/lib/ppdb unggahan
```

Berkas cadangan memuat NIK, Kartu Keluarga, dan akta kelahiran calon peserta
didik. Simpan di tempat yang aksesnya terbatas, dan jangan diunggah ke layanan
penyimpanan bersama tanpa izin sekolah.

---

## 8. Bila ada masalah

| Gejala | Penyebab yang paling sering |
|---|---|
| `basis data tidak merespons` saat backend menyala | PostgreSQL belum jalan, atau `DB_USER`/`DB_PASS`/`DB_NAME` salah |
| `SSL is not enabled on the server` | Setel `DB_SSLMODE=disable` bila basis datanya di komputer yang sama |
| Nilai di `.env` sepertinya diabaikan | Variabel lingkungan yang sudah tersetel mengalahkan isi `.env`. Ini disengaja, agar kredensial dari layanan hosting menang. Periksa dengan `env \| grep DB_` |
| `JWT_SECRET wajib diisi saat APP_ENV=produksi` | Isi `JWT_SECRET` dengan nilai acak |
| Halaman tampil, tetapi semua data kosong dan muncul keterangan "server belum merespons" | Backend mati, atau `NEXT_PUBLIC_API_URL` salah |
| Formulir gagal terkirim dengan pesan "tidak dapat menghubungi server" | Asal frontend belum tercantum di `CORS_ORIGINS`. Perhatikan bahwa `localhost` dan `127.0.0.1` dihitung sebagai dua asal berbeda |
| Unggahan gagal dengan pesan ukuran berlebihan | Naikkan `UPLOAD_MAX_BYTES`, dan `client_max_body_size` pada Nginx |
| Gambar berita atau galeri tidak muncul | `UPLOAD_DIR` berbeda dari saat berkasnya diunggah, atau folder itu tidak dapat dibaca pengguna layanan |
| Dokumen pendaftar menghasilkan 401 | Wajar: dokumen pribadi hanya dapat dibuka petugas yang sudah masuk |
| Perubahan dari panel admin belum tampak di situs publik | Tunggu paling lama 30 detik, atau muat ulang. Penyegaran seketika memerlukan frontend dan backend berada pada asal yang tercantum di `CORS_ORIGINS` |
| Migrasi berhenti dengan `relation ... already exists` | Terjadi pada versi lama. Sekarang basis data yang sudah berisi tabel aplikasi dikenali dan dilewati |

Melihat catatan server:

```bash
sudo journalctl -u ppdb -f      # backend
```

---

## 9. Pindah dari versi PHP

Versi PHP memakai MySQL, versi Go memakai PostgreSQL. Datanya **tidak**
berpindah sendiri, jadi ada satu langkah tambahan.

Nama tabel dan nama kolom kedua skema sengaja dibuat sama, sehingga yang perlu
diterjemahkan hanya tiga hal: `tinyint(1)` menjadi `boolean`, `enum` menjadi
`varchar` beserta `CHECK`, dan `datetime` yang tanpa zona waktu menjadi
`timestamptz`. Alat di `alat/pindah-mysql/` mengerjakan ketiganya.

Urutannya:

```bash
# 1. Jalankan backend Go sekali agar skema dan data awalnya terbentuk.
cd backend && go run .        # tunggu "server berjalan", lalu Ctrl-C

# 2. Pindahkan isi basis data lama.
cd ../alat/pindah-mysql
MYSQL_DSN='root:sandi@tcp(127.0.0.1:3306)/sma_imtek' \
PG_DSN='postgres://ppdb:sandi@127.0.0.1:5432/sma_imtek?sslmode=disable' \
KOSONGKAN=1 go run .

# 3. Pindahkan berkas unggahannya.
cp -r ../../legacy-php/uploads/berita     /var/lib/ppdb/unggahan/berita
cp -r ../../legacy-php/uploads/galeri     /var/lib/ppdb/unggahan/galeri
cp -r ../../legacy-php/uploads/pendaftar  /var/lib/ppdb/unggahan/pendaftar
```

Nama berkas pada basis data tidak berubah, jadi gambar dan dokumen langsung
terbaca setelah dipindah. Folder `fasilitas` dibuat otomatis saat gambar
fasilitas pertama diunggah.

Yang perlu diketahui tentang alat itu:

- `KOSONGKAN=1` **menghapus isi** delapan tabel tujuan lebih dulu. Pakai hanya
  pada basis data PostgreSQL yang baru dibuat. Tanpa pilihan ini alat berhenti
  dan tidak mengubah apa pun, supaya basis data yang sudah dipakai sekolah
  tidak tertimpa karena salah ketik.
- Tabel `pengaturan` dikecualikan: isinya ditimpa per kunci, bukan diganti
  seluruhnya. Sebabnya versi Go menambah dua belas kunci pengaturan yang belum
  ada pada versi PHP, misalnya `sambutan_kepsek`, `jam_layanan`, dan
  `peta_embed`. Bila tabel itu dikosongkan, kunci-kunci tersebut hilang dan
  sekolah tidak akan bisa mengisinya dari halaman Pengaturan, karena halaman
  itu hanya menampilkan kunci yang barisnya ada.
- Nilai `id` lama dipertahankan agar tabel yang saling menunjuk tetap
  tersambung, dan pencacah `id` disetel ulang ke nilai tertinggi ditambah satu
  supaya baris berikutnya tidak bertabrakan.
- Akun dan sandinya ikut berpindah. Hash bcrypt dari versi PHP tetap berlaku,
  jadi sandi yang sudah dipakai panitia tidak berubah.
- `PAKSA=1` menambahkan di atas isi yang sudah ada, tanpa mengosongkan. Berguna
  bila datanya dipindahkan sebagian, tetapi berisiko menggandakan baris.

Perpindahan ini sudah diuji terhadap basis data MySQL yang berisi 68 baris pada
sembilan tabel: seluruh barisnya masuk, kolom boolean dan enum terbaca benar,
tanggal tidak bergeser zona waktunya, panitia dapat masuk memakai sandi lama,
dan bukti pendaftaran PDF terbit dari data hasil pindahan.

# Panduan Instalasi

Panduan memasang dan menjalankan sistem Profil Sekolah & PPDB SMA IMTEK.

Aplikasi terdiri dari dua bagian:

- **backend** — API JSON ditulis dengan Go, berbicara dengan MySQL
- **frontend** — situs dan panel admin ditulis dengan Next.js

Keduanya dijalankan terpisah. Frontend memanggil backend lewat HTTP, jadi
alamat backend harus dapat dijangkau dari peramban pengunjung.

---

## 1. Yang perlu dipasang lebih dulu

| Perangkat | Versi | Keterangan |
|---|---|---|
| **Go** | 1.24 atau lebih baru | [go.dev/dl](https://go.dev/dl/) |
| **Node.js** | 20 atau lebih baru | [nodejs.org](https://nodejs.org/) |
| **MySQL** atau **MariaDB** | MySQL 8+ / MariaDB 10.4+ | Boleh dari XAMPP, Laragon, atau pemasangan sendiri |

Memeriksa hasil pemasangan:

```bash
go version      # contoh: go version go1.27.1
node -v         # contoh: v20.11.0
mysql --version
```

---

## 2. Menyiapkan basis data

Cukup membuat basis datanya saja. Tabel dan data awalnya dibuat otomatis oleh
backend saat pertama kali dijalankan.

```sql
CREATE DATABASE sma_imtek
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Bila memakai XAMPP, jalankan perintah di atas lewat **phpMyAdmin → SQL**.

Untuk pemakaian sungguhan, buatkan pengguna basis data tersendiri, jangan
memakai `root`:

```sql
CREATE USER 'ppdb'@'localhost' IDENTIFIED BY 'sandi-yang-panjang-dan-acak';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER
  ON sma_imtek.* TO 'ppdb'@'localhost';
FLUSH PRIVILEGES;
```

Hak `CREATE`, `INDEX`, dan `ALTER` diperlukan agar migrasi dapat berjalan.

---

## 3. Menjalankan backend

```bash
cd backend
cp .env.example .env
```

Buka `.env` dan sesuaikan:

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sma_imtek
DB_USER=ppdb
DB_PASS=sandi-yang-panjang-dan-acak

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
After=network.target mysql.service

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
server — itulah yang membuat judul dan keterangan halaman terbaca oleh mesin
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

## 7. Mencadangkan data

Dua hal yang harus dicadangkan bersamaan:

```bash
# 1. Basis data
mysqldump -u ppdb -p sma_imtek > cadangan-$(date +%F).sql

# 2. Folder unggahan — memuat dokumen pribadi pendaftar
tar czf unggahan-$(date +%F).tar.gz -C /var/lib/ppdb unggahan
```

Berkas cadangan memuat NIK, Kartu Keluarga, dan akta kelahiran calon peserta
didik. Simpan di tempat yang aksesnya terbatas, dan jangan diunggah ke layanan
penyimpanan bersama tanpa izin sekolah.

---

## 8. Bila ada masalah

| Gejala | Penyebab yang paling sering |
|---|---|
| `basis data tidak merespons` saat backend menyala | MySQL belum jalan, atau `DB_USER`/`DB_PASS` salah |
| `JWT_SECRET wajib diisi saat APP_ENV=produksi` | Isi `JWT_SECRET` dengan nilai acak |
| Halaman tampil, tetapi semua data kosong dan muncul keterangan "server belum merespons" | Backend mati, atau `NEXT_PUBLIC_API_URL` salah |
| Formulir gagal terkirim dengan pesan "tidak dapat menghubungi server" | Asal frontend belum tercantum di `CORS_ORIGINS`. Perhatikan bahwa `localhost` dan `127.0.0.1` dihitung sebagai dua asal berbeda |
| Unggahan gagal dengan pesan ukuran berlebihan | Naikkan `UPLOAD_MAX_BYTES`, dan `client_max_body_size` pada Nginx |
| Gambar berita atau galeri tidak muncul | `UPLOAD_DIR` berbeda dari saat berkasnya diunggah, atau folder itu tidak dapat dibaca pengguna layanan |
| Dokumen pendaftar menghasilkan 401 | Wajar: dokumen pribadi hanya dapat dibuka petugas yang sudah masuk |
| Perubahan dari panel admin belum tampak di situs publik | Tunggu paling lama 30 detik, atau muat ulang. Penyegaran seketika memerlukan frontend dan backend berada pada asal yang tercantum di `CORS_ORIGINS` |
| Migrasi berhenti dengan `Table ... already exists` | Terjadi pada versi lama. Sekarang basis data yang sudah berisi tabel aplikasi dikenali dan dilewati |

Melihat catatan server:

```bash
sudo journalctl -u ppdb -f      # backend
```

---

## 9. Pindah dari versi PHP

Basis data versi PHP dapat dipakai langsung tanpa diubah. Backend Go mengenali
basis data yang sudah berisi tabel aplikasi, mencatat migrasi awalnya sebagai
sudah diterapkan, dan tidak menyentuh isinya.

Yang perlu dipindahkan sendiri hanyalah berkas unggahan:

```bash
cp -r legacy-php/uploads/berita     /var/lib/ppdb/unggahan/berita
cp -r legacy-php/uploads/galeri     /var/lib/ppdb/unggahan/galeri
cp -r legacy-php/uploads/pendaftar  /var/lib/ppdb/unggahan/pendaftar
```

Nama berkas pada basis data tidak berubah, jadi gambar dan dokumen langsung
terbaca setelah dipindah. Folder `fasilitas` dibuat otomatis saat gambar
fasilitas pertama diunggah.

# Memasang di server

Panduan ini ditulis untuk **Ubuntu Server 24.04 LTS** pada VPS 2 GB RAM, dan
angka-angkanya diukur dari aplikasi ini, bukan dikira-kira:

|                             | Terukur      |
| --------------------------- | ------------ |
| Backend Go saat melayani    | 17 MB        |
| Next.js saat melayani       | 121 MB       |
| PostgreSQL                  | 76 MB        |
| **`next build`, puncaknya** | **1.671 MB** |
| Biner Go                    | 28 MB        |
| `.next` sesudah build       | 80 MB        |
| `node_modules`              | 449 MB       |

Puncak build itulah alasan **swap wajib dibuat** pada VPS 2 GB. Tanpa swap,
build pertama akan dihentikan kernel (OOM killer) di tengah jalan.

> Berkas systemd, Caddyfile, dan langkah-langkah di bawah **belum pernah
> dijalankan pada server sungguhan**; ditulis dari pengukuran di komputer
> pengembang. Yang sudah diuji sungguhan hanya `cadangan.sh`, termasuk
> memulihkan hasilnya ke basis data kosong.

---

## 1. Siapkan sistem

```bash
adduser --system --group --home /srv/pkm --shell /usr/sbin/nologin pkm
apt update && apt install -y postgresql caddy git curl build-essential

# Swap 4 GB. WAJIB: next build memuncak di 1,63 GB.
fallocate -l 4G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
# Pada server ber-RAM kecil, jangan menunggu memori hampir penuh baru menukar.
sysctl -w vm.swappiness=30 && echo 'vm.swappiness=30' >> /etc/sysctl.d/99-pkm.conf
```

Node.js 24 **tidak boleh** dari `apt install nodejs`: Ubuntu 24.04 membawa
Node 18, sedangkan Next 16 menuntut yang lebih baru.

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node -v   # harus v24.x

# Go 1.27
curl -fsSL https://go.dev/dl/go1.27.1.linux-amd64.tar.gz | tar -C /usr/local -xz
ln -s /usr/local/go/bin/go /usr/local/bin/go
go version
```

## 2. Basis data

```bash
sudo -u postgres createuser pkm
sudo -u postgres createdb --owner=pkm sma_imtek
sudo -u postgres psql -c "ALTER USER pkm WITH PASSWORD 'ganti-sandi-ini';"
```

Migrasinya dijalankan aplikasi sendiri saat pertama kali hidup; tidak ada
berkas SQL yang perlu diimpor manual.

## 3. Ambil kode dan susun

```bash
git clone https://github.com/Ridhoo1616/pkm-sma-imtek /srv/pkm
cd /srv/pkm && git checkout main
chown -R pkm:pkm /srv/pkm

# Backend
cd /srv/pkm/backend
cp .env.example .env && nano .env      # lihat pasal 4
go build -o server .
mkdir -p data/unggahan && chown -R pkm:pkm data

# Frontend
cd /srv/pkm/frontend
echo 'NEXT_PUBLIC_API_URL=https://api.smaimtek.sch.id' > .env.local
npm ci
npm run build                          # di sinilah swap terpakai
```

## 4. Isi berkas `.env` backend

Yang **wajib** diubah dari contohnya:

```
DB_NAME=sma_imtek
DB_USER=pkm
DB_PASS=ganti-sandi-ini
APP_ENV=produksi
JWT_SECRET=<64 huruf acak: openssl rand -hex 32>
CORS_ORIGINS=https://smaimtek.sch.id,https://www.smaimtek.sch.id
UPLOAD_DIR=/srv/pkm/backend/data/unggahan
```

`APP_ENV=produksi` mengubah dua hal: `JWT_SECRET` menjadi wajib (server
menolak hidup tanpa itu), dan pesan galat tidak lagi memuat rincian basis
data. `TRUSTED_PROXIES` **tidak perlu diisi** bila Caddy berada di server yang
sama; bawaannya sudah mempercayai loopback.

## 5. Nyalakan sebagai layanan

```bash
cp /srv/pkm/deploy/pkm-backend.service  /etc/systemd/system/
cp /srv/pkm/deploy/pkm-frontend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now pkm-backend pkm-frontend
systemctl status pkm-backend pkm-frontend --no-pager
curl -s localhost:8090/api/sehat        # {"status":"baik"}
curl -sI localhost:3000 | head -1       # HTTP/1.1 200 OK
```

## 6. Caddy dan HTTPS

Arahkan DNS lebih dulu: `A` untuk `smaimtek.sch.id`, `www`, dan
`api.smaimtek.sch.id`, ketiganya ke IP server.

```bash
cp /srv/pkm/deploy/Caddyfile /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile               # ganti nama domainnya
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy
systemctl reload caddy
journalctl -u caddy -n 30 --no-pager    # pastikan sertifikatnya terbit
```

Sertifikat HTTPS diterbitkan dan diperbarui Caddy sendiri; tidak ada certbot
yang perlu disetel.

## 7. Firewall

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

Porta 3000 dan 8090 **jangan** dibuka: keduanya hanya perlu dihubungi Caddy
dari dalam server yang sama.

## 8. Cadangan otomatis

```bash
mkdir -p /var/backups/pkm && chown pkm:pkm /var/backups/pkm
cp /srv/pkm/deploy/pkm-cadangan.service /srv/pkm/deploy/pkm-cadangan.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now pkm-cadangan.timer
systemctl start pkm-cadangan            # coba sekarang, jangan tunggu besok
journalctl -u pkm-cadangan -n 30 --no-pager
systemctl list-timers pkm-cadangan
```

Basis data dicadangkan setiap hari dan disimpan 14 hari; dokumen pendaftar
setiap Minggu dan disimpan 4 pekan. Alasan jadwalnya berbeda ada di dalam
`cadangan.sh`.

**Masih harus dikerjakan sekolah:** menyalin `/var/backups/pkm` ke LUAR
server, misalnya ke Google Drive sekolah. Cadangan yang tinggal di server yang
sama ikut hilang ketika servernya yang rusak, dan itu justru keadaan yang
paling mungkin membutuhkannya.

## 9. Setelah pemasangan, WAJIB

1. **Ganti kata sandi `admin`.** Bawaannya `admin` / `admin123`, dan hash-nya
   ada di repositori publik ini. Masuk ke panel, lalu menu Ganti Kata Sandi.
2. Isi pengaturan sekolah dari menu Pengaturan; 35 di antaranya masih penanda.
3. Isi SMTP pada `.env` bila balasan dan notifikasi email mau dipakai.

---

## Memperbarui ke versi terbaru

```bash
cd /srv/pkm && sudo -u pkm git pull
cd backend && sudo -u pkm go build -o server.baru . && mv server.baru server
cd ../frontend && sudo -u pkm npm ci && sudo -u pkm npm run build
systemctl restart pkm-backend pkm-frontend
```

Migrasi basis data yang baru dijalankan sendiri saat backend hidup kembali.
Biner disusun ke nama lain lalu dipindahkan, supaya biner yang sedang berjalan
tidak tertimpa di tengah jalan.

## Memulihkan dari cadangan

Langkah ini **sudah diuji**: hasil `cadangan.sh` dipulihkan ke basis data
kosong, dan seluruh isinya kembali utuh.

```bash
systemctl stop pkm-backend pkm-frontend

# Basis data. Membuat yang baru, BUKAN menimpa yang sedang dipakai.
sudo -u postgres createdb --owner=pkm sma_imtek_pulih
gzip -dc /var/backups/pkm/basis/pkm-20260924-0130.sql.gz | sudo -u pkm psql -d sma_imtek_pulih

# Periksa dulu isinya sebelum dipakai.
sudo -u pkm psql -d sma_imtek_pulih -c "SELECT count(*) FROM pendaftar;"

# Bila sudah yakin, arahkan DB_NAME pada .env ke sma_imtek_pulih.
nano /srv/pkm/backend/.env

# Dokumen pendaftar
tar -xzf /var/backups/pkm/dokumen/unggahan-20260922-0130.tar.gz -C /srv/pkm/backend/data/

systemctl start pkm-backend pkm-frontend
```

Basis data yang lama sengaja tidak dihapus dan tidak ditimpa. Pemulihan yang
menimpa basis data yang sedang berjalan tidak dapat dibatalkan bila ternyata
cadangannya salah pilih.

## Memeriksa keadaan

```bash
systemctl status pkm-backend pkm-frontend caddy --no-pager
journalctl -u pkm-backend -f
curl -s https://api.smaimtek.sch.id/api/sehat
free -h            # pemakaian memori dan swap
df -h /            # sisa cakram
systemctl list-timers pkm-cadangan
```

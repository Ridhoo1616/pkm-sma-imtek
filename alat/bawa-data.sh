#!/usr/bin/env bash
#
#  bawa-data.sh — memindahkan isi basis data beserta gambar unggahan
#  antarkomputer lewat satu repositori privat.
#
#  Repositori pkm-sma-imtek bersifat PUBLIK, jadi isi basis data dan folder
#  unggahan tidak pernah ikut ke sana. Keduanya dibawa lewat repositori
#  terpisah yang disetel Private, dan isinya SELALU dienkripsi lebih dulu.
#
#  Enkripsinya bukan kelebihan yang tidak perlu. Selama masih data contoh,
#  memang tidak ada yang perlu dirahasiakan. Tetapi begitu sekolah memakai
#  sistem ini sungguhan, dump yang sama akan memuat NIK, Kartu Keluarga, dan
#  akta calon peserta didik — dan pada saat itu tidak ada yang akan ingat
#  mengubah caranya. Lebih aman kebiasaannya sudah benar sejak sekarang.
#
#  Pemakaian:
#    ./alat/bawa-data.sh kirim     # di komputer yang datanya paling baru
#    ./alat/bawa-data.sh ambil     # di komputer yang ingin disamakan
#
#  Peubah lingkungan yang dikenali:
#    PKM_SANDI      sandi enkripsi. Bila kosong, ditanyakan.
#    PKM_REPO_DATA  letak salinan repositori data.
#                   Bawaan: folder sebelah, ../pkm-sma-imtek-data
#    PKM_DB         nama basis data. Bawaan: dibaca dari backend/.env
#    PKM_YA=1       melewati pertanyaan konfirmasi pada "ambil"
#
set -euo pipefail

# ------------------------------------------------------------------
#  Letak
# ------------------------------------------------------------------
AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DATA="${PKM_REPO_DATA:-$(dirname "$AKAR")/pkm-sma-imtek-data}"
UNGGAHAN="$AKAR/backend/data"

# Nama basis data dibaca dari .env supaya tidak ada dua sumber kebenaran.
if [ -n "${PKM_DB:-}" ]; then
  DB="$PKM_DB"
elif [ -f "$AKAR/backend/.env" ]; then
  DB="$(grep -E '^DB_NAME=' "$AKAR/backend/.env" | head -1 | cut -d= -f2-)"
else
  DB="sma_imtek"
fi

merah()  { printf '\033[31m%s\033[0m\n' "$*" >&2; }
hijau()  { printf '\033[32m%s\033[0m\n' "$*"; }
samar()  { printf '\033[2m%s\033[0m\n' "$*"; }

# ------------------------------------------------------------------
#  Prasyarat
# ------------------------------------------------------------------
for alat in pg_dump pg_restore psql openssl git tar; do
  command -v "$alat" >/dev/null || { merah "Tidak ada perintah: $alat"; exit 1; }
done

if [ ! -d "$REPO_DATA/.git" ]; then
  merah "Repositori data belum ada di: $REPO_DATA"
  echo   "Ambil dulu:" >&2
  echo   "  git clone https://github.com/Ridhoo1616/pkm-sma-imtek-data.git \"$REPO_DATA\"" >&2
  exit 1
fi

# ------------------------------------------------------------------
#  Sandi
#
#  Dibaca sekali lalu dipakai lewat peubah lingkungan, bukan lewat argumen
#  baris perintah: argumen terlihat oleh siapa pun yang menjalankan `ps`.
# ------------------------------------------------------------------
minta_sandi() {
  if [ -z "${PKM_SANDI:-}" ]; then
    printf 'Sandi enkripsi: ' >&2
    read -rs PKM_SANDI
    printf '\n' >&2
    [ -n "$PKM_SANDI" ] || { merah "Sandi kosong."; exit 1; }
  fi
  export PKM_SANDI
}

# iter 600000 mengikuti anjuran OWASP untuk PBKDF2-SHA256. Angkanya sengaja
# tinggi: yang dilindungi berumur panjang, sedangkan berkasnya hanya dibuka
# sesekali, jadi jeda sedetik tidak terasa.
sandi_enc() {
  openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
    -in "$1" -out "$2" -pass env:PKM_SANDI
}
sandi_dec() {
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
    -in "$1" -out "$2" -pass env:PKM_SANDI
}

hitung_baris() {
  psql -d "$DB" -Atc "
    select 'pendaftar='||(select count(*) from pendaftar)
        ||' berita='||(select count(*) from berita)
        ||' pesan='||(select count(*) from pesan)
        ||' pengaturan='||(select count(*) from pengaturan)" 2>/dev/null || echo "(basis data belum ada)"
}

# ==================================================================
#  kirim
# ==================================================================
kirim() {
  psql -d "$DB" -Atc 'select 1' >/dev/null 2>&1 || {
    merah "Basis data '$DB' tidak dapat dibuka."; exit 1; }

  minta_sandi
  SEMENTARA="$(mktemp -d)"
  trap 'rm -rf "$SEMENTARA"' EXIT

  echo "Basis data : $DB"
  echo "Isi        : $(hitung_baris)"
  echo "Unggahan   : $(find "$UNGGAHAN" -type f 2>/dev/null | wc -l | tr -d ' ') berkas"
  echo

  samar "Membuat dump…"
  pg_dump -Fc "$DB" > "$SEMENTARA/basis.dump"

  samar "Membungkus unggahan…"
  if [ -d "$UNGGAHAN" ]; then
    tar -czf "$SEMENTARA/unggahan.tgz" -C "$AKAR/backend" data
  else
    tar -czf "$SEMENTARA/unggahan.tgz" -T /dev/null
  fi

  samar "Mengenkripsi…"
  sandi_enc "$SEMENTARA/basis.dump"    "$REPO_DATA/basis.dump.enc"
  sandi_enc "$SEMENTARA/unggahan.tgz"  "$REPO_DATA/unggahan.tgz.enc"

  # Dibuka kembali seketika. Enkripsi yang salah sandi tetap menghasilkan
  # berkas, dan kesalahannya baru ketahuan di komputer seberang — saat
  # datanya justru sedang dibutuhkan.
  samar "Memeriksa hasilnya dapat dibuka kembali…"
  sandi_dec "$REPO_DATA/basis.dump.enc" "$SEMENTARA/uji.dump"
  cmp -s "$SEMENTARA/basis.dump" "$SEMENTARA/uji.dump" || {
    merah "Hasil enkripsi tidak cocok dengan aslinya. Dibatalkan."; exit 1; }

  # Keterangan isinya, tanpa satu pun data pribadi: hanya jumlah baris.
  cat > "$REPO_DATA/README.md" <<TULIS
# Data pendamping pkm-sma-imtek

Repositori ini **privat** dan memuat isi basis data beserta gambar unggahan
proyek [pkm-sma-imtek](https://github.com/Ridhoo1616/pkm-sma-imtek), yang
repositori kodenya publik sehingga keduanya tidak boleh ikut ke sana.

Kedua berkas di sini **terenkripsi** (AES-256-CBC, PBKDF2 600.000 putaran).
Sandinya tidak ada di repositori mana pun.

| Berkas | Isi |
| --- | --- |
| \`basis.dump.enc\` | hasil \`pg_dump -Fc\` |
| \`unggahan.tgz.enc\` | folder \`backend/data\` |

Terakhir dikirim **$(date '+%Y-%m-%d %H:%M')** dari \`$(hostname -s)\`,
berisi $(hitung_baris).

## Memakainya

Kedua perintah di bawah dijalankan dari folder **pkm-sma-imtek**, bukan dari
sini, dan repositori ini harus berada di sebelahnya:

\`\`\`bash
./alat/bawa-data.sh ambil    # menarik isi repo ini ke basis data setempat
./alat/bawa-data.sh kirim    # mengirim isi setempat ke repo ini
\`\`\`

Keterangan lengkapnya ada di \`PANDUAN-INSTALASI.md\` bagian 4c.

> Jangan pernah menaruh dump yang belum terenkripsi di sini, dan jangan
> pernah menulis sandinya ke dalam berkas mana pun di kedua repositori.
TULIS

  ( cd "$REPO_DATA"
    git add -A
    if git diff --cached --quiet; then
      samar "Tidak ada perubahan; tidak ada yang dikirim."
    else
      git commit -q -m "Data per $(date '+%Y-%m-%d %H:%M')"
      git push -q
      hijau "Terkirim ke $(git remote get-url origin)"
    fi )
}

# ==================================================================
#  ambil
# ==================================================================
ambil() {
  minta_sandi
  SEMENTARA="$(mktemp -d)"
  trap 'rm -rf "$SEMENTARA"' EXIT

  samar "Menarik repositori data…"
  ( cd "$REPO_DATA" && git pull -q --ff-only )

  [ -f "$REPO_DATA/basis.dump.enc" ] || {
    merah "Belum ada data di $REPO_DATA. Jalankan 'kirim' dulu di komputer satunya."
    exit 1; }

  samar "Mendekripsi…"
  sandi_dec "$REPO_DATA/basis.dump.enc"   "$SEMENTARA/basis.dump" 2>/dev/null || {
    merah "Gagal mendekripsi. Sandinya salah."; exit 1; }
  sandi_dec "$REPO_DATA/unggahan.tgz.enc" "$SEMENTARA/unggahan.tgz" 2>/dev/null || {
    merah "Gagal mendekripsi arsip unggahan. Sandinya salah."; exit 1; }

  # Menimpa basis data adalah tindakan yang tidak dapat dibatalkan, jadi
  # isinya yang sekarang ditampilkan lebih dulu.
  echo
  echo "Basis data tujuan : $DB"
  echo "Isinya sekarang   : $(hitung_baris)"
  echo "Akan diganti oleh : isi repositori data"
  echo
  if [ "${PKM_YA:-}" != "1" ]; then
    printf 'Isi basis data di atas akan DIGANTI. Ketik "ya" untuk lanjut: '
    read -r jawab
    [ "$jawab" = "ya" ] || { echo "Dibatalkan."; exit 1; }
  fi

  createdb "$DB" 2>/dev/null && samar "Basis data '$DB' dibuat." || true

  samar "Memulihkan basis data…"
  # --no-owner  : peran pemilik di komputer asal belum tentu ada di sini
  # --clean     : membuang tabel yang sudah dibuat backend saat dinyalakan,
  #               supaya barisnya tidak bertumpuk
  pg_restore --no-owner --clean --if-exists -d "$DB" "$SEMENTARA/basis.dump"

  samar "Membuka unggahan…"
  tar -xzf "$SEMENTARA/unggahan.tgz" -C "$AKAR/backend"

  echo
  hijau "Selesai."
  echo "Isi sekarang : $(hitung_baris)"
  echo "Unggahan     : $(find "$UNGGAHAN" -type f 2>/dev/null | wc -l | tr -d ' ') berkas"
  samar "Nyalakan ulang backend supaya tembolok pengaturannya dibaca ulang."
}

case "${1:-}" in
  kirim) kirim ;;
  ambil) ambil ;;
  *)
    echo "Pemakaian: $0 {kirim|ambil}"
    echo
    echo "  kirim   membungkus basis data '$DB' beserta $UNGGAHAN,"
    echo "          mengenkripsinya, lalu mendorongnya ke repositori data privat"
    echo "  ambil   menarik dari repositori data privat, lalu MENIMPA"
    echo "          basis data '$DB' beserta folder unggahan setempat"
    exit 1 ;;
esac

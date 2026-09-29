#!/bin/zsh
#
#  cadangan-harian.sh — mencadangkan basis data dan folder unggahan.
#
#  Dijalankan launchd setiap hari (lihat alat/id.smaimtek.cadangan.plist),
#  dan boleh dijalankan sendiri kapan saja:
#
#    ./alat/cadangan-harian.sh
#
#  Hasilnya di ~/Cadangan-SMA-IMTEK, BUKAN di Desktop atau Documents. Pada
#  Mac yang menyalakan iCloud Drive untuk Desktop & Documents, berkas di
#  sana ikut terunggah ke iCloud — dan cadangan ini memuat NIK, Kartu
#  Keluarga, dan akta calon peserta didik. Folder di akar home tidak ikut.
#
#  Cadangan yang lebih tua dari SIMPAN_HARI (bawaan 14) dihapus, supaya
#  folder ini tidak tumbuh tanpa batas.
#
set -u
AKAR="${0:A:h:h}"
PGBIN="/Applications/Postgres.app/Contents/Versions/17/bin"
TUJUAN="${CADANGAN_DIR:-$HOME/Cadangan-SMA-IMTEK}"
SIMPAN_HARI="${SIMPAN_HARI:-14}"
CAP="$(date +%F-%H%M)"
CATATAN="$TUJUAN/catatan.log"

mkdir -p "$TUJUAN" && chmod 700 "$TUJUAN"
catat() { echo "$(date '+%F %T')  $1" >> "$CATATAN"; }

if ! "$PGBIN/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  catat "DILEWATI: PostgreSQL tidak menyala"
  exit 0
fi

# 1. Basis data. Format kustom (-Fc) sudah dimampatkan dan dipulihkan dengan
#    pg_restore. Ditulis ke berkas sementara, lalu diperiksa, baru diganti
#    namanya: cadangan setengah jadi tidak pernah tersimpan sebagai cadangan.
DB="$TUJUAN/cadangan-$CAP.dump"
if "$PGBIN/pg_dump" -U ppdb -h 127.0.0.1 -Fc sma_imtek > "$DB.tmp" 2>>"$CATATAN" \
   && "$PGBIN/pg_restore" --list "$DB.tmp" >/dev/null 2>&1; then
  mv "$DB.tmp" "$DB" && chmod 600 "$DB"
else
  rm -f "$DB.tmp"
  catat "GAGAL: basis data tidak tercadangkan"
  exit 1
fi

# 2. Folder unggahan: foto situs dan dokumen pribadi pendaftar.
UNG="$TUJUAN/unggahan-$CAP.tar.gz"
if [[ -d "$AKAR/backend/data/unggahan" ]]; then
  tar czf "$UNG.tmp" -C "$AKAR/backend/data" unggahan 2>>"$CATATAN" \
    && mv "$UNG.tmp" "$UNG" && chmod 600 "$UNG" \
    || { rm -f "$UNG.tmp"; catat "GAGAL: folder unggahan tidak tercadangkan"; exit 1; }
fi

# 3. Buang cadangan harian yang sudah lewat masa simpannya. Cadangan
#    "sebelum-migrasi-*" dari jalankan.command TIDAK ikut dibuang: itulah yang
#    dibutuhkan untuk membatalkan migrasi yang salah, berapa pun umurnya.
find "$TUJUAN" -maxdepth 1 \( -name 'cadangan-*.dump' -o -name 'unggahan-*.tar.gz' \) \
  -mtime +"$SIMPAN_HARI" -delete

catat "OK: $(basename "$DB") $(du -h "$DB" | cut -f1), $(basename "$UNG") $(du -h "$UNG" 2>/dev/null | cut -f1)"

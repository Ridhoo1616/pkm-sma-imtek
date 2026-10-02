#!/bin/bash
# Merakit ulang demo GitHub Pages di docs/ dari aplikasi yang sebenarnya.
#
#   alat/demo/rakit.sh
#
# Langkahnya:
#   1. Menyalin basis data sma_imtek ke basis data sekali pakai
#      (sma_imtek_demo). Basis data aslinya hanya dibaca oleh pg_dump.
#   2. Mengisi contoh yang belum ada di sana: jenis surat dan suratnya, bank
#      soal dan paket tes, sesi tes contoh, serta sandi akun demo
#      (admin/admin123, panitia/panitia123). Foto contoh yang rusak diganti
#      gambar pengganti pada salinan folder unggahan.
#   3. Menjalankan salinan backend, Astro, dan Next di porta lain (8190, 3100,
#      3101), dirakit dari salinan kode di folder sementara.
#   4. Menangkap seluruh halaman (tangkap.mjs) dan merekam data API
#      (rekam-data.mjs) ke docs/.
#   5. Mematikan semuanya dan membuang basis data sekali pakai.
#
# Memerlukan Go, Node, dan PostgreSQL (psql, pg_dump, createdb) di PATH, dan
# pengguna PostgreSQL yang boleh membuat basis data.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SEMENTARA="$(mktemp -d "${TMPDIR:-/tmp}/demo-sma-imtek.XXXXXX")"
DB_ASAL="${DB_ASAL:-sma_imtek}"
DB_DEMO="sma_imtek_demo_$$"
DB_USER="${DB_USER:-ppdb}"
DASAR="/pkm-sma-imtek"
P_API=8190 P_ASTRO=3100 P_NEXT=3101

log() { printf '\n== %s\n' "$*"; }

matikan() {
  for p in $P_API $P_ASTRO $P_NEXT; do
    kill $(lsof -nP -iTCP:$p -sTCP:LISTEN -t 2>/dev/null) 2>/dev/null || true
  done
  sleep 1
  dropdb --if-exists "$DB_DEMO" 2>/dev/null || true
  rm -rf "$SEMENTARA"
}
trap matikan EXIT

for p in $P_API $P_ASTRO $P_NEXT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Porta $p sedang dipakai. Matikan dulu prosesnya." >&2
    exit 1
  fi
done

log "1. Salin basis data $DB_ASAL ke $DB_DEMO"
createdb -O "$DB_USER" "$DB_DEMO"
pg_dump -U "$DB_USER" --no-owner "$DB_ASAL" | psql -q -U "$DB_USER" -d "$DB_DEMO" >/dev/null
# Sesi tes yang ada di data asli tidak dibawa; contohnya dibuat ulang di bawah.
# Begitu pula bank soal dan paket tes: isinya sisa uji coba, dan demo memakai
# 40 soal latihan yang diimpor isi-contoh.mjs.
psql -q -U "$DB_USER" -d "$DB_DEMO" -c "DELETE FROM sesi_soal; DELETE FROM sesi_ujian; DELETE FROM paket_ujian; DELETE FROM soal;"
cp -R "$REPO/backend/data/unggahan" "$SEMENTARA/unggahan"

log "2. Rakit dan jalankan backend demo"
(cd "$REPO/backend" && go build -o "$SEMENTARA/server" .)
# Backend mencari folder migrations relatif terhadap folder kerjanya. Tanpa
# salinan ini migrasi yang belum berjalan di basis data asli dilewati diam-diam.
cp -R "$REPO/backend/migrations" "$SEMENTARA/migrations"
cat > "$SEMENTARA/.env" <<EOF
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=$DB_DEMO
DB_USER=$DB_USER
DB_SSLMODE=disable
APP_ENV=pengembangan
PORT=$P_API
JWT_SECRET=demo-sekali-pakai-$(openssl rand -hex 16)
CORS_ORIGINS=http://127.0.0.1:$P_NEXT
UPLOAD_DIR=$SEMENTARA/unggahan
EOF
grep '^DB_PASS=' "$REPO/backend/.env" >> "$SEMENTARA/.env" 2>/dev/null || true
(cd "$SEMENTARA" && ./server > backend.log 2>&1 &)
for _ in $(seq 30); do curl -sf "localhost:$P_API/api/sehat" >/dev/null && break; sleep 0.5; done

log "3. Isi contoh data demo"
API="http://localhost:$P_API" SOAL_CSV="$REPO/frontend/public/templat/latihan-soal-40.csv" \
  node "$REPO/alat/demo/isi-contoh.mjs"

log "4. Rakit Astro dan Next dari salinan kode"
mkdir -p "$SEMENTARA/kode"
for x in web frontend; do
  mkdir "$SEMENTARA/kode/$x"
  for f in $(ls -A "$REPO/$x"); do
    case $f in .next|dist|.astro|.tembolok-gambar|server.log|.env|.env.local) ;;
      # cp -c: salinan APFS, cepat dan tidak memakan ruang. node_modules
      # disalin, bukan ditautkan, karena Turbopack menolak tautan simbolik.
      *) cp -Rc "$REPO/$x/$f" "$SEMENTARA/kode/$x/" 2>/dev/null || cp -R "$REPO/$x/$f" "$SEMENTARA/kode/$x/" ;;
    esac
  done
done
(cd "$SEMENTARA/kode/web" && npx astro build > "$SEMENTARA/astro-build.log" 2>&1)
(cd "$SEMENTARA/kode/frontend" && DASAR_DEMO=$DASAR NEXT_PUBLIC_API_URL="http://localhost:$P_API" \
  npx next build > "$SEMENTARA/next-build.log" 2>&1)
API="http://localhost:$P_API" UNGGAHAN="$SEMENTARA/unggahan" WEB="$SEMENTARA/kode/web" \
  node "$REPO/alat/demo/ganti-gambar-rusak.mjs"
# SITUS_LAMA: Astro mengalihkan halaman yang tidak dikenalnya (termasuk
# tangkapan 404.html) ke sana. Bawaannya localhost:3000, sehingga perakitan
# dulu diam-diam bergantung pada situs user yang sedang menyala.
(cd "$SEMENTARA/kode/web" && PORT=$P_ASTRO HOST=127.0.0.1 NEXT_PUBLIC_API_URL="http://localhost:$P_API" \
  SITUS_LAMA="http://127.0.0.1:$P_NEXT$DASAR" \
  ALAMAT_SITUS="https://ridhoo1616.github.io$DASAR" node dist/server/entry.mjs > "$SEMENTARA/astro.log" 2>&1 &)
(cd "$SEMENTARA/kode/frontend" && DASAR_DEMO=$DASAR npx next start -p $P_NEXT -H 127.0.0.1 > "$SEMENTARA/next.log" 2>&1 &)
for _ in $(seq 60); do
  curl -sf "127.0.0.1:$P_ASTRO/" >/dev/null && curl -sf "127.0.0.1:$P_NEXT$DASAR/admin" >/dev/null && break
  sleep 0.5
done

log "5. Tangkap halaman dan rekam data ke docs/"
KELUAR_SEM="$SEMENTARA/docs"
API="http://localhost:$P_API" KELUAR="$KELUAR_SEM/demo" node "$REPO/alat/demo/rekam-data.mjs"
mv "$KELUAR_SEM/demo" "$SEMENTARA/demo-data"
ASTRO="http://127.0.0.1:$P_ASTRO" NEXT="http://127.0.0.1:$P_NEXT" API="http://localhost:$P_API" DASAR=$DASAR \
  KELUAR="$KELUAR_SEM" WEB_KLIEN="$SEMENTARA/kode/web/dist/client" NEXT_STATIS="$SEMENTARA/kode/frontend/.next/static" \
  UNGGAHAN="$SEMENTARA/unggahan" DATA_DEMO="$SEMENTARA/demo-data/data.json" node "$REPO/alat/demo/tangkap.mjs"
cp -R "$SEMENTARA/demo-data/." "$KELUAR_SEM/demo/"

rm -rf "$REPO/docs"
mv "$KELUAR_SEM" "$REPO/docs"
log "Selesai: $(du -sh "$REPO/docs" | cut -f1) di docs/"

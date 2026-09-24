#!/usr/bin/env bash
#
# Cadangan basis data dan dokumen pendaftar.
#
# Dijalankan systemd timer setiap hari pukul 01.30. Lihat pkm-cadangan.timer.
#
# YANG DICADANGKAN, dan mengapa jadwalnya berbeda:
#
#   - Basis data SETIAP HARI, disimpan 14 hari. Isinya tidak dapat disusun
#     ulang dari mana pun: pendaftaran, status verifikasi, nilai ujian, dan
#     catatan panitia hanya ada di situ.
#   - Dokumen pendaftar SETIAP MINGGU, disimpan 4 pekan. Ukurannya ratusan
#     megabita, dan mencadangkannya tiap hari akan menghabiskan cakram 40 GB
#     dalam sebulan. Kehilangan paling lama sepekan pun masih dapat
#     dipulihkan, sebab kartu keluarga dan ijazahnya masih dipegang
#     pendaftarnya sendiri; basis datanya tidak begitu.
#
# Paksa mencadangkan dokumen di luar jadwal pekanannya dengan --penuh.
#
# YANG MASIH HARUS DIKERJAKAN SEKOLAH: menyalin isi folder cadangan ini ke
# LUAR server, misalnya ke Google Drive sekolah atau cakram luar. Cadangan
# yang tinggal di server yang sama ikut hilang ketika servernya yang rusak,
# dan itu justru keadaan yang paling mungkin membutuhkannya.

set -euo pipefail

DB_NAMA="${DB_NAME:-sma_imtek}"
DB_PENGGUNA="${DB_USER:-pkm}"
FOLDER_UNGGAH="${UPLOAD_DIR:-/srv/pkm/backend/data/unggahan}"
TUJUAN="${BACKUP_DIR:-/var/backups/pkm}"
SIMPAN_BASIS="${KEEP_DB_DAYS:-14}"
SIMPAN_DOKUMEN="${KEEP_DOC_WEEKS:-4}"

penuh=0
[ "${1:-}" = "--penuh" ] && penuh=1

cap="$(date +%Y%m%d-%H%M)"
mkdir -p "$TUJUAN/basis" "$TUJUAN/dokumen"

# Kunci sederhana, tanpa flock: flock tidak ada di seluruh sistem, sedangkan
# mkdir bersifat atomik di mana pun. Dua cadangan yang berjalan bersamaan akan
# saling menimpa berkasnya.
KUNCI="$TUJUAN/.kunci"
if ! mkdir "$KUNCI" 2>/dev/null; then
  echo "cadangan lain sedang berjalan ($KUNCI), berhenti" >&2
  exit 1
fi
trap 'rmdir "$KUNCI" 2>/dev/null || true' EXIT

# ---------- basis data ----------
berkas_basis="$TUJUAN/basis/pkm-$cap.sql.gz"
echo "mencadangkan basis data $DB_NAMA -> $berkas_basis"
pg_dump --username="$DB_PENGGUNA" --no-password "$DB_NAMA" | gzip -9 > "$berkas_basis"

# Cadangan yang rusak lebih berbahaya daripada tidak ada cadangan: ia membuat
# orang merasa aman. Jadi hasilnya diperiksa, bukan dianggap berhasil begitu
# pg_dump selesai tanpa pesan.
if ! gzip -t "$berkas_basis"; then
  echo "GAGAL: berkas cadangan basis data rusak" >&2
  rm -f "$berkas_basis"
  exit 1
fi
baris=$(gzip -dc "$berkas_basis" | grep -c "^CREATE TABLE" || true)
if [ "$baris" -lt 15 ]; then
  echo "GAGAL: cadangan hanya memuat $baris CREATE TABLE, seharusnya 21 atau lebih" >&2
  rm -f "$berkas_basis"
  exit 1
fi
echo "  basis data: $(du -h "$berkas_basis" | cut -f1), $baris tabel"

# ---------- dokumen pendaftar ----------
# Hari ke-7 pekan ISO adalah Minggu.
if [ "$penuh" = "1" ] || [ "$(date +%u)" = "7" ]; then
  if [ -d "$FOLDER_UNGGAH" ]; then
    berkas_dokumen="$TUJUAN/dokumen/unggahan-$cap.tar.gz"
    echo "mencadangkan dokumen pendaftar -> $berkas_dokumen"
    tar -czf "$berkas_dokumen" -C "$(dirname "$FOLDER_UNGGAH")" "$(basename "$FOLDER_UNGGAH")"
    if ! gzip -t "$berkas_dokumen"; then
      echo "GAGAL: berkas cadangan dokumen rusak" >&2
      rm -f "$berkas_dokumen"
      exit 1
    fi
    echo "  dokumen: $(du -h "$berkas_dokumen" | cut -f1)"
  else
    echo "  folder unggahan $FOLDER_UNGGAH tidak ada, dilewati"
  fi
else
  echo "  dokumen pendaftar dicadangkan hari Minggu, hari ini dilewati"
fi

# ---------- pembuangan yang lama ----------
find "$TUJUAN/basis" -name 'pkm-*.sql.gz' -type f -mtime "+$SIMPAN_BASIS" -delete
find "$TUJUAN/dokumen" -name 'unggahan-*.tar.gz' -type f -mtime "+$((SIMPAN_DOKUMEN * 7))" -delete

echo "selesai. isi folder cadangan sekarang:"
du -sh "$TUJUAN/basis" "$TUJUAN/dokumen" 2>/dev/null || true
echo "INGAT: salin folder $TUJUAN ke luar server secara berkala."

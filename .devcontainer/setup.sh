#!/usr/bin/env bash
# Dijalankan SEKALI saat Codespace pertama kali dibuat.
set -euo pipefail

echo ">> Menjalankan PostgreSQL..."
sudo service postgresql start
for i in $(seq 1 30); do
  sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1 && break
  sleep 1
done

echo ">> Membuat basis data dan penggunanya..."
# Tabelnya tidak diimpor di sini: backend Go menerapkan berkas migrasi
# sendiri saat pertama kali dijalankan.
#
# PostgreSQL tidak mengenal CREATE ... IF NOT EXISTS untuk role maupun
# basis data, jadi keberadaannya diperiksa lebih dulu agar skrip ini
# aman dijalankan ulang.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQLEOF'
SELECT 'CREATE ROLE ppdb LOGIN PASSWORD ''ppdb'''
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ppdb')\gexec
SELECT 'CREATE DATABASE sma_imtek OWNER ppdb ENCODING ''UTF8'''
  WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'sma_imtek')\gexec
SQLEOF

echo ">> Menulis backend/.env (tidak ikut ter-commit)..."
cat > backend/.env <<'ENVEOF'
# Dibuat otomatis oleh .devcontainer/setup.sh — hanya untuk Codespace.
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=sma_imtek
DB_USER=ppdb
DB_PASS=ppdb
DB_SSLMODE=disable
JWT_SECRET=kunci-codespace-bukan-untuk-produksi
APP_ENV=pengembangan
PORT=8090
UPLOAD_DIR=data/unggahan
ENVEOF

echo ">> Mengunduh dependensi Go..."
(cd backend && go mod download)

echo ">> Memasang dependensi frontend (mungkin beberapa menit)..."
(cd frontend && npm ci --no-audit --no-fund)

echo ""
echo "==================================================================="
echo " Penyiapan selesai."
echo " Situs & panel : buka tab PORTS, klik alamat pada port 3000"
echo " Panel panitia : tambahkan /admin pada alamat tersebut"
echo " Akun bawaan   : admin / admin123  (segera ganti)"
echo "==================================================================="

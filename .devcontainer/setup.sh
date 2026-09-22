#!/usr/bin/env bash
# Dijalankan SEKALI saat Codespace pertama kali dibuat.
set -euo pipefail

echo ">> Menjalankan MariaDB..."
sudo service mariadb start
for i in $(seq 1 30); do
  sudo mariadb -e "SELECT 1" >/dev/null 2>&1 && break
  sleep 1
done

echo ">> Membuat basis data dan penggunanya..."
# Tabelnya tidak diimpor di sini: backend Go menerapkan berkas migrasi
# sendiri saat pertama kali dijalankan.
sudo mariadb -e "
  CREATE DATABASE IF NOT EXISTS sma_imtek
    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'ppdb'@'127.0.0.1' IDENTIFIED BY 'ppdb';
  CREATE USER IF NOT EXISTS 'ppdb'@'localhost' IDENTIFIED BY 'ppdb';
  GRANT ALL PRIVILEGES ON sma_imtek.* TO 'ppdb'@'127.0.0.1';
  GRANT ALL PRIVILEGES ON sma_imtek.* TO 'ppdb'@'localhost';
  FLUSH PRIVILEGES;"

echo ">> Menulis backend/.env (tidak ikut ter-commit)..."
cat > backend/.env <<'ENVEOF'
# Dibuat otomatis oleh .devcontainer/setup.sh — hanya untuk Codespace.
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sma_imtek
DB_USER=ppdb
DB_PASS=ppdb
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

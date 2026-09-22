#!/usr/bin/env bash
# Dijalankan SEKALI saat Codespace pertama kali dibuat.
set -euo pipefail

echo ">> Menjalankan MariaDB..."
sudo service mariadb start
for i in $(seq 1 30); do
  sudo mariadb -e "SELECT 1" >/dev/null 2>&1 && break
  sleep 1
done

echo ">> Mengimpor struktur dan data awal dari database/schema.sql..."
sudo mariadb < database/schema.sql

echo ">> Membuat pengguna database khusus aplikasi..."
sudo mariadb -e "
  CREATE USER IF NOT EXISTS 'ppdb'@'127.0.0.1' IDENTIFIED BY 'ppdb';
  CREATE USER IF NOT EXISTS 'ppdb'@'localhost' IDENTIFIED BY 'ppdb';
  GRANT ALL PRIVILEGES ON sma_imtek.* TO 'ppdb'@'127.0.0.1';
  GRANT ALL PRIVILEGES ON sma_imtek.* TO 'ppdb'@'localhost';
  FLUSH PRIVILEGES;"

echo ">> Menulis config/database.local.php (tidak ikut ter-commit)..."
cat > config/database.local.php <<'PHPEOF'
<?php
/**
 * Konfigurasi otomatis untuk GitHub Codespaces.
 * Dibuat oleh .devcontainer/setup.sh — jangan di-commit.
 */
define('DB_HOST', '127.0.0.1');
define('DB_USER', 'ppdb');
define('DB_PASS', 'ppdb');
PHPEOF

echo ">> Memberi izin tulis pada folder unggahan..."
chmod -R 775 uploads

echo ""
echo "==================================================================="
echo " Penyiapan selesai."
echo " Website        : buka tab PORTS, klik alamat pada port 8080"
echo " Panel admin    : tambahkan /admin/login.php pada alamat tersebut"
echo " Akun bawaan    : admin / admin123"
echo "==================================================================="

#!/usr/bin/env bash
# Dijalankan SETIAP KALI Codespace dinyalakan.
set -uo pipefail

sudo service mariadb start >/dev/null 2>&1 || true

# Hentikan server lama bila masih berjalan, lalu jalankan ulang
pkill -f "php -S 0.0.0.0:8080" >/dev/null 2>&1 || true
nohup php -S 0.0.0.0:8080 -t "$(pwd)" > /tmp/php-server.log 2>&1 &

echo "Server PHP berjalan di port 8080. Buka tab PORTS untuk mendapatkan alamatnya."

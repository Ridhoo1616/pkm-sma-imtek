#!/usr/bin/env bash
# Dijalankan SETIAP KALI Codespace dinyalakan.
set -uo pipefail

AKAR="$(pwd)"

echo ">> Menjalankan MariaDB..."
sudo service mariadb start >/dev/null 2>&1 || true
for i in $(seq 1 30); do
  sudo mariadb -e "SELECT 1" >/dev/null 2>&1 && break
  sleep 1
done

# Frontend memanggil API dari peramban pengunjung, jadi alamat API harus
# alamat publik Codespace — bukan localhost, yang di sana menunjuk ke
# komputer pengunjung itu sendiri.
if [ -n "${CODESPACE_NAME:-}" ]; then
  DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  ALAMAT_API="https://${CODESPACE_NAME}-8090.${DOMAIN}"
  ASAL_SITUS="https://${CODESPACE_NAME}-3000.${DOMAIN}"
else
  ALAMAT_API="http://localhost:8090"
  ASAL_SITUS="http://localhost:3000"
fi

echo "NEXT_PUBLIC_API_URL=${ALAMAT_API}" > "$AKAR/frontend/.env.local"

# Backend hanya menerima permintaan dari asal yang disebutkan namanya.
if grep -q '^CORS_ORIGINS=' "$AKAR/backend/.env" 2>/dev/null; then
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${ASAL_SITUS}|" "$AKAR/backend/.env"
else
  echo "CORS_ORIGINS=${ASAL_SITUS}" >> "$AKAR/backend/.env"
fi

# Hentikan proses lama agar porta tidak bertabrakan saat Codespace
# dinyalakan ulang.
pkill -f server-codespace >/dev/null 2>&1 || true
pkill -f "next dev" >/dev/null 2>&1 || true

echo ">> Menjalankan backend Go di porta 8090..."
(cd "$AKAR/backend" && go build -o server-codespace . \
  && nohup ./server-codespace > /tmp/backend.log 2>&1 &)

echo ">> Menjalankan frontend Next.js di porta 3000..."
(cd "$AKAR/frontend" && nohup npm run dev > /tmp/frontend.log 2>&1 &)

echo ""
echo "Situs & panel : buka tab PORTS, klik alamat pada porta 3000"
echo "API           : ${ALAMAT_API}/api/sehat"
echo "Catatan       : setel porta 8090 menjadi Public pada tab PORTS,"
echo "                agar peramban dapat memanggil API-nya."
echo "Catatan log   : /tmp/backend.log dan /tmp/frontend.log"

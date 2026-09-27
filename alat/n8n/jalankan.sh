#!/usr/bin/env bash
#
#  Menjalankan n8n di komputer sendiri, untuk gateway WhatsApp PPDB.
#
#  Dua setelan di bawah bukan hiasan, dan keduanya harus dipakai bersama.
#
set -euo pipefail

# 1. HANYA loopback.
#
#    Bawaan n8n mendengarkan di 0.0.0.0, artinya panelnya terbuka bagi siapa
#    pun yang berada di jaringan yang sama — di sekolah atau di kafe, itu
#    orang yang tidak dikenal. Selama akun pemiliknya belum dibuat, orang itu
#    dapat membuatnya duluan dan mengambil alih. Sesudah dibuat pun, panel
#    n8n memuat kredensial, dan tidak ada alasan memaparkannya.
export N8N_LISTEN_ADDRESS=127.0.0.1

# 2. Cookie sesi tanpa penanda Secure.
#
#    n8n menyebut ini "not recommended", dan peringatan itu benar UNTUK n8n
#    yang dijangkau lewat jaringan: tanpa penanda Secure, cookienya dapat
#    ikut terkirim lewat sambungan tanpa TLS. Di sini tidak ada sambungan
#    seperti itu — barisnya di atas membuat n8n tidak dapat dihubungi dari
#    luar mesin ini sama sekali, jadi cookienya tidak pernah melewati
#    jaringan mana pun.
#
#    Diperlukan karena Safari tidak memperlakukan http://localhost sebagai
#    konteks aman, sehingga cookie bertanda Secure ditolak dan panelnya
#    berhenti di layar "Your n8n server is configured to use a secure
#    cookie". Chrome memaafkan localhost, Safari tidak.
export N8N_SECURE_COOKIE=false

# Tanpa laporan penggunaan dan tanpa pemberitahuan versi; ini pemasangan
# setempat untuk satu keperluan, bukan layanan yang dipantau.
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_VERSION_NOTIFICATIONS_ENABLED=false

echo "n8n dijalankan di http://localhost:5678 (hanya dari komputer ini)"
echo "Hentikan dengan Ctrl-C."
echo

exec n8n start

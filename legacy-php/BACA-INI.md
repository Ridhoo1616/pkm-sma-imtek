# Arsip versi PHP

Folder ini menyimpan aplikasi versi **PHP native + MySQL** yang dibangun lebih
dulu dan sudah berjalan lengkap. Versi ini **tidak dikembangkan lagi**, tetapi
sengaja disimpan karena tiga alasan:

1. Menjadi rujukan perilaku. Seluruh aturan validasi, alur status pendaftar,
   dan struktur basis data pada versi Go mengikuti versi ini.
2. Menjadi cadangan yang bisa langsung dipakai. Versi ini berjalan di hosting
   bersama mana pun tanpa VPS, sehingga tetap berguna bila sekolah nanti
   memerlukan pemasangan yang paling sederhana.
3. Menjadi bahan pembahasan laporan PkM: perbandingan dua pendekatan.

Cara menjalankannya: salin isi folder ini ke `htdocs` XAMPP, impor
`../backend/migrations/001_skema.sql` lewat phpMyAdmin, lalu buka di peramban.
Akun bawaan `admin` / `admin123`.

Basis datanya sama dengan yang dipakai versi Go, sehingga keduanya dapat
membaca data yang sama bila diarahkan ke basis data yang sama.

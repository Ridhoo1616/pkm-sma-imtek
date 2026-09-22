<?php
/**
 * CONTOH berkas konfigurasi lokal.
 *
 * Cara memakai:
 *   1. Salin berkas ini menjadi  config/database.local.php
 *   2. Isi nilai sesuai server Anda
 *   3. Cukup tulis nilai yang BERBEDA dari bawaan; sisanya otomatis
 *      memakai nilai bawaan di config/database.php
 *
 * Berkas config/database.local.php sudah tercantum di .gitignore,
 * sehingga kredensial asli tidak akan ikut ter-commit ke repositori.
 */

// Contoh untuk hosting bersama (shared hosting) cPanel:
// define('DB_HOST', 'localhost');
// define('DB_NAME', 'u1234567_smaimtek');
// define('DB_USER', 'u1234567_admin');
// define('DB_PASS', 'kata-sandi-dari-cpanel');

// Matikan tampilan galat teknis saat sudah dipakai sekolah:
// define('MODE_PENGEMBANGAN', false);

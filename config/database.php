<?php
/**
 * Konfigurasi koneksi database
 * Sistem Informasi Profil Sekolah & PPDB Online SMA IMTEK
 *
 * Ubah nilai di bawah ini sesuai pengaturan server Anda.
 * Untuk XAMPP bawaan, biasanya cukup biarkan seperti apa adanya.
 *
 * ------------------------------------------------------------------
 *  PERINGATAN KEAMANAN
 *  Nilai di bawah ini adalah nilai bawaan XAMPP untuk pengembangan
 *  di komputer sendiri, tanpa kata sandi.
 *
 *  Saat aplikasi dipasang di hosting sungguhan, JANGAN menuliskan
 *  kata sandi database yang asli di berkas ini bila repositori ini
 *  bersifat publik. Gunakan salah satu cara berikut:
 *    1. Salin berkas ini menjadi config/database.local.php,
 *       isi kredensial asli di sana (sudah masuk .gitignore), lalu
 *       sertakan dari berkas ini; atau
 *    2. Ubah kredensial langsung di server, tanpa ikut di-commit.
 * ------------------------------------------------------------------
 */

/*
 | Bila berkas config/database.local.php ada, nilai di dalamnya dipakai
 | lebih dulu dan nilai bawaan di bawah diabaikan. Berkas itu sudah masuk
 | .gitignore, jadi kredensial hosting tidak akan ikut ter-commit.
 | Contoh isinya ada di config/database.local.example.php.
 */
if (is_file(__DIR__ . '/database.local.php')) {
    require_once __DIR__ . '/database.local.php';
}

if (!defined('DB_HOST'))    define('DB_HOST', 'localhost');
if (!defined('DB_PORT'))    define('DB_PORT', '3306');      // ubah bila MySQL memakai port lain
if (!defined('DB_NAME'))    define('DB_NAME', 'sma_imtek');
if (!defined('DB_USER'))    define('DB_USER', 'root');
if (!defined('DB_PASS'))    define('DB_PASS', '');           // XAMPP bawaan: kosong
if (!defined('DB_CHARSET')) define('DB_CHARSET', 'utf8mb4');

// Zona waktu aplikasi
date_default_timezone_set('Asia/Jakarta');

// Tampilkan error saat pengembangan, matikan saat sudah dipakai sekolah
if (!defined('MODE_PENGEMBANGAN')) define('MODE_PENGEMBANGAN', true);
if (MODE_PENGEMBANGAN) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

/* ------------------------------------------------------------------
 |  Koneksi PDO
 * ------------------------------------------------------------------ */
try {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    $pesan = MODE_PENGEMBANGAN ? $e->getMessage() : 'Silakan hubungi administrator.';
    exit('<div style="font:15px/1.6 system-ui;max-width:640px;margin:80px auto;padding:24px;'
        . 'border:1px solid #e5e7eb;border-radius:12px">'
        . '<h2 style="margin:0 0 8px;color:#b91c1c">Koneksi database gagal</h2>'
        . '<p>Pastikan layanan <b>MySQL</b> sudah berjalan dan database <b>' . DB_NAME
        . '</b> sudah diimpor dari <code>database/schema.sql</code>.</p>'
        . '<p style="color:#6b7280;font-size:13px">Detail: ' . htmlspecialchars($pesan) . '</p></div>');
}

/* ------------------------------------------------------------------
 |  Konstanta path & URL (otomatis, aman di subfolder htdocs)
 * ------------------------------------------------------------------ */
define('ROOT_PATH', dirname(__DIR__));

if (!defined('BASE_URL')) {
    $skema = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'] ?? 'localhost';
    // Folder root aplikasi relatif terhadap document root
    $basis = str_replace('\\', '/', ROOT_PATH);
    $docRt = str_replace('\\', '/', realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: '');
    $sub   = ($docRt && strpos($basis, $docRt) === 0) ? substr($basis, strlen($docRt)) : '';
    define('BASE_URL', $skema . '://' . $host . rtrim($sub, '/') . '/');
}

define('UPLOAD_PATH', ROOT_PATH . '/uploads/');
define('UPLOAD_URL',  BASE_URL . 'uploads/');
define('MAX_UPLOAD',  2 * 1024 * 1024); // 2 MB per berkas

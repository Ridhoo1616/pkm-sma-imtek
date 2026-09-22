<?php
/**
 * Penjaga akses panel admin.
 * Sertakan file ini di setiap halaman admin (kecuali login.php).
 */
require_once dirname(__DIR__, 2) . '/includes/functions.php';

/** Apakah pengguna sudah login */
function sudah_login(): bool
{
    return !empty($_SESSION['admin_id']);
}

/** Paksa login; alihkan ke halaman login bila belum */
function wajib_login(): void
{
    if (!sudah_login()) {
        $_SESSION['tujuan_setelah_login'] = $_SERVER['REQUEST_URI'] ?? '';
        set_flash('warning', 'Silakan masuk terlebih dahulu untuk mengakses panel admin.');
        redirect('admin/login.php');
    }
    // Batas waktu tidak aktif: 2 jam
    if (!empty($_SESSION['admin_aktif']) && (time() - $_SESSION['admin_aktif']) > 7200) {
        session_unset();
        session_destroy();
        session_start();
        set_flash('warning', 'Sesi Anda berakhir karena tidak ada aktivitas. Silakan masuk kembali.');
        redirect('admin/login.php');
    }
    $_SESSION['admin_aktif'] = time();
}

/** Batasi halaman hanya untuk peran admin */
function wajib_admin(): void
{
    wajib_login();
    if (($_SESSION['admin_role'] ?? '') !== 'admin') {
        set_flash('danger', 'Halaman tersebut hanya dapat diakses oleh Administrator.');
        redirect('admin/index.php');
    }
}

function admin_nama(): string  { return $_SESSION['admin_nama'] ?? 'Pengguna'; }
function admin_role(): string  { return $_SESSION['admin_role'] ?? 'operator'; }
function admin_id(): int       { return (int) ($_SESSION['admin_id'] ?? 0); }

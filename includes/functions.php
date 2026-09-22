<?php
/**
 * Kumpulan fungsi bantu (helper) aplikasi
 */

require_once dirname(__DIR__) . '/config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/* ==================================================================
 |  KEAMANAN & OUTPUT
 * ================================================================== */

/** Escape output agar aman dari XSS */
function e(?string $teks): string
{
    return htmlspecialchars((string) $teks, ENT_QUOTES, 'UTF-8');
}

/** Ambil nilai dari $_POST/$_GET dengan aman */
function input(string $key, string $sumber = 'post', $default = null)
{
    $arr = $sumber === 'get' ? $_GET : $_POST;
    $val = $arr[$key] ?? $default;
    return is_string($val) ? trim($val) : $val;
}

/** Buat / ambil token CSRF */
function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/** Cetak input hidden CSRF */
function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . csrf_token() . '">';
}

/** Validasi token CSRF; hentikan eksekusi bila tidak cocok */
function csrf_verify(): void
{
    $kiriman = $_POST['csrf_token'] ?? '';
    if (!is_string($kiriman) || !hash_equals(csrf_token(), $kiriman)) {
        http_response_code(419);
        exit('Sesi Anda telah berakhir atau permintaan tidak sah. Silakan muat ulang halaman.');
    }
}

/* ==================================================================
 |  NAVIGASI & NOTIFIKASI
 * ================================================================== */

function redirect(string $url): void
{
    header('Location: ' . (preg_match('#^https?://#', $url) ? $url : BASE_URL . ltrim($url, '/')));
    exit;
}

/** Simpan pesan kilat untuk ditampilkan di halaman berikutnya */
function set_flash(string $tipe, string $pesan): void
{
    $_SESSION['flash'] = ['tipe' => $tipe, 'pesan' => $pesan];
}

/** Tampilkan pesan kilat (sekali pakai) */
function tampil_flash(): string
{
    if (empty($_SESSION['flash'])) {
        return '';
    }
    $f = $_SESSION['flash'];
    unset($_SESSION['flash']);
    $ikon = ['success' => 'bi-check-circle', 'danger' => 'bi-x-circle',
             'warning' => 'bi-exclamation-triangle', 'info' => 'bi-info-circle'];
    $kls  = $ikon[$f['tipe']] ?? 'bi-info-circle';
    return '<div class="alert alert-' . e($f['tipe']) . ' alert-dismissible fade show d-flex align-items-start gap-2">'
        . '<i class="bi ' . $kls . ' fs-5"></i><div>' . $f['pesan'] . '</div>'
        . '<button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button></div>';
}

/* ==================================================================
 |  PENGATURAN SITUS
 * ================================================================== */

/** Ambil satu nilai pengaturan (di-cache dalam satu request) */
function setting(string $nama, string $default = ''): string
{
    static $cache = null;
    global $pdo;
    if ($cache === null) {
        $cache = [];
        foreach ($pdo->query('SELECT nama_setting, nilai FROM pengaturan') as $r) {
            $cache[$r['nama_setting']] = $r['nilai'];
        }
    }
    return ($cache[$nama] ?? '') !== '' ? $cache[$nama] : $default;
}

/** Pecah pengaturan multi-baris menjadi array poin */
function setting_list(string $nama): array
{
    $baris = preg_split('/\r\n|\r|\n/', setting($nama));
    return array_values(array_filter(array_map('trim', $baris), fn($b) => $b !== ''));
}

/** Apakah PPDB sedang dibuka (status + rentang tanggal) */
function ppdb_dibuka(): bool
{
    if (setting('ppdb_status', 'tutup') !== 'buka') {
        return false;
    }
    $hariIni = date('Y-m-d');
    $mulai   = setting('ppdb_mulai');
    $selesai = setting('ppdb_selesai');
    if ($mulai && $hariIni < $mulai) {
        return false;
    }
    if ($selesai && $hariIni > $selesai) {
        return false;
    }
    return true;
}

/* ==================================================================
 |  FORMAT DATA
 * ================================================================== */

/** Tanggal ke format Indonesia: 22 September 2026 */
function tgl_indo(?string $tanggal, bool $denganJam = false): string
{
    if (!$tanggal || $tanggal === '0000-00-00') {
        return '-';
    }
    $bulan = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
              'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    $ts  = strtotime($tanggal);
    $out = date('j', $ts) . ' ' . $bulan[(int) date('n', $ts)] . ' ' . date('Y', $ts);
    return $denganJam ? $out . ', ' . date('H:i', $ts) . ' WIB' : $out;
}

/** Potong teks pada batas kata */
function potong(?string $teks, int $panjang = 140): string
{
    $teks = trim(strip_tags((string) $teks));
    if (mb_strlen($teks) <= $panjang) {
        return $teks;
    }
    return rtrim(mb_substr($teks, 0, mb_strrpos(mb_substr($teks, 0, $panjang), ' ') ?: $panjang), ' ,.') . '...';
}

/** Ubah judul menjadi slug URL */
function buat_slug(string $teks): string
{
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $teks), '-'));
    return preg_replace('/-+/', '-', $slug) ?: 'artikel';
}

/** Slug unik pada sebuah tabel */
function slug_unik(PDO $pdo, string $tabel, string $slug, ?int $abaikanId = null): string
{
    $dasar = $slug;
    $n     = 1;
    while (true) {
        $sql = "SELECT id FROM `$tabel` WHERE slug = ?" . ($abaikanId ? ' AND id <> ?' : '');
        $st  = $pdo->prepare($sql);
        $st->execute($abaikanId ? [$slug, $abaikanId] : [$slug]);
        if (!$st->fetch()) {
            return $slug;
        }
        $slug = $dasar . '-' . (++$n);
    }
}

/** Warna badge untuk status pendaftar */
function warna_status(string $status): string
{
    return [
        'Menunggu Verifikasi' => 'secondary',
        'Terverifikasi'       => 'info',
        'Diterima'            => 'success',
        'Cadangan'            => 'warning',
        'Ditolak'             => 'danger',
    ][$status] ?? 'secondary';
}

/* ==================================================================
 |  UNGGAH BERKAS
 * ================================================================== */

/**
 * Proses unggah satu berkas dengan validasi tipe & ukuran.
 * @return array{0:?string,1:?string} [namaFile, pesanError]
 */
function unggah_berkas(array $berkas, string $subfolder, array $tipeIzin = ['jpg', 'jpeg', 'png', 'pdf']): array
{
    if (!isset($berkas['error']) || $berkas['error'] === UPLOAD_ERR_NO_FILE) {
        return [null, null]; // tidak ada berkas diunggah, bukan error
    }
    if ($berkas['error'] !== UPLOAD_ERR_OK) {
        return [null, 'Berkas gagal diunggah (kode ' . $berkas['error'] . '). Ukuran mungkin melebihi batas server.'];
    }
    if ($berkas['size'] > MAX_UPLOAD) {
        return [null, 'Ukuran berkas melebihi ' . round(MAX_UPLOAD / 1048576, 1) . ' MB.'];
    }

    $ext = strtolower(pathinfo($berkas['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $tipeIzin, true)) {
        return [null, 'Tipe berkas tidak diizinkan. Gunakan: ' . implode(', ', $tipeIzin) . '.'];
    }

    // Verifikasi tipe asli berkas, bukan hanya ekstensinya
    $mime  = function_exists('mime_content_type') ? mime_content_type($berkas['tmp_name']) : '';
    $mimeOk = ['image/jpeg', 'image/png', 'application/pdf'];
    if ($mime && !in_array($mime, $mimeOk, true)) {
        return [null, 'Isi berkas tidak dikenali sebagai gambar atau PDF.'];
    }

    $tujuanDir = rtrim(UPLOAD_PATH . $subfolder, '/') . '/';
    if (!is_dir($tujuanDir) && !mkdir($tujuanDir, 0775, true)) {
        return [null, 'Folder penyimpanan tidak dapat dibuat.'];
    }

    $nama = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
    if (!move_uploaded_file($berkas['tmp_name'], $tujuanDir . $nama)) {
        return [null, 'Berkas tidak dapat disimpan ke server.'];
    }
    return [$nama, null];
}

/** Hapus berkas unggahan bila ada */
function hapus_berkas(?string $nama, string $subfolder): void
{
    if (!$nama) {
        return;
    }
    $path = rtrim(UPLOAD_PATH . $subfolder, '/') . '/' . basename($nama);
    if (is_file($path)) {
        @unlink($path);
    }
}

/** URL gambar unggahan, dengan gambar cadangan bila kosong */
function url_upload(?string $nama, string $subfolder, string $cadangan = 'assets/img/no-image.svg'): string
{
    if ($nama && is_file(rtrim(UPLOAD_PATH . $subfolder, '/') . '/' . basename($nama))) {
        return UPLOAD_URL . trim($subfolder, '/') . '/' . rawurlencode($nama);
    }
    return BASE_URL . $cadangan;
}

/* ==================================================================
 |  PPDB
 * ================================================================== */

/** Buat nomor registrasi unik: PPDB-2627-0001 */
function buat_no_registrasi(PDO $pdo, string $tahunAjaran): string
{
    $kode = preg_replace('/\D/', '', $tahunAjaran);           // 2026/2027 -> 20262027
    $kode = substr($kode, 2, 2) . substr($kode, 6, 2);        // -> 2627
    $st   = $pdo->prepare('SELECT COUNT(*) FROM pendaftar WHERE tahun_ajaran = ?');
    $st->execute([$tahunAjaran]);
    $urut = (int) $st->fetchColumn();
    do {
        $urut++;
        $no = 'PPDB-' . $kode . '-' . str_pad((string) $urut, 4, '0', STR_PAD_LEFT);
        $c  = $pdo->prepare('SELECT id FROM pendaftar WHERE no_registrasi = ?');
        $c->execute([$no]);
    } while ($c->fetch());
    return $no;
}

/** Jumlah pendaftar pada tahun ajaran aktif */
function jumlah_pendaftar(PDO $pdo, ?string $status = null): int
{
    $sql = 'SELECT COUNT(*) FROM pendaftar WHERE tahun_ajaran = ?';
    $par = [setting('ppdb_tahun')];
    if ($status) {
        $sql .= ' AND status = ?';
        $par[] = $status;
    }
    $st = $pdo->prepare($sql);
    $st->execute($par);
    return (int) $st->fetchColumn();
}

/* ==================================================================
 |  STATISTIK KUNJUNGAN (pengukuran jangkauan promosi)
 * ================================================================== */

function catat_kunjungan(PDO $pdo, string $halaman): void
{
    try {
        $st = $pdo->prepare(
            'INSERT INTO statistik_kunjungan (tanggal, halaman, referer, ip, jumlah)
             VALUES (CURDATE(), ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE jumlah = jumlah + 1'
        );
        $st->execute([
            $halaman,
            substr($_SERVER['HTTP_REFERER'] ?? '', 0, 255) ?: null,
            $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    } catch (PDOException $e) {
        // statistik bersifat opsional, jangan ganggu tampilan halaman
    }
}

/** Daftar kanal promosi untuk form & laporan */
function daftar_sumber_informasi(): array
{
    return [
        'Website Sekolah'     => 'Website resmi sekolah',
        'Instagram'           => 'Instagram',
        'Facebook'            => 'Facebook',
        'TikTok'              => 'TikTok',
        'WhatsApp'            => 'Pesan/Grup WhatsApp',
        'Google'              => 'Pencarian Google',
        'Brosur/Spanduk'      => 'Brosur atau spanduk',
        'Sosialisasi Sekolah' => 'Sosialisasi ke SMP/MTs',
        'Teman/Keluarga'      => 'Teman atau keluarga',
        'Alumni'              => 'Alumni sekolah',
        'Guru SMP'            => 'Guru/BK di SMP',
        'Lainnya'             => 'Lainnya',
    ];
}

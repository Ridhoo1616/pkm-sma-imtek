<?php
/**
 * Pesan masuk dari formulir kontak website
 */
require_once __DIR__ . '/includes/auth.php';
wajib_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_verify();
    $id   = (int) input('id');
    $aksi = input('aksi');

    if ($aksi === 'hapus') {
        $pdo->prepare('DELETE FROM pesan WHERE id = ?')->execute([$id]);
        set_flash('success', 'Pesan berhasil dihapus.');
    } elseif ($aksi === 'baca') {
        $pdo->prepare('UPDATE pesan SET dibaca = 1 - dibaca WHERE id = ?')->execute([$id]);
    } elseif ($aksi === 'baca_semua') {
        $pdo->exec('UPDATE pesan SET dibaca = 1 WHERE dibaca = 0');
        set_flash('success', 'Semua pesan ditandai sudah dibaca.');
    }
    redirect('admin/pesan.php');
}

$daftar = $pdo->query('SELECT * FROM pesan ORDER BY dibaca ASC, created_at DESC')->fetchAll();
$belum  = count(array_filter($daftar, fn($p) => !$p['dibaca']));

$judul      = 'Pesan Masuk';
$menu_aktif = 'pesan';
require_once __DIR__ . '/includes/header.php';
?>

<div class="panel">
  <div class="panel-kepala">
    <i class="bi bi-envelope text-primary"></i>
    <h2>Pesan dari Formulir Kontak</h2>
    <span class="badge bg-light text-dark"><?= count($daftar) ?> pesan</span>
    <?php if ($belum): ?>
      <span class="badge bg-danger"><?= $belum ?> belum dibaca</span>
      <form method="post" class="ms-auto">
        <?= csrf_field() ?>
        <input type="hidden" name="aksi" value="baca_semua">
        <button class="btn btn-sm btn-outline-primary"><i class="bi bi-check2-all me-1"></i>Tandai Semua Dibaca</button>
      </form>
    <?php endif; ?>
  </div>
  <div class="panel-isi">
    <?php if (!$daftar): ?>
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>Belum ada pesan masuk.
      </div>
    <?php else: ?>
      <div class="accordion" id="daftarPesan">
        <?php foreach ($daftar as $i => $p): ?>
          <div class="accordion-item <?= $p['dibaca'] ? '' : 'border-primary' ?>">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                      data-bs-target="#pesan<?= (int) $p['id'] ?>">
                <span class="d-flex flex-wrap align-items-center gap-2 w-100 pe-3">
                  <?php if (!$p['dibaca']): ?>
                    <span class="badge bg-danger">Baru</span>
                  <?php endif; ?>
                  <strong><?= e($p['nama']) ?></strong>
                  <span class="text-muted small"><?= e($p['subjek'] ?: 'Tanpa subjek') ?></span>
                  <span class="ms-auto small text-muted"><?= e(tgl_indo($p['created_at'], true)) ?></span>
                </span>
              </button>
            </h2>
            <div id="pesan<?= (int) $p['id'] ?>" class="accordion-collapse collapse" data-bs-parent="#daftarPesan">
              <div class="accordion-body">
                <div class="row g-3">
                  <div class="col-md-4">
                    <table class="table table-sm small mb-0">
                      <tr><th class="text-muted fw-normal">Nama</th><td class="fw-semibold"><?= e($p['nama']) ?></td></tr>
                      <tr><th class="text-muted fw-normal">Email</th><td><?= e($p['email'] ?: '-') ?></td></tr>
                      <tr><th class="text-muted fw-normal">No. HP</th><td><?= e($p['no_hp'] ?: '-') ?></td></tr>
                      <tr><th class="text-muted fw-normal">Waktu</th><td><?= e(tgl_indo($p['created_at'], true)) ?></td></tr>
                    </table>
                  </div>
                  <div class="col-md-8">
                    <div class="bg-light rounded-3 p-3 mb-3">
                      <?= nl2br(e($p['isi'])) ?>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                      <?php if ($p['email']): ?>
                        <a href="mailto:<?= e($p['email']) ?>?subject=<?= rawurlencode('Re: ' . ($p['subjek'] ?: 'Pertanyaan Anda')) ?>"
                           class="btn btn-sm btn-primary"><i class="bi bi-reply me-1"></i>Balas Email</a>
                      <?php endif; ?>
                      <?php if ($p['no_hp']): ?>
                        <a href="https://wa.me/<?= e(preg_replace('/^0/', '62', preg_replace('/\D/', '', $p['no_hp']))) ?>"
                           target="_blank" rel="noopener" class="btn btn-sm btn-success">
                          <i class="bi bi-whatsapp me-1"></i>Balas WhatsApp</a>
                      <?php endif; ?>
                      <form method="post" class="d-inline">
                        <?= csrf_field() ?>
                        <input type="hidden" name="aksi" value="baca">
                        <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                        <button class="btn btn-sm btn-outline-secondary">
                          <i class="bi bi-<?= $p['dibaca'] ? 'envelope' : 'envelope-open' ?> me-1"></i>
                          Tandai <?= $p['dibaca'] ? 'Belum Dibaca' : 'Sudah Dibaca' ?>
                        </button>
                      </form>
                      <form method="post" class="d-inline ms-auto">
                        <?= csrf_field() ?>
                        <input type="hidden" name="aksi" value="hapus">
                        <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                        <button class="btn btn-sm btn-outline-danger" data-konfirmasi="Hapus pesan dari <?= e($p['nama']) ?>?">
                          <i class="bi bi-trash me-1"></i>Hapus
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>

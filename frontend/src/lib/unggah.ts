/**
 * Batas ukuran satu berkas unggahan, dalam megabita.
 *
 * HARUS SAMA dengan `UPLOAD_MAX_BYTES` pada `backend/.env`. Yang menolak
 * berkas kebesaran tetap backend — nilai di sini hanya untuk memberi tahu
 * pengguna sebelum ia memilih berkasnya, supaya penolakannya tidak datang
 * setelah menunggu unggahan selesai.
 *
 * Ditaruh di satu tempat karena sebelumnya tidak. Angka "2 MB" ditulis
 * tangan di SEBELAS berkas — formulir PPDB, delapan halaman panel, dan dua
 * komentar — sehingga menaikkan batasnya di backend akan membuat kesebelas
 * tulisan itu berbohong, satu per satu, tanpa satu pun galat yang
 * menandainya. Sekarang menaikkannya berarti mengubah dua angka: yang ini
 * dan yang di `.env`.
 */
export const BATAS_UNGGAH_MB = 3;

/** "3 MB", untuk disisipkan ke kalimat bantuan. */
export const BATAS_UNGGAH = `${BATAS_UNGGAH_MB} MB`;

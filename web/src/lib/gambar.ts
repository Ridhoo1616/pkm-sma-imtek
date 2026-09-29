/**
 * Alamat gambar unggahan yang sudah dikecilkan, lewat
 * src/pages/gambar/[folder]/[nama].ts.
 *
 * Foto sekolah diunggah panitia apa adanya — foto gedung yang terpasang
 * sekarang PNG 2,3 MB, lebih berat daripada seluruh JavaScript halaman — dan
 * pengunjung PPDB kebanyakan membuka situs dari ponsel dengan data seluler.
 * Halaman karena itu meminta ukuran yang sesuai layar, bukan berkas aslinya.
 */
export const LEBAR = [160, 320, 480, 640, 800, 1024, 1280, 1600, 1920] as const;
export type Lebar = (typeof LEBAR)[number];

export function gambar(folder: string, nama: string, lebar: Lebar): string {
  if (!nama) return "";
  return `/gambar/${folder}/${encodeURIComponent(nama)}?w=${lebar}`;
}

/** Nilai srcset untuk beberapa lebar sekaligus. */
export function srcsetGambar(folder: string, nama: string, lebar: Lebar[]): string {
  if (!nama) return "";
  return lebar.map((w) => `${gambar(folder, nama, w)} ${w}w`).join(", ");
}

/** Gambar pratinjau tautan (Open Graph): 1200 x 630, JPEG, dipotong di tengah. */
export function gambarPratinjau(nama: string): string {
  if (!nama) return "";
  return `/gambar/profil/${encodeURIComponent(nama)}?pola=og`;
}

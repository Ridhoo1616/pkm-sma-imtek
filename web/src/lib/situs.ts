/**
 * Alamat publik situs, untuk tautan yang harus mutlak: sitemap, robots.txt,
 * gambar pratinjau, dan alamat kanonis.
 *
 * ALAMAT_SITUS diisi begitu sekolah punya domain (misalnya
 * https://smaimtek.sch.id). Selama kosong, yang dipakai asal permintaan itu
 * sendiri, dan alamat kanonis TIDAK dipasang: menandai localhost sebagai
 * alamat resmi justru menyesatkan mesin pencari bila halamannya terindeks.
 */
export const ALAMAT_SITUS = (process.env.ALAMAT_SITUS ?? "").replace(/\/$/, "");

export function asalSitus(url: URL): string {
  return ALAMAT_SITUS || url.origin;
}

/**
 * Awalan alamat situs di peramban.
 *
 * Pada pemasangan sekolah situsnya berada di akar domain, jadi awalannya
 * kosong dan kedua fungsi di bawah tidak mengubah apa pun. Awalan hanya
 * terisi pada demo GitHub Pages, yang disajikan di bawah /pkm-sma-imtek/:
 * halaman demo memasang `globalThis.__DASAR_DEMO` sebelum skrip lain dimuat
 * (lihat alat/demo). Tanpa awalan itu setiap tautan dan pengalihan dari
 * komponen React menuju akar domain github.io, di luar demonya.
 *
 * Di server awalannya selalu kosong: HTML demo ditangkap dari server biasa,
 * lalu awalannya ditambahkan pada berkas hasil tangkapan.
 */
declare global {
  var __DASAR_DEMO: string | undefined;
}

export function dasar(): string {
  return typeof window === "undefined" ? "" : (globalThis.__DASAR_DEMO ?? "");
}

/** Menambahkan awalan pada jalur di situs ini ("/ppdb"), bukan alamat luar. */
export function denganDasar(alamat: string): string {
  const d = dasar();
  if (!d || !alamat.startsWith("/") || alamat.startsWith("//")) return alamat;
  return alamat.startsWith(d + "/") ? alamat : d + alamat;
}

/** Kebalikannya: jalur di peramban tanpa awalan, untuk menandai menu aktif. */
export function tanpaDasar(jalur: string): string {
  const d = dasar();
  if (!d || !jalur.startsWith(d)) return jalur;
  return jalur.slice(d.length) || "/";
}

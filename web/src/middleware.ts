import { defineMiddleware } from "astro:middleware";

/**
 * Kepala keamanan untuk setiap jawaban situs Astro. Backend sudah
 * memasangnya pada jawaban API-nya sendiri; halaman Astro belum.
 *
 * Hanya dipasang bila belum ada, supaya jawaban yang diteruskan dari backend
 * — misalnya unggahan yang sengaja memakai X-Frame-Options: DENY — tetap
 * membawa kepalanya sendiri yang lebih ketat.
 *
 * Content-Security-Policy sengaja BELUM dipasang: halaman memuat skrip
 * sebaris, peta sematan Google Maps, dan tautan wa.me, sehingga kebijakan
 * yang salah sedikit saja mematikan fitur tanpa pesan galat yang terlihat.
 */
const KEPALA: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Hitung jarak di beranda memakai lokasi pengunjung lewat Google Maps di
  // tab baru, bukan lewat halaman ini, jadi geolokasi pun tidak diperlukan.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export const onRequest = defineMiddleware(async (_konteks, lanjut) => {
  const jawaban = await lanjut();
  const kurang = Object.entries(KEPALA).filter(([nama]) => !jawaban.headers.has(nama));
  if (kurang.length === 0) return jawaban;
  try {
    for (const [nama, nilai] of kurang) jawaban.headers.set(nama, nilai);
    return jawaban;
  } catch {
    // Kepala jawaban dari Response.redirect() dan sejenisnya tidak dapat
    // diubah; jawabannya disalin dengan kepala baru.
    const kepala = new Headers(jawaban.headers);
    for (const [nama, nilai] of kurang) kepala.set(nama, nilai);
    return new Response(jawaban.body, { status: jawaban.status, statusText: jawaban.statusText, headers: kepala });
  }
});

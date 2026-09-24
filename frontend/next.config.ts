import type { NextConfig } from "next";

/**
 * Kepala keamanan HTTP.
 *
 * Sebelumnya tidak ada satu pun, jadi peramban tidak diberi tahu apa pun
 * tentang batasan halaman ini: boleh dibingkai situs lain, boleh menebak
 * jenis berkas dari isinya, dan boleh memuat skrip dari mana saja.
 *
 * Alamat API ikut disebut pada connect-src dan img-src karena backend berjalan
 * di asal yang berbeda: porta lain saat di komputer sendiri, subdomain lain di
 * server. Tanpa itu seluruh permintaan data dan seluruh foto yang dilayani
 * backend akan diblokir peramban.
 */
const ALAMAT_API = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090"
).replace(/\/$/, "");

const pengembangan = process.env.NODE_ENV !== "production";

/**
 * Yang TIDAK dapat diperketat sekarang, dan alasannya, supaya tidak terbaca
 * sebagai kelalaian:
 *
 *   - `script-src` masih memuat 'unsafe-inline'. Next menyisipkan skrip
 *     sebaris untuk hidrasi, dan tanpa izin itu seluruh halaman berhenti
 *     bekerja. Yang benar nonce per permintaan, dan itu menuntut middleware
 *     Next tersendiri; dicatat sebagai pekerjaan berikutnya.
 *   - `style-src` juga, sebab React menulis gaya sebaris pada beberapa
 *     komponen, misalnya pergeseran karusel berita.
 *   - `blob:` diizinkan pada object-src dan frame-src. Bukti pendaftaran,
 *     kartu peserta, dan dokumen pendaftar diminta lewat fetch (alamatnya
 *     POST, atau memerlukan token) lalu dibuka sebagai blob. Dokumen blob
 *     mewarisi CSP halaman yang membuatnya, jadi tanpa izin itu tab PDF-nya
 *     tampil kosong.
 *   - 'unsafe-eval' hanya saat pengembangan, dipakai next dev.
 */
function csp(): string {
  const skrip = ["'self'", "'unsafe-inline'"];
  if (pengembangan) skrip.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${skrip.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${ALAMAT_API}`,
    "font-src 'self'",
    `connect-src 'self' ${ALAMAT_API}`,
    "object-src 'self' blob:",
    "frame-src 'self' blob:",
    "media-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
  ].join("; ");
}

const kepala = [
  { key: "Content-Security-Policy", value: csp() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// HSTS hanya berarti pada sambungan https, dan menyetelnya saat di komputer
// sendiri justru menyusahkan: peramban akan menolak http://localhost sesudah
// sekali menerimanya. Jadi hanya dipasang pada build produksi.
if (!pengembangan) {
  kepala.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: kepala }];
  },
};

export default nextConfig;

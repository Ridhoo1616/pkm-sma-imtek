import type { APIRoute } from "astro";

/**
 * Semua alamat yang BELUM punya halaman Astro.
 *
 * Frontend dipindah dari Next ke Astro satu halaman demi satu halaman. Selama
 * itu berlangsung, rute ini yang menjaga situsnya tetap utuh:
 *
 *   - /api/* dan /unggahan/* DITERUSKAN ke backend Go. Komponen interaktif
 *     di peramban memanggil asal yang sama (lihat astro.config.mjs), jadi
 *     backend tidak perlu mengizinkan asal situs Astro di CORS_ORIGINS.
 *   - Halaman lainnya DIALIHKAN ke frontend Next, bukan diteruskan. Halaman
 *     Next memanggil backend langsung dari peramban, dan dari asal Astro
 *     panggilan itu ditolak CORS — halamannya akan tampil tetapi formulir
 *     dan panelnya mati. Di asalnya sendiri, Next bekerja seperti biasa.
 *
 * Begitu sebuah halaman dibuat di src/pages, Astro memilih halaman itu dan
 * rute ini tidak lagi tersentuh untuk alamat tersebut.
 */
export const prerender = false;

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090").replace(/\/$/, "");
const SITUS_LAMA = (process.env.SITUS_LAMA ?? "http://localhost:3000").replace(/\/$/, "");

// Kepala yang tidak boleh diteruskan apa adanya. fetch sudah membuka
// pemampatannya, jadi content-encoding dan content-length yang lama salah.
const BUANG = ["host", "connection", "content-length", "content-encoding", "transfer-encoding"];

async function teruskan(permintaan: Request, tujuan: string): Promise<Response> {
  const kepala = new Headers(permintaan.headers);
  for (const k of BUANG) kepala.delete(k);

  const adaBadan = !["GET", "HEAD"].includes(permintaan.method);
  let jawaban: Response;
  try {
    jawaban = await fetch(tujuan, {
      method: permintaan.method,
      headers: kepala,
      body: adaBadan ? await permintaan.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { pesan: "Tidak dapat menghubungi server. Pastikan server API sedang berjalan." },
      { status: 502 },
    );
  }

  const kepalaJawab = new Headers(jawaban.headers);
  for (const k of BUANG) kepalaJawab.delete(k);
  return new Response(jawaban.body, { status: jawaban.status, headers: kepalaJawab });
}

export const ALL: APIRoute = ({ request, url }) => {
  const jalur = url.pathname + url.search;

  // /api/segarkan milik Next (membuang tembolok halaman Next), bukan backend.
  if (url.pathname === "/api/segarkan") {
    return teruskan(request, SITUS_LAMA + jalur);
  }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/unggahan/")) {
    return teruskan(request, API + jalur);
  }
  return Response.redirect(SITUS_LAMA + jalur, 307);
};

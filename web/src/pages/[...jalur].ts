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
 *   - Halaman lainnya (kini hanya panel admin) menuju frontend Next, dengan
 *     salah satu dari dua cara, dipilih lewat SITUS_LAMA_DITERUSKAN:
 *
 *       "ya"  → DITERUSKAN: alamatnya tetap asal Astro. Hanya aman bila Astro
 *               berjalan pada asal yang tercantum di CORS_ORIGINS backend —
 *               di komputer sekolah, porta 3000 — sebab halaman Next
 *               memanggil backend langsung dari peramban memakai asal itu.
 *               Dengan begini localhost:3000/admin tetap alamat panelnya.
 *       lain  → DIALIHKAN ke alamat Next sendiri. Dipakai saat Astro berjalan
 *               di porta lain (misalnya 4321 untuk pengembangan), karena dari
 *               asal itu panggilan panel ke backend ditolak CORS.
 *
 * Begitu sebuah halaman dibuat di src/pages, Astro memilih halaman itu dan
 * rute ini tidak lagi tersentuh untuk alamat tersebut.
 */
export const prerender = false;

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090").replace(/\/$/, "");
const SITUS_LAMA = (process.env.SITUS_LAMA ?? "http://localhost:3000").replace(/\/$/, "");
const DITERUSKAN = process.env.SITUS_LAMA_DITERUSKAN === "ya";

// Kepala yang tidak boleh diteruskan apa adanya. fetch sudah membuka
// pemampatannya, jadi content-encoding dan content-length yang lama salah.
// Sisanya kepala hop-by-hop yang hanya berlaku untuk satu sambungan; `expect`
// terutama, sebab fetch Node menolak permintaan yang membawanya, dan klien
// seperti curl mengirimnya pada setiap unggahan besar.
const BUANG = [
  "host", "connection", "content-length", "content-encoding", "transfer-encoding",
  "expect", "keep-alive", "upgrade", "te", "trailer", "proxy-connection",
];

async function teruskan(permintaan: Request, tujuan: string, alamatKlien: string): Promise<Response> {
  const kepala = new Headers(permintaan.headers);
  for (const k of BUANG) kepala.delete(k);

  // Alamat pengunjung yang sebenarnya WAJIB ikut. Backend membatasi laju per
  // alamat IP — formulir PPDB 20 per jam, cek status 60 per 10 menit, pesan
  // 10 per jam — dan tanpa kepala ini setiap permintaan terbaca datang dari
  // 127.0.0.1, sehingga SELURUH pengunjung berbagi satu jatah. Pendaftar ke-21
  // dalam satu jam akan ditolak, siapa pun dia.
  //
  // Kepala dari pengunjung TIDAK dipercaya: keduanya ditimpa dengan alamat
  // yang benar-benar dilihat server ini. Menambahkannya saja ke rantai tidak
  // cukup: backend memercayai alamat jaringan lokal (192.168.x), jadi
  // pengunjung di jaringan sekolah dapat mengaku beralamat apa saja lewat
  // kepala buatannya sendiri. X-Real-IP ikut diisi karena backend memakainya
  // bila seluruh rantai berada di jaringan tepercaya.
  //
  // Satu pengecualian: bila permintaan datang dari loopback, ada proksi balik
  // di depan Astro (Caddy atau nginx di mesin yang sama), dan kepala yang
  // ditulisnya diteruskan apa adanya.
  const dariProksi = /^(127\.|::1$|::ffff:127\.)/.test(alamatKlien);
  if (!dariProksi || !kepala.has("x-forwarded-for")) {
    kepala.set("x-forwarded-for", alamatKlien);
    kepala.set("x-real-ip", alamatKlien);
  }

  const adaBadan = !["GET", "HEAD"].includes(permintaan.method);
  // Badan dibaca lebih dulu, terpisah dari panggilan ke tujuan: kiriman yang
  // melewati batas bodySizeLimit (astro.config.mjs) gagal di sini, dan
  // pengirimnya perlu tahu sebabnya — bukan "server tidak dapat dihubungi".
  let badan: ArrayBuffer | undefined;
  if (adaBadan) {
    try {
      badan = await permintaan.arrayBuffer();
    } catch {
      return Response.json(
        { pesan: "Kiriman terlalu besar. Setiap berkas paling besar 3 MB; kecilkan ukurannya lalu kirim ulang." },
        { status: 413 },
      );
    }
  }
  let jawaban: Response;
  try {
    jawaban = await fetch(tujuan, {
      method: permintaan.method,
      headers: kepala,
      body: badan,
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
  // Pengalihan dari server tujuan yang menyebut alamatnya sendiri dibuat
  // relatif, supaya peramban tetap di asal Astro dan tidak melompat ke
  // porta Next yang tidak diizinkan backend.
  const lokasi = kepalaJawab.get("location");
  if (lokasi?.startsWith(SITUS_LAMA)) kepalaJawab.set("location", lokasi.slice(SITUS_LAMA.length) || "/");
  return new Response(jawaban.body, { status: jawaban.status, headers: kepalaJawab });
}

export const ALL: APIRoute = ({ request, url, clientAddress }) => {
  const jalur = url.pathname + url.search;

  // /api/segarkan milik Next (membuang tembolok halaman Next), bukan backend.
  if (url.pathname === "/api/segarkan") {
    return teruskan(request, SITUS_LAMA + jalur, clientAddress);
  }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/unggahan/")) {
    return teruskan(request, API + jalur, clientAddress);
  }
  return DITERUSKAN ? teruskan(request, SITUS_LAMA + jalur, clientAddress) : Response.redirect(SITUS_LAMA + jalur, 307);
};

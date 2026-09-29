// Menangkap situs Astro dan panel admin Next menjadi berkas statis untuk
// demo GitHub Pages. Dijalankan oleh alat/demo/rakit.sh, yang lebih dulu
// menyalakan backend demo, server Astro, dan server Next.
//
// HTML-nya adalah keluaran aplikasi yang sebenarnya, bukan tiruan. Yang
// diubah hanya alamatnya: demo disajikan di bawah /pkm-sma-imtek/, jadi setiap
// jalur "/..." diberi awalan itu, dan setiap halaman memuat api-demo.js yang
// menjawab panggilan /api/* dari data di peramban pengunjung.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ASTRO = process.env.ASTRO ?? "http://127.0.0.1:3100";
const NEXT = process.env.NEXT ?? "http://127.0.0.1:3101";
const API = process.env.API ?? "http://localhost:8190";
const DASAR = process.env.DASAR ?? "/pkm-sma-imtek";
const KELUAR = process.env.KELUAR ?? "docs";
const WEB_KLIEN = process.env.WEB_KLIEN; // web/dist/client
const NEXT_STATIS = process.env.NEXT_STATIS; // frontend/.next/static
const UNGGAHAN = process.env.UNGGAHAN; // folder unggahan backend demo
const API_DEMO = process.env.API_DEMO ?? new URL("./api-demo.js", import.meta.url).pathname;
// Halaman rincian pendaftar dibuat untuk id yang sudah ada ditambah cadangan
// untuk pendaftar yang didaftarkan pengunjung demo. Halaman Next membaca id
// dari muatan yang ikut di HTML-nya, bukan dari alamat, jadi setiap id perlu
// berkasnya sendiri.
const CADANGAN_ID = Number(process.env.CADANGAN_ID ?? 60);

const sisip =
  `<script>globalThis.__DASAR_DEMO=${JSON.stringify(DASAR)}</script>` +
  `<script src="${DASAR}/demo/api-demo.js"></script>`;

async function tulis(jalur, isi) {
  await mkdir(dirname(jalur), { recursive: true });
  await writeFile(jalur, isi);
}

async function* telusuri(folder) {
  for (const b of await readdir(folder, { withFileTypes: true })) {
    const p = join(folder, b.name);
    if (b.isDirectory()) yield* telusuri(p);
    else yield p;
  }
}

/* ---------- gambar responsif ---------- */

// /gambar/<folder>/<nama>?w=640 dibuat server Astro dengan sharp. GitHub Pages
// tidak membaca kueri, jadi setiap ukuran disimpan sebagai berkas sendiri.
const gambarTertangkap = new Map();
function berkasGambar(folder, nama, kueri) {
  const w = /(?:^|&)w=(\d+)/.exec(kueri)?.[1];
  const og = /pola=og/.test(kueri);
  const dasarNama = decodeURIComponent(nama).replace(/[^A-Za-z0-9._-]/g, "_");
  const tujuan = `gambar/${folder}/${dasarNama}-${og ? "og.jpg" : `${w}.webp`}`;
  gambarTertangkap.set(tujuan, `/gambar/${folder}/${nama}?${kueri}`);
  return `${DASAR}/${tujuan}`;
}

/* ---------- penulisan ulang alamat ---------- */

function awali(alamat) {
  if (!alamat.startsWith("/") || alamat.startsWith("//")) return alamat;
  if (alamat === DASAR || alamat.startsWith(DASAR + "/")) return alamat;
  const g = /^\/gambar\/([^/]+)\/([^?"\s]+)\?([^"\s,]*)/.exec(alamat.replaceAll("&amp;", "&"));
  if (g) return berkasGambar(g[1], g[2], g[3]);
  return DASAR + alamat;
}

function tulisUlangHtml(html) {
  // Atribut apa pun yang nilainya jalur situs. Muatan pulau React (props)
  // diawali "{", jadi tidak tersentuh; komponennya menambahkan awalan
  // sendiri di peramban lewat web/src/shim/dasar.ts.
  html = html.replace(/(\s[\w:-]+=")(\/[^"]*)"/g, (_, a, v) =>
    /^\ssrcset=/i.test(a) ? `${a}${srcset(v)}"` : `${a}${awali(v)}"`,
  );
  html = html.replace(/(\ssrcset=")([^"]*)"/gi, (_, a, v) => `${a}${srcset(v)}"`);
  html = html.replace(/url\((['"]?)(\/[^)'"]*)\1\)/g, (_, q, v) => `url(${q}${awali(v)}${q})`);
  html = html.replace(/url\(&quot;(\/[^)]*?)&quot;\)/g, (_, v) => `url(&quot;${awali(v)}&quot;)`);
  return html.replace(/<head>|<head\s[^>]*>/, (m) => m + sisip);
}

function srcset(nilai) {
  return nilai
    .split(",")
    .map((bagian) => {
      const [u, ...sisa] = bagian.trim().split(/\s+/);
      return [awali(u), ...sisa].join(" ");
    })
    .join(", ");
}

/* ---------- mulai ---------- */

await rm(KELUAR, { recursive: true, force: true });
await mkdir(KELUAR, { recursive: true });
// Tanpa .nojekyll GitHub Pages membuang folder berawalan garis bawah, yaitu
// _astro dan _next.
await writeFile(join(KELUAR, ".nojekyll"), "");

// Aset Astro (termasuk isi frontend/public), aset Next, dan unggahan.
await cp(WEB_KLIEN, KELUAR, { recursive: true });
await cp(NEXT_STATIS, join(KELUAR, "_next/static"), { recursive: true });
await cp(UNGGAHAN, join(KELUAR, "unggahan"), { recursive: true });
await mkdir(join(KELUAR, "demo"), { recursive: true });
await cp(API_DEMO, join(KELUAR, "demo/api-demo.js"));

// Alamat di dalam berkas CSS dan JS.
for await (const p of telusuri(KELUAR)) {
  if (p.includes("/unggahan/")) continue;
  if (p.endsWith(".css")) {
    const isi = await readFile(p, "utf8");
    const baru = isi.replace(/url\((['"]?)(\/(?!\/)[^)'"]*)\1\)/g, (_, q, v) =>
      v.startsWith(DASAR + "/") ? `url(${q}${v}${q})` : `url(${q}${DASAR}${v}${q})`,
    );
    if (baru !== isi) await writeFile(p, baru);
  } else if (p.endsWith(".js") && (p.includes("/_astro/") || p.includes("/_next/"))) {
    const isi = await readFile(p, "utf8");
    // Panel Next dirakit dengan alamat API backend demo; di demo alamat itu
    // diganti awalan situs, sehingga panggilannya dijawab api-demo.js dan
    // gambar unggahan diambil dari folder unggahan/ demo.
    let baru = isi.replaceAll(JSON.stringify(API), JSON.stringify(DASAR));
    // Pemuat modul Vite menyebut aset Astro dengan jalur mutlak.
    baru = baru.replace(/(["'`])\/_astro\//g, `$1${DASAR}/_astro/`);
    if (baru !== isi) await writeFile(p, baru);
  }
}

// Halaman Astro: semua yang ada di peta situs, ditambah yang tidak diindeks.
const peta = await fetch(`${ASTRO}/sitemap.xml`).then((j) => j.text());
const jalurAstro = new Set(
  [...peta.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(DASAR, "") || "/"),
);
for (const j of ["/", "/ppdb/ujian", "/ppdb/cek", "/ppdb/daftar"]) jalurAstro.add(j);

let jumlah = 0;
for (const jalur of jalurAstro) {
  const j = await fetch(ASTRO + jalur, { redirect: "manual" });
  if (j.status !== 200) throw new Error(`Astro ${jalur}: ${j.status}`);
  await tulis(join(KELUAR, jalur, "index.html"), tulisUlangHtml(await j.text()));
  jumlah++;
}
{
  const j = await fetch(`${ASTRO}/halaman-yang-tidak-ada-${Date.now()}`);
  await tulis(join(KELUAR, "404.html"), tulisUlangHtml(await j.text()));
}
for (const berkas of ["robots.txt", "sitemap.xml"]) {
  await tulis(join(KELUAR, berkas), await fetch(`${ASTRO}/${berkas}`).then((j) => j.text()));
}

// Panel admin.
const halamanAdmin = [
  "", "masuk", "sandi", "berita", "biaya", "faq", "fasilitas", "galeri", "halaman", "jurusan",
  "kalender", "kegiatan", "laporan", "notifikasi", "pendaftar", "pendaftar/baru", "pengaturan",
  "pengguna", "pesan", "pustaka", "sekolah", "soal", "surat", "tanya-buntu", "tenaga", "ujian",
];
const data = JSON.parse(await readFile(join(process.env.DATA_DEMO), "utf8"));
const idTerbesar = Math.max(0, ...data.admin["/api/admin/pendaftar"].data.map((p) => p.id));
for (let id = 1; id <= idTerbesar + CADANGAN_ID; id++) halamanAdmin.push(`pendaftar/${id}`);

for (const h of halamanAdmin) {
  const jalur = `/admin${h ? "/" + h : ""}`;
  const j = await fetch(NEXT + DASAR + jalur, { redirect: "manual" });
  if (j.status !== 200) throw new Error(`Next ${jalur}: ${j.status}`);
  await tulis(join(KELUAR, jalur, "index.html"), tulisUlangHtml(await j.text()));
  jumlah++;
}

// Gambar responsif yang disebut halaman-halaman tadi.
for (const [tujuan, asal] of gambarTertangkap) {
  const j = await fetch(ASTRO + asal);
  if (j.ok) {
    await tulis(join(KELUAR, tujuan), Buffer.from(await j.arrayBuffer()));
    continue;
  }
  // sharp menolak berkas yang rusak (422), padahal peramban sering masih dapat
  // menampilkannya. Berkas aslinya yang dipakai, seperti di aplikasi.
  const [, folder, nama] = /^\/gambar\/([^/]+)\/([^?]+)/.exec(asal);
  console.warn(`peringatan: ${asal} gagal diolah (${j.status}); berkas asli dipakai`);
  await tulis(join(KELUAR, tujuan), await readFile(join(UNGGAHAN, folder, decodeURIComponent(nama))));
}

console.log(`${jumlah} halaman dan ${gambarTertangkap.size} gambar ditangkap ke ${KELUAR}`);

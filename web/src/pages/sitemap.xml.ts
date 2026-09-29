import type { APIRoute } from "astro";
import { MENU } from "@/lib/menu";
import { api } from "@/lib/api";
import { data } from "../lib/tembolok";
import { asalSitus } from "../lib/situs";
import type { Berita, Halaman } from "@/lib/tipe";

/**
 * Peta situs untuk mesin pencari: seluruh halaman menu, halaman naskah, dan
 * berita yang sudah terbit. Disusun dari MENU yang sama dengan navigasi,
 * jadi halaman yang ditambah ke menu ikut masuk tanpa disentuh di sini.
 * Tes seleksi tidak ikut: halaman itu memang tidak untuk diindeks.
 */
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async ({ url }) => {
  const asal = asalSitus(url);
  const jalur = new Set<string>();
  for (const m of MENU) {
    jalur.add(m.jalur);
    for (const a of m.anak ?? []) jalur.add(a.jalur);
  }
  jalur.delete("/ppdb/ujian");

  const [berita, halaman] = await Promise.all([
    data.berita("?per_halaman=100").then((h) => h.data).catch((): Berita[] => []),
    api.halaman().then((h) => h.data).catch((): Halaman[] => []),
  ]);
  for (const h of halaman) jalur.add(`/halaman/${h.slug}`);

  const baris = [
    ...[...jalur].map((j) => `<url><loc>${esc(asal + j)}</loc></url>`),
    ...berita.map(
      (b) => `<url><loc>${esc(`${asal}/berita/${b.slug}`)}</loc><lastmod>${esc((b.diubah || b.dibuat).slice(0, 10))}</lastmod></url>`,
    ),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${baris.join("\n")}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );
};

import type { APIRoute } from "astro";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LEBAR } from "../../../lib/gambar";

/**
 * Gambar unggahan yang dikecilkan dan diubah ke WebP.
 *
 * Tiga hal dijaga di sini:
 *
 *  1. HANYA folder publik. Dokumen pendaftar (KK, akta, ijazah) berada di
 *     folder `pendaftar` dan hanya boleh dibuka petugas yang sudah masuk;
 *     backend menjaganya, dan rute ini tidak boleh menjadi jalan pintas di
 *     sekelilingnya. Folder yang tidak ada di daftar dijawab 404.
 *  2. Lebarnya dari daftar tetap (lib/gambar.ts). Tanpa itu siapa pun dapat
 *     meminta ribuan lebar berbeda dan setiap permintaan memaksa server
 *     mengolah ulang gambarnya.
 *  3. Hasilnya disimpan di disk (.tembolok-gambar). Nama berkas unggahan
 *     selalu baru untuk setiap unggahan, jadi hasil yang tersimpan tidak
 *     pernah basi, dan peramban boleh menyimpannya lama.
 */
export const prerender = false;

const FOLDER_PUBLIK = new Set(["profil", "berita", "galeri", "fasilitas", "kegiatan"]);
const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090").replace(/\/$/, "");
const TEMBOLOK = join(process.cwd(), ".tembolok-gambar");

const tidakAda = () => new Response("Gambar tidak ditemukan.", { status: 404 });

export const GET: APIRoute = async ({ params, url }) => {
  const folder = params.folder ?? "";
  const nama = params.nama ?? "";
  if (!FOLDER_PUBLIK.has(folder) || !nama || nama.includes("/") || nama.includes("..")) {
    return tidakAda();
  }

  const og = url.searchParams.get("pola") === "og";
  const lebar = Number(url.searchParams.get("w") ?? 1280);
  if (!og && !(LEBAR as readonly number[]).includes(lebar)) {
    return new Response("Lebar tidak dikenal.", { status: 400 });
  }

  const tipe = og ? "image/jpeg" : "image/webp";
  const kunci = createHash("sha256").update(`${folder}/${nama}/${og ? "og" : lebar}`).digest("hex");
  const berkas = join(TEMBOLOK, `${kunci}.${og ? "jpg" : "webp"}`);
  const kepala = {
    "Content-Type": tipe,
    "Cache-Control": "public, max-age=2592000, immutable",
  };

  try {
    return new Response(new Uint8Array(await readFile(berkas)), { headers: kepala });
  } catch {
    /* belum ada di tembolok: diolah sekarang */
  }

  let asli: Response;
  try {
    asli = await fetch(`${API}/unggahan/${folder}/${encodeURIComponent(nama)}`);
  } catch {
    return new Response("Server gambar tidak dapat dihubungi.", { status: 502 });
  }
  if (!asli.ok || !(asli.headers.get("content-type") ?? "").startsWith("image/")) return tidakAda();

  let hasil: Buffer;
  try {
    const olah = sharp(Buffer.from(await asli.arrayBuffer()), { limitInputPixels: 50_000_000 }).rotate();
    hasil = og
      ? await olah.resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
      : await olah.resize({ width: lebar, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
  } catch {
    return new Response("Gambar tidak dapat diolah.", { status: 422 });
  }

  // Ditulis ke berkas sementara lalu diganti namanya, supaya dua permintaan
  // bersamaan tidak pernah membaca berkas yang baru setengah tertulis.
  try {
    await mkdir(TEMBOLOK, { recursive: true });
    const sementara = `${berkas}.${process.pid}.${Date.now()}`;
    await writeFile(sementara, hasil);
    await rename(sementara, berkas);
  } catch {
    /* gagal menyimpan tidak menggagalkan jawaban */
  }
  return new Response(new Uint8Array(hasil), { headers: kepala });
};

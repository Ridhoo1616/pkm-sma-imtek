#!/usr/bin/env node
/**
 * Penguji mesin "Tanya cepat" (frontend/src/lib/jawab.ts).
 *
 * Dijalankan langsung terhadap modulnya, bukan lewat peramban. Alasannya
 * kecepatan: menyetel peringkat menuntut puluhan putaran, dan satu putaran
 * lewat `next build` memakan menit sedangkan lewat sini beberapa detik.
 * Antarmukanya tetap diuji di peramban secara terpisah.
 *
 *   cd pkm-sma-imtek
 *   node alat/uji-tanya/jalankan.mjs            # menjalankan seluruh uji
 *   node alat/uji-tanya/jalankan.mjs --takar    # menakar ulang ambangnya
 *   node alat/uji-tanya/jalankan.mjs "tanya apa saja"   # melihat peringkat
 *
 * Backend harus hidup di http://127.0.0.1:8090, sebab datanya diambil dari
 * API yang sebenarnya — pengujian dengan data karangan tidak membuktikan
 * apa pun tentang naskah yang benar-benar ditulis sekolah.
 *
 * Node 24 menjalankan TypeScript langsung, tetapi tidak mengenal jalur
 * "@/lib/...". Karena itu berkasnya disalin dulu ke folder sementara
 * dengan jalur yang ditulis ulang. Yang diuji tetap sumber aslinya.
 */

import { mkdtempSync, copyFileSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SUMBER = join(AKAR, "frontend", "src");
const API = process.env.PKM_API ?? "http://127.0.0.1:8090";

/* ---------- menyiapkan modulnya ---------- */
const kerja = mkdtempSync(join(tmpdir(), "uji-tanya-"));
mkdirSync(join(kerja, "lib"));
mkdirSync(join(kerja, "komponen"));
writeFileSync(join(kerja, "package.json"), '{"type":"module"}');
writeFileSync(join(kerja, "komponen", "Bagian.ts"), "export type JenisLencana = string;\n");
for (const nama of ["jawab", "format", "ppdb", "tipe", "dokumen"]) {
  const isi = readFileSync(join(SUMBER, "lib", `${nama}.ts`), "utf8")
    .replace(/@\/lib\/(\w+)/g, "./$1.ts")
    .replace(/@\/komponen\/(\w+)/g, "../komponen/$1.ts");
  writeFileSync(join(kerja, "lib", `${nama}.ts`), isi);
}
const { bangunPengetahuan, cariJawaban } = await import(join(kerja, "lib", "jawab.ts"));

/* ---------- data sungguhan ---------- */
const ambil = async (jalur) => {
  const r = await fetch(API + jalur);
  if (!r.ok) throw new Error(`${jalur} menjawab ${r.status}`);
  return r.json();
};
let profil, faq, jurusan;
try {
  [profil, faq, jurusan] = await Promise.all([
    ambil("/api/profil"),
    ambil("/api/faq").then((h) => h.data),
    ambil("/api/jurusan").then((h) => h.data),
  ]);
} catch (e) {
  console.error(`Tidak dapat mengambil data dari ${API}: ${e.message}`);
  console.error("Nyalakan backend lebih dulu, atau setel PKM_API.");
  process.exit(2);
}
const P = bangunPengetahuan(faq, profil.pengaturan, profil.ppdb, jurusan);

/* ---------- daftar uji ---------- */
const { HARUS, JANGAN, RAGAM, TYPO } = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "pertanyaan.json"), "utf8"),
);

const jawab = (q) => {
  const h = cariJawaban(q, P, 1);
  return h.length ? h[0] : null;
};

/**
 * Memeriksa satu hasil terhadap polanya.
 *
 * Pola berawalan "id:" memeriksa BUTIR MANA yang terpilih, bukan isi
 * jawabannya. Itu yang dipakai untuk data milik sekolah: begitu panitia
 * mengubah ppdb_biaya, isinya berubah dan uji yang memeriksa isi akan
 * pecah walau mesinnya bekerja sebagaimana mestinya.
 */
const cocok = (h, pola) =>
  h !== null &&
  (pola.startsWith("id:")
    ? h.butir.id === pola.slice(3)
    : new RegExp(pola, "i").test(h.butir.jawab));

/* ---------- melihat peringkat satu pertanyaan ---------- */
const arg = process.argv.slice(2);
if (arg.length > 0 && arg[0] !== "--takar") {
  for (const q of arg) {
    console.log(`\n? ${q}`);
    const h = cariJawaban(q, P, 5);
    if (!h.length) console.log("   (tidak ada yang lolos ambang)");
    h.forEach((x, i) =>
      console.log(`   ${i + 1}. ${x.nilai.toFixed(3)}  ${x.butir.utama ? "[hidup] " : "        "}${x.butir.tanya}`),
    );
  }
  rmSync(kerja, { recursive: true, force: true });
  process.exit(0);
}

/* ---------- menakar ambang ---------- */
if (arg[0] === "--takar") {
  const semuaHarus = [...HARUS.map((h) => h[0]), ...RAGAM.flatMap((r) => r.contoh), ...TYPO.map((t) => t[0])];
  const nilai = (q) => { const h = jawab(q); return h ? h.nilai : 0; };
  const a = semuaHarus.map((q) => [nilai(q), q]).filter(([n]) => n > 0).sort((x, y) => x[0] - y[0]);
  const b = JANGAN.map((q) => [nilai(q), q]).sort((x, y) => y[0] - x[0]);
  console.log("HARUS terjawab — lima terendah yang masih lolos:");
  a.slice(0, 5).forEach(([n, q]) => console.log(`   ${n.toFixed(3)}  ${q}`));
  console.log("\nHARUS ditolak — lima tertinggi:");
  b.slice(0, 5).forEach(([n, q]) => console.log(`   ${n.toFixed(3)}  ${q}`));
  console.log("\nAmbang yang baik berada di antara keduanya. Setel AMBANG di lib/jawab.ts.");
  rmSync(kerja, { recursive: true, force: true });
  process.exit(0);
}

/* ---------- menjalankan uji ---------- */
let lulus = 0;
let gagal = 0;
const cek = (nama, ok, keterangan) =>
  ok
    ? (lulus++, console.log(`  ok    ${nama}`))
    : (gagal++, console.log(`  GAGAL ${nama}\n        -> ${keterangan}`));

console.log(`Pengetahuan: ${P.length} butir (${P.filter((b) => b.utama).length} dari data hidup)\n`);

console.log("── harus terjawab, dan isinya harus memuat pola yang diminta");
for (const [q, pola] of HARUS) {
  const h = jawab(q);
  cek(q, cocok(h, pola),
      h ? `(${h.nilai.toFixed(2)}) [${h.butir.id}] ${h.butir.jawab.slice(0, 60)}` : "tidak ada jawaban");
}

console.log("\n── harus mengaku tidak tahu");
console.log("   Bagian ini yang paling penting. Kotak yang memaksakan jawaban");
console.log("   terdekat lebih berbahaya daripada kotak yang mengaku tidak tahu.");
for (const q of JANGAN) {
  const h = jawab(q);
  cek(q, h === null, h ? `menjawab (${h.nilai.toFixed(2)}) ${h.butir.tanya}` : "");
}

console.log("\n── ragam cara bertanya: satu maksud, banyak bentuk");
for (const { maksud, contoh, pola } of RAGAM) {
  const kena = contoh.filter((q) => cocok(jawab(q), pola));
  cek(`${maksud} — ${kena.length}/${contoh.length} bentuk terjawab`,
      kena.length >= Math.ceil(contoh.length * 0.7),
      contoh.filter((q) => !kena.includes(q)).join(" | "));
}

console.log("\n── salah ketik");
for (const [q, pola] of TYPO) {
  const h = jawab(q);
  cek(q, cocok(h, pola),
      h ? `(${h.nilai.toFixed(2)}) [${h.butir.id}] ${h.butir.tanya}` : "tidak ada jawaban");
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
rmSync(kerja, { recursive: true, force: true });
process.exit(gagal ? 1 : 0);

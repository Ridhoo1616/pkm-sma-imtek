// Mengganti gambar unggahan yang tidak dapat dibuka dengan gambar pengganti
// bertuliskan "Foto contoh" dan judul butirnya. Hanya menyentuh SALINAN folder
// unggahan milik backend demo (UNGGAHAN), tidak pernah folder aslinya.
//
// Sebabnya: data contoh sekolah memuat foto berita dan galeri berukuran 409
// bita, yaitu JPEG 1x1 yang terpotong, sisa pengujian lama. Peramban dan sharp
// sama-sama menolaknya, jadi tanpa pengganti demo menampilkan kotak kosong.
// Gambarnya sengaja tampak seperti tempat foto, bukan foto karangan.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = process.env.API ?? "http://localhost:8190";
const UNGGAHAN = process.env.UNGGAHAN;
// HANYA="berita,galeri" membatasi folder yang disentuh.
const HANYA = process.env.HANYA ? process.env.HANYA.split(",") : null;
// sharp diambil dari node_modules situs Astro, tempat ia sudah terpasang.
const sharp = createRequire(join(process.env.WEB, "package.json"))("sharp");

const ambil = (j, token) =>
  fetch(API + j, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json());
const { token } = await fetch(API + "/api/masuk", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", sandi: "admin123" }),
}).then((r) => r.json());

// Berkas pendaftar: foto dan dokumen hasil pindaian.
const LABEL = {
  file_foto: "Pas foto", file_ijazah: "Ijazah / SKL", file_kk: "Kartu Keluarga",
  file_akta: "Akta Kelahiran", file_raport: "Rapor", file_prestasi: "Sertifikat prestasi",
};
const berkasPendaftar = [];
for (const p of (await ambil("/api/admin/pendaftar?per_halaman=200", token)).data) {
  const d = (await ambil(`/api/admin/pendaftar/${p.id}`, token)).data;
  for (const [k, label] of Object.entries(LABEL)) {
    if (d[k]) berkasPendaftar.push(["pendaftar", d[k], `${label} ${d.nama_lengkap}`]);
  }
}

const butir = [
  ...berkasPendaftar,
  // Daftar admin, supaya berita yang masih draf ikut.
  ...(await ambil("/api/admin/berita?per_halaman=100", token)).data.map((b) => ["berita", b.gambar, b.judul]),
  ...(await ambil("/api/galeri")).data.map((g) => ["galeri", g.gambar, g.judul]),
  ...(await ambil("/api/fasilitas")).data.map((f) => ["fasilitas", f.gambar, f.nama]),
];

const LABEL_POTRET = /^Pas foto /;
const lolos = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function baris(teks, lebar) {
  const hasil = [];
  let b = "";
  for (const kata of teks.split(/\s+/)) {
    if ((b + " " + kata).trim().length > lebar) {
      hasil.push(b);
      b = kata;
    } else b = (b + " " + kata).trim();
  }
  if (b) hasil.push(b);
  return hasil.slice(0, 3);
}

// PDF satu halaman bertuliskan judulnya, untuk dokumen pindaian contoh.
function pdfPengganti(judul) {
  const aman = judul.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
  const isi = `BT /F1 20 Tf 60 760 Td (BERKAS CONTOH) Tj ET\nBT /F1 13 Tf 60 730 Td (${aman}) Tj ET\n` +
    "BT /F1 10 Tf 60 705 Td (Pada aplikasi sebenarnya di sini tampil hasil pindaian yang diunggah pendaftar.) Tj ET";
  const obj = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${isi.length} >>\nstream\n${isi}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const letak = obj.map((o, i) => {
    const l = pdf.length;
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return l;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n` + letak.map((l) => `${String(l).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

let jumlah = 0;
for (const [folder, nama, judul] of butir) {
  if (!nama || (HANYA && !HANYA.includes(folder))) continue;
  const jalur = join(UNGGAHAN, folder, nama);
  let isi;
  try {
    isi = await readFile(jalur);
  } catch {
    continue;
  }
  if (nama.toLowerCase().endsWith(".pdf")) {
    if (isi.length > 400 && isi.includes("%%EOF")) continue;
    await writeFile(jalur, pdfPengganti(judul));
    jumlah++;
    continue;
  }
  try {
    await sharp(isi).metadata().then((m) => sharp(isi).resize(8).toBuffer().then(() => m));
    continue; // gambarnya baik
  } catch {
    /* rusak: dibuatkan pengganti */
  }
  const potret = LABEL_POTRET.test(judul);
  const [lebar, tinggi] = potret ? [600, 800] : [1280, 800];
  const teks = baris(judul, potret ? 16 : 30)
    .map((t, i) => `<text x="80" y="${470 + i * 64}" font-size="${potret ? 40 : 52}" font-weight="700" fill="#ffffff">${lolos(t)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lebar}" height="${tinggi}" viewBox="0 0 ${lebar} ${tinggi}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2a4a"/><stop offset="1" stop-color="#1d4f86"/></linearGradient></defs>
    <rect width="${lebar}" height="${tinggi}" fill="url(#g)"/>
    <circle cx="${lebar - 190}" cy="170" r="260" fill="#f59e0b" opacity=".16"/>
    <g font-family="Helvetica, Arial, sans-serif">
      <text x="80" y="380" font-size="30" letter-spacing="4" fill="#f59e0b">${potret || berkasPendaftar.some((b) => b[2] === judul) ? "BERKAS CONTOH" : "FOTO CONTOH"}</text>${teks}
    </g></svg>`;
  // Formatnya mengikuti nama berkas, supaya jenis yang disajikan tetap benar.
  const olah = sharp(Buffer.from(svg));
  const ext = nama.toLowerCase().split(".").pop();
  const keluar = ext === "png" ? olah.png() : ext === "webp" ? olah.webp() : olah.jpeg({ quality: 82 });
  await writeFile(jalur, await keluar.toBuffer());
  jumlah++;
}
console.log(`${jumlah} gambar rusak diganti gambar pengganti`);

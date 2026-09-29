// Merekam keadaan awal demo dari backend demo (basis data sekali pakai).
// Hasilnya satu berkas JSON yang dibaca api-demo.js di peramban.
//
//   API=http://localhost:8190 KELUAR=docs/demo node alat/demo/rekam-data.mjs
import { mkdir, writeFile } from "node:fs/promises";

const API = process.env.API ?? "http://localhost:8190";
const KELUAR = process.env.KELUAR ?? "docs/demo";

async function json(jalur, token) {
  const j = await fetch(API + jalur, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!j.ok) throw new Error(`${jalur}: ${j.status} ${await j.text()}`);
  return j.json();
}
async function berkas(jalur, token, tujuan) {
  const j = await fetch(API + jalur, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!j.ok) throw new Error(`${jalur}: ${j.status}`);
  await writeFile(tujuan, Buffer.from(await j.arrayBuffer()));
}

const masuk = await fetch(API + "/api/masuk", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", sandi: "admin123" }),
}).then((j) => j.json());
const T = masuk.token;

const publik = {};
for (const j of [
  "/api/profil", "/api/jurusan", "/api/fasilitas", "/api/galeri", "/api/biaya", "/api/faq",
  "/api/halaman", "/api/tenaga-pendidik", "/api/agenda", "/api/kegiatan-siswa", "/api/pustaka",
  "/api/ppdb/ujian", "/api/berita?per_halaman=50",
]) publik[j.replace(/\?.*/, "")] = await json(j);

const admin = {};
for (const j of [
  "/api/admin/dasbor", "/api/admin/kunjungan", "/api/admin/laporan",
  "/api/admin/pendaftar?per_halaman=200", "/api/admin/jurusan", "/api/admin/berita?per_halaman=100",
  "/api/admin/jenis-surat", "/api/admin/surat?per_halaman=100", "/api/admin/biaya", "/api/admin/faq",
  "/api/admin/tanya-buntu", "/api/admin/soal", "/api/admin/paket-ujian", "/api/admin/notifikasi?per_halaman=100",
  "/api/admin/sekolah?per_halaman=100", "/api/admin/pesan?per_halaman=100", "/api/admin/halaman",
  "/api/admin/tenaga-pendidik", "/api/admin/agenda", "/api/admin/kegiatan-siswa", "/api/admin/pustaka",
  "/api/admin/pengaturan", "/api/admin/pengguna",
]) admin[j.replace(/\?.*/, "")] = await json(j, T);

// Rincian yang hanya ada per butir.
const detail = { pendaftar: {}, cek: {}, berita: {}, halaman: {}, hasil: {} };
for (const p of admin["/api/admin/pendaftar"].data) {
  detail.pendaftar[p.id] = await json(`/api/admin/pendaftar/${p.id}`, T);
  // Jawaban Cek Status apa adanya, termasuk hasil tes dan daftar suratnya.
  const cek = await fetch(API + "/api/ppdb/cek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ no_registrasi: p.no_registrasi, tanggal_lahir: p.tanggal_lahir.slice(0, 10) }),
  });
  if (cek.ok) detail.cek[p.id] = await cek.json();
}
for (const b of publik["/api/berita"].data) {
  detail.berita[b.slug] = await json(`/api/berita/${encodeURIComponent(b.slug)}`);
}
for (const h of publik["/api/halaman"].data) {
  detail.halaman[h.slug] = await json(`/api/halaman/${encodeURIComponent(h.slug)}`);
}
for (const p of admin["/api/admin/paket-ujian"].data) {
  detail.hasil[p.id] = await json(`/api/admin/paket-ujian/${p.id}/hasil`, T);
}

// PDF buatan server untuk data awal. Butir yang dibuat pengunjung demo
// dibuatkan PDF sederhana di peramban (lihat api-demo.js).
await mkdir(`${KELUAR}/pdf`, { recursive: true });
for (const p of admin["/api/admin/pendaftar"].data) {
  await berkas(`/api/admin/pendaftar/${p.id}/bukti`, T, `${KELUAR}/pdf/bukti-${p.id}.pdf`);
  await berkas(`/api/admin/pendaftar/${p.id}/kartu`, T, `${KELUAR}/pdf/kartu-${p.id}.pdf`).catch(() => {});
}
for (const s of admin["/api/admin/surat"].data) {
  await berkas(`/api/admin/surat/${s.id}/pdf`, T, `${KELUAR}/pdf/surat-${s.id}.pdf`);
}

await mkdir(KELUAR, { recursive: true });
await writeFile(`${KELUAR}/data.json`, JSON.stringify({ publik, admin, detail }));
console.log("data demo direkam:", Object.keys(publik).length + Object.keys(admin).length, "titik API");

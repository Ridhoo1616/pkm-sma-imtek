// Mengisi contoh data yang belum ada di basis data asli, lewat API backend
// demo, supaya setiap fitur di demo punya isi: pengguna panitia dan Bursa Kerja Khusus.
// Hanya untuk basis data sekali pakai yang dibuat alat/demo/rakit.sh.
const API = process.env.API ?? "http://localhost:8190";

async function panggil(metode, jalur, isi, token) {
  const j = await fetch(API + jalur, {
    method: metode,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: isi === undefined ? undefined : JSON.stringify(isi),
  });
  const hasil = await j.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${metode} ${jalur}: ${j.status} ${JSON.stringify(hasil)}`);
  return hasil;
}

const { token: T } = await panggil("POST", "/api/masuk", { username: "admin", sandi: "admin123" });

// Akun panitia demo memakai sandi yang tertulis di README.
const pengguna = await panggil("GET", "/api/admin/pengguna", undefined, T);
const panitia = pengguna.data.find((u) => u.username === "panitia");
if (panitia) {
  await panggil("PUT", `/api/admin/pengguna/${panitia.id}`, { nama: panitia.nama, username: panitia.username, role: panitia.role, sandi: "panitia123" }, T);
}

/* ---------- Bursa Kerja Khusus ----------
   Nama perusahaannya sengaja berawalan "Contoh" supaya tidak terbaca
   sebagai mitra sungguhan sekolah. */

async function formulir(jalur, isi) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(isi)) fd.append(k, v);
  const j = await fetch(API + jalur, { method: "POST", headers: { Authorization: `Bearer ${T}` }, body: fd });
  const hasil = await j.json().catch(() => ({}));
  if (!j.ok) throw new Error(`POST ${jalur}: ${j.status} ${JSON.stringify(hasil)}`);
  return hasil;
}
const mitra1 = await formulir("/api/admin/bkk/mitra", {
  nama: "PT Contoh Manufaktur Nusantara", bidang: "Manufaktur", alamat: "Kawasan industri, Kabupaten Tangerang",
  kontak_nama: "Bagian HRD", kontak_telepon: "021-0000000", aktif: "1",
});
const mitra2 = await formulir("/api/admin/bkk/mitra", {
  nama: "PT Contoh Ritel Sejahtera", bidang: "Ritel", alamat: "Kabupaten Tangerang", aktif: "1",
});
const low1 = await formulir("/api/admin/bkk/lowongan", {
  mitra_id: mitra1.id, posisi: "Operator Produksi", jenis: "Kontrak", lokasi: "Kabupaten Tangerang",
  deskripsi: "Menjalankan mesin produksi sesuai prosedur kerja dan menjaga kebersihan area kerja.",
  kualifikasi: "Lulusan SMA/sederajat\nSehat jasmani dan rohani\nBersedia bekerja dengan sistem giliran",
  gaji: "Sesuai UMK", kuota: "5", batas_lamar: "2027-06-30", status: "buka",
});
await formulir("/api/admin/bkk/lowongan", {
  mitra_id: mitra2.id, posisi: "Kasir", jenis: "Penuh Waktu", lokasi: "Kabupaten Tangerang",
  deskripsi: "Melayani transaksi pembayaran pelanggan dan merapikan laporan kas harian.",
  kualifikasi: "Lulusan SMA/sederajat\nTeliti dan ramah\nTerbiasa memakai komputer", kuota: "2", status: "buka",
});
await formulir("/api/admin/bkk/lowongan", {
  mitra_id: mitra2.id, posisi: "Staf Gudang", jenis: "Magang", lokasi: "Kabupaten Tangerang", status: "tutup",
});
// Tiga lamaran pada tahap berbeda, supaya ringkasan penyaluran ada isinya.
for (const [nama, nisn, lahir, jk] of [
  ["Contoh Lulusan Satu", "0071234598", "2007-05-12", "L"],
  ["Contoh Lulusan Dua", "0061234597", "2006-02-03", "P"],
  ["Contoh Lulusan Tiga", "0071234596", "2007-08-21", "L"],
]) {
  await panggil("POST", "/api/admin/bkk/lamaran", {
    lowongan_id: String(low1.id), nama, nisn, tanggal_lahir: lahir, jenis_kelamin: jk, tahun_lulus: "2025", telepon: "081200000000",
  }, T);
}
const lamaran = (await panggil("GET", "/api/admin/bkk/lamaran", undefined, T)).data;
for (const [nisn, status, catatan] of [
  ["0071234598", "Diterima", "Mulai bekerja sesuai surat panggilan perusahaan."],
  ["0061234597", "Wawancara", "Wawancara di kantor perusahaan; jadwal dikirim lewat WhatsApp."],
]) {
  const s = lamaran.find((x) => x.nisn === nisn);
  await panggil("PATCH", `/api/admin/bkk/lamaran/${s.id}`, { status, catatan }, T);
}
await panggil("PUT", "/api/admin/pengaturan", { pengaturan: {
  bkk_keterangan: "Bursa Kerja Khusus (BKK) adalah layanan sekolah yang membantu lulusan mendapatkan pekerjaan: mengumumkan lowongan dari perusahaan mitra, menerima lamaran, meneruskannya ke perusahaan, dan mencatat lulusan yang tersalurkan.",
} }, T);

// Langkah daftar ulang yang tampil pada hasil "Diterima" di Cek Status.
await panggil("PUT", "/api/admin/pengaturan", { pengaturan: {
  daftar_ulang_jadwal: "1-10 Juli 2027, pukul 08.00-14.00",
  daftar_ulang_tempat: "Ruang Tata Usaha SMAS IMTEK",
  daftar_ulang_syarat: "Bawa ijazah atau SKL asli beserta fotokopinya\nBawa Kartu Keluarga dan akta kelahiran\nBawa pas foto 3x4 sebanyak dua lembar",
} }, T);

// Naskah contoh untuk halaman Kurikulum, memperlihatkan hasil template
// "Pakai template" yang sudah diisi. Hanya di demo; setiap paragraf diawali
// "Contoh" supaya tidak terbaca sebagai keterangan resmi sekolah.
const halamanAdmin = (await panggil("GET", "/api/admin/halaman", undefined, T)).data;
const kur = halamanAdmin.find((h) => h.slug === "kurikulum");
if (kur) {
  const fd = new FormData();
  for (const k of ["slug", "judul", "ringkasan", "visi", "misi", "galeri_kategori", "kelompok", "urutan"]) fd.append(k, String(kur[k] ?? ""));
  fd.append("aktif", kur.aktif ? "1" : "0");
  fd.append("isi", [
    "Contoh naskah: halaman ini diisi dari kotak Naskah di panel admin. Paragraf pembuka seperti ini tampil lebih besar di atas bagian-bagiannya.",
    "## Kurikulum yang dipakai",
    "Contoh: sekolah menyebut nama kurikulum dan tahun penerapannya di sini.",
    "## Struktur mata pelajaran",
    "Contoh: mata pelajaran kelompok umum untuk kelas X, XI, dan XII dituliskan di bagian ini.\n\nContoh paragraf kedua, untuk catatan tambahan.",
    "## Peminatan",
    "Contoh: peminatan yang dibuka dan mata pelajaran pilihannya.",
    "## Penilaian dan rapor",
    "Contoh: bentuk penilaian, jadwal pembagian rapor, dan kriteria kenaikan kelas.",
  ].join("\n\n"));
  const j = await fetch(`${API}/api/admin/halaman/${kur.id}`, { method: "PUT", headers: { Authorization: `Bearer ${T}` }, body: fd });
  if (!j.ok) throw new Error(`PUT halaman kurikulum: ${j.status} ${await j.text()}`);
}

console.log("contoh data demo terisi");

// Mengisi contoh data yang belum ada di basis data asli, lewat API backend
// demo, supaya setiap fitur di demo punya isi: jenis surat dan suratnya,
// bank soal, paket tes, dan dua sesi tes yang sudah dinilai. Hanya untuk
// basis data sekali pakai yang dibuat alat/demo/rakit.sh.
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

/* ---------- surat ---------- */

const JENIS = [
  {
    "nama": "Surat Undangan",
    "kode": "UND",
    "format_nomor": "{urut:3}/{kode}/SMAS-IMTEK/{bulan_romawi}/{tahun}",
    "atur_ulang": "tahunan",
    "untuk_pendaftar": false,
    "tampil_di_cek_status": false,
    "perihal_bawaan": "Undangan Rapat Orang Tua Siswa",
    "tujuan_bawaan": "Bapak/Ibu Orang Tua/Wali Siswa",
    "isi_bawaan": "Dengan hormat,\n\nSehubungan dengan dimulainya tahun ajaran {tahun_ajaran}, kami mengundang Bapak/Ibu untuk hadir pada rapat orang tua siswa di aula {nama_sekolah}.\n\nAtas perhatian dan kehadirannya kami ucapkan terima kasih.",
    "penanda_tangan_nama": "Nama Kepala Sekolah, S.Pd., M.Pd.",
    "penanda_tangan_jabatan": "Kepala Sekolah",
    "penanda_tangan_nip": "",
    "aktif": true,
    "urutan": 1
  },
  {
    "nama": "Surat Keterangan Diterima",
    "kode": "SKD",
    "format_nomor": "{urut:3}/SKD/PPDB/{tahun}",
    "atur_ulang": "tahunan",
    "untuk_pendaftar": true,
    "tampil_di_cek_status": true,
    "perihal_bawaan": "Keterangan Diterima sebagai Peserta Didik Baru",
    "tujuan_bawaan": "{nama_lengkap}",
    "isi_bawaan": "Dengan hormat,\n\nBerdasarkan hasil seleksi Penerimaan Peserta Didik Baru tahun ajaran {tahun_ajaran}, dengan ini kami menerangkan bahwa:\n\nNama: {nama_lengkap}\nNomor Registrasi: {no_registrasi}\nNISN: {nisn}\nPeminatan: {peminatan}\n\ndinyatakan DITERIMA sebagai peserta didik baru {nama_sekolah}.\n\nDemikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.",
    "penanda_tangan_nama": "Nama Kepala Sekolah, S.Pd., M.Pd.",
    "penanda_tangan_jabatan": "Kepala Sekolah",
    "penanda_tangan_nip": "",
    "aktif": true,
    "urutan": 2
  },
  {
    "nama": "Surat Tugas",
    "kode": "ST",
    "format_nomor": "{urut:3}/ST/{bulan_romawi}/{tahun}",
    "atur_ulang": "bulanan",
    "untuk_pendaftar": false,
    "tampil_di_cek_status": false,
    "perihal_bawaan": "Surat Tugas",
    "tujuan_bawaan": "",
    "isi_bawaan": "Yang bertanda tangan di bawah ini menugaskan nama yang tercantum untuk ...",
    "penanda_tangan_nama": "Nama Kepala Sekolah, S.Pd., M.Pd.",
    "penanda_tangan_jabatan": "Kepala Sekolah",
    "penanda_tangan_nip": "",
    "aktif": true,
    "urutan": 3
  }
];
const idJenis = {};
for (const j of JENIS) idJenis[j.kode] = (await panggil("POST", "/api/admin/jenis-surat", j, T)).id;

const SURAT = [
  { jenis_id: idJenis.UND, tanggal_surat: "2026-09-15", perihal: "Undangan Rapat Orang Tua Siswa", tujuan: "Bapak/Ibu Orang Tua/Wali Siswa Kelas X", lampiran: "-",
    isi: "Dengan hormat,\n\nKami mengundang Bapak/Ibu untuk hadir pada rapat orang tua siswa kelas X yang akan dilaksanakan pada hari Sabtu, 3 Oktober 2026, pukul 08.00 WIB di aula sekolah.\n\nAtas perhatian dan kehadirannya kami ucapkan terima kasih." },
  { jenis_id: idJenis.UND, tanggal_surat: "2026-09-22", perihal: "Undangan Pentas Seni", tujuan: "Komite Sekolah", lampiran: "-",
    isi: "Dengan hormat,\n\nKami mengundang Komite Sekolah untuk menghadiri pentas seni siswa pada hari Jumat, 16 Oktober 2026 di lapangan sekolah.\n\nTerima kasih." },
  { jenis_id: idJenis.ST, tanggal_surat: "2026-09-28", perihal: "Surat Tugas Pendamping Lomba", tujuan: "", lampiran: "-",
    isi: "Yang bertanda tangan di bawah ini menugaskan guru pembina ekstrakurikuler untuk mendampingi siswa pada lomba cerdas cermat tingkat kabupaten." },
];
for (const s of SURAT) await panggil("POST", "/api/admin/surat", s, T);
await panggil("POST", "/api/admin/surat/massal", { jenis_id: idJenis.SKD, tanggal_surat: "2026-09-25", status: "Diterima" }, T);

/* ---------- tes seleksi ---------- */

// Bank soal demo: 40 soal latihan yang sama dengan berkas unduhan di panel,
// dimasukkan lewat jalur impor Excel supaya jalur itu ikut teruji.
const { readFileSync } = await import("node:fs");
const csv = readFileSync(process.env.SOAL_CSV ?? new URL("../../frontend/public/templat/latihan-soal-40.csv", import.meta.url), "utf8");
console.log((await panggil("POST", "/api/admin/soal/impor", { csv, aktif: true }, T)).pesan);
const kunci = {};
for (const s of (await panggil("GET", "/api/admin/soal", undefined, T)).data) kunci[s.id] = s.jawaban;

const tahun = (await panggil("GET", "/api/admin/dasbor", undefined, T)).tahun_ajaran;
await panggil("POST", "/api/admin/paket-ujian", {
  nama: `Tes Potensi Akademik PPDB ${tahun}`, tahun_ajaran: tahun, durasi_menit: 60, jumlah_soal: 40,
  komposisi: [
    { mata_pelajaran: "Matematika", jumlah: 12 }, { mata_pelajaran: "Bahasa Indonesia", jumlah: 8 },
    { mata_pelajaran: "Bahasa Inggris", jumlah: 8 }, { mata_pelajaran: "IPA", jumlah: 8 }, { mata_pelajaran: "IPS", jumlah: 4 },
  ],
  acak_soal: true, mulai: "2026-09-01T07:00:00+07:00", selesai: "2027-06-30T16:00:00+07:00", nilai_minimum: 60,
  keterangan: "Kerjakan dengan jujur. Jawaban tersimpan otomatis setiap kali memilih.", aktif: true,
}, T);
await panggil("PUT", "/api/admin/pengaturan", { pengaturan: {
  ujian_aktif: "1",
  ujian_info: "Tes dikerjakan dari ponsel atau komputer masing-masing. Siapkan nomor registrasi dan tanggal lahir. Selama tes, jangan menutup halaman ini.",
} }, T);

// Dua pendaftar yang sudah lolos verifikasi mengerjakan tes: satu lulus,
// satu tidak, supaya halaman hasil tes menampilkan keduanya.
const daftar = (await panggil("GET", "/api/admin/pendaftar?per_halaman=200", undefined, T)).data
  .filter((p) => p.status === "Diterima").sort((a, b) => a.id - b.id);
for (const [p, salah] of [[daftar[1], 6], [daftar[2], 22]]) {
  if (!p) continue;
  const mulai = await panggil("POST", "/api/ppdb/ujian/mulai", { no_registrasi: p.no_registrasi, tanggal_lahir: p.tanggal_lahir.slice(0, 10) });
  const { soal } = await panggil("GET", "/api/ppdb/ujian/soal", undefined, mulai.token);
  for (const [i, s] of soal.entries()) {
    await panggil("PATCH", "/api/ppdb/ujian/jawab", { soal_id: s.soal_id, jawaban: i < salah ? (kunci[s.soal_id] === "A" ? "B" : "A") : kunci[s.soal_id] }, mulai.token);
  }
  await panggil("POST", "/api/ppdb/ujian/selesai", undefined, mulai.token);
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
const low1 = await panggil("POST", "/api/admin/bkk/lowongan", {
  mitra_id: mitra1.id, posisi: "Operator Produksi", jenis: "Kontrak", lokasi: "Kabupaten Tangerang",
  deskripsi: "Menjalankan mesin produksi sesuai prosedur kerja dan menjaga kebersihan area kerja.",
  kualifikasi: "Lulusan SMA/sederajat\nSehat jasmani dan rohani\nBersedia bekerja dengan sistem giliran",
  gaji: "Sesuai UMK", kuota: "5", batas_lamar: "2027-06-30", status: "buka",
}, T);
await panggil("POST", "/api/admin/bkk/lowongan", {
  mitra_id: mitra2.id, posisi: "Kasir", jenis: "Penuh Waktu", lokasi: "Kabupaten Tangerang",
  deskripsi: "Melayani transaksi pembayaran pelanggan dan merapikan laporan kas harian.",
  kualifikasi: "Lulusan SMA/sederajat\nTeliti dan ramah\nTerbiasa memakai komputer", kuota: "2", status: "buka",
}, T);
await panggil("POST", "/api/admin/bkk/lowongan", {
  mitra_id: mitra2.id, posisi: "Staf Gudang", jenis: "Magang", lokasi: "Kabupaten Tangerang", status: "tutup",
}, T);
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

console.log("contoh data demo terisi");

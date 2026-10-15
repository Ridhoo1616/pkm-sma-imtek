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


/* ---------- Kalimat pengisi supaya situs demo terasa hidup ----------
   Hanya di basis data demo yang sekali pakai. Isinya sengaja umum: tanpa
   nama orang, angka, tahun, prestasi, atau aturan sekolah, sebab semuanya
   itu hanya boleh datang dari sekolah. Hanya mengisi yang masih kosong atau
   masih berupa petunjuk [kurung siku]. */

const kosong = (v) => { const t = (v ?? "").trim(); return t === "" || (t.startsWith("[") && t.endsWith("]")); };
const sekarang = Object.fromEntries((await panggil("GET", "/api/admin/pengaturan", undefined, T)).data.map((b) => [b.nama_setting, b.nilai]));
const ISI = {
  tagline: "Tempat bertumbuh: belajar tekun, berkarakter, siap melangkah.",
  visi: "Menjadi sekolah menengah atas yang menumbuhkan peserta didik berilmu, berakhlak, dan siap melanjutkan pendidikan maupun memasuki dunia kerja.",
  misi: [
    "Menyelenggarakan pembelajaran yang aktif, menyenangkan, dan bermakna bagi setiap peserta didik.",
    "Menanamkan kejujuran, disiplin, dan tanggung jawab dalam keseharian sekolah.",
    "Membekali peserta didik dengan keterampilan teknologi informasi yang berguna di jenjang berikutnya.",
    "Membuka jalan bagi lulusan, baik ke perguruan tinggi maupun lewat Bursa Kerja Khusus.",
    "Menjalin kerja sama yang terbuka dengan orang tua dan masyarakat sekitar.",
  ].join("\n"),
  keunggulan: [
    "Pembelajaran yang memadukan teori di kelas dengan praktik di laboratorium.",
    "Pembinaan karakter lewat kebiasaan sehari-hari, bukan hanya lewat pelajaran.",
    "Jalur lanjutan yang jelas: persiapan kuliah, atau penyaluran kerja lewat Bursa Kerja Khusus.",
    "Pendaftaran online yang dapat dipantau dari rumah, tanpa antre berkas.",
  ].join("\n"),
  sambutan_kepsek: [
    "Selamat datang di situs SMA Swasta IMTEK. Situs ini kami siapkan agar calon peserta didik, orang tua, dan masyarakat dapat mengenal sekolah kami dengan mudah, kapan pun dibutuhkan.",
    "Kami percaya bahwa sekolah yang baik bukan hanya tempat belajar mata pelajaran, tetapi juga tempat anak-anak belajar bertanggung jawab, bekerja sama, dan percaya pada kemampuannya sendiri.",
    "Silakan jelajahi halaman profil, kegiatan, dan informasi pendaftaran. Bila ada hal yang ingin ditanyakan, kami senang mendengarnya.",
  ].join("\n\n"),
  jadwal_keterangan: "Jadwal pelajaran berlaku per semester. Bila ada perubahan, pengumumannya disampaikan lewat halaman Berita.",
};
const isian = Object.fromEntries(Object.entries(ISI).filter(([k]) => kosong(sekarang[k])));
if (Object.keys(isian).length) await panggil("PUT", "/api/admin/pengaturan", { pengaturan: isian }, T);

const NASKAH = {
  kurikulum: [
    "Halaman ini menjelaskan bagaimana kegiatan belajar di sekolah disusun, dari mata pelajaran yang diikuti sampai cara penilaiannya.",
    "## Kurikulum yang dipakai",
    "Sekolah mengikuti kurikulum yang ditetapkan pemerintah dan menyesuaikannya dengan kebutuhan serta kondisi peserta didik.",
    "## Struktur mata pelajaran",
    "Peserta didik mengikuti mata pelajaran kelompok umum di semua kelas, lalu mendalami mata pelajaran pilihan sesuai peminatan yang dipilih.",
    "## Peminatan",
    "Sekolah membuka peminatan IPA dan IPS. Pilihan peminatan ditetapkan saat mendaftar, dan rincian kuotanya dapat dilihat di halaman PPDB.",
    "## Penilaian dan rapor",
    "Penilaian dilakukan sepanjang semester lewat tugas, ulangan, dan kegiatan praktik. Hasilnya dilaporkan kepada orang tua dalam bentuk rapor.",
  ],
  osis: [
    "OSIS adalah wadah bagi siswa untuk belajar memimpin, bekerja dalam tim, dan menyalurkan gagasan.",
    "## Tentang OSIS",
    "Organisasi Siswa Intra Sekolah dijalankan oleh siswa dengan pendampingan guru pembina. Pengurusnya dipilih dari dan oleh siswa.",
    "## Kegiatan",
    "Kegiatan OSIS dirancang bersama pengurus dan pembina, misalnya peringatan hari besar, lomba antarkelas, dan kegiatan sosial.",
    "## Cara ikut serta",
    "Setiap siswa dapat menyampaikan usul kegiatan kepada pengurus atau pembina, dan ikut dalam pemilihan pengurus sesuai jadwal sekolah.",
  ],
  "pendidikan-karakter": [
    "Karakter dibentuk lewat kebiasaan kecil yang dilakukan berulang, di kelas maupun di luar kelas.",
    "## Nilai yang ditanamkan",
    "Kejujuran, disiplin, tanggung jawab, dan sikap saling menghormati menjadi dasar dalam semua kegiatan sekolah.",
    "## Bentuk pembinaan",
    "Pembinaan berjalan lewat pembiasaan sehari-hari, keteladanan guru, kegiatan kesiswaan, dan bimbingan bagi siswa yang membutuhkan pendampingan.",
    "## Peran orang tua",
    "Orang tua adalah mitra utama. Sekolah menyampaikan perkembangan peserta didik dan terbuka bagi orang tua yang ingin berkonsultasi.",
  ],
};
for (const h of (await panggil("GET", "/api/admin/halaman", undefined, T)).data) {
  const isi = NASKAH[h.slug];
  if (!isi || !kosong(h.isi)) continue;
  const fd = new FormData();
  for (const k of ["slug", "judul", "ringkasan", "visi", "misi", "galeri_kategori", "kelompok", "urutan"]) fd.append(k, String(h[k] ?? ""));
  fd.append("aktif", h.aktif ? "1" : "0");
  fd.append("isi", isi.join("\n\n"));
  const j = await fetch(`${API}/api/admin/halaman/${h.id}`, { method: "PUT", headers: { Authorization: `Bearer ${T}` }, body: fd });
  if (!j.ok) throw new Error(`PUT halaman ${h.slug}: ${j.status} ${await j.text()}`);
}

// Beberapa kegiatan kesiswaan umum, tanpa nama pembina dan jadwal (itu data sekolah).
if ((await panggil("GET", "/api/admin/kegiatan-siswa", undefined, T)).data.length === 0) {
  for (const [i, k] of [
    ["Pramuka", "Ekstrakurikuler", "Melatih kemandirian, kerja sama, dan kepedulian lewat kegiatan di alam terbuka."],
    ["Palang Merah Remaja", "Ekstrakurikuler", "Belajar pertolongan pertama dan kepedulian sosial."],
    ["Futsal", "Ekstrakurikuler", "Berlatih bersama untuk kebugaran, sportivitas, dan mengikuti pertandingan antarsekolah."],
    ["Klub Komputer", "Ekstrakurikuler", "Mendalami keterampilan komputer di luar jam pelajaran, memanfaatkan laboratorium komputer sekolah."],
  ].entries()) {
    await formulir("/api/admin/kegiatan-siswa", { nama: k[0], jenis: k[1], deskripsi: k[2], urutan: String(i + 1), aktif: "1" });
  }
}

console.log("contoh data demo terisi");

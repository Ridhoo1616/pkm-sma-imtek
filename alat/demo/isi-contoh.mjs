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
    "format_nomor": "{urut:3}/{kode}/SMA-IMTEK/{bulan_romawi}/{tahun}",
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

const SOAL = [
  {
    "mata_pelajaran": "Matematika",
    "pertanyaan": "Hasil dari 3/4 + 1/2 adalah ...",
    "pilihan_a": "5/4",
    "pilihan_b": "4/6",
    "pilihan_c": "1",
    "pilihan_d": "3/8",
    "pilihan_e": "2/3",
    "jawaban": "A",
    "pembahasan": "3/4 + 2/4 = 5/4.",
    "aktif": true
  },
  {
    "mata_pelajaran": "Matematika",
    "pertanyaan": "Jika 2x + 5 = 17, maka nilai x adalah ...",
    "pilihan_a": "5",
    "pilihan_b": "6",
    "pilihan_c": "7",
    "pilihan_d": "8",
    "pilihan_e": "11",
    "jawaban": "B",
    "pembahasan": "2x = 12, jadi x = 6.",
    "aktif": true
  },
  {
    "mata_pelajaran": "Bahasa Indonesia",
    "pertanyaan": "Kalimat yang menggunakan kata baku adalah ...",
    "pilihan_a": "Ia sedang menganalisa data.",
    "pilihan_b": "Kami mengunjungi apotik.",
    "pilihan_c": "Rapat itu dihadiri banyak orang.",
    "pilihan_d": "Dia tidak mengerti resiko itu.",
    "pilihan_e": "Jadwalnya sudah di tetapkan.",
    "jawaban": "C",
    "pembahasan": "Analisis, apotek, dan risiko adalah bentuk baku; 'ditetapkan' ditulis serangkai.",
    "aktif": true
  },
  {
    "mata_pelajaran": "Bahasa Inggris",
    "pertanyaan": "Choose the correct sentence.",
    "pilihan_a": "She go to school every day.",
    "pilihan_b": "She goes to school every day.",
    "pilihan_c": "She going to school every day.",
    "pilihan_d": "She gone to school every day.",
    "pilihan_e": "She to go school every day.",
    "jawaban": "B",
    "pembahasan": "Subjek orang ketiga tunggal pada simple present memakai goes.",
    "aktif": true
  },
  {
    "mata_pelajaran": "IPA",
    "pertanyaan": "Satuan SI untuk gaya adalah ...",
    "pilihan_a": "Joule",
    "pilihan_b": "Watt",
    "pilihan_c": "Newton",
    "pilihan_d": "Pascal",
    "pilihan_e": "Coulomb",
    "jawaban": "C",
    "pembahasan": "Gaya diukur dalam newton (N).",
    "aktif": true
  },
  {
    "mata_pelajaran": "IPS",
    "pertanyaan": "Kegiatan menyalurkan barang dari produsen ke konsumen disebut ...",
    "pilihan_a": "Produksi",
    "pilihan_b": "Konsumsi",
    "pilihan_c": "Distribusi",
    "pilihan_d": "Investasi",
    "pilihan_e": "Promosi",
    "jawaban": "C",
    "pembahasan": "Distribusi adalah penyaluran barang dan jasa.",
    "aktif": true
  }
];
const kunci = {};
for (const s of SOAL) kunci[(await panggil("POST", "/api/admin/soal", s, T)).id] = s.jawaban;

const tahun = (await panggil("GET", "/api/admin/dasbor", undefined, T)).tahun_ajaran;
await panggil("POST", "/api/admin/paket-ujian", {
  nama: `Tes Potensi Akademik PPDB ${tahun}`, tahun_ajaran: tahun, durasi_menit: 30, jumlah_soal: SOAL.length,
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
for (const [p, salah] of [[daftar[1], 1], [daftar[2], 3]]) {
  if (!p) continue;
  const mulai = await panggil("POST", "/api/ppdb/ujian/mulai", { no_registrasi: p.no_registrasi, tanggal_lahir: p.tanggal_lahir.slice(0, 10) });
  const { soal } = await panggil("GET", "/api/ppdb/ujian/soal", undefined, mulai.token);
  for (const [i, s] of soal.entries()) {
    await panggil("PATCH", "/api/ppdb/ujian/jawab", { soal_id: s.soal_id, jawaban: i < salah ? "E" : kunci[s.soal_id] }, mulai.token);
  }
  await panggil("POST", "/api/ppdb/ujian/selesai", undefined, mulai.token);
}
console.log("contoh data demo terisi");

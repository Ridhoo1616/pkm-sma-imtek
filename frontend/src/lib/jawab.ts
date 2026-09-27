import type { Faq, Jurusan, KeadaanPpdb, Pengaturan } from "@/lib/tipe";
import {
  alamatLengkap,
  belumTerisi,
  tanggalPanjang,
  tautanPeta,
} from "@/lib/format";
import { kataKeadaanPpdb } from "@/lib/ppdb";
import { DOKUMEN } from "@/lib/dokumen";

/**
 * Mesin tanya jawab untuk kotak "Tanya cepat".
 *
 * TIDAK ADA MODEL BAHASA DI SINI, dan itu keputusan yang disengaja, bukan
 * keterbatasan. Yang ditanyakan orang tua adalah tanggal penutupan, biaya,
 * dan dokumen yang diminta — jawaban yang salah pada tiga hal itu merugikan
 * orang sungguhan. Model bahasa akan menjawab dengan yakin walau datanya
 * tidak ada, sedangkan mesin ini hanya dapat mengembalikan kalimat yang
 * memang sudah ditulis sekolah atau nilai yang memang ada di basis data.
 * Bila tidak menemukan, ia mengatakan tidak tahu dan mengarahkan ke panitia.
 *
 * Akibat sampingannya menyenangkan: tanpa kunci API, tanpa biaya per
 * pertanyaan, tanpa data pengunjung yang keluar ke penyedia mana pun, dan
 * seluruhnya berjalan di peramban tanpa satu panggilan jaringan pun.
 *
 * Pengetahuannya dua sumber:
 *
 *   1. Tabel `faq`, yang diisi panitia lewat panel.
 *   2. Butir yang DISUSUN dari pengaturan dan data yang hidup — jadwal,
 *      kuota, biaya, peminatan, alamat. Inilah yang tidak dapat dikerjakan
 *      halaman Tanya Jawab biasa: tanggalnya ikut berubah begitu panitia
 *      mengubahnya di panel, tanpa ada yang perlu menyunting naskah FAQ.
 */

export interface ButirPengetahuan {
  id: string;
  tanya: string;
  jawab: string;
  kategori: string;
  /** Kata yang tidak muncul di pertanyaannya tetapi sering dipakai penanya. */
  kunci?: string[];
  tautan?: { label: string; jalur: string; luar?: boolean };
  /** Butir dari data hidup didahulukan daripada naskah FAQ yang statis. */
  utama?: boolean;
}

/* ------------------------------------------------------------------ *
 *  Normalisasi dan padanan kata
 * ------------------------------------------------------------------ */

/**
 * Kata yang tidak membedakan apa pun. "apa", "kapan", dan "berapa" TIDAK
 * masuk daftar ini walau sering dianggap kata umum: justru itu yang
 * membedakan "berapa biayanya" dari "kapan biayanya dibayar".
 */
// prettier-ignore
const KATA_BUANG = new Set([
  "yang", "di", "ke", "dari", "untuk", "dan", "atau", "itu", "ini", "ada",
  "saya", "aku", "kami", "kita", "anda", "nya", "pada", "dengan", "adalah",
  "bisa", "dapat", "boleh", "mau", "ingin", "sudah", "belum", "akan", "juga",
  "kalau", "jika", "tidak", "bukan", "ya", "nggak", "gak", "ga", "dong",
  "sih", "kah", "min", "kak", "pak", "bu", "mohon", "tolong", "maaf",
  "halo", "permisi", "selamat", "pagi", "siang", "sore", "malam",
  // Kata penghubung dan penegas yang tidak menyempitkan apa pun. Ketiadaan
  // baris ini sempat membuat "pendaftaran sampai tanggal berapa" tidak
  // terjawab: "sampai" tidak dikenal pengetahuan, jadi diberi bobot
  // setinggi kata asing sungguhan dan menenggelamkan nilainya.
  "sampai", "hingga", "saja", "aja", "lagi", "kok", "nih", "tuh", "banget",
  "oleh", "tentang", "sebuah", "para", "agar", "supaya", "serta",
  // "apakah" dan "bagaimana" murni penanda tanya, berbeda dengan "apa" yang
  // masih menyempitkan. "apakah" sempat membuat "apakah bayar" dimenangkan
  // butir yang kebetulan juga memuat kata itu; "bagaimana" berbuat hal yang
  // sama pada "syaratnya gmn", yang dijawab "Bagaimana saya tahu berkas saya
  // sudah diverifikasi?" alih-alih daftar dokumennya.
  "apakah", "bagaimana", "gimana", "gmn", "bgmn", "bagaimanakah",
  // Kata keharusan. Muncul di hampir setiap pertanyaan tentang dokumen dan
  // tidak pernah membedakan butir yang satu dari yang lain.
  "perlu", "diperlukan", "memerlukan", "butuh", "dibutuhkan", "membutuhkan",
  "harus", "wajib", "mesti",
  // Singkatan yang lazim diketik di ponsel, beserta kata pengisi percakapan.
  // Dilaporkan user: "pendaftaran gimana" tidak terjawab. Penyebabnya bukan
  // kata "pendaftaran" melainkan kata di sebelahnya — setiap kata yang tidak
  // dikenal pengetahuan diberi bobot setinggi kata asing sungguhan, sehingga
  // satu kata pengisi cukup untuk menenggelamkan pertanyaan yang topiknya
  // sebenarnya sudah jelas.
  "yg", "utk", "dgn", "sy", "jd", "sm", "dr", "tdk", "klo", "kalo",
  "gitu", "gini", "deh", "nanya", "pengen", "pengin", "buat", "kek", "kayak",
  "mas", "mbak", "mba", "bang", "bosku", "gan", "tanya",
  "udah", "udh", "dah", "engga", "enggak", "ngga", "emang", "emangnya",
  // Setiap pertanyaan di situs ini tentang calon siswa, jadi kata-kata ini
  // tidak pernah membedakan butir yang satu dari yang lain.
  "siswa", "murid", "peserta", "didik", "anak", "calon", "putra", "putri",
  "online", "daring", "offline", "luring",
]);

/**
 * Padanan kata: tiap baris dipetakan ke kata pertamanya. Ini yang membuat
 * "berapa duit" menemukan butir yang menulis "biaya", dan "kapan tutup"
 * menemukan butir yang menulis "ditutup".
 */
// prettier-ignore
const PADANAN: string[][] = [
  ["biaya", "bayar", "membayar", "pembayaran", "uang", "duit", "gratis", "spp", "pungutan", "tarif", "harga", "iuran", "sumbangan"],
  ["jadwal", "kapan", "kpn", "tanggal", "tgl", "waktu", "mulai", "dimulai", "tutup", "ditutup", "dibuka", "buka", "batas", "deadline", "penutupan", "pembukaan", "sempat", "telat", "terlambat", "keburu"],
  ["dokumen", "berkas", "file", "syarat", "persyaratan", "unggah", "upload", "scan", "lampiran", "ijazah", "rapor", "akta", "kk", "nisn", "nik", "pasfoto"],
  ["daftar", "mendaftar", "pendaftaran", "registrasi", "ppdb", "formulir", "isi", "penerimaan", "terima", "masuk"],
  ["status", "verifikasi", "diverifikasi", "cek", "periksa", "lacak", "pantau"],
  ["pengumuman", "hasil", "lulus", "kelulusan", "diterima", "ditolak"],
  ["tes", "ujian", "seleksi", "soal", "tryout"],
  ["lokasi", "alamat", "almt", "dimana", "dmn", "maps", "peta", "jalan", "tempat", "letak", "arah"],
  ["kontak", "hubungi", "telepon", "telp", "nomor", "nomer", "wa", "whatsapp", "email", "surel", "narahubung"],
  ["peminatan", "jurusan", "mipa", "ipa", "ips", "bahasa", "program"],
  ["kuota", "tampung", "kursi", "sisa", "penuh", "kapasitas"],
  ["sekolah", "smaimtek", "imtek", "npsn", "akreditasi", "profil"],
  ["daftarulang", "heregistrasi"],
  ["ponsel", "hp", "handphone", "android", "iphone", "laptop", "komputer"],
  ["cara", "caranya", "prosedur", "proses", "tahapan", "langkah", "alur"],
  ["berapa", "brp", "berapakah"],
];

const KE_PADANAN = new Map<string, string>();
for (const baris of PADANAN) {
  for (const kata of baris) KE_PADANAN.set(kata, baris[0]);
}
// Bentuk tanpa akhiran ikut dipetakan ke padanan yang sama. Tanpa ini,
// "dipungut" yang terkupas menjadi "pungut" kehilangan kaitannya dengan
// "biaya", sebab yang terdaftar hanya "pungutan".
for (const baris of PADANAN) {
  for (const kata of baris) {
    for (const a of ["kan", "an", "i"]) {
      if (kata.length > a.length + 3 && kata.endsWith(a)) {
        const dasar = kata.slice(0, -a.length);
        if (!KE_PADANAN.has(dasar)) KE_PADANAN.set(dasar, baris[0]);
      }
    }
  }
}

/**
 * Membuang akhiran milik "-nya".
 *
 * HANYA "-nya", dan itu perbaikan dari bentuk sebelumnya yang juga
 * memenggal "-kah", "-lah", dan "-pun" tanpa memeriksa apa pun. Akibatnya
 * fatal dan tidak terlihat: "langkah" menjadi "lang", "sekolah" menjadi
 * "seko", "masalah" menjadi "masa". Kata yang terpenggal begitu kehilangan
 * padanannya sekaligus — "seko" tidak ada di daftar padanan mana pun —
 * sehingga "langkah daftar online" tidak terjawab sama sekali.
 *
 * Ketiganya sekarang ditangani `kupasan`, yang hanya menerima hasil
 * kupasan bila bentuknya memang dikenal pengetahuan. "langkah" dan
 * "sekolah" dikenal, jadi keduanya berhenti sebelum dipenggal.
 *
 * "-nya" dipertahankan di sini karena dipakai kedua sisi dan cukup aman:
 * penjaga panjangnya membuat "hanya", "punya", dan "tanya" tidak tersentuh.
 */
function akar(kata: string): string {
  if (kata.length > 6 && kata.endsWith("nya")) return kata.slice(0, -3);
  return kata;
}

/* ------------------------------------------------------------------ *
 *  Pemenggal imbuhan
 *
 *  Daftar padanan buatan tangan hanya menangani kata yang sempat
 *  terpikir. Yang tidak terpikir jatuh diam-diam: "dipungut" tidak
 *  bertemu "pungutan", "mendaftarkan" tidak bertemu "mendaftar",
 *  "berapaan" tidak bertemu "berapa". Diukur dengan 30 pertanyaan yang
 *  tidak dipakai menyetel, sepuluh gagal dan lima di antaranya gagal
 *  hanya karena imbuhan.
 *
 *  Imbuhan berbeda sifatnya dengan kosakata: jumlahnya terbatas dan
 *  berpola, jadi satu aturan menangani seluruhnya sekaligus, termasuk
 *  bentuk yang belum pernah dilihat.
 *
 *  KUNCINYA MENGUPAS MENUJU KOSAKATA YANG DIKENAL, bukan mengupas
 *  sebanyak-banyaknya. Kata yang sudah ada di pengetahuan tidak disentuh
 *  sama sekali, dan hasil kupasan hanya diterima bila bentuknya memang
 *  dikenal. Itu yang menjaga "berkas" tidak menjadi "kas" dan "berapa"
 *  tidak menjadi "apa" — keduanya kata yang dikenal, jadi berhenti di
 *  langkah pertama.
 * ------------------------------------------------------------------ */

/** Akhiran turunan. Dipakai pada kedua sisi, sebab cukup jinak. */
const AKHIRAN = ["kan", "an", "i"];

/**
 * Akhiran penegas. Hanya dikupas pada sisi penanya dan hanya bila hasilnya
 * dikenal, sebab "langkah" dan "sekolah" berakhiran sama tanpa memuatnya.
 */
const AKHIRAN_PENEGAS = ["kah", "lah", "pun"];

/**
 * Awalan beserta pemulihan huruf yang luluh. "meny-" memakan huruf s pada
 * "menyapu" -> "sapu", "meng-" memakan k pada "mengambil" -> "ambil".
 */
const AWALAN: { imbuhan: string; pulih: string[] }[] = [
  { imbuhan: "meng", pulih: ["", "k"] },
  { imbuhan: "meny", pulih: ["s"] },
  { imbuhan: "mem", pulih: ["", "p"] },
  { imbuhan: "men", pulih: ["", "t"] },
  { imbuhan: "peng", pulih: ["", "k"] },
  { imbuhan: "peny", pulih: ["s"] },
  { imbuhan: "pem", pulih: ["", "p"] },
  { imbuhan: "pen", pulih: ["", "t"] },
  { imbuhan: "ber", pulih: [""] },
  { imbuhan: "ter", pulih: [""] },
  { imbuhan: "per", pulih: [""] },
  { imbuhan: "me", pulih: [""] },
  { imbuhan: "pe", pulih: [""] },
  { imbuhan: "di", pulih: [""] },
  { imbuhan: "ke", pulih: [""] },
  { imbuhan: "se", pulih: [""] },
];

/** Bentuk yang mungkin, dari yang paling sedikit dikupas. */
function kupasan(kata: string): string[] {
  const hasil = [kata];

  const tanpaAkhiran = [kata];
  for (const a of AKHIRAN_PENEGAS) {
    if (kata.length > a.length + 3 && kata.endsWith(a)) {
      tanpaAkhiran.push(kata.slice(0, -a.length));
    }
  }
  for (const a of AKHIRAN) {
    if (kata.length > a.length + 3 && kata.endsWith(a)) {
      tanpaAkhiran.push(kata.slice(0, -a.length));
    }
  }
  for (const k of tanpaAkhiran) if (k !== kata) hasil.push(k);

  for (const dasar of tanpaAkhiran) {
    for (const { imbuhan, pulih } of AWALAN) {
      if (!dasar.startsWith(imbuhan)) continue;
      const sisa = dasar.slice(imbuhan.length);
      for (const huruf of pulih) {
        const calon = huruf + sisa;
        if (calon.length >= 3) hasil.push(calon);
      }
    }
  }
  return hasil;
}

/**
 * Memecah kalimat menjadi kumpulan konsep.
 *
 * KATA ASLINYA IKUT DISIMPAN, bukan hanya padanannya. Ini pernah salah:
 * mula-mula tiap kata langsung diganti padanannya, sehingga "kapan" dan
 * "ditutup" sama-sama menjadi "jadwal" dan pertanyaan "kapan pendaftaran
 * ditutup" menyusut menjadi dua konsep saja. Akibatnya butir "apakah
 * pendaftaran sedang dibuka" dan butir "kapan dibuka dan ditutup"
 * bernilai persis sama, dan yang menang tinggal urutan larik. Dengan kata
 * aslinya ikut disimpan, "ditutup" tetap membedakan keduanya.
 */
export function konsep(teks: string): Set<string> {
  const hasil = new Set<string>();
  for (const kata of kataAsli(teks)) {
    // Bentuk tanpa akhiran turunan ikut disimpan, supaya "pungutan" di sisi
    // pengetahuan dapat dipertemukan dengan "dipungut" di sisi penanya:
    // keduanya bertemu di "pungut".
    for (const bentuk of [kata, ...bentukTanpaAkhiran(kata)]) {
      hasil.add(bentuk);
      const padanan = KE_PADANAN.get(bentuk);
      if (padanan && padanan !== bentuk) hasil.add(padanan);
    }
  }
  return hasil;
}

function bentukTanpaAkhiran(kata: string): string[] {
  const hasil: string[] = [];
  for (const a of AKHIRAN) {
    if (kata.length > a.length + 3 && kata.endsWith(a)) {
      hasil.push(kata.slice(0, -a.length));
    }
  }
  return hasil;
}

/**
 * Kata yang BENAR-BENAR diketik, sesudah dibuang akhirannya — tanpa
 * padanan.
 *
 * Dipisahkan dari `konsep` karena pernah menimbulkan kesalahan yang halus.
 * Pengelompokan pertanyaan dibangun dari keluaran `konsep`, sehingga kata
 * padanan seperti "jadwal" ikut terhitung sebagai "bentuk yang persis
 * diketik penanya". Akibatnya butir yang hanya cocok lewat padanan tetap
 * bernilai penuh, dan "kapan pendaftaran ditutup" seri persis dengan
 * "apakah pendaftaran sedang dibuka" — yang menang tinggal urutan larik.
 */
function kataAsli(teks: string): string[] {
  const hasil: string[] = [];
  const bersih = (teks || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!bersih) return hasil;

  for (const mentah of bersih.split(" ")) {
    if (mentah.length < 3 && !/^\d+$/.test(mentah)) continue;
    if (KATA_BUANG.has(mentah)) continue;
    const kata = akar(mentah);
    if (KATA_BUANG.has(kata)) continue;
    hasil.push(kata);
  }
  return hasil;
}

/* ------------------------------------------------------------------ *
 *  Menyusun pengetahuan
 * ------------------------------------------------------------------ */

/**
 * Butir yang disusun dari data hidup.
 *
 * Yang datanya belum diisi sekolah TIDAK dibuatkan butirnya sama sekali.
 * Lebih baik kotak ini menjawab "belum ada keterangannya" daripada
 * menjawab dengan penanda [kurung siku] atau dengan angka nol.
 */
function butirDataHidup(
  p: Pengaturan,
  ppdb: KeadaanPpdb,
  jurusan: Jurusan[],
): ButirPengetahuan[] {
  const b: ButirPengetahuan[] = [];
  const terisi = (k: string) => Boolean(p[k]) && !belumTerisi(p[k]);
  const kata = kataKeadaanPpdb(ppdb, p);

  // Keadaan pendaftaran sekarang. Butir paling sering dicari, dan paling
  // sering basi bila ditulis tangan di naskah FAQ.
  b.push({
    id: "hidup-keadaan",
    tanya: "Apakah pendaftaran sedang dibuka sekarang?",
    jawab: kata.kalimat,
    kategori: "Pendaftaran",
    kunci: ["sekarang", "masih", "sedang"],
    tautan: { label: "Lihat ketentuan PPDB", jalur: "/ppdb" },
    utama: true,
  });

  if (terisi("ppdb_mulai") || terisi("ppdb_selesai")) {
    const bagian: string[] = [];
    if (terisi("ppdb_mulai"))
      bagian.push(`dibuka ${tanggalPanjang(p.ppdb_mulai)}`);
    if (terisi("ppdb_selesai"))
      bagian.push(`ditutup ${tanggalPanjang(p.ppdb_selesai)}`);
    let jawab = `Pendaftaran tahun ajaran ${p.ppdb_tahun || "ini"} ${bagian.join(" dan ")}.`;
    if (terisi("ppdb_pengumuman")) {
      jawab += ` Hasil seleksi diumumkan ${tanggalPanjang(p.ppdb_pengumuman)}.`;
    }
    b.push({
      id: "hidup-jadwal",
      tanya: "Kapan pendaftaran dibuka dan ditutup?",
      jawab,
      kategori: "Pendaftaran",
      kunci: ["jadwal", "pengumuman", "tahun", "ajaran", "tutup", "buka"],
      tautan: { label: "Lihat ketentuan PPDB", jalur: "/ppdb" },
      utama: true,
    });
  }

  if (terisi("ppdb_biaya")) {
    b.push({
      id: "hidup-biaya",
      tanya: "Berapa biaya pendaftarannya?",
      jawab:
        p.ppdb_biaya +
        (terisi("biaya_catatan") ? `\n\n${p.biaya_catatan}` : ""),
      kategori: "Biaya",
      kunci: ["biaya", "bayar", "gratis"],
      tautan: { label: "Lihat ketentuan PPDB", jalur: "/ppdb" },
      utama: true,
    });
  }

  if (ppdb.kuota > 0) {
    const sisa = Math.max(0, ppdb.kuota - ppdb.terisi);
    b.push({
      id: "hidup-kuota",
      tanya: "Berapa kuota penerimaan dan apakah masih tersedia?",
      jawab:
        `Kuota tahun ini ${ppdb.kuota} siswa. Sudah ada ${ppdb.terisi} pendaftar, ` +
        `sehingga sisa kuotanya ${sisa}. Angka ini ikut bergerak setiap ada pendaftar baru.`,
      kategori: "Pendaftaran",
      kunci: ["kuota", "sisa", "kursi", "penuh"],
      tautan: { label: "Lihat ketentuan PPDB", jalur: "/ppdb" },
      utama: true,
    });
  }

  const peminatan = jurusan.filter((j) => j.aktif !== false);
  if (peminatan.length > 0) {
    b.push({
      id: "hidup-peminatan",
      tanya: "Peminatan apa saja yang dibuka?",
      jawab:
        `Ada ${peminatan.length} peminatan: ` +
        peminatan.map((j) => j.nama).join(", ") +
        ". Pilihan peminatan diisi saat mengisi formulir pendaftaran.",
      kategori: "Pendaftaran",
      kunci: ["peminatan", "jurusan", "pilihan"],
      tautan: { label: "Lihat peminatan", jalur: "/#peminatan" },
      utama: true,
    });
  }

  if (terisi("alamat")) {
    b.push({
      id: "hidup-alamat",
      tanya: "Di mana alamat dan lokasi sekolahnya?",
      jawab: alamatLengkap(p.alamat, p.kode_pos),
      kategori: "Umum",
      kunci: ["lokasi", "sekolah", "dimana", "peta", "arah"],
      tautan: { label: "Buka Google Maps", jalur: tautanPeta(p), luar: true },
      utama: true,
    });
  }

  const jalur: string[] = [];
  if (terisi("telepon")) jalur.push(`telepon ${p.telepon}`);
  if (terisi("whatsapp")) jalur.push(`WhatsApp ${p.whatsapp}`);
  if (terisi("email")) jalur.push(`surel ${p.email}`);
  if (jalur.length > 0) {
    b.push({
      id: "hidup-kontak",
      tanya: "Bagaimana cara menghubungi sekolah (telepon, WhatsApp, surel)?",
      jawab:
        `Panitia dapat dihubungi lewat ${jalur.join(", ")}.` +
        (terisi("jam_layanan") ? ` Jam layanan: ${p.jam_layanan}.` : ""),
      kategori: "Umum",
      kunci: ["kontak", "nomor", "panitia", "narahubung"],
      tautan: { label: "Halaman Kontak", jalur: "/kontak" },
      utama: true,
    });
  }

  // Dokumen yang diminta. Butir ini ada meski sekolah belum mengisi apa pun,
  // sebab daftarnya ditentukan formulir — bukan pengaturan — dan harus sama
  // dengan `berkasPendaftar` di backend. Lihat lib/dokumen.ts.
  const wajib = DOKUMEN.filter((d) => d.wajib);
  const opsional = DOKUMEN.filter((d) => !d.wajib);
  b.push({
    id: "hidup-dokumen",
    tanya: "Dokumen apa saja yang diunggah? (syarat berkas)",
    jawab:
      `Ada ${wajib.length} dokumen wajib: ` +
      wajib.map((d) => d.nama).join(", ") +
      "." +
      (opsional.length > 0
        ? ` Yang tidak wajib: ${opsional.map((d) => d.nama).join(", ")}.` +
          (opsional[0].catatan ? ` ${opsional[0].catatan}` : "")
        : "") +
      " Berkasnya diunggah saat mengisi formulir.",
    kategori: "Berkas",
    kunci: ["dokumen", "syarat", "berkas", "unggah", "persyaratan"],
    tautan: { label: "Lihat ketentuan PPDB", jalur: "/ppdb" },
    utama: true,
  });

  if (terisi("ppdb_syarat")) {
    b.push({
      id: "hidup-syarat",
      tanya: "Apa saja persyaratan tambahan dari sekolah?",
      jawab: p.ppdb_syarat,
      kategori: "Berkas",
      kunci: ["dokumen"],
      tautan: { label: "Lihat ketentuan PPDB", jalur: "/ppdb" },
      utama: true,
    });
  }

  return b;
}

export function bangunPengetahuan(
  faq: Faq[],
  p: Pengaturan,
  ppdb: KeadaanPpdb,
  jurusan: Jurusan[],
): ButirPengetahuan[] {
  const dariFaq: ButirPengetahuan[] = faq
    .filter((f) => f.aktif !== false)
    .map((f) => ({
      id: `faq-${f.id}`,
      tanya: f.pertanyaan,
      jawab: f.jawaban,
      kategori: f.kategori,
    }));
  return [...butirDataHidup(p, ppdb, jurusan), ...dariFaq];
}

/* ------------------------------------------------------------------ *
 *  Kosakata dan toleransi salah ketik
 * ------------------------------------------------------------------ */

interface Kamus {
  /** Seluruh konsep yang ada di pengetahuan. */
  kosakata: Set<string>;
  /** Indeks tiga-huruf, untuk mencari kata yang mirip. */
  tigaHuruf: Map<string, string[]>;
}

const simpananKamus = new WeakMap<ButirPengetahuan[], Kamus>();

function tigaHurufDari(kata: string): string[] {
  const p = `  ${kata} `;
  const hasil: string[] = [];
  for (let i = 0; i < p.length - 2; i++) hasil.push(p.slice(i, i + 3));
  return hasil;
}

function bangunKamus(pengetahuan: ButirPengetahuan[]): Kamus {
  const tersimpan = simpananKamus.get(pengetahuan);
  if (tersimpan) return tersimpan;

  const kosakata = new Set<string>();
  for (const b of pengetahuan) {
    for (const k of konsep(b.tanya)) kosakata.add(k);
    for (const k of konsep((b.kunci ?? []).join(" "))) kosakata.add(k);
    for (const k of konsep(b.jawab)) kosakata.add(k);
  }
  // Kata padanan ikut masuk kosakata beserta bentuk tanpa akhirannya,
  // supaya "dipungut" yang terkupas menjadi "pungut" tetap menemukan
  // "pungutan" walau kata itu tidak pernah muncul di naskah mana pun.
  for (const k of KE_PADANAN.keys()) {
    kosakata.add(k);
    for (const b of bentukTanpaAkhiran(k)) kosakata.add(b);
  }

  const tigaHuruf = new Map<string, string[]>();
  for (const kata of kosakata) {
    for (const t of tigaHurufDari(kata)) {
      const daftar = tigaHuruf.get(t);
      if (daftar) daftar.push(kata);
      else tigaHuruf.set(t, [kata]);
    }
  }

  const kamus = { kosakata, tigaHuruf };
  simpananKamus.set(pengetahuan, kamus);
  return kamus;
}

/**
 * Kata dikenal yang paling mirip, atau kosong bila tidak ada yang cukup
 * mirip. Dipakai untuk salah ketik: "pendaftran", "skolah", "biyaya".
 *
 * Kemiripannya dihitung dari irisan potongan tiga huruf. Ambangnya 0,42,
 * dan angka itu diukur bukan ditebak: "biyaya" terhadap "biaya" hanya
 * 0,44 pada hitungan ini, "kuoata" terhadap "kuota" pun 0,44, sedangkan
 * "skolah" terhadap "sekolah" 0,50. Ambang yang semula 0,55 menolak
 * hampir seluruh salah ketik yang lazim terjadi.
 * Panjangnya dibatasi berselisih paling banyak dua huruf, supaya
 * longgarnya ambang tidak menyeret kata asing ke kata yang tidak
 * berhubungan.
 */
function kataTermirip(kata: string, kamus: Kamus): string {
  if (kata.length < 5) return "";
  const potongan = tigaHurufDari(kata);
  const hitung = new Map<string, number>();
  for (const t of potongan) {
    for (const k of kamus.tigaHuruf.get(t) ?? []) {
      hitung.set(k, (hitung.get(k) ?? 0) + 1);
    }
  }

  let terbaik = "";
  let nilaiTerbaik = 0;
  for (const [k, sama] of hitung) {
    // Salah ketik tidak mengubah panjang kata jauh-jauh. Penjaga ini yang
    // mencegah kata pendek tak dikenal tersedot ke kata panjang yang
    // kebetulan berbagi beberapa potongan.
    if (Math.abs(k.length - kata.length) > 2) continue;
    const nilai = sama / (potongan.length + tigaHurufDari(k).length - sama);
    if (nilai > nilaiTerbaik) {
      nilaiTerbaik = nilai;
      terbaik = k;
    }
  }
  return nilaiTerbaik >= 0.42 ? terbaik : "";
}

/**
 * Membakukan kata yang diketik penanya menjadi kata yang dikenal
 * pengetahuan, dengan tiga usaha berurutan.
 *
 *   1. Sudah dikenal? Dipakai apa adanya. Langkah ini yang menjaga
 *      "berapa" tidak dikupas menjadi "apa" dan "berkas" tidak menjadi
 *      "kas".
 *   2. Kupas imbuhannya, ambil bentuk pertama yang dikenal.
 *   3. Cari kata dikenal yang paling mirip, untuk salah ketik.
 *
 * Bila ketiganya gagal, katanya dibiarkan apa adanya — dan karena tidak
 * dikenal, bobotnya berat dan pertanyaannya cenderung jatuh ke bawah
 * ambang. Itu memang yang diinginkan untuk pertanyaan di luar cakupan.
 */
function bakukan(kata: string, kamus: Kamus): string {
  if (kamus.kosakata.has(kata)) return kata;
  for (const calon of kupasan(kata)) {
    if (kamus.kosakata.has(calon)) return calon;
  }
  const mirip = kataTermirip(kata, kamus);
  return mirip || kata;
}

/* ------------------------------------------------------------------ *
 *  Pencocokan
 * ------------------------------------------------------------------ */

export interface HasilJawab {
  butir: ButirPengetahuan;
  nilai: number;
}

/**
 * Di bawah ini dianggap tidak ketemu; lebih baik mengaku tidak tahu.
 *
 * Angkanya bukan tebakan. Seluruh pertanyaan uji ditakar nilainya dengan
 * ambang dinolkan, lalu dicari celah antara yang paling lemah di antara
 * yang HARUS terjawab dan yang paling kuat di antara yang HARUS ditolak:
 *
 *   0,516  "peminatan yang tersedia"        <- terlemah yang harus lolos
 *   0,420  "berapa harga seragam batik"     <- terkuat yang harus ditolak
 *
 * 0,47 berada di tengah keduanya, jadi ada selisih di kedua sisi. Bila
 * kelak butir pengetahuannya bertambah banyak, takaran ini perlu diulang —
 * alat penakarnya ada di catatan pengujian pada README.
 */
const AMBANG = 0.47;

/**
 * Bobot tiap konsep, dihitung dari pengetahuannya sendiri.
 *
 * Konsep yang muncul di mana-mana hampir tidak membedakan apa pun. Di situs
 * sekolah, "sekolah" dan "daftar" ada di hampir setiap butir; menghitungnya
 * sederajat dengan "telepon" membuat pertanyaan "nomor telepon sekolah"
 * dimenangkan butir yang kebetulan menyebut sekolah. Bobotnya karena itu
 * diturunkan menurut seberapa sering konsepnya muncul — bukan dari daftar
 * kata yang ditulis tangan, melainkan dari isi pengetahuannya sendiri,
 * sehingga ikut menyesuaikan saat panitia menambah butir baru.
 */
const simpananBobot = new WeakMap<ButirPengetahuan[], Map<string, number>>();

function bobotKonsep(pengetahuan: ButirPengetahuan[]): Map<string, number> {
  const tersimpan = simpananBobot.get(pengetahuan);
  if (tersimpan) return tersimpan;

  const sering = new Map<string, number>();
  for (const b of pengetahuan) {
    const semua = new Set([
      ...konsep(b.tanya),
      ...konsep((b.kunci ?? []).join(" ")),
      ...konsep(b.jawab),
    ]);
    for (const k of semua) sering.set(k, (sering.get(k) ?? 0) + 1);
  }

  const n = pengetahuan.length || 1;
  const bobot = new Map<string, number>();
  for (const [k, jumlah] of sering)
    bobot.set(k, Math.log(1 + n / (1 + jumlah)));
  simpananBobot.set(pengetahuan, bobot);
  return bobot;
}

/**
 * Mencari jawaban.
 *
 * Nilainya bagian BERBOBOT dari pertanyaan penanya yang tertutupi butir,
 * bukan sekadar jumlah kata yang sama. Karena penyebutnya seluruh bobot
 * pertanyaan, satu kata asing yang tidak dikenal pengetahuan menurunkan
 * nilainya — dan itu yang diinginkan: pertanyaan tentang hal yang memang
 * tidak ada datanya harus jatuh ke bawah ambang, bukan dipaksakan ke butir
 * terdekat.
 */
export function cariJawaban(
  pertanyaan: string,
  pengetahuan: ButirPengetahuan[],
  maks = 3,
): HasilJawab[] {
  const kamus = bangunKamus(pengetahuan);

  // Tiap kata yang diketik penanya dibakukan lebih dulu menjadi kata yang
  // dikenal pengetahuan — lewat pengupasan imbuhan, lalu lewat kemiripan
  // tiga huruf bila masih belum dikenal juga.
  const kataDibakukan = kataAsli(pertanyaan).map((k) => bakukan(k, kamus));
  if (kataDibakukan.length === 0) return [];

  const tanya = new Set<string>();
  for (const k of kataDibakukan) {
    tanya.add(k);
    const padanan = KE_PADANAN.get(k);
    if (padanan && padanan !== k) tanya.add(padanan);
  }

  const bobot = bobotKonsep(pengetahuan);
  // Kata yang tidak dikenal pengetahuan tetap dihitung berat — itu yang
  // membuat pertanyaan di luar cakupan jatuh ke bawah ambang, bukan
  // dipaksakan ke butir terdekat. Tetapi tidak lagi LEBIH berat daripada
  // kata apa pun yang dikenal: beratnya disamakan dengan kata terlangka
  // yang memang ada, sehingga satu kata pengisi yang tidak terdaftar tidak
  // sanggup lagi menenggelamkan pertanyaan yang topiknya sudah jelas.
  let bobotAsing = 0;
  for (const w of bobot.values()) bobotAsing = Math.max(bobotAsing, w);
  if (bobotAsing === 0) bobotAsing = 1;

  // Konsep pertanyaan dikelompokkan menurut padanannya, supaya "alamatnya
  // dimana" tidak terhitung dua tuntutan terpisah — "alamat" dan "dimana"
  // menanyakan hal yang sama, dan butir yang menjawabnya cuma perlu
  // menyebut salah satunya.
  const kelompok = new Map<string, Set<string>>();
  for (const k of kataDibakukan) {
    const kanon = KE_PADANAN.get(k) ?? k;
    if (!kelompok.has(kanon)) kelompok.set(kanon, new Set());
    kelompok.get(kanon)!.add(k);
  }

  const hasil: HasilJawab[] = [];
  for (const butir of pengetahuan) {
    const diTanya = konsep(butir.tanya);
    const diKunci = konsep((butir.kunci ?? []).join(" "));
    const diJawab = konsep(butir.jawab);

    let dapat = 0;
    let penuh = 0;

    for (const [kanon, bentuk] of kelompok) {
      let w = bobot.get(kanon) ?? 0;
      for (const b of bentuk) w = Math.max(w, bobot.get(b) ?? bobotAsing);
      penuh += w;

      // Cocok pada kata yang PERSIS dipakai penanya bernilai penuh; cocok
      // yang hanya lewat padanan bernilai sedikit lebih rendah. Bedanya
      // tipis tetapi menentukan: "kapan pendaftaran ditutup" dan "apakah
      // pendaftaran sedang dibuka" sama-sama berkonsep jadwal, dan yang
      // memutuskan hanya kata "ditutup" yang memang tertulis persis.
      const cocok = (isi: Set<string>) => {
        for (const b of bentuk) if (isi.has(b)) return 1;
        return isi.has(kanon) ? 0.8 : 0;
      };

      // Cocok di pertanyaannya paling berarti; di isi jawabannya paling
      // lemah, sebab jawaban panjang memuat banyak kata secara kebetulan.
      dapat +=
        w *
        Math.max(cocok(diTanya), cocok(diKunci) * 0.7, cocok(diJawab) * 0.35);
    }

    let nilai = penuh > 0 ? dapat / penuh : 0;

    // Sejauh ini yang diukur hanya seberapa banyak PERTANYAAN PENANYA yang
    // tertutupi butir. Itu membuat butir yang panjang dan butir yang tepat
    // sering bernilai persis sama, dan pemenangnya tinggal urutan larik:
    // "pendaftaran gimana" seri antara "Bagaimana cara mendaftar di sekolah
    // ini?" dan "Saya lupa nomor registrasi, bagaimana?".
    //
    // Karena itu ditambahkan ukuran sebaliknya: seberapa besar bagian
    // PERTANYAAN BUTIR yang memang ditanyakan. Butir yang pendek dan tepat
    // sasaran unggul atas butir panjang yang kebetulan memuat kata yang
    // sama. Pengaruhnya sengaja kecil — hanya seperlima — supaya perannya
    // memutus seri, bukan mengambil alih penilaian.
    if (diTanya.size > 0) {
      let tersentuh = 0;
      for (const k of diTanya) if (tanya.has(k)) tersentuh += 1;
      nilai *= 0.8 + 0.2 * (tersentuh / diTanya.size);
    }

    // Butir yang TOPIKNYA tidak disinggung sama sekali diturunkan, walau
    // sebagian katanya cocok. `kunci` adalah pernyataan topik butir itu,
    // jadi bila tidak satu pun tersentuh, kecocokannya kebetulan belaka.
    //
    // Ini pernah salah dan tampak wajar: "pendaftaran sampai tanggal
    // berapa" dimenangkan butir "Berapa biaya pendaftarannya?", sebab kata
    // "berapa" dan "pendaftaran" sama-sama ada di sana — padahal biaya
    // tidak ditanyakan sama sekali.
    // Butir FAQ tidak punya `kunci`, jadi topiknya diambil dari kategori
    // yang sudah dipilih panitia. Sinyalnya lebih lemah daripada kunci yang
    // ditulis khusus, jadi hukumannya pun lebih ringan.
    const adaKunci = (butir.kunci ?? []).length > 0;
    const topik = adaKunci
      ? konsep(butir.kunci!.join(" "))
      : konsep(butir.kategori);
    if (topik.size > 0) {
      let tersentuh = false;
      for (const k of tanya) {
        if (topik.has(k)) {
          tersentuh = true;
          break;
        }
      }
      if (!tersentuh) nilai *= adaKunci ? 0.75 : 0.85;
    }

    if (butir.utama) nilai *= 1.15;

    if (nilai >= AMBANG) hasil.push({ butir, nilai });
  }

  return hasil.sort((a, b) => b.nilai - a.nilai).slice(0, maks);
}

/** Pertanyaan pancingan, ditawarkan sebelum pengunjung mengetik apa pun. */
export function pertanyaanPancingan(pengetahuan: ButirPengetahuan[]): string[] {
  const utama = pengetahuan.filter((b) => b.utama).map((b) => b.tanya);
  const sisa = pengetahuan.filter((b) => !b.utama).map((b) => b.tanya);
  return [...utama, ...sisa].slice(0, 5);
}

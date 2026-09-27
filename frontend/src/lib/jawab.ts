import type { Faq, Jurusan, KeadaanPpdb, Pengaturan } from "@/lib/tipe";
import {
  alamatLengkap,
  belumTerisi,
  tanggalPanjang,
  tautanPeta,
} from "@/lib/format";
import { kataKeadaanPpdb } from "@/lib/ppdb";

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
  // "apakah" murni penanda tanya, berbeda dengan "apa" yang masih
  // menyempitkan. Sempat membuat "apakah bayar" dimenangkan butir yang
  // kebetulan juga memuat kata "apakah" di pertanyaannya.
  "apakah",
  // Kata keharusan. Muncul di hampir setiap pertanyaan tentang dokumen dan
  // tidak pernah membedakan butir yang satu dari yang lain.
  "perlu", "diperlukan", "memerlukan", "butuh", "dibutuhkan", "membutuhkan",
  "harus", "wajib", "mesti",
]);

/**
 * Padanan kata: tiap baris dipetakan ke kata pertamanya. Ini yang membuat
 * "berapa duit" menemukan butir yang menulis "biaya", dan "kapan tutup"
 * menemukan butir yang menulis "ditutup".
 */
// prettier-ignore
const PADANAN: string[][] = [
  ["biaya", "bayar", "membayar", "pembayaran", "uang", "duit", "gratis", "spp", "pungutan", "tarif", "harga", "iuran", "sumbangan"],
  ["jadwal", "kapan", "tanggal", "waktu", "mulai", "dimulai", "tutup", "ditutup", "dibuka", "buka", "batas", "deadline", "penutupan", "pembukaan"],
  ["dokumen", "berkas", "file", "syarat", "persyaratan", "unggah", "upload", "scan", "lampiran", "ijazah", "rapor", "akta", "kk", "nisn", "nik", "pasfoto"],
  ["daftar", "mendaftar", "pendaftaran", "registrasi", "ppdb", "formulir", "isi"],
  ["status", "verifikasi", "diverifikasi", "cek", "periksa", "lacak", "pantau"],
  ["pengumuman", "hasil", "lulus", "kelulusan", "diterima", "ditolak"],
  ["tes", "ujian", "seleksi", "soal", "tryout"],
  ["lokasi", "alamat", "dimana", "maps", "peta", "jalan", "tempat", "letak", "arah"],
  ["kontak", "hubungi", "telepon", "nomor", "wa", "whatsapp", "email", "surel", "narahubung"],
  ["peminatan", "jurusan", "mipa", "ipa", "ips", "bahasa", "program"],
  ["kuota", "tampung", "kursi", "sisa", "penuh", "kapasitas"],
  ["sekolah", "smaimtek", "imtek", "npsn", "akreditasi", "profil"],
  ["daftarulang", "heregistrasi"],
  ["ponsel", "hp", "handphone", "android", "iphone", "laptop", "komputer"],
];

const KE_PADANAN = new Map<string, string>();
for (const baris of PADANAN) {
  for (const kata of baris) KE_PADANAN.set(kata, baris[0]);
}

/**
 * Membuang akhiran yang tidak mengubah arti kata dalam bahasa Indonesia.
 *
 * Seadanya saja, bukan pemenggal kata sungguhan: yang dikejar hanya supaya
 * "biayanya" bertemu "biaya" dan "pendaftarannya" bertemu "pendaftaran".
 * Pemenggalan yang lebih agresif justru merusak — "berkas" bukan "berka".
 */
function akar(kata: string): string {
  for (const akhiran of ["nya", "kah", "lah", "pun"]) {
    if (kata.length > akhiran.length + 3 && kata.endsWith(akhiran)) {
      return kata.slice(0, -akhiran.length);
    }
  }
  return kata;
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
    hasil.add(kata);
    const padanan = KE_PADANAN.get(kata);
    if (padanan && padanan !== kata) hasil.add(padanan);
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
 *  Pencocokan
 * ------------------------------------------------------------------ */

export interface HasilJawab {
  butir: ButirPengetahuan;
  nilai: number;
}

/** Di bawah ini dianggap tidak ketemu; lebih baik mengaku tidak tahu. */
const AMBANG = 0.55;

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
  const tanya = konsep(pertanyaan);
  if (tanya.size === 0) return [];

  const bobot = bobotKonsep(pengetahuan);
  const bobotAsing = Math.log(1 + (pengetahuan.length || 1));

  // Konsep pertanyaan dikelompokkan menurut padanannya, supaya "alamatnya
  // dimana" tidak terhitung dua tuntutan terpisah — "alamat" dan "dimana"
  // menanyakan hal yang sama, dan butir yang menjawabnya cuma perlu
  // menyebut salah satunya.
  const kelompok = new Map<string, Set<string>>();
  for (const k of kataAsli(pertanyaan)) {
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

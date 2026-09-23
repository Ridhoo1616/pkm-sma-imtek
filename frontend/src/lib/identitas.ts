/**
 * Pemeriksaan NISN dan NIK di sisi peramban.
 *
 * Aturannya sengaja disamakan dengan `backend/validasi_identitas.go`, dan
 * pembagian tugasnya tegas: yang di sini memberi tahu pendaftar SAAT MENGETIK,
 * yang di backend yang menentukan diterima atau tidak. Pemeriksaan di peramban
 * tidak pernah menjadi satu-satunya penjaga, karena siapa pun dapat
 * melewatinya.
 *
 * Yang perlu diluruskan: sistem ini TIDAK mencocokkan NIK maupun NISN ke basis
 * data pemerintah, dan tidak pernah mengaku begitu. NIK hanya dapat diperiksa
 * ke Dukcapil lewat perjanjian kerja sama resmi, dan laman pencarian NISN
 * Kemendikbud tidak menyediakan API untuk program lain. PDDIKTI pun bukan
 * sumber yang tepat, karena isinya data pendidikan tinggi; untuk jenjang SMA
 * sumbernya Dapodik beserta referensi NISN-nya.
 *
 * Jadi yang dikerjakan di sini pemeriksaan struktur beserta pencocokan silang
 * dengan isian lain pada formulir yang sama. Hasilnya bukan "NIK ini benar
 * milik orang tersebut", melainkan "NIK ini tidak mungkin benar, dan inilah
 * bagian yang salahnya".
 */

/** Dua angka pertama NIK: kode provinsi menurut kode wilayah Kemendagri. */
const PROVINSI: Record<string, string> = {
  "11": "Aceh",
  "12": "Sumatera Utara",
  "13": "Sumatera Barat",
  "14": "Riau",
  "15": "Jambi",
  "16": "Sumatera Selatan",
  "17": "Bengkulu",
  "18": "Lampung",
  "19": "Kepulauan Bangka Belitung",
  "21": "Kepulauan Riau",
  "31": "DKI Jakarta",
  "32": "Jawa Barat",
  "33": "Jawa Tengah",
  "34": "DI Yogyakarta",
  "35": "Jawa Timur",
  "36": "Banten",
  "51": "Bali",
  "52": "Nusa Tenggara Barat",
  "53": "Nusa Tenggara Timur",
  "61": "Kalimantan Barat",
  "62": "Kalimantan Tengah",
  "63": "Kalimantan Selatan",
  "64": "Kalimantan Timur",
  "65": "Kalimantan Utara",
  "71": "Sulawesi Utara",
  "72": "Sulawesi Tengah",
  "73": "Sulawesi Selatan",
  "74": "Sulawesi Tenggara",
  "75": "Gorontalo",
  "76": "Sulawesi Barat",
  "81": "Maluku",
  "82": "Maluku Utara",
  "91": "Papua",
  "92": "Papua Barat",
  "93": "Papua Selatan",
  "94": "Papua Tengah",
  "95": "Papua Pegunungan",
  "96": "Papua Barat Daya",
};

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Kabar pemeriksaan. "sedang" berarti nomornya belum selesai diketik. */
export interface KabarPeriksa {
  jenis: "kosong" | "sedang" | "salah" | "curiga" | "benar";
  pesan: string;
  /** Kolom lain yang justru lebih mungkin salah, bila ada. */
  kolomLain?: "tanggal_lahir" | "jenis_kelamin";
}

const angkaSaja = (s: string) => /^\d+$/.test(s);

function tanggalPanjang(iso: string): string {
  const [t, b, h] = iso.split("-").map(Number);
  if (!t || !b || !h) return iso;
  return `${h} ${BULAN[b - 1]} ${t}`;
}

export interface BagianNik {
  provinsi: string;
  tanggalLahir: string;
  perempuan: boolean;
}

/**
 * Membaca struktur NIK. Mengembalikan bagian yang terbaca, atau pesan yang
 * menyebut bagian mana yang bermasalah.
 *
 * Bentuknya 16 angka: kode provinsi, kabupaten, kecamatan, lalu tanggal lahir
 * yang ditambah 40 bila perempuan, bulan, dua angka tahun, dan nomor urut.
 */
export function bacaNik(nik: string): { hasil?: BagianNik; galat?: string } {
  if (!angkaSaja(nik)) {
    return { galat: "NIK hanya boleh berisi angka, tanpa spasi maupun tanda hubung." };
  }
  if (nik.length !== 16) {
    return {
      galat: `NIK harus 16 angka, yang Anda tulis ${nik.length} angka. Nomor ini ada di kartu keluarga dan KTP.`,
    };
  }

  const provinsi = PROVINSI[nik.slice(0, 2)];
  if (!provinsi) {
    return {
      galat: `Dua angka pertama NIK adalah kode provinsi, dan ${nik.slice(0, 2)} bukan kode provinsi yang ada. Periksa kembali angka pertama NIK Anda.`,
    };
  }
  if (nik.slice(2, 4) === "00") {
    return { galat: "Angka ke-3 dan ke-4 NIK adalah kode kabupaten atau kota, dan tidak boleh 00." };
  }
  if (nik.slice(4, 6) === "00") {
    return { galat: "Angka ke-5 dan ke-6 NIK adalah kode kecamatan, dan tidak boleh 00." };
  }

  let hari = Number(nik.slice(6, 8));
  const bulan = Number(nik.slice(8, 10));
  const tahun2 = Number(nik.slice(10, 12));

  const perempuan = hari > 40;
  if (perempuan) hari -= 40;

  if (hari < 1 || hari > 31) {
    return {
      galat: `Angka ke-7 dan ke-8 NIK adalah tanggal lahir (ditambah 40 untuk perempuan), dan ${nik.slice(6, 8)} tidak menghasilkan tanggal yang mungkin.`,
    };
  }
  if (bulan < 1 || bulan > 12) {
    return {
      galat: `Angka ke-9 dan ke-10 NIK adalah bulan lahir, dan ${nik.slice(8, 10)} bukan bulan yang ada.`,
    };
  }

  // NIK hanya menyimpan dua angka terakhir tahun lahir, jadi abadnya ditebak:
  // calon peserta didik SMA jauh lebih mungkin lahir pada abad ini.
  const sekarang = new Date().getFullYear();
  let tahun = Math.floor(sekarang / 100) * 100 + tahun2;
  if (tahun > sekarang - 5) tahun -= 100;

  // Tanggal yang tidak ada, misalnya 31 Februari, dibetulkan sendiri oleh
  // Date menjadi tanggal berikutnya. Pembetulan itu justru menandakan
  // NIK-nya salah.
  const lahir = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (lahir.getUTCDate() !== hari || lahir.getUTCMonth() !== bulan - 1) {
    return {
      galat: `Tanggal lahir yang terbaca dari NIK, ${hari}-${String(bulan).padStart(2, "0")}, bukan tanggal yang ada.`,
    };
  }

  if (nik.slice(12, 16) === "0000") {
    return { galat: "Empat angka terakhir NIK adalah nomor urut, dan tidak pernah 0000." };
  }

  return {
    hasil: {
      provinsi,
      tanggalLahir: lahir.toISOString().slice(0, 10),
      perempuan,
    },
  };
}

/**
 * Memeriksa NIK beserta kecocokannya dengan tanggal lahir dan jenis kelamin
 * yang sudah diisi. Bila tanggal dan bulannya cocok tetapi tahunnya berbeda,
 * yang ditunjuk adalah kolom tanggal lahir, karena di situlah kesalahannya
 * hampir selalu berada.
 */
export function periksaNik(
  nik: string,
  tanggalLahir: string,
  jenisKelamin: string,
): KabarPeriksa {
  const bersih = nik.trim();
  if (bersih === "") return { jenis: "kosong", pesan: "" };

  if (angkaSaja(bersih) && bersih.length < 16) {
    return { jenis: "sedang", pesan: `${bersih.length} dari 16 angka.` };
  }

  const { hasil, galat } = bacaNik(bersih);
  if (galat || !hasil) return { jenis: "salah", pesan: galat ?? "" };

  if (tanggalLahir) {
    if (hasil.tanggalLahir !== tanggalLahir) {
      const [ti, bi, hi] = tanggalLahir.split("-").map(Number);
      const [tn, bn, hn] = hasil.tanggalLahir.split("-").map(Number);
      if (hi === hn && bi === bn && ti !== tn) {
        return {
          jenis: "salah",
          kolomLain: "tanggal_lahir",
          pesan: `Tanggal dan bulannya cocok dengan NIK, tetapi tahunnya berbeda: NIK Anda menunjukkan tahun ${tn}. Periksa tahun pada tanggal lahir.`,
        };
      }
      return {
        jenis: "salah",
        pesan: `NIK ini memuat tanggal lahir ${tanggalPanjang(hasil.tanggalLahir)}, sedangkan tanggal lahir yang Anda isi ${tanggalPanjang(tanggalLahir)}. Salah satu di antaranya keliru.`,
      };
    }
  }

  if (jenisKelamin === "L" && hasil.perempuan) {
    return {
      jenis: "salah",
      kolomLain: "jenis_kelamin",
      pesan: "NIK ini menunjukkan jenis kelamin perempuan, sedangkan yang Anda pilih laki-laki. Pada NIK perempuan, tanggal lahirnya ditambah 40.",
    };
  }
  if (jenisKelamin === "P" && !hasil.perempuan) {
    return {
      jenis: "salah",
      kolomLain: "jenis_kelamin",
      pesan: "NIK ini menunjukkan jenis kelamin laki-laki, sedangkan yang Anda pilih perempuan. Pada NIK perempuan, tanggal lahirnya ditambah 40.",
    };
  }

  const bagian = [`terbaca ${hasil.provinsi}`, tanggalPanjang(hasil.tanggalLahir)];
  if (!tanggalLahir) bagian.push("cocokkan dengan tanggal lahir di bawah");
  return { jenis: "benar", pesan: `NIK ${bagian.join(", ")}.` };
}

/**
 * Memeriksa NISN.
 *
 * Yang dapat dipastikan hanya panjang dan isinya angka. Tiga angka pertama
 * NISN pada umumnya tiga angka terakhir tahun lahir, tetapi itu kebiasaan
 * penomoran dan bukan aturan yang mengikat, sehingga ketidakcocokannya hanya
 * berupa peringatan "curiga" yang tidak menghalangi pengiriman. Menolaknya
 * berarti menolak NISN sah milik peserta didik yang nomornya diterbitkan
 * menyusul.
 */
export function periksaNisn(
  nisn: string,
  tanggalLahir: string,
  nik: string,
): KabarPeriksa {
  const bersih = nisn.trim();
  if (bersih === "") return { jenis: "kosong", pesan: "" };

  if (!angkaSaja(bersih)) {
    return { jenis: "salah", pesan: "NISN hanya boleh berisi angka, tanpa spasi maupun tanda hubung." };
  }
  if (bersih.length === 16) {
    return {
      jenis: "salah",
      pesan: "Yang Anda tulis 16 angka, itu panjang NIK. NISN terdiri atas 10 angka dan tercantum pada rapor atau ijazah SMP.",
    };
  }
  if (bersih.length < 10) {
    return { jenis: "sedang", pesan: `${bersih.length} dari 10 angka.` };
  }
  if (bersih.length !== 10) {
    return {
      jenis: "salah",
      pesan: `NISN harus 10 angka, yang Anda tulis ${bersih.length} angka. Nomor ini tercantum pada rapor atau ijazah SMP.`,
    };
  }
  if (bersih === "0000000000") {
    return { jenis: "salah", pesan: "NISN tidak boleh berisi angka nol semuanya." };
  }
  if (nik.trim().length === 16 && bersih === nik.trim().slice(0, 10)) {
    return {
      jenis: "salah",
      pesan: "NISN yang Anda tulis adalah sepuluh angka pertama NIK. Keduanya nomor yang berbeda: NISN ada di rapor atau ijazah SMP.",
    };
  }

  if (tanggalLahir.length >= 4) {
    const tahun = Number(tanggalLahir.slice(0, 4));
    if (tahun) {
      const awalan = String(tahun % 1000).padStart(3, "0");
      if (bersih.slice(0, 3) !== awalan) {
        // Dulu ini cuma peringatan, dengan alasan yang masih benar:
        // penomorannya kebiasaan, bukan aturan. Tetapi sebagai peringatan ia
        // membiarkan nomor karangan lewat — 0000000098 dan sejenisnya —
        // padahal nomor yang dikarang jauh lebih sering daripada NISN sah
        // yang menyimpang. Jadi sekarang MENOLAK, dan pesannya wajib
        // menyebutkan jalan keluar bagi pendaftar yang datanya memang benar.
        return {
          jenis: "salah",
          pesan: `Tiga angka pertama NISN harus sama dengan tiga angka terakhir tahun lahir, yaitu ${awalan}. Milik Anda ${bersih.slice(0, 3)}. Periksa kembali NISN dan tanggal lahirnya; bila keduanya sudah sesuai rapor, hubungi panitia lewat halaman Kontak.`,
        };
      }
      return { jenis: "benar", pesan: `Bentuknya benar, dan awalannya cocok dengan tahun lahir ${tahun}.` };
    }
  }
  return { jenis: "benar", pesan: "Bentuknya benar, 10 angka." };
}

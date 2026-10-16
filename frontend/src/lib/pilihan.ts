/**
 * Daftar pilihan formulir. Nilainya disamakan dengan versi sebelumnya
 * agar data yang sudah terkumpul tetap dapat dibandingkan.
 */

export const AGAMA = [
  "Islam",
  "Kristen Protestan",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
];

export const JENIS_KELAMIN = [
  { nilai: "L", label: "Laki-laki" },
  { nilai: "P", label: "Perempuan" },
];

export const PENDIDIKAN = [
  "SD",
  "SMP",
  "SMA/SMK",
  "D1-D3",
  "S1",
  "S2",
  "S3",
  "Tidak Sekolah",
];

/** Ukuran baju seragam, dari kecil ke besar. Sama dengan UkuranBaju di backend. */
export const UKURAN_BAJU = ["S", "M", "L", "XL", "2XL", "3XL"];

/**
 * Status orang tua. Sama dengan StatusAyah/StatusIbu di backend. "Almarhum"
 * dan "Almarhumah" ada supaya data anak yatim, piatu, dan yatim piatu
 * tercatat; "Tidak ada" untuk orang tua yang tidak diketahui.
 */
export const STATUS_AYAH = [
  { nilai: "Ada", label: "Ada" },
  { nilai: "Almarhum", label: "Alm. (almarhum)" },
  { nilai: "Tidak ada", label: "Tidak ada" },
];
export const STATUS_IBU = [
  { nilai: "Ada", label: "Ada" },
  { nilai: "Almarhumah", label: "Almh. (almarhumah)" },
  { nilai: "Tidak ada", label: "Tidak ada" },
];

export const PENGHASILAN = [
  "< Rp1.000.000",
  "Rp1.000.000 - Rp2.500.000",
  "Rp2.500.000 - Rp5.000.000",
  "Rp5.000.000 - Rp10.000.000",
  "> Rp10.000.000",
];

/** Keterangan yang lebih jelas untuk pilihan sumber informasi. */
export const LABEL_SUMBER: Record<string, string> = {
  "Website Sekolah": "Website resmi sekolah",
  Instagram: "Instagram",
  Facebook: "Facebook",
  TikTok: "TikTok",
  WhatsApp: "Pesan/Grup WhatsApp",
  Google: "Pencarian Google",
  "Brosur/Spanduk": "Brosur atau spanduk",
  "Sosialisasi Sekolah": "Sosialisasi ke SMP/MTs",
  "Teman/Keluarga": "Teman atau keluarga",
  Alumni: "Alumni sekolah",
  "Guru SMP": "Guru/BK di SMP",
  Lainnya: "Lainnya",
};

export const KETERANGAN_JALUR: Record<string, string> = {
  Reguler: "Jalur umum berdasarkan nilai rapor dan kelengkapan berkas.",
  Prestasi: "Untuk prestasi akademik maupun non-akademik.",
  Afirmasi:
    "Untuk keluarga berpenghasilan rendah atau penyandang disabilitas.",
  "Perpindahan Tugas Orang Tua":
    "Untuk anak yang orang tuanya berpindah tugas ke wilayah sekolah.",
};

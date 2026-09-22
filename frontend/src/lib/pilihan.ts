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
  Prestasi:
    "Untuk prestasi akademik maupun non-akademik. Sertifikat prestasi wajib diunggah.",
  Afirmasi:
    "Untuk keluarga berpenghasilan rendah atau penyandang disabilitas.",
  "Perpindahan Tugas Orang Tua":
    "Untuk anak yang orang tuanya berpindah tugas ke wilayah sekolah.",
};

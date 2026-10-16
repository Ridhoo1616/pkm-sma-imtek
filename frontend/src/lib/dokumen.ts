/**
 * Dokumen yang diminta formulir pendaftaran.
 *
 * DAFTARNYA HARUS SAMA dengan `berkasPendaftar` pada backend
 * (handler_pendaftar.go). Daftar ini mengikuti revisi sekolah Oktober 2026:
 * tujuh dokumen, semuanya wajib. Rapor dan sertifikat prestasi tidak lagi
 * diminta. Halaman Info PPDB pernah menyebut dua dokumen opsional padahal
 * formulirnya mewajibkan keduanya, jadi satu sumber ini dipakai bersama.
 *
 * Ditaruh di sini, bukan di dalam halaman yang menampilkannya, karena dua
 * tempat memakainya: tabel pada halaman Info PPDB dan kotak "Tanya cepat".
 */

export interface Dokumen {
  nama: string;
  wajib: boolean;
  tipe: string;
  catatan?: string;
}

export const DOKUMEN: Dokumen[] = [
  { nama: "Foto 3x4", wajib: true, tipe: "JPG atau PNG" },
  { nama: "Foto 2x3", wajib: true, tipe: "JPG atau PNG" },
  {
    nama: "Surat Keterangan Lulus (SKL)",
    wajib: true,
    tipe: "JPG, PNG, atau PDF",
  },
  { nama: "Ijazah", wajib: true, tipe: "PDF" },
  { nama: "Akta Kelahiran", wajib: true, tipe: "JPG, PNG, atau PDF" },
  { nama: "Kartu Keluarga", wajib: true, tipe: "JPG, PNG, atau PDF" },
  { nama: "KTP Orang Tua", wajib: true, tipe: "JPG, PNG, atau PDF" },
];

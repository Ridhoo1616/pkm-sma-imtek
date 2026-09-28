/**
 * Dokumen yang diminta formulir pendaftaran.
 *
 * DAFTARNYA HARUS SAMA dengan `berkasPendaftar` pada backend
 * (handler_pendaftar.go). Akta Kelahiran dan Rapor sempat tertulis opsional
 * di halaman Info PPDB padahal backend mewajibkan keduanya, jadi halaman itu
 * menjanjikan yang tidak benar: pendaftar membaca "opsional", lalu
 * formulirnya menolak kirimannya. Lima wajib, satu opsional.
 *
 * Ditaruh di sini, bukan di dalam halaman yang menampilkannya, karena dua
 * tempat memakainya: tabel pada halaman Info PPDB dan kotak "Tanya cepat".
 * Selama daftarnya hanya ada di dalam satu halaman, tempat kedua terpaksa
 * menyalinnya — dan salinan itulah yang nanti tertinggal saat sekolah
 * mengubah syaratnya.
 */

export interface Dokumen {
  nama: string;
  wajib: boolean;
  tipe: string;
  catatan?: string;
}

export const DOKUMEN: Dokumen[] = [
  { nama: "Foto 3x4", wajib: true, tipe: "JPG atau PNG" },
  {
    nama: "Ijazah atau Surat Keterangan Lulus",
    wajib: true,
    tipe: "JPG, PNG, atau PDF",
  },
  { nama: "Kartu Keluarga", wajib: true, tipe: "JPG, PNG, atau PDF" },
  { nama: "Akta Kelahiran", wajib: true, tipe: "JPG, PNG, atau PDF" },
  { nama: "Rapor semester terakhir", wajib: true, tipe: "JPG, PNG, atau PDF" },
  {
    nama: "Sertifikat prestasi",
    wajib: false,
    tipe: "JPG, PNG, atau PDF",
    catatan: "Wajib bila mendaftar lewat jalur Prestasi.",
  },
];

import { tanggalPanjang } from "@/lib/format";
import type { KeadaanPpdb, Pengaturan } from "@/lib/tipe";

/**
 * Kalimat dan lencana untuk keadaan PPDB.
 *
 * Yang tertutup ada TIGA macam, dan maknanya berbeda-beda. Sebelumnya
 * ketiganya memakai satu kalimat, "Segera Dibuka, mulai {ppdb_mulai}", dan
 * itu menjanjikan tanggal yang sudah berlalu pada dua di antaranya:
 * pendaftaran yang ditutup panitia, dan pendaftaran yang tanggalnya sudah
 * lewat. Kalimat itu bahkan tampil bersebelahan dengan judul "Pendaftaran
 * Belum Dibuka" pada halaman yang sama.
 *
 * Dipusatkan di berkas ini karena kalimatnya dipakai di empat tempat: bilah
 * berjalan, lencana beranda, kartu ajakan di beranda, dan halaman Info PPDB.
 * Empat tempat yang menuliskannya sendiri-sendiri adalah empat tempat yang
 * akan saling menyimpang.
 */
export interface KataKeadaanPpdb {
  /** Tulisan pendek untuk lencana. */
  lencana: string;
  /** Satu kalimat utuh, siap dipakai apa adanya. */
  kalimat: string;
  /** Untuk memilih warna lencana dan tujuan tombolnya. */
  dibuka: boolean;
}

export function kataKeadaanPpdb(
  ppdb: KeadaanPpdb,
  p: Pengaturan,
): KataKeadaanPpdb {
  const tahun = p.ppdb_tahun ? ` tahun ajaran ${p.ppdb_tahun}` : "";

  // `keadaan` baru ada sejak backend memecah keadaan tertutup menjadi tiga.
  // Bila jawaban API-nya lebih tua, yang dipakai boolean `dibuka` seperti
  // sebelumnya; itu sebabnya nilainya boleh kosong.
  const keadaan = ppdb.keadaan ?? (ppdb.dibuka ? "dibuka" : "belum_mulai");

  switch (keadaan) {
    case "dibuka":
      return {
        lencana: "Pendaftaran Dibuka",
        kalimat: p.ppdb_selesai
          ? `Pendaftaran peserta didik baru${tahun} sedang dibuka sampai ${tanggalPanjang(p.ppdb_selesai)}.`
          : `Pendaftaran peserta didik baru${tahun} sedang dibuka.`,
        dibuka: true,
      };

    case "sudah_selesai":
      return {
        lencana: "Pendaftaran Ditutup",
        kalimat: p.ppdb_selesai
          ? `Pendaftaran peserta didik baru${tahun} sudah ditutup pada ${tanggalPanjang(p.ppdb_selesai)}.`
          : `Pendaftaran peserta didik baru${tahun} sudah ditutup.`,
        dibuka: false,
      };

    case "ditutup":
      // TIDAK menyebut tanggal sama sekali. Pendaftaran yang ditutup panitia
      // di tengah masa pendaftaran tidak punya tanggal yang dapat dijanjikan,
      // dan menyebut tanggal mulai yang sudah lewat justru menyesatkan.
      return {
        lencana: "Pendaftaran Ditutup",
        kalimat: `Pendaftaran peserta didik baru${tahun} sedang tidak dibuka. Perhatikan pengumuman sekolah untuk jadwal berikutnya.`,
        dibuka: false,
      };

    default:
      return {
        lencana: "Segera Dibuka",
        kalimat: p.ppdb_mulai
          ? `Pendaftaran peserta didik baru${tahun} dibuka mulai ${tanggalPanjang(p.ppdb_mulai)}${
              p.ppdb_selesai ? ` sampai ${tanggalPanjang(p.ppdb_selesai)}` : ""
            }.`
          : `Jadwal pendaftaran peserta didik baru${tahun} akan diumumkan sekolah lewat halaman berita.`,
        dibuka: false,
      };
  }
}

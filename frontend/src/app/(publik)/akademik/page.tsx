import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { PetaAnak } from "@/komponen/Halaman";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Akademik",
  description:
    "Kurikulum, jadwal pelajaran, kalender akademik, e-learning, dan perpustakaan digital sekolah.",
};

export default function HalamanAkademik() {
  return (
    <>
      <KepalaHalaman
        judul="Akademik"
        keterangan="Segala yang berkaitan dengan kegiatan belajar: kurikulum yang dipakai, jadwal, tanggal penting, dan layanan penunjangnya."
      />
      <div className="wadah py-14">
        <JudulBagian
          atas="Akademik"
          judul="Halaman di dalam menu ini"
          keterangan="Dua di antaranya berupa pintu masuk ke layanan yang sudah dipakai sekolah, jadi tidak ada data yang perlu dicatat dua kali."
        />
        <PetaAnak induk="/akademik" />
      </div>
    </>
  );
}

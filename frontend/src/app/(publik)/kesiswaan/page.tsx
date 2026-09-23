import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { PetaAnak } from "@/komponen/Halaman";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kesiswaan",
  description:
    "Ekstrakurikuler, OSIS, prestasi siswa, dan pendidikan karakter di sekolah.",
};

export default function HalamanKesiswaan() {
  return (
    <>
      <KepalaHalaman
        judul="Kesiswaan"
        keterangan="Kegiatan siswa di luar jam pelajaran, organisasi siswa, capaian yang diraih, dan pembinaan karakternya."
      />
      <div className="wadah py-14">
        <JudulBagian
          atas="Kesiswaan"
          judul="Halaman di dalam menu ini"
          keterangan="Halaman Prestasi Siswa mengambil dari berita berkategori Prestasi, jadi capaian yang sudah pernah diberitakan langsung ikut tampil."
        />
        <PetaAnak induk="/kesiswaan" />
      </div>
    </>
  );
}

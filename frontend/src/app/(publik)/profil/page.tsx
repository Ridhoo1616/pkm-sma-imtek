import { muatProfil } from "@/lib/profil";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { PetaAnak } from "@/komponen/Halaman";
import { Sambutan } from "@/komponen/Sambutan";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Sekolah",
  description:
    "Sambutan kepala sekolah beserta pengantar ke sejarah, data sekolah, visi dan misi, sarana, struktur organisasi, dan tenaga pendidik.",
};

/**
 * Halaman pengantar kelompok Profil Sekolah.
 *
 * Isi rinciannya dipindahkan ke halaman turunan, satu topik satu halaman,
 * mengikuti susunan menu bertingkat. Yang tinggal di sini hanya sambutan
 * kepala sekolah, karena sambutan adalah bagian yang memang pantas menyambut
 * pengunjung lebih dulu.
 */
export default async function HalamanProfil() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  return (
    <>
      <KepalaHalaman
        judul="Profil Sekolah"
        keterangan={`Mengenal ${
          p.nama_sekolah || "sekolah"
        } lebih dekat: riwayat, arah, orang-orang, dan sarana yang dimilikinya.`}
      />

      <div className="wadah py-14">
        <MunculNaik>
          <Sambutan pengaturan={p} />
        </MunculNaik>

        <section className="mt-14">
          <JudulBagian
            atas="Profil Sekolah"
            judul="Halaman di dalam menu ini"
            keterangan="Setiap bagian dibuat terpisah supaya mudah dicari dan mudah diperbarui panitia."
          />
          <PetaAnak induk="/profil" />
        </section>
      </div>
    </>
  );
}

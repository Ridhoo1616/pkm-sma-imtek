import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu, Naskah, PetaAnak, PotretKepsek } from "@/komponen/Halaman";
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
          <section>
            <JudulBagian atas="Sambutan" judul="Kata Kepala Sekolah" />
            <div className="grid gap-8 lg:grid-cols-[18rem_1fr] lg:gap-10">
              <div className="mx-auto w-full max-w-[18rem] lg:mx-0">
                <PotretKepsek foto={p.foto_kepsek} nama={p.kepala_sekolah} />
              </div>
              <div className="min-w-0">
                {belumTerisi(p.sambutan_kepsek) ? (
                  <Menunggu apa="Naskah sambutan kepala sekolah" />
                ) : (
                  <div className="kartu h-full p-6">
                    <Naskah isi={p.sambutan_kepsek} />
                    {!belumTerisi(p.kepala_sekolah) && (
                      <p className="mt-5 border-t border-garis pt-4 text-sm">
                        <span className="font-semibold text-biru-tua">
                          {p.kepala_sekolah}
                        </span>
                        <span className="block text-samar">Kepala Sekolah</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
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

import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu, Naskah } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sejarah Sekolah",
  description: "Riwayat berdirinya sekolah sampai keadaannya sekarang.",
};

export default async function HalamanSejarah() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  return (
    <>
      <KepalaHalaman
        judul="Sejarah Sekolah"
        keterangan="Riwayat singkat berdirinya sekolah, perkembangannya, dan keadaannya sekarang."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/sejarah" />
        <MunculNaik>
          <div className="mt-8 max-w-3xl">
            {belumTerisi(p.sejarah) ? (
              <Menunggu apa="Naskah sejarah sekolah" />
            ) : (
              <div className="kartu p-6 md:p-8">
                <Naskah isi={p.sejarah} />
              </div>
            )}
          </div>
        </MunculNaik>
      </div>
    </>
  );
}

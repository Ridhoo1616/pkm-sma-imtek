import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu, Naskah, TautanKeluar } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jadwal Pelajaran",
  description: "Jadwal pelajaran yang berlaku pada semester ini.",
};

export default async function HalamanJadwal() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;
  const tautan = (p.tautan_jadwal ?? "").trim();
  const adaTautan = tautan !== "" && !belumTerisi(tautan);
  const adaKeterangan = !belumTerisi(p.jadwal_keterangan ?? "");

  return (
    <>
      <KepalaHalaman
        judul="Jadwal Pelajaran"
        keterangan="Jadwal yang berlaku pada semester ini, beserta siapa yang dapat dihubungi bila ada perubahan."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/akademik" jalur="/akademik/jadwal" />

        <MunculNaik>
          {/* Jam sekolah dan seragam butuh lebar penuh untuk kartu per hari;
              tautan dan penanda jadwal tetap di kolom sempit. */}
          {adaKeterangan && (
            <div className="kartu mt-8 p-6 md:p-8">
              <Naskah isi={p.jadwal_keterangan} />
            </div>
          )}
          <div className="mt-6 max-w-2xl space-y-6">
            {adaTautan ? (
              <TautanKeluar
                tautan={tautan}
                label="Buka jadwal pelajaran"
                keterangan="Jadwal pelajaran disimpan sebagai berkas terpisah supaya sekolah dapat menggantinya tanpa mengubah halaman ini."
              />
            ) : (
              <Menunggu apa="Jadwal pelajaran" />
            )}
          </div>
        </MunculNaik>
      </div>
    </>
  );
}

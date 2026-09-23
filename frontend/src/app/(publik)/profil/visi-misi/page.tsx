import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visi & Misi",
  description: "Arah yang dituju sekolah beserta langkah-langkah mencapainya.",
};

export default async function HalamanVisiMisi() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  // Misi ditulis satu baris per poin pada pengaturan. Penomoran bawaan yang
  // mungkin ikut diketik panitia dibuang, supaya tidak menjadi "1. 1.".
  const misi = (p.misi || "")
    .split("\n")
    .map((m) => m.trim().replace(/^[-•*\d.)\s]+/, ""))
    .filter(Boolean);

  return (
    <>
      <KepalaHalaman
        judul="Visi & Misi"
        keterangan="Visi adalah keadaan yang dituju sekolah; misi adalah langkah yang dikerjakan untuk mencapainya."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/visi-misi" />

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <MunculNaik>
            <section>
              <JudulBagian atas="Arah" judul="Visi" />
              {belumTerisi(p.visi) ? (
                <Menunggu apa="Rumusan visi" />
              ) : (
                <div className="kartu border-l-4 border-l-emas p-6">
                  <p className="text-lg leading-relaxed font-semibold text-biru-tua">
                    {p.visi}
                  </p>
                </div>
              )}
            </section>
          </MunculNaik>

          <MunculNaik jeda={0.08}>
            <section>
              <JudulBagian atas="Langkah" judul="Misi" />
              {misi.length === 0 || belumTerisi(p.misi) ? (
                <Menunggu apa="Rumusan misi" />
              ) : (
                <ol className="kartu divide-y divide-garis">
                  {misi.map((m, i) => (
                    <li key={i} className="flex gap-3 px-6 py-4">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-biru-muda text-xs font-bold text-biru tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-[15px] leading-relaxed text-teks">{m}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </MunculNaik>
        </div>
      </div>
    </>
  );
}

import { api, urlUnggahan } from "@/lib/api";
import { KepalaHalaman, GambarKosong } from "@/komponen/Bagian";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import type { Metadata } from "next";
import type { Fasilitas } from "@/lib/tipe";
import { IkonFasilitas } from "@/komponen/Ikon";

export const metadata: Metadata = {
  title: "Fasilitas Sekolah",
  description: "Sarana dan prasarana yang menunjang kegiatan belajar.",
};

export default async function HalamanFasilitas() {
  const fasilitas = await api
    .fasilitas()
    .then((h) => h.data)
    .catch((): Fasilitas[] => []);

  return (
    <>
      <KepalaHalaman
        judul="Fasilitas Sekolah"
        keterangan="Sarana yang tersedia untuk menunjang kegiatan belajar, praktik, ibadah, dan olahraga sehari-hari."
      />

      <div className="wadah py-14">
        {fasilitas.length === 0 ? (
          <TanpaData
            judul="Data fasilitas belum tersedia"
            keterangan="Daftar fasilitas dapat ditambahkan lewat menu Fasilitas di panel admin."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fasilitas.map((f, i) => (
              <MunculNaik key={f.id} jeda={(i % 3) * 0.08}>
                <KartuGerak className="kartu h-full overflow-hidden">
                  {f.gambar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urlUnggahan("fasilitas", f.gambar)}
                      alt={f.nama}
                      className="h-48 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <GambarKosong label={f.nama} />
                  )}
                  <div className="p-5">
                    <h2 className="flex items-center gap-2 text-base">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-biru-muda text-biru">
                        <IkonFasilitas nama={f.ikon} ukuran={18} />
                      </span>
                      {f.nama}
                    </h2>
                    {f.deskripsi && (
                      <p className="mt-2 text-sm leading-relaxed text-samar">
                        {f.deskripsi}
                      </p>
                    )}
                  </div>
                </KartuGerak>
              </MunculNaik>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

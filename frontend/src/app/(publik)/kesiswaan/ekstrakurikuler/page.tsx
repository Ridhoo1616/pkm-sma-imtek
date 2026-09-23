import { api, urlUnggahan } from "@/lib/api";
import { KepalaHalaman, JudulBagian, GambarKosong } from "@/komponen/Bagian";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { KegiatanSiswa } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ekstrakurikuler",
  description:
    "Pilihan kegiatan ekstrakurikuler sekolah beserta pembina dan jadwal latihannya.",
};

const KETERANGAN: Record<string, string> = {
  Ekstrakurikuler: "Kegiatan pilihan di luar jam pelajaran.",
  OSIS: "Kegiatan yang dijalankan pengurus OSIS.",
  Pembinaan: "Kegiatan pembinaan yang diikuti seluruh siswa.",
};

export default async function HalamanEkstrakurikuler() {
  const hasil = await api
    .kegiatanSiswa()
    .catch((): { data: KegiatanSiswa[]; jenis: string[] } => ({
      data: [],
      jenis: [],
    }));

  const kelompok = hasil.jenis
    .map((j) => ({ nama: j, isi: hasil.data.filter((k) => k.jenis === j) }))
    .filter((g) => g.isi.length > 0);

  return (
    <>
      <KepalaHalaman
        judul="Ekstrakurikuler"
        keterangan="Kegiatan yang dapat dipilih siswa sesuai minatnya, beserta pembina dan jadwal latihannya."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/kesiswaan" jalur="/kesiswaan/ekstrakurikuler" />

        {kelompok.length === 0 ? (
          <div className="mt-8">
            <TanpaData
              judul="Daftar kegiatan belum diisi"
              keterangan="Kegiatan ditambahkan lewat menu Kegiatan Siswa di panel admin, beserta nama pembina dan jadwalnya."
            />
          </div>
        ) : (
          <div className="mt-8 space-y-14">
            {kelompok.map((g) => (
              <section key={g.nama}>
                <JudulBagian
                  atas={`${g.isi.length} kegiatan`}
                  judul={g.nama}
                  keterangan={KETERANGAN[g.nama]}
                />
                <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {g.isi.map((k, i) => (
                    <MunculNaik key={k.id} jeda={(i % 3) * 0.08}>
                      <KartuGerak className="kartu h-full overflow-hidden">
                        {k.gambar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={urlUnggahan("kegiatan", k.gambar)}
                            alt={k.nama}
                            className="h-44 w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <GambarKosong label={k.nama} tinggi="h-44" />
                        )}
                        <div className="p-5">
                          <h3 className="text-base">{k.nama}</h3>
                          {k.deskripsi && (
                            <p className="mt-2 text-sm leading-relaxed text-samar">
                              {k.deskripsi}
                            </p>
                          )}
                          {(k.pembina || k.jadwal) && (
                            <dl className="mt-4 space-y-1.5 border-t border-garis pt-3 text-sm">
                              {k.pembina && (
                                <div className="flex gap-2">
                                  <dt className="shrink-0 text-samar">Pembina</dt>
                                  <dd className="font-medium text-teks">
                                    {k.pembina}
                                  </dd>
                                </div>
                              )}
                              {k.jadwal && (
                                <div className="flex gap-2">
                                  <dt className="shrink-0 text-samar">Jadwal</dt>
                                  <dd className="font-medium text-teks">
                                    {k.jadwal}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          )}
                        </div>
                      </KartuGerak>
                    </MunculNaik>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

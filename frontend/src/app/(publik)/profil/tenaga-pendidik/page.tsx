import { api, urlUnggahan } from "@/lib/api";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Tenaga } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tenaga Pendidik dan Kependidikan",
  description:
    "Guru dan tenaga kependidikan sekolah beserta jabatan dan bidang yang diampu.",
};

/** Keterangan tiap kelompok, supaya pembaca tahu bedanya. */
const KETERANGAN: Record<string, string> = {
  Pimpinan: "Kepala sekolah beserta wakil dan koordinator bidang.",
  Pendidik: "Guru mata pelajaran dan guru bimbingan konseling.",
  Kependidikan:
    "Tenaga administrasi, perpustakaan, laboratorium, dan penunjang lainnya.",
};

export default async function HalamanTenaga() {
  const hasil = await api
    .tenaga()
    .catch((): { data: Tenaga[]; kategori: string[] } => ({
      data: [],
      kategori: ["Pimpinan", "Pendidik", "Kependidikan"],
    }));

  const kelompok = hasil.kategori
    .map((k) => ({ nama: k, orang: hasil.data.filter((t) => t.kategori === k) }))
    .filter((g) => g.orang.length > 0);

  return (
    <>
      <KepalaHalaman
        judul="Tenaga Pendidik dan Kependidikan"
        keterangan="Guru dan tenaga kependidikan yang bertugas di sekolah pada tahun pelajaran ini."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/tenaga-pendidik" />

        {kelompok.length === 0 ? (
          <div className="mt-8">
            <TanpaData
              judul="Data tenaga pendidik belum tersedia"
              keterangan="Daftarnya diisi lewat menu Tenaga Pendidik di panel admin. Nama, jabatan, dan mata pelajaran hanya boleh berasal dari data sekolah."
            />
          </div>
        ) : (
          <div className="mt-8 space-y-14">
            {kelompok.map((g) => (
              <section key={g.nama}>
                <JudulBagian
                  atas={`${g.orang.length} orang`}
                  judul={g.nama}
                  keterangan={KETERANGAN[g.nama]}
                />
                <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {g.orang.map((t, i) => (
                    <MunculNaik key={t.id} jeda={(i % 4) * 0.06}>
                      <KartuGerak className="kartu h-full overflow-hidden">
                        {t.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={urlUnggahan("profil", t.foto)}
                            alt={`Foto ${t.nama}`}
                            className="aspect-[3/4] w-full bg-biru-muda object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div
                            className="grid aspect-[3/4] w-full place-items-center bg-biru-muda"
                            aria-hidden
                          >
                            {/* Inisial dipakai sebagai pengganti foto, bukan
                                kotak kosong, supaya kartunya tetap terbaca. */}
                            <span className="text-3xl font-bold text-biru/45">
                              {t.nama
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((k) => k.charAt(0))
                                .join("")
                                .toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="p-4">
                          <p className="text-[15px] leading-snug font-bold text-biru-tua">
                            {t.nama}
                          </p>
                          {t.jabatan && (
                            <p className="mt-1 text-sm text-biru">{t.jabatan}</p>
                          )}
                          {t.mata_pelajaran && (
                            <p className="mt-1 text-sm leading-relaxed text-samar">
                              {t.mata_pelajaran}
                            </p>
                          )}
                          {t.nip && (
                            <p className="mt-2 text-xs text-samar tabular-nums">
                              NIP {t.nip}
                            </p>
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

import { api, urlUnggahan } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu, Naskah } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Tenaga } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Struktur Organisasi",
  description: "Susunan pimpinan sekolah dan pembagian tugasnya.",
};

export default async function HalamanStruktur() {
  const [{ profil }, tenaga] = await Promise.all([
    muatProfil(),
    api
      .tenaga()
      .then((h) => h.data)
      .catch((): Tenaga[] => []),
  ]);
  const p = profil.pengaturan;
  const bagan = p.struktur_organisasi ?? "";
  const pimpinan = tenaga.filter((t) => t.kategori === "Pimpinan");

  return (
    <>
      <KepalaHalaman
        judul="Struktur Organisasi"
        keterangan="Susunan pimpinan sekolah beserta pembagian tugas yang berlaku pada tahun pelajaran ini."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/struktur-organisasi" />

        <div className="mt-8 space-y-14">
          <MunculNaik>
            <section>
              <JudulBagian atas="Bagan" judul="Bagan Struktur Organisasi" />
              {bagan && !belumTerisi(bagan) ? (
                <figure className="kartu overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlUnggahan("profil", bagan)}
                    alt="Bagan struktur organisasi sekolah"
                    className="w-full bg-white object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  {!belumTerisi(p.struktur_keterangan ?? "") && (
                    <figcaption className="border-t border-garis px-6 py-4 text-sm leading-relaxed text-samar">
                      {p.struktur_keterangan}
                    </figcaption>
                  )}
                </figure>
              ) : (
                <>
                  {/* Kerangka berukuran sama tetap ditampilkan, supaya tata
                      letak halaman sudah final sebelum bagannya diunggah. */}
                  <div className="kartu grid aspect-[4/3] w-full max-w-3xl place-items-center border-dashed bg-biru-muda/50 px-6 text-center">
                    <div>
                      <p className="text-sm font-semibold text-biru-tua">
                        Tempat bagan struktur organisasi
                      </p>
                      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-biru/70">
                        Gambar mendatar, perbandingan sisi 4:3, paling tidak
                        1200 piksel lebarnya. Diunggah lewat menu Pengaturan di
                        panel admin.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 max-w-3xl">
                    <Menunggu apa="Bagan struktur organisasi" />
                  </div>
                </>
              )}

              {!belumTerisi(p.struktur_keterangan ?? "") &&
                (!bagan || belumTerisi(bagan)) && (
                  <div className="kartu mt-6 max-w-3xl p-6">
                    <Naskah isi={p.struktur_keterangan} />
                  </div>
                )}
            </section>
          </MunculNaik>

          {pimpinan.length > 0 && (
            <MunculNaik>
              <section>
                <JudulBagian
                  atas="Pimpinan"
                  judul="Unsur Pimpinan Sekolah"
                  keterangan="Diambil dari data tenaga pendidik berkategori Pimpinan, jadi cukup diperbarui di satu tempat."
                />
                <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {pimpinan.map((t) => (
                    <div key={t.id} className="kartu flex h-full flex-col p-5">
                      <p className="font-bold text-biru-tua">{t.nama}</p>
                      {t.jabatan && (
                        <p className="mt-1 text-sm text-biru">{t.jabatan}</p>
                      )}
                      {t.nip && (
                        <p className="mt-2 text-xs text-samar tabular-nums">
                          NIP {t.nip}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </MunculNaik>
          )}
        </div>
      </div>
    </>
  );
}

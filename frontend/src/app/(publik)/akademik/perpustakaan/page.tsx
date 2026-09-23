import { api, urlUnggahan } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import { Naskah } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Pustaka } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perpustakaan Digital",
  description: "Katalog koleksi digital yang dapat dibaca siswa.",
};

/**
 * Katalog, bukan tempat penyimpanan.
 *
 * Satu koleksi boleh berupa berkas yang diunggah sekolah, boleh juga berupa
 * tautan ke koleksi yang sudah ada di tempat lain. Banyak bahan bacaan
 * sekolah sebenarnya berada di portal Kemendikbud atau di penyimpanan awan
 * sekolah sendiri, dan menyalinnya ke sini hanya menggandakan pekerjaan.
 */
export default async function HalamanPerpustakaan() {
  const [hasil, { profil }] = await Promise.all([
    api.pustaka().catch((): { data: Pustaka[]; kategori: string[] } => ({
      data: [],
      kategori: [],
    })),
    muatProfil(),
  ]);
  const pengantar = profil.pengaturan.perpustakaan_keterangan ?? "";

  const kelompok = hasil.kategori.map((k) => ({
    nama: k,
    koleksi: hasil.data.filter((p) => p.kategori === k),
  }));

  return (
    <>
      <KepalaHalaman
        judul="Perpustakaan Digital"
        keterangan="Koleksi bacaan yang dapat dibuka siswa dari mana saja, baik berkas milik sekolah maupun koleksi di layanan lain."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/akademik" jalur="/akademik/perpustakaan" />

        {!belumTerisi(pengantar) && (
          <MunculNaik>
            <div className="kartu mt-8 max-w-3xl p-6">
              <Naskah isi={pengantar} />
            </div>
          </MunculNaik>
        )}

        {hasil.data.length === 0 ? (
          <div className="mt-8">
            <TanpaData
              judul="Koleksi belum diisi"
              keterangan="Koleksi ditambahkan lewat menu Perpustakaan di panel admin. Setiap koleksi memerlukan tautan atau berkas, supaya tidak ada judul yang tidak bisa dibuka."
            />
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {kelompok.map((g) => (
              <section key={g.nama}>
                <JudulBagian
                  atas={`${g.koleksi.length} koleksi`}
                  judul={g.nama}
                />
                <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.koleksi.map((p, i) => {
                    const tujuan = p.berkas
                      ? urlUnggahan("pustaka", p.berkas)
                      : p.tautan;
                    return (
                      <MunculNaik key={p.id} jeda={(i % 3) * 0.06}>
                        <KartuGerak className="kartu h-full">
                          <div className="flex h-full flex-col p-5">
                            <h3 className="text-base leading-snug">{p.judul}</h3>
                            <p className="mt-1.5 text-sm text-samar">
                              {[p.penulis, p.tahun ? String(p.tahun) : ""]
                                .filter(Boolean)
                                .join(" · ") || "Penulis tidak dicantumkan"}
                            </p>
                            {p.keterangan && (
                              <p className="mt-3 flex-1 text-sm leading-relaxed text-samar">
                                {p.keterangan}
                              </p>
                            )}
                            <a
                              href={tujuan}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 inline-block text-sm font-semibold text-biru hover:text-biru-tua"
                            >
                              {p.berkas ? "Buka berkas" : "Buka di layanan lain"}{" "}
                              →
                            </a>
                          </div>
                        </KartuGerak>
                      </MunculNaik>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

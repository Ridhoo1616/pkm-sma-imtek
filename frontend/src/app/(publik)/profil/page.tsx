import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Sekolah",
  description:
    "Visi, misi, sejarah, dan identitas sekolah beserta data pokok pendidikan.",
};

/** Data yang belum dikonfirmasi sekolah ditandai, tidak dikarang sendiri. */
function Menunggu({ apa }: { apa: string }) {
  return (
    <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {apa} belum tersedia. Bagian ini akan terisi setelah pihak sekolah
      mengirimkan naskahnya, dan dapat diisi sendiri lewat menu Pengaturan di
      panel admin.
    </p>
  );
}

export default async function HalamanProfil() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  // Misi ditulis satu baris per poin pada pengaturan.
  const misi = (p.misi || "")
    .split("\n")
    .map((m) => m.trim().replace(/^[-•*\d.)\s]+/, ""))
    .filter(Boolean);

  const identitas = [
    { k: "Nama sekolah", v: p.nama_sekolah },
    { k: "NPSN", v: p.npsn },
    { k: "Status", v: p.status_sekolah },
    { k: "Akreditasi", v: p.akreditasi },
    { k: "Yayasan penyelenggara", v: p.yayasan },
    { k: "Kepala sekolah", v: p.kepala_sekolah },
    { k: "Alamat", v: p.alamat },
    { k: "Kelurahan/Desa", v: p.kelurahan },
    { k: "Kecamatan", v: p.kecamatan },
    { k: "Kabupaten/Kota", v: p.kota },
    { k: "Provinsi", v: p.provinsi },
    { k: "Kode pos", v: p.kode_pos },
    { k: "Telepon", v: p.telepon },
    { k: "Surel", v: p.email },
    { k: "Jam layanan", v: p.jam_layanan },
  ];

  return (
    <>
      <KepalaHalaman
        judul="Profil Sekolah"
        keterangan={`Identitas, visi, misi, dan riwayat singkat ${
          p.nama_sekolah || "sekolah"
        }.`}
      />

      <div className="wadah grid gap-12 py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div className="space-y-12">
          {/* Sambutan */}
          <MunculNaik>
            <section>
              <JudulBagian atas="Sambutan" judul="Kata Kepala Sekolah" />
              {belumTerisi(p.sambutan_kepsek) ? (
                <Menunggu apa="Naskah sambutan kepala sekolah" />
              ) : (
                <div className="kartu p-6">
                  <p className="naskah text-[15px] whitespace-pre-line text-teks">
                    {p.sambutan_kepsek}
                  </p>
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
            </section>
          </MunculNaik>

          {/* Visi & misi */}
          <MunculNaik>
            <section>
              <JudulBagian atas="Arah Sekolah" judul="Visi dan Misi" />
              <div className="space-y-5">
                <div className="kartu p-6">
                  <h3 className="mb-2 text-base">Visi</h3>
                  {belumTerisi(p.visi) ? (
                    <Menunggu apa="Rumusan visi" />
                  ) : (
                    <p className="text-[15px] leading-relaxed text-teks">{p.visi}</p>
                  )}
                </div>
                <div className="kartu p-6">
                  <h3 className="mb-3 text-base">Misi</h3>
                  {misi.length === 0 || belumTerisi(p.misi) ? (
                    <Menunggu apa="Rumusan misi" />
                  ) : (
                    <ol className="space-y-2.5">
                      {misi.map((m, i) => (
                        <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-biru-muda text-xs font-bold text-biru tabular-nums">
                            {i + 1}
                          </span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </section>
          </MunculNaik>

          {/* Sejarah */}
          <MunculNaik>
            <section>
              <JudulBagian atas="Riwayat" judul="Sejarah Singkat" />
              {belumTerisi(p.sejarah) ? (
                <Menunggu apa="Naskah sejarah sekolah" />
              ) : (
                <div className="kartu p-6">
                  <div className="naskah text-[15px] whitespace-pre-line text-teks">
                    {p.sejarah}
                  </div>
                </div>
              )}
            </section>
          </MunculNaik>
        </div>

        {/* Data pokok */}
        <MunculNaik>
          <aside className="lg:sticky lg:top-28">
            <div className="kartu overflow-hidden">
              <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                Data Pokok Sekolah
              </h2>
              <dl className="divide-y divide-garis text-sm">
                {identitas.map(
                  (b) =>
                    b.v &&
                    !belumTerisi(b.v) && (
                      <div key={b.k} className="px-6 py-3">
                        <dt className="text-xs font-semibold tracking-wide text-samar uppercase">
                          {b.k}
                        </dt>
                        <dd className="mt-0.5 text-teks">{b.v}</dd>
                      </div>
                    ),
                )}
              </dl>
            </div>

            {p.peta_embed && !belumTerisi(p.peta_embed) && (
              <div className="kartu mt-6 overflow-hidden">
                <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                  Lokasi
                </h2>
                <div
                  className="aspect-video w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
                  // Nilai ini hanya dapat diubah oleh admin sekolah lewat
                  // menu Pengaturan, dan isinya memang berupa sematan peta.
                  dangerouslySetInnerHTML={{ __html: p.peta_embed }}
                />
              </div>
            )}
          </aside>
        </MunculNaik>
      </div>
    </>
  );
}

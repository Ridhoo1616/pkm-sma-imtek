import { api, urlUnggahan } from "@/lib/api";
import {
  bagianNaskah,
  belumTerisi,
  kalimatPertama,
  kePoinTerisi,
} from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu, Naskah } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import { IkonNaskah, IkonPanahKanan } from "@/komponen/Ikon";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Halaman } from "@/lib/tipe";
import type { Metadata } from "next";

/**
 * Satu berkas untuk seluruh halaman bernaskah panjang: Kurikulum, OSIS,
 * Pendidikan Karakter, dan halaman lain yang ditambahkan sekolah kemudian.
 *
 * Dibuat dinamis supaya sekolah dapat menambah halaman profil baru dari
 * panel admin tanpa menunggu kodenya diubah lebih dulu.
 */

/** Kelompok menu menentukan jejak lokasi yang dipasang di atas halaman. */
const INDUK: Record<string, string> = {
  Profil: "/profil",
  Akademik: "/akademik",
  Kesiswaan: "/kesiswaan",
};

/**
 * Ilustrasi kartu pembuka, per halaman.
 *
 * Ditulis sebagai daftar, bukan ditebak dari nama slug-nya, supaya halaman
 * baru yang ditambahkan sekolah TIDAK menunjuk gambar yang tidak ada dan
 * berakhir sebagai kotak rusak. Halaman yang belum punya ilustrasi tampil
 * dengan kartu pembuka tanpa gambar, dan itu keadaan yang wajar.
 *
 * Berbeda dengan ilustrasi Visi & Misi, Tenaga Pendidik, dan Kalender yang
 * berupa PNG tembus pandang, gambar ini JPEG berlatar. Latarnya — langit
 * bergradasi, gedung sekolah, pepohonan — bagian dari gambarnya, bukan bidang
 * putih yang perlu dibuang: membuangnya dengan perambatan dari tepi akan
 * merusaknya, dan mengurangi warnanya ke 64 akan membuat langitnya
 * bergaris-garis. Karena tidak ada bagian tembus pandang yang perlu dijaga,
 * JPEG jauh lebih kecil untuk gambar bergradasi seperti ini: 1,6 MB menjadi
 * 98 KB pada 1400x517.
 */
const ILUSTRASI: Record<string, { berkas: string; alt: string }> = {
  osis: {
    berkas: "/ilustrasi/halaman/osis.jpg",
    alt: "Ilustrasi empat siswa berseragam putih berbincang di halaman sekolah",
  },
  "pendidikan-karakter": {
    berkas: "/ilustrasi/halaman/pendidikan-karakter.jpg",
    alt: "Ilustrasi empat siswa berseragam putih membawa buku di halaman sekolah",
  },
};

async function ambil(slug: string): Promise<Halaman | null> {
  try {
    return (await api.halamanDetail(slug)).data;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  props: PageProps<"/halaman/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const h = await ambil(slug);
  if (!h) return { title: "Halaman tidak ditemukan" };
  return {
    title: h.judul,
    // Ringkasan bertanda kurung siku berarti naskahnya belum dikirim
    // sekolah, dan tidak pantas dipakai sebagai keterangan di hasil pencarian.
    description: belumTerisi(h.ringkasan) ? undefined : h.ringkasan,
  };
}

export default async function HalamanNaskah(
  props: PageProps<"/halaman/[slug]">,
) {
  const { slug } = await props.params;
  const h = await ambil(slug);
  if (!h) notFound();

  const adaRingkasan = !belumTerisi(h.ringkasan);
  const adaNaskah = !belumTerisi(h.isi);
  const gambar = ILUSTRASI[h.slug];

  // Daftar isi diambil dari judul bagian di dalam naskahnya sendiri, bukan
  // dari daftar tautan yang ditulis di sini. Dengan begitu tidak pernah ada
  // kartu yang menuju bagian yang belum ditulis sekolah, dan begitu sekolah
  // menambah satu bagian, kartunya muncul sendiri.
  const { bagian } = bagianNaskah(adaNaskah ? h.isi : "");

  // Visi dan misi MILIK HALAMAN INI — misalnya visi misi OSIS — bukan milik
  // sekolah. Bagiannya ditampilkan begitu salah satu kolomnya berisi, termasuk
  // ketika isinya masih penanda [kurung siku]: penandanya memang dipasang
  // supaya panitia melihat bagian itu ada dan tahu bentuk isinya, sedangkan
  // pengunjung melihat keterangan "belum tersedia", bukan kalimat karangan.
  // Halaman yang kolomnya kosong sama sekali tidak menampilkan bagian ini.
  const adaBagianVisiMisi = h.visi.trim() !== "" || h.misi.trim() !== "";
  const misi = kePoinTerisi(h.misi);

  return (
    <>
      <KepalaHalaman
        judul={h.judul}
        keterangan={adaRingkasan ? h.ringkasan : undefined}
      />
      <div className="wadah py-14">
        {INDUK[h.kelompok] && (
          <JejakMenu induk={INDUK[h.kelompok]} jalur={`/halaman/${h.slug}`} />
        )}

        {/* Kartu pembuka. Ilustrasinya ditempatkan MUTLAK di separuh kanan
            dengan tepi kirinya dipudarkan lewat mask, bukan diletakkan sebagai
            kolom di samping naskah seperti pada halaman Tenaga Pendidik dan
            Kalender. Sebabnya gambar ini berlatar penuh: sebagai kolom, tepi
            kirinya akan berupa garis tegak tempat langit berhenti mendadak,
            dan itu terbaca sebagai gambar yang ditempelkan. Dipudarkan, ia
            menyatu dengan gradasi kartunya.

            Di layar sempit gambarnya TIDAK ditumpuk di belakang naskah —
            naskah di atas gambar berlatar ramai sulit dibaca — melainkan turun
            menjadi pita di dasar kartu. */}
        <MunculNaik>
          <section
            aria-labelledby="judul-pembuka-halaman"
            className="relative mt-8 overflow-hidden rounded-kartu border border-garis bg-gradient-to-br from-biru-muda via-biru-muda to-white shadow-lembut"
          >
            {gambar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gambar.berkas}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-center sm:block [mask-image:linear-gradient(to_right,transparent,#000_42%)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_42%)]"
              />
            )}

            <div className="relative p-6 sm:max-w-[48%] sm:p-8">
              <p className="inline-flex rounded-md bg-biru/10 px-2.5 py-1 text-[11px] font-bold tracking-[0.14em] text-biru uppercase">
                {h.kelompok === "Profil" ? "Profil Sekolah" : h.kelompok}
              </p>
              <h2
                id="judul-pembuka-halaman"
                className="mt-3 text-2xl leading-tight font-bold text-biru-tua md:text-3xl"
              >
                {h.judul}
              </h2>
              <span
                aria-hidden
                className="mt-3 block h-1 w-16 rounded-full bg-emas"
              />
              {adaRingkasan && (
                <p className="mt-4 text-[15px] leading-relaxed text-teks">
                  {h.ringkasan}
                </p>
              )}
            </div>

            {gambar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gambar.berkas}
                alt={gambar.alt}
                className="pointer-events-none block h-28 w-full object-cover object-top sm:hidden"
              />
            )}
          </section>
        </MunculNaik>

        {/* Daftar isi halaman ini. Hanya muncul bila naskahnya memang dipecah
            menjadi dua bagian atau lebih; satu bagian tidak perlu daftar isi,
            dan naskah tanpa penanda "## " sama sekali tidak punya bagian. */}
        {bagian.length > 1 && (
          <nav
            aria-label={`Bagian halaman ${h.judul}`}
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {bagian.map((b, i) => (
              <MunculNaik key={b.id} jeda={i * 0.05}>
                <Link
                  href={`#${b.id}`}
                  className="gerak-kartu kartu flex h-full items-center gap-3 p-4 transition hover:border-biru"
                >
                  {/* Penandanya nomor urut, bukan ikon per bagian. Judul
                      bagiannya ditulis sekolah dan bisa apa saja, jadi ikon
                      yang dipilih di sini pasti sekadar tempelan pada
                      sebagian judul. Nomor selalu benar, dan sekaligus
                      menerangkan urutan bacanya. */}
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-biru-muda text-sm font-bold text-biru tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-bold text-biru-tua">
                      {b.judul}
                    </span>
                    {kalimatPertama(b.paragraf) && (
                      <span className="mt-0.5 block text-xs leading-snug text-samar">
                        {kalimatPertama(b.paragraf)}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="shrink-0 text-biru">
                    <IkonPanahKanan ukuran={16} />
                  </span>
                </Link>
              </MunculNaik>
            ))}
          </nav>
        )}

        {adaBagianVisiMisi && (
          <div className="mt-6 grid auto-rows-fr gap-4 lg:grid-cols-2">
            <MunculNaik>
              <section
                aria-labelledby="judul-visi-halaman"
                className="kartu h-full border-l-4 border-l-emas p-5 sm:p-6"
              >
                <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
                  Arah
                </p>
                <h2
                  id="judul-visi-halaman"
                  className="mt-1.5 text-xl font-bold text-biru-tua"
                >
                  Visi {h.judul}
                </h2>
                <span
                  aria-hidden
                  className="mt-3 block h-1 w-12 rounded-full bg-emas"
                />
                {belumTerisi(h.visi) ? (
                  <div className="mt-4">
                    <Menunggu
                      apa={`Rumusan visi ${h.judul}`}
                      dari="Halaman Profil"
                      polos
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-[15px] leading-relaxed font-semibold text-biru-tua">
                    {h.visi}
                  </p>
                )}
              </section>
            </MunculNaik>

            <MunculNaik jeda={0.08}>
              <section
                aria-labelledby="judul-misi-halaman"
                className="kartu h-full p-5 sm:p-6"
              >
                <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
                  Langkah
                </p>
                <h2
                  id="judul-misi-halaman"
                  className="mt-1.5 text-xl font-bold text-biru-tua"
                >
                  Misi {h.judul}
                </h2>
                <span
                  aria-hidden
                  className="mt-3 block h-1 w-12 rounded-full bg-emas"
                />
                {misi.length === 0 ? (
                  <div className="mt-4">
                    <Menunggu
                      apa={`Rumusan misi ${h.judul}`}
                      dari="Halaman Profil"
                      polos
                    />
                  </div>
                ) : (
                  <ol className="mt-3 divide-y divide-garis">
                    {misi.map((m, i) => (
                      <li key={i} className="flex gap-3 py-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-biru-muda text-xs font-bold text-biru tabular-nums">
                          {i + 1}
                        </span>
                        <span className="text-[15px] leading-relaxed text-teks">
                          {m}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </MunculNaik>
          </div>
        )}

        <MunculNaik>
          {/* Kartunya selebar kartu pembuka dan deretan bagian di atasnya,
              tetapi NASKAHNYA sendiri tetap dibatasi lebar baca. Sebelumnya
              yang dibatasi kartunya, sehingga pada layar lebar ia berdiri
              sendirian di kiri sementara kartu di atasnya melebar penuh, dan
              halamannya terbaca seperti dua rancangan yang berbeda. */}
          <article className="mt-6">
            {h.gambar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlUnggahan("profil", h.gambar)}
                alt={h.judul}
                className="mb-6 aspect-video w-full rounded-kartu bg-biru-muda object-cover"
                loading="lazy"
                decoding="async"
              />
            )}
            {adaNaskah ? (
              <div className="kartu p-6 md:p-8">
                <div className="max-w-3xl">
                  <Naskah isi={h.isi} />
                </div>
              </div>
            ) : (
              /* Keadaan kosong dibuat mencolok dan berada di tengah, bukan
                 satu baris miring di pojok kartu: pada halaman yang naskahnya
                 belum ada, INILAH seluruh isi halamannya. Kalimatnya tetap
                 diambil dari Menunggu supaya susunan katanya sama dengan
                 seluruh halaman lain yang juga menunggu naskah sekolah. */
              <div className="kartu px-6 py-12 text-center">
                <span
                  aria-hidden
                  className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-biru-muda text-biru"
                >
                  <IkonNaskah ukuran={26} />
                </span>
                <h2 className="mt-4 text-lg font-bold text-biru-tua">
                  Naskah halaman {h.judul} belum tersedia
                </h2>
                <div className="mx-auto mt-2 max-w-xl [&_p]:not-italic">
                  <Menunggu
                    apa={`Naskah halaman ${h.judul}`}
                    dari="Halaman Profil"
                    polos
                  />
                </div>
                <Link
                  href="/kontak"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
                >
                  Tanyakan ke sekolah
                  <IkonPanahKanan ukuran={16} />
                </Link>
              </div>
            )}
          </article>
        </MunculNaik>
      </div>
    </>
  );
}

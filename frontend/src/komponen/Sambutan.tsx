import { urlUnggahan } from "@/lib/api";
import { belumTerisi, keParagraf } from "@/lib/format";
import type { Pengaturan } from "@/lib/tipe";

/**
 * Bagian sambutan kepala sekolah pada halaman Profil Sekolah.
 *
 * Susunannya mengikuti rancangan yang diminta: kartu berlatar gradasi biru
 * muda, potret kepala sekolah bersudut membulat dengan aksen emas, naskah
 * sambutan sebagai kutipan miring di antara dua tanda petik besar, lalu foto
 * gedung sekolah yang dipudarkan di bagian bawah, dan semboyan sekolah
 * ditulis dengan huruf tulisan tangan.
 *
 * Tidak ada satu pun isinya yang ditulis di dalam berkas ini. Naskah
 * sambutan, nama kepala sekolah, semboyan, fotonya, dan foto gedung
 * seluruhnya berasal dari menu Pengaturan. Bagian yang belum dikirim sekolah
 * menampilkan kerangka berukuran sama, bukan tulisan karangan: dengan begitu
 * tata letaknya sudah final sebelum bahannya ada, dan panitia dapat melihat
 * sendiri bahan apa yang masih ditunggu.
 */
export function Sambutan({ pengaturan }: { pengaturan: Pengaturan }) {
  const p = pengaturan;
  const adaFoto = Boolean(p.foto_kepsek && !belumTerisi(p.foto_kepsek));
  const adaNama = !belumTerisi(p.kepala_sekolah ?? "");
  const adaNaskah = !belumTerisi(p.sambutan_kepsek ?? "");
  const adaSemboyan = !belumTerisi(p.tagline ?? "");
  const adaGedung = Boolean(p.foto_depan && !belumTerisi(p.foto_depan));

  return (
    <section
      aria-labelledby="judul-sambutan"
      // Gradasinya dituliskan sebagai kelas Tailwind, bukan gaya sebaris,
      // supaya ikut terbawa saat markupnya ditangkap untuk demo statis.
      className="relative overflow-hidden rounded-kartu bg-gradient-to-b from-biru-muda via-white to-white shadow-lembut"
    >
      {/* Foto gedung sekolah, dipudarkan di bagian bawah kartu. Ditaruh
          sebagai lapisan terpisah di belakang isi, bukan sebagai latar CSS,
          supaya tetap punya atribut alt yang kosong dan tidak ikut dibaca
          pembaca layar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 sm:h-48"
      >
        {adaGedung ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlUnggahan("profil", p.foto_depan)}
              alt=""
              className="h-full w-full object-cover opacity-20"
              loading="lazy"
              decoding="async"
            />
            {/* Peredup dari atas supaya pertemuan foto dengan kartunya tidak
                berupa garis mendatar yang tegas. */}
            <div className="absolute inset-0 bg-gradient-to-b from-white from-5% to-transparent to-85%" />
          </>
        ) : (
          <div className="flex h-full items-end justify-center bg-gradient-to-b from-white to-biru-muda pb-4">
            <p className="px-6 text-center text-[11px] leading-relaxed text-biru/70">
              Tempat foto gedung sekolah. Foto mendatar, paling tidak 1600
              piksel lebarnya, diunggah sebagai
              <span className="font-semibold"> Foto halaman depan </span>
              lewat menu Pengaturan. Di sini fotonya ditampilkan pudar sebagai
              latar.
            </p>
          </div>
        )}
      </div>

      <div className="relative px-6 pt-10 pb-32 sm:px-10 sm:pt-12 sm:pb-36">
        <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
          Sambutan
        </p>
        <h2 id="judul-sambutan" className="mt-2 text-2xl font-bold md:text-3xl">
          Kata Kepala Sekolah
        </h2>
        <span
          aria-hidden
          className="mt-3 block h-1 w-16 rounded-full bg-emas"
        />

        <div className="mt-8 grid gap-8 sm:grid-cols-[13rem_1fr] sm:gap-10">
          {/* Potret beserta nama */}
          <div>
            {adaFoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlUnggahan("profil", p.foto_kepsek)}
                alt={
                  adaNama
                    ? `Foto ${p.kepala_sekolah}, Kepala Sekolah`
                    : "Foto Kepala Sekolah"
                }
                className="aspect-square w-full rounded-2xl bg-biru-muda object-cover shadow-lembut"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-biru/30 bg-white/70 px-4 text-center">
                <div>
                  <span
                    aria-hidden
                    className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-biru-muda text-xl text-biru"
                  >
                    ☐
                  </span>
                  <p className="mt-2.5 text-xs font-semibold text-biru-tua">
                    Tempat foto kepala sekolah
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-biru/70">
                    Potret, perbandingan sisi 1:1, paling tidak 600×600
                    piksel. Diunggah lewat menu Pengaturan.
                  </p>
                </div>
              </div>
            )}

            <p className="mt-4 text-[15px] leading-snug font-bold text-biru-tua">
              {adaNama ? p.kepala_sekolah : "Nama kepala sekolah belum diisi"}
            </p>
            <p className="mt-0.5 text-sm text-samar">Kepala Sekolah</p>
          </div>

          {/* Naskah sambutan sebagai kutipan */}
          <div className="relative min-w-0">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-6 -left-1 font-serif text-7xl leading-none text-biru/20 select-none"
            >
              &ldquo;
            </span>

            {adaNaskah ? (
              <blockquote className="relative space-y-4 pt-4">
                {keParagraf(p.sambutan_kepsek).map((baris, i) => (
                  <p
                    key={i}
                    className="text-[15px] leading-relaxed whitespace-pre-line text-teks italic"
                  >
                    {baris}
                  </p>
                ))}
              </blockquote>
            ) : (
              <p className="relative pt-4 text-[15px] leading-relaxed text-samar italic">
                Naskah sambutan kepala sekolah belum tersedia. Bagian ini akan
                terisi setelah pihak sekolah mengirimkan naskahnya, dan dapat
                diisi lewat menu Pengaturan di panel admin.
              </p>
            )}

            <span
              aria-hidden
              className="pointer-events-none -mt-3 block text-right font-serif text-6xl leading-none text-biru/20 select-none"
            >
              &rdquo;
            </span>
          </div>
        </div>

        {/* Semboyan sekolah, huruf tulisan tangan. Ditaruh di atas foto gedung
            yang pudar, sejajar kanan seperti pada rancangannya. */}
        <div className="relative mt-10 flex justify-end sm:mt-12">
          {adaSemboyan ? (
            <p className="max-w-[16rem] text-right text-2xl leading-tight font-semibold text-biru-tua sm:text-[28px] font-tangan">
              {p.tagline}
              <span
                aria-hidden
                className="mt-1 ml-auto block h-[3px] w-28 rounded-full bg-emas"
              />
            </p>
          ) : (
            <p className="max-w-[17rem] rounded-lg bg-white/80 px-3 py-2 text-right text-[11px] leading-relaxed text-biru/70">
              Semboyan sekolah ditulis di sini dengan huruf tulisan tangan.
              Diisi lewat pengaturan <span className="font-semibold">Tagline</span>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

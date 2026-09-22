import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { api, urlUnggahan, GalatApi } from "@/lib/api";
import { tanggalPanjang, keParagraf, angka } from "@/lib/format";
import { GambarKosong, Lencana } from "@/komponen/Bagian";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";

async function muat(slug: string) {
  try {
    return await api.beritaDetail(slug);
  } catch (e) {
    if (e instanceof GalatApi && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata(
  props: PageProps<"/berita/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const hasil = await muat(slug).catch(() => null);
  if (!hasil) return { title: "Berita tidak ditemukan" };

  return {
    title: hasil.data.judul,
    description: hasil.data.ringkasan || hasil.data.judul,
    openGraph: {
      title: hasil.data.judul,
      description: hasil.data.ringkasan || hasil.data.judul,
      type: "article",
      publishedTime: hasil.data.dibuat,
    },
  };
}

export default async function HalamanDetailBerita(
  props: PageProps<"/berita/[slug]">,
) {
  const { slug } = await props.params;
  const hasil = await muat(slug);
  if (!hasil) notFound();

  const b = hasil.data;
  const paragraf = keParagraf(b.isi);

  return (
    <article className="wadah py-12 md:py-16">
      <nav aria-label="Jejak halaman" className="mb-6 text-sm text-samar">
        <Link href="/" className="hover:text-biru">
          Beranda
        </Link>
        <span className="mx-2">/</span>
        <Link href="/berita" className="hover:text-biru">
          Berita
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/berita?kategori=${encodeURIComponent(b.kategori)}`}
          className="hover:text-biru"
        >
          {b.kategori}
        </Link>
      </nav>

      <header className="mx-auto max-w-3xl">
        <Lencana>{b.kategori}</Lencana>
        <h1 className="mt-3 text-3xl leading-tight text-balance md:text-4xl">
          {b.judul}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-samar">
          <span>{tanggalPanjang(b.dibuat)}</span>
          {b.penulis && <span>Oleh {b.penulis}</span>}
          <span>{angka(b.dibaca)} kali dibaca</span>
        </p>
      </header>

      {b.gambar ? (
        <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-kartu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlUnggahan("berita", b.gambar)}
            alt={b.judul}
            className="w-full object-cover"
          />
        </div>
      ) : (
        <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-kartu">
          <GambarKosong label={b.kategori} tinggi="h-64" />
        </div>
      )}

      <div className="mx-auto mt-10 max-w-3xl">
        {b.ringkasan && (
          <p className="mb-8 border-l-4 border-emas bg-biru-muda/50 px-5 py-4 text-[17px] leading-relaxed font-medium text-biru-tua">
            {b.ringkasan}
          </p>
        )}

        {/* Isi berita ditampilkan sebagai teks, bukan HTML, sehingga naskah
            dari basis data tidak bisa menyisipkan skrip ke halaman ini. */}
        <div className="naskah text-[16.5px] text-teks">
          {paragraf.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-garis pt-8">
          <Link
            href="/berita"
            className="rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru"
          >
            ← Semua berita
          </Link>
          <Link
            href="/ppdb/daftar"
            className="rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
          >
            Daftar PPDB
          </Link>
        </div>
      </div>

      {hasil.terkait.length > 0 && (
        <section className="mt-16 border-t border-garis pt-12">
          <h2 className="mb-6 text-xl">Baca juga</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {hasil.terkait.map((t, i) => (
              <MunculNaik key={t.id} jeda={i * 0.07}>
                <KartuGerak className="kartu h-full overflow-hidden">
                  <Link href={`/berita/${t.slug}`} className="block">
                    {t.gambar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlUnggahan("berita", t.gambar)}
                        alt={t.judul}
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <GambarKosong label={t.kategori} tinggi="h-40" />
                    )}
                    <div className="p-5">
                      <span className="text-xs text-samar">
                        {tanggalPanjang(t.dibuat)}
                      </span>
                      <h3 className="mt-1.5 text-base leading-snug text-balance">
                        {t.judul}
                      </h3>
                    </div>
                  </Link>
                </KartuGerak>
              </MunculNaik>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

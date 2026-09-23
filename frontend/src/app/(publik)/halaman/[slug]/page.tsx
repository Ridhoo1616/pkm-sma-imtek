import { api, urlUnggahan } from "@/lib/api";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu, Naskah } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import { notFound } from "next/navigation";
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

  return (
    <>
      <KepalaHalaman
        judul={h.judul}
        keterangan={belumTerisi(h.ringkasan) ? undefined : h.ringkasan}
      />
      <div className="wadah py-14">
        {INDUK[h.kelompok] && (
          <JejakMenu induk={INDUK[h.kelompok]} jalur={`/halaman/${h.slug}`} />
        )}

        <MunculNaik>
          <article className="mt-8 max-w-3xl">
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
            {belumTerisi(h.isi) ? (
              <Menunggu apa={`Naskah halaman ${h.judul}`} dari="Halaman Profil" />
            ) : (
              <div className="kartu p-6 md:p-8">
                <Naskah isi={h.isi} />
              </div>
            )}
          </article>
        </MunculNaik>
      </div>
    </>
  );
}

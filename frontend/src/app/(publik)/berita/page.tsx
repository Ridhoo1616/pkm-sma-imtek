import Link from "next/link";
import { api, urlUnggahan } from "@/lib/api";
import { tanggalPanjang } from "@/lib/format";
import { KepalaHalaman, GambarKosong, Lencana } from "@/komponen/Bagian";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import type { Metadata } from "next";
import type { HalamanBerita } from "@/lib/tipe";

export const metadata: Metadata = {
  title: "Berita & Pengumuman",
  description: "Kegiatan, prestasi, dan pengumuman resmi sekolah.",
};

const PER_HALAMAN = 9;

export default async function HalamanBeritaPublik(
  props: PageProps<"/berita">,
) {
  const kueri = await props.searchParams;
  const halaman = Math.max(Number(kueri.halaman) || 1, 1);
  const kategori = typeof kueri.kategori === "string" ? kueri.kategori : "";
  const cari = typeof kueri.cari === "string" ? kueri.cari : "";

  const params = new URLSearchParams({
    halaman: String(halaman),
    per_halaman: String(PER_HALAMAN),
  });
  if (kategori) params.set("kategori", kategori);
  if (cari) params.set("cari", cari);

  const hasil = await api
    .berita(`?${params.toString()}`)
    .catch(
      (): HalamanBerita => ({
        data: [],
        total: 0,
        halaman: 1,
        per_halaman: PER_HALAMAN,
        kategori: [],
      }),
    );

  const jumlahHalaman = Math.max(Math.ceil(hasil.total / PER_HALAMAN), 1);

  /** Menyusun alamat penyaring tanpa menghilangkan penyaring lain. */
  const tautan = (ubah: Record<string, string>) => {
    const u = new URLSearchParams();
    const gabung = { kategori, cari, halaman: "1", ...ubah };
    for (const [k, v] of Object.entries(gabung)) if (v && v !== "1") u.set(k, v);
    const s = u.toString();
    return s ? `/berita?${s}` : "/berita";
  };

  return (
    <>
      <KepalaHalaman
        judul="Berita & Pengumuman"
        keterangan="Kabar kegiatan, prestasi peserta didik, dan pengumuman resmi seputar penerimaan peserta didik baru."
        anak={
          <div className="flex flex-col gap-4">
            <form action="/berita" method="get" className="flex max-w-md gap-2">
              {kategori && <input type="hidden" name="kategori" value={kategori} />}
              <input
                type="search"
                name="cari"
                defaultValue={cari}
                placeholder="Cari judul atau isi berita..."
                aria-label="Cari berita"
                className="w-full rounded-lg border border-garis bg-white px-3.5 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white hover:bg-biru-tua"
              >
                Cari
              </button>
            </form>

            {hasil.kategori.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={tautan({ kategori: "" })}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition " +
                    (!kategori
                      ? "border-biru bg-biru text-white"
                      : "border-garis bg-white text-teks hover:border-biru hover:text-biru")
                  }
                >
                  Semua
                </Link>
                {hasil.kategori.map((k) => (
                  <Link
                    key={k}
                    href={tautan({ kategori: k })}
                    className={
                      "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition " +
                      (kategori === k
                        ? "border-biru bg-biru text-white"
                        : "border-garis bg-white text-teks hover:border-biru hover:text-biru")
                    }
                  >
                    {k}
                  </Link>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div className="wadah py-14">
        {hasil.data.length === 0 ? (
          <TanpaData
            judul={cari ? `Tidak ada berita yang cocok dengan "${cari}"` : "Belum ada berita"}
            keterangan={
              cari
                ? "Coba kata kunci lain, atau lihat seluruh berita."
                : "Berita akan muncul di sini setelah ditambahkan lewat panel admin."
            }
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-samar">
              Menampilkan {hasil.data.length} dari {hasil.total} berita
              {kategori && ` pada kategori ${kategori}`}
              {cari && ` untuk pencarian "${cari}"`}.
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hasil.data.map((b, i) => (
                <MunculNaik key={b.id} jeda={(i % 3) * 0.07}>
                  <KartuGerak className="kartu h-full overflow-hidden">
                    <Link href={`/berita/${b.slug}`} className="flex h-full flex-col">
                      {b.gambar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={urlUnggahan("berita", b.gambar)}
                          alt={b.judul}
                          className="h-48 w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <GambarKosong label={b.kategori} />
                      )}
                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-2.5 flex flex-wrap items-center gap-2">
                          <Lencana>{b.kategori}</Lencana>
                          <span className="text-xs text-samar">
                            {tanggalPanjang(b.dibuat)}
                          </span>
                        </div>
                        <h2 className="text-base leading-snug text-balance">{b.judul}</h2>
                        {b.ringkasan && (
                          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-samar">
                            {b.ringkasan}
                          </p>
                        )}
                        <span className="mt-4 text-sm font-semibold text-biru">
                          Baca selengkapnya →
                        </span>
                      </div>
                    </Link>
                  </KartuGerak>
                </MunculNaik>
              ))}
            </div>

            {jumlahHalaman > 1 && (
              <nav
                aria-label="Halaman berita"
                className="mt-12 flex flex-wrap items-center justify-center gap-2"
              >
                {halaman > 1 && (
                  <Link
                    href={tautan({ halaman: String(halaman - 1) })}
                    className="rounded-lg border border-garis bg-white px-4 py-2 text-sm font-semibold hover:border-biru hover:text-biru"
                  >
                    Sebelumnya
                  </Link>
                )}
                {Array.from({ length: jumlahHalaman }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={tautan({ halaman: String(n) })}
                    aria-current={n === halaman ? "page" : undefined}
                    className={
                      "min-w-10 rounded-lg border px-3.5 py-2 text-center text-sm font-semibold tabular-nums " +
                      (n === halaman
                        ? "border-biru bg-biru text-white"
                        : "border-garis bg-white hover:border-biru hover:text-biru")
                    }
                  >
                    {n}
                  </Link>
                ))}
                {halaman < jumlahHalaman && (
                  <Link
                    href={tautan({ halaman: String(halaman + 1) })}
                    className="rounded-lg border border-garis bg-white px-4 py-2 text-sm font-semibold hover:border-biru hover:text-biru"
                  >
                    Berikutnya
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}

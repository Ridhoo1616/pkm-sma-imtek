import Link from "next/link";
import { api, urlUnggahan } from "@/lib/api";
import { tanggalPanjang } from "@/lib/format";
import { KepalaHalaman, GambarKosong } from "@/komponen/Bagian";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { HalamanBerita } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prestasi Siswa",
  description:
    "Capaian peserta didik pada lomba dan kegiatan di luar sekolah.",
};

/**
 * Prestasi siswa mengambil dari berita berkategori Prestasi, bukan dari
 * tabelnya sendiri.
 *
 * Sekolah sudah terbiasa menuliskan capaian siswa sebagai berita, lengkap
 * dengan foto dan uraiannya. Membuat tempat penyimpanan kedua hanya akan
 * membuat panitia memasukkan capaian yang sama dua kali, lalu salah satunya
 * tertinggal tidak diperbarui.
 */
export default async function HalamanPrestasi() {
  const hasil = await api
    .berita("?kategori=Prestasi&per_halaman=24")
    .catch(
      (): HalamanBerita => ({
        data: [],
        total: 0,
        halaman: 1,
        per_halaman: 24,
        kategori: [],
      }),
    );

  return (
    <>
      <KepalaHalaman
        judul="Prestasi Siswa"
        keterangan="Capaian peserta didik pada lomba akademik, olahraga, dan kegiatan lain di luar sekolah."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/kesiswaan" jalur="/kesiswaan/prestasi" />

        {hasil.data.length === 0 ? (
          <div className="mt-8">
            <TanpaData
              judul="Belum ada prestasi yang dimuat"
              keterangan="Prestasi ditulis sebagai berita berkategori Prestasi lewat menu Berita di panel admin, sehingga langsung tampil di halaman ini dan di halaman berita."
            />
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-samar">
              {hasil.total} capaian tercatat, terbaru lebih dahulu.
            </p>
            <div className="mt-6 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hasil.data.map((b, i) => (
                <MunculNaik key={b.id} jeda={(i % 3) * 0.08}>
                  <KartuGerak className="kartu h-full overflow-hidden">
                    <Link href={`/berita/${b.slug}`} className="flex h-full flex-col">
                      {b.gambar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={urlUnggahan("berita", b.gambar)}
                          alt={b.judul}
                          className="h-44 w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <GambarKosong label={b.judul} tinggi="h-44" />
                      )}
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs text-samar">
                          {tanggalPanjang(b.dibuat)}
                        </p>
                        <h2 className="mt-1.5 text-base leading-snug">
                          {b.judul}
                        </h2>
                        {b.ringkasan && (
                          <p className="mt-2 flex-1 text-sm leading-relaxed text-samar">
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
          </>
        )}
      </div>
    </>
  );
}

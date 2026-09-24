import { api } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { JejakMenu } from "@/komponen/JejakMenu";
import KalenderAkademik from "@/komponen/KalenderAkademik";
import type { Agenda } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalender Akademik",
  description: "Tanggal kegiatan, ujian, hari libur, dan jadwal PPDB sekolah.",
};

export default async function HalamanKalender() {
  const [hasil, { profil }] = await Promise.all([
    api.agenda().catch((): { data: Agenda[]; kategori: string[] } => ({
      data: [],
      kategori: [],
    })),
    muatProfil(),
  ]);

  return (
    <>
      <KepalaHalaman
        judul="Kalender Akademik"
        keterangan={`Tanggal kegiatan sekolah tahun pelajaran ${
          profil.pengaturan.ppdb_tahun || "yang berjalan"
        }, termasuk ujian, hari libur, dan jadwal PPDB.`}
      />
      <div className="wadah py-14">
        <JejakMenu induk="/akademik" jalur="/akademik/kalender" />

        {/* Kartu pembuka, susunannya sama dengan kartu Visi & Misi dan kartu
            Tenaga Pendidik: naskah di kolom kiri, ilustrasi di kolom kanan
            setinggi kartunya, menempel tepi lewat margin negatif per sisi.

            Margin ditulis per sisi di kedua ambang, bukan memakai ringkasan
            `-my`/`-mx` lalu dibatalkan sebagian: cara itu sudah terbukti
            membuat gambarnya menggantung 29 piksel di atas dasar kartu pada
            halaman Tenaga Pendidik, sebab Tailwind menyusun ulang urutan
            keluarannya sendiri sehingga kelas yang saling menimpa tidak bisa
            diandalkan.

            TIDAK ADA PEMILIH TAHUN AJARAN DI SINI. Pada rancangan acuan ia
            menempel di kepala halaman; di sini ia turun ke bilah penyaring
            di bawah kartu ini, sehingga kepala halamannya hanya berisi judul
            beserta keterangannya. */}
        <MunculNaik>
          <section
            aria-labelledby="judul-pembuka-kalender"
            className="mt-8 flex flex-col gap-5 overflow-hidden rounded-kartu border border-garis bg-gradient-to-br from-biru-muda via-biru-muda to-white p-6 shadow-lembut sm:flex-row sm:items-stretch sm:gap-6 sm:p-7"
          >
            <div className="min-w-0 flex-1 sm:self-center">
              <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
                Akademik
              </p>
              <h2
                id="judul-pembuka-kalender"
                className="mt-2 text-2xl leading-tight font-bold text-biru-tua md:text-3xl"
              >
                Kalender Akademik
              </h2>
              <span
                aria-hidden
                className="mt-3 block h-1 w-16 rounded-full bg-emas"
              />
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-teks">
                Rangkaian kegiatan pembelajaran, penilaian, dan agenda penting
                sekolah yang disusun berdasarkan tahun ajaran.
              </p>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ilustrasi/kalender.png"
              alt="Ilustrasi kalender meja beserta tumpukan buku dan tanaman"
              width={1671}
              height={645}
              className="pointer-events-none -mr-6 -mb-6 -ml-6 w-[calc(100%+3rem)] max-w-none self-end object-contain object-bottom sm:-mt-7 sm:-mr-7 sm:-mb-7 sm:ml-0 sm:w-72 sm:self-stretch md:w-96"
            />
          </section>
        </MunculNaik>

        <div className="mt-6">
          <KalenderAkademik agenda={hasil.data} />
        </div>
      </div>
    </>
  );
}

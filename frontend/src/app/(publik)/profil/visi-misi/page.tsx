import { urlUnggahan } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { belumTerisi, kePoinTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import { IkonGuru, IkonSiswa, IkonBersama } from "@/komponen/Ikon";
import { kelasKartuAkhir } from "@/komponen/Bagian";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visi & Misi",
  description: "Arah yang dituju sekolah beserta langkah-langkah mencapainya.",
};

/**
 * Tiga pihak yang menjalankan visi dan misi. Keterangannya menerangkan peran
 * masing-masing secara umum — begitulah sekolah bekerja di mana pun — dan
 * sengaja tidak memuat penilaian apa pun tentang SMA IMTEK, karena penilaian
 * seperti itu hanya boleh datang dari sekolahnya sendiri.
 */
const PELAKU = [
  {
    Ikon: IkonGuru,
    judul: "Guru dan tenaga kependidikan",
    keterangan:
      "Menyusun rencana pembelajaran, mengajar di kelas, membina kegiatan siswa, dan mengurus layanan administrasi sekolah.",
  },
  {
    Ikon: IkonSiswa,
    judul: "Siswa dan siswi",
    keterangan:
      "Yang menjalani prosesnya sehari-hari, dan yang pada akhirnya diukur hasil belajarnya beserta perkembangan karakternya.",
  },
  {
    Ikon: IkonBersama,
    judul: "Dikerjakan bersama",
    keterangan:
      "Rumusan di bawah ini menjadi acuan bersama. Perkembangan pelaksanaannya dapat diikuti pada halaman Berita dan Kesiswaan.",
  },
];

export default async function HalamanVisiMisi() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  // Misi ditulis satu baris per poin pada pengaturan; aturan memecahnya sama
  // dengan keunggulan di beranda, jadi dipusatkan di kePoinTerisi(), yang
  // sekaligus membuang baris yang masih berupa penanda [kurung siku].
  const misi = kePoinTerisi(p.misi);
  const adaSemboyan = !belumTerisi(p.tagline ?? "");
  const adaGambar = Boolean(p.visi_gambar && !belumTerisi(p.visi_gambar));

  return (
    <>
      <KepalaHalaman
        judul="Visi & Misi"
        keterangan="Visi adalah keadaan yang dituju sekolah; misi adalah langkah yang dikerjakan untuk mencapainya."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/visi-misi" />

        {/* Gambar pilihan sekolah, mendahului ketiga kartu peran. Kosong
            berarti kerangka berukuran sama beserta cara mengunggahnya, bukan
            bagian yang hilang — dengan begitu tata letak halaman sudah final
            sebelum gambarnya ada, dan panitia melihat sendiri apa yang masih
            ditunggu. Berkasnya diunggah lewat menu Pengaturan; hanya jpg dan
            png yang diterima, dan SVG sengaja tidak, karena SVG boleh memuat
            <script> dan situs ini menerima unggahan dari panel. */}
        <MunculNaik>
          {adaGambar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlUnggahan("profil", p.visi_gambar)}
              alt="Guru dan siswa yang menjalankan visi dan misi sekolah"
              className="mt-8 aspect-video w-full rounded-kartu bg-biru-muda object-cover shadow-lembut"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="mt-8 grid aspect-video w-full place-items-center rounded-kartu border border-dashed border-biru/30 bg-biru-muda px-6 text-center">
              <div className="max-w-md">
                <span
                  aria-hidden
                  className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-biru"
                >
                  ☐
                </span>
                <p className="mt-3 text-sm font-semibold text-biru-tua">
                  Tempat gambar halaman Visi &amp; Misi
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-biru/70">
                  Ilustrasi atau foto kegiatan, mendatar, perbandingan sisi
                  16:9, paling tidak 1280 piksel lebarnya. PNG berlatar tembus
                  pandang paling rapi. Diunggah sebagai
                  <span className="font-semibold"> Gambar halaman Visi &amp; Misi </span>
                  lewat menu Pengaturan di panel admin.
                </p>
              </div>
            </div>
          )}
        </MunculNaik>

        {/* Siapa yang menjalankan rumusannya, sebelum rumusannya sendiri.
            Visi dan misi yang berdiri sebagai dua blok teks terbaca seperti
            dokumen; yang mengerjakannya orang, dan itu yang ditunjuk di sini.
            Keterangan di tiap kartu menerangkan PERANNYA, bukan memuji
            sekolahnya — tidak ada satu pun klaim tentang SMA IMTEK di sini. */}
        <section className="mt-10" aria-labelledby="judul-pelaku">
          <h2
            id="judul-pelaku"
            className="text-xs font-bold tracking-[0.18em] text-biru uppercase"
          >
            Yang Menjalankannya
          </h2>
          <div className="mt-4 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PELAKU.map((pel, i) => (
              <MunculNaik
                key={pel.judul}
                jeda={i * 0.07}
                className={kelasKartuAkhir(i, PELAKU.length)}
              >
                <div className="kartu flex h-full gap-4 p-5">
                  <span
                    aria-hidden
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-biru-muda text-biru"
                  >
                    <pel.Ikon ukuran={26} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base leading-snug">{pel.judul}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-samar">
                      {pel.keterangan}
                    </p>
                  </div>
                </div>
              </MunculNaik>
            ))}
          </div>
          {adaSemboyan && (
            <p className="mt-5 text-sm leading-relaxed text-samar">
              Semboyan yang dipakai sekolah:{" "}
              <span className="font-tangan text-xl font-semibold text-biru-tua">
                {p.tagline}
              </span>
            </p>
          )}
        </section>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <MunculNaik>
            <section>
              <JudulBagian atas="Arah" judul="Visi" />
              {belumTerisi(p.visi) ? (
                <Menunggu apa="Rumusan visi" />
              ) : (
                <div className="kartu border-l-4 border-l-emas p-6">
                  <p className="text-lg leading-relaxed font-semibold text-biru-tua">
                    {p.visi}
                  </p>
                </div>
              )}
            </section>
          </MunculNaik>

          <MunculNaik jeda={0.08}>
            <section>
              <JudulBagian atas="Langkah" judul="Misi" />
              {misi.length === 0 ? (
                <Menunggu apa="Rumusan misi" />
              ) : (
                <ol className="kartu divide-y divide-garis">
                  {misi.map((m, i) => (
                    <li key={i} className="flex gap-3 px-6 py-4">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-biru-muda text-xs font-bold text-biru tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-[15px] leading-relaxed text-teks">{m}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </MunculNaik>
        </div>
      </div>
    </>
  );
}

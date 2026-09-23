import { muatProfil } from "@/lib/profil";
import { belumTerisi, kePoinTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
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

  return (
    <>
      <KepalaHalaman
        judul="Visi & Misi"
        keterangan="Visi adalah keadaan yang dituju sekolah; misi adalah langkah yang dikerjakan untuk mencapainya."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/visi-misi" />

        {/* Kedua kartu setinggi sama (auto-rows-fr), sehingga pita bawah
            tempat ilustrasinya duduk sama tinggi pada keduanya. Tanpa itu
            ilustrasi kartu yang isinya lebih pendek akan menggantung. */}
        <div className="mt-10 grid auto-rows-fr gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Judulnya DI DALAM kartu, bukan melintang di atasnya.
              Sebelumnya "Arah / Visi" berdiri di luar kartu, dan itu
              menggagalkan dua hal sekaligus: judul setinggi seratus piksel
              memakan habis tarikan ke atas sehingga kartunya cuma menindih
              gambar empat piksel, dan judul itu sendirilah yang mendarat di
              atas gambar. Dengan judulnya di dalam, tepi atas kartu sama
              dengan tepi atas petaknya, jadi seluruh tarikan menjadi
              tindihan — dan kotak yang dipegang orang di dalam gambar
              terbaca jelas bertuliskan Visi dan Misi. */}
          <MunculNaik>
            <section
              aria-labelledby="judul-visi"
              className="kartu relative h-full overflow-hidden border-l-4 border-l-emas p-6 pb-40 sm:pb-48 md:p-7 md:pb-48"
            >
              {/* Ilustrasi duduk di pojok kanan bawah, DI DALAM kartu.
                  Kartunya mengurung isinya supaya gambarnya terpotong
                  mengikuti sudut membulat kartu, bukan menyembul di luarnya.

                  Ruang bawah kartu (pb) dilebihkan setinggi gambarnya, jadi
                  naskahnya berhenti di atas pita itu dan tidak pernah
                  tertimpa — berapa pun panjang rumusan yang dikirim sekolah,
                  dan berapa pun banyaknya poin misi. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ilustrasi/visi.png"
                alt="Ilustrasi guru dan tiga siswa di dalam kelas, di depan papan tulis"
                width={384}
                height={426}
                className="pointer-events-none absolute right-0 bottom-0 h-36 w-auto sm:h-44"
              />
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
                  Arah
                </p>
                <h2 id="judul-visi" className="mt-1.5 text-2xl font-bold">
                  Visi
                </h2>
                <span
                  aria-hidden
                  className="mt-3 block h-1 w-12 rounded-full bg-emas"
                />
              </div>
              {belumTerisi(p.visi) ? (
                <div className="mt-5">
                  <Menunggu apa="Rumusan visi" polos />
                </div>
              ) : (
                <p className="mt-5 text-lg leading-relaxed font-semibold text-biru-tua">
                  {p.visi}
                </p>
              )}
            </section>
          </MunculNaik>

          <MunculNaik jeda={0.08}>
            <section
              aria-labelledby="judul-misi"
              className="kartu relative h-full overflow-hidden p-6 pb-40 sm:pb-48 md:p-7 md:pb-48"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ilustrasi/misi.png"
                alt="Ilustrasi guru dan dua siswa bekerja bersama di meja belajar"
                width={314}
                height={434}
                className="pointer-events-none absolute right-0 bottom-0 h-36 w-auto sm:h-44"
              />
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
                  Langkah
                </p>
                <h2 id="judul-misi" className="mt-1.5 text-2xl font-bold">
                  Misi
                </h2>
                <span
                  aria-hidden
                  className="mt-3 block h-1 w-12 rounded-full bg-emas"
                />
              </div>
              {misi.length === 0 ? (
                <div className="mt-5">
                  <Menunggu apa="Rumusan misi" polos />
                </div>
              ) : (
                <ol className="mt-4 divide-y divide-garis">
                  {misi.map((m, i) => (
                    <li key={i} className="flex gap-3 py-3.5">
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

        {/* Rincian tiga peran, SESUDAH rumusannya. Gambar di atas sudah
            menyampaikan maksudnya tanpa kata — orang-orangnya memegang kedua
            kartu itu — dan bagian ini menyebutkan siapa saja mereka.
            Keterangan tiap kartu menerangkan PERANNYA, bukan memuji
            sekolahnya: tidak ada satu pun klaim tentang SMA IMTEK di sini. */}
        <section className="mt-14" aria-labelledby="judul-pelaku">
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

      </div>
    </>
  );
}

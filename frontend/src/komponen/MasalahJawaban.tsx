import Link from "next/link";
import { IkonCentang } from "@/komponen/Ikon";

/**
 * Tiga keadaan yang biasa terjadi pada pendaftaran yang dikerjakan manual,
 * beserta apa yang sistem ini lakukan terhadap masing-masing.
 *
 * Kalimat masalahnya TENTANG CARA MANUAL, bukan tentang SMA IMTEK: tidak ada
 * tuduhan bahwa sekolah ini pernah begitu. Kalimat jawabannya menyebut
 * perilaku yang benar-benar ada di sistem ini dan dapat dibuktikan dengan
 * membuka tautannya — bukan janji, dan bukan penilaian mutu.
 *
 * Bagian ini ditaruh tepat sebelum ajakan mendaftar di ujung beranda, supaya
 * yang dibaca lebih dulu alasannya, baru tombolnya.
 */
const PASANGAN = [
  {
    masalah:
      "Harus datang ke sekolah lebih dulu hanya untuk menanyakan jadwal, syarat, dan biayanya.",
    jawaban:
      "Jadwal pendaftaran, persyaratan, jalur yang dibuka, dan rincian biaya per tahap terbuka di halaman Informasi PPDB.",
    tautan: "/ppdb",
    label: "Buka Informasi PPDB",
  },
  {
    masalah:
      "Berkas difotokopi berkali-kali, dan yang kurang baru diketahui setelah sampai di meja panitia.",
    jawaban:
      "Dokumen diunggah langsung dari ponsel. Formulirnya memeriksa isian dan berkas yang kurang sebelum apa pun terkirim, jadi kekeliruannya ketahuan di tempat.",
    tautan: "/ppdb/daftar",
    label: "Lihat formulirnya",
  },
  {
    masalah:
      "Berkas sudah diserahkan, tetapi tidak ada cara mengetahui sudah diperiksa atau belum selain menanyakannya lagi.",
    jawaban:
      "Nomor registrasi terbit seketika. Dengan nomor itu beserta tanggal lahir, keadaan verifikasi dapat dilihat sendiri kapan pun tanpa menghubungi panitia.",
    tautan: "/ppdb/cek",
    label: "Cek status pendaftaran",
  },
];

export function MasalahJawaban() {
  return (
    <section
      aria-labelledby="judul-masalah"
      className="wadah py-16 md:py-20"
    >
      <div className="max-w-3xl">
        <p className="inline-block rounded-md bg-emas px-2.5 py-1 text-xs font-bold tracking-[0.12em] text-biru-tua uppercase">
          Kenapa online
        </p>
        <h2
          id="judul-masalah"
          className="mt-4 text-2xl font-bold text-balance md:text-3xl"
        >
          Yang Biasanya Melelahkan, Dikerjakan Sekali Saja
        </h2>
        <span
          aria-hidden
          className="mt-3 block h-1 w-16 rounded-full bg-emas"
        />
        <p className="mt-4 leading-relaxed text-samar">
          Tiga keadaan di bawah ini biasa terjadi pada pendaftaran yang
          dikerjakan dengan berkas kertas. Di sebelahnya, apa yang dikerjakan
          sistem ini — dan tautannya, supaya dapat Anda periksa sendiri.
        </p>
      </div>

      <div className="mt-10 divide-y divide-garis border-y border-garis">
        {PASANGAN.map((p, i) => (
          <div
            key={p.tautan}
            className="grid gap-4 py-7 md:grid-cols-[1fr_1.15fr] md:gap-10"
          >
            {/* Masalahnya sengaja redup dan tanpa ikon apa pun. Memberinya
                tanda silang merah akan membuatnya terbaca sebagai galat,
                padahal ia cuma keadaan yang sudah biasa. */}
            <p className="flex gap-3 text-[15px] leading-relaxed text-samar">
              <span
                aria-hidden
                className="mt-1 text-xs font-bold text-samar/70 tabular-nums"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{p.masalah}</span>
            </p>

            <div>
              <p className="flex gap-3 text-[15px] leading-relaxed text-teks">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-biru-muda text-biru"
                >
                  <IkonCentang ukuran={14} />
                </span>
                <span>{p.jawaban}</span>
              </p>
              <Link
                href={p.tautan}
                className="mt-3 ml-9 inline-block text-sm font-semibold text-biru underline-offset-4 hover:underline"
              >
                {p.label} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";

/**
 * Penunjuk alur pendaftaran, dipasang di atas halaman-halaman PPDB.
 *
 * Gunanya satu: pengunjung langsung tahu ia ada di tahap mana dan apa
 * berikutnya, tanpa harus membaca seluruh halaman lebih dulu.
 *
 * TIDAK ADA TANDA CENTANG DI SINI, dan itu perbaikan dari bentuk sebelumnya.
 * Dulu setiap tahap sebelum tahap sekarang diberi centang, sehingga membuka
 * halaman Cek Status menampilkan "centang Isi formulir" kepada orang yang
 * belum pernah mengisi formulirnya — dan pada masa pendaftaran yang tertutup,
 * kepada orang yang memang tidak bisa mengisinya. Penunjuk ini hanya
 * mengetahui HALAMAN yang sedang dibuka, bukan riwayat pengunjungnya, jadi ia
 * tidak boleh mengaku tahu apa yang sudah dikerjakan orang. Yang ditampilkan
 * nomor tahapnya saja.
 *
 * Tahap yang tidak dapat dibuka tampil pudar, tidak dapat diklik, dan
 * menerangkan sebabnya lewat title beserta aria-disabled. Yang dapat dibuka
 * SELALU berupa tautan, baik letaknya sebelum maupun sesudah tahap sekarang,
 * supaya yang terlihat dapat diklik memang dapat diklik.
 *
 * Dirender di server, tanpa JavaScript sama sekali, karena isinya hanya
 * ditentukan halaman yang sedang dibuka.
 */

export type TahapAlur = "ketentuan" | "daftar" | "pantau" | "tes" | "hasil";

interface Tahap {
  kunci: TahapAlur;
  label: string;
  jalur: string;
}

const TAHAP: Tahap[] = [
  { kunci: "ketentuan", label: "Baca ketentuan", jalur: "/ppdb" },
  { kunci: "daftar", label: "Isi formulir", jalur: "/ppdb/daftar" },
  { kunci: "pantau", label: "Verifikasi berkas", jalur: "/ppdb/cek" },
  { kunci: "tes", label: "Tes seleksi", jalur: "/ppdb/ujian" },
  { kunci: "hasil", label: "Hasil seleksi", jalur: "/ppdb/cek" },
];

export function PenunjukAlur({
  aktif,
  ppdbDibuka,
}: {
  aktif: TahapAlur;
  /**
   * Bila pendaftaran tutup, tahap "Isi formulir" tidak dapat dibuka.
   *
   * WAJIB diisi, tanpa nilai bawaan. Sebelumnya bawaannya `true`, dan dua
   * halaman lupa meneruskannya: Cek Status dan Tes Seleksi. Akibatnya tahap
   * "Isi formulir" tetap dapat diklik di sana meski pendaftarannya sudah
   * ditutup, padahal halaman tujuannya sendiri menolak. Dibuat wajib supaya
   * halaman yang lupa gagal saat disusun, bukan salah diam-diam.
   */
  ppdbDibuka: boolean;
}) {
  const indeksAktif = TAHAP.findIndex((t) => t.kunci === aktif);

  return (
    <nav
      aria-label="Alur pendaftaran"
      className="tanpa-cetak border-b border-garis bg-white"
    >
      <ol className="wadah flex snap-x gap-2 overflow-x-auto py-3.5">
        {TAHAP.map((t, i) => {
          const sekarang = i === indeksAktif;
          // Hanya tahap formulir yang dapat tertutup. Tahap lainnya boleh
          // dibuka kapan pun: yang sudah mendaftar tetap perlu memantau
          // statusnya walau pendaftarannya sudah ditutup.
          const bisaDibuka = t.kunci !== "daftar" || ppdbDibuka;

          const isi = (
            <>
              <span
                aria-hidden="true"
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums " +
                  (sekarang
                    ? "bg-biru-tua text-white"
                    : bisaDibuka
                      ? "bg-biru-muda text-biru"
                      : "bg-slate-100 text-slate-400")
                }
              >
                {i + 1}
              </span>
              <span className="whitespace-nowrap">{t.label}</span>
            </>
          );

          // Gayanya mengikuti DAPAT ATAU TIDAKNYA dibuka, bukan letaknya
          // sebelum atau sesudah tahap sekarang. Sebelumnya tahap sesudahnya
          // selalu pudar meski tautannya hidup, jadi yang terlihat mati
          // sebenarnya dapat diklik, dan sebaliknya.
          const gaya =
            "flex snap-start items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
            (sekarang
              ? "bg-biru-muda text-biru-tua"
              : bisaDibuka
                ? "text-teks hover:bg-biru-muda/60"
                : "cursor-not-allowed text-slate-400");

          return (
            <li key={t.kunci}>
              {bisaDibuka && !sekarang ? (
                <Link href={t.jalur} className={gaya}>
                  {isi}
                </Link>
              ) : (
                <span
                  className={gaya}
                  aria-current={sekarang ? "step" : undefined}
                  // Tahap yang SEDANG dibuka tidak diberi aria-disabled walau
                  // pendaftarannya tutup. Halaman /ppdb/daftar tetap terbuka
                  // pada masa tutup — isinya berganti menjadi keterangan
                  // penutupan — jadi menandainya "tidak tersedia" sementara
                  // pengunjung berdiri di atasnya justru membingungkan
                  // pembaca layar. Keterangan penutupannya ada di isi halaman.
                  aria-disabled={!bisaDibuka && !sekarang ? true : undefined}
                  title={
                    !bisaDibuka && !sekarang
                      ? "Pendaftaran sedang ditutup, jadi formulirnya tidak dapat diisi."
                      : undefined
                  }
                >
                  {isi}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Kotak arahan langkah berikutnya, dipasang di dalam halaman.
 *
 * Bedanya dengan PenunjukAlur: yang ini menjelaskan apa yang harus
 * dikerjakan, bukan hanya di mana posisinya. Dipakai pada tempat yang
 * pengunjungnya paling mudah tersesat, misalnya sesudah membaca ketentuan.
 */
export function ArahanLangkah({
  judul,
  keterangan,
  tautan,
  labelTautan,
  jenis = "biasa",
}: {
  judul: string;
  keterangan: string;
  tautan?: string;
  labelTautan?: string;
  /** "sorot" untuk langkah yang paling disarankan, "tutup" bila tidak tersedia. */
  jenis?: "biasa" | "sorot" | "tutup";
}) {
  const warna =
    jenis === "sorot"
      ? "border-amber-300 bg-amber-50"
      : jenis === "tutup"
        ? "border-garis bg-slate-50"
        : "border-biru/20 bg-biru-muda";

  return (
    <div className={`rounded-kartu border px-6 py-5 ${warna}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-base font-bold text-biru-tua">
            {jenis === "sorot" && (
              <span className="inline-flex items-center justify-center rounded-md bg-amber-700 px-2 py-1 text-[11px] leading-none font-bold tracking-[0.06em] text-white uppercase">
                Langkah berikutnya
              </span>
            )}
            {judul}
          </p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-teks">
            {keterangan}
          </p>
        </div>
        {tautan && labelTautan && (
          <Link
            href={tautan}
            className={
              "shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold transition " +
              (jenis === "sorot"
                ? "bg-amber-700 text-white hover:bg-amber-800"
                : "bg-biru text-white hover:bg-biru-tua")
            }
          >
            {labelTautan}
          </Link>
        )}
      </div>
    </div>
  );
}

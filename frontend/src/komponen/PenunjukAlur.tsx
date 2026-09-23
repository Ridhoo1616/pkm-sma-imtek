import Link from "next/link";

/**
 * Penunjuk alur pendaftaran, dipasang di atas halaman-halaman PPDB.
 *
 * Gunanya satu: pengunjung langsung tahu ia ada di tahap mana dan apa
 * berikutnya, tanpa harus membaca seluruh halaman lebih dulu. Tahap yang
 * sudah lewat diberi tanda centang, tahap sekarang disorot, dan tahap yang
 * belum tercapai dibiarkan pudar sekaligus tidak dapat diklik bila memang
 * belum bisa dibuka.
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
  ppdbDibuka = true,
}: {
  aktif: TahapAlur;
  /** Bila pendaftaran tutup, tahap formulir tidak dapat dibuka. */
  ppdbDibuka?: boolean;
}) {
  const indeksAktif = TAHAP.findIndex((t) => t.kunci === aktif);

  return (
    <nav
      aria-label="Alur pendaftaran"
      className="tanpa-cetak border-b border-garis bg-white"
    >
      <ol className="wadah flex snap-x gap-2 overflow-x-auto py-3.5">
        {TAHAP.map((t, i) => {
          const sudah = i < indeksAktif;
          const sekarang = i === indeksAktif;
          const bisaDibuka = t.kunci !== "daftar" || ppdbDibuka;

          const isi = (
            <>
              <span
                aria-hidden="true"
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums " +
                  (sekarang
                    ? "bg-biru-tua text-white"
                    : sudah
                      ? "bg-biru-muda text-biru"
                      : "bg-slate-100 text-slate-400")
                }
              >
                {sudah ? "✓" : i + 1}
              </span>
              <span className="whitespace-nowrap">{t.label}</span>
            </>
          );

          const gaya =
            "flex snap-start items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
            (sekarang
              ? "bg-biru-muda text-biru-tua"
              : sudah
                ? "text-teks hover:bg-biru-muda/60"
                : "text-slate-400");

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
                  title={
                    !bisaDibuka
                      ? "Pendaftaran sedang ditutup"
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
      ? "border-emas/60 bg-emas/10"
      : jenis === "tutup"
        ? "border-garis bg-slate-50"
        : "border-biru/20 bg-biru-muda";

  return (
    <div className={`rounded-kartu border px-6 py-5 ${warna}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-base font-bold text-biru-tua">
            {jenis === "sorot" && (
              <span className="rounded bg-emas px-2 py-0.5 text-xs font-bold text-biru-tua">
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
                ? "bg-emas text-biru-tua hover:bg-emas/80"
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

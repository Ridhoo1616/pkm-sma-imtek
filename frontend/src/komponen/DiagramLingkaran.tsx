import { angka, persen } from "@/lib/format";

/**
 * Diagram lingkaran berlubang beserta keterangannya.
 *
 * Digambar sebagai SVG di sini, bukan memakai pustaka grafik. Pustaka grafik
 * yang ringan pun menambah puluhan sampai ratusan kilobita JavaScript, dan
 * yang dibutuhkan halaman ini cuma satu bentuk: busur dengan panjang tertentu
 * pada satu lingkaran. Itu satu atribut CSS, `stroke-dasharray`, jadi tidak
 * ada yang perlu diimpor.
 *
 * TIDAK MEMAKAI JAVASCRIPT SAMA SEKALI, sehingga dapat dipakai langsung di
 * komponen server dan tetap tergambar utuh pada HTML yang dikirim server.
 *
 * WARNANYA SATU RONA, biru sekolah dengan kepekatan menurun. Diagram
 * lingkaran memang menuntut irisannya dapat dibedakan — itu sebabnya ia tidak
 * bisa seragam sepenuhnya seperti deretan angka di halaman lain — tetapi
 * membedakan dengan kepekatan, bukan dengan rona yang berbeda-beda, membuatnya
 * tetap satu keluarga warna dengan seluruh situs. Urutannya pun bermakna:
 * irisan terbesar paling pekat.
 */
export function DiagramLingkaran({
  data,
  labelKosong = "Belum ada data untuk digambar.",
  formatLabel,
}: {
  data: { label: string; jumlah: number }[];
  labelKosong?: string;
  /** Mengubah label mentah — misalnya "2026-09" — menjadi tulisan yang enak dibaca. */
  formatLabel?: (label: string) => string;
}) {
  const terurut = [...data]
    .filter((d) => d.jumlah > 0)
    .sort((a, b) => b.jumlah - a.jumlah);
  const total = terurut.reduce((j, d) => j + d.jumlah, 0);

  if (total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-garis px-5 py-8 text-center text-sm leading-relaxed text-samar">
        {labelKosong}
      </p>
    );
  }

  // Keliling lingkaran berjari-jari 15,915 hampir tepat 100, sehingga panjang
  // tiap busur dapat dituliskan langsung sebagai persennya. Angka itu
  // 100/(2π), dan dipakai justru supaya tidak ada perhitungan keliling di
  // sini yang bisa salah.
  const JARI = 15.9155;

  // Titik mulai tiap busur adalah jumlah busur sebelumnya. Dihitung dengan
  // reduce, bukan dengan menambah satu variabel di dalam map: mengubah
  // variabel di luar sementara merender melanggar aturan React tentang
  // fungsi render yang harus bersih, dan penyusun kodenya menolak.
  const irisan = terurut.reduce<
    {
      label: string;
      jumlah: number;
      bagian: number;
      mulai: number;
      alfa: number;
    }[]
  >((kumpul, d, i) => {
    const bagian = (d.jumlah / total) * 100;
    const mulai = kumpul.reduce((j, s) => j + s.bagian, 0);
    // Kepekatan menurun dari irisan terbesar ke terkecil, dibatasi 0,22
    // supaya irisan terkecil pun masih terbaca di atas latar putih.
    const alfa = Math.max(
      1 - i * (0.78 / Math.max(terurut.length - 1, 1)),
      0.22,
    );
    return [
      ...kumpul,
      { label: d.label, jumlah: d.jumlah, bagian, mulai, alfa },
    ];
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <svg
        viewBox="0 0 40 40"
        className="h-40 w-40 shrink-0 -rotate-90"
        role="img"
        aria-label={`Diagram lingkaran, ${irisan.length} bagian, total ${angka(total)}`}
      >
        {irisan.map((s) => (
          <circle
            key={s.label}
            cx="20"
            cy="20"
            r={JARI}
            fill="none"
            stroke="var(--color-biru)"
            strokeOpacity={s.alfa}
            strokeWidth="9"
            // Busur sepanjang bagiannya, lalu sisanya kosong; digeser ke
            // tempatnya lewat dashoffset yang negatif.
            strokeDasharray={`${s.bagian} ${100 - s.bagian}`}
            strokeDashoffset={-s.mulai}
          />
        ))}
        <text
          x="20"
          y="20"
          // Teksnya diputar balik karena lingkarannya diputar -90 derajat.
          transform="rotate(90 20 20)"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-biru-tua text-[6px] font-bold"
        >
          {angka(total)}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-2">
        {irisan.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm bg-biru"
              style={{ opacity: s.alfa }}
            />
            <span className="min-w-0 flex-1 truncate text-teks">
              {formatLabel ? formatLabel(s.label) : s.label}
            </span>
            <span className="shrink-0 font-semibold text-biru-tua tabular-nums">
              {angka(s.jumlah)}
            </span>
            <span className="w-11 shrink-0 text-right text-xs text-samar tabular-nums">
              {persen(s.jumlah, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

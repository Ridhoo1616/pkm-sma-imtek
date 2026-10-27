import { IkonJam } from "@/komponen/Ikon";

/**
 * Satu paragraf naskah, yang ditampilkan sesuai bentuk isinya.
 *
 * Sekolah menulis naskah di satu kotak teks, jadi daftar seperti jam sekolah,
 * seragam, atau mata pelajaran berupa baris-baris "Label: nilai". Ditampilkan
 * apa adanya, daftar itu terbaca sebagai tembok teks. Di sini bentuknya
 * dikenali dari isinya sendiri, tanpa penanda tambahan yang harus dihafal
 * panitia:
 *
 *  - setiap baris "Nama: 108 JP (81 intrakurikuler, 27 kokurikuler)"
 *    menjadi daftar mata pelajaran dengan batang JP;
 *  - setiap baris "Label: nilai" menjadi kartu-kartu kecil; bila judul
 *    bagiannya menyebut jam atau seragam, kartunya diberi ikon jam atau
 *    contoh warna seragam;
 *  - selain itu tetap paragraf biasa.
 *
 * Paragraf yang hanya sebagian barisnya cocok tetap ditampilkan sebagai
 * paragraf, supaya tidak ada baris yang hilang.
 */

const POLA_JP =
  /^(.+?):\s*(\d+)\s*JP(?:\s*\((\d+)\s*intrakurikuler,\s*(\d+)\s*kokurikuler\))?\.?$/i;
const POLA_LABEL = /^([^:]{1,40}):\s+(.+)$/;

interface Props {
  teks: string;
  /** Judul bagian tempat paragraf ini berada, untuk memilih hiasannya. */
  judul?: string;
  /** Kelas paragraf biasa, mengikuti ukuran huruf halaman pemakainya. */
  className?: string;
}

export default function ParagrafNaskah({ teks, judul = "", className }: Props) {
  const baris = teks
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  if (baris.length >= 3 && baris.every((b) => POLA_JP.test(b))) {
    return <DaftarJp baris={baris} />;
  }
  if (baris.length >= 2 && baris.every((b) => POLA_LABEL.test(b))) {
    return <KartuLabel baris={baris} judul={judul} />;
  }
  return (
    <p className={className ?? "text-[15px] leading-relaxed whitespace-pre-line text-teks"}>
      {teks}
    </p>
  );
}

/* ---------------- mata pelajaran ---------------- */

function DaftarJp({ baris }: { baris: string[] }) {
  const mapel = baris.map((b) => {
    const m = b.match(POLA_JP)!;
    return {
      nama: m[1].trim(),
      total: Number(m[2]),
      intra: m[3] ? Number(m[3]) : null,
      ko: m[4] ? Number(m[4]) : null,
    };
  });
  const terbesar = Math.max(...mapel.map((m) => m.total));
  const jumlah = mapel.reduce((n, m) => n + m.total, 0);

  return (
    <div className="not-prose overflow-hidden rounded-2xl border border-garis bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-garis bg-biru-muda/60 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-biru-tua px-3 py-1 text-xs font-bold text-white">
            {mapel.length} mata pelajaran
          </span>
          <span className="rounded-full bg-emas px-3 py-1 text-xs font-bold text-biru-tua tabular-nums">
            {jumlah.toLocaleString("id-ID")} JP
          </span>
        </div>
        <div className="flex gap-4 text-xs text-samar">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-biru" />
            Intrakurikuler
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-emas" />
            Kokurikuler
          </span>
        </div>
      </div>

      <ol className="divide-y divide-garis">
        {mapel.map((m, i) => {
          const lebar = (m.total / terbesar) * 100;
          const bagianIntra = m.intra !== null && m.total > 0 ? (m.intra / m.total) * 100 : 100;
          return (
            <li key={m.nama} className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 px-5 py-3">
              <span className="text-xs font-bold text-samar tabular-nums">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-biru-tua">{m.nama}</p>
                <div
                  className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-garis/70"
                  aria-hidden
                >
                  <div className="flex h-full" style={{ width: `${lebar}%` }}>
                    <span className="h-full bg-biru" style={{ width: `${bagianIntra}%` }} />
                    {m.ko !== null && <span className="h-full flex-1 bg-emas" />}
                  </div>
                </div>
                {m.intra !== null && m.ko !== null && (
                  <p className="mt-1 text-xs text-samar tabular-nums">
                    {m.intra} intrakurikuler · {m.ko} kokurikuler
                  </p>
                )}
              </div>
              <p className="text-right tabular-nums">
                <span className="text-lg font-bold text-biru-tua">{m.total}</span>
                <span className="ml-1 text-xs font-semibold text-samar">JP</span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------- kartu label: nilai ---------------- */

// Warna kain seragam yang disebut di naskah, dari kiri ke kanan: atasan lalu
// bawahan. Batik tidak punya satu warna, jadi diberi corak.
const KAIN: { kata: RegExp; warna: string; nama: string }[] = [
  { kata: /batik/i, warna: "repeating-linear-gradient(45deg,#0f2a4a 0 4px,#f59e0b 4px 7px,#e8f1fa 7px 10px)", nama: "batik" },
  { kata: /pramuka/i, warna: "#8a6d3b", nama: "pramuka" },
  { kata: /putih/i, warna: "#ffffff", nama: "putih" },
  { kata: /abu/i, warna: "#9aa3ae", nama: "abu-abu" },
  { kata: /hitam/i, warna: "#1f2937", nama: "hitam" },
];

function warnaSeragam(nilai: string): string[] {
  // Urutan kemunculan di kalimat menentukan atasan dan bawahan.
  const ketemu = KAIN.map((k) => ({ ...k, posisi: nilai.search(k.kata) }))
    .filter((k) => k.posisi >= 0)
    .sort((a, b) => a.posisi - b.posisi)
    .map((k) => k.warna);
  // Pramuka satu setel: atasan dan bawahan sama-sama cokelat.
  if (ketemu.length === 1) return [ketemu[0], ketemu[0] === "#8a6d3b" ? "#6b5530" : ketemu[0]];
  return ketemu.slice(0, 2);
}

function KartuLabel({ baris, judul }: { baris: string[]; judul: string }) {
  const butir = baris.map((b) => {
    const m = b.match(POLA_LABEL)!;
    return { label: m[1].trim(), nilai: m[2].trim() };
  });
  const jenis = /seragam/i.test(judul) ? "seragam" : /jam|waktu|pukul/i.test(judul) ? "jam" : "biasa";
  const kolom =
    butir.length === 2
      ? "sm:grid-cols-2"
      : butir.length === 5
        ? "sm:grid-cols-3 lg:grid-cols-5"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <ul className={`not-prose grid gap-3 ${kolom}`}>
      {butir.map((b) => {
        const kain = jenis === "seragam" ? warnaSeragam(b.nilai) : [];
        return (
          <li
            key={b.label}
            className="flex gap-3 rounded-2xl border border-garis bg-white p-4 transition hover:-translate-y-0.5 hover:border-biru/30 hover:shadow-md"
          >
            {jenis === "jam" && (
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-biru-muda text-biru"
              >
                <IkonJam ukuran={22} />
              </span>
            )}
            {kain.length > 0 && (
              <span
                aria-hidden
                className="flex h-14 w-8 shrink-0 flex-col overflow-hidden rounded-lg ring-1 ring-garis"
              >
                {kain.map((w, i) => (
                  <span
                    key={i}
                    className={i === 0 ? "h-1/2" : "flex-1"}
                    style={{ background: w }}
                  />
                ))}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] text-biru uppercase">{b.label}</p>
              <p
                className={
                  jenis === "jam"
                    ? "mt-1 text-xl font-bold text-biru-tua tabular-nums"
                    : "mt-1 text-[15px] leading-snug font-semibold text-biru-tua first-letter:uppercase"
                }
              >
                {jenis === "jam" ? b.nilai.replace(/\s*-\s*/g, " – ") : b.nilai}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

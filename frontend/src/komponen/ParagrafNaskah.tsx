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
 *    menjadi ringkasan angka dan daftar mata pelajaran berbatang;
 *  - setiap baris "Label: 07.00 - 14.50" menjadi garis waktu harian;
 *  - baris "Label: nilai" di bawah judul yang menyebut seragam menjadi
 *    kartu bergambar baju dan celana sewarna kainnya;
 *  - baris "Label: nilai" lainnya menjadi kartu-kartu kecil;
 *  - selain itu tetap paragraf biasa.
 *
 * Paragraf yang hanya sebagian barisnya cocok tetap ditampilkan sebagai
 * paragraf, supaya tidak ada baris yang hilang. Gerak tumbuhnya ada di
 * globals.css (`.batang-tumbuh`, `.muncul-gulir`) dan berupa CSS saja:
 * tanpa dukungan peramban, yang tampil adalah keadaan akhirnya.
 */

const POLA_JP =
  /^(.+?):\s*(\d+)\s*JP(?:\s*\((\d+)\s*intrakurikuler,\s*(\d+)\s*kokurikuler\))?\.?$/i;
const POLA_LABEL = /^([^:]{1,40}):\s+(.+)$/;
const POLA_JAM = /^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/;

interface Props {
  teks: string;
  /** Judul bagian tempat paragraf ini berada, untuk memilih bentuknya. */
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
    const butir = baris.map((b) => {
      const m = b.match(POLA_LABEL)!;
      return { label: m[1].trim(), nilai: m[2].trim() };
    });
    if (butir.every((b) => POLA_JAM.test(b.nilai))) return <GarisWaktu butir={butir} />;
    if (/seragam/i.test(judul)) return <KartuSeragam butir={butir} />;
    return <KartuLabel butir={butir} />;
  }
  return (
    <p className={className ?? "text-[15px] leading-relaxed whitespace-pre-line text-teks"}>
      {teks}
    </p>
  );
}

const kolomKartu = (n: number) =>
  n === 2 ? "sm:grid-cols-2" : n === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3";

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
  const unggulan = mapel.filter((m) => m.total === terbesar).map((m) => m.nama);

  const ringkasan = [
    { angka: String(mapel.length), satuan: "mata pelajaran", catatan: "diajarkan tahun ini" },
    { angka: jumlah.toLocaleString("id-ID"), satuan: "JP", catatan: "jumlah seluruh mata pelajaran" },
    { angka: String(terbesar), satuan: "JP terbanyak", catatan: unggulan.join(" dan ") },
  ];

  return (
    <div className="not-prose space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {ringkasan.map((r, i) => (
          <div
            key={r.satuan}
            className={
              "muncul-gulir rounded-2xl p-4 " +
              (i === 0 ? "bg-biru-tua text-white" : i === 1 ? "bg-emas text-biru-tua" : "border border-garis bg-white text-biru-tua")
            }
          >
            <p className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">{r.angka}</span>
              <span className="text-sm font-semibold opacity-80">{r.satuan}</span>
            </p>
            <p className={"mt-1 text-xs leading-snug " + (i === 0 ? "text-white/70" : i === 1 ? "text-biru-tua/70" : "text-samar")}>
              {r.catatan}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-clip rounded-2xl border border-garis bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-garis bg-biru-muda/60 px-5 py-3">
          <p className="text-xs font-bold tracking-[0.14em] text-biru uppercase">Jam pelajaran per mapel</p>
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
              <li
                key={m.nama}
                className="group grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 px-5 py-3 transition-colors hover:bg-biru-muda/40"
              >
                <span className="text-xs font-bold text-samar tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-biru-tua">{m.nama}</p>
                  <div className="mt-1.5 h-2 overflow-clip rounded-full bg-garis/70" aria-hidden>
                    <div className="batang-tumbuh flex h-full rounded-full" style={{ width: `${lebar}%` }}>
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
    </div>
  );
}

/* ---------------- jam sekolah ---------------- */

const keMenit = (j: string, m: string) => Number(j) * 60 + Number(m);
const jamTeks = (menit: number) =>
  `${String(Math.floor(menit / 60)).padStart(2, "0")}.${String(menit % 60).padStart(2, "0")}`;
const lama = (menit: number) => {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return [j ? `${j} jam` : "", m ? `${m} menit` : ""].filter(Boolean).join(" ");
};

function GarisWaktu({ butir }: { butir: { label: string; nilai: string }[] }) {
  const baris = butir.map((b) => {
    const m = b.nilai.match(POLA_JAM)!;
    return { label: b.label, mulai: keMenit(m[1], m[2]), selesai: keMenit(m[3], m[4]) };
  });
  // Sumbu dibulatkan ke jam penuh di sekitar jam paling awal dan paling akhir.
  const awal = Math.floor(Math.min(...baris.map((b) => b.mulai)) / 60) * 60;
  const akhir = Math.ceil(Math.max(...baris.map((b) => b.selesai)) / 60) * 60;
  const rentang = akhir - awal;
  const posisi = (menit: number) => ((menit - awal) / rentang) * 100;
  const tanda: number[] = [];
  for (let t = awal; t <= akhir; t += 60) tanda.push(t);

  return (
    <div className="not-prose rounded-2xl border border-garis bg-white p-5 md:p-6">
      <ul className="space-y-5">
        {baris.map((b) => (
          <li key={b.label} className="muncul-gulir grid gap-2 md:grid-cols-[11rem_1fr] md:items-center md:gap-5">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-biru uppercase">{b.label}</p>
              <p className="text-sm text-samar">{lama(b.selesai - b.mulai)}</p>
            </div>
            <div className="relative h-11 rounded-xl bg-biru-muda/70">
              {tanda.map((t) => (
                <span
                  key={t}
                  aria-hidden
                  className="absolute inset-y-1.5 w-px bg-biru/10"
                  style={{ left: `${posisi(t)}%` }}
                />
              ))}
              <div
                className="batang-tumbuh absolute inset-y-1 flex items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-biru-tua to-biru px-3 text-sm font-bold text-white tabular-nums shadow-sm"
                style={{ left: `${posisi(b.mulai)}%`, width: `${posisi(b.selesai) - posisi(b.mulai)}%` }}
              >
                <span>{jamTeks(b.mulai)}</span>
                <span className="text-emas">{jamTeks(b.selesai)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 md:ml-[12.25rem]" aria-hidden>
        <div className="relative h-4 text-[11px] text-samar tabular-nums">
          {tanda.map((t, i) => (
            <span
              key={t}
              // Di layar sempit label tiap jam saling menimpa; yang tampil
              // cukup selang-seling.
              className={"absolute" + (i % 2 === 1 ? " max-sm:hidden" : "")}
              style={{
                left: `${posisi(t)}%`,
                transform: i === 0 ? "none" : i === tanda.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {jamTeks(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- seragam ---------------- */

// Warna kain yang disebut di naskah. Batik tidak punya satu warna, jadi
// diberi corak. Urutan kemunculan di kalimat: atasan lalu bawahan.
const KAIN: { kata: RegExp; warna: string }[] = [
  { kata: /batik/i, warna: "batik" },
  { kata: /pramuka/i, warna: "#8a6d3b" },
  { kata: /putih/i, warna: "#ffffff" },
  { kata: /abu/i, warna: "#9aa3ae" },
  { kata: /hitam/i, warna: "#1f2937" },
];

function warnaKain(nilai: string): { atas: string; bawah: string } | null {
  const ketemu = KAIN.map((k) => ({ ...k, posisi: nilai.search(k.kata) }))
    .filter((k) => k.posisi >= 0)
    .sort((a, b) => a.posisi - b.posisi)
    .map((k) => k.warna);
  if (ketemu.length === 0) return null;
  // Pramuka satu setel: bawahannya cokelat yang lebih tua.
  if (ketemu.length === 1) return { atas: ketemu[0], bawah: ketemu[0] === "#8a6d3b" ? "#6b5530" : ketemu[0] };
  return { atas: ketemu[0], bawah: ketemu[1] };
}

function Busana({ atas, bawah, rompi, kode }: { atas: string; bawah: string; rompi: boolean; kode: string }) {
  const isi = (w: string) => (w === "batik" ? `url(#batik-${kode})` : w);
  return (
    <svg viewBox="0 0 48 64" className="h-24 w-18 shrink-0 drop-shadow-sm" aria-hidden>
      <defs>
        <pattern id={`batik-${kode}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#0f2a4a" />
          <rect width="3" height="8" fill="#f59e0b" />
          <circle cx="5.5" cy="4" r="1.2" fill="#e8f1fa" />
        </pattern>
      </defs>
      {/* celana */}
      <path d="M14 33h20l-1.5 28h-7.5L24 41l-1 20h-7.5z" fill={isi(bawah)} stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />
      {/* baju */}
      <path
        d="M17 4l-11 6 4 10 4-2v16h20V18l4 2 4-10-11-6c-1.5 3-4 4.5-7 4.5S18.5 7 17 4z"
        fill={isi(atas)}
        stroke="#cbd5e1"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {rompi && <path d="M14 18v16h7V12l-4-4zM34 18v16h-7V12l4-4z" fill="#0f2a4a" opacity="0.9" />}
    </svg>
  );
}

function KartuSeragam({ butir }: { butir: { label: string; nilai: string }[] }) {
  return (
    <ul className={`not-prose grid gap-3 ${kolomKartu(butir.length)}`}>
      {butir.map((b, i) => {
        const kain = warnaKain(b.nilai);
        return (
          <li
            key={b.label}
            className="muncul-gulir group flex items-center gap-4 rounded-2xl border border-garis bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-biru/30 hover:shadow-lg sm:flex-col sm:items-start lg:items-center lg:text-center"
          >
            {kain && (
              <span className="grid place-items-center rounded-xl bg-biru-muda/70 px-3 py-2 transition duration-300 group-hover:scale-105 sm:w-full">
                <Busana atas={kain.atas} bawah={kain.bawah} rompi={/rompi/i.test(b.nilai)} kode={String(i)} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] text-biru uppercase">{b.label}</p>
              <p className="mt-1 text-[15px] leading-snug font-semibold text-biru-tua first-letter:uppercase">{b.nilai}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- kartu label: nilai ---------------- */

function KartuLabel({ butir }: { butir: { label: string; nilai: string }[] }) {
  return (
    <ul className={`not-prose grid gap-3 ${kolomKartu(butir.length)}`}>
      {butir.map((b) => (
        <li
          key={b.label}
          className="muncul-gulir rounded-2xl border border-garis bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-biru/30 hover:shadow-md"
        >
          <p className="text-[11px] font-bold tracking-[0.14em] text-biru uppercase">{b.label}</p>
          <p className="mt-1 text-[15px] leading-snug font-semibold text-biru-tua first-letter:uppercase">{b.nilai}</p>
        </li>
      ))}
    </ul>
  );
}

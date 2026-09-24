"use client";

import { useMemo, useState } from "react";
import { MunculNaik } from "@/komponen/Gerak";
import {
  IkonBendera,
  IkonNaskah,
  IkonMatahari,
  IkonFormulir,
  IkonBersama,
  IkonKalender,
  IkonPanahKiri,
  IkonPanahKanan,
} from "@/komponen/Ikon";
import type { Agenda } from "@/lib/tipe";

/**
 * Kalender akademik: penyaring, petak bulan, dan lajur waktu kegiatan.
 *
 * Komponen klien karena penyaring tahun ajaran, perpindahan bulan, dan
 * pemilihan tanggal bekerja tanpa memuat ulang halaman. Satu tahun ajaran
 * berisi puluhan agenda, bukan ribuan, jadi seluruhnya memang dikirim
 * sekaligus dan disaring di peramban.
 *
 * TIDAK ADA SATU TANGGAL PUN YANG DITULIS DI BERKAS INI. Seluruh isinya
 * berasal dari menu Kalender Akademik di panel admin. Yang disediakan di sini
 * tata letaknya: bila sekolah belum mengisi apa pun, petak bulannya tetap
 * tergambar dan lajur waktunya menerangkan bahwa isinya belum ada — bukan
 * halaman kosong, dan bukan tanggal karangan.
 */

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/**
 * Ikon per kategori. Inilah yang membedakan kategori satu dengan lainnya,
 * sebab warnanya sengaja dibuat seragam — lihat keterangan di Ikon.tsx.
 */
const IKON: Record<string, (p: { ukuran?: number }) => React.ReactElement> = {
  Kegiatan: IkonBendera,
  Ujian: IkonNaskah,
  Libur: IkonMatahari,
  PPDB: IkonFormulir,
  Rapat: IkonBersama,
  Lainnya: IkonKalender,
};

/** "2026-05-01" -> Date setempat. Sengaja diurai sendiri, tidak lewat
 *  new Date(teks): bentuk itu dibaca sebagai UTC, sehingga pada zona waktu
 *  di sebelah barat Greenwich tanggalnya mundur satu hari. */
function dariIso(teks: string): Date {
  const [t, b, h] = teks.slice(0, 10).split("-").map(Number);
  return new Date(t, (b || 1) - 1, h || 1);
}

function keIso(d: Date): string {
  const b = String(d.getMonth() + 1).padStart(2, "0");
  const h = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${b}-${h}`;
}

/**
 * Tahun ajaran sebuah tanggal, diwakili tahun awalnya.
 *
 * Tahun ajaran di Indonesia dimulai Juli dan berakhir Juni, jadi 20 Desember
 * 2025 dan 5 Januari 2026 berada pada tahun ajaran yang SAMA — 2025/2026.
 * Memakai tahun kalender begitu saja akan memotong satu tahun ajaran menjadi
 * dua, dan libur semester satu terlempar ke tahun yang keliru.
 */
function tahunAjaran(iso: string): number {
  const d = dariIso(iso);
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}

/** "2026-05-01" + "2026-05-06" -> satu baris tanggal yang enak dibaca. */
function rentang(mulai: string, selesai: string): string {
  const a = dariIso(mulai);
  if (!selesai || selesai === mulai) {
    return `${a.getDate()} ${BULAN_SINGKAT[a.getMonth()]} ${a.getFullYear()}`;
  }
  const b = dariIso(selesai);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${b.getDate()} ${BULAN_SINGKAT[b.getMonth()]} ${b.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ${BULAN_SINGKAT[a.getMonth()]} – ${b.getDate()} ${BULAN_SINGKAT[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${a.getDate()} ${BULAN_SINGKAT[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${BULAN_SINGKAT[b.getMonth()]} ${b.getFullYear()}`;
}

/** Kepala bagian: label kecil di atas, judulnya di bawah. Dideklarasikan di
 *  tingkat modul, bukan di dalam komponen: komponen yang dibuat ulang setiap
 *  render akan dilepas dan dipasang ulang oleh React, sehingga keadaannya
 *  hilang dan gerakannya mengulang dari awal. */
function Judul({ atas, judul }: { atas: string; judul: string }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.16em] text-biru uppercase">
        {atas}
      </p>
      <h2 className="mt-1 text-lg font-bold text-biru-tua sm:text-xl">
        {judul}
      </h2>
    </div>
  );
}

/**
 * Satu baris pada lajur waktu: kolom tanggal, rel bertitik, lalu kartunya.
 *
 * Gerak masuknya lewat MunculNaik — memudar naik begitu tergulir sampai
 * terlihat, dengan jeda bertingkat supaya barisnya muncul satu per satu,
 * bukan serempak. Jedanya dipatok delapan baris: lebih dari itu, baris
 * terbawah menunggu terlalu lama dan terbaca sebagai halaman yang lambat.
 */
function BarisAgenda({
  agenda: a,
  urutan,
  pudar = false,
}: {
  agenda: Agenda;
  urutan: number;
  pudar?: boolean;
}) {
  const Ikon = IKON[a.kategori] ?? IkonKalender;
  return (
    <li>
      <MunculNaik
        jeda={Math.min(urutan, 8) * 0.05}
        className={"flex gap-2.5 sm:gap-4 " + (pudar ? "opacity-60" : "")}
      >
        {/* Kolom tanggal hanya muncul mulai ambang sm. Di ponsel tanggalnya
            pindah ke dalam kartu, sebab kolom selebar 6,5 rem memakan hampir
            sepertiga lebar layar dan menyisakan kartu yang sempit. */}
        <p className="hidden w-[6.5rem] shrink-0 self-start rounded-lg border border-garis bg-white px-2 py-2.5 text-center text-xs leading-snug font-bold text-biru-tua tabular-nums sm:block">
          {rentang(a.mulai, a.selesai)}
        </p>

        <div aria-hidden className="relative flex w-3 shrink-0 justify-center">
          <span className="absolute inset-y-0 w-px bg-garis" />
          <span className="relative mt-4 h-3 w-3 rounded-full border-2 border-white bg-biru" />
        </div>

        <div className="gerak-kartu kartu min-w-0 flex-1 p-3.5 sm:p-4">
          <div className="flex gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-biru-muda text-biru"
            >
              <Ikon ukuran={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-biru tabular-nums sm:hidden">
                {rentang(a.mulai, a.selesai)}
              </p>
              <p className="mt-0.5 text-[15px] leading-snug font-bold text-biru-tua sm:mt-0">
                {a.judul}
              </p>
              {a.keterangan && (
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-samar">
                  {a.keterangan}
                </p>
              )}
              <p className="mt-2 inline-flex rounded-md bg-biru-muda px-2 py-0.5 text-[11px] font-bold text-biru">
                {a.kategori}
              </p>
            </div>
          </div>
        </div>
      </MunculNaik>
    </li>
  );
}

export default function KalenderAkademik({ agenda }: { agenda: Agenda[] }) {
  const hariIni = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  /** Tahun ajaran yang benar-benar ada isinya, urut dari yang terbaru. */
  const daftarTa = useMemo(() => {
    const set = new Set(agenda.map((a) => tahunAjaran(a.mulai)));
    return [...set].sort((x, y) => y - x);
  }, [agenda]);

  const taSekarang =
    hariIni.getMonth() >= 6 ? hariIni.getFullYear() : hariIni.getFullYear() - 1;

  const [ta, setTa] = useState<number>(() =>
    daftarTa.includes(taSekarang) ? taSekarang : (daftarTa[0] ?? taSekarang),
  );
  const [kategori, setKategori] = useState("");

  const daftarKategori = useMemo(() => {
    const set = new Set(
      agenda.filter((a) => tahunAjaran(a.mulai) === ta).map((a) => a.kategori),
    );
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [agenda, ta]);

  const terpakai = useMemo(
    () =>
      agenda
        .filter((a) => tahunAjaran(a.mulai) === ta)
        .filter((a) => !kategori || a.kategori === kategori)
        .sort((a, b) => a.mulai.localeCompare(b.mulai)),
    [agenda, ta, kategori],
  );

  /** Dua belas bulan tahun ajaran terpilih, Juli sampai Juni. */
  const bulanTa = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const b = (6 + i) % 12;
        return { tahun: b >= 6 ? ta : ta + 1, bulan: b };
      }),
    [ta],
  );

  /** Bulan yang sedang tampil, sebagai nomor urut di dalam tahun ajaran. */
  const [indeksBulan, setIndeksBulan] = useState(0);

  /**
   * Tanggal yang dibuka rinciannya.
   *
   * `null` berarti "pakai bawaannya" — hari ini bila ada kegiatannya, kalau
   * tidak, kegiatan pertama pada bulan yang tampil. Rincian yang sudah
   * terbuka sejak awal membuat kolom kanan langsung berisi, bukan kotak
   * kosong yang menunggu diketuk. String kosong berarti pengunjung memang
   * menutupnya sendiri, dan itu dihormati.
   */
  const [pilihHari, setPilihHari] = useState<string | null>(null);
  const [tampilLewat, setTampilLewat] = useState(false);

  // Saat tahun ajaran atau saringan kategori berubah, bulan yang tampil
  // dikembalikan ke bulan kegiatan pertama — bukan ke Juli begitu saja,
  // supaya yang terlihat langsung bulan yang memang ada isinya.
  const kunci = `${ta}|${kategori}`;
  const [kunciTerakhir, setKunciTerakhir] = useState("");
  if (kunci !== kunciTerakhir) {
    setKunciTerakhir(kunci);
    const acuan =
      terpakai.find((a) => dariIso(a.selesai || a.mulai) >= hariIni) ??
      terpakai[0];
    const d = acuan ? dariIso(acuan.mulai) : hariIni;
    const i = bulanTa.findIndex(
      (b) => b.tahun === d.getFullYear() && b.bulan === d.getMonth(),
    );
    setIndeksBulan(i < 0 ? 0 : i);
    setPilihHari(null);
    setTampilLewat(false);
  }

  const bulanTampil = bulanTa[indeksBulan] ?? bulanTa[0];

  // Pindah bulan mengembalikan rinciannya ke bawaan bulan yang baru;
  // membiarkan pilihan bulan lalu berarti rincian yang tampil bukan milik
  // bulan yang sedang dilihat.
  const [bulanTerakhir, setBulanTerakhir] = useState(indeksBulan);
  if (indeksBulan !== bulanTerakhir) {
    setBulanTerakhir(indeksBulan);
    setPilihHari(null);
  }

  /** Kegiatan per tanggal pada bulan yang tampil. Kegiatan berhari-hari
   *  menandai SELURUH hari dalam rentangnya, bukan hari mulainya saja. */
  const perHari = useMemo(() => {
    const peta = new Map<string, Agenda[]>();
    for (const a of terpakai) {
      const mulai = dariIso(a.mulai);
      const selesai = dariIso(a.selesai || a.mulai);
      for (const d = new Date(mulai); d <= selesai; d.setDate(d.getDate() + 1)) {
        const k = keIso(d);
        const isi = peta.get(k);
        if (isi) isi.push(a);
        else peta.set(k, [a]);
      }
    }
    return peta;
  }, [terpakai]);

  /** Petak bulan, dimulai hari Minggu. Jumlah barisnya mengikuti isinya,
   *  tidak dipaksa enam, supaya tidak ada baris kosong yang memanjangkan
   *  halaman di layar ponsel. */
  const petak = useMemo(() => {
    const { tahun, bulan } = bulanTampil;
    const awal = new Date(tahun, bulan, 1);
    const geser = awal.getDay();
    const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
    const baris = Math.ceil((geser + jumlahHari) / 7);
    return Array.from({ length: baris * 7 }, (_, i) => {
      const d = new Date(tahun, bulan, i - geser + 1);
      return { tanggal: d, bulanIni: d.getMonth() === bulan };
    });
  }, [bulanTampil]);

  /** Tanggal bawaan yang rinciannya dibuka: hari ini bila ada isinya dan
   *  masih di bulan yang tampil, kalau tidak, hari berisi yang pertama. */
  const bawaanHari = useMemo(() => {
    const iniIso = keIso(hariIni);
    const cocokBulan =
      hariIni.getMonth() === bulanTampil.bulan &&
      hariIni.getFullYear() === bulanTampil.tahun;
    if (cocokBulan && perHari.has(iniIso)) return iniIso;
    for (const { tanggal, bulanIni } of petak) {
      if (!bulanIni) continue;
      const k = keIso(tanggal);
      if (perHari.has(k)) return k;
    }
    return null;
  }, [perHari, petak, bulanTampil, hariIni]);

  const hariAktif = pilihHari === null ? bawaanHari : pilihHari || null;
  const kegiatanTerpilih = hariAktif ? (perHari.get(hariAktif) ?? []) : [];

  /** Yang sudah berlangsung dipisah dan disembunyikan di balik tombol.
   *  Sebagian besar pengunjung mencari tanggal yang BELUM lewat, dan pada
   *  tahun ajaran yang sedang berjalan separuh daftarnya bisa sudah lewat —
   *  di layar ponsel itu ratusan piksel gulir yang jarang dibaca. */
  const mendatang = terpakai.filter(
    (a) => dariIso(a.selesai || a.mulai) >= hariIni,
  );
  const lewat = terpakai
    .filter((a) => dariIso(a.selesai || a.mulai) < hariIni)
    .reverse();

  return (
    <div className="space-y-6">
      {/* Penyaring, berdiri sendiri DI LUAR kartu pembuka. Pada rancangan
          acuan pemilih tahun ajaran menempel di kepala halaman; di sini ia
          turun ke sini bersama penyaring kategorinya, supaya kepala
          halamannya cuma berisi judul dan keterangannya. */}
      <div className="kartu grid gap-3 p-4 sm:grid-cols-[1fr_1fr] sm:p-5 lg:grid-cols-[16rem_16rem_1fr] lg:items-end">
        <div>
          <label
            htmlFor="ta-kalender"
            className="mb-1.5 block text-sm font-semibold text-teks"
          >
            Tahun ajaran
          </label>
          <select
            id="ta-kalender"
            value={ta}
            onChange={(e) => setTa(Number(e.target.value))}
            className="w-full rounded-lg border border-garis bg-white px-4 py-2.5 text-[15px] outline-none focus:border-biru focus:ring-2 focus:ring-biru/20"
          >
            {(daftarTa.length ? daftarTa : [taSekarang]).map((t) => (
              <option key={t} value={t}>
                {t}/{t + 1}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="kategori-kalender"
            className="mb-1.5 block text-sm font-semibold text-teks"
          >
            Kategori
          </label>
          <select
            id="kategori-kalender"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="w-full rounded-lg border border-garis bg-white px-4 py-2.5 text-[15px] outline-none focus:border-biru focus:ring-2 focus:ring-biru/20"
          >
            <option value="">Semua kategori</option>
            {daftarKategori.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm leading-relaxed text-samar sm:col-span-2 lg:col-span-1 lg:text-right">
          {terpakai.length === 0
            ? "Belum ada kegiatan tercatat pada pilihan ini."
            : `${terpakai.length} kegiatan tercatat pada tahun ajaran ${ta}/${ta + 1}.`}
        </p>
      </div>

      {/* Di layar lebar: lajur waktu di kiri, petak bulan di kanan. Di ponsel
          petak bulannya naik ke atas (order-1) karena ia ringkasan satu bulan
          dalam satu layar, sedangkan lajur waktunya panjang — yang panjang
          ditaruh sesudah yang ringkas. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_23rem] lg:items-start">
        {/* ---------- lajur waktu ---------- */}
        <section
          aria-labelledby="judul-lajur"
          className="order-2 lg:order-1"
        >
          <div className="kartu p-4 sm:p-6">
            <div id="judul-lajur">
              <Judul atas="Rangkaian kegiatan" judul="Kalender Akademik" />
              <p className="mt-1.5 text-sm leading-relaxed text-samar">
                Seluruh kegiatan menurut urutan tanggal pelaksanaannya.
              </p>
            </div>

            {terpakai.length === 0 ? (
              <p className="mt-6 rounded-lg border border-dashed border-garis px-5 py-6 text-center text-sm leading-relaxed text-samar">
                Belum ada kegiatan yang tercatat untuk pilihan ini. Tanggalnya
                diisi lewat menu Kalender Akademik di panel admin, dan hanya
                boleh berasal dari keputusan sekolah.
              </p>
            ) : (
              <>
                {mendatang.length > 0 && (
                  <ol className="mt-6 space-y-3">
                    {mendatang.map((a, i) => (
                      <BarisAgenda key={a.id} agenda={a} urutan={i} />
                    ))}
                  </ol>
                )}

                {mendatang.length === 0 && (
                  <p className="mt-6 rounded-lg border border-dashed border-garis px-5 py-6 text-center text-sm leading-relaxed text-samar">
                    Seluruh kegiatan pada tahun ajaran ini sudah berlangsung.
                  </p>
                )}

                {lewat.length > 0 &&
                  (tampilLewat ? (
                    <div className="mt-8">
                      <h3 className="text-xs font-bold tracking-[0.16em] text-samar uppercase">
                        Sudah berlangsung
                      </h3>
                      <ol className="mt-3 space-y-3">
                        {lewat.map((a, i) => (
                          <BarisAgenda
                            key={a.id}
                            agenda={a}
                            urutan={i}
                            pudar
                          />
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => setTampilLewat(true)}
                        className="rounded-lg border border-garis bg-white px-5 py-2.5 text-sm font-semibold text-biru transition hover:border-biru hover:bg-biru-muda"
                      >
                        Tampilkan {lewat.length} kegiatan yang sudah
                        berlangsung
                      </button>
                    </div>
                  ))}
              </>
            )}
          </div>
        </section>

        {/* ---------- petak bulan beserta rincian harinya ---------- */}
        <div className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-24">
          <MunculNaik>
            <section aria-labelledby="judul-petak" className="kartu p-4 sm:p-5">
              <div id="judul-petak" className="flex items-start justify-between gap-3">
                <Judul atas="Satu bulan" judul="Kalender" />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIndeksBulan((i) => Math.max(0, i - 1))}
                    disabled={indeksBulan === 0}
                    aria-label="Bulan sebelumnya"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-garis text-biru transition hover:border-biru hover:bg-biru-muda disabled:opacity-35 disabled:hover:border-garis disabled:hover:bg-transparent"
                  >
                    <IkonPanahKiri ukuran={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndeksBulan((i) => Math.min(11, i + 1))}
                    disabled={indeksBulan === 11}
                    aria-label="Bulan berikutnya"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-garis text-biru transition hover:border-biru hover:bg-biru-muda disabled:opacity-35 disabled:hover:border-garis disabled:hover:bg-transparent"
                  >
                    <IkonPanahKanan ukuran={18} />
                  </button>
                </div>
              </div>

              <label htmlFor="bulan-kalender" className="sr-only">
                Pilih bulan
              </label>
              <select
                id="bulan-kalender"
                value={indeksBulan}
                onChange={(e) => setIndeksBulan(Number(e.target.value))}
                className="mt-3 w-full rounded-lg border border-garis bg-white px-4 py-2.5 text-[15px] font-semibold text-biru-tua outline-none focus:border-biru focus:ring-2 focus:ring-biru/20"
              >
                {bulanTa.map((b, i) => (
                  <option key={i} value={i}>
                    {BULAN[b.bulan]} {b.tahun}
                  </option>
                ))}
              </select>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {HARI.map((h) => (
                  <div key={h} className="py-1.5 text-[11px] font-bold text-samar">
                    {h}
                  </div>
                ))}

                {petak.map(({ tanggal, bulanIni }, i) => {
                  const iso = keIso(tanggal);
                  const isi = perHari.get(iso) ?? [];
                  const ini = tanggal.getTime() === hariIni.getTime();
                  const dipilih = hariAktif === iso;
                  const bisa = isi.length > 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!bisa}
                      onClick={() => setPilihHari(dipilih ? "" : iso)}
                      aria-pressed={dipilih}
                      aria-label={`${tanggal.getDate()} ${BULAN[tanggal.getMonth()]} ${tanggal.getFullYear()}${
                        bisa ? `, ${isi.length} kegiatan` : ", tidak ada kegiatan"
                      }`}
                      // Tinggi 44 piksel: itu ukuran sasaran sentuh terkecil
                      // yang nyaman di ponsel, dan petak ini memang dipakai
                      // dengan jempol.
                      className={
                        "relative grid h-11 place-items-center rounded-lg text-sm tabular-nums transition " +
                        (dipilih
                          ? "bg-biru font-bold text-white"
                          : bulanIni
                            ? "text-teks"
                            : "text-samar/45") +
                        (bisa && !dipilih ? " font-bold hover:bg-biru-muda" : "") +
                        (ini && !dipilih ? " ring-2 ring-biru/45 ring-inset" : "") +
                        (!bisa ? " cursor-default" : "")
                      }
                    >
                      <span className={bisa ? "-mt-1" : ""}>
                        {tanggal.getDate()}
                      </span>
                      {bisa && (
                        <span
                          aria-hidden
                          className="absolute bottom-1.5 flex gap-0.5"
                        >
                          {/* Titiknya seragam biru, banyaknya sampai tiga.
                              Rancangan acuan memberi warna berbeda per
                              kategori; di sini kategorinya dibaca di rincian
                              hari dan pada lajur waktunya. */}
                          {isi.slice(0, 3).map((_, k) => (
                            <span
                              key={k}
                              className={
                                "h-1 w-1 rounded-full " +
                                (dipilih ? "bg-white" : "bg-biru")
                              }
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-center text-xs leading-relaxed text-samar">
                Tanggal bertitik berisi kegiatan. Ketuk untuk melihat
                rinciannya.
              </p>
            </section>
          </MunculNaik>

          {kegiatanTerpilih.length > 0 && (
            <MunculNaik>
              <section
                aria-live="polite"
                className="kartu p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-biru-tua">
                    {(() => {
                      const d = dariIso(hariAktif!);
                      return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
                    })()}
                  </h2>
                  <span className="rounded-md bg-biru-muda px-2 py-0.5 text-[11px] font-bold text-biru">
                    {kegiatanTerpilih.length} kegiatan
                  </span>
                </div>

                <ul className="mt-4 space-y-3">
                  {kegiatanTerpilih.map((a) => {
                    const Ikon = IKON[a.kategori] ?? IkonKalender;
                    return (
                      <li
                        key={a.id}
                        className="flex gap-3 rounded-lg bg-biru-muda/45 p-3"
                      >
                        <span
                          aria-hidden
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-biru"
                        >
                          <Ikon ukuran={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug font-bold text-biru-tua">
                            {a.judul}
                          </p>
                          <p className="mt-0.5 text-xs text-biru tabular-nums">
                            {rentang(a.mulai, a.selesai)} · {a.kategori}
                          </p>
                          {a.keterangan && (
                            <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-samar">
                              {a.keterangan}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </MunculNaik>
          )}
        </div>
      </div>
    </div>
  );
}

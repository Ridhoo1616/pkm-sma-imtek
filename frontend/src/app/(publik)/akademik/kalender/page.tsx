import { api } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { tanggalPanjang } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Agenda } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalender Akademik",
  description: "Tanggal kegiatan, ujian, hari libur, dan jadwal PPDB sekolah.",
};

/** Warna lencana per kategori, supaya kalender terbaca dalam sekali pandang. */
const WARNA: Record<string, string> = {
  Ujian: "bg-amber-100 text-amber-900 border-amber-200",
  Libur: "bg-red-100 text-red-800 border-red-200",
  PPDB: "bg-blue-100 text-blue-800 border-blue-200",
  Rapat: "bg-slate-100 text-slate-700 border-slate-200",
  Kegiatan: "bg-green-100 text-green-800 border-green-200",
};

/** "2026-05-01" + "2026-05-06" -> satu baris tanggal yang enak dibaca. */
function rentang(mulai: string, selesai: string): string {
  if (!selesai || selesai === mulai) return tanggalPanjang(mulai);
  const a = new Date(mulai);
  const b = new Date(selesai);
  // Bulan dan tahun yang sama tidak perlu diulang dua kali.
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${tanggalPanjang(selesai)}`;
  }
  return `${tanggalPanjang(mulai)} – ${tanggalPanjang(selesai)}`;
}

export default async function HalamanKalender() {
  const [hasil, { profil }] = await Promise.all([
    api.agenda().catch((): { data: Agenda[]; kategori: string[] } => ({
      data: [],
      kategori: [],
    })),
    muatProfil(),
  ]);

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  // Kegiatan yang sudah lewat tetap ditampilkan, tetapi dipisah ke bawah:
  // orang tua kadang perlu memastikan tanggal yang sudah berjalan.
  const akhir = (a: Agenda) => new Date(a.selesai || a.mulai);
  const mendatang = hasil.data.filter((a) => akhir(a) >= hariIni);
  const lewat = hasil.data.filter((a) => akhir(a) < hariIni).reverse();

  const Baris = ({ a, pudar }: { a: Agenda; pudar?: boolean }) => (
    <li
      className={
        "grid gap-2 px-6 py-4 sm:grid-cols-[13rem_1fr] sm:gap-5 " +
        (pudar ? "opacity-65" : "")
      }
    >
      <p className="text-sm font-semibold text-biru-tua tabular-nums">
        {rentang(a.mulai, a.selesai)}
      </p>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-teks">
          {a.judul}
          <span
            className={
              "rounded-full border px-2 py-0.5 text-xs font-semibold " +
              (WARNA[a.kategori] ?? "border-garis bg-slate-100 text-slate-700")
            }
          >
            {a.kategori}
          </span>
        </p>
        {a.keterangan && (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-samar">
            {a.keterangan}
          </p>
        )}
      </div>
    </li>
  );

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

        {hasil.data.length === 0 ? (
          <div className="mt-8">
            <TanpaData
              judul="Kalender akademik belum diisi"
              keterangan="Tanggal kegiatan diisi lewat menu Kalender Akademik di panel admin. Tanggalnya hanya boleh berasal dari keputusan sekolah."
            />
          </div>
        ) : (
          <div className="mt-8 max-w-4xl space-y-10">
            <MunculNaik>
              <section className="kartu overflow-hidden">
                <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                  Kegiatan mendatang
                </h2>
                {mendatang.length === 0 ? (
                  <p className="px-6 py-5 text-sm leading-relaxed text-samar">
                    Tidak ada kegiatan mendatang yang tercatat. Kegiatan yang
                    sudah berlangsung dapat dilihat di bawah.
                  </p>
                ) : (
                  <ul className="divide-y divide-garis">
                    {mendatang.map((a) => (
                      <Baris key={a.id} a={a} />
                    ))}
                  </ul>
                )}
              </section>
            </MunculNaik>

            {lewat.length > 0 && (
              <MunculNaik>
                <section className="kartu overflow-hidden">
                  <h2 className="border-b border-garis bg-slate-50 px-6 py-4 text-base text-samar">
                    Sudah berlangsung
                  </h2>
                  <ul className="divide-y divide-garis">
                    {lewat.map((a) => (
                      <Baris key={a.id} a={a} pudar />
                    ))}
                  </ul>
                </section>
              </MunculNaik>
            )}
          </div>
        )}
      </div>
    </>
  );
}

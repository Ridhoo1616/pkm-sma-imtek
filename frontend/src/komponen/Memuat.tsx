/** Penanda tunggu dan keadaan kosong yang dipakai berulang di banyak halaman. */

import { ukuranBerkas } from "@/lib/format";

export function Memuat({ pesan = "Memuat data..." }: { pesan?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-samar">
      <span
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-garis border-t-biru"
        aria-hidden
      />
      <span>{pesan}</span>
    </div>
  );
}

export function TanpaData({
  judul,
  keterangan,
}: {
  judul: string;
  keterangan?: string;
}) {
  return (
    <div className="kartu px-6 py-14 text-center">
      <p className="text-lg font-semibold text-biru-tua">{judul}</p>
      {keterangan && <p className="mt-2 text-sm text-samar">{keterangan}</p>}
    </div>
  );
}

/** Pesan galat yang bisa dicoba ulang. */
export function PesanGalat({
  pesan,
  ulangi,
}: {
  pesan: string;
  ulangi?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-kartu border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
    >
      <p>{pesan}</p>
      {ulangi && (
        <button
          type="button"
          onClick={ulangi}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-800 hover:bg-red-100"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function PesanBerhasil({ pesan }: { pesan: string }) {
  return (
    <div
      role="status"
      className="rounded-kartu border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800"
    >
      {pesan}
    </div>
  );
}

/**
 * Bilah kemajuan unggahan.
 *
 * Yang digerakkan `transform: scaleX`, bukan `width`, sebab mengubah lebar
 * memaksa peramban menghitung ulang tata letak pada setiap rangka; pada
 * ponsel murah itu tersendat justru ketika sedang mengunggah. `scaleX`
 * dikerjakan penyusun gambar tanpa menyentuh tata letaknya.
 *
 * Tidak dimatikan pada setelan "kurangi gerak". Yang dikurangi setelan itu
 * gerak yang menghias; bilah ini memberi tahu keadaan, dan menghilangkannya
 * berarti menghilangkan keterangan. Yang dihilangkan hanya kehalusan
 * peralihannya, lewat CSS.
 */
export function BilahKemajuan({
  persen,
  judul,
  keterangan,
  tanpaAngka = false,
}: {
  persen: number;
  judul: string;
  keterangan?: string;
  /** Untuk tahap yang lamanya tidak diketahui: bilahnya penuh, angkanya tidak ditulis. */
  tanpaAngka?: boolean;
}) {
  const nilai = Math.max(0, Math.min(100, Math.round(persen)));
  return (
    <div className="rounded-lg border border-garis bg-biru-muda/40 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-biru-tua">{judul}</p>
        {!tanpaAngka && (
          <p className="text-sm font-bold text-biru tabular-nums">{nilai}%</p>
        )}
      </div>

      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={tanpaAngka ? undefined : nilai}
        aria-label={judul}
      >
        <div
          className="bilah-kemajuan h-full origin-left rounded-full bg-biru"
          style={{ transform: `scaleX(${nilai / 100})` }}
        />
      </div>

      {keterangan && (
        <p className="mt-2 text-xs text-samar tabular-nums">{keterangan}</p>
      )}
    </div>
  );
}

/**
 * Bilah kemajuan khusus unggahan berkas, yang menuliskan sendiri bita dan
 * tahapnya. Dipisah dari BilahKemajuan supaya kalimatnya satu tempat.
 */
export function KemajuanKirim({
  tahap,
  persen,
  terkirim,
  total,
}: {
  tahap: "mengunggah" | "menyimpan";
  persen: number;
  terkirim: number;
  total: number;
}) {
  if (tahap === "menyimpan") {
    return (
      <BilahKemajuan
        persen={100}
        tanpaAngka
        judul="Menyimpan di server..."
        keterangan="Dokumen sudah terkirim seluruhnya. Nomor registrasi sedang diterbitkan; jangan menutup halaman ini."
      />
    );
  }
  return (
    <BilahKemajuan
      persen={persen}
      judul="Mengunggah dokumen..."
      keterangan={
        total > 0
          ? `${ukuranBerkas(terkirim)} dari ${ukuranBerkas(total)} terkirim. Jangan menutup halaman ini.`
          : "Jangan menutup halaman ini."
      }
    />
  );
}

/* ==================================================================
   Kerangka muat

   Pengganti bulatan berputar pada bagian yang bentuknya sudah diketahui.
   Dua untungnya, dan keduanya soal paham, bukan soal cantik:

     1. Tata letaknya tidak melompat. Bulatan berputar di tengah ruang
        kosong punya tinggi yang berbeda dari tabel yang kemudian
        menggantikannya, jadi seluruh halaman menyentak begitu datanya tiba.
        Kerangka menempati ruang yang sama dengan isinya.
     2. Yang melihat tahu APA yang sedang dimuat, bukan cuma bahwa ada
        sesuatu yang dimuat. Bentuk tabel terbaca sebagai tabel sebelum satu
        angka pun datang.

   Denyutnya memakai opacity, bukan warna latar yang bergeser: opacity tidak
   menyentuh tata letak maupun penggambaran ulang, sehingga tetap ringan pada
   ponsel murah. Pada setelan "kurangi gerak", denyutnya berhenti dan
   kerangkanya diam; bentuknya sendiri sudah menyampaikan keadaannya.
   ================================================================== */

/** Satu bidang abu berdenyut. Lebarnya dari kelas yang diberikan pemakainya. */
export function Kerangka({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`kerangka block rounded ${className}`} />;
}

/**
 * Kerangka tabel, dengan jumlah kolom yang sama dengan tabel sesungguhnya.
 *
 * `kepala` diminta apa adanya, bukan hanya jumlah kolomnya, supaya baris
 * kepalanya sudah tampil terbaca sejak awal. Kepala tabel tidak menunggu
 * data: ia sudah diketahui sebelum permintaan dikirim.
 */
export function KerangkaTabel({
  kepala,
  baris = 6,
}: {
  kepala: string[];
  baris?: number;
}) {
  return (
    <div className="kartu overflow-hidden" aria-busy="true">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-garis bg-slate-50 text-left">
              {kepala.map((k, i) => (
                <th
                  key={k || `kolom-${i}`}
                  className="px-4 py-3 text-xs font-bold tracking-wide text-samar uppercase whitespace-nowrap"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {Array.from({ length: baris }, (_, r) => (
              <tr key={r}>
                {kepala.map((k, i) => (
                  <td key={k || `kolom-${i}`} className="px-4 py-3.5">
                    {/* Kolom pertama dibuat lebih panjang, yang terakhir
                        pendek: itu bentuk yang paling sering terjadi pada
                        tabel di panel ini, dan kerangka yang seragam justru
                        terlihat seperti kisi kosong. */}
                    <Kerangka
                      className={
                        "h-3.5 " +
                        (i === 0
                          ? "w-28"
                          : i === kepala.length - 1
                            ? "w-10"
                            : "w-20")
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only">Memuat data tabel...</span>
    </div>
  );
}

/** Kerangka daftar kartu, misalnya pesan masuk. */
export function KerangkaKartu({
  jumlah = 3,
  baris = 2,
}: {
  jumlah?: number;
  /** Jumlah baris tulisan yang dikerangkakan di dalam tiap kartu. */
  baris?: number;
}) {
  return (
    <div className="space-y-4" aria-busy="true">
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} className="kartu p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <Kerangka className="h-4 w-1/3" />
              <Kerangka className="h-3 w-1/4" />
            </div>
            <Kerangka className="h-9 w-28 rounded-lg" />
          </div>
          <div className="mt-4 space-y-2 border-t border-garis pt-4">
            {Array.from({ length: baris }, (_, b) => (
              <Kerangka
                key={b}
                className={"h-3 " + (b === baris - 1 ? "w-2/3" : "w-full")}
              />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Memuat daftar...</span>
    </div>
  );
}

/** Kerangka kartu angka, untuk baris ringkasan di dasbor. */
export function KerangkaAngka({ jumlah = 4 }: { jumlah?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} className="kartu px-5 py-4">
          <Kerangka className="h-2.5 w-24" />
          <Kerangka className="mt-3 h-7 w-16" />
        </div>
      ))}
      <span className="sr-only">Memuat ringkasan...</span>
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * Kepala halaman dan judul bagian. Dipisah menjadi komponen agar susunan
 * dan jarak antar bagian tetap sama di seluruh halaman publik.
 */

export function KepalaHalaman({
  judul,
  keterangan,
  anak,
}: {
  judul: string;
  keterangan?: string;
  anak?: ReactNode;
}) {
  return (
    <div className="border-b border-garis bg-biru-muda/60">
      <div className="wadah py-12 md:py-16">
        <h1 className="text-3xl font-bold text-balance md:text-4xl">{judul}</h1>
        {keterangan && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-samar">
            {keterangan}
          </p>
        )}
        {anak && <div className="mt-6">{anak}</div>}
      </div>
    </div>
  );
}

export function JudulBagian({
  atas,
  judul,
  keterangan,
  tengah,
}: {
  atas?: string;
  judul: string;
  keterangan?: string;
  tengah?: boolean;
}) {
  return (
    <div className={`mb-8 ${tengah ? "text-center" : ""}`}>
      {atas && (
        <p className="mb-2 text-xs font-bold tracking-[0.14em] text-biru uppercase">
          {atas}
        </p>
      )}
      <h2 className="text-2xl font-bold text-balance md:text-3xl">{judul}</h2>
      <span
        className={`mt-3 block h-1 w-16 rounded-full bg-emas ${tengah ? "mx-auto" : ""}`}
        aria-hidden
      />
      {keterangan && (
        <p
          className={`mt-4 text-[15px] leading-relaxed text-samar ${
            tengah ? "mx-auto max-w-2xl" : "max-w-2xl"
          }`}
        >
          {keterangan}
        </p>
      )}
    </div>
  );
}

/** Tempat gambar yang belum tersedia; memberi bentuk, bukan kotak kosong. */
export function GambarKosong({
  label,
  tinggi = "h-48",
}: {
  label: string;
  tinggi?: string;
}) {
  return (
    <div
      className={`${tinggi} grid w-full place-items-center bg-biru-muda text-center`}
      aria-hidden
    >
      <span className="px-4 text-xs font-semibold text-biru/60">{label}</span>
    </div>
  );
}

export function Lencana({
  children,
  warna = "bg-biru-muda text-biru border-biru/15",
}: {
  children: ReactNode;
  warna?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${warna}`}
    >
      {children}
    </span>
  );
}

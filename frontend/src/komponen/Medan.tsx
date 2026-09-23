"use client";

import type { ReactNode } from "react";

/**
 * Elemen formulir. Semuanya menerima `galat` berupa pesan per kolom dari
 * backend, sehingga keterangan kesalahan muncul tepat di bawah input yang
 * bersangkutan — bukan hanya sebagai satu tumpukan di atas formulir.
 */

const gayaInput =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-teks " +
  "placeholder:text-samar/70 transition focus:border-biru focus:ring-2 focus:ring-biru/20 " +
  "disabled:bg-slate-50 disabled:text-samar";

function garisTepi(galat?: string) {
  return galat ? "border-red-400 bg-red-50/40" : "border-garis";
}

interface DasarProps {
  nama: string;
  label: string;
  wajib?: boolean;
  galat?: string;
  bantuan?: string;
  className?: string;
}

function Bungkus({
  nama,
  label,
  wajib,
  galat,
  bantuan,
  className,
  children,
}: DasarProps & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={nama} className="mb-1.5 block text-sm font-semibold text-teks">
        {label}
        {wajib ? (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-samar">(opsional)</span>
        )}
      </label>
      {children}
      {bantuan && !galat && <p className="mt-1 text-xs text-samar">{bantuan}</p>}
      {galat && (
        <p id={`${nama}-galat`} className="mt-1 text-xs font-medium text-red-700">
          {galat}
        </p>
      )}
    </div>
  );
}

export function Teks({
  tipe = "text",
  nilai,
  ubah,
  contoh,
  maks,
  ...dasar
}: DasarProps & {
  tipe?: "text" | "email" | "tel" | "date" | "number" | "password" | "datetime-local";
  nilai: string;
  ubah: (v: string) => void;
  contoh?: string;
  maks?: number;
}) {
  return (
    <Bungkus {...dasar}>
      <input
        id={dasar.nama}
        name={dasar.nama}
        type={tipe}
        value={nilai}
        maxLength={maks}
        placeholder={contoh}
        aria-invalid={dasar.galat ? true : undefined}
        aria-describedby={dasar.galat ? `${dasar.nama}-galat` : undefined}
        onChange={(e) => ubah(e.target.value)}
        className={`${gayaInput} ${garisTepi(dasar.galat)}`}
      />
    </Bungkus>
  );
}

export function AreaTeks({
  nilai,
  ubah,
  baris = 4,
  contoh,
  maks,
  ...dasar
}: DasarProps & {
  nilai: string;
  ubah: (v: string) => void;
  baris?: number;
  contoh?: string;
  maks?: number;
}) {
  return (
    <Bungkus {...dasar}>
      <textarea
        id={dasar.nama}
        name={dasar.nama}
        rows={baris}
        value={nilai}
        maxLength={maks}
        placeholder={contoh}
        aria-invalid={dasar.galat ? true : undefined}
        aria-describedby={dasar.galat ? `${dasar.nama}-galat` : undefined}
        onChange={(e) => ubah(e.target.value)}
        className={`${gayaInput} ${garisTepi(dasar.galat)} resize-y`}
      />
    </Bungkus>
  );
}

export function Pilihan({
  nilai,
  ubah,
  opsi,
  kosong = "-- Pilih --",
  ...dasar
}: DasarProps & {
  nilai: string;
  ubah: (v: string) => void;
  /** Daftar pilihan; string biasa atau pasangan nilai-label. */
  opsi: (string | { nilai: string; label: string })[];
  kosong?: string;
}) {
  return (
    <Bungkus {...dasar}>
      <select
        id={dasar.nama}
        name={dasar.nama}
        value={nilai}
        aria-invalid={dasar.galat ? true : undefined}
        aria-describedby={dasar.galat ? `${dasar.nama}-galat` : undefined}
        onChange={(e) => ubah(e.target.value)}
        className={`${gayaInput} ${garisTepi(dasar.galat)}`}
      >
        <option value="">{kosong}</option>
        {opsi.map((o) => {
          const v = typeof o === "string" ? o : o.nilai;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </Bungkus>
  );
}

export function Berkas({
  ubah,
  terima = "image/jpeg,image/png,application/pdf",
  namaTerpilih,
  ...dasar
}: DasarProps & {
  ubah: (f: File | null) => void;
  terima?: string;
  namaTerpilih?: string;
}) {
  return (
    <Bungkus {...dasar}>
      <input
        id={dasar.nama}
        name={dasar.nama}
        type="file"
        accept={terima}
        aria-invalid={dasar.galat ? true : undefined}
        aria-describedby={dasar.galat ? `${dasar.nama}-galat` : undefined}
        onChange={(e) => ubah(e.target.files?.[0] ?? null)}
        className={
          "w-full rounded-lg border px-3.5 py-2 text-sm text-samar " +
          "file:mr-3 file:rounded-md file:border-0 file:bg-biru-muda file:px-3 file:py-1.5 " +
          "file:text-sm file:font-semibold file:text-biru hover:file:bg-biru/10 " +
          garisTepi(dasar.galat)
        }
      />
      {namaTerpilih && (
        <p className="mt-1 text-xs text-samar">
          Berkas tersimpan saat ini: {namaTerpilih}
        </p>
      )}
    </Bungkus>
  );
}

export function Centang({
  nama,
  nilai,
  ubah,
  galat,
  children,
}: {
  nama: string;
  nilai: boolean;
  ubah: (v: boolean) => void;
  galat?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-teks">
        <input
          id={nama}
          name={nama}
          type="checkbox"
          checked={nilai}
          onChange={(e) => ubah(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-garis text-biru focus:ring-biru/30"
        />
        <span>{children}</span>
      </label>
      {galat && <p className="mt-1 text-xs font-medium text-red-700">{galat}</p>}
    </div>
  );
}

export function Tombol({
  children,
  jenis = "utama",
  sedangJalan,
  penuh,
  ...sisa
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  jenis?: "utama" | "kedua" | "bahaya" | "halus";
  sedangJalan?: boolean;
  penuh?: boolean;
}) {
  const gaya = {
    utama: "bg-biru text-white hover:bg-biru-tua",
    kedua: "border border-garis bg-white text-teks hover:bg-biru-muda hover:text-biru",
    bahaya: "bg-red-600 text-white hover:bg-red-700",
    halus: "bg-biru-muda text-biru hover:bg-biru/15",
  }[jenis];

  return (
    <button
      {...sisa}
      disabled={sisa.disabled || sedangJalan}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold " +
        "transition disabled:cursor-not-allowed disabled:opacity-60 " +
        gaya +
        (penuh ? " w-full" : "") +
        (sisa.className ? ` ${sisa.className}` : "")
      }
    >
      {sedangJalan && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/** Ringkasan galat di atas formulir panjang, agar tidak perlu menggulir mencari. */
export function RingkasanGalat({ daftar }: { daftar: string[] }) {
  if (daftar.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-kartu border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
    >
      <p className="font-semibold">
        Ada {daftar.length} hal yang perlu diperbaiki:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {daftar.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
    </div>
  );
}

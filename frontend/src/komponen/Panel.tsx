"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Tombol } from "@/komponen/Medan";

/**
 * Elemen tampilan yang dipakai berulang di panel admin: kepala halaman,
 * kartu angka, tabel, jendela isian, dan konfirmasi hapus.
 */

export function KepalaPanel({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{judul}</h1>
        {keterangan && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-samar">
            {keterangan}
          </p>
        )}
      </div>
      {aksi && <div className="flex flex-wrap gap-2">{aksi}</div>}
    </div>
  );
}

export function KartuAngka({
  label,
  nilai,
  keterangan,
  warna = "text-biru-tua",
}: {
  label: string;
  nilai: string | number;
  keterangan?: string;
  warna?: string;
}) {
  return (
    <div className="kartu px-5 py-5">
      <p className="text-xs font-semibold tracking-wide text-samar uppercase">
        {label}
      </p>
      <p className={`mt-1.5 text-3xl font-bold tabular-nums ${warna}`}>{nilai}</p>
      {keterangan && <p className="mt-1 text-xs text-samar">{keterangan}</p>}
    </div>
  );
}

/** Tabel yang dapat digulir ke samping di layar kecil. */
export function Tabel({
  kepala,
  children,
}: {
  kepala: string[];
  children: ReactNode;
}) {
  return (
    <div className="kartu overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-garis bg-slate-50 text-left">
              {kepala.map((k) => (
                <th
                  key={k}
                  className="px-4 py-3 text-xs font-bold tracking-wide text-samar uppercase whitespace-nowrap"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Jendela isian, dibangun di atas Radix Dialog.
 *
 * Sebelumnya jendela ini buatan sendiri. Radix dipakai karena membawa hal
 * yang sulit ditulis benar sendiri: fokus papan tombol terkurung di dalam
 * jendela selama terbuka, fokus dikembalikan ke tombol pemanggilnya saat
 * ditutup, tombol Escape dan klik latar tertangani, isi di belakangnya
 * disembunyikan dari pembaca layar, dan gulir latar dihentikan.
 *
 * Kelas tampilannya sengaja dibiarkan sama persis dengan versi sebelumnya,
 * jadi tata letaknya tidak berubah sedikit pun.
 */
export function Jendela({
  judul,
  terbuka,
  tutup,
  children,
  lebar = "max-w-2xl",
}: {
  judul: string;
  terbuka: boolean;
  tutup: () => void;
  children: ReactNode;
  lebar?: string;
}) {
  return (
    <Dialog.Root open={terbuka} onOpenChange={(buka) => !buka && tutup()}>
      <Dialog.Portal>
        {/* Wadah gulir diletakkan pada lapisan latar, bukan pada isinya,
            supaya jendela yang lebih tinggi dari layar tetap dapat digulir. */}
        <Dialog.Overlay
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10
                     data-[state=open]:animate-[munculLatar_0.18s_ease-out]"
        >
          <Dialog.Content
            className={`w-full ${lebar} rounded-kartu bg-white shadow-kuat
                        data-[state=open]:animate-[munculJendela_0.2s_ease-out]`}
            // Bawaan Radix memberi fokus ke elemen tabbable pertama, yang di
            // sini adalah tombol tutup. Untuk jendela berisi formulir, fokus
            // lebih berguna jatuh ke kolom pertamanya.
            onOpenAutoFocus={(ev) => {
              const isi = ev.currentTarget as HTMLElement | null;
              const pertama = isi?.querySelector<HTMLElement>(
                "input:not([type=hidden]), select, textarea",
              );
              if (pertama) {
                ev.preventDefault();
                pertama.focus();
              }
            }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-garis px-6 py-4">
              <Dialog.Title className="text-lg">{judul}</Dialog.Title>
              <Dialog.Close
                aria-label="Tutup"
                className="grid h-8 w-8 place-items-center rounded-lg text-samar hover:bg-slate-100 hover:text-teks"
              >
                ×
              </Dialog.Close>
            </div>
            <div className="px-6 py-6">{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Konfirmasi tindakan yang tidak dapat dibatalkan. Dipakai sebagai ganti
 * window.confirm agar keterangan akibatnya dapat ditulis lengkap — penting
 * untuk hapus pendaftar, yang juga menghapus dokumen pribadinya.
 */
export function Konfirmasi({
  terbuka,
  judul,
  pesan,
  labelYa = "Ya, lanjutkan",
  sedangJalan,
  tutup,
  lanjut,
}: {
  terbuka: boolean;
  judul: string;
  pesan: ReactNode;
  labelYa?: string;
  sedangJalan?: boolean;
  tutup: () => void;
  lanjut: () => void;
}) {
  return (
    <Jendela judul={judul} terbuka={terbuka} tutup={tutup} lebar="max-w-lg">
      <div className="space-y-6">
        <div className="text-sm leading-relaxed text-teks">{pesan}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Tombol jenis="kedua" onClick={tutup} disabled={sedangJalan}>
            Batal
          </Tombol>
          <Tombol jenis="bahaya" onClick={lanjut} sedangJalan={sedangJalan}>
            {labelYa}
          </Tombol>
        </div>
      </div>
    </Jendela>
  );
}

/** Bilah nilai untuk grafik sederhana pada dasbor dan laporan. */
export function BarisBilah({
  label,
  jumlah,
  maks,
  keterangan,
  warna = "var(--color-biru)",
}: {
  label: string;
  jumlah: number;
  maks: number;
  keterangan?: string;
  warna?: string;
}) {
  // Pembagi nol menghasilkan nol, bukan NaN maupun bilah penuh.
  const lebar = maks > 0 ? Math.min(Math.round((jumlah / maks) * 100), 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-teks">{label}</span>
        <span className="shrink-0 font-semibold text-biru-tua tabular-nums">
          {jumlah.toLocaleString("id-ID")}
          {keterangan && (
            <span className="ml-1 font-normal text-samar">{keterangan}</span>
          )}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-biru-muda">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${lebar}%`, background: warna }}
        />
      </div>
    </div>
  );
}

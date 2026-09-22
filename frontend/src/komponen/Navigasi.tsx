"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Pengaturan } from "@/lib/tipe";
import { nomorWa } from "@/lib/format";
import { IkonSurel, IkonTelepon, IkonWhatsapp } from "./Ikon";

const MENU = [
  { jalur: "/", label: "Beranda" },
  { jalur: "/profil", label: "Profil" },
  { jalur: "/fasilitas", label: "Fasilitas" },
  { jalur: "/berita", label: "Berita" },
  { jalur: "/galeri", label: "Galeri" },
  { jalur: "/ppdb", label: "Info PPDB" },
  { jalur: "/kontak", label: "Kontak" },
];

export default function Navigasi({
  pengaturan,
  ppdbDibuka,
}: {
  pengaturan: Pengaturan;
  ppdbDibuka: boolean;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const jalurSekarang = usePathname();

  const aktif = (jalur: string) =>
    jalur === "/" ? jalurSekarang === "/" : jalurSekarang.startsWith(jalur);

  const wa = nomorWa(pengaturan.whatsapp ?? "");

  return (
    <header className="tanpa-cetak sticky top-0 z-50">
      {/* Bar atas: jalur hubungi cepat. Disembunyikan di layar kecil agar
          navigasi utama tetap mendapat ruang. */}
      <div className="hidden bg-biru-tua text-white md:block">
        <div className="wadah flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
          <div className="flex items-center gap-5">
            {pengaturan.telepon && (
              <a
                href={`tel:${pengaturan.telepon}`}
                className="flex items-center gap-1.5 opacity-85 hover:opacity-100 hover:text-emas"
              >
                <IkonTelepon ukuran={14} className="shrink-0" />
                {pengaturan.telepon}
              </a>
            )}
            {pengaturan.email && (
              <a
                href={`mailto:${pengaturan.email}`}
                className="flex items-center gap-1.5 opacity-85 hover:opacity-100 hover:text-emas"
              >
                <IkonSurel ukuran={14} className="shrink-0" />
                {pengaturan.email}
              </a>
            )}
          </div>
          <div className="flex items-center gap-5">
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 opacity-85 hover:opacity-100 hover:text-emas"
              >
                <IkonWhatsapp ukuran={14} className="shrink-0" />
                WhatsApp Panitia
              </a>
            )}
            <Link href="/admin" className="opacity-85 hover:opacity-100 hover:text-emas">
              Masuk Petugas
            </Link>
          </div>
        </div>
      </div>

      <nav className="border-b border-garis bg-white shadow-lembut">
        <div className="wadah flex items-center justify-between gap-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-biru text-lg font-bold text-white"
              aria-hidden
            >
              {(pengaturan.nama_singkat || "SI").slice(0, 2).toUpperCase()}
            </span>
            <span className="leading-tight">
              <strong className="block text-[19px] text-biru-tua">
                {pengaturan.nama_sekolah || "SMA IMTEK"}
              </strong>
              <small className="text-[11px] text-samar">
                {pengaturan.kota || "Kabupaten Tangerang"}
                {pengaturan.akreditasi ? ` · Akreditasi ${pengaturan.akreditasi}` : ""}
              </small>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {MENU.map((m) => (
              <li key={m.jalur}>
                <Link
                  href={m.jalur}
                  className={
                    "rounded-lg px-3.5 py-2 text-[15px] font-semibold transition " +
                    (aktif(m.jalur)
                      ? "bg-biru-muda text-biru"
                      : "text-teks hover:bg-biru-muda hover:text-biru")
                  }
                >
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {ppdbDibuka ? (
              <Link
                href="/ppdb/daftar"
                className="hidden rounded-[10px] bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua sm:inline-block"
              >
                Daftar PPDB
              </Link>
            ) : (
              <Link
                href="/ppdb"
                className="hidden rounded-[10px] border border-garis px-4 py-2.5 text-sm font-semibold text-samar sm:inline-block"
              >
                Info PPDB
              </Link>
            )}

            <button
              type="button"
              onClick={() => setTerbuka((v) => !v)}
              aria-expanded={terbuka}
              aria-controls="menu-ringkas"
              aria-label={terbuka ? "Tutup menu" : "Buka menu"}
              className="grid h-10 w-10 place-items-center rounded-lg border border-garis text-biru-tua lg:hidden"
            >
              <span className="space-y-1" aria-hidden>
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </button>
          </div>
        </div>

        {/* Menu layar kecil. Tingginya dianimasikan dengan grid-template-rows
            dari 0fr ke 1fr, cara CSS untuk membuka sesuatu yang tingginya
            belum diketahui. Sebelumnya bagian ini memakai Framer Motion.
            Isinya tetap ada di DOM saat tertutup, jadi diberi inert supaya
            tidak bisa disorot Tab dan tidak dibaca pembaca layar. */}
        <div
          id="menu-ringkas"
          inert={!terbuka}
          className={
            "grid overflow-hidden border-t border-garis transition-[grid-template-rows,opacity] duration-250 ease-out lg:hidden " +
            (terbuka ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
          }
        >
          <div className="overflow-hidden">
              <ul className="wadah flex flex-col gap-1 py-3">
                {MENU.map((m) => (
                  <li key={m.jalur}>
                    <Link
                      href={m.jalur}
                      onClick={() => setTerbuka(false)}
                      className={
                        "block rounded-lg px-3.5 py-2.5 font-semibold transition " +
                        (aktif(m.jalur)
                          ? "bg-biru-muda text-biru"
                          : "text-teks hover:bg-biru-muda hover:text-biru")
                      }
                    >
                      {m.label}
                    </Link>
                  </li>
                ))}
                <li className="mt-1 flex gap-2">
                  <Link
                    href={ppdbDibuka ? "/ppdb/daftar" : "/ppdb"}
                    onClick={() => setTerbuka(false)}
                    className="flex-1 rounded-lg bg-biru px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    {ppdbDibuka ? "Daftar PPDB" : "Info PPDB"}
                  </Link>
                  <Link
                    href="/ppdb/cek"
                    onClick={() => setTerbuka(false)}
                    className="flex-1 rounded-lg border border-garis px-4 py-2.5 text-center text-sm font-semibold text-teks"
                  >
                    Cek Status
                  </Link>
                </li>
              </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}

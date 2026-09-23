"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Pengaturan } from "@/lib/tipe";
import { pesanTanyaPpdb, tautanWa } from "@/lib/format";
import { MENU } from "@/lib/menu";
import { IkonSurel, IkonTelepon, IkonWhatsapp } from "./Ikon";

/**
 * Navigasi utama, dengan menu bertingkat untuk Profil Sekolah, Akademik,
 * Kesiswaan, dan PPDB.
 *
 * Menu bertingkat mudah menjadi menu yang hanya bisa dipakai tetikus, jadi
 * tiga hal dijaga di sini:
 *
 *   1. Pembukanya berupa <button aria-expanded>, bukan tautan yang tidak
 *      pernah dituju. Jadi Tab dan Enter bekerja seperti biasa.
 *   2. Menunya terbuka saat disentuh tetikus, tetapi juga tetap terbuka saat
 *      dibuka dengan papan tuts, dan tertutup oleh Escape.
 *   3. Pada layar kecil tidak ada hover sama sekali, jadi bentuknya berubah
 *      menjadi daftar yang dapat dilipat.
 *
 * Halaman kelompoknya sendiri tetap dapat dibuka: butir pertama pada setiap
 * menu turunan menunjuk ke halaman indeks kelompok tersebut.
 */

interface Keadaan {
  /** Jalur halaman saat menu ini dibuka. */
  jalur: string;
  /** Menu layar kecil terbuka. */
  ringkas: boolean;
  /** Jalur kelompok yang menu turunannya sedang terbuka di layar lebar. */
  menu: string | null;
  /** Jalur kelompok yang daftarnya sedang terbuka di layar kecil. */
  lipat: string | null;
}

const TERTUTUP = { ringkas: false, menu: null, lipat: null } as const;

export default function Navigasi({
  pengaturan,
  ppdbDibuka,
}: {
  pengaturan: Pengaturan;
  ppdbDibuka: boolean;
}) {
  const bilah = useRef<HTMLDivElement>(null);
  const jalurSekarang = usePathname();

  // Keadaan menu dicatat bersama jalur tempat ia dibuka. Begitu halaman
  // berpindah, catatan dari jalur lama diabaikan dan seluruh menu kembali
  // tertutup. Cara ini dipakai supaya tidak ada setState di dalam effect
  // yang hanya bertugas menutup menu: itu memicu render berantai, dan
  // aturan react-hooks/set-state-in-effect memang melarangnya.
  const [simpan, setSimpan] = useState<Keadaan>({
    jalur: jalurSekarang,
    ...TERTUTUP,
  });
  const keadaan: Keadaan =
    simpan.jalur === jalurSekarang
      ? simpan
      : { jalur: jalurSekarang, ...TERTUTUP };

  const ubah = (bagian: Partial<Keadaan>) =>
    setSimpan({ ...keadaan, ...bagian });

  useEffect(() => {
    if (!keadaan.menu) return;
    const tutupMenu = () => setSimpan((s) => ({ ...s, menu: null }));
    const tekan = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") tutupMenu();
    };
    const klikLuar = (ev: MouseEvent) => {
      if (bilah.current && !bilah.current.contains(ev.target as Node)) {
        tutupMenu();
      }
    };
    document.addEventListener("keydown", tekan);
    document.addEventListener("mousedown", klikLuar);
    return () => {
      document.removeEventListener("keydown", tekan);
      document.removeEventListener("mousedown", klikLuar);
    };
  }, [keadaan.menu]);

  const aktif = (jalur: string) =>
    jalur === "/" ? jalurSekarang === "/" : jalurSekarang.startsWith(jalur);

  // Sebuah kelompok dianggap aktif bila halaman sekarang adalah salah satu
  // turunannya, termasuk turunan yang jalurnya di luar kelompok itu seperti
  // Sarana dan Prasarana yang memakai halaman Fasilitas.
  const kelompokAktif = (jalur: string, anak?: { jalur: string }[]) =>
    aktif(jalur) || (anak ?? []).some((a) => aktif(a.jalur));

  // Pesannya sudah terisi, jadi yang membukanya tidak menghadap ruang
  // obrolan kosong lalu harus menyusun sendiri pertanyaannya.
  const wa = tautanWa(
    pengaturan.whatsapp ?? "",
    pesanTanyaPpdb(pengaturan.nama_sekolah ?? ""),
  );

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
                className="flex items-center gap-1.5 opacity-85 hover:text-emas hover:opacity-100"
              >
                <IkonTelepon ukuran={14} className="shrink-0" />
                {pengaturan.telepon}
              </a>
            )}
            {pengaturan.email && (
              <a
                href={`mailto:${pengaturan.email}`}
                className="flex items-center gap-1.5 opacity-85 hover:text-emas hover:opacity-100"
              >
                <IkonSurel ukuran={14} className="shrink-0" />
                {pengaturan.email}
              </a>
            )}
          </div>
          <div className="flex items-center gap-5">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 opacity-85 hover:text-emas hover:opacity-100"
              >
                <IkonWhatsapp ukuran={14} className="shrink-0" />
                WhatsApp Panitia
              </a>
            )}
            <Link href="/admin" className="opacity-85 hover:text-emas hover:opacity-100">
              Masuk Petugas
            </Link>
          </div>
        </div>
      </div>

      <nav className="border-b border-garis bg-white shadow-lembut">
        <div ref={bilah} className="wadah flex items-center justify-between gap-4 py-3">
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

          <ul className="hidden items-center gap-0.5 xl:flex">
            {MENU.map((m) =>
              m.anak ? (
                <li
                  key={m.jalur}
                  className="relative"
                  onMouseEnter={() => ubah({ menu: m.jalur })}
                  onMouseLeave={() => ubah({ menu: null })}
                >
                  <button
                    type="button"
                    aria-expanded={keadaan.menu === m.jalur}
                    aria-controls={`menu-${m.label.replace(/\s+/g, "-").toLowerCase()}`}
                    onClick={() =>
                      ubah({ menu: keadaan.menu === m.jalur ? null : m.jalur })
                    }
                    className={
                      "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition " +
                      (kelompokAktif(m.jalur, m.anak)
                        ? "bg-biru-muda text-biru"
                        : "text-teks hover:bg-biru-muda hover:text-biru")
                    }
                  >
                    {m.label}
                    <span
                      aria-hidden
                      className={
                        "text-[10px] leading-none transition-transform " +
                        (keadaan.menu === m.jalur ? "rotate-180" : "")
                      }
                    >
                      ▾
                    </span>
                  </button>

                  {keadaan.menu === m.jalur && (
                    <div
                      id={`menu-${m.label.replace(/\s+/g, "-").toLowerCase()}`}
                      className="absolute top-full left-0 w-72 animate-[munculKabar_0.15s_ease-out] pt-2"
                    >
                      <ul className="overflow-hidden rounded-kartu border border-garis bg-white py-1.5 shadow-kuat">
                        <li>
                          <Link
                            href={m.jalur}
                            className="block border-b border-garis px-4 py-2.5 text-xs font-bold tracking-wide text-biru uppercase transition hover:bg-biru-muda"
                          >
                            Ringkasan {m.label}
                          </Link>
                        </li>
                        {m.anak.map((s) => (
                          <li key={s.label}>
                            <Link
                              href={s.jalur}
                              className={
                                "block px-4 py-2.5 text-sm transition hover:bg-biru-muda hover:text-biru " +
                                (aktif(s.jalur)
                                  ? "font-bold text-biru"
                                  : "font-medium text-teks")
                              }
                            >
                              {s.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ) : (
                <li key={m.jalur}>
                  <Link
                    href={m.jalur}
                    className={
                      "block rounded-lg px-3 py-2 text-sm font-semibold transition " +
                      (aktif(m.jalur)
                        ? "bg-biru-muda text-biru"
                        : "text-teks hover:bg-biru-muda hover:text-biru")
                    }
                  >
                    {m.label}
                  </Link>
                </li>
              ),
            )}
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
              onClick={() => ubah({ ringkas: !keadaan.ringkas })}
              aria-expanded={keadaan.ringkas}
              aria-controls="menu-ringkas"
              aria-label={keadaan.ringkas ? "Tutup menu" : "Buka menu"}
              className="grid h-10 w-10 place-items-center rounded-lg border border-garis text-biru-tua xl:hidden"
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
            belum diketahui. Isinya tetap ada di DOM saat tertutup, jadi
            diberi inert supaya tidak bisa disorot Tab dan tidak dibaca
            pembaca layar. */}
        <div
          id="menu-ringkas"
          inert={!keadaan.ringkas}
          className={
            "grid overflow-hidden border-t border-garis transition-[grid-template-rows,opacity] duration-250 ease-out xl:hidden " +
            (keadaan.ringkas
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0")
          }
        >
          <div className="overflow-hidden">
            <ul className="wadah flex max-h-[70vh] flex-col gap-1 overflow-y-auto py-3">
              {MENU.map((m) =>
                m.anak ? (
                  <li key={m.jalur}>
                    {/* Kelompoknya dibuka dengan tombol terpisah, supaya
                        menyentuh labelnya tidak langsung berpindah halaman
                        dan menutup menunya. */}
                    <div className="flex items-stretch gap-1">
                      <Link
                        href={m.jalur}
                        className={
                          "flex-1 rounded-lg px-3.5 py-2.5 font-semibold transition " +
                          (kelompokAktif(m.jalur, m.anak)
                            ? "bg-biru-muda text-biru"
                            : "text-teks hover:bg-biru-muda hover:text-biru")
                        }
                      >
                        {m.label}
                      </Link>
                      <button
                        type="button"
                        aria-expanded={keadaan.lipat === m.jalur}
                        aria-label={
                          keadaan.lipat === m.jalur
                            ? `Tutup daftar ${m.label}`
                            : `Buka daftar ${m.label}`
                        }
                        onClick={() =>
                          ubah({
                            lipat: keadaan.lipat === m.jalur ? null : m.jalur,
                          })
                        }
                        className="grid w-11 shrink-0 place-items-center rounded-lg border border-garis text-biru-tua"
                      >
                        <span
                          aria-hidden
                          className={
                            "text-xs leading-none transition-transform " +
                            (keadaan.lipat === m.jalur ? "rotate-180" : "")
                          }
                        >
                          ▾
                        </span>
                      </button>
                    </div>

                    <ul
                      inert={keadaan.lipat !== m.jalur}
                      className={
                        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out " +
                        (keadaan.lipat === m.jalur
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0")
                      }
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-biru-muda pl-3">
                          {m.anak.map((s) => (
                            <Link
                              key={s.label}
                              href={s.jalur}
                              className={
                                "block rounded-lg px-3 py-2 text-sm transition " +
                                (aktif(s.jalur)
                                  ? "bg-biru-muda font-bold text-biru"
                                  : "font-medium text-teks hover:bg-biru-muda hover:text-biru")
                              }
                            >
                              {s.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </ul>
                  </li>
                ) : (
                  <li key={m.jalur}>
                    <Link
                      href={m.jalur}
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
                ),
              )}
              <li className="mt-1 flex gap-2">
                <Link
                  href={ppdbDibuka ? "/ppdb/daftar" : "/ppdb"}
                  className="flex-1 rounded-lg bg-biru px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {ppdbDibuka ? "Daftar PPDB" : "Info PPDB"}
                </Link>
                <Link
                  href="/ppdb/cek"
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

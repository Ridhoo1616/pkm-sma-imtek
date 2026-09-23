"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IkonSurel, IkonTelepon, IkonWhatsapp } from "@/komponen/Ikon";
import { belumTerisi, pesanTanyaPpdb, tautanWa } from "@/lib/format";
import type { Pengaturan } from "@/lib/tipe";

/**
 * Tombol bantuan melayang di pojok kanan bawah.
 *
 * Dua pekerjaan sekaligus, karena keduanya dibutuhkan pada saat yang sama:
 * pengunjung yang bingung ingin bertanya, dan pengunjung yang bertanya
 * biasanya sebenarnya hanya belum tahu langkah berikutnya.
 *
 *   1. Menunjukkan posisi pengunjung pada alur pendaftaran, beserta langkah
 *      berikutnya yang disorot. Ditentukan dari halaman yang sedang dibuka
 *      dan dari keadaan PPDB, bukan sekadar daftar tautan.
 *   2. Menyediakan jalur bertanya: WhatsApp, telepon, dan surel.
 *
 * Bila nomor WhatsApp belum diisi sekolah, tombolnya tidak dihilangkan.
 * Yang hilang hanya pilihan WhatsApp-nya, dan panelnya mengarahkan ke jalur
 * lain. Menghilangkan tombolnya sama sekali akan membuat pengunjung
 * kehilangan penunjuk alur juga, padahal itu bagian yang paling membantu.
 */

interface Langkah {
  kunci: string;
  label: string;
  jalur: string;
  keterangan: string;
}

const ALUR: Langkah[] = [
  {
    kunci: "kenali",
    label: "Kenali sekolahnya",
    jalur: "/profil",
    keterangan: "Lihat profil, fasilitas, dan peminatan yang dibuka.",
  },
  {
    kunci: "baca",
    label: "Baca ketentuan PPDB",
    jalur: "/ppdb",
    keterangan: "Jadwal, jalur pendaftaran, dokumen yang diminta, dan rincian biaya.",
  },
  {
    kunci: "daftar",
    label: "Isi formulir pendaftaran",
    jalur: "/ppdb/daftar",
    keterangan: "Lima langkah, termasuk unggah dokumen. Nomor registrasi terbit di akhir.",
  },
  {
    kunci: "pantau",
    label: "Pantau verifikasi berkas",
    jalur: "/ppdb/cek",
    keterangan: "Masukkan nomor registrasi dan tanggal lahir untuk melihat statusnya.",
  },
  {
    kunci: "tes",
    label: "Kerjakan tes seleksi",
    jalur: "/ppdb/ujian",
    keterangan: "Dibuka setelah berkas Anda diverifikasi panitia.",
  },
  {
    kunci: "hasil",
    label: "Lihat hasil seleksi",
    jalur: "/ppdb/cek",
    keterangan: "Hasilnya muncul di halaman Cek Status begitu panitia menetapkannya.",
  },
];

/** Mencocokkan halaman yang sedang dibuka dengan langkah pada alur. */
function langkahDari(jalur: string): number {
  if (jalur.startsWith("/ppdb/daftar")) return 2;
  if (jalur.startsWith("/ppdb/ujian")) return 4;
  if (jalur.startsWith("/ppdb/cek")) return 3;
  if (jalur.startsWith("/ppdb")) return 1;
  if (jalur === "/profil" || jalur.startsWith("/fasilitas")) return 0;
  return -1;
}

export default function BantuanMelayang({
  pengaturan,
  ppdbDibuka,
}: {
  pengaturan: Pengaturan;
  ppdbDibuka: boolean;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [jalur, setJalur] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const tombol = useRef<HTMLButtonElement>(null);

  // Jalur dibaca dari location, bukan usePathname, supaya komponen ini tetap
  // dapat dipakai pada halaman yang dirender di server tanpa ikut menjadi
  // penghalang render.
  useEffect(() => {
    const baca = () => setJalur(window.location.pathname);
    baca();
    window.addEventListener("popstate", baca);
    return () => window.removeEventListener("popstate", baca);
  }, []);

  // Panel ditutup dengan Escape dan dengan mengeklik di luarnya, seperti
  // yang diharapkan orang dari panel semacam ini.
  useEffect(() => {
    if (!terbuka) return;
    const tombolTekan = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setTerbuka(false);
        tombol.current?.focus();
      }
    };
    const klikLuar = (ev: MouseEvent) => {
      if (
        panel.current &&
        !panel.current.contains(ev.target as Node) &&
        !tombol.current?.contains(ev.target as Node)
      ) {
        setTerbuka(false);
      }
    };
    document.addEventListener("keydown", tombolTekan);
    document.addEventListener("mousedown", klikLuar);
    return () => {
      document.removeEventListener("keydown", tombolTekan);
      document.removeEventListener("mousedown", klikLuar);
    };
  }, [terbuka]);

  const wa = tautanWa(
    pengaturan.whatsapp ?? "",
    pesanTanyaPpdb(pengaturan.nama_sekolah ?? ""),
  );
  const telepon = pengaturan.telepon ?? "";
  const surel = pengaturan.email ?? "";

  const kini = langkahDari(jalur);
  // Langkah berikutnya yang disarankan. Bila PPDB tutup, pengunjung
  // diarahkan membaca ketentuan, bukan ke formulir yang pasti tertutup.
  const berikut = !ppdbDibuka && kini < 1 ? 1 : Math.min(kini + 1, ALUR.length - 1);

  return (
    <div className="tanpa-cetak fixed right-4 bottom-4 z-100 flex flex-col items-end gap-3">
      {terbuka && (
        <div
          ref={panel}
          role="dialog"
          aria-modal="false"
          aria-label="Bantuan pendaftaran"
          className="flex max-h-[min(34rem,calc(100vh-7.5rem))] w-[min(22rem,calc(100vw-2rem))] animate-[munculKabar_0.18s_ease-out] flex-col overflow-hidden rounded-kartu border border-garis bg-white shadow-kuat"
        >
          <div className="shrink-0 bg-biru-tua px-5 py-4 text-white">
            <p className="text-sm font-bold">Bingung harus ke mana?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/80">
              Ini urutan langkahnya. Yang disorot adalah langkah Anda
              berikutnya.
            </p>
          </div>

          <ol className="min-h-0 flex-1 divide-y divide-garis overflow-y-auto">
            {ALUR.map((l, i) => {
              const sedangDibuka = i === kini;
              const disarankan = i === berikut && !sedangDibuka;
              return (
                <li key={l.kunci}>
                  <Link
                    href={l.jalur}
                    onClick={() => setTerbuka(false)}
                    className={
                      "flex gap-3 px-5 py-3.5 transition " +
                      (disarankan
                        ? "bg-amber-50 hover:bg-amber-100"
                        : "hover:bg-biru-muda/50")
                    }
                  >
                    <span
                      className={
                        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums " +
                        (sedangDibuka
                          ? "bg-biru-tua text-white"
                          : disarankan
                            ? "bg-amber-700 text-white"
                            : "bg-biru-muda text-biru")
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-teks">
                          {l.label}
                        </span>
                        {sedangDibuka && (
                          <span className="inline-flex items-center justify-center rounded-md bg-biru-tua px-1.5 py-1 text-[10px] leading-none font-bold tracking-[0.06em] text-white uppercase">
                            Anda di sini
                          </span>
                        )}
                        {disarankan && (
                          <span className="inline-flex items-center justify-center rounded-md bg-amber-700 px-1.5 py-1 text-[10px] leading-none font-bold tracking-[0.06em] text-white uppercase">
                            Langkah berikutnya
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-samar">
                        {l.keterangan}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="shrink-0 space-y-2.5 border-t border-garis bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-samar uppercase">
              Masih ingin bertanya
            </p>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                <IkonWhatsapp ukuran={18} className="shrink-0" />
                Tanya lewat WhatsApp
              </a>
            ) : (
              <p className="rounded-lg bg-white px-4 py-3 text-xs leading-relaxed text-samar">
                Nomor WhatsApp panitia belum dicantumkan. Gunakan telepon,
                surel, atau formulir pada halaman Kontak.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {telepon && !belumTerisi(telepon) && (
                <a
                  href={`tel:${telepon}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-garis bg-white px-3 py-2 text-xs font-semibold text-teks transition hover:border-biru hover:text-biru"
                >
                  <IkonTelepon ukuran={14} className="shrink-0" />
                  Telepon
                </a>
              )}
              {surel && !belumTerisi(surel) && (
                <a
                  href={`mailto:${surel}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-garis bg-white px-3 py-2 text-xs font-semibold text-teks transition hover:border-biru hover:text-biru"
                >
                  <IkonSurel ukuran={14} className="shrink-0" />
                  Surel
                </a>
              )}
            </div>
            <Link
              href="/faq"
              onClick={() => setTerbuka(false)}
              className="block rounded-lg border border-garis bg-white px-4 py-2.5 text-center text-xs font-semibold text-teks transition hover:border-biru hover:text-biru"
            >
              Lihat 24 pertanyaan yang sering diajukan
            </Link>
          </div>
        </div>
      )}

      <button
        ref={tombol}
        type="button"
        onClick={() => setTerbuka((t) => !t)}
        aria-expanded={terbuka}
        aria-label={
          terbuka ? "Tutup bantuan pendaftaran" : "Buka bantuan pendaftaran"
        }
        className={
          "group flex items-center gap-2.5 rounded-full py-3.5 pr-5 pl-4 font-semibold text-white shadow-kuat transition " +
          (terbuka ? "bg-biru-tua hover:bg-biru" : "bg-green-600 hover:bg-green-700")
        }
      >
        {terbuka ? (
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center text-lg leading-none">
            ×
          </span>
        ) : (
          <IkonWhatsapp ukuran={24} className="shrink-0" />
        )}
        <span className="text-sm">{terbuka ? "Tutup" : "Butuh bantuan?"}</span>
      </button>
    </div>
  );
}

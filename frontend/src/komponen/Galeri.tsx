"use client";

import { useEffect, useRef, useState } from "react";
import { urlUnggahan } from "@/lib/api";
import { tanggalPanjang } from "@/lib/format";
import { MunculNaik } from "@/komponen/Gerak";
import type { Galeri } from "@/lib/tipe";

/**
 * Petak foto dengan tampilan besar saat diklik. Penyaring kategori
 * dikerjakan di sisi peramban karena seluruh foto sudah dimuat sekaligus —
 * jumlah foto galeri sekolah tidak sampai ribuan.
 */
export default function PetakGaleri({
  foto,
  kategori,
}: {
  foto: Galeri[];
  kategori: string[];
}) {
  const [pilihKategori, setPilihKategori] = useState("");
  const [terbuka, setTerbuka] = useState<Galeri | null>(null);
  const tombolTutup = useRef<HTMLButtonElement>(null);

  // Tampilan foto besar berlaku sebagai jendela, jadi perlu tiga hal yang
  // diharapkan pengguna dari sebuah jendela: tombol Escape menutupnya, gulir
  // halaman di belakangnya terkunci, dan fokus papan tik berpindah ke
  // dalamnya supaya Tab tidak menyelinap ke tautan yang tertutup.
  useEffect(() => {
    if (!terbuka) return;

    const saatTombol = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setTerbuka(null);
    };
    document.addEventListener("keydown", saatTombol);

    const gulirSemula = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tombolTutup.current?.focus();

    return () => {
      document.removeEventListener("keydown", saatTombol);
      document.body.style.overflow = gulirSemula;
    };
  }, [terbuka]);

  const tersaring = pilihKategori
    ? foto.filter((f) => f.kategori === pilihKategori)
    : foto;

  return (
    <>
      {kategori.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPilihKategori("")}
            className={
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition " +
              (!pilihKategori
                ? "border-biru bg-biru text-white"
                : "border-garis bg-white text-teks hover:border-biru hover:text-biru")
            }
          >
            Semua ({foto.length})
          </button>
          {kategori.map((k) => {
            const jumlah = foto.filter((f) => f.kategori === k).length;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setPilihKategori(k)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition " +
                  (pilihKategori === k
                    ? "border-biru bg-biru text-white"
                    : "border-garis bg-white text-teks hover:border-biru hover:text-biru")
                }
              >
                {k} ({jumlah})
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tersaring.map((f, i) => (
          <MunculNaik key={f.id} jeda={(i % 4) * 0.06}>
            <button
              type="button"
              onClick={() => setTerbuka(f)}
              className="group block w-full overflow-hidden rounded-kartu border border-garis bg-white text-left shadow-lembut transition hover:shadow-kuat"
            >
              <span className="block aspect-4/3 overflow-hidden bg-biru-muda">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlUnggahan("galeri", f.gambar)}
                  alt={f.judul}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </span>
              <span className="block p-4">
                <span className="block text-sm font-semibold text-biru-tua">
                  {f.judul}
                </span>
                {f.kategori && (
                  <span className="mt-0.5 block text-xs text-samar">{f.kategori}</span>
                )}
              </span>
            </button>
          </MunculNaik>
        ))}
      </div>

      {/* Tampilan foto besar. Gerakan masuknya memakai keyframes CSS yang sama
          dengan jendela Radix; gerakan keluarnya ditiadakan supaya menutupnya
          terasa langsung. */}
      {terbuka && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={terbuka.judul}
            className="fixed inset-0 z-100 flex animate-[munculLatar_0.15s_ease-out] items-center justify-center bg-black/80 p-4"
            onClick={() => setTerbuka(null)}
          >
            <figure
              className="max-h-full w-full max-w-4xl animate-[munculJendela_0.2s_ease-out] overflow-auto rounded-kartu bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlUnggahan("galeri", terbuka.gambar)}
                alt={terbuka.judul}
                className="max-h-[70vh] w-full bg-black object-contain"
              />
              <figcaption className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold text-biru-tua">{terbuka.judul}</p>
                  {terbuka.keterangan && (
                    <p className="mt-1 text-sm leading-relaxed text-samar">
                      {terbuka.keterangan}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-samar">
                    {terbuka.kategori && `${terbuka.kategori} · `}
                    {tanggalPanjang(terbuka.dibuat)}
                  </p>
                </div>
                <button
                  ref={tombolTutup}
                  type="button"
                  onClick={() => setTerbuka(null)}
                  className="shrink-0 rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda"
                >
                  Tutup
                </button>
              </figcaption>
            </figure>
          </div>
        )}
    </>
  );
}

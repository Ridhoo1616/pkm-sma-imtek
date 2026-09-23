"use client";

import { useMemo, useState } from "react";
import type { Faq } from "@/lib/tipe";

/**
 * Daftar tanya jawab.
 *
 * Dibuat sebagai komponen klien karena penyaring kategori dan pencariannya
 * bekerja tanpa memuat ulang halaman; jumlah pertanyaannya sedikit, jadi
 * seluruhnya memang dikirim sekaligus.
 *
 * Jawaban dibuka lewat elemen details bawaan peramban, bukan komponen buatan
 * sendiri. Dengan begitu pencarian bawaan peramban (Ctrl-F) tetap menemukan
 * isinya, dan halaman ini tetap berfungsi penuh tanpa JavaScript.
 */
export default function DaftarFaq({
  daftar,
  kategori,
}: {
  daftar: Faq[];
  kategori: string[];
}) {
  const [pilih, setPilih] = useState("");
  const [cari, setCari] = useState("");

  const tersaring = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return daftar.filter((f) => {
      if (pilih && f.kategori !== pilih) return false;
      if (!kata) return true;
      return (
        f.pertanyaan.toLowerCase().includes(kata) ||
        f.jawaban.toLowerCase().includes(kata)
      );
    });
  }, [daftar, pilih, cari]);

  const disorot = tersaring.filter((f) => f.sorot);
  const lainnya = tersaring.filter((f) => !f.sorot);

  return (
    <div className="space-y-8">
      <div className="kartu flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-[14rem] flex-1">
          <label
            htmlFor="cari-faq"
            className="mb-1.5 block text-sm font-semibold text-teks"
          >
            Cari pertanyaan
          </label>
          <input
            id="cari-faq"
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Misalnya: biaya, ijazah, tes"
            className="w-full rounded-lg border border-garis px-4 py-2.5 text-[15px] outline-none focus:border-biru focus:ring-2 focus:ring-biru/20"
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-teks">Kategori</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPilih("")}
              aria-pressed={pilih === ""}
              className={
                "rounded-lg px-3.5 py-2 text-sm font-semibold transition " +
                (pilih === ""
                  ? "bg-biru text-white"
                  : "border border-garis text-teks hover:border-biru hover:text-biru")
              }
            >
              Semua
            </button>
            {kategori.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPilih(k)}
                aria-pressed={pilih === k}
                className={
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition " +
                  (pilih === k
                    ? "bg-biru text-white"
                    : "border border-garis text-teks hover:border-biru hover:text-biru")
                }
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tersaring.length === 0 ? (
        <div className="kartu p-8 text-center">
          <p className="font-semibold text-teks">
            Tidak ada pertanyaan yang cocok
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-samar">
            Coba kata lain, atau tanyakan langsung lewat tombol WhatsApp di
            pojok kanan bawah.
          </p>
        </div>
      ) : (
        <>
          {disorot.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base">
                <span className="rounded bg-emas px-2 py-0.5 text-xs font-bold text-biru-tua">
                  Sering ditanyakan
                </span>
              </h2>
              <div className="space-y-3">
                {disorot.map((f) => (
                  <ButirFaq key={f.id} faq={f} sorot />
                ))}
              </div>
            </section>
          )}

          {lainnya.length > 0 && (
            <section>
              {disorot.length > 0 && (
                <h2 className="mb-3 text-base text-samar">Pertanyaan lainnya</h2>
              )}
              <div className="space-y-3">
                {lainnya.map((f) => (
                  <ButirFaq key={f.id} faq={f} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ButirFaq({ faq, sorot = false }: { faq: Faq; sorot?: boolean }) {
  return (
    <details
      className={
        "kartu group overflow-hidden " + (sorot ? "border-emas/50" : "")
      }
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 transition hover:bg-biru-muda/40">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-biru-muda text-sm font-bold text-biru transition group-open:rotate-45"
        >
          +
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-teks">
            {faq.pertanyaan}
          </span>
          <span className="mt-1 block text-xs text-samar">{faq.kategori}</span>
        </span>
      </summary>
      <div className="border-t border-garis px-5 py-4 pl-14">
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-teks">
          {faq.jawaban}
        </p>
      </div>
    </details>
  );
}

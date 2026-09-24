"use client";

import { useState, type PointerEvent } from "react";
import { angka, persen } from "@/lib/format";

/**
 * Diagram lingkaran berlubang beserta keterangannya.
 *
 * Digambar sebagai SVG di sini, bukan memakai pustaka grafik. Pustaka grafik
 * yang ringan pun menambah puluhan sampai ratusan kilobita JavaScript, dan
 * yang dibutuhkan halaman ini cuma satu bentuk: busur dengan panjang tertentu
 * pada satu lingkaran. Itu satu atribut CSS, `stroke-dasharray`, jadi tidak
 * ada yang perlu diimpor.
 *
 * WARNANYA SATU RONA, biru sekolah dengan kepekatan menurun. Diagram
 * lingkaran memang menuntut irisannya dapat dibedakan, tetapi membedakan
 * dengan kepekatan, bukan dengan rona yang berbeda-beda, membuatnya tetap
 * satu keluarga warna dengan seluruh situs. Urutannya pun bermakna: irisan
 * terbesar paling pekat.
 *
 * SEKARANG BERUPA KOMPONEN KLIEN. Sebelumnya sengaja tanpa JavaScript sama
 * sekali supaya dapat dipakai di komponen server, tetapi satu-satunya
 * pemakainya panel dasbor yang memang komponen klien, dan nilai yang muncul
 * saat kursor diarahkan ke irisannya menuntut keadaan. Bila kelak dipakai di
 * halaman publik yang dirender server, angkanya tetap tergambar utuh pada
 * HTML pertama; yang menuntut JavaScript hanya sorotannya.
 */
export function DiagramLingkaran({
  data,
  labelKosong = "Belum ada data untuk digambar.",
  formatLabel,
}: {
  data: { label: string; jumlah: number }[];
  labelKosong?: string;
  /** Mengubah label mentah — misalnya "2026-09" — menjadi tulisan yang enak dibaca. */
  formatLabel?: (label: string) => string;
}) {
  const [disorot, setDisorot] = useState<string | null>(null);

  const terurut = [...data]
    .filter((d) => d.jumlah > 0)
    .sort((a, b) => b.jumlah - a.jumlah);
  const total = terurut.reduce((j, d) => j + d.jumlah, 0);

  if (total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-garis px-5 py-8 text-center text-sm leading-relaxed text-samar">
        {labelKosong}
      </p>
    );
  }

  // Keliling lingkaran berjari-jari 15,915 hampir tepat 100, sehingga panjang
  // tiap busur dapat dituliskan langsung sebagai persennya. Angka itu
  // 100/(2π), dan dipakai justru supaya tidak ada perhitungan keliling di
  // sini yang bisa salah.
  const JARI = 15.9155;
  const TEBAL = 9;

  const irisan = terurut.reduce<
    {
      label: string;
      jumlah: number;
      bagian: number;
      mulai: number;
      alfa: number;
    }[]
  >((kumpul, d, i) => {
    const bagian = (d.jumlah / total) * 100;
    const mulai = kumpul.reduce((j, s) => j + s.bagian, 0);
    // Kepekatan menurun dari irisan terbesar ke terkecil, dibatasi 0,22
    // supaya irisan terkecil pun masih terbaca di atas latar putih.
    const alfa = Math.max(
      1 - i * (0.78 / Math.max(terurut.length - 1, 1)),
      0.22,
    );
    return [
      ...kumpul,
      { label: d.label, jumlah: d.jumlah, bagian, mulai, alfa },
    ];
  }, []);

  const nama = (label: string) => (formatLabel ? formatLabel(label) : label);
  const aktif = irisan.find((s) => s.label === disorot) ?? null;

  /**
   * Hanya tetikus yang menyorot. Pada sentuhan, pointerenter ikut terpicu
   * sekali lalu tertinggal menyala karena tidak ada pointerleave, sehingga
   * angka di tengahnya terkunci pada irisan yang terakhir disentuh. Di layar
   * sentuh nilainya sudah tertulis lengkap pada daftar keterangan di
   * sebelahnya, jadi tidak ada yang hilang.
   */
  const sorot = (label: string) => (e: PointerEvent) => {
    if (e.pointerType === "mouse") setDisorot(label);
  };
  const lepas = (e: PointerEvent) => {
    if (e.pointerType === "mouse") setDisorot(null);
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      {/* Kotak gambarnya diberi ukuran tetap, dan angka di tengahnya
          ditumpuk sebagai HTML, bukan <text> di dalam SVG: keterangan irisan
          bisa dua baris dan perlu dipotong bila panjang, dan itu jauh lebih
          mudah diatur dengan HTML biasa. */}
      <div className="relative h-40 w-40 shrink-0">
        <svg
          // viewBox-nya 42 satuan, bukan 40. Jari-jari 15,9155 ditambah
          // separuh ketebalan garis 9 membuat tepi luarnya berada di 20,4,
          // sedangkan kotak 40 satuan hanya sampai 20 — tepinya terpotong
          // rata di keempat sisi. Itu yang dilaporkan user.
          viewBox="-1 -1 42 42"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={
            `Diagram lingkaran, total ${angka(total)}. ` +
            irisan
              .map(
                (s) =>
                  `${nama(s.label)}: ${angka(s.jumlah)}, ${persen(s.jumlah, total)} persen`,
              )
              .join("; ")
          }
        >
          {irisan.map((s) => (
            <circle
              key={s.label}
              cx="20"
              cy="20"
              r={JARI}
              fill="none"
              stroke="var(--color-biru)"
              strokeOpacity={
                disorot && disorot !== s.label ? s.alfa * 0.35 : s.alfa
              }
              strokeWidth={disorot === s.label ? TEBAL + 2 : TEBAL}
              // Busur sepanjang bagiannya, lalu sisanya kosong; digeser ke
              // tempatnya lewat dashoffset yang negatif.
              strokeDasharray={`${s.bagian} ${100 - s.bagian}`}
              strokeDashoffset={-s.mulai}
              className="irisan-diagram"
              onPointerEnter={sorot(s.label)}
              onPointerLeave={lepas}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center px-9 text-center">
          {aktif ? (
            <div>
              <p className="text-xl leading-none font-bold text-biru-tua tabular-nums">
                {angka(aktif.jumlah)}
              </p>
              <p className="mt-0.5 text-[11px] leading-none font-semibold text-biru tabular-nums">
                {persen(aktif.jumlah, total)}%
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-samar">
                {nama(aktif.label)}
              </p>
            </div>
          ) : (
            <p className="text-2xl leading-none font-bold text-biru-tua tabular-nums">
              {angka(total)}
            </p>
          )}
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {irisan.map((s) => (
          <li
            key={s.label}
            onPointerEnter={sorot(s.label)}
            onPointerLeave={lepas}
            className={
              "flex items-center gap-2.5 rounded-md px-1.5 py-0.5 text-sm transition-colors " +
              (disorot === s.label ? "bg-biru-muda" : "")
            }
          >
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm bg-biru"
              style={{ opacity: s.alfa }}
            />
            <span className="min-w-0 flex-1 truncate text-teks">
              {nama(s.label)}
            </span>
            <span className="shrink-0 font-semibold text-biru-tua tabular-nums">
              {angka(s.jumlah)}
            </span>
            <span className="w-11 shrink-0 text-right text-xs text-samar tabular-nums">
              {persen(s.jumlah, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

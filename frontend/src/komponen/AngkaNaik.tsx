"use client";

import { useEffect, useRef, useState } from "react";
import { angka } from "@/lib/format";

/**
 * Angka yang naik dari nol ke nilainya begitu masuk pandangan.
 *
 * Nilai awalnya SUDAH nilai akhirnya, bukan nol. Dua alasannya:
 *
 *   1. HTML yang dikirim server memuat angka yang benar, jadi yang membuka
 *      tanpa JavaScript — dan perayap mesin pencari — tetap membaca angkanya,
 *      bukan nol.
 *   2. Keadaan awal React harus sama dengan keluaran server; kalau dimulai
 *      dari nol, hidrasinya berselisih.
 *
 * Hitungannya baru dimulai ketika angkanya benar-benar terlihat, lewat
 * IntersectionObserver. Angka yang berada di bawah lipatan halaman karena itu
 * tidak menghitung sendiri sebelum dilihat; kalau tidak, pengunjung yang
 * menggulir ke bawah hanya menemukan angka yang sudah selesai.
 *
 * Pada setelan "kurangi gerak", angkanya diam di nilai akhirnya. Yang
 * disampaikan angka ini nilainya, bukan gerakannya, jadi tidak ada yang
 * hilang.
 */
export function AngkaNaik({
  nilai,
  lama = 900,
  className = "",
}: {
  nilai: number;
  /** Lama animasinya dalam milidetik. */
  lama?: number;
  className?: string;
}) {
  const [tampil, setTampil] = useState(nilai);
  const wadah = useRef<HTMLSpanElement>(null);
  const sudahJalan = useRef(false);

  useEffect(() => {
    const el = wadah.current;
    if (!el || sudahJalan.current) return;
    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      nilai <= 0
    ) {
      return;
    }

    let rangka = 0;
    const jalan = () => {
      sudahJalan.current = true;
      const mulai = performance.now();
      const langkah = (sekarang: number) => {
        const maju = Math.min((sekarang - mulai) / lama, 1);
        // Melambat di ujungnya: angka yang berhenti mendadak terbaca seperti
        // halaman yang tersendat, bukan seperti hitungan yang selesai.
        const halus = 1 - Math.pow(1 - maju, 3);
        setTampil(Math.round(nilai * halus));
        if (maju < 1) rangka = requestAnimationFrame(langkah);
      };
      rangka = requestAnimationFrame(langkah);
    };

    const pengamat = new IntersectionObserver(
      (masuk) => {
        if (masuk.some((m) => m.isIntersecting) && !sudahJalan.current) {
          jalan();
          pengamat.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    pengamat.observe(el);

    return () => {
      pengamat.disconnect();
      if (rangka) cancelAnimationFrame(rangka);
    };
  }, [nilai, lama]);

  return (
    <span ref={wadah} className={`tabular-nums ${className}`}>
      {angka(tampil)}
    </span>
  );
}

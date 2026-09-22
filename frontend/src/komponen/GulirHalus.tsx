"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Gulir halus memakai Lenis, sesuai permintaan tim.
 *
 * Hanya dipasang pada halaman publik. Panel panitia sengaja dibiarkan
 * memakai gulir bawaan peramban, karena panel itu berisi tabel panjang
 * yang lebih enak digulir cepat, dan gulir berinersia justru memperlambat
 * pekerjaan verifikasi.
 */
export default function GulirHalus() {
  useEffect(() => {
    // Pengguna yang mematikan animasi di sistemnya tidak mendapat inersia.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 0.9,
      // Kurva perlambatan yang berhenti tegas, supaya halaman tidak terasa
      // meluncur terus setelah gulir dilepas.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let jalan = true;
    const putar = (waktu: number) => {
      if (!jalan) return;
      lenis.raf(waktu);
      requestAnimationFrame(putar);
    };
    requestAnimationFrame(putar);

    return () => {
      jalan = false;
      lenis.destroy();
    };
  }, []);

  return null;
}

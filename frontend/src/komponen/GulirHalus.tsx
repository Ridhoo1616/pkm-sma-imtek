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
      // Dulu di sini dipakai duration 0.9 detik. Hasilnya, sekali putaran roda
      // membuat halaman masih bergerak 754 milidetik sesudah jari berhenti,
      // dan itulah yang membuat situsnya terasa berat.
      //
      // lerp mendekatkan posisi sebanyak 55% tiap bingkai, bukan mengejar
      // jadwal waktu tertentu, sehingga gulirnya mengikuti jari dan berhenti
      // segera setelah jari berhenti. Dengan nilai ini halaman hanya bergerak
      // 173 milidetik setelah roda dilepas, turun dari 754 milidetik. Halusnya
      // masih terasa karena loncatan tiap klik roda tetap diperhalus, tetapi
      // rasa meluncur yang membuat situsnya terasa berat sudah hilang.
      lerp: 0.55,
      // Gulir sentuh dibiarkan bawaan peramban. Mengambil alih gulir di ponsel
      // hampir selalu terasa lebih buruk daripada gulir asli sistemnya.
      syncTouch: false,
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

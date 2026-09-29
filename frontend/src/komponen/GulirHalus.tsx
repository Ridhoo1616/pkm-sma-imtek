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
/**
 * `lerp` = seberapa cepat halaman menyusul roda tetikus tiap bingkai; makin
 * kecil makin halus tetapi makin tertinggal. Bawaan 0,08 dipilih untuk
 * frontend Next (499e156); situs Astro memakai nilai yang lebih ringan.
 */
export default function GulirHalus({ lerp = 0.08 }: { lerp?: number }) {
  useEffect(() => {
    // Pengguna yang mematikan animasi di sistemnya tidak mendapat inersia.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      // Dulu di sini dipakai duration 0.9 detik. Hasilnya, sekali putaran roda
      // membuat halaman masih bergerak 754 milidetik sesudah jari berhenti,
      // dan itulah yang membuat situsnya terasa berat.
      //
      // lerp mendekatkan posisi sebagian tiap bingkai, bukan mengejar jadwal
      // waktu tertentu, sehingga gulirnya berhenti segera setelah jari
      // berhenti. Riwayatnya: 0,55 dipilih karena situsnya terasa berat
      // (173 milidetik sesudah roda dilepas, dari 754); 499e156 menurunkannya
      // ke 0,08 untuk gulir yang lebih panjang dan halus. Nilai itu tetap
      // bawaan frontend Next; situs Astro mengirim nilainya sendiri lewat
      // properti `lerp`.
      // Ini akan membuat pengunjung membaca konten perlahan karena gulirannya
      // tidak instan berhenti melainkan meluncur pelan.
      lerp,
      // Kotak yang dapat digulir sendiri — menu ponsel, panel bantuan, kotak
      // tanya, jendela di panel, daftar sekolah asal — digulir oleh kotak
      // itu, bukan oleh halaman. Tanpa ini Lenis merebut setiap putaran roda
      // untuk halaman: menunya diam, halaman di belakangnya yang bergerak.
      // Usapan jari tidak terkena karena syncTouch mati.
      allowNestedScroll: true,
      // Gulir sentuh dibiarkan bawaan peramban. Mengambil alih gulir di ponsel
      // hampir selalu terasa lebih buruk daripada gulir asli sistemnya.
      syncTouch: false,
      smoothWheel: true,
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
  }, [lerp]);

  return null;
}

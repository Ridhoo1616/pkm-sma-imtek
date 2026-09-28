"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Latar yang bergerak lebih lambat daripada halamannya saat digulir.
 *
 * Dipakai foto sorotan beranda. Gerakannya kecil dan sengaja begitu: yang
 * dicari kesan kedalaman, bukan pertunjukan. Foto yang melesat cepat
 * mengalihkan perhatian dari tulisan di atasnya, dan yang perlu dibaca
 * orang tua justru tulisan itu.
 *
 * EMPAT HAL YANG MENENTUKAN CARA MENULISNYA:
 *
 * 1. Fotonya diperbesar 1,25 kali. Menggeser gambar setinggi layar penuh
 *    akan menyingkapkan bidang kosong di tepi bawahnya; pembesaran itu
 *    yang menyediakan bahan untuk digeser.
 *
 * 2. Posisinya dihitung di dalam requestAnimationFrame, bukan langsung di
 *    dalam penangan gulir. Penangan gulir dipanggil jauh lebih sering
 *    daripada peramban menggambar, dan menulis transform di setiap
 *    panggilan memaksa perhitungan tata letak berulang kali untuk satu
 *    gambar yang sama.
 *
 * 3. Berhenti begitu sorotannya lewat. Tidak ada gunanya menghitung posisi
 *    bagi gambar yang sudah tidak terlihat, dan halaman ini panjang.
 *
 * 4. "Kurangi gerak" dihormati sepenuhnya: fotonya diam, tanpa pembesaran
 *    sekalipun. Gerak latar termasuk yang paling mengganggu bagi yang peka
 *    terhadap gerak, sebab bidangnya besar dan mengisi seluruh pandangan.
 */

export function Paralaks({
  children,
  /** Sejauh mana latar tertinggal dari halaman. 0 diam, 1 ikut penuh. */
  kekuatan = 0.28,
}: {
  children: ReactNode;
  kekuatan?: number;
}) {
  const bingkai = useRef<HTMLDivElement>(null);
  const isi = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const diam = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (diam.matches) return;

    const el = isi.current;
    const kotak = bingkai.current;
    if (!el || !kotak) return;

    el.style.willChange = "transform";
    el.style.transform = "scale(1.25)";

    // Titik nol diambil dari letak elemennya di dalam dokumen, bukan dari
    // puncak layar.
    //
    // Memakai r.top langsung tampak benar dan tidak: sorotan ini berada di
    // bawah bilah berjalan dan navigasi, jadi r.top bernilai sekitar 147
    // bahkan saat halaman belum digulir sama sekali — latarnya sudah
    // tergeser 41 piksel sebelum pengunjung menyentuh apa pun. Terlihat
    // sebagai foto yang "salah pasang" pada pandangan pertama.
    const awal = kotak.getBoundingClientRect().top + window.scrollY;

    let menunggu = false;
    const gambar = () => {
      menunggu = false;
      const r = kotak.getBoundingClientRect();
      // Di luar pandangan tidak dihitung; halaman ini panjang.
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const geser = Math.max(0, window.scrollY - awal) * kekuatan;
      el.style.transform = `translate3d(0, ${geser.toFixed(1)}px, 0) scale(1.25)`;
    };

    const saatGulir = () => {
      if (menunggu) return;
      menunggu = true;
      requestAnimationFrame(gambar);
    };

    gambar();
    window.addEventListener("scroll", saatGulir, { passive: true });
    window.addEventListener("resize", saatGulir);
    return () => {
      window.removeEventListener("scroll", saatGulir);
      window.removeEventListener("resize", saatGulir);
      el.style.willChange = "";
      el.style.transform = "";
    };
  }, [kekuatan]);

  return (
    <div
      ref={bingkai}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div ref={isi} className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}

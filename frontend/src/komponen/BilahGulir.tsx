"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Bilah mendatar yang menggulir sendiri ke butir yang sedang dibuka.
 *
 * Dilaporkan user dari ponsel: membuka "Tenaga Pendidik dan Kependidikan"
 * menampilkan bilah yang berhenti di "Sejarah Sekolah", dan yang terlihat
 * bergerak justru batang penggulir di bawahnya — seolah penandanya menunjuk
 * halaman yang salah. Halamannya sendiri benar; yang salah bilahnya tidak
 * pernah bergeser.
 *
 * Diukur pada layar 390 piksel: butir aktifnya berada di 724–987 piksel
 * sedangkan jendela yang tampak hanya 0–358. Butir itu tidak pernah
 * terlihat kecuali pengunjung menggeser bilahnya sendiri — dan ia tidak
 * punya alasan menduga ada yang perlu digeser.
 *
 * TIGA HAL YANG MENENTUKAN CARA MENULISNYA:
 *
 * 1. Yang diubah HANYA `scrollLeft` bilahnya. `scrollIntoView` tampak lebih
 *    ringkas dan salah: ia ikut menggulir HALAMAN secara tegak, sehingga
 *    pengunjung yang baru membuka halaman langsung terlempar ke tengah,
 *    melewati judul halamannya.
 *
 * 2. Tidak diapa-apakan bila butirnya memang sudah terlihat. Menggulir
 *    bilah yang sudah benar hanya menimbulkan gerak tanpa guna.
 *
 * 3. Tanpa animasi. Ini pembetulan posisi awal, bukan tanggapan atas
 *    perbuatan pengunjung; bilah yang bergeser sendiri saat halaman baru
 *    terbuka terbaca sebagai kerusakan, bukan sebagai bantuan.
 *
 * 4. Dijalankan SEBELUM peramban menggambar, lewat useLayoutEffect.
 *    Dengan useEffect biasa, bilahnya sempat tergambar pada posisi nol
 *    lalu melompat — persis kedipan yang hendak dihindari poin ketiga.
 *    Pilihannya mengikuti pola yang sudah dipakai Gerak.tsx, sebab
 *    useLayoutEffect memperingatkan saat dirender di server.
 */

/** useLayoutEffect memperingatkan saat dirender di server, jadi dipilih di sini. */
const useEfekTataLetak =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function BilahGulir({
  children,
  className,
  "aria-label": label,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const bilah = useRef<HTMLUListElement>(null);

  useEfekTataLetak(() => {
    const ul = bilah.current;
    if (!ul) return;
    const aktif = ul.querySelector<HTMLElement>("[aria-current]");
    if (!aktif) return;

    const kotak = ul.getBoundingClientRect();
    const butir = aktif.getBoundingClientRect();
    if (butir.left >= kotak.left - 1 && butir.right <= kotak.right + 1) return;

    // Ditaruh di tengah bila muat, supaya butir sebelum dan sesudahnya ikut
    // terlihat — itu yang memberi tahu pengunjung bahwa bilahnya memang
    // dapat digeser.
    ul.scrollLeft += butir.left - kotak.left - (kotak.width - butir.width) / 2;
  }, []);

  return (
    <ul ref={bilah} className={className} aria-label={label}>
      {children}
    </ul>
  );
}

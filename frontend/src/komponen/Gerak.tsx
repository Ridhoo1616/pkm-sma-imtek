"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Pembungkus animasi.
 *
 * Sebelumnya bagian ini memakai Framer Motion. Seluruhnya hanya empat gerakan
 * sederhana: memudar naik saat tergulir, memudar naik saat dibuka, terangkat
 * saat disentuh penunjuk, dan bilah yang tumbuh. Keempatnya bisa dikerjakan
 * CSS, sedangkan pustakanya menambah sekitar 130 KB JavaScript pada setiap
 * halaman publik. Jadi pustakanya dilepas dan gerakannya ditulis dengan CSS.
 *
 * Dua hal yang sengaja dijaga:
 *
 *   1. Isi halaman **selalu terlihat** pada HTML yang dikirim server. Keadaan
 *      tersembunyi baru dipasang oleh JavaScript, tepat sebelum peramban
 *      menggambar. Kalau JavaScript-nya gagal dimuat, halaman tetap terbaca
 *      utuh, bukan kosong. Versi Framer Motion justru mengirim opacity nol
 *      dari server, sehingga halaman bisa kosong permanen bila skripnya gagal.
 *   2. Permintaan "kurangi gerak" dari sistem operasi dihormati. Bila
 *      dinyalakan, tidak ada yang disembunyikan sama sekali.
 */

interface Props {
  children: ReactNode;
  /** Jeda sebelum animasi mulai, untuk memunculkan daftar satu per satu. */
  jeda?: number;
  className?: string;
}

/** useLayoutEffect memperingatkan saat dirender di server, jadi dipilih di sini. */
const useEfekTataLetak =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function kurangiGerak() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Satu pengamat dipakai bersama seluruh elemen di halaman. Membuat satu
 * pengamat per elemen membuat peramban bekerja jauh lebih banyak ketika
 * halamannya panjang, misalnya daftar berita.
 */
let pengamat: IntersectionObserver | null = null;
const penangan = new WeakMap<Element, () => void>();

function amati(el: Element, saatTerlihat: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    saatTerlihat();
    return () => {};
  }
  if (!pengamat) {
    pengamat = new IntersectionObserver(
      (masukan) => {
        for (const m of masukan) {
          if (!m.isIntersecting) continue;
          penangan.get(m.target)?.();
          penangan.delete(m.target);
          pengamat?.unobserve(m.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
    );
  }
  penangan.set(el, saatTerlihat);
  pengamat.observe(el);
  return () => {
    penangan.delete(el);
    pengamat?.unobserve(el);
  };
}

/** Memudar naik ketika tergulir sampai terlihat. */
export function MunculNaik({ children, jeda = 0, className }: Props) {
  const acuan = useRef<HTMLDivElement>(null);

  useEfekTataLetak(() => {
    const el = acuan.current;
    if (!el || kurangiGerak()) return;

    // Disembunyikan di sini, bukan lewat kelas awal pada HTML dari server,
    // supaya halaman tetap terbaca bila JavaScript gagal dimuat.
    el.classList.add("gerak-awal");
    el.style.transitionDelay = jeda ? `${jeda}s` : "";

    return amati(el, () => el.classList.add("gerak-tampil"));
  }, [jeda]);

  return (
    <div ref={acuan} className={className}>
      {children}
    </div>
  );
}

/** Memudar naik langsung saat halaman dibuka, tanpa menunggu gulir. */
export function MunculLangsung({ children, jeda = 0, className }: Props) {
  const acuan = useRef<HTMLDivElement>(null);

  useEfekTataLetak(() => {
    const el = acuan.current;
    if (!el || kurangiGerak()) return;

    el.classList.add("gerak-awal");
    el.style.transitionDelay = jeda ? `${jeda}s` : "";

    // Satu bingkai ditunggu agar peramban sempat mencatat keadaan awalnya;
    // tanpa jeda ini, perubahan kelasnya digabung dan transisinya dilewati.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add("gerak-tampil")),
    );
    return () => cancelAnimationFrame(id);
  }, [jeda]);

  return (
    <div ref={acuan} className={className}>
      {children}
    </div>
  );
}

/**
 * Kartu yang sedikit terangkat saat disentuh penunjuk. Seluruhnya CSS, tanpa
 * satu baris pun JavaScript, jadi tidak ada biaya sama sekali saat halaman
 * dimuat maupun saat penunjuk digerakkan.
 */
export function KartuGerak({ children, className }: Props) {
  return <div className={`gerak-kartu ${className ?? ""}`}>{children}</div>;
}

/** Bilah yang tumbuh dari nol; dipakai grafik laporan. */
export function BilahGerak({
  lebar,
  warna = "var(--color-biru)",
  jeda = 0,
}: {
  lebar: number;
  warna?: string;
  jeda?: number;
}) {
  const acuan = useRef<HTMLDivElement>(null);
  const gaya: CSSProperties = { background: warna, width: `${lebar}%` };

  useEfekTataLetak(() => {
    const el = acuan.current;
    if (!el || kurangiGerak()) return;

    el.style.width = "0%";
    el.style.transition = `width 0.7s ease-out ${jeda}s`;

    return amati(el, () => {
      el.style.width = `${lebar}%`;
    });
  }, [lebar, jeda]);

  return <div ref={acuan} className="h-full rounded-full" style={gaya} />;
}

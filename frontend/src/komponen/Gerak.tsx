"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Pembungkus animasi. Titik awalnya selalu terlihat (opacity penuh bila
 * pengguna mematikan animasi), sehingga isi halaman tidak pernah hilang
 * gara-gara animasi yang gagal berjalan.
 */

interface Props {
  children: ReactNode;
  /** Jeda sebelum animasi mulai, untuk memunculkan daftar satu per satu. */
  jeda?: number;
  className?: string;
}

export function MunculNaik({ children, jeda = 0, className }: Props) {
  const kurangiGerak = useReducedMotion();
  if (kurangiGerak) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: jeda, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Untuk isi yang sudah terlihat saat halaman dibuka, tanpa menunggu gulir. */
export function MunculLangsung({ children, jeda = 0, className }: Props) {
  const kurangiGerak = useReducedMotion();
  if (kurangiGerak) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: jeda, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Kartu yang sedikit terangkat saat disentuh penunjuk. */
export function KartuGerak({ children, className }: Props) {
  const kurangiGerak = useReducedMotion();
  if (kurangiGerak) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
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
  const kurangiGerak = useReducedMotion();
  const gaya = { background: warna, width: `${lebar}%` };

  if (kurangiGerak) {
    return <div className="h-full rounded-full" style={gaya} />;
  }
  return (
    <motion.div
      className="h-full rounded-full"
      style={{ background: warna }}
      initial={{ width: 0 }}
      whileInView={{ width: `${lebar}%` }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: jeda, ease: "easeOut" }}
    />
  );
}

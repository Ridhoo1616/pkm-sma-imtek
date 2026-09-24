"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ALAMAT_API } from "@/lib/api";

/**
 * Memberi tahu server bahwa satu halaman publik dibuka.
 *
 * Dijalankan dari peramban, bukan dihitung di server, karena halaman publik
 * disajikan sebagai halaman statis yang disimpan cache — kunjungan tidak
 * selalu sampai ke server, jadi tidak ada tempat di sisi server yang dapat
 * menghitungnya. Akibatnya pengunjung yang mematikan JavaScript dan sebagian
 * besar perayap mesin pencari tidak terhitung, dan keterbatasan itu disebutkan
 * apa adanya kepada panitia di panel.
 *
 * Dipasang di tata letak publik, jadi cukup satu kali untuk seluruh halaman.
 * `usePathname` dipantau karena perpindahan halaman di Next tidak memuat ulang
 * tata letaknya: tanpa itu, hanya halaman pertama yang terhitung.
 *
 * Gagalnya pengiriman diabaikan dengan sengaja. Pencatat kunjungan tidak boleh
 * pernah menjadi sebab halaman terasa rusak di sisi pengunjung — ia hiasan
 * bagi panitia, bukan bagian dari layanannya. `keepalive` dipasang supaya
 * pengiriman tetap selesai walau pengunjung langsung berpindah halaman.
 */
export function PencatatKunjungan() {
  const jalur = usePathname();

  useEffect(() => {
    if (!jalur || jalur.startsWith("/admin")) return;
    const batal = new AbortController();
    fetch(`${ALAMAT_API}/api/kunjungan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ halaman: jalur }),
      keepalive: true,
      signal: batal.signal,
    }).catch(() => {});
    return () => batal.abort();
  }, [jalur]);

  return null;
}

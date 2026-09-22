"use client";

import { useCallback, useEffect, useState } from "react";
import { GalatApi } from "./api";

interface Keadaan<T> {
  /** Penanda permintaan yang menghasilkan isi ini. */
  kunci: string;
  data: T | null;
  galat: string;
}

/**
 * Pengambil data untuk halaman panel admin: satu keadaan memuat, satu
 * keadaan galat, dan satu cara memuat ulang. Sengaja sederhana dan tanpa
 * pustaka tambahan, karena panel ini dipakai beberapa petugas saja dan
 * tidak butuh cache bersama antar komponen.
 *
 * Keadaan "memuat" tidak disimpan sebagai state tersendiri melainkan
 * disimpulkan dari perbandingan penanda: selama isi yang tersimpan belum
 * berasal dari permintaan yang sedang berlaku, berarti masih memuat.
 * Dengan begitu tidak ada pemanggilan setState di dalam badan effect, yang
 * akan memicu render berantai setiap kali penyaring berubah.
 */
export function useMuat<T>(
  ambil: () => Promise<T>,
  pemicu: unknown[] = [],
): {
  data: T | null;
  memuat: boolean;
  galat: string;
  muatUlang: () => void;
} {
  const [penanda, setPenanda] = useState(0);
  const [keadaan, setKeadaan] = useState<Keadaan<T>>({
    kunci: "",
    data: null,
    galat: "",
  });

  const kunci = JSON.stringify([penanda, ...pemicu]);
  const muatUlang = useCallback(() => setPenanda((n) => n + 1), []);

  useEffect(() => {
    let dibatalkan = false;

    ambil()
      .then((hasil) => {
        if (!dibatalkan) setKeadaan({ kunci, data: hasil, galat: "" });
      })
      .catch((e) => {
        if (dibatalkan) return;
        setKeadaan({
          kunci,
          data: null,
          galat:
            e instanceof GalatApi
              ? e.message
              : "Data tidak dapat dimuat. Periksa koneksi Anda.",
        });
      });

    return () => {
      dibatalkan = true;
    };
    // `ambil` dibuat ulang setiap render oleh pemanggil, jadi yang dipakai
    // sebagai pemicu adalah penanda yang memang menentukan hasilnya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci]);

  const selaras = keadaan.kunci === kunci;
  return {
    data: selaras ? keadaan.data : null,
    memuat: !selaras,
    galat: selaras ? keadaan.galat : "",
    muatUlang,
  };
}

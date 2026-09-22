"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, ambilToken, hapusSesi, simpanSesi } from "@/lib/api";
import type { Pengguna } from "@/lib/tipe";

/**
 * Sesi petugas. Token disimpan di localStorage peramban, lalu diperiksa
 * ulang ke server saat halaman dimuat — penyimpanan lokal bisa berisi token
 * yang sudah kedaluwarsa atau kata sandinya sudah diganti.
 */

interface IsiSesi {
  pengguna: Pengguna | null;
  /** true selama pemeriksaan awal, agar halaman tidak berkedip. */
  memeriksa: boolean;
  masuk: (username: string, sandi: string) => Promise<void>;
  keluar: () => void;
}

const Konteks = createContext<IsiSesi | null>(null);

export function PenyediaSesi({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [memeriksa, setMemeriksa] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let dibatalkan = false;

    // Token yang tersimpan di peramban belum tentu masih sah: bisa sudah
    // kedaluwarsa, atau kata sandinya sudah diganti. Karena itu identitas
    // selalu ditanyakan ulang ke server, dan tidak dipulihkan dari
    // penyimpanan lokal.
    const janji = ambilToken() ? api.saya() : Promise.resolve(null);

    janji
      .then((p) => {
        if (!dibatalkan) {
          setPengguna(p);
          setMemeriksa(false);
        }
      })
      .catch(() => {
        if (dibatalkan) return;
        hapusSesi();
        setPengguna(null);
        setMemeriksa(false);
      });

    return () => {
      dibatalkan = true;
    };
  }, []);

  const masuk = useCallback(async (username: string, sandi: string) => {
    const hasil = await api.masuk({ username, sandi });
    simpanSesi(hasil.token);
    setPengguna(hasil.pengguna);
  }, []);

  const keluar = useCallback(() => {
    hapusSesi();
    setPengguna(null);
    router.replace("/admin/masuk");
  }, [router]);

  return (
    <Konteks.Provider value={{ pengguna, memeriksa, masuk, keluar }}>
      {children}
    </Konteks.Provider>
  );
}

export function useSesi(): IsiSesi {
  const isi = useContext(Konteks);
  if (!isi) {
    throw new Error("useSesi hanya boleh dipakai di dalam PenyediaSesi.");
  }
  return isi;
}

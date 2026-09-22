"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import * as Toast from "@radix-ui/react-toast";

/**
 * Pemberitahuan singkat setelah petugas menyimpan sesuatu.
 *
 * Sebelumnya pesan berhasil ditampilkan menempel di atas halaman. Pada
 * halaman yang panjang seperti daftar pendaftar, petugas yang sedang
 * menggulir ke bawah tidak pernah melihatnya. Radix Toast menempatkannya
 * di sudut layar, lengkap dengan urutan fokus papan tombol dan pembacaan
 * oleh pembaca layar.
 */

interface IsiKabar {
  beri: (pesan: string, jenis?: "berhasil" | "galat") => void;
}

const Konteks = createContext<IsiKabar | null>(null);

interface Butir {
  id: number;
  pesan: string;
  jenis: "berhasil" | "galat";
}

export function PenyediaKabar({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<Butir[]>([]);

  const beri = useCallback((pesan: string, jenis: "berhasil" | "galat" = "berhasil") => {
    setDaftar((d) => [...d, { id: Date.now() + Math.random(), pesan, jenis }]);
  }, []);

  const tutup = (id: number) =>
    setDaftar((d) => d.filter((b) => b.id !== id));

  return (
    <Konteks.Provider value={{ beri }}>
      <Toast.Provider swipeDirection="right" duration={5000} label="Pemberitahuan">
        {children}

        {daftar.map((b) => (
          <Toast.Root
            key={b.id}
            open
            onOpenChange={(buka) => !buka && tutup(b.id)}
            className={
              "rounded-kartu border px-5 py-4 text-sm shadow-kuat " +
              "data-[state=open]:animate-[munculKabar_0.2s_ease-out] " +
              (b.jenis === "berhasil"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800")
            }
          >
            <Toast.Description>{b.pesan}</Toast.Description>
            <Toast.Close
              aria-label="Tutup pemberitahuan"
              className="absolute top-2 right-3 text-base leading-none opacity-50 hover:opacity-100"
            >
              ×
            </Toast.Close>
          </Toast.Root>
        ))}

        <Toast.Viewport
          className="fixed right-4 bottom-4 z-200 flex w-[min(24rem,calc(100vw-2rem))]
                     flex-col gap-2 outline-none"
        />
      </Toast.Provider>
    </Konteks.Provider>
  );
}

export function useKabar(): IsiKabar {
  const isi = useContext(Konteks);
  // Halaman yang dipakai di luar penyedia tetap berjalan; pemberitahuannya
  // saja yang tidak tampil. Ini mencegah satu halaman mematikan seluruh
  // panel hanya karena lupa dibungkus.
  return isi ?? { beri: () => {} };
}

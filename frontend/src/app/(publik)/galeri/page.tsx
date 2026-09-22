import { api } from "@/lib/api";
import { KepalaHalaman } from "@/komponen/Bagian";
import { TanpaData } from "@/komponen/Memuat";
import PetakGaleri from "@/komponen/Galeri";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeri Kegiatan",
  description: "Dokumentasi foto kegiatan dan suasana sekolah.",
};

export default async function HalamanGaleri() {
  const hasil = await api
    .galeri()
    .catch(() => ({ data: [], kategori: [] as string[] }));

  return (
    <>
      <KepalaHalaman
        judul="Galeri Kegiatan"
        keterangan="Dokumentasi suasana belajar, kegiatan peserta didik, dan acara sekolah."
      />
      <div className="wadah py-14">
        {hasil.data.length === 0 ? (
          <TanpaData
            judul="Belum ada foto di galeri"
            keterangan="Foto dapat ditambahkan lewat menu Galeri di panel admin."
          />
        ) : (
          <PetakGaleri foto={hasil.data} kategori={hasil.kategori} />
        )}
      </div>
    </>
  );
}

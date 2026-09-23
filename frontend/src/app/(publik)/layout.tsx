import Navigasi from "@/komponen/Navigasi";
import Footer from "@/komponen/Footer";
import GulirHalus from "@/komponen/GulirHalus";
import BantuanMelayang from "@/komponen/BantuanMelayang";
import { muatProfil } from "@/lib/profil";

export default async function TataLetakPublik({ children }: LayoutProps<"/">) {
  const { profil, gagal } = await muatProfil();

  return (
    <>
      <GulirHalus />
      <Navigasi pengaturan={profil.pengaturan} ppdbDibuka={profil.ppdb.dibuka} />

      {gagal && (
        <div className="bg-amber-50 text-amber-900">
          <p className="wadah py-2.5 text-center text-sm">
            Sebagian data belum dapat dimuat karena server belum merespons.
            Muat ulang halaman ini beberapa saat lagi.
          </p>
        </div>
      )}

      <main className="flex-1">{children}</main>
      <Footer pengaturan={profil.pengaturan} />

      {/* Tombol bantuan melayang. Hanya di halaman publik: panitia sudah
          tahu alurnya, dan di panel tombol melayang justru menutupi tabel. */}
      <BantuanMelayang
        pengaturan={profil.pengaturan}
        ppdbDibuka={profil.ppdb.dibuka}
      />
    </>
  );
}

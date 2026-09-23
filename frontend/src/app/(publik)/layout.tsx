import Navigasi from "@/komponen/Navigasi";
import Footer from "@/komponen/Footer";
import GulirHalus from "@/komponen/GulirHalus";
import BantuanMelayang from "@/komponen/BantuanMelayang";
import { TeksBerjalan } from "@/komponen/TeksBerjalan";
import { api } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import type { Berita } from "@/lib/tipe";

export default async function TataLetakPublik({ children }: LayoutProps<"/">) {
  const { profil, gagal } = await muatProfil();

  // Satu pengumuman terbaru untuk bilah berjalan. Kegagalannya tidak boleh
  // mengosongkan seluruh halaman, jadi ditangkap di sini: bilahnya cukup
  // memakai dua kabar lainnya.
  const berita = await api
    .berita("?per_halaman=1")
    .then((h) => h.data)
    .catch((): Berita[] => []);

  return (
    <>
      <GulirHalus />
      <TeksBerjalan profil={profil} berita={berita} />
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

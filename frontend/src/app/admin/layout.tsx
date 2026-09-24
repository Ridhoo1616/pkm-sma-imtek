import { PenyediaSesi } from "@/komponen/Sesi";
import { PenyediaKabar } from "@/komponen/Kabar";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Admin",
  // Halaman panel tidak boleh masuk hasil pencarian.
  robots: { index: false, follow: false },
};

/**
 * Kerangka panel dipasang DI SINI, bukan di dalam tiap halaman.
 *
 * Sebelumnya setiap halaman panel membungkus isinya sendiri dengan
 * <KerangkaAdmin>. Akibatnya sidebar ikut dibongkar dan dipasang ulang pada
 * SETIAP perpindahan menu, dan bersama itu hilang pula posisi gulir daftar
 * menunya. Menunya dua puluh butir, lebih tinggi daripada layar: panitia yang
 * menggulir ke bawah lalu menekan menu terakhir mendapati daftarnya melompat
 * kembali ke puncak. Menu yang baru dipilihnya tetap terpilih, tetapi berada
 * di luar pandangan dan harus dicari lagi dengan menggulir.
 *
 * Di layout, kerangkanya tidak dibongkar saat pindah halaman: simpul DOM-nya
 * tetap yang sama, sehingga posisi gulirnya terjaga dengan sendirinya. Itu
 * pula cara yang memang disediakan App Router untuk tampilan bersama.
 *
 * Halaman masuk juga berada di bawah /admin, dan ia BUKAN bagian panel.
 * KerangkaAdmin sendiri yang melewatkannya. Memindahkannya ke grup jalur
 * tersendiri lebih rapi, tetapi berarti memindahkan dua puluh satu berkas,
 * dan rekan yang sedang menyunting halaman-halaman itu akan mewarisi
 * tabrakan penggabungan yang tidak sepadan dengan untungnya.
 */
export default function TataLetakAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <PenyediaSesi>
      <PenyediaKabar>
        <KerangkaAdmin>{children}</KerangkaAdmin>
      </PenyediaKabar>
    </PenyediaSesi>
  );
}

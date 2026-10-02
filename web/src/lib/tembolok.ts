import { api } from "@/lib/api";
import { muatProfil, type HasilProfil } from "@/lib/profil";

/**
 * Tembolok singkat di sisi server untuk jawaban API halaman publik.
 *
 * Tata letak dan halamannya sama-sama butuh profil sekolah, dan tanpa
 * tembolok setiap kunjungan memanggil /api/profil dua kali. Frontend Next
 * menyelesaikannya dengan `revalidate: 30`; di sini dengan peta janji
 * berumur pendek. Yang disimpan JANJINYA, bukan hasilnya, sehingga dua
 * permintaan yang datang bersamaan tetap hanya memicu satu panggilan.
 *
 * Umurnya 15 detik: perubahan dari panel admin paling lambat terlihat
 * selama itu. Kegagalan tidak disimpan, supaya server yang baru menyala
 * tidak meninggalkan halaman kosong selama 15 detik berikutnya.
 */
const UMUR_MS = 15_000;
const simpanan = new Map<string, { sampai: number; janji: Promise<unknown> }>();

export function sekali<T>(kunci: string, ambil: () => Promise<T>): Promise<T> {
  const ada = simpanan.get(kunci);
  if (ada && ada.sampai > Date.now()) return ada.janji as Promise<T>;
  const janji = ambil();
  simpanan.set(kunci, { sampai: Date.now() + UMUR_MS, janji });
  janji.catch(() => simpanan.delete(kunci));
  return janji;
}

export const data = {
  profil: (): Promise<HasilProfil> =>
    sekali("profil", async () => {
      const hasil = await muatProfil();
      // muatProfil tidak pernah melempar; kegagalannya berupa cadangan.
      // Cadangan itu tidak boleh ikut disimpan.
      if (hasil.gagal) simpanan.delete("profil");
      return hasil;
    }),
  jurusan: () => sekali("jurusan", () => api.jurusan()),
  fasilitas: () => sekali("fasilitas", () => api.fasilitas()),
  berita: (kueri = "") => sekali(`berita${kueri}`, () => api.berita(kueri)),
  faq: () => sekali("faq", () => api.faq()),
  tenaga: () => sekali("tenaga", () => api.tenaga()),
  kegiatanSiswa: () => sekali("kegiatan", () => api.kegiatanSiswa()),
  agenda: () => sekali("agenda", () => api.agenda()),
  pustaka: () => sekali("pustaka", () => api.pustaka()),
  lowonganBkk: () => sekali("lowonganBkk", () => api.lowonganBkk()),
  mitraBkk: () => sekali("mitraBkk", () => api.mitraBkk()),
  galeri: () => sekali("galeri", () => api.galeri()),
  biaya: () => sekali("biaya", () => api.biaya()),
  infoUjian: () => sekali("infoUjian", () => api.infoUjian()),
  halamanDetail: (slug: string) => sekali(`halaman:${slug}`, () => api.halamanDetail(slug)),
};

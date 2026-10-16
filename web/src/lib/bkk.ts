import { tautanWa } from "@/lib/format";
import type { Pengaturan } from "@/lib/tipe";

/**
 * Jalan masuk ke petugas BKK: chat langsung ke admin dan grup WhatsApp.
 * Dipakai halaman /bkk dan /bkk/lowongan, supaya keduanya mengarahkan ke
 * tempat yang sama. Penyaluran kerja berjalan lewat grup yang dipegang
 * admin (migrasi 033), jadi melamar = menghubungi admin atau masuk grup.
 */
export function kontakBkk(p: Pengaturan, namaSekolah: string, pesan?: string) {
  const nomorAdmin = (p.bkk_kontak || p.whatsapp || "").trim();
  const chatAdmin = tautanWa(
    nomorAdmin,
    pesan ?? `Halo admin BKK ${namaSekolah}, saya ingin bergabung dengan grup WhatsApp BKK untuk info penyaluran kerja.`,
  );
  // Tautan undangan grup lebih dulu; tanpa itu, tombol gabung membuka chat admin.
  const grup = /^https?:\/\//.test((p.bkk_grup_wa ?? "").trim()) ? p.bkk_grup_wa!.trim() : "";
  return { nomorAdmin, chatAdmin, grup, gabung: grup || chatAdmin };
}

import { api } from "./api";
import type { Profil } from "./tipe";

/**
 * Nilai cadangan bila API belum bisa dihubungi. Halaman tetap tampil dan
 * memberi keterangan, bukan menampilkan layar galat — penting karena
 * halaman publik ini adalah wajah sekolah.
 */
const CADANGAN: Profil = {
  pengaturan: {
    nama_sekolah: "SMA IMTEK",
    nama_singkat: "SI",
    kota: "Kabupaten Tangerang",
  },
  ppdb: { dibuka: false, kuota: 0, terisi: 0, jalur: [], sumber: [] },
};

export interface HasilProfil {
  profil: Profil;
  /** true bila data di atas adalah cadangan karena API tidak terjangkau. */
  gagal: boolean;
}

export async function muatProfil(): Promise<HasilProfil> {
  try {
    return { profil: await api.profil(), gagal: false };
  } catch {
    return { profil: CADANGAN, gagal: true };
  }
}

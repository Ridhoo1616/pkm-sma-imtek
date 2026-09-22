/** Pembantu penyajian angka dan tanggal dalam kebiasaan Indonesia. */

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2027-07-05" -> "5 Juli 2027". Nilai kosong atau tidak sah dikembalikan apa adanya. */
export function tanggalPanjang(teks: string): string {
  if (!teks) return "-";
  const t = new Date(teks.replace(" ", "T"));
  if (Number.isNaN(t.getTime())) return teks;
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

/** Menyertakan jam, untuk keperluan admin. */
export function tanggalJam(teks: string): string {
  if (!teks) return "-";
  const t = new Date(teks.replace(" ", "T"));
  if (Number.isNaN(t.getTime())) return teks;
  const jam = String(t.getHours()).padStart(2, "0");
  const menit = String(t.getMinutes()).padStart(2, "0");
  return `${tanggalPanjang(teks)}, ${jam}.${menit}`;
}

/** "2026-09" -> "September 2026", untuk sumbu grafik bulanan. */
export function namaBulan(teks: string): string {
  const [tahun, bulan] = teks.split("-");
  const i = Number(bulan) - 1;
  return BULAN[i] ? `${BULAN[i]} ${tahun}` : teks;
}

export function angka(n: number): string {
  return n.toLocaleString("id-ID");
}

/** Nilai rapor: 87.25 -> "87,25"; kosong -> "-". */
export function nilai(n: number | null): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function jenisKelaminPanjang(kode: string): string {
  return kode === "P" ? "Perempuan" : kode === "L" ? "Laki-laki" : "-";
}

/** Persentase untuk bilah grafik; pembagi nol menghasilkan nol, bukan NaN. */
export function persen(bagian: number, total: number): number {
  if (!total) return 0;
  return Math.round((bagian / total) * 100);
}

/**
 * Warna lencana status pendaftar. Statusnya lima dan tetap, jadi
 * pemetaannya ditulis langsung agar warnanya konsisten di semua halaman.
 */
export function warnaStatus(status: string): string {
  switch (status) {
    case "Diterima":
      return "bg-green-100 text-green-800 border-green-200";
    case "Terverifikasi":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Cadangan":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Ditolak":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

/**
 * Isi berita disimpan sebagai teks biasa. Baris kosong menjadi pemisah
 * paragraf, sehingga naskah tetap terbaca tanpa perlu HTML dari basis data
 * — yang juga berarti tidak ada risiko skrip tersisip dari isi berita.
 */
export function keParagraf(isi: string): string[] {
  return isi
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Nomor WhatsApp Indonesia untuk tautan wa.me: "0812..." -> "62812...".
 * Mengembalikan string kosong bila nomornya belum diisi sekolah.
 */
export function nomorWa(nomor: string): string {
  const angkaSaja = (nomor || "").replace(/\D/g, "");
  if (!angkaSaja) return "";
  if (angkaSaja.startsWith("62")) return angkaSaja;
  if (angkaSaja.startsWith("0")) return `62${angkaSaja.slice(1)}`;
  return angkaSaja;
}

/**
 * Menandai nilai pengaturan yang masih berupa penanda "[DALAM KURUNG SIKU]",
 * yaitu data yang belum dikonfirmasi pihak sekolah.
 */
export function belumTerisi(nilai: string): boolean {
  const t = (nilai || "").trim();
  return t === "" || (t.startsWith("[") && t.endsWith("]"));
}

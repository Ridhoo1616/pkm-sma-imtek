import type { JenisLencana } from "@/komponen/Bagian";

/** Pembantu penyajian angka dan tanggal dalam kebiasaan Indonesia. */

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
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
 * Warna lencana status pendaftar. Yang dikembalikan nama jenis lencana, bukan
 * gabungan kelas: warnanya sendiri ditentukan komponen Lencana, sehingga
 * bentuk seluruh status tidak dapat menyimpang satu halaman pun.
 *
 * Statusnya lima dan tetap, jadi pemetaannya ditulis langsung.
 */
export function warnaStatus(status: string): JenisLencana {
  switch (status) {
    case "Diterima":
      return "hijau";
    case "Terverifikasi":
      return "biru";
    case "Cadangan":
      return "emas";
    case "Ditolak":
      return "merah";
    default:
      // "Menunggu Verifikasi" dan status lain yang belum diputuskan.
      return "abu";
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
 * Memecah naskah panjang menjadi bagian-bagian berjudul.
 *
 * Aturannya satu: paragraf yang diawali "## " adalah JUDUL BAGIAN, sisanya
 * isi bagian itu. Paragraf sebelum judul pertama menjadi pembuka yang tidak
 * bernaung di bawah judul mana pun.
 *
 * Dibuat begini, bukan dengan menambah tabel bagian tersendiri, karena
 * sekolah menulis naskahnya di satu kotak teks pada panel admin. Menambah
 * tabel berarti panitia harus mengisi judul dan isi di dua tempat, dan
 * halaman yang bagiannya belum lengkap akan tampil setengah jadi. Dengan
 * penanda "## ", satu kotak teks yang sama menghasilkan naskah beserta
 * daftar isinya sekaligus, dan halaman tanpa penanda itu tetap tampil apa
 * adanya sebagai naskah biasa.
 *
 * `id` dipakai sebagai sasaran tautan di dalam halaman. Dibuat dari judulnya
 * sendiri supaya alamatnya terbaca manusia, dan diberi nomor urut di
 * belakangnya supaya dua judul yang sama tidak bertabrakan.
 */
export interface BagianNaskah {
  judul: string;
  id: string;
  paragraf: string[];
}

export function bagianNaskah(isi: string): {
  pembuka: string[];
  bagian: BagianNaskah[];
} {
  const pembuka: string[] = [];
  const bagian: BagianNaskah[] = [];

  for (const p of keParagraf(isi)) {
    const judul = p.startsWith("## ") ? p.slice(3).trim() : "";
    if (judul) {
      bagian.push({ judul, id: keIdJudul(judul, bagian.length), paragraf: [] });
      continue;
    }
    if (bagian.length === 0) pembuka.push(p);
    else bagian[bagian.length - 1].paragraf.push(p);
  }

  return { pembuka, bagian };
}

function keIdJudul(judul: string, urutan: number): string {
  const dasar = judul
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `bagian-${urutan + 1}${dasar ? "-" + dasar : ""}`;
}

/** Kalimat pertama sebuah bagian, untuk dipakai sebagai keterangan singkat. */
export function kalimatPertama(paragraf: string[], maks = 90): string {
  const teks = (paragraf[0] ?? "").replace(/\s+/g, " ").trim();
  if (!teks) return "";
  const titik = teks.search(/[.!?](\s|$)/);
  const kalimat = titik > 0 ? teks.slice(0, titik + 1) : teks;
  return kalimat.length > maks
    ? kalimat.slice(0, maks - 1).trimEnd() + "\u2026"
    : kalimat;
}

/**
 * Nomor WhatsApp Indonesia untuk tautan wa.me: "0812..." -> "62812...".
 * Mengembalikan string kosong bila nomornya belum diisi sekolah.
 */
/**
 * Pengaturan yang isinya daftar — misi dan keunggulan — ditulis satu baris
 * satu poin. Penomoran atau tanda hubung yang mungkin ikut diketik panitia
 * dibuang, supaya tidak menjadi "1. 1." ketika halamannya menomori sendiri.
 */
export function kePoin(isi: string): string[] {
  return (isi || "")
    .split("\n")
    .map((baris) => baris.trim().replace(/^[-•*\d.)\s]+/, ""))
    .filter(Boolean);
}

/**
 * Daftar poin yang benar-benar sudah dikirim sekolah.
 *
 * Perlu tersendiri karena belumTerisi() memeriksa SELURUH nilai: pada
 * pengaturan berisi banyak baris, nilai yang barisnya sebagian sudah diisi
 * tetap diawali "[" dan diakhiri "]", sehingga terbaca kosong seluruhnya dan
 * poin yang sudah diisi pun hilang. Di sini penandanya diperiksa per baris.
 */
export function kePoinTerisi(isi: string): string[] {
  return kePoin(isi).filter((poin) => !belumTerisi(poin));
}

/**
 * Tautan WhatsApp beserta pesan yang sudah terisi.
 *
 * Dipusatkan di sini karena tautan wa.me tersebar di lima tempat — bilah
 * atas, footer, halaman Kontak, tombol bantuan melayang, dan panel pesan —
 * dan empat di antaranya dulu mengarah ke wa.me TANPA pesan apa pun. Yang
 * membuka jadi menghadap ruang obrolan kosong, lalu harus menyusun sendiri
 * pertanyaannya; sebagian akan menutupnya begitu saja. Pesan bawaan
 * menghilangkan hambatan itu, dan sekaligus memberi panitia konteks pada
 * pesan pertama yang masuk.
 *
 * Nomor yang belum diisi mengembalikan string kosong, jadi pemanggilnya dapat
 * menyembunyikan tombolnya — bukan menampilkan tautan yang menuju entah ke
 * mana.
 */
export function tautanWa(nomor: string, pesan: string): string {
  const wa = nomorWa(nomor);
  if (!wa) return "";
  const isi = pesan.trim();
  return isi
    ? `https://wa.me/${wa}?text=${encodeURIComponent(isi)}`
    : `https://wa.me/${wa}`;
}

/** Pesan bawaan bagi pengunjung yang ingin bertanya tentang PPDB. */
export function pesanTanyaPpdb(namaSekolah: string): string {
  const nama = (namaSekolah || "").trim() || "sekolah";
  return `Assalamualaikum, saya ingin bertanya tentang PPDB ${nama}.`;
}

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

/**
 * Menggabungkan alamat dengan kode pos, tanpa menuliskannya dua kali.
 *
 * Alamat yang diisi sekolah pada umumnya sudah memuat kode posnya di ujung,
 * sehingga menambahkannya lagi menghasilkan "Banten 15339 15339".
 */
export function alamatLengkap(alamat?: string, kodePos?: string): string {
  const a = (alamat ?? "").trim();
  const k = (kodePos ?? "").trim();
  if (!k || a.includes(k)) return a;
  return a ? `${a} ${k}` : k;
}

/**
 * Menuliskan jumlah rupiah dengan pemisah ribuan gaya Indonesia.
 *
 * Sen tidak pernah dipakai pada biaya sekolah, jadi angkanya dibulatkan dan
 * tidak diberi bagian desimal.
 */
export function rupiah(jumlah: number): string {
  return "Rp" + Math.round(jumlah).toLocaleString("id-ID");
}

/**
 * Ukuran berkas dalam satuan yang enak dibaca: "1,4 MB".
 *
 * Pembaginya 1024, bukan 1000, mengikuti yang ditampilkan sistem operasi
 * pada berkas yang sama, supaya angkanya tidak berbeda dari yang dilihat
 * pendaftar di ponselnya.
 */
export function ukuranBerkas(bita: number): string {
  if (!Number.isFinite(bita) || bita <= 0) return "0 KB";
  if (bita < 1024) return `${bita} B`;
  const kb = bita / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MB`;
}

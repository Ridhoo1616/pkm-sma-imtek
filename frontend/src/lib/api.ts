/**
 * Satu-satunya tempat frontend berbicara dengan backend Go.
 *
 * Alamat API dibaca dari NEXT_PUBLIC_API_URL supaya nilainya bisa berbeda
 * antara komputer sendiri dan server, tanpa mengubah kode.
 */

export const ALAMAT_API = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090"
).replace(/\/$/, "");

/**
 * Lama hasil API halaman publik boleh dipakai ulang, dalam detik. Nilainya
 * pendek karena isi situs diubah dari panel admin dan perubahannya harus
 * segera terlihat; penyegaran seketika setelah admin menyimpan dilakukan
 * lewat `segarkanHalamanPublik`.
 */
const CACHE_PUBLIK = 30;

const KUNCI_TOKEN = "pkm_token";

/** Bentuk galat yang dikirim backend; sama untuk seluruh alamat API. */
export interface IsiGalat {
  pesan: string;
  kolom?: Record<string, string>;
  daftar?: string[];
}

/**
 * GalatApi membawa pesan yang siap ditampilkan, beserta galat per kolom
 * bila yang gagal adalah pemeriksaan isian formulir.
 */
export class GalatApi extends Error {
  status: number;
  kolom: Record<string, string>;
  daftar: string[];

  constructor(status: number, isi: IsiGalat) {
    super(isi.pesan || "Terjadi gangguan saat menghubungi server.");
    this.name = "GalatApi";
    this.status = status;
    this.kolom = isi.kolom ?? {};
    this.daftar = isi.daftar ?? [];
  }
}

export function ambilToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KUNCI_TOKEN);
  } catch {
    // Penyimpanan bisa diblokir, misalnya pada jendela penyamaran.
    return null;
  }
}

/**
 * Hanya token yang disimpan. Identitas penggunanya selalu ditanyakan ulang
 * ke server saat panel dibuka, sehingga tidak ada peran atau nama basi yang
 * ikut menentukan tampilan.
 */
export function simpanSesi(token: string) {
  try {
    window.localStorage.setItem(KUNCI_TOKEN, token);
  } catch {
    // Tidak apa-apa bila gagal: sesi tetap berjalan sampai halaman dimuat ulang.
  }
}

export function hapusSesi() {
  try {
    window.localStorage.removeItem(KUNCI_TOKEN);
  } catch {
    /* diabaikan */
  }
}

interface PilihanPermintaan {
  metode?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Dikirim sebagai JSON. */
  isi?: unknown;
  /** Dikirim sebagai multipart, untuk alamat yang menerima berkas. */
  formulir?: FormData;
  /** Sertakan token petugas. */
  token?: boolean;
  /** Berapa lama hasilnya boleh dipakai ulang di sisi server, dalam detik. */
  segarkanSetiap?: number;
}

async function permintaan<T>(jalur: string, p: PilihanPermintaan = {}): Promise<T> {
  const kepala: Record<string, string> = {};
  let badan: BodyInit | undefined;

  if (p.formulir) {
    // Content-Type tidak diisi sendiri: peramban perlu menambahkan
    // batas multipart-nya, dan itu hanya terjadi bila kepalanya dibiarkan.
    badan = p.formulir;
  } else if (p.isi !== undefined) {
    kepala["Content-Type"] = "application/json";
    badan = JSON.stringify(p.isi);
  }

  if (p.token) {
    const t = ambilToken();
    if (t) kepala["Authorization"] = `Bearer ${t}`;
  }

  let jawaban: Response;
  try {
    jawaban = await fetch(`${ALAMAT_API}${jalur}`, {
      method: p.metode ?? "GET",
      headers: kepala,
      body: badan,
      next:
        p.segarkanSetiap !== undefined
          ? { revalidate: p.segarkanSetiap }
          : undefined,
      cache: p.segarkanSetiap === undefined ? "no-store" : undefined,
    });
  } catch {
    throw new GalatApi(0, {
      pesan:
        "Tidak dapat menghubungi server. Periksa koneksi Anda, " +
        "atau pastikan server API sedang berjalan.",
    });
  }

  if (jawaban.status === 204) return undefined as T;

  const tipe = jawaban.headers.get("content-type") ?? "";
  if (!tipe.includes("application/json")) {
    if (!jawaban.ok) {
      throw new GalatApi(jawaban.status, {
        pesan: `Server menjawab dengan galat ${jawaban.status}.`,
      });
    }
    return (await jawaban.text()) as T;
  }

  const isi = await jawaban.json();
  if (!jawaban.ok) throw new GalatApi(jawaban.status, isi as IsiGalat);
  return isi as T;
}

/** URL gambar unggahan; kosong berarti pakai gambar cadangan. */
export function urlUnggahan(subfolder: string, nama: string): string {
  if (!nama) return "";
  return `${ALAMAT_API}/unggahan/${subfolder}/${encodeURIComponent(nama)}`;
}

export const api = {
  /* ---------- publik ---------- */
  profil: () => permintaan<import("./tipe").Profil>("/api/profil", { segarkanSetiap: CACHE_PUBLIK }),
  jurusan: () =>
    permintaan<{ data: import("./tipe").Jurusan[] }>("/api/jurusan", { segarkanSetiap: CACHE_PUBLIK }),
  fasilitas: () =>
    permintaan<{ data: import("./tipe").Fasilitas[] }>("/api/fasilitas", { segarkanSetiap: CACHE_PUBLIK }),
  berita: (kueri = "") =>
    permintaan<import("./tipe").HalamanBerita>(`/api/berita${kueri}`, { segarkanSetiap: CACHE_PUBLIK }),
  beritaDetail: (slug: string) =>
    permintaan<{
      data: import("./tipe").Berita;
      terkait: import("./tipe").Berita[];
    }>(`/api/berita/${encodeURIComponent(slug)}`),
  galeri: (kueri = "") =>
    permintaan<{ data: import("./tipe").Galeri[]; kategori: string[] }>(
      `/api/galeri${kueri}`,
      { segarkanSetiap: CACHE_PUBLIK },
    ),
  kirimPesan: (isi: unknown) =>
    permintaan<{ pesan: string }>("/api/pesan", { metode: "POST", isi }),

  /* ---------- PPDB ---------- */
  daftar: (formulir: FormData) =>
    permintaan<{ pesan: string; no_registrasi: string; tahun_ajaran: string }>(
      "/api/ppdb/daftar",
      { metode: "POST", formulir },
    ),
  cekStatus: (isi: { no_registrasi: string; tanggal_lahir: string }) =>
    permintaan<import("./tipe").StatusPendaftaran>("/api/ppdb/cek", {
      metode: "POST",
      isi,
    }),

  /* ---------- autentikasi ---------- */
  masuk: (isi: { username: string; sandi: string }) =>
    permintaan<{ token: string; pengguna: import("./tipe").Pengguna }>("/api/masuk", {
      metode: "POST",
      isi,
    }),
  saya: () => permintaan<import("./tipe").Pengguna>("/api/saya", { token: true }),
  gantiSandi: (isi: { sandi_lama: string; sandi_baru: string }) =>
    permintaan<{ pesan: string }>("/api/saya/sandi", {
      metode: "POST",
      isi,
      token: true,
    }),

  /* ---------- dasbor & pendaftar ---------- */
  dasbor: () => permintaan<import("./tipe").Dasbor>("/api/admin/dasbor", { token: true }),
  daftarPendaftar: (kueri = "") =>
    permintaan<import("./tipe").HalamanPendaftar>(`/api/admin/pendaftar${kueri}`, {
      token: true,
    }),
  detailPendaftar: (id: number) =>
    permintaan<{
      data: import("./tipe").Pendaftar;
      pilihan_status: string[];
      label_sumber: Record<string, string>;
    }>(`/api/admin/pendaftar/${id}`, { token: true }),
  ubahStatus: (id: number, isi: { status: string; catatan_admin: string }) =>
    permintaan<{ pesan: string }>(`/api/admin/pendaftar/${id}/status`, {
      metode: "PATCH",
      isi,
      token: true,
    }),
  hapusPendaftar: (id: number) =>
    permintaan<{ pesan: string }>(`/api/admin/pendaftar/${id}`, {
      metode: "DELETE",
      token: true,
    }),
  laporan: (tahun = "") =>
    permintaan<import("./tipe").Laporan>(
      `/api/admin/laporan${tahun ? `?tahun_ajaran=${encodeURIComponent(tahun)}` : ""}`,
      { token: true },
    ),

  /* ---------- jurusan ---------- */
  jurusanAdmin: () =>
    permintaan<{ data: import("./tipe").Jurusan[] }>("/api/admin/jurusan", { token: true }),
  simpanJurusan: (isi: unknown) =>
    permintaan<{ pesan: string }>("/api/admin/jurusan", {
      metode: "POST",
      isi,
      token: true,
    }),
  ubahJurusan: (id: number, isi: unknown) =>
    permintaan<{ pesan: string }>(`/api/admin/jurusan/${id}`, {
      metode: "PUT",
      isi,
      token: true,
    }),
  hapusJurusan: (id: number) =>
    permintaan<{ pesan: string }>(`/api/admin/jurusan/${id}`, {
      metode: "DELETE",
      token: true,
    }),

  /* ---------- berita ---------- */
  beritaAdmin: (kueri = "") =>
    permintaan<import("./tipe").HalamanBerita>(`/api/admin/berita${kueri}`, { token: true }),
  simpanBerita: (formulir: FormData) =>
    permintaan<{ pesan: string; slug: string }>("/api/admin/berita", {
      metode: "POST",
      formulir,
      token: true,
    }),
  ubahBerita: (id: number, formulir: FormData) =>
    permintaan<{ pesan: string }>(`/api/admin/berita/${id}`, {
      metode: "PUT",
      formulir,
      token: true,
    }),
  hapusBerita: (id: number) =>
    permintaan<{ pesan: string }>(`/api/admin/berita/${id}`, {
      metode: "DELETE",
      token: true,
    }),

  /* ---------- galeri ---------- */
  simpanGaleri: (formulir: FormData) =>
    permintaan<{ pesan: string }>("/api/admin/galeri", {
      metode: "POST",
      formulir,
      token: true,
    }),
  ubahGaleri: (id: number, formulir: FormData) =>
    permintaan<{ pesan: string }>(`/api/admin/galeri/${id}`, {
      metode: "PUT",
      formulir,
      token: true,
    }),
  hapusGaleri: (id: number) =>
    permintaan<{ pesan: string }>(`/api/admin/galeri/${id}`, {
      metode: "DELETE",
      token: true,
    }),

  /* ---------- fasilitas ---------- */
  simpanFasilitas: (formulir: FormData) =>
    permintaan<{ pesan: string }>("/api/admin/fasilitas", {
      metode: "POST",
      formulir,
      token: true,
    }),
  ubahFasilitas: (id: number, formulir: FormData) =>
    permintaan<{ pesan: string }>(`/api/admin/fasilitas/${id}`, {
      metode: "PUT",
      formulir,
      token: true,
    }),
  hapusFasilitas: (id: number) =>
    permintaan<{ pesan: string }>(`/api/admin/fasilitas/${id}`, {
      metode: "DELETE",
      token: true,
    }),

  /* ---------- pesan masuk ---------- */
  pesanMasuk: (kueri = "") =>
    permintaan<import("./tipe").HalamanPesan>(`/api/admin/pesan${kueri}`, { token: true }),
  tandaiPesan: (id: number, dibaca: boolean) =>
    permintaan<{ pesan: string }>(`/api/admin/pesan/${id}`, {
      metode: "PATCH",
      isi: { dibaca },
      token: true,
    }),
  hapusPesan: (id: number) =>
    permintaan<{ pesan: string }>(`/api/admin/pesan/${id}`, {
      metode: "DELETE",
      token: true,
    }),

  /* ---------- pengaturan & pengguna ---------- */
  pengaturan: () =>
    permintaan<{ data: import("./tipe").ButirPengaturan[] }>("/api/admin/pengaturan", {
      token: true,
    }),
  simpanPengaturan: (pengaturan: Record<string, string>) =>
    permintaan<{ pesan: string }>("/api/admin/pengaturan", {
      metode: "PUT",
      isi: { pengaturan },
      token: true,
    }),
  pengguna: () =>
    permintaan<{ data: import("./tipe").Pengguna[]; peran: string[] }>(
      "/api/admin/pengguna",
      { token: true },
    ),
  simpanPengguna: (isi: unknown) =>
    permintaan<{ pesan: string }>("/api/admin/pengguna", {
      metode: "POST",
      isi,
      token: true,
    }),
  ubahPengguna: (id: number, isi: unknown) =>
    permintaan<{ pesan: string }>(`/api/admin/pengguna/${id}`, {
      metode: "PUT",
      isi,
      token: true,
    }),
  hapusPengguna: (id: number) =>
    permintaan<{ pesan: string }>(`/api/admin/pengguna/${id}`, {
      metode: "DELETE",
      token: true,
    }),
};

/**
 * Mengunduh bukti pendaftaran berbentuk PDF, dari sisi pendaftar.
 * Dibuka lewat fetch supaya galatnya dapat ditampilkan sebagai pesan,
 * bukan sebagai halaman putih berisi JSON.
 */
export async function unduhBukti(isi: {
  no_registrasi: string;
  tanggal_lahir: string;
}): Promise<{ nama: string; blob: Blob }> {
  const jawaban = await fetch(`${ALAMAT_API}/api/ppdb/bukti`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isi),
    cache: "no-store",
  });
  if (!jawaban.ok) {
    const tipe = jawaban.headers.get("content-type") ?? "";
    const galat: IsiGalat = tipe.includes("application/json")
      ? await jawaban.json()
      : { pesan: "Bukti pendaftaran gagal dibuat." };
    throw new GalatApi(jawaban.status, galat);
  }
  return {
    nama: `bukti-pendaftaran-${isi.no_registrasi}.pdf`,
    blob: await jawaban.blob(),
  };
}

/** Bukti pendaftaran dari sisi petugas, memakai token. */
export async function unduhBuktiAdmin(
  id: number,
  noRegistrasi: string,
): Promise<{ nama: string; blob: Blob }> {
  const t = ambilToken();
  const jawaban = await fetch(`${ALAMAT_API}/api/admin/pendaftar/${id}/bukti`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    cache: "no-store",
  });
  if (!jawaban.ok) {
    throw new GalatApi(jawaban.status, { pesan: "Bukti pendaftaran gagal dibuat." });
  }
  return {
    nama: `bukti-pendaftaran-${noRegistrasi}.pdf`,
    blob: await jawaban.blob(),
  };
}

/**
 * Meminta Next membuang cache halaman publik, dipakai setelah admin mengubah
 * isi situs. Kegagalannya tidak pernah dianggap galat: perubahan tetap
 * tersimpan di basis data dan akan terlihat setelah cache kedaluwarsa
 * sendiri, jadi tidak ada gunanya menakuti admin dengan pesan galat.
 */
export async function segarkanHalamanPublik(): Promise<void> {
  const t = ambilToken();
  if (!t) return;
  try {
    await fetch("/api/segarkan", {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
    });
  } catch {
    /* diabaikan dengan sengaja */
  }
}

/** Alamat unduh CSV; dibuka lewat fetch supaya token bisa disertakan. */
export async function unduhCsv(kueri = ""): Promise<{ nama: string; blob: Blob }> {
  const t = ambilToken();
  const jawaban = await fetch(`${ALAMAT_API}/api/admin/pendaftar/ekspor${kueri}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    cache: "no-store",
  });
  if (!jawaban.ok) {
    throw new GalatApi(jawaban.status, { pesan: "Berkas CSV gagal dibuat." });
  }
  const pemilik = jawaban.headers.get("content-disposition") ?? "";
  const cocok = pemilik.match(/filename="([^"]+)"/);
  return { nama: cocok?.[1] ?? "pendaftar.csv", blob: await jawaban.blob() };
}

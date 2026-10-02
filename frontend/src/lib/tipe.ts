/**
 * Bentuk data yang dikirim backend Go. Nama kolomnya sengaja dibiarkan
 * sama dengan nama kolom basis data agar mudah dilacak dari sisi mana pun.
 */

export type Pengaturan = Record<string, string>;

export interface KeadaanPpdb {
  dibuka: boolean;
  /**
   * Mengapa tertutup, bukan hanya apakah tertutup: "dibuka",
   * "belum_mulai", "sudah_selesai", atau "ditutup". Lihat lib/ppdb.ts.
   */
  keadaan?: "dibuka" | "belum_mulai" | "sudah_selesai" | "ditutup";
  kuota: number;
  terisi: number;
  jalur: string[];
  sumber: string[];
}

export interface Profil {
  pengaturan: Pengaturan;
  ppdb: KeadaanPpdb;
  /**
   * Pencocok pertanyaan berbantuan model bahasa tersedia di server.
   * Mengubah keterangan yang ditampilkan kotak Tanya cepat: bila aktif,
   * pertanyaan yang tidak terjawab setempat ikut dikirim ke penyedia luar.
   */
  pencocok_ai?: boolean;
}

export interface Jurusan {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string;
  kuota: number;
  ikon: string;
  aktif: boolean;
  urutan: number;
  pendaftar: number;
}

export interface Fasilitas {
  id: number;
  nama: string;
  deskripsi: string;
  gambar: string;
  ikon: string;
  urutan: number;
}

export interface Berita {
  id: number;
  judul: string;
  slug: string;
  kategori: string;
  ringkasan: string;
  isi: string;
  gambar: string;
  penulis: string;
  dibaca: number;
  publish: boolean;
  dibuat: string;
  diubah: string;
}

export interface Galeri {
  id: number;
  judul: string;
  kategori: string;
  gambar: string;
  keterangan: string;
  dibuat: string;
}

export interface Pesan {
  id: number;
  nama: string;
  email: string;
  no_hp: string;
  subjek: string;
  isi: string;
  dibaca: boolean;
  dibuat: string;
  /** Kosong berarti belum dibalas dari panel. Dibaca bukan dijawab. */
  dibalas_pada: string | null;
}

export interface Pengguna {
  id: number;
  nama: string;
  username: string;
  role: "admin" | "operator";
  masuk_akhir: string | null;
  dibuat: string;
}

export interface RingkasPendaftar {
  id: number;
  no_registrasi: string;
  tahun_ajaran: string;
  jalur: string;
  jurusan_id: number | null;
  nama_jurusan: string;
  nama_lengkap: string;
  nisn: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string;
  asal_sekolah: string;
  /**
   * Hasil pencocokan sekolah asal ke daftar rujukan PADA SAAT mengirim.
   * false berarti perlu diperiksa manual dari ijazah.
   */
  asal_sekolah_terdaftar: boolean;
  /** Nama petugas yang memasukkan data ini dari panel; kosong berarti pendaftar sendiri. */
  ditambahkan_oleh?: string;
  no_hp: string;
  email: string;
  nilai_rata2: number | null;
  sumber_informasi: string;
  status: string;
  dibuat: string;
}

export interface Pendaftar extends RingkasPendaftar {
  nik: string;
  tempat_lahir: string;
  agama: string;
  anak_ke: string;
  jumlah_saudara: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kode_pos: string;
  npsn_sekolah: string;
  alamat_sekolah: string;
  tahun_lulus: string;
  nama_ayah: string;
  pekerjaan_ayah: string;
  pendidikan_ayah: string;
  nama_ibu: string;
  pekerjaan_ibu: string;
  pendidikan_ibu: string;
  penghasilan: string;
  no_hp_ortu: string;
  nama_wali: string;
  file_foto: string;
  file_ijazah: string;
  file_kk: string;
  file_akta: string;
  file_raport: string;
  file_prestasi: string;
  catatan_sumber: string;
  catatan_admin: string;
  diverifikasi_oleh: number | null;
  nama_verifikator: string;
  ip_pendaftar: string;
  /** Dicetak pada kartu peserta tes seleksi. */
  ruang_ujian: string;
  kursi_ujian: string;
  diubah: string;
}

export interface Cacah {
  label: string;
  jumlah: number;
  kuota?: number;
}

export interface Dasbor {
  tahun_ajaran: string;
  ppdb_dibuka: boolean;
  /** Sebab tertutupnya, supaya panitia tahu tindakan yang perlu. Lihat lib/ppdb.ts. */
  ppdb_keadaan?: "dibuka" | "belum_mulai" | "sudah_selesai" | "ditutup";
  total: number;
  kuota: number;
  hari_ini: number;
  minggu_ini: number;
  pesan_belum: number;
  per_status: Cacah[];
  per_jurusan: Cacah[];
  per_jalur: Cacah[];
  per_sumber: Cacah[];
  tren: Cacah[];
  /** Tren per bulan, dua belas bulan terakhir. Label berbentuk "2026-09". */
  tren_bulan: Cacah[];
  /** Tren per tahun, seluruh tahun yang ada datanya. Label berbentuk "2026". */
  tren_tahun: Cacah[];
  terbaru: RingkasPendaftar[];
}

export interface Laporan {
  tahun_ajaran: string;
  total: number;
  pilihan_tahun: string[];
  label_sumber: Record<string, string>;
  per_sumber: Cacah[];
  per_status: Cacah[];
  per_jalur: Cacah[];
  per_jurusan: Cacah[];
  per_jenis_kelamin: Cacah[];
  per_asal_sekolah: Cacah[];
  per_bulan: Cacah[];
}

export interface StatusPendaftaran {
  no_registrasi: string;
  nama_lengkap: string;
  jalur: string;
  nama_jurusan: string;
  status: string;
  tahun_ajaran: string;
  catatan_admin: string;
  dibuat: string;
  pengumuman: string;
  /** Keadaan tes seleksi bagi pendaftar ini. */
  ujian: KeadaanUjian;
  /** Surat yang diterbitkan untuk pendaftar ini dan boleh diunduhnya. */
  surat?: SuratPendaftar[];
}

export interface SuratPendaftar {
  id: number;
  jenis: string;
  nomor_surat: string;
  perihal: string;
  tanggal_surat: string;
}

/** Jenis surat: urutan nomor, format nomor, dan naskah bawaannya. */
export interface JenisSurat {
  id: number;
  nama: string;
  kode: string;
  format_nomor: string;
  atur_ulang: "tahunan" | "bulanan" | "tidak";
  untuk_pendaftar: boolean;
  tampil_di_cek_status: boolean;
  perihal_bawaan: string;
  tujuan_bawaan: string;
  isi_bawaan: string;
  penanda_tangan_nama: string;
  penanda_tangan_jabatan: string;
  penanda_tangan_nip: string;
  aktif: boolean;
  urutan: number;
  jumlah_surat: number;
}

export interface Surat {
  id: number;
  jenis_id: number;
  nama_jenis: string;
  periode: string;
  nomor_urut: number;
  nomor_surat: string;
  tanggal_surat: string;
  perihal: string;
  tujuan: string;
  lampiran: string;
  isi: string;
  pendaftar_id: number | null;
  nama_pendaftar: string;
  no_registrasi: string;
  dibatalkan: boolean;
  alasan_batal: string;
  dibuat_oleh: string;
  dibuat: string;
}

export interface ButirPengaturan {
  nama_setting: string;
  nilai: string;
  keterangan: string;
}

export interface HalamanBerita {
  data: Berita[];
  total: number;
  halaman: number;
  per_halaman: number;
  kategori: string[];
}

export interface HalamanPendaftar {
  data: RingkasPendaftar[];
  total: number;
  halaman: number;
  per_halaman: number;
  tahun_ajaran: string;
  pilihan: {
    status: string[];
    jalur: string[];
    sumber: string[];
    tahun_ajaran: string[];
  };
}

export interface HalamanPesan {
  data: Pesan[];
  total: number;
  belum_dibaca: number;
  halaman: number;
  per_halaman: number;
  /** false berarti SMTP belum disetel di server, jadi balasan email pasti gagal. */
  email_aktif: boolean;
}

/* ---------- rincian biaya ---------- */

export interface Biaya {
  id: number;
  nama: string;
  jumlah: number;
  satuan: string;
  tahap: string;
  keterangan: string;
  wajib: boolean;
  urutan: number;
  aktif: boolean;
  /** false bila jumlahnya masih nol, yaitu belum ditetapkan sekolah. */
  ditetapkan: boolean;
}

/* ---------- tes seleksi ---------- */

export interface Soal {
  id: number;
  mata_pelajaran: string;
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  pilihan_e: string;
  jawaban: string;
  pembahasan: string;
  aktif: boolean;
}

export interface PaketUjian {
  id: number;
  nama: string;
  tahun_ajaran: string;
  durasi_menit: number;
  jumlah_soal: number;
  acak_soal: boolean;
  mulai: string | null;
  selesai: string | null;
  nilai_minimum: number;
  keterangan: string;
  aktif: boolean;
  jumlah_peserta: number;
  jumlah_selesai: number;
  /** Kosong berarti soal diambil acak dari seluruh mata pelajaran. */
  komposisi: KomposisiMapel[];
}

export interface KomposisiMapel {
  mata_pelajaran: string;
  jumlah: number;
}

/** Satu soal seperti yang dilihat peserta. Kunci jawabannya tidak ada di sini
 *  karena server memang tidak pernah mengirimkannya. */
export interface SoalPeserta {
  urutan: number;
  soal_id: number;
  mata_pelajaran: string;
  pertanyaan: string;
  pilihan: { huruf: string; teks: string }[];
  /** Jawaban yang sudah dipilih peserta, bukan kunci. */
  jawaban: string;
}

export interface HasilUjian {
  status: string;
  jumlah_benar: number;
  jumlah_soal: number;
  skor: number;
  nilai_minimum: number;
  lulus: boolean;
  nama_paket: string;
}

/** Keadaan tes seleksi bagi seorang pendaftar, disertakan pada cek status. */
export interface KeadaanUjian {
  dibuka: boolean;
  boleh_ikut: boolean;
  sudah_ikut: boolean;
  kartu_siap: boolean;
  alasan: string;
  hasil: HasilUjian | null;
  nama_paket?: string;
  durasi_menit?: number;
  jumlah_soal?: number;
}

/* ---------- notifikasi ---------- */

export interface Notifikasi {
  id: number;
  pendaftar_id: number | null;
  nama_pendaftar?: string;
  no_registrasi?: string;
  kanal: string;
  tujuan: string;
  jenis: string;
  /** Hanya terisi pada balasan pesan masuk, yang perihalnya diketik panitia. */
  perihal?: string;
  pesan: string;
  status: string;
  galat?: string;
  dikirim_pada: string | null;
  dibuat: string;
  tautan_wa?: string;
}

/* ---------- tanya jawab ---------- */

export interface Faq {
  id: number;
  pertanyaan: string;
  jawaban: string;
  kategori: string;
  /** Muncul lebih dulu dan diberi penanda; dipakai untuk yang paling sering ditanyakan. */
  sorot: boolean;
  urutan: number;
  aktif: boolean;
}

/**
 * Pertanyaan yang tidak dapat dijawab kotak Tanya cepat.
 *
 * Yang tersimpan hanya teks pertanyaannya — tidak ada alamat IP maupun
 * pengenal peramban. Lihat backend/handler_tanya_buntu.go.
 */
export interface TanyaBuntu {
  id: number;
  pertanyaan: string;
  /** Berapa orang menanyakan hal yang sama. */
  jumlah: number;
  ditangani: boolean;
  terakhir: string;
}

/* ---------------- profil, akademik, dan kesiswaan ---------------- */

export type KelompokHalaman = "Profil" | "Akademik" | "Kesiswaan";

/** Ringkasan kunjungan situs. Label pada tiap deret berbeda bentuknya:
 *  "2026-09-24" per hari, "2026-09" per bulan, "2026" per tahun, dan alamat
 *  halaman pada per_halaman. */
export interface RingkasKunjungan {
  total_kunjungan: number;
  total_pengunjung: number;
  hari_ini: number;
  pengunjung_hari_ini: number;
  minggu_ini: number;
  per_hari: Cacah[];
  per_bulan: Cacah[];
  per_tahun: Cacah[];
  per_halaman: Cacah[];
}

export interface Halaman {
  id: number;
  slug: string;
  judul: string;
  ringkasan: string;
  /** Naskah lengkap. Kosong pada daftar halaman publik, terisi pada detail. */
  isi: string;
  /** Visi milik halaman ini sendiri, misalnya visi OSIS — bukan visi sekolah. */
  visi: string;
  /** Misi halaman ini, satu baris satu poin. Kosong berarti bagiannya tak tampil. */
  misi: string;
  /** Kategori pada menu Galeri yang fotonya ditampilkan halaman ini. */
  galeri_kategori: string;
  gambar: string;
  kelompok: KelompokHalaman;
  urutan: number;
  aktif: boolean;
  diubah: string;
}

export interface Tenaga {
  id: number;
  nama: string;
  nip: string;
  jabatan: string;
  mata_pelajaran: string;
  /** Kelas yang diampu sebagai wali kelas, misalnya "X-1". Kosong berarti
   *  bukan wali kelas. */
  wali_kelas: string;
  kategori: string;
  foto: string;
  urutan: number;
  aktif: boolean;
}

export interface Agenda {
  id: number;
  judul: string;
  mulai: string;
  /** Kosong berarti kegiatan satu hari. */
  selesai: string;
  kategori: string;
  keterangan: string;
  aktif: boolean;
}

export interface KegiatanSiswa {
  id: number;
  nama: string;
  jenis: string;
  deskripsi: string;
  pembina: string;
  jadwal: string;
  gambar: string;
  urutan: number;
  aktif: boolean;
}

export interface Pustaka {
  id: number;
  judul: string;
  penulis: string;
  kategori: string;
  tahun: number | null;
  keterangan: string;
  tautan: string;
  berkas: string;
  urutan: number;
  aktif: boolean;
}

/* ---------- Bursa Kerja Khusus ---------- */

export interface MitraBkk {
  id: number;
  nama: string;
  bidang: string;
  alamat: string;
  /** Tiga kontak ini hanya ada pada jawaban panel admin. */
  kontak_nama?: string;
  kontak_telepon?: string;
  kontak_email?: string;
  situs: string;
  logo: string;
  aktif: boolean;
  lowongan_dibuka: number;
  jumlah_lowongan: number;
  tersalurkan: number;
}

export interface LowonganBkk {
  id: number;
  mitra_id: number;
  nama_mitra: string;
  logo_mitra: string;
  bidang_mitra: string;
  posisi: string;
  jenis: string;
  lokasi: string;
  deskripsi: string;
  kualifikasi: string;
  gaji: string;
  kuota: number | null;
  batas_lamar: string | null;
  status: "draf" | "buka" | "tutup";
  /** Status buka, batas lamaran belum lewat, dan mitranya aktif. */
  dibuka: boolean;
  jumlah_pelamar: number;
  diterima: number;
  dibuat: string;
}

export type StatusLamaran = "Diajukan" | "Diteruskan" | "Wawancara" | "Diterima" | "Ditolak";

export interface LamaranBkk {
  id: number;
  kode: string;
  lowongan_id: number;
  posisi: string;
  nama_mitra: string;
  nama: string;
  nisn: string;
  tanggal_lahir: string;
  jenis_kelamin: "L" | "P";
  tahun_lulus: number;
  telepon: string;
  email: string;
  alamat: string;
  ringkasan: string;
  cv: string;
  status: StatusLamaran;
  catatan: string;
  sumber: "daring" | "manual";
  dibuat: string;
  diubah: string;
}

export interface LamaranSaya {
  kode: string;
  nama: string;
  posisi: string;
  nama_mitra: string;
  status: StatusLamaran;
  catatan: string;
  dibuat: string;
  diubah: string;
}

/* ---------- daftar rujukan sekolah asal ---------- */

export interface SekolahRujukan {
  npsn: string;
  nama: string;
  bentuk?: string;
  status?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
}

export interface HasilCariSekolah {
  data: SekolahRujukan[];
  /** false berarti panitia belum mengimpor daftar sekolah, jadi tidak ada yang dituntut. */
  aktif: boolean;
}

export interface HalamanSekolah {
  data: SekolahRujukan[];
  total: number;
  /** Jumlah seluruh sekolah dalam daftar, tanpa memperhitungkan pencarian. */
  semua: number;
  halaman: number;
  per_halaman: number;
}

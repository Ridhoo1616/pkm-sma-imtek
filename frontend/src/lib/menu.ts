/**
 * Susunan menu situs, ditulis satu kali di sini.
 *
 * Navigasi atas, menu layar kecil, dan kartu pengantar pada halaman indeks
 * ketiganya membaca daftar yang sama. Sebelumnya daftar menu hanya ada di
 * dalam Navigasi.tsx, sehingga setiap penambahan halaman harus disalin ke
 * beberapa tempat dan mudah tertinggal di salah satunya.
 *
 * Beberapa butir sengaja menunjuk halaman yang sudah ada, bukan halaman
 * baru: "Sarana dan Prasarana" adalah halaman Fasilitas, dan "Prestasi
 * Siswa" adalah berita berkategori Prestasi. Menduplikasinya hanya akan
 * membuat panitia mengisi data yang sama dua kali.
 */

export interface ButirMenu {
  jalur: string;
  label: string;
  /** Penjelasan singkat, dipakai kartu pada halaman indeks. */
  keterangan?: string;
}

export interface MenuUtama extends ButirMenu {
  anak?: ButirMenu[];
}

export const MENU: MenuUtama[] = [
  { jalur: "/", label: "Beranda" },
  {
    jalur: "/profil",
    label: "Profil Sekolah",
    keterangan: "Identitas, riwayat, dan orang-orang di dalam sekolah.",
    anak: [
      {
        jalur: "/profil/sejarah",
        label: "Sejarah Sekolah",
        keterangan: "Riwayat berdirinya sekolah sampai keadaan sekarang.",
      },
      {
        jalur: "/profil/data-sekolah",
        label: "Data Sekolah",
        keterangan: "NPSN, status, akreditasi, alamat, dan jam layanan.",
      },
      {
        jalur: "/profil/visi-misi",
        label: "Visi & Misi",
        keterangan: "Arah yang dituju sekolah beserta langkah-langkahnya.",
      },
      {
        jalur: "/fasilitas",
        label: "Sarana dan Prasarana",
        keterangan: "Ruang belajar, laboratorium, dan sarana pendukung.",
      },
      {
        jalur: "/profil/struktur-organisasi",
        label: "Struktur Organisasi",
        keterangan: "Susunan pimpinan dan pembagian tugas di sekolah.",
      },
      {
        jalur: "/profil/tenaga-pendidik",
        label: "Tenaga Pendidik dan Kependidikan",
        keterangan: "Guru dan tenaga kependidikan beserta bidangnya.",
      },
    ],
  },
  {
    jalur: "/akademik",
    label: "Akademik",
    keterangan: "Kegiatan belajar: kurikulum, jadwal, dan layanan penunjang.",
    anak: [
      {
        jalur: "/akademik/elearning",
        label: "E-Learning / LMS",
        keterangan: "Pintu masuk ke ruang belajar daring sekolah.",
      },
      {
        jalur: "/akademik/jadwal",
        label: "Jadwal Pelajaran",
        keterangan: "Jadwal yang berlaku pada semester ini.",
      },
      {
        jalur: "/akademik/kalender",
        label: "Kalender Akademik",
        keterangan: "Tanggal kegiatan, ujian, dan hari libur sekolah.",
      },
      {
        jalur: "/halaman/kurikulum",
        label: "Kurikulum",
        keterangan: "Kurikulum yang dipakai dan struktur mata pelajarannya.",
      },
      {
        jalur: "/akademik/perpustakaan",
        label: "Perpustakaan Digital",
        keterangan: "Katalog koleksi digital yang dapat dibaca siswa.",
      },
    ],
  },
  {
    jalur: "/kesiswaan",
    label: "Kesiswaan",
    keterangan: "Kegiatan siswa di luar jam pelajaran dan pembinaannya.",
    anak: [
      {
        jalur: "/kesiswaan/ekstrakurikuler",
        label: "Ekstrakurikuler",
        keterangan: "Pilihan kegiatan beserta pembina dan jadwalnya.",
      },
      {
        jalur: "/halaman/osis",
        label: "OSIS",
        keterangan: "Organisasi Siswa Intra Sekolah dan program kerjanya.",
      },
      {
        jalur: "/kesiswaan/prestasi",
        label: "Prestasi Siswa",
        keterangan: "Capaian siswa pada lomba dan kegiatan di luar sekolah.",
      },
      {
        jalur: "/halaman/pendidikan-karakter",
        label: "Pendidikan Karakter",
        keterangan: "Pembinaan karakter dan kedisiplinan peserta didik.",
      },
    ],
  },
  {
    jalur: "/ppdb",
    label: "PPDB",
    keterangan: "Pendaftaran peserta didik baru, dari ketentuan sampai hasil.",
    anak: [
      {
        jalur: "/ppdb",
        label: "Ketentuan & Jadwal",
        keterangan: "Jalur pendaftaran, dokumen, biaya, dan tanggal penting.",
      },
      {
        jalur: "/ppdb/daftar",
        label: "Formulir Pendaftaran",
        keterangan: "Mengisi data dan mengunggah dokumen persyaratan.",
      },
      {
        jalur: "/ppdb/cek",
        label: "Cek Status & Hasil",
        keterangan: "Memantau verifikasi berkas dan melihat hasil seleksi.",
      },
      {
        jalur: "/ppdb/ujian",
        label: "Tes Seleksi",
        keterangan: "Tes daring bagi pendaftar yang berkasnya sudah lolos.",
      },
      {
        jalur: "/faq",
        label: "Tanya Jawab",
        keterangan: "Pertanyaan yang paling sering diajukan pendaftar.",
      },
    ],
  },
  { jalur: "/berita", label: "Berita" },
  { jalur: "/galeri", label: "Galeri" },
  { jalur: "/kontak", label: "Kontak" },
];

/** Mencari satu butir menu utama menurut jalurnya. */
export function menuDari(jalur: string): MenuUtama | undefined {
  return MENU.find((m) => m.jalur === jalur);
}

/** Anak menu sebuah kelompok; kosong bila kelompoknya tidak punya anak. */
export function anakMenu(jalur: string): ButirMenu[] {
  return menuDari(jalur)?.anak ?? [];
}

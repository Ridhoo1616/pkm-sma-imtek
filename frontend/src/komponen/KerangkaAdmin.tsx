"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSesi } from "@/komponen/Sesi";
import { Memuat } from "@/komponen/Memuat";

/**
 * Kerangka panel admin: sidebar, kepala halaman, dan penjaga akses.
 *
 * Penjagaan di sini hanyalah kenyamanan tampilan. Yang benar-benar
 * mengamankan data adalah backend, yang menolak setiap permintaan tanpa
 * token sah — sehingga menyembunyikan menu saja tidak pernah dijadikan
 * satu-satunya pengaman.
 */

import { 
  LayoutDashboard, Users, TrendingUp, Bell, Database, 
  CheckSquare, Receipt, LibraryBig, School, 
  MonitorSmartphone, Briefcase, Building, 
  Calendar, Activity, Book, Newspaper, 
  Image as ImageIcon, MessageCircleQuestion, Mail, 
  Settings, UserCog, GraduationCap, type LucideIcon 
} from "lucide-react";

/**
 * Menu panel, dikelompokkan menurut pekerjaan panitia.
 */
const KELOMPOK: {
  judul: string;
  butir: { jalur: string; label: string; khususAdmin: boolean; ikon: LucideIcon }[];
}[] = [
  {
    judul: "Pendaftaran",
    butir: [
      { jalur: "/admin", label: "Dasbor", khususAdmin: false, ikon: LayoutDashboard },
      { jalur: "/admin/pendaftar", label: "Pendaftar", khususAdmin: false, ikon: Users },
      { jalur: "/admin/laporan", label: "Laporan Promosi", khususAdmin: false, ikon: TrendingUp },
      { jalur: "/admin/notifikasi", label: "Notifikasi", khususAdmin: false, ikon: Bell },
      { jalur: "/admin/soal", label: "Bank Soal", khususAdmin: false, ikon: Database },
      { jalur: "/admin/ujian", label: "Tes Seleksi", khususAdmin: false, ikon: CheckSquare },
      { jalur: "/admin/biaya", label: "Rincian Biaya", khususAdmin: true, ikon: Receipt },
      { jalur: "/admin/jurusan", label: "Peminatan", khususAdmin: true, ikon: LibraryBig },
      { jalur: "/admin/sekolah", label: "Sekolah Asal", khususAdmin: false, ikon: School },
    ],
  },
  {
    judul: "Profil Sekolah",
    butir: [
      { jalur: "/admin/halaman", label: "Halaman Profil", khususAdmin: false, ikon: MonitorSmartphone },
      { jalur: "/admin/tenaga", label: "Tenaga Pendidik", khususAdmin: false, ikon: Briefcase },
      { jalur: "/admin/fasilitas", label: "Sarana & Prasarana", khususAdmin: false, ikon: Building },
    ],
  },
  {
    judul: "Akademik & Kesiswaan",
    butir: [
      { jalur: "/admin/kalender", label: "Kalender Akademik", khususAdmin: false, ikon: Calendar },
      { jalur: "/admin/kegiatan", label: "Kegiatan Siswa", khususAdmin: false, ikon: Activity },
      { jalur: "/admin/pustaka", label: "Perpustakaan", khususAdmin: false, ikon: Book },
    ],
  },
  {
    judul: "Isi Situs",
    butir: [
      { jalur: "/admin/berita", label: "Berita", khususAdmin: false, ikon: Newspaper },
      { jalur: "/admin/galeri", label: "Galeri", khususAdmin: false, ikon: ImageIcon },
      { jalur: "/admin/faq", label: "Tanya Jawab", khususAdmin: false, ikon: MessageCircleQuestion },
      { jalur: "/admin/pesan", label: "Pesan Masuk", khususAdmin: false, ikon: Mail },
    ],
  },
  {
    judul: "Sistem",
    butir: [
      { jalur: "/admin/pengaturan", label: "Pengaturan", khususAdmin: true, ikon: Settings },
      { jalur: "/admin/pengguna", label: "Pengguna", khususAdmin: true, ikon: UserCog },
    ],
  },
];

export default function KerangkaAdmin({ children }: { children: ReactNode }) {
  const { pengguna, memeriksa, keluar } = useSesi();
  const jalurSekarang = usePathname();
  const router = useRouter();
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false);
  const wadahMenu = useRef<HTMLDivElement | null>(null);
  const sudahDiungkap = useRef(false);

  const [logo, setLogo] = useState<string>("");
  const [namaSingkat, setNamaSingkat] = useState<string>("SI");
  const [namaSekolah, setNamaSekolah] = useState<string>("SMA IMTEK");

  // Ambil profil sekolah untuk logo
  useEffect(() => {
    import("@/lib/api").then(({ api, urlUnggahan }) => {
      api.profil()
        .then((p) => {
          if (p.pengaturan.logo) {
            setLogo(urlUnggahan("profil", p.pengaturan.logo));
          }
          if (p.pengaturan.nama_singkat) {
            setNamaSingkat(p.pengaturan.nama_singkat.slice(0, 2).toUpperCase());
          }
          if (p.pengaturan.nama_sekolah) {
            setNamaSekolah(p.pengaturan.nama_sekolah);
          }
        })
        .catch(() => {});
    });
  }, []);

  // Halaman masuk berada di bawah /admin, tetapi ia bukan bagian panel: tidak
  // dibungkus sidebar, dan tidak boleh dialihkan ke dirinya sendiri.
  const halamanMasuk = jalurSekarang === "/admin/masuk";

  useEffect(() => {
    if (!halamanMasuk && !memeriksa && !pengguna) {
      router.replace("/admin/masuk");
    }
  }, [halamanMasuk, memeriksa, pengguna, router]);

  /**
   * Menu yang sedang terpilih dibawa ke dalam pandangan, SEKALI saja saat
   * panel dibuka.
   *
   * Perpindahan antarmenu tidak lagi perlu ditolong: kerangka ini sekarang
   * berada di layout, jadi wadah gulirnya tidak dibongkar dan posisinya
   * terjaga dengan sendirinya. Yang masih perlu ditolong keadaan lain, yaitu
   * panel yang dibuka langsung pada alamat halaman di dasar daftar, entah
   * dari penanda buku entah karena halamannya disegarkan. Di situ daftarnya
   * mulai dari puncak, dan menu yang terpilih berada di luar pandangan.
   *
   * Digulir hanya bila memang di luar pandangan, dan diukur dengan
   * getBoundingClientRect, bukan offsetTop: wadahnya tidak diberi `relative`,
   * sehingga offsetTop menghitung dari leluhur lain dan angkanya salah.
   *
   * Tidak memakai scrollIntoView karena ia juga menggulir jendela beserta
   * leluhur lainnya, sedangkan yang boleh bergerak hanya daftar ini.
   *
   * Bergantung pada `pengguna`, bukan daftar kosong: selama sesi masih
   * diperiksa, kerangka ini mengembalikan <Memuat /> sehingga menunya belum
   * ada dan rujukannya masih null. Efek berdaftar kosong hanya akan berjalan
   * pada saat itu, lalu tidak pernah lagi.
   */
  useEffect(() => {
    if (sudahDiungkap.current) return;
    const wadah = wadahMenu.current;
    if (!wadah) return;
    const terpilih = wadah.querySelector<HTMLElement>('[data-terpilih="ya"]');
    if (!terpilih) return;
    sudahDiungkap.current = true;

    const kotakWadah = wadah.getBoundingClientRect();
    const kotakMenu = terpilih.getBoundingClientRect();
    const sudahTerlihat =
      kotakMenu.top >= kotakWadah.top && kotakMenu.bottom <= kotakWadah.bottom;
    if (sudahTerlihat) return;
    wadah.scrollTop +=
      kotakMenu.top -
      kotakWadah.top -
      (kotakWadah.height - kotakMenu.height) / 2;
  }, [pengguna]);

  if (halamanMasuk) return <>{children}</>;
  if (memeriksa) return <Memuat pesan="Memeriksa sesi Anda..." />;
  if (!pengguna) return <Memuat pesan="Mengalihkan ke halaman masuk..." />;

  const aktif = (jalur: string) =>
    jalur === "/admin" ? jalurSekarang === "/admin" : jalurSekarang.startsWith(jalur);

  // Kelompok yang seluruh butirnya khusus admin ikut hilang bagi operator,
  // jadi tidak ada judul kelompok yang menggantung tanpa isi.
  const kelompokTampil = KELOMPOK.map((g) => ({
    judul: g.judul,
    butir: g.butir.filter((m) => !m.khususAdmin || pengguna.role === "admin"),
  })).filter((g) => g.butir.length > 0);

  const daftarMenu = (
    <nav aria-label="Menu panel admin" className="space-y-5">
      {kelompokTampil.map((g) => (
        <div key={g.judul}>
          <p className="px-4 pb-1.5 text-[11px] font-bold tracking-wider text-white/40 uppercase">
            {g.judul}
          </p>
          <ul className="space-y-1">
            {g.butir.map((m) => (
              <li key={m.jalur}>
                <Link
                  href={m.jalur}
                  data-terpilih={aktif(m.jalur) ? "ya" : undefined}
                  // Sidebar layar kecil ditutup saat menunya dipilih.
                  onClick={() => setSidebarTerbuka(false)}
                  className={
                    "relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition " +
                    (aktif(m.jalur)
                      ? "bg-biru text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white")
                  }
                >
                  {/* Penanda emas di tepi kiri menu yang terpilih. */}
                  {aktif(m.jalur) && (
                    <span
                      aria-hidden
                      className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r-full bg-emas"
                    />
                  )}
                  <m.ikon size={18} className={aktif(m.jalur) ? "text-white" : "text-white/50"} />
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar tetap untuk layar lebar */}
      <aside className="tanpa-cetak sticky top-0 h-screen hidden w-64 shrink-0 flex-col bg-biru-tua lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            {logo ? (
              <img 
                src={logo} 
                alt="Logo Sekolah" 
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-[17px] font-bold text-biru-tua">{namaSingkat}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-bold text-white">
              {namaSekolah}
            </h2>
            <p className="mt-0.5 truncate text-[10px] font-bold tracking-[0.05em] text-emas uppercase">
              PPDB Admin Portal
            </p>
          </div>
        </div>
        <div ref={wadahMenu} className="flex-1 overflow-y-auto px-3 py-4">
          {daftarMenu}
        </div>
        <div className="border-t border-white/10 px-4 py-4">
          <Link
            href="/"
            className="block rounded-lg px-4 py-2 text-sm text-white/65 hover:bg-white/10 hover:text-white"
          >
            Lihat situs publik →
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Kepala halaman */}
        <header className="tanpa-cetak sticky top-0 z-40 border-b border-garis bg-white">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarTerbuka((v) => !v)}
                aria-expanded={sidebarTerbuka}
                aria-label="Buka menu panel"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-garis text-biru-tua lg:hidden"
              >
                <span className="space-y-1" aria-hidden>
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                </span>
              </button>
              <p className="truncate text-sm text-samar">
                Masuk sebagai{" "}
                <strong className="text-biru-tua">{pengguna.nama}</strong>
                <span className="ml-2 inline-flex items-center justify-center rounded-md bg-biru-tua px-2 py-1 text-[11px] leading-none font-bold tracking-[0.06em] text-white uppercase">
                  {pengguna.role === "admin" ? "Admin" : "Operator"}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/admin/sandi"
                className="hidden rounded-lg border border-garis px-3.5 py-2 text-sm font-semibold text-teks hover:border-biru hover:text-biru sm:block"
              >
                Ganti Sandi
              </Link>
              <button
                type="button"
                onClick={keluar}
                className="rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-semibold text-teks transition hover:bg-slate-200"
              >
                Keluar
              </button>
            </div>
          </div>

          {/* Tingginya dibuka dengan grid-template-rows 0fr ke 1fr, cara CSS
              untuk menganimasikan tinggi yang belum diketahui. */}
          <div
            inert={!sidebarTerbuka}
            className={
              "grid overflow-hidden bg-biru-tua transition-[grid-template-rows,opacity] duration-200 ease-out lg:hidden " +
              (sidebarTerbuka ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
            }
          >
            <div className="overflow-hidden">
              <div className="px-3 py-4">{daftarMenu}</div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

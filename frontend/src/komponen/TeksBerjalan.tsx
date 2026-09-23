import { tanggalPanjang, angka, belumTerisi } from "@/lib/format";
import type { Berita, Profil } from "@/lib/tipe";

/**
 * Bilah informasi berjalan di paling atas halaman publik.
 *
 * Isinya TIGA kabar yang seluruhnya diambil dari basis data, bukan kalimat
 * yang ditulis di berkas ini: keadaan PPDB beserta tanggalnya, sisa kuota,
 * dan pengumuman terbaru yang sudah diterbitkan sekolah. Kabar yang datanya
 * belum ada dibuang dari daftar, jadi bilahnya tidak pernah memuat kalimat
 * yang setengah jadi. Bila ketiganya tidak ada, bilahnya tidak muncul sama
 * sekali.
 *
 * Tulisan berjalan itu bentuk yang mudah disalahgunakan: ia bergerak, dan
 * yang bergerak menarik mata dari isi halaman. Karena itu ada tiga
 * pembatasnya. Pertama, gerakannya BERHENTI saat penunjuk tetikus atau fokus
 * papan tuntas berada di atasnya, supaya kalimat yang sedang dibaca tidak
 * kabur. Kedua, pada peramban yang disetel mengurangi gerak
 * (prefers-reduced-motion), gerakannya dimatikan dan bilahnya menjadi daftar
 * yang dapat digulir sendiri. Ketiga, seluruh kabar juga tetap ada pada
 * halamannya masing-masing, jadi tidak ada satu pun informasi yang HANYA
 * dapat dibaca dari bilah berjalan ini.
 *
 * Salinan kedua daftarnya (aria-hidden) hanya untuk sambungan gerakannya:
 * begitu salinan pertama habis, yang kedua sudah berada di tempatnya
 * sehingga tidak ada jeda kosong. Pembaca layar membaca yang pertama saja.
 */
export function TeksBerjalan({
  profil,
  berita,
}: {
  profil: Profil;
  berita?: Berita[];
}) {
  const p = profil.pengaturan;
  const sisa = Math.max(profil.ppdb.kuota - profil.ppdb.terisi, 0);
  const kabar: string[] = [];

  if (profil.ppdb.dibuka) {
    kabar.push(
      p.ppdb_selesai
        ? `Pendaftaran peserta didik baru tahun ajaran ${p.ppdb_tahun} sedang dibuka sampai ${tanggalPanjang(p.ppdb_selesai)}.`
        : `Pendaftaran peserta didik baru tahun ajaran ${p.ppdb_tahun} sedang dibuka.`,
    );
  } else if (p.ppdb_mulai) {
    kabar.push(
      `Pendaftaran peserta didik baru tahun ajaran ${p.ppdb_tahun} dibuka mulai ${tanggalPanjang(p.ppdb_mulai)}.`,
    );
  }

  if (profil.ppdb.kuota > 0) {
    kabar.push(
      `Sisa kuota ${angka(sisa)} dari ${angka(profil.ppdb.kuota)} tempat yang disediakan tahun ini.`,
    );
  }

  const pengumuman = (berita ?? []).find((b) => !belumTerisi(b.judul));
  if (pengumuman) {
    kabar.push(`Kabar terbaru: ${pengumuman.judul}.`);
  } else if (p.ppdb_pengumuman) {
    kabar.push(
      `Hasil seleksi diumumkan pada ${tanggalPanjang(p.ppdb_pengumuman)}.`,
    );
  }

  if (kabar.length === 0) return null;

  const daftar = (tersembunyi: boolean) => (
    <ul
      aria-hidden={tersembunyi || undefined}
      className="berjalan-daftar flex shrink-0 items-center gap-10 pr-10"
    >
      {kabar.map((k) => (
        <li key={k} className="flex shrink-0 items-center gap-3">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emas" />
          <span>{k}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      aria-label="Informasi terbaru"
      className="berjalan border-b border-white/10 bg-biru-tua text-sm text-white/90"
    >
      <div className="berjalan-bingkai wadah overflow-hidden py-2.5">
        <div className="berjalan-isi flex w-max">
          {daftar(false)}
          {daftar(true)}
        </div>
      </div>
    </aside>
  );
}

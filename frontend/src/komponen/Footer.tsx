import Link from "next/link";
import {
  IkonJam,
  IkonLokasi,
  IkonPanahKanan,
  IkonSosial,
  IkonSurel,
  IkonTelepon,
  IkonWhatsapp,
} from "./Ikon";
import type { Pengaturan } from "@/lib/tipe";
import { urlUnggahan } from "@/lib/api";
import { anakMenu } from "@/lib/menu";
import {
  alamatLengkap,
  belumTerisi,
  pesanTanyaPpdb,
  tautanPeta,
  tautanWa,
} from "@/lib/format";

/**
 * Kaki halaman.
 *
 * Susunannya empat blok pada dua lajur: identitas sekolah dan Hubungi Kami
 * di kiri, Alamat Sekolah dan Tautan Pintar di kanan. Pada layar kecil
 * keempatnya bertumpuk mengikuti urutan itu.
 *
 * TIGA HAL YANG SENGAJA BEGINI:
 *
 * 1. Warna hijau hanya pada empat tempat: ikon telepon, ikon surel, tautan
 *    "Buka Google Maps", dan tanda ">" pada Tautan Pintar. Aksen situs ini
 *    emas, dan itu yang dipakai seluruh keadaan sorot di sini. Hijaunya
 *    menandai yang dapat langsung ditindaklanjuti pengunjung — ditelepon,
 *    disurel, dibuka petanya.
 *
 * 2. Tautan Pintar dibangun dari `MENU`, sumber yang sama dengan navigasi
 *    atas, bukan daftar yang ditulis ulang di sini. Halaman PPDB yang
 *    berganti nama atau berpindah jalur ikut berubah di kaki halaman tanpa
 *    disentuh, dan tidak mungkin lagi ada tautan kaki halaman yang menunjuk
 *    halaman yang sudah tidak ada.
 *
 * 3. Bagian yang datanya belum diisi sekolah TIDAK ditampilkan sebagai
 *    tempat kosong. Semboyan yang masih penanda [kurung siku], media sosial
 *    yang belum diisi, jam layanan yang kosong — semuanya hilang, bukan
 *    tampil sebagai judul tanpa isi.
 */

export default function Footer({ pengaturan }: { pengaturan: Pengaturan }) {
  const p = pengaturan;
  const tahun = new Date().getFullYear();
  const nama = p.nama_sekolah || "SMA IMTEK";
  const alamat = alamatLengkap(p.alamat, p.kode_pos);
  const wa = tautanWa(p.whatsapp ?? "", pesanTanyaPpdb(nama));

  const sosial = [
    { label: "Instagram", url: p.instagram },
    { label: "Facebook", url: p.facebook },
    { label: "YouTube", url: p.youtube },
    { label: "TikTok", url: p.tiktok },
  ].filter((s) => s.url);

  // Butir PPDB diambil dari menu atas, lalu dua tautan yang memang tidak ada
  // di sana ditambahkan: Berita, dan pintu masuk petugas yang sengaja tidak
  // dipasang di navigasi utama karena bukan untuk pengunjung umum.
  const tautanPintar = [
    ...anakMenu("/ppdb"),
    { jalur: "/berita", label: "Berita & Pengumuman" },
    { jalur: "/admin", label: "Masuk Petugas" },
  ];

  const judulBagian =
    "text-sm font-bold tracking-[0.08em] text-white uppercase";

  return (
    <footer className="tanpa-cetak mt-20 bg-biru-tua text-white/75">
      <div className="wadah grid gap-x-12 gap-y-11 py-14 lg:grid-cols-2">
        {/* ---------------- Identitas sekolah ---------------- */}
        <div>
          <div className="flex items-center gap-3.5">
            {/* Kotaknya tetap 48x48 pada kedua keadaan supaya barisnya tidak
                bergeser saat sekolah mengunggah logonya. Latar birunya hanya
                untuk inisial; logo diletakkan di atas putih supaya garis
                birunya tidak hilang, persis seperti di navigasi atas. */}
            <span
              className={
                "grid h-12 w-12 shrink-0 place-items-center rounded-xl " +
                (p.logo
                  ? "bg-white p-1"
                  : "bg-biru text-lg font-bold text-white")
              }
              aria-hidden
            >
              {p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlUnggahan("profil", p.logo)}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                (p.nama_singkat || "SI").slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="leading-tight">
              <strong className="block text-xl text-white">{nama}</strong>
              <small className="text-[13px] text-white/60">
                {p.kota || "Kabupaten Tangerang"}
                {p.akreditasi ? ` · Akreditasi ${p.akreditasi}` : ""}
              </small>
            </span>
          </div>

          <dl className="mt-5 space-y-1 text-sm">
            {p.npsn && (
              <div className="flex gap-1.5">
                <dt className="font-semibold text-white">NPSN:</dt>
                <dd>{p.npsn}</dd>
              </div>
            )}
            {p.status_sekolah && (
              <div className="flex gap-1.5">
                <dt className="font-semibold text-white">Status Sekolah:</dt>
                <dd>{p.status_sekolah}</dd>
              </div>
            )}
            {p.akreditasi && (
              <div className="flex gap-1.5">
                <dt className="font-semibold text-white">Akreditasi:</dt>
                <dd>{p.akreditasi}</dd>
              </div>
            )}
          </dl>

          {p.tagline && !belumTerisi(p.tagline) && (
            <p className="mt-5 max-w-md text-sm leading-relaxed">{p.tagline}</p>
          )}
        </div>

        {/* ---------------- Alamat sekolah ---------------- */}
        <div>
          <p className={judulBagian}>Alamat Sekolah</p>
          <address className="mt-4 flex gap-2.5 text-sm leading-relaxed not-italic">
            <IkonLokasi className="mt-0.5 shrink-0 text-green-400" />
            <span>{alamat}</span>
          </address>

          {alamat && (
            <a
              href={tautanPeta(p)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 inline-flex items-center gap-2 text-sm font-semibold text-green-400 hover:text-green-300"
            >
              <IkonLokasi ukuran={17} className="shrink-0" />
              Buka Google Maps
            </a>
          )}

          {p.jam_layanan && !belumTerisi(p.jam_layanan) && (
            <p className="mt-3.5 flex items-center gap-2.5 text-sm">
              <IkonJam className="shrink-0 text-white/50" />
              <span>
                <span className="text-white/60">Jam layanan: </span>
                {p.jam_layanan}
              </span>
            </p>
          )}
        </div>

        {/* ---------------- Hubungi kami ---------------- */}
        <div>
          <p className={judulBagian}>Hubungi Kami</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {p.telepon && (
              <li>
                <a
                  href={`tel:${p.telepon}`}
                  className="flex items-center gap-3 hover:text-emas"
                >
                  <IkonTelepon className="shrink-0 text-green-400" />
                  {p.telepon}
                </a>
              </li>
            )}
            {p.email && (
              <li>
                <a
                  href={`mailto:${p.email}`}
                  className="flex items-center gap-3 break-all hover:text-emas"
                >
                  <IkonSurel className="shrink-0 text-green-400" />
                  {p.email}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:text-emas"
                >
                  <IkonWhatsapp className="shrink-0 text-green-400" />
                  WhatsApp panitia PPDB
                </a>
              </li>
            )}
          </ul>

          {/* Ikonnya saja tanpa tulisan, sebab lambang Instagram dan YouTube
              sudah dikenali semua orang. Nama layanannya tetap ada di
              aria-label supaya pembaca layar tidak menerima tautan tanpa
              nama. Yang belum diisi sekolah tidak ditampilkan. */}
          {sosial.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {sosial.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-emas hover:text-biru-tua"
                  >
                    <IkonSosial nama={s.label} ukuran={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------------- Tautan pintar ---------------- */}
        <div>
          <p className={judulBagian}>Tautan Pintar</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {tautanPintar.map((t) => (
              <li key={t.jalur + t.label}>
                <Link
                  href={t.jalur}
                  className="flex items-center gap-2 hover:text-emas"
                >
                  <IkonPanahKanan
                    ukuran={15}
                    className="shrink-0 text-green-400"
                  />
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------------- Bilah bawah ----------------
          Diberi ruang untuk tombol bantuan melayang, yang duduk di pojok
          kanan bawah layar dan sebelumnya memotong ujung kalimat
          pengembangnya. Ruangnya di tempat yang berbeda menurut lebar layar:
          pada layar lebar barisnya mendatar, jadi ruangnya di KANAN; pada
          ponsel barisnya menumpuk dan tombolnya menutupi baris terakhir,
          jadi ruangnya di BAWAH. Ditulis pt/pb terpisah, bukan py bersama
          pb, sebab dua utilitas ringkas yang bertumpang tindih urutan
          menangnya tidak dapat diandalkan. */}
      <div className="border-t border-white/10">
        <div className="wadah flex flex-col gap-2 pt-5 pb-24 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:pr-52 sm:pb-5">
          <p>
            © {tahun} {nama}. Seluruh hak dilindungi.
          </p>
          <p>
            Dikembangkan oleh mahasiswa Pengabdian Kepada Masyarakat (PkM)
            Universitas Pamulang, Program Studi Teknik Informatika.
          </p>
        </div>
      </div>
    </footer>
  );
}

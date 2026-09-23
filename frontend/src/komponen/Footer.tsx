import Link from "next/link";
import {
  IkonJam,
  IkonLokasi,
  IkonSosial,
  IkonSurel,
  IkonTelepon,
  IkonWhatsapp,
} from "./Ikon";
import type { Pengaturan } from "@/lib/tipe";
import {
  alamatLengkap,
  belumTerisi,
  pesanTanyaPpdb,
  tautanWa,
} from "@/lib/format";

export default function Footer({ pengaturan }: { pengaturan: Pengaturan }) {
  const tahun = new Date().getFullYear();
  const wa = tautanWa(
    pengaturan.whatsapp ?? "",
    pesanTanyaPpdb(pengaturan.nama_sekolah ?? ""),
  );

  const sosial = [
    { label: "Instagram", url: pengaturan.instagram },
    { label: "Facebook", url: pengaturan.facebook },
    { label: "YouTube", url: pengaturan.youtube },
    { label: "TikTok", url: pengaturan.tiktok },
  ].filter((s) => s.url);

  return (
    <footer className="tanpa-cetak mt-20 bg-biru-tua text-white/80">
      <div className="wadah grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-white">
            {pengaturan.nama_sekolah || "SMA IMTEK"}
          </p>
          {pengaturan.tagline && !belumTerisi(pengaturan.tagline) && (
            <p className="mt-2 text-sm leading-relaxed">{pengaturan.tagline}</p>
          )}
          <dl className="mt-4 space-y-1 text-sm">
            {pengaturan.npsn && (
              <div className="flex gap-2">
                <dt className="text-white/60">NPSN</dt>
                <dd>{pengaturan.npsn}</dd>
              </div>
            )}
            {pengaturan.status_sekolah && (
              <div className="flex gap-2">
                <dt className="text-white/60">Status</dt>
                <dd>{pengaturan.status_sekolah}</dd>
              </div>
            )}
            {pengaturan.akreditasi && (
              <div className="flex gap-2">
                <dt className="text-white/60">Akreditasi</dt>
                <dd>{pengaturan.akreditasi}</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <p className="mb-3 font-semibold text-white">Alamat</p>
          <address className="flex gap-2 text-sm not-italic leading-relaxed">
            <IkonLokasi className="mt-0.5 shrink-0 text-white/60" />
            <span>
            {alamatLengkap(pengaturan.alamat, pengaturan.kode_pos)}
            </span>
          </address>
          {pengaturan.jam_layanan && !belumTerisi(pengaturan.jam_layanan) && (
            <p className="mt-3 flex items-center gap-2 text-sm">
              <IkonJam className="shrink-0 text-white/60" />
              <span>
                <span className="text-white/60">Jam layanan: </span>
                {pengaturan.jam_layanan}
              </span>
            </p>
          )}
        </div>

        <div>
          <p className="mb-3 font-semibold text-white">Hubungi</p>
          <ul className="space-y-1.5 text-sm">
            {pengaturan.telepon && (
              <li>
                <a
                  href={`tel:${pengaturan.telepon}`}
                  className="flex items-center gap-2 hover:text-emas"
                >
                  <IkonTelepon className="shrink-0 text-white/60" />
                  {pengaturan.telepon}
                </a>
              </li>
            )}
            {pengaturan.email && (
              <li>
                <a
                  href={`mailto:${pengaturan.email}`}
                  className="flex items-center gap-2 break-all hover:text-emas"
                >
                  <IkonSurel className="shrink-0 text-white/60" />
                  {pengaturan.email}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-emas"
                >
                  <IkonWhatsapp className="shrink-0 text-white/60" />
                  WhatsApp panitia PPDB
                </a>
              </li>
            )}
          </ul>
          {sosial.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3 text-sm">
              {sosial.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20 hover:text-emas"
                  >
                    <IkonSosial nama={s.label} className="shrink-0" />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-3 font-semibold text-white">Tautan</p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link href="/ppdb" className="hover:text-emas">
                Informasi PPDB
              </Link>
            </li>
            <li>
              <Link href="/ppdb/daftar" className="hover:text-emas">
                Formulir pendaftaran
              </Link>
            </li>
            <li>
              <Link href="/ppdb/cek" className="hover:text-emas">
                Cek status pendaftaran
              </Link>
            </li>
            <li>
              <Link href="/berita" className="hover:text-emas">
                Berita & pengumuman
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-emas">
                Masuk petugas
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="wadah flex flex-col gap-1 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {tahun} {pengaturan.nama_sekolah || "SMA IMTEK"}. Seluruh hak dilindungi.
          </p>
          <p>
            Dikembangkan oleh mahasiswa Program Kreativitas Mahasiswa (PkM)
            Jurusan Teknik Informatika, bidang Manajemen Komputer &amp; Sistem.
          </p>
        </div>
      </div>
    </footer>
  );
}

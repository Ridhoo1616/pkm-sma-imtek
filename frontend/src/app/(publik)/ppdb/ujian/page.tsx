import type { Metadata } from "next";
import { api } from "@/lib/api";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import Ujian from "@/komponen/Ujian";

export const metadata: Metadata = {
  title: "Tes Seleksi Online",
  description: "Kerjakan tes seleksi PPDB secara online.",
  // Halaman ini hanya berguna bagi pendaftar yang sudah punya nomor
  // registrasi, jadi tidak perlu muncul di hasil pencarian.
  robots: { index: false, follow: false },
};

export default async function HalamanUjian() {
  const info = await api.infoUjian().catch(() => null);

  return (
    <>
      <KepalaHalaman
        judul="Tes Seleksi Online"
        keterangan="Dikerjakan langsung di peramban. Jawaban tersimpan otomatis, dan waktunya dihitung server."
      />

      <div className="wadah max-w-3xl py-12">
        {info && !info.dibuka ? (
          <div className="kartu space-y-3 p-6">
            <h2 className="text-lg">Tes seleksi belum dibuka</h2>
            <p className="text-sm leading-relaxed text-samar">
              Belum ada jadwal tes yang sedang berjalan. Perhatikan pengumuman
              dari panitia, atau pantau halaman Info PPDB.
            </p>
            {info.info && !belumTerisi(info.info) && (
              <p className="rounded-lg bg-biru-muda px-5 py-4 text-sm leading-relaxed whitespace-pre-line text-biru-tua">
                {info.info}
              </p>
            )}
          </div>
        ) : (
          <>
            {info?.paket && (
              <div className="kartu mb-6 grid gap-4 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-samar">Nama tes</p>
                  <p className="font-semibold text-teks">{info.paket.nama}</p>
                </div>
                <div>
                  <p className="text-xs text-samar">Lama pengerjaan</p>
                  <p className="font-semibold text-teks tabular-nums">
                    {info.paket.durasi_menit} menit
                  </p>
                </div>
                <div>
                  <p className="text-xs text-samar">Jumlah soal</p>
                  <p className="font-semibold text-teks tabular-nums">
                    {info.paket.jumlah_soal} butir
                  </p>
                </div>
              </div>
            )}
            <Ujian />
          </>
        )}
      </div>
    </>
  );
}

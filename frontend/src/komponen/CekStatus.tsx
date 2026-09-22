"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api, GalatApi } from "@/lib/api";
import { Teks, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { Lencana } from "@/komponen/Bagian";
import { tanggalJam, tanggalPanjang, warnaStatus } from "@/lib/format";
import type { StatusPendaftaran } from "@/lib/tipe";

/** Keterangan tiap status, supaya pendaftar paham artinya tanpa bertanya. */
const ARTI_STATUS: Record<string, string> = {
  "Menunggu Verifikasi":
    "Berkas Anda sudah kami terima dan sedang menunggu pemeriksaan panitia. Belum ada tindakan yang perlu Anda lakukan.",
  Terverifikasi:
    "Berkas Anda sudah diperiksa dan dinyatakan lengkap. Menunggu penetapan hasil seleksi.",
  Diterima:
    "Selamat, Anda dinyatakan diterima. Lanjutkan dengan daftar ulang sesuai ketentuan sekolah.",
  Cadangan:
    "Anda masuk daftar cadangan. Bila ada peserta diterima yang tidak melakukan daftar ulang, panitia akan menghubungi Anda.",
  Ditolak:
    "Pendaftaran Anda belum dapat diterima. Keterangan dari panitia dapat dibaca di bawah, bila ada.",
};

export default function CekStatus({ nomorAwal = "" }: { nomorAwal?: string }) {
  const [no, setNo] = useState(nomorAwal);
  const [tgl, setTgl] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [mencari, setMencari] = useState(false);
  const [hasil, setHasil] = useState<StatusPendaftaran | null>(null);

  async function cari(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setRingkasan([]);
    setHasil(null);
    setMencari(true);
    try {
      setHasil(
        await api.cekStatus({ no_registrasi: no.trim(), tanggal_lahir: tgl }),
      );
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalat(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Terjadi gangguan yang tidak dikenali. Silakan coba lagi."]);
      }
    } finally {
      setMencari(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={cari} className="kartu p-6 md:p-7" noValidate>
        <div className="space-y-5">
          <RingkasanGalat daftar={ringkasan} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="no_registrasi"
              label="Nomor registrasi"
              wajib
              nilai={no}
              ubah={setNo}
              galat={galat.no_registrasi}
              contoh="PPDB-2728-0001"
              bantuan="Nomor yang Anda terima setelah mengirim formulir."
            />
            <Teks
              nama="tanggal_lahir"
              label="Tanggal lahir"
              tipe="date"
              wajib
              nilai={tgl}
              ubah={setTgl}
              galat={galat.tanggal_lahir}
              bantuan="Dipakai sebagai pengaman agar data Anda tidak terbuka oleh orang lain."
            />
          </div>

          <Tombol type="submit" sedangJalan={mencari}>
            {mencari ? "Mencari..." : "Lihat Status"}
          </Tombol>
        </div>
      </form>

      {hasil && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="kartu overflow-hidden"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-garis bg-biru-muda px-6 py-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-samar uppercase">
                Nomor registrasi
              </p>
              <p className="mt-0.5 text-2xl font-bold text-biru-tua">
                {hasil.no_registrasi}
              </p>
            </div>
            <Lencana warna={warnaStatus(hasil.status)}>{hasil.status}</Lencana>
          </div>

          <dl className="divide-y divide-garis text-sm">
            {[
              { k: "Nama lengkap", v: hasil.nama_lengkap },
              { k: "Tahun ajaran", v: hasil.tahun_ajaran },
              { k: "Jalur pendaftaran", v: hasil.jalur },
              { k: "Peminatan", v: hasil.nama_jurusan },
              { k: "Waktu mendaftar", v: tanggalJam(hasil.dibuat) },
            ].map(
              (b) =>
                b.v && (
                  <div
                    key={b.k}
                    className="flex flex-col gap-0.5 px-6 py-3.5 sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <dt className="text-samar">{b.k}</dt>
                    <dd className="font-semibold text-teks sm:text-right">{b.v}</dd>
                  </div>
                ),
            )}
          </dl>

          <div className="space-y-4 border-t border-garis px-6 py-5">
            <p className="text-sm leading-relaxed text-teks">
              {ARTI_STATUS[hasil.status] ?? ""}
            </p>

            {hasil.catatan_admin && (
              <div className="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4">
                <p className="text-xs font-semibold tracking-wide text-biru uppercase">
                  Catatan panitia
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-teks">
                  {hasil.catatan_admin}
                </p>
              </div>
            )}

            {hasil.pengumuman && (
              <p className="text-sm text-samar">
                Pengumuman hasil seleksi dijadwalkan pada{" "}
                <strong className="text-biru-tua">
                  {tanggalPanjang(hasil.pengumuman)}
                </strong>
                .
              </p>
            )}

            <div className="tanpa-cetak border-t border-garis pt-4">
              <Tombol jenis="kedua" onClick={() => window.print()}>
                Cetak halaman ini
              </Tombol>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

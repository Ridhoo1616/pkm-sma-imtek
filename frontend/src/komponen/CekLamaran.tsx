"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { Teks, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { Lencana } from "@/komponen/Bagian";
import { MunculLangsung } from "@/komponen/Gerak";
import { tanggalPanjang, warnaLamaran } from "@/lib/format";
import type { LamaranSaya } from "@/lib/tipe";

/** Arti tiap tahap, supaya pelamar paham tanpa perlu bertanya. */
const ARTI: Record<string, string> = {
  Diajukan: "Lamaran sudah diterima dan sedang diperiksa petugas BKK sebelum diteruskan ke perusahaan.",
  Diteruskan: "Berkas Anda sudah diteruskan ke perusahaan. Perusahaan yang menentukan siapa yang dipanggil.",
  Wawancara: "Anda dipanggil ke tahap seleksi atau wawancara. Baca catatan petugas untuk jadwal dan tempatnya.",
  Diterima: "Selamat, Anda diterima bekerja. Ikuti petunjuk dari perusahaan atau petugas BKK.",
  Ditolak: "Lamaran ini belum berhasil. Lowongan lain tetap dapat dilamar dari halaman Lowongan Kerja.",
};

export default function CekLamaran() {
  const [nisn, setNisn] = useState("");
  const [tgl, setTgl] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [mencari, setMencari] = useState(false);
  const [hasil, setHasil] = useState<LamaranSaya[] | null>(null);

  async function cari(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setRingkasan([]);
    setHasil(null);
    setMencari(true);
    try {
      setHasil((await api.cekLamaranBkk({ nisn: nisn.trim(), tanggal_lahir: tgl })).data);
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
            <Teks nama="nisn" label="NISN" wajib maks={10} nilai={nisn} ubah={setNisn} galat={galat.nisn} bantuan="NISN yang Anda tulis saat melamar." />
            <Teks
              nama="tanggal_lahir"
              label="Tanggal lahir"
              tipe="date"
              wajib
              nilai={tgl}
              ubah={setTgl}
              galat={galat.tanggal_lahir}
              bantuan="Pengaman agar lamaran Anda tidak dibuka orang lain."
            />
          </div>
          <Tombol type="submit" sedangJalan={mencari}>
            {mencari ? "Mencari..." : "Lihat Lamaran"}
          </Tombol>
        </div>
      </form>

      {hasil && (
        <div className="space-y-5">
          {hasil.map((s, i) => (
            <MunculLangsung key={s.kode} jeda={i * 0.05} className="kartu overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-garis bg-biru-muda px-6 py-5">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-samar uppercase">{s.kode}</p>
                  <p className="mt-0.5 text-xl font-bold text-biru-tua">{s.posisi}</p>
                  <p className="text-sm text-samar">{s.nama_mitra}</p>
                </div>
                <Lencana jenis={warnaLamaran(s.status)}>{s.status}</Lencana>
              </div>
              <div className="space-y-4 px-6 py-5">
                <p className="text-sm leading-relaxed text-teks">{ARTI[s.status] ?? ""}</p>
                {s.catatan && (
                  <div className="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4">
                    <p className="text-xs font-semibold tracking-wide text-biru uppercase">Catatan petugas BKK</p>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-teks">{s.catatan}</p>
                  </div>
                )}
                <p className="text-xs text-samar">
                  Dikirim {tanggalPanjang(s.dibuat)}
                  {s.diubah !== s.dibuat && ` · diperbarui ${tanggalPanjang(s.diubah)}`}
                </p>
              </div>
            </MunculLangsung>
          ))}
        </div>
      )}
    </div>
  );
}

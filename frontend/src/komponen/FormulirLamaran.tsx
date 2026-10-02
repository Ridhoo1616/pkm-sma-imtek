"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { Teks, AreaTeks, Pilihan, Berkas, Centang, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { MunculLangsung } from "@/komponen/Gerak";
import { BATAS_UNGGAH } from "@/lib/unggah";

/**
 * Formulir lamaran Bursa Kerja Khusus, di halaman satu lowongan.
 *
 * Sengaja satu halaman pendek, bukan bertahap seperti formulir PPDB: yang
 * diminta hanya data yang dibutuhkan perusahaan untuk memanggil wawancara.
 * NISN beserta tanggal lahir dipakai lagi untuk memantau lamaran, jadi
 * pelamar tidak perlu mengingat kode apa pun.
 */

const KOSONG = {
  nama: "",
  nisn: "",
  tanggal_lahir: "",
  jenis_kelamin: "",
  tahun_lulus: "",
  telepon: "",
  email: "",
  alamat: "",
  ringkasan: "",
};

export default function FormulirLamaran({ lowonganId, posisi }: { lowonganId: number; posisi: string }) {
  const [isi, setIsi] = useState(KOSONG);
  const [cv, setCv] = useState<File | null>(null);
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [mengirim, setMengirim] = useState(false);
  const [kode, setKode] = useState("");

  const ubah = (k: keyof typeof KOSONG) => (v: string) => setIsi((s) => ({ ...s, [k]: v }));

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setRingkasan([]);
    setMengirim(true);
    const fd = new FormData();
    fd.append("lowongan_id", String(lowonganId));
    for (const [k, v] of Object.entries(isi)) fd.append(k, v);
    if (cv) fd.append("cv", cv);
    if (setuju) fd.append("setuju", "1");
    try {
      const hasil = await api.lamarBkk(fd);
      setKode(hasil.kode);
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalat(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Lamaran gagal dikirim. Periksa koneksi Anda lalu coba lagi."]);
      }
    } finally {
      setMengirim(false);
    }
  }

  if (kode) {
    return (
      <MunculLangsung className="kartu p-6 text-center md:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-green-700 uppercase">Lamaran terkirim</p>
        <p className="mt-2 text-3xl font-bold text-biru-tua">{kode}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-samar">
          Lamaran Anda untuk posisi <strong className="text-teks">{posisi}</strong> sudah kami terima. Petugas BKK
          memeriksanya lebih dulu sebelum meneruskannya ke perusahaan. Pantau tahapnya di halaman Cek Lamaran dengan NISN
          dan tanggal lahir Anda; sebutkan kode di atas bila menghubungi petugas.
        </p>
        <a
          href="/bkk/cek"
          className="mt-6 inline-flex rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white hover:bg-biru-tua"
        >
          Buka Cek Lamaran
        </a>
      </MunculLangsung>
    );
  }

  return (
    <form onSubmit={kirim} className="kartu space-y-5 p-6 md:p-7" noValidate>
      <RingkasanGalat daftar={ringkasan} />

      <Teks nama="nama" label="Nama lengkap" wajib maks={120} nilai={isi.nama} ubah={ubah("nama")} galat={galat.nama} bantuan="Sesuai ijazah." />
      <div className="grid gap-5 sm:grid-cols-2">
        <Teks
          nama="nisn"
          label="NISN"
          wajib
          maks={10}
          nilai={isi.nisn}
          ubah={ubah("nisn")}
          galat={galat.nisn}
          bantuan="10 angka, tercantum pada ijazah atau rapor."
        />
        <Teks nama="tanggal_lahir" label="Tanggal lahir" tipe="date" wajib nilai={isi.tanggal_lahir} ubah={ubah("tanggal_lahir")} galat={galat.tanggal_lahir} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Pilihan
          nama="jenis_kelamin"
          label="Jenis kelamin"
          wajib
          nilai={isi.jenis_kelamin}
          ubah={ubah("jenis_kelamin")}
          galat={galat.jenis_kelamin}
          opsi={[
            { nilai: "L", label: "Laki-laki" },
            { nilai: "P", label: "Perempuan" },
          ]}
        />
        <Teks nama="tahun_lulus" label="Tahun lulus" tipe="number" wajib nilai={isi.tahun_lulus} ubah={ubah("tahun_lulus")} galat={galat.tahun_lulus} contoh={String(new Date().getFullYear())} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Teks nama="telepon" label="Nomor HP/WhatsApp" tipe="tel" wajib maks={25} nilai={isi.telepon} ubah={ubah("telepon")} galat={galat.telepon} contoh="08..." />
        <Teks nama="email" label="Email" tipe="email" maks={120} nilai={isi.email} ubah={ubah("email")} galat={galat.email} />
      </div>
      <AreaTeks nama="alamat" label="Alamat domisili" baris={2} nilai={isi.alamat} ubah={ubah("alamat")} galat={galat.alamat} />
      <AreaTeks
        nama="ringkasan"
        label="Keahlian dan pengalaman"
        baris={4}
        nilai={isi.ringkasan}
        ubah={ubah("ringkasan")}
        galat={galat.ringkasan}
        bantuan="Misalnya sertifikat, pengalaman magang atau kerja, dan kemampuan komputer."
      />
      <Berkas
        nama="cv"
        label="CV / daftar riwayat hidup"
        ubah={setCv}
        galat={galat.cv}
        bantuan={`PDF, JPG, atau PNG, maksimal ${BATAS_UNGGAH}. Hanya dibuka petugas BKK dan perusahaan yang dilamar.`}
      />
      <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
        <Centang nama="setuju" nilai={setuju} ubah={setSetuju} galat={galat.setuju}>
          Data yang saya isi benar, dan saya setuju data serta CV ini diteruskan petugas BKK kepada perusahaan yang saya lamar.
        </Centang>
      </div>
      <Tombol type="submit" sedangJalan={mengirim}>
        {mengirim ? "Mengirim..." : "Kirim Lamaran"}
      </Tombol>
    </form>
  );
}

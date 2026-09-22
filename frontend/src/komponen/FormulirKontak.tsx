"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { Teks, AreaTeks, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { PesanBerhasil } from "@/komponen/Memuat";

const AWAL = { nama: "", email: "", no_hp: "", subjek: "", isi: "" };

export default function FormulirKontak() {
  const [isi, setIsi] = useState(AWAL);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [berhasil, setBerhasil] = useState("");
  const [mengirim, setMengirim] = useState(false);

  const ubah = (k: keyof typeof AWAL) => (v: string) =>
    setIsi((s) => ({ ...s, [k]: v }));

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setRingkasan([]);
    setBerhasil("");
    setMengirim(true);
    try {
      // "website" adalah perangkap spam: dikirim kosong oleh manusia.
      const hasil = await api.kirimPesan({ ...isi, website: "" });
      setBerhasil(hasil.pesan);
      setIsi(AWAL);
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalat(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Terjadi gangguan yang tidak dikenali. Silakan coba lagi."]);
      }
    } finally {
      setMengirim(false);
    }
  }

  if (berhasil) {
    return (
      <div className="space-y-4">
        <PesanBerhasil pesan={berhasil} />
        <Tombol jenis="kedua" onClick={() => setBerhasil("")}>
          Kirim pesan lain
        </Tombol>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} className="space-y-5" noValidate>
      <RingkasanGalat daftar={ringkasan} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Teks
          nama="nama"
          label="Nama Anda"
          wajib
          maks={100}
          nilai={isi.nama}
          ubah={ubah("nama")}
          galat={galat.nama}
          contoh="Nama lengkap"
        />
        <Teks
          nama="no_hp"
          label="No. HP / WhatsApp"
          tipe="tel"
          nilai={isi.no_hp}
          ubah={ubah("no_hp")}
          galat={galat.no_hp}
          contoh="0812xxxxxxxx"
        />
      </div>

      <Teks
        nama="email"
        label="Email"
        tipe="email"
        nilai={isi.email}
        ubah={ubah("email")}
        galat={galat.email}
        contoh="nama@contoh.com"
        bantuan="Isi email atau nomor HP agar sekolah dapat membalas."
      />

      <Teks
        nama="subjek"
        label="Subjek"
        wajib
        maks={200}
        nilai={isi.subjek}
        ubah={ubah("subjek")}
        galat={galat.subjek}
        contoh="Pertanyaan tentang biaya PPDB"
      />

      <AreaTeks
        nama="isi"
        label="Isi pesan"
        wajib
        baris={6}
        maks={5000}
        nilai={isi.isi}
        ubah={ubah("isi")}
        galat={galat.isi}
        contoh="Tuliskan pertanyaan Anda selengkap mungkin agar dapat dijawab dengan tepat."
      />

      {/* Perangkap spam. Disembunyikan dari tampilan dan dari pembaca layar,
          tetapi tetap terisi oleh robot pengisi formulir otomatis. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <Tombol type="submit" sedangJalan={mengirim}>
        {mengirim ? "Mengirim..." : "Kirim Pesan"}
      </Tombol>
    </form>
  );
}

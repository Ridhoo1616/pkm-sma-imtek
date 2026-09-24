"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel } from "@/komponen/Panel";
import { PesanGalat, PesanBerhasil } from "@/komponen/Memuat";
import { Teks, Tombol } from "@/komponen/Medan";

export default function HalamanGantiSandi() {
  const { pengguna } = useSesi();
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [galat, setGalat] = useState("");
  const [galatUlang, setGalatUlang] = useState("");
  const [pesan, setPesan] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setGalatUlang("");
    setPesan("");

    // Pengulangan sandi diperiksa di sini karena backend tidak perlu
    // mengetahuinya; yang dikirim hanya satu kata sandi baru.
    if (baru !== ulang) {
      setGalatUlang("Ulangan kata sandi tidak sama.");
      return;
    }

    setMenyimpan(true);
    try {
      const hasil = await api.gantiSandi({ sandi_lama: lama, sandi_baru: baru });
      setPesan(hasil.pesan);
      setLama("");
      setBaru("");
      setUlang("");
    } catch (e) {
      setGalat(
        e instanceof GalatApi ? e.message : "Kata sandi gagal diperbarui.",
      );
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Ganti Kata Sandi"
        keterangan={`Mengubah kata sandi akun ${pengguna?.username ?? ""}. Sesi yang sedang berjalan tetap aktif sampai Anda keluar.`}
      />

      <div className="max-w-xl">
        <form onSubmit={kirim} className="kartu space-y-5 p-6 md:p-7" noValidate>
          {pesan && <PesanBerhasil pesan={pesan} />}
          {galat && <PesanGalat pesan={galat} />}

          <Teks
            nama="sandi_lama"
            label="Kata sandi sekarang"
            tipe="password"
            wajib
            nilai={lama}
            ubah={setLama}
          />
          <Teks
            nama="sandi_baru"
            label="Kata sandi baru"
            tipe="password"
            wajib
            nilai={baru}
            ubah={setBaru}
            bantuan="Minimal 8 karakter. Gabungkan huruf, angka, dan tanda baca."
          />
          <Teks
            nama="sandi_ulang"
            label="Ulangi kata sandi baru"
            tipe="password"
            wajib
            nilai={ulang}
            ubah={setUlang}
            galat={galatUlang}
          />

          <Tombol type="submit" sedangJalan={menyimpan}>
            {menyimpan ? "Menyimpan..." : "Simpan Kata Sandi"}
          </Tombol>

          <p className="border-t border-garis pt-4 text-xs leading-relaxed text-samar">
            Akun bawaan <code>admin</code> memakai kata sandi contoh yang
            tercantum pada berkas panduan di repositori publik proyek ini.
            Selama kata sandi itu belum diganti, siapa pun yang menemukan
            alamat panel dapat masuk.
          </p>
        </form>
      </div>
    </>
  );
}

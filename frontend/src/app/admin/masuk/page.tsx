"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSesi } from "@/komponen/Sesi";
import { GalatApi } from "@/lib/api";
import { Teks, Tombol } from "@/komponen/Medan";
import { PesanGalat } from "@/komponen/Memuat";

export default function HalamanMasuk() {
  const { pengguna, masuk } = useSesi();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [sandi, setSandi] = useState("");
  const [galat, setGalat] = useState("");
  const [mengirim, setMengirim] = useState(false);

  // Petugas yang sudah punya sesi tidak perlu melihat formulir ini lagi.
  useEffect(() => {
    if (pengguna) router.replace("/admin");
  }, [pengguna, router]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setMengirim(true);
    try {
      await masuk(username, sandi);
      router.replace("/admin");
    } catch (e) {
      setGalat(
        e instanceof GalatApi
          ? e.message
          : "Terjadi gangguan saat menghubungi server.",
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-biru-tua px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-white">Masuk Petugas</h1>
          <p className="mt-2 text-sm text-white/70">
            Panel pengelolaan pendaftaran dan isi situs sekolah.
          </p>
        </div>

        <form
          onSubmit={kirim}
          className="space-y-5 rounded-kartu bg-white p-7 shadow-kuat"
          noValidate
        >
          {galat && <PesanGalat pesan={galat} />}

          <Teks
            nama="username"
            label="Nama pengguna"
            wajib
            nilai={username}
            ubah={setUsername}
            contoh="admin"
          />
          <Teks
            nama="sandi"
            label="Kata sandi"
            tipe="password"
            wajib
            nilai={sandi}
            ubah={setSandi}
          />

          <Tombol type="submit" penuh sedangJalan={mengirim}>
            {mengirim ? "Memeriksa..." : "Masuk"}
          </Tombol>

          <p className="border-t border-garis pt-4 text-xs leading-relaxed text-samar">
            Percobaan masuk dibatasi lima kali gagal dalam sepuluh menit.
            Bila lupa kata sandi, minta admin lain mengaturnya ulang dari
            menu Pengguna.
          </p>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-white/70 hover:text-emas">
            ← Kembali ke situs publik
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

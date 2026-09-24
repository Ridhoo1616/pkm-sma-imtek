"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { SekolahRujukan } from "@/lib/tipe";

/**
 * Isian nama sekolah asal yang mencari sambil diketik.
 *
 * Gunanya bukan kenyamanan, melainkan ketepatan: memilih dari daftar mengisi
 * nama DAN NPSN sekaligus dari satu baris data yang sama, sehingga keduanya
 * tidak mungkin saling tidak cocok. Mengetik keduanya sendiri hampir selalu
 * menghasilkan salah satu yang salah.
 *
 * Selama daftar rujukan di panel masih kosong, komponen ini bekerja seperti
 * kolom teks biasa: tidak ada saran yang muncul, dan tidak ada yang dituntut.
 * Keterangannya di backend/sekolah.go.
 *
 * Tanpa pustaka autocomplete. Yang dibutuhkan cuma daftar yang muncul di
 * bawah kolom beserta panah atas-bawah, dan itu jauh lebih kecil daripada
 * pustaka mana pun yang menyediakannya.
 */
export function PilihSekolah({
  nama,
  npsn,
  ubahNama,
  ubahNpsn,
  galatNama,
  galatNpsn,
  tidakTerdaftar,
  ubahTidakTerdaftar,
}: {
  nama: string;
  npsn: string;
  ubahNama: (v: string) => void;
  ubahNpsn: (v: string) => void;
  galatNama?: string;
  galatNpsn?: string;
  tidakTerdaftar: boolean;
  ubahTidakTerdaftar: (v: boolean) => void;
}) {
  const idDaftar = useId();
  const [saran, setSaran] = useState<SekolahRujukan[]>([]);
  const [terbuka, setTerbuka] = useState(false);
  const [sorot, setSorot] = useState(-1);
  const [mencari, setMencari] = useState(false);
  // Daftar rujukannya dianggap aktif sampai server mengatakan sebaliknya,
  // supaya tidak ada kedipan tuntutan yang muncul lalu hilang.
  const [rujukanAktif, setRujukanAktif] = useState(true);
  const [dipilih, setDipilih] = useState(false);
  const wadah = useRef<HTMLDivElement | null>(null);

  /*
   * Kata kunci dan kelayakannya DIHITUNG, bukan disimpan sebagai keadaan.
   * Semula daftar saran dikosongkan dengan setSaran([]) di dalam badan efek,
   * dan penyusun React menolaknya: memanggil setState serentak di dalam efek
   * memicu render berantai. Yang benar menurunkannya dari keadaan yang sudah
   * ada, dan itu juga menghapus satu sumber kebenaran yang bisa basi.
   */
  const kata = nama.trim();
  const bolehCari = !dipilih && kata.length >= 3;
  const saranTampil = bolehCari ? saran : [];

  // Pencariannya ditunda 300 ms sesudah ketikan terakhir. Tanpa penundaan,
  // satu nama sekolah menghasilkan belasan permintaan, dan pembatas laju di
  // server akan menutupnya di tengah pengisian formulir.
  useEffect(() => {
    if (!bolehCari) return;
    let dibatalkan = false;
    const jeda = setTimeout(() => {
      setMencari(true);
      api
        .cariSekolah(kata)
        .then((h) => {
          if (dibatalkan) return;
          setSaran(h.data);
          setRujukanAktif(h.aktif);
          setTerbuka(h.data.length > 0);
          setSorot(-1);
        })
        .catch(() => {
          // Gagal mencari tidak boleh menghalangi pengisian formulir:
          // kolomnya tetap dapat diketik sendiri.
          if (!dibatalkan) setSaran([]);
        })
        .finally(() => {
          if (!dibatalkan) setMencari(false);
        });
    }, 300);
    return () => {
      dibatalkan = true;
      clearTimeout(jeda);
    };
  }, [kata, bolehCari]);

  // Menekan di luar kolomnya menutup daftar saran.
  useEffect(() => {
    const tutup = (e: MouseEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    };
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, []);

  function pilih(s: SekolahRujukan) {
    setDipilih(true);
    ubahNama(s.nama);
    ubahNpsn(s.npsn);
    ubahTidakTerdaftar(false);
    setTerbuka(false);
  }

  function tombol(e: React.KeyboardEvent) {
    if (!terbuka || saranTampil.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSorot((i) => (i + 1) % saranTampil.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSorot((i) => (i - 1 + saranTampil.length) % saranTampil.length);
    } else if (e.key === "Enter" && sorot >= 0) {
      e.preventDefault();
      pilih(saranTampil[sorot]);
    } else if (e.key === "Escape") {
      setTerbuka(false);
    }
  }

  const gayaInput =
    "w-full rounded-lg border px-3.5 py-2.5 text-sm transition focus:ring-2 focus:ring-biru/20 focus:outline-none";
  const tepi = (galat?: string) =>
    galat
      ? "border-red-400 focus:border-red-500"
      : "border-garis focus:border-biru";

  return (
    <>
      <div ref={wadah} className="relative">
        <label
          htmlFor="asal_sekolah"
          className="mb-1.5 block text-sm font-semibold text-teks"
        >
          Nama SMP / MTs asal <span className="text-red-600">*</span>
        </label>
        <input
          id="asal_sekolah"
          name="asal_sekolah"
          autoComplete="off"
          role="combobox"
          aria-expanded={terbuka}
          aria-controls={idDaftar}
          aria-autocomplete="list"
          maxLength={140}
          value={nama}
          onChange={(e) => {
            setDipilih(false);
            ubahNama(e.target.value);
          }}
          onKeyDown={tombol}
          onFocus={() => saranTampil.length > 0 && setTerbuka(true)}
          aria-invalid={galatNama ? true : undefined}
          aria-describedby={galatNama ? "asal_sekolah-galat" : undefined}
          className={`${gayaInput} ${tepi(galatNama)}`}
          placeholder="Ketik tiga huruf pertama, lalu pilih dari daftar"
        />

        {terbuka && saranTampil.length > 0 && (
          <ul
            id={idDaftar}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-garis bg-white shadow-lembut"
          >
            {saranTampil.map((s, i) => (
              <li key={s.npsn} role="option" aria-selected={i === sorot}>
                <button
                  type="button"
                  onMouseEnter={() => setSorot(i)}
                  onClick={() => pilih(s)}
                  className={
                    "block w-full px-3.5 py-2.5 text-left text-sm " +
                    (i === sorot ? "bg-biru-muda" : "bg-white")
                  }
                >
                  <span className="block font-semibold text-biru-tua">
                    {s.nama}
                  </span>
                  <span className="mt-0.5 block text-xs text-samar">
                    NPSN {s.npsn}
                    {s.kecamatan ? ` · Kec. ${s.kecamatan}` : ""}
                    {s.kabupaten ? ` · ${s.kabupaten}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {galatNama ? (
          <p id="asal_sekolah-galat" className="mt-1.5 text-xs text-red-600">
            {galatNama}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-samar">
            {mencari
              ? "Mencari…"
              : "Pilih dari daftar yang muncul agar NPSN-nya terisi tepat."}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="npsn_sekolah"
          className="mb-1.5 block text-sm font-semibold text-teks"
        >
          NPSN sekolah asal <span className="text-red-600">*</span>
        </label>
        <input
          id="npsn_sekolah"
          name="npsn_sekolah"
          inputMode="numeric"
          maxLength={8}
          value={npsn}
          onChange={(e) => ubahNpsn(e.target.value)}
          aria-invalid={galatNpsn ? true : undefined}
          aria-describedby={galatNpsn ? "npsn_sekolah-galat" : undefined}
          className={`${gayaInput} ${tepi(galatNpsn)}`}
          placeholder="8 angka"
        />
        {galatNpsn ? (
          <p id="npsn_sekolah-galat" className="mt-1.5 text-xs text-red-600">
            {galatNpsn}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-samar">
            Terisi sendiri bila sekolah dipilih dari daftar. Ada pada ijazah
            atau di laman Referensi Kemendikbud.
          </p>
        )}
      </div>

      {/* Jalan keluar bagi sekolah yang memang tidak ada di daftar panitia:
          sekolah baru, pendaftar dari luar wilayah, atau pendidikan
          kesetaraan. Tanpa ini, daftar yang tidak lengkap akan menolak
          pendaftar yang datanya benar. Hanya ditawarkan bila daftar
          rujukannya memang sudah diisi panitia. */}
      {rujukanAktif && !dipilih && (
        <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="sekolah_tidak_terdaftar"
            checked={tidakTerdaftar}
            onChange={(e) => ubahTidakTerdaftar(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-garis text-biru focus:ring-2 focus:ring-biru/20"
          />
          <span className="text-samar">
            Sekolah saya tidak ada dalam daftar. Centang ini bila sudah mencoba
            mengetik namanya dan tidak muncul; panitia akan memeriksanya manual
            dari ijazah yang Anda unggah.
          </span>
        </label>
      )}
    </>
  );
}

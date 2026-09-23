"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, unduhBukti, GalatApi } from "@/lib/api";
import { bukaBlob } from "@/lib/berkas";
import {
  Teks,
  AreaTeks,
  Pilihan,
  Berkas,
  Centang,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import {
  AGAMA,
  JENIS_KELAMIN,
  PENDIDIKAN,
  PENGHASILAN,
  LABEL_SUMBER,
  KETERANGAN_JALUR,
} from "@/lib/pilihan";
import { periksaNik, periksaNisn, type KabarPeriksa } from "@/lib/identitas";
import type { Jurusan } from "@/lib/tipe";

/**
 * Kabar pemeriksaan NISN dan NIK di bawah kolomnya, muncul saat pendaftar
 * mengetik.
 *
 * Bentuknya sengaja hanya satu baris tulisan berwarna dengan satu tanda di
 * depannya, tanpa kotak dan tanpa latar: kolomnya sudah punya tempat pesan
 * galat sendiri, dan menambah kotak berwarna di situ membuat formulir yang
 * panjang terlihat penuh peringatan.
 */
function PeriksaLangsung({ kabar }: { kabar: KabarPeriksa }) {
  if (kabar.jenis === "kosong" || kabar.pesan === "") return null;

  const gaya = {
    sedang: { tanda: "\u00b7", warna: "text-samar" },
    salah: { tanda: "!", warna: "text-red-700" },
    curiga: { tanda: "?", warna: "text-amber-700" },
    benar: { tanda: "\u2713", warna: "text-green-700" },
  }[kabar.jenis];

  return (
    <p
      // aria-live supaya pembaca layar ikut menyuarakan hasilnya tanpa
      // pendaftar harus meninggalkan kolomnya lebih dulu.
      aria-live="polite"
      className={`mt-1 flex gap-1.5 text-xs leading-relaxed ${gaya.warna}`}
    >
      <span aria-hidden className="font-bold">
        {gaya.tanda}
      </span>
      <span>{kabar.pesan}</span>
    </p>
  );
}

/* ---------------- bentuk isian ---------------- */

const ISIAN_AWAL = {
  jalur: "Reguler",
  jurusan_id: "",
  nama_lengkap: "",
  jenis_kelamin: "",
  nisn: "",
  nik: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  agama: "",
  anak_ke: "",
  jumlah_saudara: "",
  alamat: "",
  kelurahan: "",
  kecamatan: "",
  kota: "",
  provinsi: "",
  kode_pos: "",
  no_hp: "",
  email: "",
  asal_sekolah: "",
  npsn_sekolah: "",
  alamat_sekolah: "",
  tahun_lulus: "",
  nilai_rata2: "",
  nama_ayah: "",
  pekerjaan_ayah: "",
  pendidikan_ayah: "",
  nama_ibu: "",
  pekerjaan_ibu: "",
  pendidikan_ibu: "",
  penghasilan: "",
  no_hp_ortu: "",
  nama_wali: "",
  sumber_informasi: "",
  catatan_sumber: "",
};

type Isian = typeof ISIAN_AWAL;
type KunciBerkas =
  | "file_foto"
  | "file_ijazah"
  | "file_kk"
  | "file_akta"
  | "file_raport"
  | "file_prestasi";

const BERKAS_AWAL: Record<KunciBerkas, File | null> = {
  file_foto: null,
  file_ijazah: null,
  file_kk: null,
  file_akta: null,
  file_raport: null,
  file_prestasi: null,
};

/**
 * Pembagian langkah. Daftar kolom per langkah dipakai untuk melompat ke
 * langkah yang memuat galat pertama ketika backend menolak isian, sehingga
 * pengguna tidak dibiarkan menebak di langkah mana kesalahannya berada.
 */
const LANGKAH = [
  {
    judul: "Jalur & Data Diri",
    ringkas: "Jalur",
    kolom: [
      "jalur",
      "jurusan_id",
      "nama_lengkap",
      "jenis_kelamin",
      "nisn",
      "nik",
      "tempat_lahir",
      "tanggal_lahir",
      "agama",
      "anak_ke",
      "jumlah_saudara",
    ],
  },
  {
    judul: "Alamat & Kontak",
    ringkas: "Alamat",
    kolom: [
      "alamat",
      "kelurahan",
      "kecamatan",
      "kota",
      "provinsi",
      "kode_pos",
      "no_hp",
      "email",
    ],
  },
  {
    judul: "Sekolah Asal & Orang Tua",
    ringkas: "Sekolah",
    kolom: [
      "asal_sekolah",
      "npsn_sekolah",
      "alamat_sekolah",
      "tahun_lulus",
      "nilai_rata2",
      "nama_ayah",
      "pekerjaan_ayah",
      "pendidikan_ayah",
      "nama_ibu",
      "pekerjaan_ibu",
      "pendidikan_ibu",
      "penghasilan",
      "no_hp_ortu",
      "nama_wali",
    ],
  },
  {
    judul: "Unggah Dokumen",
    ringkas: "Dokumen",
    kolom: [
      "file_foto",
      "file_ijazah",
      "file_kk",
      "file_akta",
      "file_raport",
      "file_prestasi",
    ],
  },
  {
    judul: "Sumber Informasi & Pernyataan",
    ringkas: "Kirim",
    kolom: ["sumber_informasi", "catatan_sumber", "pernyataan"],
  },
];

/* ---------------- komponen ---------------- */

export default function FormulirPpdb({
  jurusan,
  sumber,
  jalur,
  tahunAjaran,
  namaSekolah,
}: {
  jurusan: Jurusan[];
  sumber: string[];
  jalur: string[];
  tahunAjaran: string;
  namaSekolah: string;
}) {
  const [isi, setIsi] = useState<Isian>(ISIAN_AWAL);
  const [berkas, setBerkas] = useState(BERKAS_AWAL);
  const [pernyataan, setPernyataan] = useState(false);
  const [langkah, setLangkah] = useState(0);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [mengirim, setMengirim] = useState(false);
  const [sukses, setSukses] = useState<{ no: string; tahun: string } | null>(null);
  const [mengunduhBukti, setMengunduhBukti] = useState(false);
  const puncak = useRef<HTMLDivElement>(null);

  const ubah = (k: keyof Isian) => (v: string) => {
    setIsi((s) => ({ ...s, [k]: v }));
    // Galat pada kolom yang baru diperbaiki langsung dibersihkan, supaya
    // keterangan merah tidak bertahan setelah isinya dibetulkan.
    if (galat[k]) setGalat((g) => ({ ...g, [k]: "" }));
  };

  const ubahBerkas = (k: KunciBerkas) => (f: File | null) => {
    setBerkas((s) => ({ ...s, [k]: f }));
    if (galat[k]) setGalat((g) => ({ ...g, [k]: "" }));
  };

  // Pemeriksaan NISN dan NIK dihitung ulang setiap ketikan. Keduanya juga
  // membaca tanggal lahir dan jenis kelamin, karena di situlah kesalahan satu
  // angka pada NIK menjadi kelihatan: NIK memuat tanggal lahir beserta
  // penanda perempuan, jadi ketidakcocokannya dapat ditunjukkan dengan tepat.
  const kabarNisn = periksaNisn(isi.nisn, isi.tanggal_lahir, isi.nik);
  const kabarNik = periksaNik(isi.nik, isi.tanggal_lahir, isi.jenis_kelamin);

  const opsiJurusan = useMemo(
    () =>
      jurusan.map((j) => ({
        nilai: String(j.id),
        label: `${j.nama} (sisa kuota ${Math.max(j.kuota - j.pendaftar, 0)})`,
      })),
    [jurusan],
  );

  function keLangkah(n: number) {
    setLangkah(n);
    puncak.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setRingkasan([]);
    setMengirim(true);

    const data = new FormData();
    for (const [k, v] of Object.entries(isi)) {
      if (v !== "") data.append(k, v);
    }
    for (const [k, f] of Object.entries(berkas)) {
      if (f) data.append(k, f);
    }
    if (pernyataan) data.append("pernyataan", "1");
    data.append("website", ""); // perangkap spam, selalu kosong dari manusia

    try {
      const hasil = await api.daftar(data);
      setSukses({ no: hasil.no_registrasi, tahun: hasil.tahun_ajaran });
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalat(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);

        // Lompat ke langkah pertama yang memuat kolom bermasalah.
        const kunci = Object.keys(e.kolom);
        const tujuan = LANGKAH.findIndex((l) => l.kolom.some((k) => kunci.includes(k)));
        keLangkah(tujuan >= 0 ? tujuan : LANGKAH.length - 1);
      } else {
        setRingkasan(["Terjadi gangguan yang tidak dikenali. Silakan coba lagi."]);
      }
    } finally {
      setMengirim(false);
    }
  }

  /* ---------------- tampilan sesudah berhasil ---------------- */
  if (sukses) {
    return (
      <div className="kartu overflow-hidden">
        <div className="bg-green-600 px-7 py-8 text-center text-white">
          <p className="text-sm font-semibold tracking-wide uppercase opacity-90">
            Pendaftaran Terkirim
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{sukses.no}</p>
          <p className="mt-1 text-sm opacity-90">
            Tahun Ajaran {sukses.tahun}
          </p>
        </div>
        <div className="space-y-5 px-7 py-8">
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <strong>Simpan nomor registrasi di atas.</strong> Nomor itu beserta
            tanggal lahir adalah kunci untuk memantau hasil verifikasi berkas
            Anda. Nomor ini tidak dikirim otomatis lewat pesan, jadi catat atau
            tangkap layar sekarang.
          </p>
          <div>
            <h3 className="text-base">Langkah selanjutnya</h3>
            <ol className="mt-3 space-y-2 text-sm leading-relaxed text-teks">
              <li>1. Panitia memeriksa kelengkapan dan kesesuaian berkas Anda.</li>
              <li>
                2. Pantau hasilnya lewat menu Cek Status memakai nomor registrasi
                dan tanggal lahir.
              </li>
              <li>
                3. Bila ada berkas yang perlu diperbaiki, panitia menghubungi
                nomor yang Anda cantumkan.
              </li>
            </ol>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-garis pt-6">
            <Tombol
              sedangJalan={mengunduhBukti}
              onClick={async () => {
                setMengunduhBukti(true);
                try {
                  const { nama, blob } = await unduhBukti({
                    no_registrasi: sukses.no,
                    tanggal_lahir: isi.tanggal_lahir,
                  });
                  bukaBlob(nama, blob);
                } finally {
                  setMengunduhBukti(false);
                }
              }}
            >
              {mengunduhBukti ? "Menyiapkan..." : "Unduh Bukti Pendaftaran (PDF)"}
            </Tombol>
            <Link
              href={`/ppdb/cek?no=${encodeURIComponent(sukses.no)}`}
              className="rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
            >
              Cek Status Pendaftaran
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-garis px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const terakhir = langkah === LANGKAH.length - 1;

  return (
    <div ref={puncak}>
      {/* Penanda langkah */}
      <ol className="mb-8 grid grid-cols-5 gap-1.5" aria-label="Tahap pengisian">
        {LANGKAH.map((l, i) => {
          const adaGalat = l.kolom.some((k) => galat[k]);
          return (
            <li key={l.judul}>
              <button
                type="button"
                onClick={() => keLangkah(i)}
                aria-current={i === langkah ? "step" : undefined}
                className="w-full text-left"
              >
                <span
                  className={
                    "block h-1.5 rounded-full transition " +
                    (adaGalat
                      ? "bg-red-500"
                      : i <= langkah
                        ? "bg-biru"
                        : "bg-garis")
                  }
                />
                <span
                  className={
                    "mt-2 block text-[11px] font-semibold sm:text-xs " +
                    (adaGalat
                      ? "text-red-600"
                      : i === langkah
                        ? "text-biru"
                        : "text-samar")
                  }
                >
                  {i + 1}. {l.ringkas}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <form onSubmit={kirim} noValidate>
        {ringkasan.length > 0 && (
          <div className="mb-6">
            <RingkasanGalat daftar={ringkasan} />
          </div>
        )}

        <div className="kartu p-6 md:p-8">
          <h2 className="mb-6 border-b border-garis pb-4 text-xl">
            {langkah + 1}. {LANGKAH[langkah].judul}
          </h2>

          {/* key membuat React memasang ulang panelnya tiap ganti langkah,
              sehingga animasi CSS-nya berjalan dari awal lagi. */}
          <div key={langkah} className="gerak-langkah">
              {/* ---------- 1. Jalur & data diri ---------- */}
              {langkah === 0 && (
                <div className="space-y-5">
                  <Pilihan
                    nama="jalur"
                    label="Jalur pendaftaran"
                    wajib
                    nilai={isi.jalur}
                    ubah={ubah("jalur")}
                    opsi={jalur}
                    galat={galat.jalur}
                    bantuan={KETERANGAN_JALUR[isi.jalur] ?? ""}
                  />

                  {jurusan.length > 0 && (
                    <Pilihan
                      nama="jurusan_id"
                      label="Peminatan yang dipilih"
                      wajib
                      nilai={isi.jurusan_id}
                      ubah={ubah("jurusan_id")}
                      opsi={opsiJurusan}
                      galat={galat.jurusan_id}
                    />
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Teks
                      nama="nama_lengkap"
                      label="Nama lengkap"
                      wajib
                      maks={100}
                      nilai={isi.nama_lengkap}
                      ubah={ubah("nama_lengkap")}
                      galat={galat.nama_lengkap}
                      bantuan="Tulis sesuai ijazah atau akta kelahiran."
                    />
                    <Pilihan
                      nama="jenis_kelamin"
                      label="Jenis kelamin"
                      wajib
                      nilai={isi.jenis_kelamin}
                      ubah={ubah("jenis_kelamin")}
                      opsi={JENIS_KELAMIN}
                      galat={galat.jenis_kelamin}
                    />
                    <div>
                      <Teks
                        nama="nisn"
                        label="NISN"
                        wajib
                        maks={10}
                        nilai={isi.nisn}
                        ubah={ubah("nisn")}
                        galat={galat.nisn}
                        contoh="10 angka"
                        bantuan="Nomor Induk Siswa Nasional, 10 angka, tercantum pada rapor atau ijazah SMP/MTs. Tiga angka pertamanya sama dengan tiga angka terakhir tahun lahir."
                      />
                      {!galat.nisn && <PeriksaLangsung kabar={kabarNisn} />}
                    </div>
                    <div>
                      <Teks
                        nama="nik"
                        label="NIK"
                        wajib
                        maks={16}
                        nilai={isi.nik}
                        ubah={ubah("nik")}
                        galat={galat.nik}
                        contoh="16 angka"
                        bantuan="Nomor Induk Kependudukan, 16 angka sesuai Kartu Keluarga."
                      />
                      {!galat.nik && <PeriksaLangsung kabar={kabarNik} />}
                    </div>
                    <Teks
                      nama="tempat_lahir"
                      label="Tempat lahir"
                      wajib
                      maks={80}
                      nilai={isi.tempat_lahir}
                      ubah={ubah("tempat_lahir")}
                      galat={galat.tempat_lahir}
                    />
                    <Teks
                      nama="tanggal_lahir"
                      label="Tanggal lahir"
                      tipe="date"
                      wajib
                      nilai={isi.tanggal_lahir}
                      ubah={ubah("tanggal_lahir")}
                      galat={galat.tanggal_lahir}
                    />
                    <Pilihan
                      nama="agama"
                      label="Agama"
                      wajib
                      nilai={isi.agama}
                      ubah={ubah("agama")}
                      opsi={AGAMA}
                      galat={galat.agama}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Teks
                        nama="anak_ke"
                        label="Anak ke-"
                        tipe="number"
                        nilai={isi.anak_ke}
                        ubah={ubah("anak_ke")}
                        galat={galat.anak_ke}
                      />
                      <Teks
                        nama="jumlah_saudara"
                        label="Jml. saudara"
                        tipe="number"
                        nilai={isi.jumlah_saudara}
                        ubah={ubah("jumlah_saudara")}
                        galat={galat.jumlah_saudara}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- 2. Alamat & kontak ---------- */}
              {langkah === 1 && (
                <div className="space-y-5">
                  <AreaTeks
                    nama="alamat"
                    label="Alamat tempat tinggal"
                    wajib
                    baris={3}
                    maks={1000}
                    nilai={isi.alamat}
                    ubah={ubah("alamat")}
                    galat={galat.alamat}
                    contoh="Nama jalan, nomor rumah, RT/RW"
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Teks
                      nama="kelurahan"
                      label="Kelurahan / Desa"
                      wajib
                      maks={80}
                      nilai={isi.kelurahan}
                      ubah={ubah("kelurahan")}
                      galat={galat.kelurahan}
                    />
                    <Teks
                      nama="kecamatan"
                      label="Kecamatan"
                      wajib
                      maks={80}
                      nilai={isi.kecamatan}
                      ubah={ubah("kecamatan")}
                      galat={galat.kecamatan}
                    />
                    <Teks
                      nama="kota"
                      label="Kabupaten / Kota"
                      wajib
                      maks={80}
                      nilai={isi.kota}
                      ubah={ubah("kota")}
                      galat={galat.kota}
                    />
                    <Teks
                      nama="provinsi"
                      label="Provinsi"
                      wajib
                      maks={80}
                      nilai={isi.provinsi}
                      ubah={ubah("provinsi")}
                      galat={galat.provinsi}
                    />
                    <Teks
                      nama="kode_pos"
                      label="Kode pos"
                      wajib
                      maks={10}
                      nilai={isi.kode_pos}
                      ubah={ubah("kode_pos")}
                      galat={galat.kode_pos}
                    />
                    <Teks
                      nama="no_hp"
                      label="No. HP / WhatsApp"
                      tipe="tel"
                      wajib
                      maks={25}
                      nilai={isi.no_hp}
                      ubah={ubah("no_hp")}
                      galat={galat.no_hp}
                      contoh="0812xxxxxxxx"
                      bantuan="Nomor aktif; dipakai panitia untuk menghubungi Anda."
                    />
                  </div>
                  <Teks
                    nama="email"
                    label="Email"
                    tipe="email"
                    maks={120}
                    nilai={isi.email}
                    ubah={ubah("email")}
                    galat={galat.email}
                    contoh="nama@contoh.com"
                  />
                </div>
              )}

              {/* ---------- 3. Sekolah asal & orang tua ---------- */}
              {langkah === 2 && (
                <div className="space-y-8">
                  <div className="space-y-5">
                    <h3 className="text-base">Sekolah Asal</h3>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Teks
                        nama="asal_sekolah"
                        label="Nama SMP / MTs asal"
                        wajib
                        maks={140}
                        nilai={isi.asal_sekolah}
                        ubah={ubah("asal_sekolah")}
                        galat={galat.asal_sekolah}
                      />
                      <Teks
                        nama="npsn_sekolah"
                        label="NPSN sekolah asal"
                        wajib
                        maks={20}
                        nilai={isi.npsn_sekolah}
                        ubah={ubah("npsn_sekolah")}
                        galat={galat.npsn_sekolah}
                      />
                      <Teks
                        nama="tahun_lulus"
                        label="Tahun lulus"
                        wajib
                        tipe="number"
                        nilai={isi.tahun_lulus}
                        ubah={ubah("tahun_lulus")}
                        galat={galat.tahun_lulus}
                        contoh="2027"
                      />
                      <Teks
                        nama="nilai_rata2"
                        label="Nilai rata-rata rapor"
                        nilai={isi.nilai_rata2}
                        ubah={ubah("nilai_rata2")}
                        galat={galat.nilai_rata2}
                        contoh="85.50"
                        bantuan="Angka 0 sampai 100."
                      />
                    </div>
                    <Teks
                      nama="alamat_sekolah"
                      label="Alamat sekolah asal"
                      wajib
                      maks={200}
                      nilai={isi.alamat_sekolah}
                      ubah={ubah("alamat_sekolah")}
                      galat={galat.alamat_sekolah}
                    />
                  </div>

                  <div className="space-y-5 border-t border-garis pt-7">
                    <h3 className="text-base">Data Orang Tua / Wali</h3>
                    <div className="grid gap-5 sm:grid-cols-3">
                      <Teks
                        nama="nama_ayah"
                        label="Nama ayah"
                        wajib
                        maks={120}
                        nilai={isi.nama_ayah}
                        ubah={ubah("nama_ayah")}
                        galat={galat.nama_ayah}
                      />
                      <Teks
                        nama="pekerjaan_ayah"
                        label="Pekerjaan ayah"
                        maks={80}
                        nilai={isi.pekerjaan_ayah}
                        ubah={ubah("pekerjaan_ayah")}
                        galat={galat.pekerjaan_ayah}
                      />
                      <Pilihan
                        nama="pendidikan_ayah"
                        label="Pendidikan ayah"
                        nilai={isi.pendidikan_ayah}
                        ubah={ubah("pendidikan_ayah")}
                        opsi={PENDIDIKAN}
                        galat={galat.pendidikan_ayah}
                      />
                      <Teks
                        nama="nama_ibu"
                        label="Nama ibu"
                        wajib
                        maks={120}
                        nilai={isi.nama_ibu}
                        ubah={ubah("nama_ibu")}
                        galat={galat.nama_ibu}
                      />
                      <Teks
                        nama="pekerjaan_ibu"
                        label="Pekerjaan ibu"
                        maks={80}
                        nilai={isi.pekerjaan_ibu}
                        ubah={ubah("pekerjaan_ibu")}
                        galat={galat.pekerjaan_ibu}
                      />
                      <Pilihan
                        nama="pendidikan_ibu"
                        label="Pendidikan ibu"
                        nilai={isi.pendidikan_ibu}
                        ubah={ubah("pendidikan_ibu")}
                        opsi={PENDIDIKAN}
                        galat={galat.pendidikan_ibu}
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3">
                      <Pilihan
                        nama="penghasilan"
                        label="Penghasilan orang tua"
                        nilai={isi.penghasilan}
                        ubah={ubah("penghasilan")}
                        opsi={PENGHASILAN}
                        galat={galat.penghasilan}
                      />
                      <Teks
                        nama="no_hp_ortu"
                        label="No. HP orang tua"
                        tipe="tel"
                        maks={25}
                        nilai={isi.no_hp_ortu}
                        ubah={ubah("no_hp_ortu")}
                        galat={galat.no_hp_ortu}
                      />
                      <Teks
                        nama="nama_wali"
                        label="Nama wali"
                        maks={120}
                        nilai={isi.nama_wali}
                        ubah={ubah("nama_wali")}
                        galat={galat.nama_wali}
                        bantuan="Isi bila tidak tinggal bersama orang tua."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- 4. Dokumen ---------- */}
              {langkah === 3 && (
                <div className="space-y-5">
                  <p className="rounded-lg bg-biru-muda px-5 py-4 text-sm leading-relaxed text-biru-tua">
                    Setiap berkas maksimal <strong>2 MB</strong>. Foto berupa
                    JPG atau PNG; dokumen lain boleh JPG, PNG, atau PDF.
                    Pastikan tulisan pada dokumen terbaca jelas agar verifikasi
                    tidak tertunda.
                  </p>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Berkas
                      nama="file_foto"
                      label="Foto 3x4"
                      wajib
                      terima="image/jpeg,image/png"
                      ubah={ubahBerkas("file_foto")}
                      galat={galat.file_foto}
                      bantuan="Latar belakang rapi, wajah terlihat jelas."
                    />
                    <Berkas
                      nama="file_ijazah"
                      label="Ijazah / Surat Keterangan Lulus"
                      wajib
                      ubah={ubahBerkas("file_ijazah")}
                      galat={galat.file_ijazah}
                    />
                    <Berkas
                      nama="file_kk"
                      label="Kartu Keluarga"
                      wajib
                      ubah={ubahBerkas("file_kk")}
                      galat={galat.file_kk}
                    />
                    <Berkas
                      nama="file_akta"
                      label="Akta Kelahiran"
                      wajib
                      ubah={ubahBerkas("file_akta")}
                      galat={galat.file_akta}
                    />
                    <Berkas
                      nama="file_raport"
                      label="Rapor semester terakhir"
                      wajib
                      ubah={ubahBerkas("file_raport")}
                      galat={galat.file_raport}
                    />
                    <Berkas
                      nama="file_prestasi"
                      label="Sertifikat prestasi"
                      ubah={ubahBerkas("file_prestasi")}
                      galat={galat.file_prestasi}
                      bantuan={
                        isi.jalur === "Prestasi"
                          ? "Wajib karena Anda memilih jalur Prestasi."
                          : "Isi bila memiliki sertifikat prestasi."
                      }
                    />
                  </div>
                </div>
              )}

              {/* ---------- 5. Sumber informasi & pernyataan ---------- */}
              {langkah === 4 && (
                <div className="space-y-6">
                  <Pilihan
                    nama="sumber_informasi"
                    label="Dari mana Anda mengetahui sekolah ini?"
                    nilai={isi.sumber_informasi}
                    ubah={ubah("sumber_informasi")}
                    opsi={sumber.map((s) => ({
                      nilai: s,
                      label: LABEL_SUMBER[s] ?? s,
                    }))}
                    galat={galat.sumber_informasi}
                    bantuan="Jawaban Anda membantu sekolah menilai kanal promosi mana yang paling efektif."
                  />
                  <Teks
                    nama="catatan_sumber"
                    label="Keterangan tambahan sumber informasi"
                    maks={160}
                    nilai={isi.catatan_sumber}
                    ubah={ubah("catatan_sumber")}
                    galat={galat.catatan_sumber}
                    contoh="Misalnya nama akun, nama guru, atau lokasi spanduk"
                  />

                  <div className="rounded-lg border border-garis bg-slate-50 px-5 py-5">
                    <Centang
                      nama="pernyataan"
                      nilai={pernyataan}
                      ubah={setPernyataan}
                      galat={galat.pernyataan}
                    >
                      Saya menyatakan seluruh data dan dokumen yang saya kirimkan
                      adalah benar, dan saya bersedia data tersebut diperiksa
                      serta diolah oleh {namaSekolah} untuk keperluan seleksi
                      PPDB Tahun Ajaran {tahunAjaran}.{" "}
                      <span className="text-red-600">*</span>
                    </Centang>
                  </div>

                  <p className="text-sm leading-relaxed text-samar">
                    Setelah dikirim, Anda akan menerima nomor registrasi.
                    Data yang sudah terkirim hanya dapat diubah oleh panitia,
                    jadi periksa kembali isian Anda pada langkah-langkah
                    sebelumnya sebelum menekan tombol kirim.
                  </p>
                </div>
              )}
          </div>

          {/* Navigasi langkah */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-garis pt-6">
            <Tombol
              type="button"
              jenis="kedua"
              disabled={langkah === 0}
              onClick={() => keLangkah(langkah - 1)}
            >
              ← Sebelumnya
            </Tombol>

            <span className="text-sm text-samar tabular-nums">
              Langkah {langkah + 1} dari {LANGKAH.length}
            </span>

            {terakhir ? (
              <Tombol type="submit" sedangJalan={mengirim}>
                {mengirim ? "Mengirim..." : "Kirim Pendaftaran"}
              </Tombol>
            ) : (
              <Tombol type="button" onClick={() => keLangkah(langkah + 1)}>
                Selanjutnya →
              </Tombol>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

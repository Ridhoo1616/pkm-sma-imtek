"use client";

import { useMemo, useState } from "react";
import { urlUnggahan } from "@/lib/api";
import { IkonGuru, IkonSiswa, IkonBersama, IkonFasilitas } from "@/komponen/Ikon";
import type { Tenaga } from "@/lib/tipe";

/**
 * Daftar guru dan tenaga kependidikan beserta angka ringkas dan penyaringnya.
 *
 * Komponen klien karena pencarian dan penyaringnya bekerja tanpa memuat ulang
 * halaman. Seluruh datanya memang dikirim sekaligus: satu sekolah menengah
 * berisi puluhan orang, bukan ribuan, jadi menyaring di peramban jauh lebih
 * ringan daripada bolak-balik ke server.
 *
 * SELURUH ANGKANYA DIHITUNG DARI DATA, tidak satu pun ditulis di berkas ini.
 * Bila sekolah belum mengisi seorang pun, angkanya nol dan halamannya
 * mengatakan demikian — bukan memajang contoh.
 */

/**
 * Berapa kartu yang tampil sebelum tombolnya ditekan.
 *
 * Dua angka karena satu angka tidak bisa benar di dua lebar sekaligus: di
 * layar lebar kartunya berjajar empat, jadi dua belas berarti tiga baris
 * rapi; di ponsel kartunya berjajar dua, dan dua belas berarti enam baris
 * yang membuat halaman ini panjang sekali.
 *
 * Pembedanya CSS, bukan JavaScript. Mengukur lebar layar lalu mengatur
 * ulang jumlahnya sesudah halaman terpasang akan membuat empat kartu
 * berkedip hilang di depan mata pengunjung, karena markup yang dikirim
 * server sudah memuat dua belas. Dengan kelas `max-sm:hidden`, yang dikirim
 * server tetap satu bentuk dan perambanlah yang menyembunyikan kelebihannya
 * sejak lukisan pertama.
 */
const AWAL = 12;
const AWAL_PONSEL = 8;

type Saring = "Semua" | "Pimpinan" | "Pendidik" | "Wali Kelas" | "Kependidikan";

const LABEL: Record<Saring, string> = {
  Semua: "Semua",
  Pimpinan: "Pimpinan",
  Pendidik: "Guru",
  "Wali Kelas": "Wali Kelas",
  Kependidikan: "Tenaga Kependidikan",
};

export default function DaftarTenaga({ daftar }: { daftar: Tenaga[] }) {
  const [saring, setSaring] = useState<Saring>("Semua");
  const [mapel, setMapel] = useState("");
  const [urut, setUrut] = useState<"sekolah" | "nama">("sekolah");
  const [cari, setCari] = useState("");
  const [semua, setSemua] = useState(false);

  const angka = useMemo(() => {
    const pendidik = daftar.filter(
      (t) => t.kategori === "Pimpinan" || t.kategori === "Pendidik",
    ).length;
    return {
      pendidik,
      wali: daftar.filter((t) => t.wali_kelas.trim() !== "").length,
      kependidikan: daftar.filter((t) => t.kategori === "Kependidikan").length,
      total: daftar.length,
    };
  }, [daftar]);

  /** Mata pelajaran yang benar-benar diampu, tanpa kembar, urut abjad. */
  const daftarMapel = useMemo(() => {
    const set = new Set<string>();
    for (const t of daftar) if (t.mata_pelajaran.trim()) set.add(t.mata_pelajaran.trim());
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [daftar]);

  /** Tab hanya ditawarkan untuk kelompok yang memang berisi. Menawarkan tab
   *  yang selalu kosong membuat pengunjung mengira datanya hilang. */
  const tab = useMemo(() => {
    const ada: Saring[] = ["Semua"];
    if (daftar.some((t) => t.kategori === "Pimpinan")) ada.push("Pimpinan");
    if (daftar.some((t) => t.kategori === "Pendidik")) ada.push("Pendidik");
    if (angka.wali > 0) ada.push("Wali Kelas");
    if (angka.kependidikan > 0) ada.push("Kependidikan");
    return ada;
  }, [daftar, angka]);

  const tersaring = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    const hasil = daftar.filter((t) => {
      if (saring === "Wali Kelas" && t.wali_kelas.trim() === "") return false;
      if (saring !== "Semua" && saring !== "Wali Kelas" && t.kategori !== saring)
        return false;
      if (mapel && t.mata_pelajaran.trim() !== mapel) return false;
      if (!kata) return true;
      return [t.nama, t.jabatan, t.mata_pelajaran, t.wali_kelas, t.nip].some((s) =>
        s.toLowerCase().includes(kata),
      );
    });
    if (urut === "nama") {
      hasil.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    }
    return hasil;
  }, [daftar, saring, mapel, urut, cari]);

  // Batas render dipulihkan begitu penyaringnya berubah, supaya hasil saringan
  // baru tidak ikut terpotong oleh tombol yang tadi sudah ditekan.
  const kunci = `${saring}|${mapel}|${cari}|${urut}`;
  const [kunciTerakhir, setKunciTerakhir] = useState(kunci);
  if (kunci !== kunciTerakhir) {
    setKunciTerakhir(kunci);
    setSemua(false);
  }

  const tampil = semua ? tersaring : tersaring.slice(0, AWAL);
  const sisa = tersaring.length - tampil.length;

  return (
    <div className="space-y-8">
      {/* Angka ringkas. Satu warna saja — biru sekolah di atas biru muda —
          karena empat warna berbeda membuat deretan ini terbaca sebagai empat
          hal yang tidak berhubungan, padahal keempatnya satu tabel yang sama.
          Angkanya tebal dan besar supaya terbaca sekali lihat. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Angka ikon={IkonGuru} nilai={angka.pendidik} judul="Tenaga Pendidik"
          keterangan="Pimpinan dan guru" />
        <Angka ikon={IkonSiswa} nilai={angka.wali} judul="Wali Kelas"
          keterangan="Guru pendamping kelas" />
        <Angka ikon={IkonFasilitas} nilai={angka.kependidikan} judul="Tenaga Kependidikan"
          keterangan="Staf dan administrasi" />
        <Angka ikon={IkonBersama} nilai={angka.total} judul="Total SDM"
          keterangan="Seluruh warga sekolah" />
      </div>

      {/* Pencarian dan penyaring. Ada supaya pengunjung yang mencari satu
          nama tidak perlu menggulir seluruh daftarnya — inilah yang menahan
          panjang halaman ini di layar ponsel. */}
      <div className="kartu space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label htmlFor="cari-tenaga" className="sr-only">
              Cari nama, jabatan, atau mata pelajaran
            </label>
            <input
              id="cari-tenaga"
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama, jabatan, atau mata pelajaran..."
              className="w-full rounded-lg border border-garis px-4 py-2.5 text-[15px] outline-none focus:border-biru focus:ring-2 focus:ring-biru/20"
            />
          </div>

          {daftarMapel.length > 1 && (
            <div>
              <label htmlFor="mapel-tenaga" className="sr-only">
                Saring menurut mata pelajaran
              </label>
              <select
                id="mapel-tenaga"
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                className="w-full rounded-lg border border-garis bg-white px-4 py-2.5 text-[15px] outline-none focus:border-biru focus:ring-2 focus:ring-biru/20 sm:w-auto"
              >
                <option value="">Semua mata pelajaran</option>
                {daftarMapel.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="urut-tenaga" className="sr-only">
              Urutan tampil
            </label>
            <select
              id="urut-tenaga"
              value={urut}
              onChange={(e) => setUrut(e.target.value as "sekolah" | "nama")}
              className="w-full rounded-lg border border-garis bg-white px-4 py-2.5 text-[15px] outline-none focus:border-biru focus:ring-2 focus:ring-biru/20 sm:w-auto"
            >
              <option value="sekolah">Urutan sekolah</option>
              <option value="nama">Nama A-Z</option>
            </select>
          </div>
        </div>

        {tab.length > 2 && (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {tab.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSaring(k)}
                  aria-pressed={saring === k}
                  className={
                    "rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition " +
                    (saring === k
                      ? "bg-biru text-white"
                      : "border border-garis text-teks hover:border-biru hover:text-biru")
                  }
                >
                  {LABEL[k]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tersaring.length === 0 ? (
        <div className="kartu p-8 text-center">
          <p className="font-semibold text-teks">Tidak ada yang cocok</p>
          <p className="mt-1.5 text-sm leading-relaxed text-samar">
            Coba kata kunci lain, atau tekan{" "}
            <button
              type="button"
              onClick={() => {
                setCari("");
                setMapel("");
                setSaring("Semua");
              }}
              className="font-semibold text-biru underline underline-offset-2"
            >
              tampilkan semua
            </button>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {tampil.map((t, i) => (
              <KartuOrang
                key={t.id}
                orang={t}
                kelas={!semua && i >= AWAL_PONSEL ? "max-sm:hidden" : ""}
              />
            ))}
          </div>

          {/* Tombolnya perlu ada juga ketika hasilnya antara sembilan sampai
              dua belas orang: di layar lebar semuanya sudah tampil, tetapi
              di ponsel empat yang terakhir masih tersembunyi. */}
          {(sisa > 0 || (!semua && tersaring.length > AWAL_PONSEL)) && (
            // Bila di layar lebar sudah tampil semua, seluruh blok ini
            // disembunyikan di sana — tombol bertuliskan "Tampilkan 0
            // lainnya" jelas keliru.
            <div className={"text-center " + (sisa === 0 ? "sm:hidden" : "")}>
              <button
                type="button"
                onClick={() => setSemua(true)}
                className="rounded-lg border border-garis bg-white px-5 py-2.5 text-sm font-semibold text-biru transition hover:border-biru hover:bg-biru-muda"
              >
                {/* Angkanya hanya disebut di layar lebar. Di ponsel yang
                    tampil lebih sedikit, jadi menyebut angka yang sama di
                    kedua lebar akan keliru pada salah satunya. */}
                <span className="sm:hidden">Tampilkan guru lainnya</span>
                <span className="hidden sm:inline">
                  Tampilkan {sisa} lainnya
                </span>
              </button>
              <p className="mt-2 hidden text-xs text-samar sm:block">
                Menampilkan {tampil.length} dari {tersaring.length} orang
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Angka({
  ikon: Ikon,
  nilai,
  judul,
  keterangan,
}: {
  ikon: (p: { ukuran?: number }) => React.ReactElement;
  nilai: number;
  judul: string;
  keterangan: string;
}) {
  return (
    <div className="kartu flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
      <span
        aria-hidden
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-biru-muda text-biru sm:h-12 sm:w-12"
      >
        <Ikon ukuran={24} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-none font-bold text-biru-tua tabular-nums sm:text-3xl">
          {nilai}
        </p>
        <p className="mt-1.5 text-[13px] leading-snug font-bold text-teks sm:text-sm">
          {judul}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-samar sm:text-xs">
          {keterangan}
        </p>
      </div>
    </div>
  );
}

/**
 * Satu orang. Gerakannya saat kursor diarahkan ke sini sengaja kecil dan
 * hanya tiga hal: kartunya naik sedikit, fotonya membesar di dalam
 * bingkainya sendiri, dan garis emas di bawah namanya tumbuh dari kiri.
 * Aturannya ada di globals.css, bukan di sini, karena hanya berlaku pada
 * peranti yang benar-benar punya kursor, dan berhenti sama sekali bila
 * pengunjung meminta gerakan dikurangi.
 */
function KartuOrang({
  orang: t,
  kelas = "",
}: {
  orang: Tenaga;
  kelas?: string;
}) {
  const inisial = t.nama
    .replace(/,.*$/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <article className={`kartu-orang kartu h-full overflow-hidden ${kelas}`}>
      <div className="overflow-hidden">
        {t.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlUnggahan("profil", t.foto)}
            alt={`Foto ${t.nama}`}
            className="kartu-orang-foto aspect-square w-full bg-biru-muda object-cover sm:aspect-[3/4]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="kartu-orang-foto grid aspect-square w-full place-items-center bg-biru-muda sm:aspect-[3/4]"
            aria-hidden
          >
            <span className="text-2xl font-bold text-biru/45 sm:text-3xl">
              {inisial}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <p className="text-[13px] leading-snug font-bold text-biru-tua sm:text-[15px]">
          {t.nama}
        </p>
        <span
          aria-hidden
          className="kartu-orang-garis mt-1.5 block h-[3px] w-10 rounded-full bg-emas"
        />

        {t.jabatan && (
          <p className="mt-2 text-xs leading-snug font-semibold text-biru sm:text-sm">
            {t.jabatan}
          </p>
        )}
        {t.mata_pelajaran && (
          <p className="mt-0.5 text-xs leading-snug text-samar sm:text-sm">
            {t.mata_pelajaran}
          </p>
        )}

        {t.wali_kelas && (
          <p className="mt-2 inline-flex rounded-md bg-biru-muda px-2 py-0.5 text-[11px] font-bold text-biru">
            Wali Kelas {t.wali_kelas}
          </p>
        )}

        {t.nip && (
          <p className="mt-2 text-[11px] text-samar tabular-nums">NIP {t.nip}</p>
        )}
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { api, unduhCsv, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import {
  angka,
  nilai as formatNilai,
  tanggalJam,
  warnaStatus,
} from "@/lib/format";
import { KepalaPanel, Tabel } from "@/komponen/Panel";
import {
  PesanGalat,
  TanpaData,
  KerangkaTabel,
  Kerangka,
} from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { Tombol } from "@/komponen/Medan";

const PER_HALAMAN = 25;

/**
 * Kepala tabel, dipakai BERSAMA oleh kerangka muat dan tabel sesungguhnya.
 * Satu sumber supaya jumlah kolom keduanya tidak mungkin berbeda.
 *
 * Status ditaruh tepat sesudah nama, bukan di kolom kesembilan: tabelnya
 * punya sebelas kolom dan selalu lebih lebar daripada jendela, jadi kolom
 * mana pun di ujung kanan menuntut penggeseran mendatar lebih dulu. Status
 * justru kolom yang paling sering dilihat panitia.
 */
const KEPALA_TABEL = [
  "No. Registrasi",
  "Nama",
  "Status",
  "L/P",
  "Peminatan",
  "Jalur",
  "Asal Sekolah",
  "Nilai",
  "Sumber Info",
  "Waktu",
  "",
];

export default function HalamanPendaftar() {
  const [saring, setSaring] = useState({
    status: "",
    jalur: "",
    sumber: "",
    tahun_ajaran: "",
    cari: "",
    urut: "terbaru",
    halaman: 1,
  });
  const [mengunduh, setMengunduh] = useState(false);
  const [galatUnduh, setGalatUnduh] = useState("");

  const kueri = kueriDari(saring);
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.daftarPendaftar(kueri),
    [kueri],
  );

  const ubah = (k: keyof typeof saring) => (v: string) =>
    // Setiap perubahan penyaring mengembalikan tampilan ke halaman pertama,
    // kalau tidak pengguna bisa mendarat di halaman yang sudah kosong.
    setSaring((s) => ({ ...s, [k]: v, halaman: 1 }));

  async function unduh() {
    setGalatUnduh("");
    setMengunduh(true);
    try {
      const { nama, blob } = await unduhCsv(kueriDari({ ...saring, halaman: 1 }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nama;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setGalatUnduh(
        e instanceof GalatApi ? e.message : "Berkas CSV gagal diunduh.",
      );
    } finally {
      setMengunduh(false);
    }
  }

  const jumlahHalaman = data
    ? Math.max(Math.ceil(data.total / (data.per_halaman || PER_HALAMAN)), 1)
    : 1;

  return (
    <>
      <KepalaPanel
        judul="Data Pendaftar"
        keterangan="Verifikasi berkas, ubah status, dan unduh rekap pendaftar."
        aksi={
          <Tombol jenis="kedua" onClick={unduh} sedangJalan={mengunduh}>
            {mengunduh ? "Menyiapkan..." : "Unduh CSV"}
          </Tombol>
        }
      />

      {galatUnduh && (
        <div className="mb-5">
          <PesanGalat pesan={galatUnduh} />
        </div>
      )}

      {/* Penyaring */}
      <div className="kartu mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="sm:col-span-2 xl:col-span-2">
            <label
              htmlFor="cari"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Pencarian
            </label>
            <input
              id="cari"
              type="search"
              value={saring.cari}
              onChange={(e) => ubah("cari")(e.target.value)}
              placeholder="Nama, no. registrasi, NISN, asal sekolah"
              className="w-full rounded-lg border border-garis px-3.5 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            />
          </div>

          {(
            [
              { k: "status", label: "Status", opsi: data?.pilihan.status ?? [] },
              { k: "jalur", label: "Jalur", opsi: data?.pilihan.jalur ?? [] },
              {
                k: "sumber",
                label: "Sumber info",
                opsi: data?.pilihan.sumber ?? [],
              },
              {
                k: "tahun_ajaran",
                label: "Tahun ajaran",
                opsi: data?.pilihan.tahun_ajaran ?? [],
              },
            ] as const
          ).map((s) => (
            <div key={s.k}>
              <label
                htmlFor={s.k}
                className="mb-1.5 block text-xs font-semibold text-samar uppercase"
              >
                {s.label}
              </label>
              <select
                id={s.k}
                value={saring[s.k]}
                onChange={(e) => ubah(s.k)(e.target.value)}
                className="w-full rounded-lg border border-garis bg-white px-3 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
              >
                <option value="">Semua</option>
                {s.opsi.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label
              htmlFor="urut"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Urutan
            </label>
            <select
              id="urut"
              value={saring.urut}
              onChange={(e) => ubah("urut")(e.target.value)}
              className="w-full rounded-lg border border-garis bg-white px-3 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="nama">Nama A-Z</option>
              <option value="nilai">Nilai tertinggi</option>
              <option value="no_registrasi">No. registrasi</option>
            </select>
          </div>
        </div>
      </div>

      {memuat ? (
        <>
          {/* Baris "Menampilkan N dari M" di atas tabelnya ikut
              dikerangkakan; tanpa itu tata letaknya masih melompat
              setinggi baris tersebut ketika datanya tiba. */}
          <Kerangka className="mb-4 h-3.5 w-64" />
          <KerangkaTabel kepala={KEPALA_TABEL} baris={8} />
        </>
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Tidak ada pendaftar yang cocok"
          keterangan="Ubah atau bersihkan penyaring di atas untuk melihat data lain."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-samar">
            Menampilkan {data.data.length} dari {angka(data.total)} pendaftar
            {saring.tahun_ajaran
              ? ` tahun ajaran ${saring.tahun_ajaran}`
              : ` tahun ajaran ${data.tahun_ajaran}`}
            .
          </p>

          <Tabel kepala={KEPALA_TABEL}>
            {data.data.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                  <Link
                    href={`/admin/pendaftar/${p.id}`}
                    className="text-biru hover:underline"
                  >
                    {p.no_registrasi}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.nama_lengkap}</td>
                <td className="px-4 py-3">
                  <Lencana jenis={warnaStatus(p.status)}>{p.status}</Lencana>
                </td>
                <td className="px-4 py-3 text-samar">{p.jenis_kelamin}</td>
                <td className="px-4 py-3 text-samar">
                  {p.nama_jurusan || "-"}
                </td>
                <td className="px-4 py-3 text-samar">{p.jalur}</td>
                <td className="px-4 py-3 text-samar">{p.asal_sekolah}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNilai(p.nilai_rata2)}
                </td>
                <td className="px-4 py-3 text-samar">
                  {p.sumber_informasi || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-samar">
                  {tanggalJam(p.dibuat)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/admin/pendaftar/${p.id}`}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Verifikasi
                  </Link>
                </td>
              </tr>
            ))}
          </Tabel>

          {jumlahHalaman > 1 && (
            <nav
              aria-label="Halaman data pendaftar"
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              <Tombol
                jenis="kedua"
                disabled={saring.halaman <= 1}
                onClick={() =>
                  setSaring((s) => ({ ...s, halaman: s.halaman - 1 }))
                }
              >
                Sebelumnya
              </Tombol>
              <span className="px-3 text-sm text-samar tabular-nums">
                Halaman {saring.halaman} dari {jumlahHalaman}
              </span>
              <Tombol
                jenis="kedua"
                disabled={saring.halaman >= jumlahHalaman}
                onClick={() =>
                  setSaring((s) => ({ ...s, halaman: s.halaman + 1 }))
                }
              >
                Berikutnya
              </Tombol>
            </nav>
          )}
        </>
      )}
    </>
  );
}

/** Menyusun bagian kueri URL dari keadaan penyaring. */
function kueriDari(s: {
  status: string;
  jalur: string;
  sumber: string;
  tahun_ajaran: string;
  cari: string;
  urut: string;
  halaman: number;
}): string {
  const u = new URLSearchParams();
  if (s.status) u.set("status", s.status);
  if (s.jalur) u.set("jalur", s.jalur);
  if (s.sumber) u.set("sumber", s.sumber);
  if (s.tahun_ajaran) u.set("tahun_ajaran", s.tahun_ajaran);
  if (s.cari.trim()) u.set("cari", s.cari.trim());
  if (s.urut) u.set("urut", s.urut);
  u.set("halaman", String(s.halaman));
  u.set("per_halaman", String(PER_HALAMAN));
  return `?${u.toString()}`;
}

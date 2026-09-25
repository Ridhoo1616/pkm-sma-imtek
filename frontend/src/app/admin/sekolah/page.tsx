"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { useSesi } from "@/komponen/Sesi";
import { angka } from "@/lib/format";
import { KepalaPanel, KartuAngka, Tabel, Konfirmasi } from "@/komponen/Panel";
import { PesanGalat, TanpaData, KerangkaTabel } from "@/komponen/Memuat";
import { AreaTeks, Centang, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { SekolahRujukan } from "@/lib/tipe";

/**
 * Daftar rujukan sekolah asal.
 *
 * Gunanya menolak sekolah khayalan pada formulir pendaftaran. Alasan daftarnya
 * disimpan sendiri, dan bukan ditanyakan ke API pemerintah, ada di
 * backend/migrations/017_sekolah_referensi.sql: tidak ada API resmi yang boleh
 * dipakai program lain, dan API pihak ketiga yang tidak resmi tidak dapat
 * dijadikan tumpuan sistem penerimaan sekolah.
 *
 * Selama daftar ini kosong, formulir pendaftaran bekerja seperti sebelumnya
 * dan tidak menolak nama sekolah mana pun.
 */
/** Dipakai bersama oleh kerangka muat dan tabel sesungguhnya. */
const KEPALA_TABEL = ["NPSN", "Nama sekolah", "Kecamatan", "Kabupaten", ""];

export default function HalamanSekolahAsal() {
  const kabar = useKabar();
  const { pengguna } = useSesi();
  const [cari, setCari] = useState("");
  const kueri = cari.trim()
    ? `?per_halaman=100&cari=${encodeURIComponent(cari.trim())}`
    : "?per_halaman=100";
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.sekolahAdmin(kueri),
    [kueri],
  );

  const [csv, setCsv] = useState("");
  const [ganti, setGanti] = useState(false);
  const [mengimpor, setMengimpor] = useState(false);
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [dilewati, setDilewati] = useState<string[]>([]);
  const [hapusTarget, setHapusTarget] = useState<SekolahRujukan | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const admin = pengguna?.role === "admin";

  async function impor() {
    setRingkasan([]);
    setDilewati([]);
    setMengimpor(true);
    try {
      const hasil = await api.imporSekolah({ csv, ganti });
      kabar.beri(hasil.pesan);
      setDilewati(hasil.dilewati ?? []);
      setCsv("");
      setGanti(false);
      muatUlang();
    } catch (e) {
      setRingkasan([
        e instanceof GalatApi ? e.message : "Daftar sekolah gagal diimpor.",
      ]);
    } finally {
      setMengimpor(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusSekolah(hapusTarget.npsn);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      setRingkasan([
        e instanceof GalatApi ? e.message : "Sekolah gagal dihapus.",
      ]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Sekolah Asal"
        keterangan="Daftar SMP dan MTs yang boleh dipilih pendaftar. Dipakai formulir pendaftaran untuk menolak nama sekolah yang tidak ada."
      />

      {ringkasan.length > 0 && (
        <div className="mb-5">
          <RingkasanGalat daftar={ringkasan} />
        </div>
      )}

      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KartuAngka
            label="Sekolah dalam daftar"
            nilai={angka(data.semua)}
            warna={data.semua > 0 ? "text-biru-tua" : "text-amber-600"}
          />
          {cari.trim() !== "" && (
            <KartuAngka
              label="Cocok dengan pencarian"
              nilai={angka(data.total)}
            />
          )}
        </div>
      )}

      {data && data.semua === 0 && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          <strong>
            Daftarnya masih kosong, jadi pemeriksaannya belum jalan.
          </strong>{" "}
          Selama kosong, pendaftar dapat mengetik nama sekolah apa pun dan
          formulirnya menerima. Begitu daftar ini terisi, nama yang tidak ada di
          dalamnya tidak lagi diterima kecuali pendaftar menyatakan sekolahnya
          tidak terdaftar, dan pernyataan itu terlihat pada rincian pendaftar.
        </p>
      )}

      {admin && (
        <section className="kartu mb-6 p-6">
          <h2 className="text-base">Impor daftar sekolah</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-samar">
            Tempelkan daftarnya dari Excel atau dari data resmi yang diunduh di{" "}
            <span className="font-semibold text-teks">
              referensi.data.kemdikbud.go.id
            </span>
            . Satu baris satu sekolah, urutan kolomnya: NPSN, nama sekolah,
            bentuk, status, kecamatan, kabupaten, provinsi. Hanya dua kolom
            pertama yang wajib. Pemisahnya boleh titik koma, tab, atau koma.
            Baris kepala tabel dikenali dan dilewati sendiri.
          </p>

          <div className="mt-5">
            <AreaTeks
              nama="csv"
              label="Daftar sekolah"
              baris={8}
              nilai={csv}
              ubah={setCsv}
              contoh={
                "20614321;SMP Negeri 1 Legok;SMP;Negeri;Legok;Kab. Tangerang;Banten\n20614322;SMP Negeri 2 Pagedangan;SMP;Negeri;Pagedangan;Kab. Tangerang;Banten"
              }
            />
          </div>

          <div className="mt-4">
            <Centang nama="ganti" nilai={ganti} ubah={setGanti}>
              Ganti seluruh daftar yang sekarang, bukan menambah
            </Centang>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Tombol
              type="button"
              onClick={impor}
              sedangJalan={mengimpor}
              disabled={csv.trim() === ""}
            >
              Impor Sekarang
            </Tombol>
            <p className="text-xs text-samar">
              NPSN yang sudah ada akan diperbarui, bukan dibuat ganda.
            </p>
          </div>

          {dilewati.length > 0 && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900">
                {dilewati.length} baris dilewati
              </p>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-900">
                {dilewati.slice(0, 30).map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              {dilewati.length > 30 && (
                <p className="mt-2 text-xs text-amber-900">
                  dan {dilewati.length - 30} baris lainnya.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="kartu mb-6 p-5">
        <label
          htmlFor="cari-sekolah"
          className="mb-1.5 block text-xs font-semibold text-samar uppercase"
        >
          Pencarian
        </label>
        <input
          id="cari-sekolah"
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Nama sekolah, NPSN, atau kecamatan"
          className="w-full rounded-lg border border-garis px-3.5 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
        />
      </div>

      {memuat ? (
        <KerangkaTabel kepala={KEPALA_TABEL} baris={8} />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul={
            data && data.semua === 0
              ? "Belum ada sekolah dalam daftar"
              : "Tidak ada sekolah yang cocok"
          }
          keterangan={
            data && data.semua === 0
              ? "Impor daftarnya lebih dulu agar formulir pendaftaran dapat memeriksa sekolah asal."
              : "Coba kata kunci lain."
          }
        />
      ) : (
        <Tabel kepala={KEPALA_TABEL}>
          {data.data.map((s) => (
            <tr key={s.npsn} className="border-t border-garis">
              <td className="px-5 py-3 text-sm font-semibold tabular-nums">
                {s.npsn}
              </td>
              <td className="px-5 py-3 text-sm">
                {s.nama}
                {s.status ? (
                  <span className="ml-2 text-xs text-samar">{s.status}</span>
                ) : null}
              </td>
              <td className="px-5 py-3 text-sm text-samar">
                {s.kecamatan || "-"}
              </td>
              <td className="px-5 py-3 text-sm text-samar">
                {s.kabupaten || "-"}
              </td>
              <td className="px-5 py-3 text-right">
                {admin && (
                  <Tombol jenis="bahaya" onClick={() => setHapusTarget(s)}>
                    Hapus
                  </Tombol>
                )}
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      <Konfirmasi
        terbuka={hapusTarget !== null}
        judul="Hapus sekolah dari daftar?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            <strong>{hapusTarget?.nama}</strong> (NPSN {hapusTarget?.npsn}) akan
            dihapus dari daftar. Pendaftar tidak lagi dapat memilihnya. Data
            pendaftar yang sudah masuk tidak terpengaruh.
          </p>
        }
      />
    </>
  );
}

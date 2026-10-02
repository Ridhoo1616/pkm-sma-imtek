"use client";

import Link from "next/link";
import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Teks, AreaTeks, Pilihan, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { Lencana } from "@/komponen/Bagian";
import { tanggalPanjang } from "@/lib/format";
import type { LowonganBkk } from "@/lib/tipe";

/**
 * Lowongan kerja dari mitra BKK.
 *
 * Lowongan tampil di situs selama statusnya Dibuka, batas lamarannya belum
 * lewat, dan mitranya aktif. Draf hanya terlihat di panel. Lowongan yang
 * sudah punya pelamar tidak dapat dihapus; ubah statusnya menjadi Ditutup.
 */

const KOSONG = {
  mitra_id: "",
  posisi: "",
  jenis: "Penuh Waktu",
  lokasi: "",
  deskripsi: "",
  kualifikasi: "",
  gaji: "",
  kuota: "",
  batas_lamar: "",
  status: "draf",
};

const LABEL_STATUS: Record<string, string> = { draf: "Draf", buka: "Dibuka", tutup: "Ditutup" };

function keadaan(l: LowonganBkk): { teks: string; jenis: "hijau" | "abu" | "merah" | "emas" } {
  if (l.dibuka) return { teks: "Tampil", jenis: "hijau" };
  if (l.status === "draf") return { teks: "Draf", jenis: "abu" };
  if (l.status === "tutup") return { teks: "Ditutup", jenis: "merah" };
  // Status buka tetapi tidak tampil: batasnya lewat atau mitranya nonaktif.
  return { teks: "Kedaluwarsa", jenis: "emas" };
}

export default function HalamanLowonganBkk() {
  const kabar = useKabar();
  const { pengguna } = useSesi();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.lowonganBkkAdmin());
  const mitra = useMuat(() => api.mitraBkkAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<LowonganBkk | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const ubah = (k: keyof typeof KOSONG) => (v: string) => setIsi((s) => ({ ...s, [k]: v }));
  const daftarMitra = mitra.data?.data ?? [];

  function buka(l?: LowonganBkk) {
    setGalatKolom({});
    setRingkasan([]);
    if (l) {
      setUbahId(l.id);
      setIsi({
        mitra_id: String(l.mitra_id),
        posisi: l.posisi,
        jenis: l.jenis,
        lokasi: l.lokasi,
        deskripsi: l.deskripsi,
        kualifikasi: l.kualifikasi,
        gaji: l.gaji,
        kuota: l.kuota === null ? "" : String(l.kuota),
        batas_lamar: l.batas_lamar ?? "",
        status: l.status,
      });
    } else {
      setUbahId(null);
      setIsi(KOSONG);
    }
    setJendela(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);
    const kirim = { ...isi, mitra_id: Number(isi.mitra_id) || 0 };
    try {
      const hasil = ubahId === null ? await api.simpanLowonganBkk(kirim) : await api.ubahLowonganBkk(ubahId, kirim);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Lowongan gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusLowonganBkk(hapusTarget.id);
      kabar.beri(hasil.pesan);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      kabar.beri(e instanceof GalatApi ? e.message : "Lowongan gagal dihapus.", "galat");
    } finally {
      setHapusTarget(null);
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Lowongan Kerja"
        keterangan="Lowongan dari mitra BKK. Yang berstatus Dibuka tampil di situs sampai batas lamarannya lewat; lulusan melamar langsung dari halaman lowongan."
        aksi={
          <Tombol onClick={() => buka()} disabled={daftarMitra.length === 0}>
            Tambah Lowongan
          </Tombol>
        }
      />

      {!mitra.memuat && daftarMitra.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Belum ada mitra. Tambahkan perusahaannya lebih dulu di menu{" "}
          <Link href="/admin/bkk/mitra" className="font-semibold underline">
            Mitra BKK
          </Link>
          .
        </div>
      )}

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData judul="Belum ada lowongan" keterangan="Lowongan yang disimpan sebagai draf belum tampil di situs." />
      ) : (
        <Tabel kepala={["Posisi", "Perusahaan", "Jenis", "Batas lamaran", "Pelamar", "Keadaan", ""]}>
          {data.data.map((l) => {
            const k = keadaan(l);
            return (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{l.posisi}</p>
                  {l.lokasi && <p className="text-xs text-samar">{l.lokasi}</p>}
                </td>
                <td className="px-4 py-3 text-samar">{l.nama_mitra}</td>
                <td className="px-4 py-3 text-samar">{l.jenis}</td>
                <td className="px-4 py-3 text-samar">{l.batas_lamar ? tanggalPanjang(l.batas_lamar) : "Tanpa batas"}</td>
                <td className="px-4 py-3 tabular-nums">
                  <Link href={`/admin/bkk/lamaran?lowongan=${l.id}`} className="font-semibold text-biru hover:underline">
                    {l.jumlah_pelamar} pelamar
                  </Link>
                  {l.diterima > 0 && <span className="ml-1 text-xs text-green-700">({l.diterima} diterima)</span>}
                </td>
                <td className="px-4 py-3">
                  <Lencana jenis={k.jenis}>{k.teks}</Lencana>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => buka(l)}
                      className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                    >
                      Ubah
                    </button>
                    {pengguna?.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => setHapusTarget(l)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Tabel>
      )}

      <Jendela judul={ubahId === null ? "Tambah Lowongan" : "Ubah Lowongan"} terbuka={jendela} tutup={() => setJendela(false)}>
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Pilihan
            nama="mitra_id"
            label="Perusahaan mitra"
            wajib
            nilai={isi.mitra_id}
            ubah={ubah("mitra_id")}
            galat={galatKolom.mitra_id}
            opsi={daftarMitra.map((m) => ({ nilai: String(m.id), label: m.nama + (m.aktif ? "" : " (nonaktif)") }))}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Teks nama="posisi" label="Posisi" wajib maks={160} nilai={isi.posisi} ubah={ubah("posisi")} galat={galatKolom.posisi} contoh="Operator Produksi" />
            <Pilihan nama="jenis" label="Jenis pekerjaan" wajib nilai={isi.jenis} ubah={ubah("jenis")} galat={galatKolom.jenis} opsi={data?.jenis ?? []} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Teks nama="lokasi" label="Lokasi kerja" maks={160} nilai={isi.lokasi} ubah={ubah("lokasi")} galat={galatKolom.lokasi} />
            <Teks nama="gaji" label="Kisaran gaji" maks={100} nilai={isi.gaji} ubah={ubah("gaji")} galat={galatKolom.gaji} bantuan="Kosongkan bila perusahaan tidak mengumumkannya." />
          </div>
          <AreaTeks nama="deskripsi" label="Deskripsi pekerjaan" baris={4} nilai={isi.deskripsi} ubah={ubah("deskripsi")} galat={galatKolom.deskripsi} />
          <AreaTeks
            nama="kualifikasi"
            label="Kualifikasi"
            baris={4}
            nilai={isi.kualifikasi}
            ubah={ubah("kualifikasi")}
            galat={galatKolom.kualifikasi}
            bantuan="Satu baris satu syarat; di situs tampil sebagai daftar."
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <Teks nama="kuota" label="Jumlah dibutuhkan" tipe="number" nilai={isi.kuota} ubah={ubah("kuota")} galat={galatKolom.kuota} />
            <Teks nama="batas_lamar" label="Batas lamaran" tipe="date" nilai={isi.batas_lamar} ubah={ubah("batas_lamar")} galat={galatKolom.batas_lamar} />
            <Pilihan
              nama="status"
              label="Status"
              wajib
              nilai={isi.status}
              ubah={ubah("status")}
              galat={galatKolom.status}
              opsi={(data?.status ?? ["draf", "buka", "tutup"]).map((s) => ({ nilai: s, label: LABEL_STATUS[s] ?? s }))}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-garis pt-5">
            <Tombol jenis="kedua" type="button" onClick={() => setJendela(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" sedangJalan={menyimpan}>
              {menyimpan ? "Menyimpan..." : "Simpan"}
            </Tombol>
          </div>
        </form>
      </Jendela>

      <Konfirmasi
        terbuka={hapusTarget !== null}
        judul="Hapus lowongan?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Lowongan <strong>{hapusTarget?.posisi}</strong> akan dihapus. Lowongan yang sudah punya pelamar tidak dapat
            dihapus; ubah statusnya menjadi Ditutup.
          </p>
        }
      />
    </>
  );
}

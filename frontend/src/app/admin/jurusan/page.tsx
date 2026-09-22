"use client";

import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { angka, persen } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { Teks, AreaTeks, Centang, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { Jurusan } from "@/lib/tipe";

const KOSONG = {
  kode: "",
  nama: "",
  deskripsi: "",
  kuota: 0,
  ikon: "",
  aktif: true,
  urutan: 0,
};

export default function HalamanJurusan() {
  return (
    <KerangkaAdmin>
      <IsiJurusan />
    </KerangkaAdmin>
  );
}

function IsiJurusan() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.jurusanAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Jurusan | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  function buka(j?: Jurusan) {
    setGalatKolom({});
    setRingkasan([]);
    if (j) {
      setUbahId(j.id);
      setIsi({
        kode: j.kode,
        nama: j.nama,
        deskripsi: j.deskripsi,
        kuota: j.kuota,
        ikon: j.ikon,
        aktif: j.aktif,
        urutan: j.urutan,
      });
    } else {
      setUbahId(null);
      // Peminatan baru diletakkan di urutan terakhir.
      setIsi({ ...KOSONG, urutan: (data?.data.length ?? 0) + 1 });
    }
    setJendela(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);
    try {
      const hasil =
        ubahId === null
          ? await api.simpanJurusan(isi)
          : await api.ubahJurusan(ubahId, isi);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      // Halaman publik disegarkan agar perubahannya langsung terlihat.
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Data gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setGalatHapus("");
    setMenghapus(true);
    try {
      const hasil = await api.hapusJurusan(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setGalatHapus(
        e instanceof GalatApi ? e.message : "Peminatan gagal dihapus.",
      );
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Peminatan"
        keterangan="Pilihan peminatan yang muncul pada formulir pendaftaran beserta kuotanya. Peminatan yang dinonaktifkan tidak lagi tampil di formulir, tetapi riwayat pendaftarnya tetap utuh."
        aksi={<Tombol onClick={() => buka()}>Tambah Peminatan</Tombol>}
      />


      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada peminatan"
          keterangan="Selama belum ada peminatan aktif, kolom peminatan otomatis tidak muncul di formulir pendaftaran."
        />
      ) : (
        <Tabel
          kepala={["Urut", "Kode", "Nama", "Kuota", "Pendaftar", "Keterisian", "Keadaan", ""]}
        >
          {data.data.map((j) => (
            <tr key={j.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{j.urutan}</td>
              <td className="px-4 py-3 font-semibold">{j.kode}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{j.nama}</p>
                {j.deskripsi && (
                  <p className="mt-0.5 max-w-md text-xs text-samar">{j.deskripsi}</p>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{angka(j.kuota)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {angka(j.pendaftar)}
              </td>
              <td className="w-40 px-4 py-3">
                <div className="h-2 overflow-hidden rounded-full bg-biru-muda">
                  <div
                    className="h-full rounded-full bg-biru"
                    style={{
                      width: `${Math.min(persen(j.pendaftar, j.kuota), 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-samar tabular-nums">
                  {persen(j.pendaftar, j.kuota)}%
                </p>
              </td>
              <td className="px-4 py-3">
                <Lencana
                  warna={
                    j.aktif
                      ? "border-green-200 bg-green-100 text-green-800"
                      : "border-slate-200 bg-slate-100 text-slate-600"
                  }
                >
                  {j.aktif ? "Aktif" : "Nonaktif"}
                </Lencana>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(j)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGalatHapus("");
                      setHapusTarget(j);
                    }}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      {/* Jendela isian */}
      <Jendela
        judul={ubahId === null ? "Tambah Peminatan" : "Ubah Peminatan"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="kode"
              label="Kode"
              wajib
              maks={20}
              nilai={isi.kode}
              ubah={(v) => setIsi((s) => ({ ...s, kode: v.toUpperCase() }))}
              galat={galatKolom.kode}
              contoh="MIPA"
              bantuan="Singkatan yang tampil sebagai lencana."
            />
            <Teks
              nama="nama"
              label="Nama peminatan"
              wajib
              maks={100}
              nilai={isi.nama}
              ubah={(v) => setIsi((s) => ({ ...s, nama: v }))}
              galat={galatKolom.nama}
              contoh="Peminatan MIPA"
            />
          </div>

          <AreaTeks
            nama="deskripsi"
            label="Deskripsi"
            baris={3}
            nilai={isi.deskripsi}
            ubah={(v) => setIsi((s) => ({ ...s, deskripsi: v }))}
            galat={galatKolom.deskripsi}
            bantuan="Tampil di beranda dan halaman informasi PPDB."
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <Teks
              nama="kuota"
              label="Kuota"
              tipe="number"
              nilai={String(isi.kuota)}
              ubah={(v) => setIsi((s) => ({ ...s, kuota: Number(v) || 0 }))}
              galat={galatKolom.kuota}
            />
            <Teks
              nama="urutan"
              label="Urutan tampil"
              tipe="number"
              nilai={String(isi.urutan)}
              ubah={(v) => setIsi((s) => ({ ...s, urutan: Number(v) || 0 }))}
              galat={galatKolom.urutan}
            />
            <Teks
              nama="ikon"
              label="Nama ikon"
              maks={50}
              nilai={isi.ikon}
              ubah={(v) => setIsi((s) => ({ ...s, ikon: v }))}
              galat={galatKolom.ikon}
              contoh="bi-flask"
            />
          </div>

          <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
            <Centang
              nama="aktif"
              nilai={isi.aktif}
              ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
            >
              Tampilkan peminatan ini sebagai pilihan pada formulir pendaftaran.
            </Centang>
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
        judul="Hapus peminatan?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <div className="space-y-3">
            <p>
              Peminatan <strong>{hapusTarget?.nama}</strong> akan dihapus.
            </p>
            {hapusTarget && hapusTarget.pendaftar > 0 && (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900">
                Peminatan ini sudah dipilih {angka(hapusTarget.pendaftar)}{" "}
                pendaftar, sehingga kemungkinan besar tidak dapat dihapus.
                Nonaktifkan saja agar tidak muncul lagi di formulir.
              </p>
            )}
            {galatHapus && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-red-800">
                {galatHapus}
              </p>
            )}
          </div>
        }
      />
    </>
  );
}

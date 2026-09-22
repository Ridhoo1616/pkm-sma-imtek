"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import {
  Teks,
  AreaTeks,
  Berkas,
  Centang,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { Fasilitas } from "@/lib/tipe";

const KOSONG = { nama: "", deskripsi: "", ikon: "", urutan: 0 };

export default function HalamanFasilitasAdmin() {
  return (
    <KerangkaAdmin>
      <IsiFasilitas />
    </KerangkaAdmin>
  );
}

function IsiFasilitas() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.fasilitas());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [gambar, setGambar] = useState<File | null>(null);
  const [gambarLama, setGambarLama] = useState("");
  const [hapusGambar, setHapusGambar] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Fasilitas | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(f?: Fasilitas) {
    setGalatKolom({});
    setRingkasan([]);
    setGambar(null);
    setHapusGambar(false);
    if (f) {
      setUbahId(f.id);
      setGambarLama(f.gambar);
      setIsi({
        nama: f.nama,
        deskripsi: f.deskripsi,
        ikon: f.ikon,
        urutan: f.urutan,
      });
    } else {
      setUbahId(null);
      setGambarLama("");
      setIsi({ ...KOSONG, urutan: (data?.data.length ?? 0) + 1 });
    }
    setJendela(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);

    const fd = new FormData();
    fd.append("nama", isi.nama);
    fd.append("deskripsi", isi.deskripsi);
    fd.append("ikon", isi.ikon);
    fd.append("urutan", String(isi.urutan));
    if (gambar) fd.append("gambar", gambar);
    if (hapusGambar) fd.append("hapus_gambar", "1");

    try {
      const hasil =
        ubahId === null
          ? await api.simpanFasilitas(fd)
          : await api.ubahFasilitas(ubahId, fd);
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
        setRingkasan(["Fasilitas gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusFasilitas(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([
        e instanceof GalatApi ? e.message : "Fasilitas gagal dihapus.",
      ]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Fasilitas"
        keterangan="Sarana sekolah yang tampil di beranda dan halaman Fasilitas. Urutan menentukan posisi tampilnya."
        aksi={<Tombol onClick={() => buka()}>Tambah Fasilitas</Tombol>}
      />


      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada fasilitas"
          keterangan="Tambahkan fasilitas agar bagian ini muncul di beranda."
        />
      ) : (
        <Tabel kepala={["Urut", "Gambar", "Nama", "Deskripsi", "Ikon", ""]}>
          {data.data.map((f) => (
            <tr key={f.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{f.urutan}</td>
              <td className="px-4 py-3">
                {f.gambar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlUnggahan("fasilitas", f.gambar)}
                    alt=""
                    className="h-12 w-20 rounded object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-20 place-items-center rounded bg-biru-muda text-[10px] text-biru/60">
                    tanpa gambar
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-medium">{f.nama}</td>
              <td className="max-w-md px-4 py-3 text-samar">{f.deskripsi || "-"}</td>
              <td className="px-4 py-3 text-xs text-samar">{f.ikon || "-"}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(f)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setHapusTarget(f)}
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

      <Jendela
        judul={ubahId === null ? "Tambah Fasilitas" : "Ubah Fasilitas"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="nama"
            label="Nama fasilitas"
            wajib
            maks={120}
            nilai={isi.nama}
            ubah={(v) => setIsi((s) => ({ ...s, nama: v }))}
            galat={galatKolom.nama}
            contoh="Laboratorium Komputer"
          />

          <AreaTeks
            nama="deskripsi"
            label="Deskripsi"
            baris={3}
            nilai={isi.deskripsi}
            ubah={(v) => setIsi((s) => ({ ...s, deskripsi: v }))}
            galat={galatKolom.deskripsi}
          />

          <div className="grid gap-5 sm:grid-cols-2">
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
              contoh="bi-pc-display"
            />
          </div>

          <Berkas
            nama="gambar"
            label="Gambar fasilitas"
            terima="image/jpeg,image/png"
            ubah={setGambar}
            galat={galatKolom.gambar}
            namaTerpilih={gambarLama || undefined}
            bantuan="JPG atau PNG, maksimal 2 MB."
          />

          {gambarLama && !gambar && (
            <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="hapus_gambar" nilai={hapusGambar} ubah={setHapusGambar}>
                Hapus gambar yang sekarang.
              </Centang>
            </div>
          )}

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
        judul="Hapus fasilitas?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Fasilitas <strong>{hapusTarget?.nama}</strong> beserta gambarnya akan
            dihapus dan tidak dapat dipulihkan.
          </p>
        }
      />
    </>
  );
}

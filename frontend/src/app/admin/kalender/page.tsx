"use client";

import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { tanggalPanjang } from "@/lib/format";
import { useKabar } from "@/komponen/Kabar";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import {
  Teks,
  AreaTeks,
  Centang,
  Pilihan,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { Agenda } from "@/lib/tipe";

/**
 * Kalender akademik.
 *
 * Satu baris boleh berupa satu hari atau satu rentang, karena kegiatan
 * sekolah bercampur keduanya: upacara satu hari, ujian satu minggu. Tanggal
 * selesai dikosongkan berarti kegiatan satu hari.
 */

const KOSONG = {
  judul: "",
  mulai: "",
  selesai: "",
  kategori: "Kegiatan",
  keterangan: "",
  aktif: true,
};

export default function HalamanKalenderAdmin() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.agendaAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Agenda | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(a?: Agenda) {
    setGalatKolom({});
    setRingkasan([]);
    if (a) {
      setUbahId(a.id);
      setIsi({
        judul: a.judul,
        mulai: a.mulai,
        selesai: a.selesai,
        kategori: a.kategori,
        keterangan: a.keterangan,
        aktif: a.aktif,
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
    try {
      const hasil =
        ubahId === null
          ? await api.simpanAgenda(isi)
          : await api.ubahAgenda(ubahId, isi);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Agenda gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusAgenda(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([e instanceof GalatApi ? e.message : "Agenda gagal dihapus."]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Kalender Akademik"
        keterangan="Tanggal kegiatan, ujian, hari libur, dan jadwal PPDB yang tampil di halaman Kalender Akademik."
        aksi={<Tombol onClick={() => buka()}>Tambah Agenda</Tombol>}
      />

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Kalender masih kosong"
          keterangan="Tanggalnya hanya boleh berasal dari keputusan sekolah, jadi biarkan kosong sampai kalendernya terbit."
        />
      ) : (
        <Tabel kepala={["Mulai", "Selesai", "Kegiatan", "Kategori", "Tampil", ""]}>
          {data.data.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                {tanggalPanjang(a.mulai)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-samar tabular-nums">
                {a.selesai ? tanggalPanjang(a.selesai) : "satu hari"}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{a.judul}</p>
                {a.keterangan && (
                  <p className="mt-0.5 max-w-md text-xs text-samar">{a.keterangan}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-biru-muda px-2.5 py-0.5 text-xs font-semibold text-biru">
                  {a.kategori}
                </span>
              </td>
              <td className="px-4 py-3">
                {a.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Tidak</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(a)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setHapusTarget(a)}
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
        judul={ubahId === null ? "Tambah Agenda" : "Ubah Agenda"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="judul"
            label="Nama kegiatan"
            wajib
            maks={180}
            nilai={isi.judul}
            ubah={(v) => setIsi((s) => ({ ...s, judul: v }))}
            galat={galatKolom.judul}
            contoh="Penilaian Tengah Semester Ganjil"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="mulai"
              label="Tanggal mulai"
              tipe="date"
              wajib
              nilai={isi.mulai}
              ubah={(v) => setIsi((s) => ({ ...s, mulai: v }))}
              galat={galatKolom.mulai}
            />
            <Teks
              nama="selesai"
              label="Tanggal selesai"
              tipe="date"
              nilai={isi.selesai}
              ubah={(v) => setIsi((s) => ({ ...s, selesai: v }))}
              galat={galatKolom.selesai}
              bantuan="Kosongkan bila kegiatannya hanya satu hari."
            />
          </div>

          <Pilihan
            nama="kategori"
            label="Kategori"
            nilai={isi.kategori}
            ubah={(v) => setIsi((s) => ({ ...s, kategori: v }))}
            opsi={data?.kategori ?? []}
            galat={galatKolom.kategori}
            bantuan="Kategori menentukan warna lencananya di halaman kalender."
          />

          <AreaTeks
            nama="keterangan"
            label="Keterangan"
            baris={3}
            nilai={isi.keterangan}
            ubah={(v) => setIsi((s) => ({ ...s, keterangan: v }))}
            galat={galatKolom.keterangan}
            bantuan="Tidak wajib. Misalnya kelas yang terlibat atau tempat kegiatannya."
          />

          <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
            <Centang
              nama="aktif"
              nilai={isi.aktif}
              ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
            >
              Tampilkan di kalender publik.
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
        judul="Hapus agenda?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Agenda <strong>{hapusTarget?.judul}</strong> akan dihapus dari
            kalender akademik.
          </p>
        }
      />
    </>
  );
}

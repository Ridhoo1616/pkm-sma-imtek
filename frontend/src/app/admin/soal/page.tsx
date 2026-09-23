"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import {
  Teks,
  AreaTeks,
  Centang,
  Pilihan,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { Soal } from "@/lib/tipe";

const KOSONG = {
  mata_pelajaran: "",
  pertanyaan: "",
  pilihan_a: "",
  pilihan_b: "",
  pilihan_c: "",
  pilihan_d: "",
  pilihan_e: "",
  jawaban: "A",
  pembahasan: "",
  aktif: true,
};

const HURUF = ["A", "B", "C", "D", "E"];

export default function HalamanSoal() {
  return (
    <KerangkaAdmin>
      <IsiSoal />
    </KerangkaAdmin>
  );
}

function IsiSoal() {
  const kabar = useKabar();
  const [saring, setSaring] = useState("");
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.soal(saring ? `?mata_pelajaran=${encodeURIComponent(saring)}` : ""),
    [saring],
  );

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Soal | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  function buka(s?: Soal) {
    setGalatKolom({});
    setRingkasan([]);
    if (s) {
      setUbahId(s.id);
      setIsi({
        mata_pelajaran: s.mata_pelajaran,
        pertanyaan: s.pertanyaan,
        pilihan_a: s.pilihan_a,
        pilihan_b: s.pilihan_b,
        pilihan_c: s.pilihan_c,
        pilihan_d: s.pilihan_d,
        pilihan_e: s.pilihan_e,
        jawaban: s.jawaban,
        pembahasan: s.pembahasan,
        aktif: s.aktif,
      });
    } else {
      setUbahId(null);
      // Mata pelajaran yang sedang disaring diisikan lebih dulu, karena soal
      // biasanya ditambahkan berkelompok per mata pelajaran.
      setIsi({ ...KOSONG, mata_pelajaran: saring });
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
        ubahId === null ? await api.simpanSoal(isi) : await api.ubahSoal(ubahId, isi);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Soal gagal disimpan."]);
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
      const hasil = await api.hapusSoal(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      setGalatHapus(e instanceof GalatApi ? e.message : "Soal gagal dihapus.");
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Bank Soal"
        keterangan="Soal pilihan ganda untuk tes seleksi. Soal yang diambil tiap peserta dipilih dari yang berkeadaan aktif, dan susunannya diacak per peserta."
        aksi={<Tombol onClick={() => buka()}>Tambah Soal</Tombol>}
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-xs flex-1">
          <Pilihan
            nama="saring_mapel"
            label="Saring mata pelajaran"
            nilai={saring}
            ubah={setSaring}
            opsi={data?.mata_pelajaran ?? []}
            kosong="Semua mata pelajaran"
          />
        </div>
        <p className="pb-2.5 text-sm text-samar">
          <strong className="text-teks tabular-nums">{data?.jumlah_aktif ?? 0}</strong>{" "}
          soal aktif siap dipakai
        </p>
      </div>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Bank soal masih kosong"
          keterangan="Paket ujian tidak dapat dibuka sebelum jumlah soal aktifnya mencukupi."
        />
      ) : (
        <Tabel kepala={["Mata pelajaran", "Pertanyaan", "Kunci", "Keadaan", ""]}>
          {data.data.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 whitespace-nowrap text-samar">
                {s.mata_pelajaran}
              </td>
              <td className="px-4 py-3">
                <p className="max-w-lg font-medium">{s.pertanyaan}</p>
                <p className="mt-0.5 max-w-lg text-xs text-samar">
                  A. {s.pilihan_a} · B. {s.pilihan_b}
                  {s.pilihan_c && ` · C. ${s.pilihan_c}`}
                  {s.pilihan_d && ` · D. ${s.pilihan_d}`}
                  {s.pilihan_e && ` · E. ${s.pilihan_e}`}
                </p>
              </td>
              <td className="px-4 py-3 text-center font-bold text-biru">{s.jawaban}</td>
              <td className="px-4 py-3">
                <Lencana
                  jenis={
                    s.aktif
                      ? "hijau"
                      : "abu"
                  }
                >
                  {s.aktif ? "Aktif" : "Nonaktif"}
                </Lencana>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => buka(s)}
                  className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => setHapusTarget(s)}
                  className="ml-2 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      <Jendela
        terbuka={jendela}
        tutup={() => setJendela(false)}
        judul={ubahId === null ? "Tambah Soal" : "Ubah Soal"}
        lebar="max-w-3xl"
      >
        <form onSubmit={simpan} className="space-y-5">
          {ringkasan.length > 0 && <RingkasanGalat daftar={ringkasan} />}

          <Teks
            nama="mata_pelajaran"
            label="Mata pelajaran"
            wajib
            maks={60}
            nilai={isi.mata_pelajaran}
            ubah={(v) => setIsi((s) => ({ ...s, mata_pelajaran: v }))}
            galat={galatKolom.mata_pelajaran}
            contoh="Matematika"
          />

          <AreaTeks
            nama="pertanyaan"
            label="Pertanyaan"
            wajib
            baris={4}
            nilai={isi.pertanyaan}
            ubah={(v) => setIsi((s) => ({ ...s, pertanyaan: v }))}
            galat={galatKolom.pertanyaan}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Teks
              nama="pilihan_a"
              label="Pilihan A"
              wajib
              nilai={isi.pilihan_a}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_a: v }))}
              galat={galatKolom.pilihan_a}
            />
            <Teks
              nama="pilihan_b"
              label="Pilihan B"
              wajib
              nilai={isi.pilihan_b}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_b: v }))}
              galat={galatKolom.pilihan_b}
            />
            <Teks
              nama="pilihan_c"
              label="Pilihan C"
              nilai={isi.pilihan_c}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_c: v }))}
              bantuan="Kosongkan bila soal ini hanya dua pilihan."
            />
            <Teks
              nama="pilihan_d"
              label="Pilihan D"
              nilai={isi.pilihan_d}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_d: v }))}
            />
            <Teks
              nama="pilihan_e"
              label="Pilihan E"
              nilai={isi.pilihan_e}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_e: v }))}
            />
            <Pilihan
              nama="jawaban"
              label="Kunci jawaban"
              wajib
              nilai={isi.jawaban}
              ubah={(v) => setIsi((s) => ({ ...s, jawaban: v }))}
              opsi={HURUF}
              kosong="-- Pilih kunci --"
              galat={galatKolom.jawaban}
              bantuan="Harus menunjuk pilihan yang terisi."
            />
          </div>

          <AreaTeks
            nama="pembahasan"
            label="Pembahasan"
            baris={3}
            nilai={isi.pembahasan}
            ubah={(v) => setIsi((s) => ({ ...s, pembahasan: v }))}
            bantuan="Catatan untuk panitia. Tidak pernah ditampilkan kepada peserta."
          />

          <Centang
            nama="aktif"
            nilai={isi.aktif}
            ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
          >
            Aktif, boleh terpilih untuk tes seleksi
          </Centang>

          <div className="flex justify-end gap-3 border-t border-garis pt-5">
            <Tombol type="button" jenis="kedua" onClick={() => setJendela(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" sedangJalan={menyimpan}>
              Simpan
            </Tombol>
          </div>
        </form>
      </Jendela>

      <Konfirmasi
        terbuka={hapusTarget !== null}
        tutup={() => setHapusTarget(null)}
        judul="Hapus soal"
        pesan={
          <>
            Soal ini akan dihapus dari bank soal. Soal yang sudah pernah dipakai
            pada sesi ujian tidak dapat dihapus, hanya dinonaktifkan.
            {galatHapus && (
              <span className="mt-3 block text-sm text-red-700">{galatHapus}</span>
            )}
          </>
        }
        sedangJalan={menghapus}
        lanjut={hapus}
      />
    </>
  );
}

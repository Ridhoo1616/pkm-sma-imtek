"use client";

import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
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
import type { Faq } from "@/lib/tipe";

const KOSONG = {
  pertanyaan: "",
  jawaban: "",
  kategori: "Umum",
  sorot: false,
  urutan: 0,
  aktif: true,
};

export default function HalamanFaqAdmin() {
  return (
    <KerangkaAdmin>
      <IsiFaq />
    </KerangkaAdmin>
  );
}

function IsiFaq() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.faqAdmin());
  const [saring, setSaring] = useState("");

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Faq | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  function buka(f?: Faq) {
    setGalatKolom({});
    setRingkasan([]);
    if (f) {
      setUbahId(f.id);
      setIsi({
        pertanyaan: f.pertanyaan,
        jawaban: f.jawaban,
        kategori: f.kategori,
        sorot: f.sorot,
        urutan: f.urutan,
        aktif: f.aktif,
      });
    } else {
      setUbahId(null);
      setIsi({
        ...KOSONG,
        kategori: saring || "Umum",
        urutan: (data?.data.length ?? 0) + 1,
      });
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
        ubahId === null ? await api.simpanFaq(isi) : await api.ubahFaq(ubahId, isi);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Pertanyaan gagal disimpan."]);
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
      const hasil = await api.hapusFaq(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setGalatHapus(
        e instanceof GalatApi ? e.message : "Pertanyaan gagal dihapus.",
      );
    } finally {
      setMenghapus(false);
    }
  }

  const tersaring = saring
    ? (data?.data ?? []).filter((f) => f.kategori === saring)
    : (data?.data ?? []);
  const jumlahSorot = (data?.data ?? []).filter((f) => f.sorot && f.aktif).length;

  return (
    <>
      <KepalaPanel
        judul="Tanya Jawab"
        keterangan="Pertanyaan yang tampil di halaman Tanya Jawab. Yang ditandai sorot muncul lebih dulu di bagian Sering Ditanyakan, jadi pakailah untuk yang paling banyak ditanyakan orang tua."
        aksi={<Tombol onClick={() => buka()}>Tambah Pertanyaan</Tombol>}
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-xs flex-1">
          <Pilihan
            nama="saring_kategori"
            label="Saring kategori"
            nilai={saring}
            ubah={setSaring}
            opsi={data?.kategori ?? []}
            kosong="Semua kategori"
          />
        </div>
        <p className="pb-2.5 text-sm text-samar">
          <strong className="text-teks tabular-nums">{jumlahSorot}</strong>{" "}
          pertanyaan disorot di halaman publik
        </p>
      </div>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : tersaring.length === 0 ? (
        <TanpaData
          judul="Belum ada pertanyaan"
          keterangan="Selama daftar ini kosong, menu Tanya Jawab pada situs publik tidak menampilkan apa pun."
        />
      ) : (
        <Tabel kepala={["Urut", "Pertanyaan", "Kategori", "Sorot", "Keadaan", ""]}>
          {tersaring.map((f) => (
            <tr key={f.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{f.urutan}</td>
              <td className="px-4 py-3">
                <p className="max-w-lg font-medium">{f.pertanyaan}</p>
                <p className="mt-0.5 line-clamp-2 max-w-lg text-xs text-samar">
                  {f.jawaban}
                </p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-samar">{f.kategori}</td>
              <td className="px-4 py-3">
                {f.sorot && (
                  <Lencana jenis="emas">
                    Disorot
                  </Lencana>
                )}
              </td>
              <td className="px-4 py-3">
                <Lencana
                  jenis={
                    f.aktif
                      ? "hijau"
                      : "abu"
                  }
                >
                  {f.aktif ? "Tampil" : "Disembunyikan"}
                </Lencana>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => buka(f)}
                  className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => setHapusTarget(f)}
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
        judul={ubahId === null ? "Tambah Pertanyaan" : "Ubah Pertanyaan"}
        lebar="max-w-2xl"
      >
        <form onSubmit={simpan} className="space-y-5">
          {ringkasan.length > 0 && <RingkasanGalat daftar={ringkasan} />}

          <Teks
            nama="pertanyaan"
            label="Pertanyaan"
            wajib
            maks={300}
            nilai={isi.pertanyaan}
            ubah={(v) => setIsi((s) => ({ ...s, pertanyaan: v }))}
            galat={galatKolom.pertanyaan}
            contoh="Berapa biaya daftar ulang?"
          />

          <AreaTeks
            nama="jawaban"
            label="Jawaban"
            wajib
            baris={6}
            maks={4000}
            nilai={isi.jawaban}
            ubah={(v) => setIsi((s) => ({ ...s, jawaban: v }))}
            galat={galatKolom.jawaban}
            bantuan="Tulis apa adanya. Bila angkanya belum ditetapkan sekolah, arahkan pembaca ke bagian yang datanya memang diisi sekolah, jangan menuliskan angka perkiraan."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="kategori"
              label="Kategori"
              wajib
              nilai={isi.kategori}
              ubah={(v) => setIsi((s) => ({ ...s, kategori: v }))}
              opsi={data?.kategori ?? []}
              kosong="-- Pilih kategori --"
              galat={galatKolom.kategori}
            />
            <Teks
              nama="urutan"
              label="Urutan tampil"
              tipe="number"
              nilai={String(isi.urutan)}
              ubah={(v) => setIsi((s) => ({ ...s, urutan: Number(v) || 0 }))}
              galat={galatKolom.urutan}
            />
          </div>

          <Centang
            nama="sorot"
            nilai={isi.sorot}
            ubah={(v) => setIsi((s) => ({ ...s, sorot: v }))}
          >
            Sorot sebagai pertanyaan yang sering ditanyakan
          </Centang>
          <Centang
            nama="aktif"
            nilai={isi.aktif}
            ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
          >
            Tampilkan di halaman Tanya Jawab
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
        judul="Hapus pertanyaan"
        pesan={
          <>
            Pertanyaan ini akan dihapus dari halaman Tanya Jawab. Bila hanya
            ingin menyembunyikannya sementara, hilangkan tanda centang
            &ldquo;Tampilkan&rdquo; saja.
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

"use client";

import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { rupiah } from "@/lib/format";
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
import type { Biaya } from "@/lib/tipe";

const KOSONG = {
  nama: "",
  jumlah: 0,
  satuan: "sekali bayar",
  tahap: "Pendaftaran",
  keterangan: "",
  wajib: true,
  urutan: 0,
  aktif: true,
};

export default function HalamanBiaya() {
  return (
    <KerangkaAdmin>
      <IsiBiaya />
    </KerangkaAdmin>
  );
}

function IsiBiaya() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.biayaAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Biaya | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  function buka(b?: Biaya) {
    setGalatKolom({});
    setRingkasan([]);
    if (b) {
      setUbahId(b.id);
      setIsi({
        nama: b.nama,
        jumlah: b.jumlah,
        satuan: b.satuan,
        tahap: b.tahap,
        keterangan: b.keterangan,
        wajib: b.wajib,
        urutan: b.urutan,
        aktif: b.aktif,
      });
    } else {
      setUbahId(null);
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
          ? await api.simpanBiaya(isi)
          : await api.ubahBiaya(ubahId, isi);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Pos biaya gagal disimpan."]);
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
      const hasil = await api.hapusBiaya(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setGalatHapus(
        e instanceof GalatApi ? e.message : "Pos biaya gagal dihapus.",
      );
    } finally {
      setMenghapus(false);
    }
  }

  const belumDitetapkan = data?.data.filter((b) => b.aktif && !b.ditetapkan).length ?? 0;

  return (
    <>
      <KepalaPanel
        judul="Rincian Biaya"
        keterangan="Setiap pos biaya beserta jumlahnya, yang tampil apa adanya di halaman Info PPDB. Totalnya dihitung sistem, jadi angka yang dibaca orang tua tidak pernah berbeda dari jumlah pos-posnya."
        aksi={<Tombol onClick={() => buka()}>Tambah Pos Biaya</Tombol>}
      />

      {belumDitetapkan > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          Ada {belumDitetapkan} pos biaya aktif yang jumlahnya masih nol. Di
          halaman publik, pos itu ditandai &ldquo;belum ditetapkan&rdquo; dan
          totalnya tidak ditampilkan, supaya orang tua tidak salah membaca
          Rp0 sebagai gratis.
        </div>
      )}

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada pos biaya"
          keterangan="Selama daftar ini kosong, bagian Rincian Biaya tidak muncul di halaman Info PPDB."
        />
      ) : (
        <Tabel kepala={["Urut", "Pos biaya", "Tahap", "Jumlah", "Sifat", "Keadaan", ""]}>
          {data.data.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{b.urutan}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{b.nama}</p>
                {b.keterangan && (
                  <p className="mt-0.5 max-w-md text-xs text-samar">{b.keterangan}</p>
                )}
              </td>
              <td className="px-4 py-3 text-samar">{b.tahap}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {b.ditetapkan ? (
                  <>
                    <span className="font-semibold tabular-nums">{rupiah(b.jumlah)}</span>
                    <span className="block text-xs text-samar">{b.satuan}</span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-amber-700">
                    Belum ditetapkan
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-samar">
                {b.wajib ? "Wajib" : "Opsional"}
              </td>
              <td className="px-4 py-3">
                <Lencana
                  jenis={
                    b.aktif
                      ? "hijau"
                      : "abu"
                  }
                >
                  {b.aktif ? "Tampil" : "Disembunyikan"}
                </Lencana>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => buka(b)}
                  className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => setHapusTarget(b)}
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
        judul={ubahId === null ? "Tambah Pos Biaya" : "Ubah Pos Biaya"}
      >
        <form onSubmit={simpan} className="space-y-5">
          {ringkasan.length > 0 && <RingkasanGalat daftar={ringkasan} />}

          <Teks
            nama="nama"
            label="Nama pos biaya"
            wajib
            maks={120}
            nilai={isi.nama}
            ubah={(v) => setIsi((s) => ({ ...s, nama: v }))}
            galat={galatKolom.nama}
            contoh="Formulir pendaftaran"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="jumlah"
              label="Jumlah (rupiah)"
              tipe="number"
              nilai={String(isi.jumlah)}
              ubah={(v) => setIsi((s) => ({ ...s, jumlah: Number(v) || 0 }))}
              galat={galatKolom.jumlah}
              contoh="150000"
            />
            <Teks
              nama="satuan"
              label="Satuan"
              maks={40}
              nilai={isi.satuan}
              ubah={(v) => setIsi((s) => ({ ...s, satuan: v }))}
              galat={galatKolom.satuan}
              contoh="sekali bayar"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="tahap"
              label="Tahap pembayaran"
              nilai={isi.tahap}
              ubah={(v) => setIsi((s) => ({ ...s, tahap: v }))}
              opsi={data?.tahapan ?? []}
              kosong="-- Pilih tahap --"
              galat={galatKolom.tahap}
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

          <AreaTeks
            nama="keterangan"
            label="Keterangan"
            baris={3}
            nilai={isi.keterangan}
            ubah={(v) => setIsi((s) => ({ ...s, keterangan: v }))}
            galat={galatKolom.keterangan}
            contoh="Dibayar saat mengambil formulir di sekolah."
          />

          <Centang
            nama="wajib"
            nilai={isi.wajib}
            ubah={(v) => setIsi((s) => ({ ...s, wajib: v }))}
          >
            Wajib dibayar semua pendaftar
          </Centang>
          <Centang
            nama="aktif"
            nilai={isi.aktif}
            ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
          >
            Tampilkan di halaman Info PPDB
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
        judul="Hapus pos biaya"
        pesan={
          <>
            Pos <strong>{hapusTarget?.nama ?? ""}</strong> akan dihapus dari
            rincian biaya.
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

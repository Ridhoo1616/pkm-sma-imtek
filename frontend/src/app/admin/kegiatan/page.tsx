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
  Pilihan,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { KegiatanSiswa } from "@/lib/tipe";

const KOSONG = {
  nama: "",
  jenis: "Ekstrakurikuler",
  deskripsi: "",
  pembina: "",
  jadwal: "",
  urutan: 0,
  aktif: true,
};

export default function HalamanKegiatanAdmin() {
  return (
    <KerangkaAdmin>
      <IsiKegiatan />
    </KerangkaAdmin>
  );
}

function IsiKegiatan() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.kegiatanAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [gambar, setGambar] = useState<File | null>(null);
  const [gambarLama, setGambarLama] = useState("");
  const [hapusGambar, setHapusGambar] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<KegiatanSiswa | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(k?: KegiatanSiswa) {
    setGalatKolom({});
    setRingkasan([]);
    setGambar(null);
    setHapusGambar(false);
    if (k) {
      setUbahId(k.id);
      setGambarLama(k.gambar);
      setIsi({
        nama: k.nama,
        jenis: k.jenis,
        deskripsi: k.deskripsi,
        pembina: k.pembina,
        jadwal: k.jadwal,
        urutan: k.urutan,
        aktif: k.aktif,
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
    fd.append("jenis", isi.jenis);
    fd.append("deskripsi", isi.deskripsi);
    fd.append("pembina", isi.pembina);
    fd.append("jadwal", isi.jadwal);
    fd.append("urutan", String(isi.urutan));
    fd.append("aktif", isi.aktif ? "1" : "0");
    if (gambar) fd.append("gambar", gambar);
    if (hapusGambar) fd.append("hapus_gambar", "1");

    try {
      const hasil =
        ubahId === null
          ? await api.simpanKegiatan(fd)
          : await api.ubahKegiatan(ubahId, fd);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Kegiatan gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusKegiatan(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([
        e instanceof GalatApi ? e.message : "Kegiatan gagal dihapus.",
      ]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Kegiatan Siswa"
        keterangan="Ekstrakurikuler, kegiatan OSIS, dan pembinaan yang tampil di halaman Kesiswaan."
        aksi={<Tombol onClick={() => buka()}>Tambah Kegiatan</Tombol>}
      />

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada kegiatan"
          keterangan="Tambahkan kegiatan beserta nama pembina dan jadwal latihannya sesuai data sekolah."
        />
      ) : (
        <Tabel
          kepala={["Urut", "Gambar", "Nama", "Jenis", "Pembina", "Jadwal", "Tampil", ""]}
        >
          {data.data.map((k) => (
            <tr key={k.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{k.urutan}</td>
              <td className="px-4 py-3">
                {k.gambar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlUnggahan("kegiatan", k.gambar)}
                    alt=""
                    className="h-12 w-20 rounded object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-20 place-items-center rounded bg-biru-muda text-[10px] text-biru/60">
                    tanpa gambar
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{k.nama}</p>
                {k.deskripsi && (
                  <p className="mt-0.5 max-w-sm text-xs text-samar">{k.deskripsi}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-biru-muda px-2.5 py-0.5 text-xs font-semibold text-biru">
                  {k.jenis}
                </span>
              </td>
              <td className="px-4 py-3 text-samar">{k.pembina || "-"}</td>
              <td className="px-4 py-3 text-samar">{k.jadwal || "-"}</td>
              <td className="px-4 py-3">
                {k.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Tidak</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(k)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setHapusTarget(k)}
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
        judul={ubahId === null ? "Tambah Kegiatan" : "Ubah Kegiatan"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="nama"
            label="Nama kegiatan"
            wajib
            maks={120}
            nilai={isi.nama}
            ubah={(v) => setIsi((s) => ({ ...s, nama: v }))}
            galat={galatKolom.nama}
            contoh="Pramuka"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="jenis"
              label="Jenis kegiatan"
              nilai={isi.jenis}
              ubah={(v) => setIsi((s) => ({ ...s, jenis: v }))}
              opsi={data?.jenis ?? []}
              galat={galatKolom.jenis}
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
            nama="deskripsi"
            label="Deskripsi"
            baris={4}
            nilai={isi.deskripsi}
            ubah={(v) => setIsi((s) => ({ ...s, deskripsi: v }))}
            galat={galatKolom.deskripsi}
            bantuan="Apa yang dikerjakan di kegiatan ini, dan siapa yang dapat mengikutinya."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="pembina"
              label="Pembina"
              maks={120}
              nilai={isi.pembina}
              ubah={(v) => setIsi((s) => ({ ...s, pembina: v }))}
              galat={galatKolom.pembina}
            />
            <Teks
              nama="jadwal"
              label="Jadwal"
              maks={160}
              nilai={isi.jadwal}
              ubah={(v) => setIsi((s) => ({ ...s, jadwal: v }))}
              galat={galatKolom.jadwal}
              contoh="Jumat, 14.00 - 16.00"
            />
          </div>

          <Berkas
            nama="gambar"
            label="Gambar kegiatan"
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

          <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
            <Centang
              nama="aktif"
              nilai={isi.aktif}
              ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
            >
              Tampilkan di situs publik.
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
        judul="Hapus kegiatan?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Kegiatan <strong>{hapusTarget?.nama}</strong> beserta gambarnya akan
            dihapus dan tidak dapat dipulihkan.
          </p>
        }
      />
    </>
  );
}

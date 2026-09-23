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
  Berkas,
  Centang,
  Pilihan,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { Tenaga } from "@/lib/tipe";

/**
 * Data guru dan tenaga kependidikan.
 *
 * Kategori Pimpinan dipakai dua kali: pada halaman Tenaga Pendidik dan pada
 * halaman Struktur Organisasi. Jadi cukup diisi sekali di sini.
 */

const KOSONG = {
  nama: "",
  nip: "",
  jabatan: "",
  mata_pelajaran: "",
  kategori: "Pendidik",
  urutan: 0,
  aktif: true,
};

export default function HalamanTenagaAdmin() {
  return (
    <KerangkaAdmin>
      <IsiTenaga />
    </KerangkaAdmin>
  );
}

function IsiTenaga() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.tenagaAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoLama, setFotoLama] = useState("");
  const [hapusFoto, setHapusFoto] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Tenaga | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(t?: Tenaga) {
    setGalatKolom({});
    setRingkasan([]);
    setFoto(null);
    setHapusFoto(false);
    if (t) {
      setUbahId(t.id);
      setFotoLama(t.foto);
      setIsi({
        nama: t.nama,
        nip: t.nip,
        jabatan: t.jabatan,
        mata_pelajaran: t.mata_pelajaran,
        kategori: t.kategori,
        urutan: t.urutan,
        aktif: t.aktif,
      });
    } else {
      setUbahId(null);
      setFotoLama("");
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
    fd.append("nip", isi.nip);
    fd.append("jabatan", isi.jabatan);
    fd.append("mata_pelajaran", isi.mata_pelajaran);
    fd.append("kategori", isi.kategori);
    fd.append("urutan", String(isi.urutan));
    fd.append("aktif", isi.aktif ? "1" : "0");
    if (foto) fd.append("foto", foto);
    if (hapusFoto) fd.append("hapus_foto", "1");

    try {
      const hasil =
        ubahId === null
          ? await api.simpanTenaga(fd)
          : await api.ubahTenaga(ubahId, fd);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
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
    setMenghapus(true);
    try {
      const hasil = await api.hapusTenaga(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([e instanceof GalatApi ? e.message : "Data gagal dihapus."]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Tenaga Pendidik dan Kependidikan"
        keterangan="Guru dan tenaga kependidikan yang tampil di halaman Profil Sekolah. Yang berkategori Pimpinan juga tampil pada halaman Struktur Organisasi."
        aksi={<Tombol onClick={() => buka()}>Tambah Data</Tombol>}
      />

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada data tenaga pendidik"
          keterangan="Isi nama, jabatan, dan mata pelajaran sesuai data sekolah. Data ini tampil dengan nama orang, jadi jangan diisi contoh."
        />
      ) : (
        <Tabel
          kepala={["Urut", "Foto", "Nama", "Jabatan", "Mata pelajaran", "Kategori", "Tampil", ""]}
        >
          {data.data.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{t.urutan}</td>
              <td className="px-4 py-3">
                {t.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlUnggahan("profil", t.foto)}
                    alt=""
                    className="h-14 w-11 rounded object-cover"
                  />
                ) : (
                  <span className="grid h-14 w-11 place-items-center rounded bg-biru-muda text-[10px] text-biru/60">
                    tanpa
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{t.nama}</p>
                {t.nip && (
                  <p className="mt-0.5 text-xs text-samar tabular-nums">NIP {t.nip}</p>
                )}
              </td>
              <td className="px-4 py-3 text-samar">{t.jabatan || "-"}</td>
              <td className="px-4 py-3 text-samar">{t.mata_pelajaran || "-"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-biru-muda px-2.5 py-0.5 text-xs font-semibold text-biru">
                  {t.kategori}
                </span>
              </td>
              <td className="px-4 py-3">
                {t.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Tidak</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(t)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setHapusTarget(t)}
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
        judul={ubahId === null ? "Tambah Data" : "Ubah Data"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="nama"
            label="Nama lengkap"
            wajib
            maks={120}
            nilai={isi.nama}
            ubah={(v) => setIsi((s) => ({ ...s, nama: v }))}
            galat={galatKolom.nama}
            bantuan="Sertakan gelar bila ingin ditampilkan, misalnya Nurhayati, S.Kom., M.Kom."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="kategori"
              label="Kategori"
              nilai={isi.kategori}
              ubah={(v) => setIsi((s) => ({ ...s, kategori: v }))}
              opsi={data?.kategori ?? ["Pimpinan", "Pendidik", "Kependidikan"]}
              galat={galatKolom.kategori}
            />
            <Teks
              nama="nip"
              label="NIP"
              maks={30}
              nilai={isi.nip}
              ubah={(v) => setIsi((s) => ({ ...s, nip: v }))}
              galat={galatKolom.nip}
              bantuan="Kosongkan bila yang bersangkutan belum memiliki NIP."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="jabatan"
              label="Jabatan"
              maks={120}
              nilai={isi.jabatan}
              ubah={(v) => setIsi((s) => ({ ...s, jabatan: v }))}
              galat={galatKolom.jabatan}
              contoh="Wakil Kepala Sekolah Bidang Kurikulum"
            />
            <Teks
              nama="mata_pelajaran"
              label="Mata pelajaran"
              maks={120}
              nilai={isi.mata_pelajaran}
              ubah={(v) => setIsi((s) => ({ ...s, mata_pelajaran: v }))}
              galat={galatKolom.mata_pelajaran}
              contoh="Matematika"
            />
          </div>

          <Teks
            nama="urutan"
            label="Urutan tampil"
            tipe="number"
            nilai={String(isi.urutan)}
            ubah={(v) => setIsi((s) => ({ ...s, urutan: Number(v) || 0 }))}
            galat={galatKolom.urutan}
            bantuan="Angka kecil tampil lebih dahulu di dalam kategorinya."
          />

          <Berkas
            nama="foto"
            label="Foto"
            terima="image/jpeg,image/png"
            ubah={setFoto}
            galat={galatKolom.foto}
            namaTerpilih={fotoLama || undefined}
            bantuan="Potret perbandingan sisi 3:4, JPG atau PNG, maksimal 2 MB. Tanpa foto, kartunya memakai inisial nama."
          />

          {fotoLama && !foto && (
            <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="hapus_foto" nilai={hapusFoto} ubah={setHapusFoto}>
                Hapus foto yang sekarang.
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
        judul="Hapus data ini?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Data <strong>{hapusTarget?.nama}</strong> beserta fotonya akan
            dihapus dan tidak dapat dipulihkan.
          </p>
        }
      />
    </>
  );
}

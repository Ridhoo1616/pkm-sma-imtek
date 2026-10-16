"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Teks, AreaTeks, Berkas, Centang, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { AlumniBkk } from "@/lib/tipe";
import { BATAS_UNGGAH } from "@/lib/unggah";

/**
 * Profil alumni yang sudah bekerja lewat BKK.
 *
 * Tampil di halaman BKK sebagai bukti hasil penyaluran. Tidak ada isi bawaan:
 * halaman publik menyembunyikan bagian ini selama belum ada alumni aktif.
 * Isinya data pribadi, jadi hanya diisi dengan izin alumni yang bersangkutan.
 */

const KOSONG = {
  nama: "",
  angkatan: "",
  jabatan: "",
  perusahaan: "",
  kisah: "",
  urutan: "0",
  aktif: true,
};

export default function HalamanAlumniBkk() {
  const kabar = useKabar();
  const { pengguna } = useSesi();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.alumniBkkAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoLama, setFotoLama] = useState("");
  const [hapusFoto, setHapusFoto] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<AlumniBkk | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const ubah = (k: keyof typeof KOSONG) => (v: string) => setIsi((s) => ({ ...s, [k]: v }));

  function buka(al?: AlumniBkk) {
    setGalatKolom({});
    setRingkasan([]);
    setFoto(null);
    setHapusFoto(false);
    if (al) {
      setUbahId(al.id);
      setFotoLama(al.foto);
      setIsi({
        nama: al.nama,
        angkatan: al.angkatan,
        jabatan: al.jabatan,
        perusahaan: al.perusahaan,
        kisah: al.kisah,
        urutan: String(al.urutan),
        aktif: al.aktif,
      });
    } else {
      setUbahId(null);
      setFotoLama("");
      setIsi(KOSONG);
    }
    setJendela(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);

    const fd = new FormData();
    for (const [k, v] of Object.entries(isi)) {
      fd.append(k, typeof v === "boolean" ? (v ? "1" : "0") : v);
    }
    if (foto) fd.append("foto", foto);
    if (hapusFoto) fd.append("hapus_foto", "1");

    try {
      const hasil = ubahId === null ? await api.simpanAlumniBkk(fd) : await api.ubahAlumniBkk(ubahId, fd);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Alumni gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusAlumniBkk(hapusTarget.id);
      kabar.beri(hasil.pesan);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      kabar.beri(e instanceof GalatApi ? e.message : "Alumni gagal dihapus.", "galat");
    } finally {
      setHapusTarget(null);
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Alumni BKK"
        keterangan="Profil singkat alumni yang sudah bekerja lewat penyaluran BKK. Tampil di halaman BKK selama aktif."
        aksi={<Tombol onClick={() => buka()}>Tambah Alumni</Tombol>}
      />

      <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
        Nama, foto, dan tempat kerja alumni adalah data pribadi. Tampilkan hanya setelah alumni yang bersangkutan setuju,
        dan tulis apa adanya — jangan menambah jabatan atau cerita yang tidak mereka sampaikan.
      </p>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada alumni"
          keterangan="Tambahkan alumni yang sudah bekerja. Selama kosong, bagian alumni tidak tampil di halaman BKK."
        />
      ) : (
        <Tabel kepala={["Alumni", "Tempat bekerja", "Angkatan", "Urutan", "Tampil", ""]}>
          {data.data.map((al) => (
            <tr key={al.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-garis bg-white text-xs font-bold text-biru">
                    {al.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlUnggahan("bkk-alumni", al.foto)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      al.nama.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <p className="font-medium">{al.nama}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                <p>{al.jabatan}</p>
                <p className="text-xs text-samar">{al.perusahaan}</p>
              </td>
              <td className="px-4 py-3 text-samar tabular-nums">{al.angkatan || "-"}</td>
              <td className="px-4 py-3 text-samar tabular-nums">{al.urutan}</td>
              <td className="px-4 py-3">
                {al.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Disembunyikan</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(al)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  {pengguna?.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => setHapusTarget(al)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      <Jendela judul={ubahId === null ? "Tambah Alumni" : "Ubah Alumni"} terbuka={jendela} tutup={() => setJendela(false)}>
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Teks nama="nama" label="Nama alumni" wajib maks={120} nilai={isi.nama} ubah={ubah("nama")} galat={galatKolom.nama} />
            </div>
            <Teks nama="angkatan" label="Lulus tahun" maks={9} nilai={isi.angkatan} ubah={ubah("angkatan")} galat={galatKolom.angkatan} contoh="2022" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Teks nama="jabatan" label="Posisi / jabatan" wajib maks={120} nilai={isi.jabatan} ubah={ubah("jabatan")} galat={galatKolom.jabatan} />
            <Teks nama="perusahaan" label="Tempat bekerja" wajib maks={160} nilai={isi.perusahaan} ubah={ubah("perusahaan")} galat={galatKolom.perusahaan} />
          </div>
          <AreaTeks
            nama="kisah"
            label="Profil singkat"
            baris={4}
            maks={1500}
            nilai={isi.kisah}
            ubah={ubah("kisah")}
            galat={galatKolom.kisah}
            bantuan="Beberapa kalimat tentang perjalanan kerjanya, sesuai yang disampaikan alumni."
          />

          <Berkas
            nama="foto"
            label="Foto alumni"
            terima="image/jpeg,image/png"
            ubah={setFoto}
            galat={galatKolom.foto}
            namaTerpilih={fotoLama || undefined}
            bantuan={`JPG atau PNG, maksimal ${BATAS_UNGGAH}. Opsional.`}
          />
          {fotoLama && !foto && (
            <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="hapus_foto" nilai={hapusFoto} ubah={setHapusFoto}>
                Hapus foto yang sekarang.
              </Centang>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="urutan"
              label="Urutan tampil"
              tipe="number"
              nilai={isi.urutan}
              ubah={ubah("urutan")}
              galat={galatKolom.urutan}
              bantuan="Angka kecil tampil lebih dulu."
            />
            <div className="self-end rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="aktif" nilai={isi.aktif} ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}>
                Tampil di halaman BKK.
              </Centang>
            </div>
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
        judul="Hapus alumni?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Profil <strong>{hapusTarget?.nama}</strong> akan dihapus beserta fotonya. Untuk menyembunyikan sementara,
            cukup matikan &ldquo;Tampil di halaman BKK&rdquo;.
          </p>
        }
      />
    </>
  );
}

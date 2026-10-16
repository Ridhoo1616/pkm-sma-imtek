"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Teks, AreaTeks, Pilihan, Berkas, Centang, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { Penghargaan } from "@/lib/tipe";
import { BATAS_UNGGAH } from "@/lib/unggah";

/**
 * Penghargaan sekolah: prestasi sekolah, OSIS, dan kegiatan di sekolah.
 * Tampil di menu Profil Sekolah > Penghargaan. Tidak ada isi bawaan; hanya
 * yang benar-benar diterima sekolah yang boleh dicatat di sini.
 */

const KOSONG = {
  judul: "",
  kategori: "Prestasi Sekolah",
  tingkat: "",
  tahun: "",
  keterangan: "",
  urutan: "0",
  aktif: true,
};

export default function HalamanPenghargaan() {
  const kabar = useKabar();
  const { pengguna } = useSesi();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.penghargaanAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoLama, setFotoLama] = useState("");
  const [hapusFoto, setHapusFoto] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Penghargaan | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const ubah = (k: keyof typeof KOSONG) => (v: string) => setIsi((s) => ({ ...s, [k]: v }));

  function buka(p?: Penghargaan) {
    setGalatKolom({});
    setRingkasan([]);
    setFoto(null);
    setHapusFoto(false);
    if (p) {
      setUbahId(p.id);
      setFotoLama(p.foto);
      setIsi({
        judul: p.judul,
        kategori: p.kategori,
        tingkat: p.tingkat,
        tahun: p.tahun,
        keterangan: p.keterangan,
        urutan: String(p.urutan),
        aktif: p.aktif,
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
      const hasil = ubahId === null ? await api.simpanPenghargaan(fd) : await api.ubahPenghargaan(ubahId, fd);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Penghargaan gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusPenghargaan(hapusTarget.id);
      kabar.beri(hasil.pesan);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      kabar.beri(e instanceof GalatApi ? e.message : "Penghargaan gagal dihapus.", "galat");
    } finally {
      setHapusTarget(null);
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Penghargaan"
        keterangan="Prestasi sekolah, OSIS, dan kegiatan di sekolah. Tampil di menu Profil Sekolah > Penghargaan."
        aksi={<Tombol onClick={() => buka()}>Tambah Penghargaan</Tombol>}
      />

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada penghargaan"
          keterangan="Tambahkan penghargaan yang benar-benar diterima sekolah. Selama kosong, halaman Penghargaan menyatakan belum ada yang dimuat."
        />
      ) : (
        <Tabel kepala={["Penghargaan", "Kategori", "Tingkat / tahun", "Tampil", ""]}>
          {data.data.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-garis bg-slate-50 text-xs font-bold text-biru">
                    {p.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlUnggahan("penghargaan", p.foto)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "-"
                    )}
                  </span>
                  <p className="font-medium">{p.judul}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{p.kategori}</td>
              <td className="px-4 py-3 text-sm text-samar">{[p.tingkat, p.tahun].filter(Boolean).join(" · ") || "-"}</td>
              <td className="px-4 py-3">
                {p.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Disembunyikan</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(p)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  {pengguna?.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => setHapusTarget(p)}
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

      <Jendela judul={ubahId === null ? "Tambah Penghargaan" : "Ubah Penghargaan"} terbuka={jendela} tutup={() => setJendela(false)}>
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks nama="judul" label="Nama penghargaan" wajib maks={200} nilai={isi.judul} ubah={ubah("judul")} galat={galatKolom.judul} />
          <div className="grid gap-5 sm:grid-cols-3">
            <Pilihan
              nama="kategori"
              label="Kategori"
              wajib
              nilai={isi.kategori}
              ubah={ubah("kategori")}
              opsi={data?.kategori ?? ["Prestasi Sekolah", "OSIS", "Kegiatan Sekolah"]}
              galat={galatKolom.kategori}
            />
            <Teks nama="tingkat" label="Tingkat" maks={60} nilai={isi.tingkat} ubah={ubah("tingkat")} galat={galatKolom.tingkat} contoh="Kecamatan, Kabupaten, ..." />
            <Teks nama="tahun" label="Tahun" maks={9} nilai={isi.tahun} ubah={ubah("tahun")} galat={galatKolom.tahun} contoh="2026" />
          </div>
          <AreaTeks
            nama="keterangan"
            label="Keterangan"
            baris={4}
            maks={2000}
            nilai={isi.keterangan}
            ubah={ubah("keterangan")}
            galat={galatKolom.keterangan}
            bantuan="Penyelenggara, peringkat, atau cerita singkatnya. Tulis apa adanya."
          />

          <Berkas
            nama="foto"
            label="Foto"
            terima="image/jpeg,image/png"
            ubah={setFoto}
            galat={galatKolom.foto}
            namaTerpilih={fotoLama || undefined}
            bantuan={`Foto piala, piagam, atau kegiatan. JPG atau PNG, maksimal ${BATAS_UNGGAH}. Opsional.`}
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
              bantuan="Tahun terbaru tampil lebih dulu; angka ini mengatur yang setahun."
            />
            <div className="self-end rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="aktif" nilai={isi.aktif} ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}>
                Tampil di halaman Penghargaan.
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
        judul="Hapus penghargaan?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Penghargaan <strong>{hapusTarget?.judul}</strong> akan dihapus beserta fotonya. Untuk menyembunyikan sementara,
            cukup matikan &ldquo;Tampil di halaman Penghargaan&rdquo;.
          </p>
        }
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
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
import type { Pustaka } from "@/lib/tipe";

/**
 * Katalog perpustakaan digital.
 *
 * Satu koleksi harus dapat dibuka, entah lewat berkas yang diunggah sekolah
 * atau lewat tautan ke layanan lain. Tanpa salah satunya, barisnya hanya
 * menjadi judul yang tidak bisa diapa-apakan siswa, jadi backend menolaknya.
 */

const KOSONG = {
  judul: "",
  penulis: "",
  kategori: "Umum",
  tahun: "",
  keterangan: "",
  tautan: "",
  urutan: 0,
  aktif: true,
};

export default function HalamanPustakaAdmin() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.pustakaAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [berkasLama, setBerkasLama] = useState("");
  const [hapusBerkas, setHapusBerkas] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Pustaka | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(p?: Pustaka) {
    setGalatKolom({});
    setRingkasan([]);
    setBerkas(null);
    setHapusBerkas(false);
    if (p) {
      setUbahId(p.id);
      setBerkasLama(p.berkas);
      setIsi({
        judul: p.judul,
        penulis: p.penulis,
        kategori: p.kategori,
        tahun: p.tahun === null ? "" : String(p.tahun),
        keterangan: p.keterangan,
        tautan: p.tautan,
        urutan: p.urutan,
        aktif: p.aktif,
      });
    } else {
      setUbahId(null);
      setBerkasLama("");
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
    fd.append("judul", isi.judul);
    fd.append("penulis", isi.penulis);
    fd.append("kategori", isi.kategori);
    fd.append("tahun", isi.tahun);
    fd.append("keterangan", isi.keterangan);
    fd.append("tautan", isi.tautan);
    fd.append("urutan", String(isi.urutan));
    fd.append("aktif", isi.aktif ? "1" : "0");
    if (berkas) fd.append("berkas", berkas);
    if (hapusBerkas) fd.append("hapus_berkas", "1");

    try {
      const hasil =
        ubahId === null
          ? await api.simpanPustaka(fd)
          : await api.ubahPustaka(ubahId, fd);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Koleksi gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusPustaka(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([e instanceof GalatApi ? e.message : "Koleksi gagal dihapus."]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Perpustakaan Digital"
        keterangan="Katalog koleksi yang tampil di halaman Perpustakaan Digital. Setiap koleksi perlu tautan atau berkas agar dapat dibuka siswa."
        aksi={<Tombol onClick={() => buka()}>Tambah Koleksi</Tombol>}
      />

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Katalog masih kosong"
          keterangan="Koleksi yang sudah ada di Google Drive atau portal lain cukup dicatat tautannya, tidak perlu diunggah ulang."
        />
      ) : (
        <Tabel
          kepala={["Urut", "Judul", "Penulis", "Kategori", "Tahun", "Sumber", "Tampil", ""]}
        >
          {data.data.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{p.urutan}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{p.judul}</p>
                {p.keterangan && (
                  <p className="mt-0.5 max-w-sm text-xs text-samar">{p.keterangan}</p>
                )}
              </td>
              <td className="px-4 py-3 text-samar">{p.penulis || "-"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-biru-muda px-2.5 py-0.5 text-xs font-semibold text-biru">
                  {p.kategori}
                </span>
              </td>
              <td className="px-4 py-3 text-samar tabular-nums">{p.tahun ?? "-"}</td>
              <td className="px-4 py-3">
                {p.berkas ? (
                  <a
                    href={urlUnggahan("pustaka", p.berkas)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-biru hover:underline"
                  >
                    Berkas unggahan
                  </a>
                ) : (
                  <a
                    href={p.tautan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-biru hover:underline"
                  >
                    Tautan luar
                  </a>
                )}
              </td>
              <td className="px-4 py-3">
                {p.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Tidak</span>
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
                  <button
                    type="button"
                    onClick={() => setHapusTarget(p)}
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
        judul={ubahId === null ? "Tambah Koleksi" : "Ubah Koleksi"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="judul"
            label="Judul koleksi"
            wajib
            maks={200}
            nilai={isi.judul}
            ubah={(v) => setIsi((s) => ({ ...s, judul: v }))}
            galat={galatKolom.judul}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="penulis"
              label="Penulis"
              maks={160}
              nilai={isi.penulis}
              ubah={(v) => setIsi((s) => ({ ...s, penulis: v }))}
              galat={galatKolom.penulis}
            />
            <Teks
              nama="tahun"
              label="Tahun terbit"
              tipe="number"
              nilai={isi.tahun}
              ubah={(v) => setIsi((s) => ({ ...s, tahun: v }))}
              galat={galatKolom.tahun}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="kategori"
              label="Kategori"
              maks={60}
              nilai={isi.kategori}
              ubah={(v) => setIsi((s) => ({ ...s, kategori: v }))}
              galat={galatKolom.kategori}
              bantuan={
                data && data.kategori.length > 0
                  ? "Kategori yang sudah dipakai: " + data.kategori.join(", ")
                  : "Kategori bebas, misalnya Buku Pelajaran atau Karya Siswa."
              }
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
          />

          <div className="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4 text-sm leading-relaxed text-biru-tua">
            Isi salah satu: tautan ke koleksi yang sudah ada di layanan lain,
            atau unggah berkasnya ke server sekolah. Keduanya boleh diisi
            sekaligus, dan yang dipakai tombolnya adalah berkas unggahan.
          </div>

          <Teks
            nama="tautan"
            label="Tautan koleksi"
            maks={500}
            nilai={isi.tautan}
            ubah={(v) => setIsi((s) => ({ ...s, tautan: v }))}
            galat={galatKolom.tautan}
            contoh="https://drive.google.com/..."
          />

          <Berkas
            nama="berkas"
            label="Berkas koleksi"
            terima="image/jpeg,image/png,application/pdf"
            ubah={setBerkas}
            galat={galatKolom.berkas}
            namaTerpilih={berkasLama || undefined}
            bantuan="PDF, JPG, atau PNG, maksimal 2 MB. Unggah hanya bahan yang memang boleh disebarkan."
          />

          {berkasLama && !berkas && (
            <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="hapus_berkas" nilai={hapusBerkas} ubah={setHapusBerkas}>
                Hapus berkas yang sekarang.
              </Centang>
            </div>
          )}

          <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
            <Centang
              nama="aktif"
              nilai={isi.aktif}
              ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
            >
              Tampilkan di katalog publik.
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
        judul="Hapus koleksi?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Koleksi <strong>{hapusTarget?.judul}</strong> akan dihapus dari
            katalog. Berkas yang diunggah ke server ikut terhapus.
          </p>
        }
      />
    </>
  );
}

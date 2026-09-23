"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { angka, tanggalJam } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import {
  Teks,
  AreaTeks,
  Pilihan,
  Berkas,
  Centang,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { Berita } from "@/lib/tipe";

const KOSONG = {
  judul: "",
  kategori: "Berita",
  ringkasan: "",
  isi: "",
  penulis: "",
  publish: true,
};

export default function HalamanBeritaAdmin() {
  return (
    <KerangkaAdmin>
      <IsiBerita />
    </KerangkaAdmin>
  );
}

function IsiBerita() {
  const kabar = useKabar();
  const [saring, setSaring] = useState({ cari: "", kategori: "", publish: "" });
  const kueri = (() => {
    const u = new URLSearchParams({ per_halaman: "50" });
    if (saring.cari.trim()) u.set("cari", saring.cari.trim());
    if (saring.kategori) u.set("kategori", saring.kategori);
    if (saring.publish) u.set("publish", saring.publish);
    return `?${u.toString()}`;
  })();

  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.beritaAdmin(kueri),
    [kueri],
  );

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [gambar, setGambar] = useState<File | null>(null);
  const [gambarLama, setGambarLama] = useState("");
  const [hapusGambar, setHapusGambar] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Berita | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(b?: Berita) {
    setGalatKolom({});
    setRingkasan([]);
    setGambar(null);
    setHapusGambar(false);
    if (b) {
      setUbahId(b.id);
      setGambarLama(b.gambar);
      setIsi({
        judul: b.judul,
        kategori: b.kategori,
        ringkasan: b.ringkasan,
        isi: b.isi,
        penulis: b.penulis,
        publish: b.publish,
      });
    } else {
      setUbahId(null);
      setGambarLama("");
      setIsi(KOSONG);
    }
    setJendela(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);

    const f = new FormData();
    f.append("judul", isi.judul);
    f.append("kategori", isi.kategori);
    f.append("ringkasan", isi.ringkasan);
    f.append("isi", isi.isi);
    f.append("penulis", isi.penulis);
    f.append("publish", isi.publish ? "1" : "0");
    if (gambar) f.append("gambar", gambar);
    if (hapusGambar) f.append("hapus_gambar", "1");

    try {
      const hasil =
        ubahId === null
          ? await api.simpanBerita(f)
          : await api.ubahBerita(ubahId, f);
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
        setRingkasan(["Berita gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusBerita(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([
        e instanceof GalatApi ? e.message : "Berita gagal dihapus.",
      ]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Berita & Pengumuman"
        keterangan="Naskah yang tampil di halaman Berita. Tulisan berstatus draf tidak terlihat pengunjung."
        aksi={<Tombol onClick={() => buka()}>Tulis Berita</Tombol>}
      />


      <div className="kartu mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label
              htmlFor="cari-berita"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Pencarian
            </label>
            <input
              id="cari-berita"
              type="search"
              value={saring.cari}
              onChange={(e) => setSaring((s) => ({ ...s, cari: e.target.value }))}
              placeholder="Judul atau ringkasan"
              className="w-full rounded-lg border border-garis px-3.5 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            />
          </div>
          <div>
            <label
              htmlFor="kat-berita"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Kategori
            </label>
            <select
              id="kat-berita"
              value={saring.kategori}
              onChange={(e) =>
                setSaring((s) => ({ ...s, kategori: e.target.value }))
              }
              className="w-full rounded-lg border border-garis bg-white px-3 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            >
              <option value="">Semua kategori</option>
              {(data?.kategori ?? []).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="pub-berita"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Keadaan
            </label>
            <select
              id="pub-berita"
              value={saring.publish}
              onChange={(e) =>
                setSaring((s) => ({ ...s, publish: e.target.value }))
              }
              className="w-full rounded-lg border border-garis bg-white px-3 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            >
              <option value="">Semua</option>
              <option value="1">Sudah terbit</option>
              <option value="0">Draf</option>
            </select>
          </div>
        </div>
      </div>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada berita yang cocok"
          keterangan="Tulis berita baru, atau ubah penyaring di atas."
        />
      ) : (
        <Tabel kepala={["Gambar", "Judul", "Kategori", "Keadaan", "Dibaca", "Diperbarui", ""]}>
          {data.data.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                {b.gambar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlUnggahan("berita", b.gambar)}
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
                <p className="max-w-md font-medium">{b.judul}</p>
                <p className="mt-0.5 text-xs text-samar">/{b.slug}</p>
              </td>
              <td className="px-4 py-3">
                <Lencana>{b.kategori}</Lencana>
              </td>
              <td className="px-4 py-3">
                <Lencana
                  jenis={
                    b.publish
                      ? "hijau"
                      : "emas"
                  }
                >
                  {b.publish ? "Terbit" : "Draf"}
                </Lencana>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {angka(b.dibaca)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-samar">
                {tanggalJam(b.diubah)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(b)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  <a
                    href={`/berita/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-garis px-3 py-1.5 text-xs font-semibold text-teks hover:border-biru hover:text-biru"
                  >
                    Lihat
                  </a>
                  <button
                    type="button"
                    onClick={() => setHapusTarget(b)}
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
        judul={ubahId === null ? "Tulis Berita" : "Ubah Berita"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
        lebar="max-w-3xl"
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="judul"
            label="Judul"
            wajib
            maks={200}
            nilai={isi.judul}
            ubah={(v) => setIsi((s) => ({ ...s, judul: v }))}
            galat={galatKolom.judul}
            bantuan={
              ubahId === null
                ? "Alamat berita dibuat otomatis dari judul."
                : "Mengubah judul juga mengubah alamat berita ini."
            }
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="kategori"
              label="Kategori"
              wajib
              nilai={isi.kategori}
              ubah={(v) => setIsi((s) => ({ ...s, kategori: v }))}
              opsi={data?.kategori ?? ["Berita", "Pengumuman", "Prestasi", "Kegiatan"]}
              galat={galatKolom.kategori}
              kosong="-- Pilih kategori --"
            />
            <Teks
              nama="penulis"
              label="Penulis"
              maks={100}
              nilai={isi.penulis}
              ubah={(v) => setIsi((s) => ({ ...s, penulis: v }))}
              galat={galatKolom.penulis}
              bantuan="Dibiarkan kosong berarti memakai nama Anda."
            />
          </div>

          <AreaTeks
            nama="ringkasan"
            label="Ringkasan"
            baris={2}
            maks={300}
            nilai={isi.ringkasan}
            ubah={(v) => setIsi((s) => ({ ...s, ringkasan: v }))}
            galat={galatKolom.ringkasan}
            bantuan="Tampil pada kartu berita dan hasil pencarian. Maksimal 300 karakter."
          />

          <AreaTeks
            nama="isi"
            label="Isi berita"
            wajib
            baris={12}
            nilai={isi.isi}
            ubah={(v) => setIsi((s) => ({ ...s, isi: v }))}
            galat={galatKolom.isi}
            bantuan="Pisahkan paragraf dengan satu baris kosong."
          />

          <Berkas
            nama="gambar"
            label="Gambar utama"
            terima="image/jpeg,image/png"
            ubah={setGambar}
            galat={galatKolom.gambar}
            namaTerpilih={gambarLama || undefined}
            bantuan="JPG atau PNG, maksimal 2 MB."
          />

          {gambarLama && !gambar && (
            <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="hapus_gambar" nilai={hapusGambar} ubah={setHapusGambar}>
                Hapus gambar yang sekarang dan biarkan berita tanpa gambar.
              </Centang>
            </div>
          )}

          <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
            <Centang
              nama="publish"
              nilai={isi.publish}
              ubah={(v) => setIsi((s) => ({ ...s, publish: v }))}
            >
              Terbitkan sekarang. Bila tidak dicentang, berita disimpan sebagai
              draf dan belum terlihat pengunjung.
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
        judul="Hapus berita?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <div className="space-y-2">
            <p>
              Berita <strong>{hapusTarget?.judul}</strong> beserta gambarnya akan
              dihapus dan tidak dapat dipulihkan.
            </p>
            <p>
              Bila hanya ingin menyembunyikannya dari pengunjung, ubah saja
              menjadi draf.
            </p>
          </div>
        }
      />
    </>
  );
}

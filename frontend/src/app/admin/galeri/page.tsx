"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { tanggalPanjang } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, PesanBerhasil, TanpaData } from "@/komponen/Memuat";
import { Teks, AreaTeks, Berkas, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { Galeri } from "@/lib/tipe";

const KOSONG = { judul: "", kategori: "", keterangan: "" };

export default function HalamanGaleriAdmin() {
  return (
    <KerangkaAdmin>
      <IsiGaleri />
    </KerangkaAdmin>
  );
}

function IsiGaleri() {
  const { data, memuat, galat, muatUlang } = useMuat(() => api.galeri());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [gambar, setGambar] = useState<File | null>(null);
  const [gambarLama, setGambarLama] = useState("");
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState("");
  const [hapusTarget, setHapusTarget] = useState<Galeri | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(g?: Galeri) {
    setGalatKolom({});
    setRingkasan([]);
    setGambar(null);
    if (g) {
      setUbahId(g.id);
      setGambarLama(g.gambar);
      setIsi({ judul: g.judul, kategori: g.kategori, keterangan: g.keterangan });
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
    f.append("keterangan", isi.keterangan);
    if (gambar) f.append("gambar", gambar);

    try {
      const hasil =
        ubahId === null
          ? await api.simpanGaleri(f)
          : await api.ubahGaleri(ubahId, f);
      setPesan(hasil.pesan);
      setJendela(false);
      muatUlang();
      // Halaman publik disegarkan agar perubahannya langsung terlihat.
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Foto gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusGaleri(hapusTarget.id);
      setPesan(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([e instanceof GalatApi ? e.message : "Foto gagal dihapus."]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Galeri"
        keterangan="Foto kegiatan yang tampil di halaman Galeri. Kategori dipakai sebagai penyaring bagi pengunjung."
        aksi={<Tombol onClick={() => buka()}>Unggah Foto</Tombol>}
      />

      {pesan && (
        <div className="mb-5">
          <PesanBerhasil pesan={pesan} />
        </div>
      )}

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada foto"
          keterangan="Unggah foto kegiatan agar halaman Galeri tidak kosong."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-samar">
            {data.data.length} foto
            {data.kategori.length > 0 &&
              ` dalam ${data.kategori.length} kategori: ${data.kategori.join(", ")}`}
            .
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((g) => (
              <div key={g.id} className="kartu overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlUnggahan("galeri", g.gambar)}
                  alt={g.judul}
                  className="aspect-4/3 w-full bg-biru-muda object-cover"
                  loading="lazy"
                />
                <div className="p-4">
                  <p className="text-sm font-semibold text-biru-tua">{g.judul}</p>
                  <p className="mt-0.5 text-xs text-samar">
                    {g.kategori || "Tanpa kategori"} · {tanggalPanjang(g.dibuat)}
                  </p>
                  {g.keterangan && (
                    <p className="mt-2 line-clamp-2 text-xs text-samar">
                      {g.keterangan}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => buka(g)}
                      className="flex-1 rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => setHapusTarget(g)}
                      className="flex-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Jendela
        judul={ubahId === null ? "Unggah Foto" : "Ubah Foto"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="judul"
            label="Judul foto"
            wajib
            maks={160}
            nilai={isi.judul}
            ubah={(v) => setIsi((s) => ({ ...s, judul: v }))}
            galat={galatKolom.judul}
            contoh="Upacara bendera Senin pagi"
          />

          <Teks
            nama="kategori"
            label="Kategori"
            maks={60}
            nilai={isi.kategori}
            ubah={(v) => setIsi((s) => ({ ...s, kategori: v }))}
            galat={galatKolom.kategori}
            contoh="Kegiatan Sekolah"
            bantuan={
              (data?.kategori.length ?? 0) > 0
                ? `Kategori yang sudah ada: ${data?.kategori.join(", ")}`
                : "Tulis kategori baru; pengunjung dapat menyaring galeri dengannya."
            }
          />

          <AreaTeks
            nama="keterangan"
            label="Keterangan"
            baris={3}
            maks={300}
            nilai={isi.keterangan}
            ubah={(v) => setIsi((s) => ({ ...s, keterangan: v }))}
            galat={galatKolom.keterangan}
          />

          <Berkas
            nama="gambar"
            label="Berkas foto"
            wajib={ubahId === null}
            terima="image/jpeg,image/png"
            ubah={setGambar}
            galat={galatKolom.gambar}
            namaTerpilih={gambarLama || undefined}
            bantuan={
              ubahId === null
                ? "JPG atau PNG, maksimal 2 MB."
                : "Biarkan kosong bila fotonya tidak diganti."
            }
          />

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
        judul="Hapus foto?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Foto <strong>{hapusTarget?.judul}</strong> akan dihapus dari galeri
            dan dari server. Tindakan ini tidak dapat dibatalkan.
          </p>
        }
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { belumTerisi } from "@/lib/format";
import { useKabar } from "@/komponen/Kabar";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Lencana } from "@/komponen/Bagian";
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
import type { Halaman } from "@/lib/tipe";

/**
 * Halaman profil bernaskah panjang: Kurikulum, OSIS, Pendidikan Karakter,
 * dan halaman lain yang ditambahkan sekolah sendiri.
 *
 * Kelompoknya menentukan di menu mana halaman itu muncul di situs publik,
 * dan alamatnya menentukan tautannya. Karena itu alamat yang sudah dipakai
 * sebaiknya tidak diganti: tautan yang sudah dibagikan akan mati.
 */

const KOSONG = {
  slug: "",
  judul: "",
  ringkasan: "",
  isi: "",
  kelompok: "Profil",
  urutan: 0,
  aktif: true,
};

export default function HalamanProfilAdmin() {
  return (
    <KerangkaAdmin>
      <IsiHalaman />
    </KerangkaAdmin>
  );
}

function IsiHalaman() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.halamanAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [gambar, setGambar] = useState<File | null>(null);
  const [gambarLama, setGambarLama] = useState("");
  const [hapusGambar, setHapusGambar] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Halaman | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  function buka(h?: Halaman) {
    setGalatKolom({});
    setRingkasan([]);
    setGambar(null);
    setHapusGambar(false);
    if (h) {
      setUbahId(h.id);
      setGambarLama(h.gambar);
      setIsi({
        slug: h.slug,
        judul: h.judul,
        ringkasan: h.ringkasan,
        isi: h.isi,
        kelompok: h.kelompok,
        urutan: h.urutan,
        aktif: h.aktif,
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
    fd.append("slug", isi.slug);
    fd.append("judul", isi.judul);
    fd.append("ringkasan", isi.ringkasan);
    fd.append("isi", isi.isi);
    fd.append("kelompok", isi.kelompok);
    fd.append("urutan", String(isi.urutan));
    fd.append("aktif", isi.aktif ? "1" : "0");
    if (gambar) fd.append("gambar", gambar);
    if (hapusGambar) fd.append("hapus_gambar", "1");

    try {
      const hasil =
        ubahId === null
          ? await api.simpanHalaman(fd)
          : await api.ubahHalaman(ubahId, fd);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Halaman gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusHalaman(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setRingkasan([e instanceof GalatApi ? e.message : "Halaman gagal dihapus."]);
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Halaman Profil"
        keterangan="Halaman bernaskah panjang pada menu Profil Sekolah, Akademik, dan Kesiswaan. Kelompok menentukan menu tempat halaman itu tampil."
        aksi={<Tombol onClick={() => buka()}>Tambah Halaman</Tombol>}
      />

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada halaman"
          keterangan="Tambahkan halaman agar menu Profil Sekolah, Akademik, atau Kesiswaan memiliki isi."
        />
      ) : (
        <Tabel kepala={["Urut", "Judul", "Kelompok", "Alamat", "Naskah", "Tampil", ""]}>
          {data.data.map((h) => (
            <tr key={h.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-samar tabular-nums">{h.urutan}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{h.judul}</p>
                {h.ringkasan && (
                  <p className="mt-0.5 max-w-sm text-xs text-samar">{h.ringkasan}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-biru-muda px-2.5 py-0.5 text-xs font-semibold text-biru">
                  {h.kelompok}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-samar">/{h.slug}</td>
              <td className="px-4 py-3">
                {/* Naskah bertanda kurung siku berarti masih berupa kerangka
                    yang menunggu naskah dari sekolah, bukan naskah jadi. */}
                {belumTerisi(h.isi) ? (
                  <Lencana jenis="emas">Menunggu naskah</Lencana>
                ) : (
                  <span className="text-xs text-samar tabular-nums">
                    {h.isi.length.toLocaleString("id-ID")} karakter
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {h.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Tidak</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(h)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setHapusTarget(h)}
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
        judul={ubahId === null ? "Tambah Halaman" : "Ubah Halaman"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks
            nama="judul"
            label="Judul halaman"
            wajib
            maks={180}
            nilai={isi.judul}
            ubah={(v) => setIsi((s) => ({ ...s, judul: v }))}
            galat={galatKolom.judul}
            contoh="Kurikulum"
          />

          <Teks
            nama="slug"
            label="Alamat halaman"
            maks={120}
            nilai={isi.slug}
            ubah={(v) => setIsi((s) => ({ ...s, slug: v }))}
            galat={galatKolom.slug}
            contoh="kurikulum"
            bantuan="Huruf kecil, angka, dan tanda hubung. Dikosongkan berarti dibuat dari judulnya. Jangan diganti bila tautannya sudah dibagikan."
          />

          <AreaTeks
            nama="ringkasan"
            label="Ringkasan"
            baris={2}
            maks={400}
            nilai={isi.ringkasan}
            ubah={(v) => setIsi((s) => ({ ...s, ringkasan: v }))}
            galat={galatKolom.ringkasan}
            bantuan="Satu atau dua kalimat. Dipakai sebagai keterangan di bawah judul dan pada hasil pencarian."
          />

          <AreaTeks
            nama="isi"
            label="Naskah halaman"
            baris={12}
            nilai={isi.isi}
            ubah={(v) => setIsi((s) => ({ ...s, isi: v }))}
            galat={galatKolom.isi}
            bantuan="Satu baris kosong memisahkan paragraf. Naskahnya hanya boleh berasal dari sekolah."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="kelompok"
              label="Kelompok menu"
              nilai={isi.kelompok}
              ubah={(v) => setIsi((s) => ({ ...s, kelompok: v }))}
              opsi={data?.kelompok ?? ["Profil", "Akademik", "Kesiswaan"]}
              galat={galatKolom.kelompok}
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

          <Berkas
            nama="gambar"
            label="Gambar pendukung"
            terima="image/jpeg,image/png"
            ubah={setGambar}
            galat={galatKolom.gambar}
            namaTerpilih={gambarLama || undefined}
            bantuan="Tidak wajib. JPG atau PNG, maksimal 2 MB."
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
              Tampilkan halaman ini di situs publik.
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
        judul="Hapus halaman?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Halaman <strong>{hapusTarget?.judul}</strong> beserta naskahnya akan
            dihapus dan tidak dapat dipulihkan. Tautan{" "}
            <code>/halaman/{hapusTarget?.slug}</code> akan ikut mati.
          </p>
        }
      />
    </>
  );
}

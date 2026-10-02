"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Teks, AreaTeks, Berkas, Centang, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { MitraBkk } from "@/lib/tipe";
import { BATAS_UNGGAH } from "@/lib/unggah";

/**
 * Perusahaan dan instansi mitra Bursa Kerja Khusus.
 *
 * Kontak narahubung hanya untuk petugas; situs publik menampilkan nama,
 * bidang, alamat, situs, dan logonya saja. Mitra yang pernah membuka
 * lowongan tidak dapat dihapus, cukup dinonaktifkan, supaya riwayat
 * penyaluran lulusannya tetap utuh.
 */

const KOSONG = {
  nama: "",
  bidang: "",
  alamat: "",
  kontak_nama: "",
  kontak_telepon: "",
  kontak_email: "",
  situs: "",
  aktif: true,
};

export default function HalamanMitraBkk() {
  const kabar = useKabar();
  const { pengguna } = useSesi();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.mitraBkkAdmin());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoLama, setLogoLama] = useState("");
  const [hapusLogo, setHapusLogo] = useState(false);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<MitraBkk | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const ubah = (k: keyof typeof KOSONG) => (v: string) => setIsi((s) => ({ ...s, [k]: v }));

  function buka(m?: MitraBkk) {
    setGalatKolom({});
    setRingkasan([]);
    setLogo(null);
    setHapusLogo(false);
    if (m) {
      setUbahId(m.id);
      setLogoLama(m.logo);
      setIsi({
        nama: m.nama,
        bidang: m.bidang,
        alamat: m.alamat,
        kontak_nama: m.kontak_nama ?? "",
        kontak_telepon: m.kontak_telepon ?? "",
        kontak_email: m.kontak_email ?? "",
        situs: m.situs,
        aktif: m.aktif,
      });
    } else {
      setUbahId(null);
      setLogoLama("");
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
    if (logo) fd.append("logo", logo);
    if (hapusLogo) fd.append("hapus_logo", "1");

    try {
      const hasil = ubahId === null ? await api.simpanMitraBkk(fd) : await api.ubahMitraBkk(ubahId, fd);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Mitra gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusMitraBkk(hapusTarget.id);
      kabar.beri(hasil.pesan);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      kabar.beri(e instanceof GalatApi ? e.message : "Mitra gagal dihapus.", "galat");
    } finally {
      setHapusTarget(null);
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Mitra BKK"
        keterangan="Perusahaan dan instansi yang bekerja sama dalam penyaluran lulusan. Mitra yang dinonaktifkan tidak tampil di situs, dan lowongannya ikut tertutup."
        aksi={<Tombol onClick={() => buka()}>Tambah Mitra</Tombol>}
      />

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada mitra"
          keterangan="Tambahkan perusahaan mitra lebih dulu; setiap lowongan kerja harus berasal dari salah satu mitra."
        />
      ) : (
        <Tabel kepala={["Perusahaan", "Narahubung", "Lowongan", "Tersalurkan", "Tampil", ""]}>
          {data.data.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-garis bg-white text-xs font-bold text-biru">
                    {m.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlUnggahan("bkk-mitra", m.logo)} alt="" className="h-full w-full object-contain" />
                    ) : (
                      m.nama.replace(/^(PT|CV|UD)\.?\s+/i, "").slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div>
                    <p className="font-medium">{m.nama}</p>
                    <p className="text-xs text-samar">{m.bidang || "Bidang belum diisi"}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-samar">
                {m.kontak_nama || m.kontak_telepon || m.kontak_email ? (
                  <>
                    {m.kontak_nama && <p className="font-semibold text-teks">{m.kontak_nama}</p>}
                    {m.kontak_telepon && <p>{m.kontak_telepon}</p>}
                    {m.kontak_email && <p>{m.kontak_email}</p>}
                  </>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 text-samar tabular-nums">
                {m.lowongan_dibuka} dibuka / {m.jumlah_lowongan}
              </td>
              <td className="px-4 py-3 font-semibold tabular-nums text-green-700">{m.tersalurkan}</td>
              <td className="px-4 py-3">
                {m.aktif ? (
                  <span className="text-xs font-semibold text-green-700">Ya</span>
                ) : (
                  <span className="text-xs text-samar">Nonaktif</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => buka(m)}
                    className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                  >
                    Ubah
                  </button>
                  {pengguna?.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => setHapusTarget(m)}
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

      <Jendela judul={ubahId === null ? "Tambah Mitra" : "Ubah Mitra"} terbuka={jendela} tutup={() => setJendela(false)}>
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <Teks nama="nama" label="Nama perusahaan / instansi" wajib maks={160} nilai={isi.nama} ubah={ubah("nama")} galat={galatKolom.nama} contoh="PT ..." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Teks nama="bidang" label="Bidang usaha" maks={120} nilai={isi.bidang} ubah={ubah("bidang")} galat={galatKolom.bidang} contoh="Manufaktur, ritel, perbankan, ..." />
            <Teks nama="situs" label="Situs perusahaan" maks={300} nilai={isi.situs} ubah={ubah("situs")} galat={galatKolom.situs} contoh="https://..." />
          </div>
          <AreaTeks nama="alamat" label="Alamat" baris={2} nilai={isi.alamat} ubah={ubah("alamat")} galat={galatKolom.alamat} />

          <div className="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4 text-sm leading-relaxed text-biru-tua">
            Narahubung hanya terlihat oleh petugas di panel ini, tidak pernah tampil di situs.
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Teks nama="kontak_nama" label="Nama narahubung" maks={120} nilai={isi.kontak_nama} ubah={ubah("kontak_nama")} galat={galatKolom.kontak_nama} />
            <Teks nama="kontak_telepon" label="Telepon" tipe="tel" maks={25} nilai={isi.kontak_telepon} ubah={ubah("kontak_telepon")} galat={galatKolom.kontak_telepon} />
            <Teks nama="kontak_email" label="Email" tipe="email" maks={120} nilai={isi.kontak_email} ubah={ubah("kontak_email")} galat={galatKolom.kontak_email} />
          </div>

          <Berkas
            nama="logo"
            label="Logo perusahaan"
            terima="image/jpeg,image/png"
            ubah={setLogo}
            galat={galatKolom.logo}
            namaTerpilih={logoLama || undefined}
            bantuan={`JPG atau PNG, maksimal ${BATAS_UNGGAH}. Pakai logo hanya bila perusahaannya mengizinkan.`}
          />
          {logoLama && !logo && (
            <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
              <Centang nama="hapus_logo" nilai={hapusLogo} ubah={setHapusLogo}>
                Hapus logo yang sekarang.
              </Centang>
            </div>
          )}

          <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4">
            <Centang nama="aktif" nilai={isi.aktif} ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}>
              Mitra aktif dan tampil di situs.
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
        judul="Hapus mitra?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Mitra <strong>{hapusTarget?.nama}</strong> akan dihapus. Mitra yang sudah pernah membuka lowongan tidak dapat
            dihapus; nonaktifkan saja.
          </p>
        }
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { tanggalJam } from "@/lib/format";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { Teks, Pilihan, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { Pengguna } from "@/lib/tipe";

const KOSONG = { nama: "", username: "", sandi: "", role: "operator" };

export default function HalamanPengguna() {
  const kabar = useKabar();
  const { pengguna: saya } = useSesi();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.pengguna());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Pengguna | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  function buka(p?: Pengguna) {
    setGalatKolom({});
    setRingkasan([]);
    if (p) {
      setUbahId(p.id);
      setIsi({ nama: p.nama, username: p.username, sandi: "", role: p.role });
    } else {
      setUbahId(null);
      setIsi(KOSONG);
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
          ? await api.simpanPengguna(isi)
          : await api.ubahPengguna(ubahId, isi);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Pengguna gagal disimpan."]);
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
      const hasil = await api.hapusPengguna(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      setGalatHapus(
        e instanceof GalatApi ? e.message : "Pengguna gagal dihapus.",
      );
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Pengguna Panel"
        keterangan="Akun petugas yang dapat masuk ke panel. Peran admin dapat mengubah pengaturan sekolah, mengelola peminatan dan pengguna, serta menghapus data pendaftar; operator hanya mengelola pendaftar dan isi situs."
        aksi={<Tombol onClick={() => buka()}>Tambah Pengguna</Tombol>}
      />


      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data ? null : (
        <Tabel
          kepala={["Nama", "Nama pengguna", "Peran", "Terakhir masuk", "Dibuat", ""]}
        >
          {data.data.map((p) => {
            const iniSaya = p.id === saya?.id;
            return (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  {p.nama}
                  {iniSaya && (
                    <span className="ml-2 text-xs text-samar">(Anda)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-samar">{p.username}</td>
                <td className="px-4 py-3">
                  <Lencana
                    jenis={
                      p.role === "admin"
                        ? "terang"
                        : "abu"
                    }
                  >
                    {p.role === "admin" ? "Admin" : "Operator"}
                  </Lencana>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-samar">
                  {p.masuk_akhir ? tanggalJam(p.masuk_akhir) : "Belum pernah"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-samar">
                  {tanggalJam(p.dibuat)}
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
                    {!iniSaya && (
                      <button
                        type="button"
                        onClick={() => {
                          setGalatHapus("");
                          setHapusTarget(p);
                        }}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Tabel>
      )}

      <Jendela
        judul={ubahId === null ? "Tambah Pengguna" : "Ubah Pengguna"}
        terbuka={jendela}
        tutup={() => setJendela(false)}
      >
        <form onSubmit={simpan} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="nama"
              label="Nama lengkap"
              wajib
              maks={100}
              nilai={isi.nama}
              ubah={(v) => setIsi((s) => ({ ...s, nama: v }))}
              galat={galatKolom.nama}
            />
            <Teks
              nama="username"
              label="Nama pengguna"
              wajib
              maks={50}
              nilai={isi.username}
              ubah={(v) => setIsi((s) => ({ ...s, username: v.toLowerCase() }))}
              galat={galatKolom.username}
              bantuan="Huruf kecil, angka, titik, dan garis bawah."
            />
          </div>

          <Pilihan
            nama="role"
            label="Peran"
            wajib
            nilai={isi.role}
            ubah={(v) => setIsi((s) => ({ ...s, role: v }))}
            opsi={[
              { nilai: "admin", label: "Admin (akses penuh)" },
              { nilai: "operator", label: "Operator (kelola pendaftar & isi situs)" },
            ]}
            galat={galatKolom.role}
            kosong="-- Pilih peran --"
          />

          <Teks
            nama="sandi"
            label="Kata sandi"
            tipe="password"
            wajib={ubahId === null}
            nilai={isi.sandi}
            ubah={(v) => setIsi((s) => ({ ...s, sandi: v }))}
            galat={galatKolom.sandi}
            bantuan={
              ubahId === null
                ? "Minimal 8 karakter. Sampaikan kepada pemiliknya lewat jalur pribadi, dan minta segera diganti."
                : "Biarkan kosong bila kata sandinya tidak diubah."
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
        judul="Hapus pengguna?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <div className="space-y-3">
            <p>
              Akun <strong>{hapusTarget?.nama}</strong> ({hapusTarget?.username})
              tidak akan bisa masuk lagi.
            </p>
            <p>
              Catatan verifikasi yang pernah dikerjakannya tetap tersimpan pada
              data pendaftar.
            </p>
            {galatHapus && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-red-800">
                {galatHapus}
              </p>
            )}
          </div>
        }
      />
    </>
  );
}

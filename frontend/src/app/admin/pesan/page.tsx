"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { angka, tanggalJam, nomorWa } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, KartuAngka, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, PesanBerhasil, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { Tombol } from "@/komponen/Medan";
import type { Pesan } from "@/lib/tipe";

export default function HalamanPesanAdmin() {
  return (
    <KerangkaAdmin>
      <IsiPesan />
    </KerangkaAdmin>
  );
}

function IsiPesan() {
  const [saring, setSaring] = useState({ dibaca: "", cari: "" });
  const kueri = (() => {
    const u = new URLSearchParams({ per_halaman: "50" });
    if (saring.dibaca) u.set("dibaca", saring.dibaca);
    if (saring.cari.trim()) u.set("cari", saring.cari.trim());
    return `?${u.toString()}`;
  })();

  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.pesanMasuk(kueri),
    [kueri],
  );

  const [pesanAksi, setPesanAksi] = useState("");
  const [galatAksi, setGalatAksi] = useState("");
  const [sibuk, setSibuk] = useState<number | null>(null);
  const [hapusTarget, setHapusTarget] = useState<Pesan | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  async function tandai(p: Pesan) {
    setGalatAksi("");
    setSibuk(p.id);
    try {
      await api.tandaiPesan(p.id, !p.dibaca);
      muatUlang();
    } catch (e) {
      setGalatAksi(
        e instanceof GalatApi ? e.message : "Tanda baca gagal diubah.",
      );
    } finally {
      setSibuk(null);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusPesan(hapusTarget.id);
      setPesanAksi(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      setGalatAksi(e instanceof GalatApi ? e.message : "Pesan gagal dihapus.");
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Pesan Masuk"
        keterangan="Pertanyaan yang dikirim pengunjung lewat halaman Kontak."
      />

      {pesanAksi && (
        <div className="mb-5">
          <PesanBerhasil pesan={pesanAksi} />
        </div>
      )}
      {galatAksi && (
        <div className="mb-5">
          <PesanGalat pesan={galatAksi} />
        </div>
      )}

      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KartuAngka label="Total pesan" nilai={angka(data.total)} />
          <KartuAngka
            label="Belum dibaca"
            nilai={angka(data.belum_dibaca)}
            warna={data.belum_dibaca > 0 ? "text-amber-600" : "text-biru-tua"}
          />
        </div>
      )}

      <div className="kartu mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="cari-pesan"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Pencarian
            </label>
            <input
              id="cari-pesan"
              type="search"
              value={saring.cari}
              onChange={(e) => setSaring((s) => ({ ...s, cari: e.target.value }))}
              placeholder="Nama pengirim, subjek, atau isi"
              className="w-full rounded-lg border border-garis px-3.5 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            />
          </div>
          <div>
            <label
              htmlFor="saring-dibaca"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Keadaan
            </label>
            <select
              id="saring-dibaca"
              value={saring.dibaca}
              onChange={(e) =>
                setSaring((s) => ({ ...s, dibaca: e.target.value }))
              }
              className="w-full rounded-lg border border-garis bg-white px-3 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            >
              <option value="">Semua pesan</option>
              <option value="0">Belum dibaca</option>
              <option value="1">Sudah dibaca</option>
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
          judul="Tidak ada pesan yang cocok"
          keterangan="Pesan dari halaman Kontak akan muncul di sini."
        />
      ) : (
        <div className="space-y-4">
          {data.data.map((p) => {
            const wa = nomorWa(p.no_hp);
            return (
              <article
                key={p.id}
                className={
                  "kartu p-6 " + (p.dibaca ? "" : "border-l-4 border-l-amber-400")
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base">{p.subjek || "(tanpa subjek)"}</h2>
                      {!p.dibaca && (
                        <Lencana warna="border-amber-200 bg-amber-100 text-amber-800">
                          Belum dibaca
                        </Lencana>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-samar">
                      Dari <strong className="text-teks">{p.nama}</strong> ·{" "}
                      {tanggalJam(p.dibuat)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Tombol
                      jenis="kedua"
                      onClick={() => tandai(p)}
                      sedangJalan={sibuk === p.id}
                    >
                      {p.dibaca ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                    </Tombol>
                    <Tombol jenis="bahaya" onClick={() => setHapusTarget(p)}>
                      Hapus
                    </Tombol>
                  </div>
                </div>

                <p className="mt-4 border-t border-garis pt-4 text-[15px] leading-relaxed whitespace-pre-line text-teks">
                  {p.isi}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-garis pt-4">
                  {p.email && (
                    <a
                      href={`mailto:${p.email}?subject=${encodeURIComponent(
                        `Balasan: ${p.subjek || "pertanyaan Anda"}`,
                      )}`}
                      className="rounded-lg bg-biru-muda px-3.5 py-2 text-sm font-semibold text-biru hover:bg-biru/15"
                    >
                      Balas lewat email ({p.email})
                    </a>
                  )}
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-green-50 px-3.5 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                    >
                      Balas lewat WhatsApp ({p.no_hp})
                    </a>
                  )}
                  {!p.email && !wa && (
                    <p className="text-sm text-samar">
                      Pengirim tidak mencantumkan email maupun nomor HP.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Konfirmasi
        terbuka={hapusTarget !== null}
        judul="Hapus pesan?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Pesan dari <strong>{hapusTarget?.nama}</strong> akan dihapus permanen.
            Pastikan sudah ditindaklanjuti sebelum menghapusnya.
          </p>
        }
      />
    </>
  );
}

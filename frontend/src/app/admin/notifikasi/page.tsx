"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { tanggalJam } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Tabel, Jendela } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import type { JenisLencana } from "@/komponen/Bagian";
import { AreaTeks, Pilihan, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { IkonWhatsapp } from "@/komponen/Ikon";
import type { Notifikasi } from "@/lib/tipe";

/**
 * Panel notifikasi WhatsApp.
 *
 * Pesan disusun sistem saat panitia mengubah status pendaftar, lalu menunggu
 * di sini untuk ditinjau. Tombol kirimnya berubah menurut cara pengiriman:
 * bila gateway resmi disetel, pesannya dikirim server; bila tidak, WhatsApp
 * terbuka dengan pesan yang sudah terisi dan panitia menekan kirim sendiri.
 */

const WARNA_STATUS: Record<string, JenisLencana> = {
  Menunggu: "emas",
  Terkirim: "hijau",
  Gagal: "merah",
  Dibatalkan: "abu",
};

export default function HalamanNotifikasi() {
  return (
    <KerangkaAdmin>
      <IsiNotifikasi />
    </KerangkaAdmin>
  );
}

function IsiNotifikasi() {
  const kabar = useKabar();
  const [saring, setSaring] = useState("");
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.notifikasi(saring ? `?status=${encodeURIComponent(saring)}` : ""),
    [saring],
  );

  const [tinjau, setTinjau] = useState<Notifikasi | null>(null);
  const [pesan, setPesan] = useState("");
  const [sedangKirim, setSedangKirim] = useState(false);
  const [ringkasan, setRingkasan] = useState<string[]>([]);

  function buka(n: Notifikasi) {
    setRingkasan([]);
    setTinjau(n);
    setPesan(n.pesan);
  }

  async function kirim() {
    if (!tinjau) return;
    setRingkasan([]);
    setSedangKirim(true);
    try {
      const hasil = await api.kirimNotifikasi(tinjau.id, { pesan });
      // Tanpa gateway, server hanya mencatat. WhatsApp dibuka di sini, dan
      // pesannya sudah terisi penuh sehingga panitia tinggal menekan kirim.
      if (hasil.tautan_wa) {
        window.open(hasil.tautan_wa, "_blank", "noopener,noreferrer");
      }
      kabar.beri(hasil.pesan);
      setTinjau(null);
      muatUlang();
    } catch (e) {
      setRingkasan([
        e instanceof GalatApi ? e.message : "Notifikasi gagal dikirim.",
      ]);
    } finally {
      setSedangKirim(false);
    }
  }

  async function batalkan(n: Notifikasi) {
    try {
      const hasil = await api.batalNotifikasi(n.id);
      kabar.beri(hasil.pesan);
      muatUlang();
    } catch (e) {
      kabar.beri(
        e instanceof GalatApi ? e.message : "Notifikasi gagal dibatalkan.",
        "galat",
      );
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Notifikasi WhatsApp"
        keterangan="Pesan disusun otomatis saat status pendaftar diubah, lalu menunggu di sini untuk ditinjau. Pesan yang sudah terkirim tidak dapat diubah, supaya catatannya tetap bisa dipakai bila ada sengketa dengan orang tua."
      />

      <div className="mb-5 rounded-lg border border-garis bg-slate-50 px-5 py-4 text-sm leading-relaxed text-samar">
        {data?.gateway_aktif ? (
          <>
            <strong className="text-teks">Gateway resmi aktif.</strong> Menekan
            tombol kirim akan mengirim pesannya langsung dari server.
          </>
        ) : (
          <>
            <strong className="text-teks">Pengiriman lewat WhatsApp panitia.</strong>{" "}
            Menekan tombol kirim membuka WhatsApp dengan pesan yang sudah terisi
            penuh; panitia tinggal menekan kirim di sana. Cara ini tidak berbiaya
            dan tidak berisiko nomor sekolah diblokir. Untuk otomatis penuh,
            setel <code className="rounded bg-white px-1">WA_GATEWAY_URL</code>{" "}
            ke WhatsApp Business API resmi.
          </>
        )}
      </div>

      <div className="mb-5 max-w-xs">
        <Pilihan
          nama="saring_status"
          label="Saring keadaan"
          nilai={saring}
          ubah={setSaring}
          opsi={data?.pilihan_status ?? []}
          kosong="Semua keadaan"
        />
      </div>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada notifikasi"
          keterangan="Notifikasi tersusun sendiri begitu status seorang pendaftar diubah di menu Pendaftar."
        />
      ) : (
        <Tabel kepala={["Waktu", "Pendaftar", "Jenis", "Tujuan", "Keadaan", ""]}>
          {data.data.map((n) => (
            <tr key={n.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-xs whitespace-nowrap text-samar">
                {tanggalJam(n.dibuat)}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{n.nama_pendaftar || "-"}</p>
                <p className="text-xs text-samar">{n.no_registrasi}</p>
              </td>
              <td className="px-4 py-3 text-samar capitalize">{n.jenis}</td>
              <td className="px-4 py-3 text-xs whitespace-nowrap tabular-nums">
                {n.tujuan}
              </td>
              <td className="px-4 py-3">
                <Lencana jenis={WARNA_STATUS[n.status] ?? WARNA_STATUS.Dibatalkan}>
                  {n.status}
                </Lencana>
                {n.galat && (
                  <p className="mt-1 max-w-xs text-xs text-red-700">{n.galat}</p>
                )}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => buka(n)}
                  className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                >
                  {n.status === "Terkirim" ? "Lihat" : "Tinjau & kirim"}
                </button>
                {n.status !== "Terkirim" && n.status !== "Dibatalkan" && (
                  <button
                    type="button"
                    onClick={() => batalkan(n)}
                    className="ml-2 rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold text-samar hover:bg-slate-50"
                  >
                    Batalkan
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      <Jendela
        terbuka={tinjau !== null}
        tutup={() => setTinjau(null)}
        judul={tinjau?.status === "Terkirim" ? "Pesan terkirim" : "Tinjau pesan"}
      >
        <div className="space-y-5">
          {ringkasan.length > 0 && <RingkasanGalat daftar={ringkasan} />}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-samar">Pendaftar</dt>
            <dd className="font-semibold">
              {tinjau?.nama_pendaftar} · {tinjau?.no_registrasi}
            </dd>
            <dt className="text-samar">Nomor tujuan</dt>
            <dd className="font-semibold tabular-nums">{tinjau?.tujuan}</dd>
            {tinjau?.dikirim_pada && (
              <>
                <dt className="text-samar">Dikirim</dt>
                <dd className="font-semibold">{tanggalJam(tinjau.dikirim_pada)}</dd>
              </>
            )}
          </dl>

          {tinjau?.status === "Terkirim" ? (
            <div className="rounded-lg border border-garis bg-slate-50 px-5 py-4 text-sm leading-relaxed whitespace-pre-line text-teks">
              {tinjau.pesan}
            </div>
          ) : (
            <>
              <AreaTeks
                nama="pesan"
                label="Isi pesan"
                baris={8}
                nilai={pesan}
                ubah={setPesan}
                bantuan="Boleh diperbaiki sebelum dikirim. Naskah otomatis tidak selalu pas untuk keadaan tertentu."
              />
              <div className="flex justify-end gap-3 border-t border-garis pt-5">
                <Tombol type="button" jenis="kedua" onClick={() => setTinjau(null)}>
                  Tutup
                </Tombol>
                <Tombol type="button" sedangJalan={sedangKirim} onClick={kirim}>
                  <IkonWhatsapp ukuran={16} />
                  {data?.gateway_aktif ? "Kirim Sekarang" : "Buka WhatsApp"}
                </Tombol>
              </div>
            </>
          )}
        </div>
      </Jendela>
    </>
  );
}

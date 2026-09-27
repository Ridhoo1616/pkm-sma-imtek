"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { tanggalJam } from "@/lib/format";
import { KepalaPanel, Tabel, Konfirmasi } from "@/komponen/Panel";
import { PesanGalat, TanpaData, KerangkaTabel } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { Centang } from "@/komponen/Medan";
import type { TanyaBuntu } from "@/lib/tipe";

/**
 * Pertanyaan yang tidak dapat dijawab kotak "Tanya cepat".
 *
 * Halaman ini yang menutup celah yang tidak dapat ditutup pemrogram:
 * celah ISI. Padanan kata dan pengupas imbuhan memperbaiki cara memahami
 * pertanyaan, tetapi tidak dapat menjawab hal yang memang belum pernah
 * ditulis sekolah — "apakah ada asrama", "seragam beli di mana". Daftar di
 * sini adalah permintaan yang datang dari orang sungguhan, terurut menurut
 * berapa banyak yang menanyakannya.
 *
 * Yang tersimpan hanya kalimat pertanyaannya. Tidak ada alamat IP, tidak
 * ada pengenal peramban.
 */

const KEPALA = ["Pertanyaan", "Ditanyakan", "Terakhir", ""];

export default function HalamanTanyaBuntu() {
  const kabar = useKabar();
  const router = useRouter();
  const [semua, setSemua] = useState(false);
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.tanyaBuntu(semua ? "?semua=1" : ""),
    [semua],
  );
  const [hapusTarget, setHapusTarget] = useState<TanyaBuntu | null>(null);

  async function tandai(t: TanyaBuntu) {
    try {
      const hasil = await api.tandaiTanyaBuntu(t.id);
      kabar.beri(hasil.pesan);
      muatUlang();
    } catch (e) {
      kabar.beri(
        e instanceof GalatApi ? e.message : "Gagal menandai.",
        "galat",
      );
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    try {
      const hasil = await api.hapusTanyaBuntu(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      kabar.beri(
        e instanceof GalatApi ? e.message : "Gagal menghapus.",
        "galat",
      );
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Pertanyaan Belum Terjawab"
        keterangan="Pertanyaan yang diketik pengunjung di kotak Tanya cepat, tetapi belum ada jawabannya. Yang paling sering ditanyakan berada di atas. Menambahkannya ke Tanya Jawab berarti sekali tulis, terjawab selamanya."
      />

      <div className="mb-5 rounded-lg border border-garis bg-slate-50 px-5 py-4 text-sm leading-relaxed text-samar">
        Yang tersimpan di sini{" "}
        <strong className="text-teks">hanya kalimat pertanyaannya</strong> —
        tanpa alamat IP, tanpa pengenal peramban, dan tanpa apa pun yang
        menunjuk penanyanya. Bila ada yang telanjur mengetikkan data pribadi ke
        dalam pertanyaannya, hapus barisnya.
      </div>

      <div className="mb-5">
        <Centang nama="semua" nilai={semua} ubah={setSemua}>
          Tampilkan juga yang sudah ditangani
        </Centang>
      </div>

      {memuat ? (
        <KerangkaTabel kepala={KEPALA} baris={5} />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada pertanyaan yang gagal dijawab"
          keterangan="Daftar ini terisi sendiri saat pengunjung menanyakan sesuatu yang belum ada jawabannya di menu Tanya Jawab."
        />
      ) : (
        <Tabel kepala={KEPALA}>
          {data.data.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p
                  className={
                    t.ditangani ? "text-samar line-through" : "font-medium"
                  }
                >
                  {t.pertanyaan}
                </p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Lencana jenis={t.jumlah >= 3 ? "emas" : "abu"}>
                  {t.jumlah}&times;
                </Lencana>
              </td>
              <td className="px-4 py-3 text-xs whitespace-nowrap text-samar">
                {tanggalJam(t.terakhir)}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {/* Pertanyaannya dibawa ke halaman Tanya Jawab lewat alamat,
                    supaya panitia tidak perlu mengetik ulang kalimat yang
                    sudah ada di layar. */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/faq?tanya=${encodeURIComponent(t.pertanyaan)}`,
                    )
                  }
                  className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                >
                  Jadikan Tanya Jawab
                </button>
                {!t.ditangani && (
                  <button
                    type="button"
                    onClick={() => tandai(t)}
                    className="ml-2 rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold text-samar hover:bg-slate-50"
                  >
                    Tandai selesai
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHapusTarget(t)}
                  className="ml-2 rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      <Konfirmasi
        terbuka={hapusTarget !== null}
        judul="Hapus pertanyaan ini?"
        pesan={`"${hapusTarget?.pertanyaan ?? ""}" akan dihapus dari daftar. Bila pengunjung menanyakannya lagi, barisnya muncul kembali.`}
        labelYa="Ya, hapus"
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
      />
    </>
  );
}

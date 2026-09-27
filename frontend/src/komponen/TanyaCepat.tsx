"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IkonPanahKanan } from "./Ikon";
import {
  bangunPengetahuan,
  cariJawaban,
  pertanyaanPancingan,
  type ButirPengetahuan,
} from "@/lib/jawab";
import type { Faq, Jurusan, KeadaanPpdb, Pengaturan } from "@/lib/tipe";
import { api } from "@/lib/api";

/**
 * Kotak "Tanya cepat" di dalam panel bantuan melayang.
 *
 * Bukan chatbot yang mengarang. Seluruh jawabannya kalimat yang memang
 * ditulis panitia di menu Tanya Jawab, atau nilai yang memang ada di basis
 * data — jadwal, kuota, biaya, peminatan, alamat. Alasannya ada di
 * lib/jawab.ts; ringkasnya, yang paling sering ditanyakan orang tua adalah
 * tanggal dan biaya, dan jawaban yang salah di situ merugikan orang
 * sungguhan.
 *
 * Bila tidak menemukan, ia mengatakan tidak tahu lalu mengarahkan ke
 * panitia. Itu bukan kegagalan; itu perilaku yang diinginkan. Kotak yang
 * memaksakan jawaban terdekat justru menyesatkan.
 *
 * Seluruhnya berjalan di peramban: tidak ada panggilan jaringan, tidak ada
 * kunci API, tidak ada pertanyaan pengunjung yang keluar ke mana pun.
 */

interface Percakapan {
  id: number;
  dari: "orang" | "sistem";
  teks: string;
  butir?: ButirPengetahuan;
  /** Butir lain yang mungkin dimaksud, bila nilainya berdekatan. */
  lain?: ButirPengetahuan[];
  /** Tidak menemukan jawaban; pengarahan ke panitia ditampilkan. */
  buntu?: boolean;
}

export default function TanyaCepat({
  faq,
  pengaturan,
  ppdb,
  jurusan,
  tutupPanel,
}: {
  faq: Faq[];
  pengaturan: Pengaturan;
  ppdb: KeadaanPpdb;
  jurusan: Jurusan[];
  tutupPanel: () => void;
}) {
  const pengetahuan = useMemo(
    () => bangunPengetahuan(faq, pengaturan, ppdb, jurusan),
    [faq, pengaturan, ppdb, jurusan],
  );
  const pancingan = useMemo(
    () => pertanyaanPancingan(pengetahuan),
    [pengetahuan],
  );

  const [riwayat, setRiwayat] = useState<Percakapan[]>([]);
  const [ketikan, setKetikan] = useState("");
  const nomor = useRef(0);
  const bawah = useRef<HTMLDivElement>(null);
  const medan = useRef<HTMLInputElement>(null);

  // Gulir ke bawah setiap ada jawaban baru, tetapi tidak saat kotaknya
  // masih kosong — menggulir halaman yang belum berisi apa-apa terasa
  // seperti kerusakan.
  useEffect(() => {
    if (riwayat.length > 0) bawah.current?.scrollIntoView({ block: "end" });
  }, [riwayat]);

  function tanya(teks: string) {
    const bersih = teks.trim();
    if (!bersih) return;

    const hasil = cariJawaban(bersih, pengetahuan);
    const n = nomor.current;
    nomor.current += 2;

    // Pertanyaan yang tidak terjawab dicatat ke server sekolah, supaya
    // panitia melihat apa yang sebenarnya ingin diketahui orang dan dapat
    // menambahkannya ke Tanya Jawab. Sekali kirim, tanpa menunggu, dan
    // kegagalannya diabaikan: pengunjung tidak meminta apa pun dicatat.
    if (hasil.length === 0) void api.catatTanyaBuntu(bersih);

    const balasan: Percakapan =
      hasil.length === 0
        ? {
            id: n + 1,
            dari: "sistem",
            teks: "Maaf, pertanyaan itu belum ada jawabannya di sini. Supaya tidak salah keterangan, sebaiknya ditanyakan langsung ke panitia.",
            buntu: true,
          }
        : {
            id: n + 1,
            dari: "sistem",
            teks: hasil[0].butir.jawab,
            butir: hasil[0].butir,
            // Hanya ditawarkan bila nilainya memang berdekatan. Menawarkan
            // butir yang jauh lebih lemah membuat jawaban utamanya
            // terlihat ragu-ragu padahal tidak.
            lain: hasil
              .slice(1)
              .filter((h) => h.nilai >= hasil[0].nilai * 0.75)
              .map((h) => h.butir),
          };

    setRiwayat((r) => [...r, { id: n, dari: "orang", teks: bersih }, balasan]);
    setKetikan("");
    medan.current?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ---------- percakapan ---------- */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {riwayat.length === 0 ? (
          <>
            <p className="text-xs leading-relaxed text-samar">
              Ketik pertanyaan Anda, atau pilih salah satu di bawah. Tanggal,
              kuota, dan biaya diambil langsung dari data sekolah, jadi selalu
              yang terbaru. Yang belum ada jawabannya akan dikatakan apa adanya,
              bukan dikira-kira.
            </p>
            <ul className="space-y-1.5">
              {pancingan.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => tanya(t)}
                    className="flex w-full items-start gap-2 rounded-lg border border-garis bg-white px-3 py-2 text-left text-xs leading-relaxed font-medium text-teks transition hover:border-biru hover:bg-biru-muda/50 hover:text-biru"
                  >
                    <IkonPanahKanan
                      ukuran={13}
                      className="mt-0.5 shrink-0 text-biru"
                    />
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          riwayat.map((b) =>
            b.dari === "orang" ? (
              <p
                key={b.id}
                className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-biru-tua px-3.5 py-2 text-xs leading-relaxed font-medium text-white"
              >
                {b.teks}
              </p>
            ) : (
              <div key={b.id} className="max-w-[92%]">
                <div className="w-fit rounded-xl rounded-bl-sm bg-biru-muda px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line text-teks">
                  {b.teks}
                </div>

                {b.butir?.tautan &&
                  (b.butir.tautan.luar ? (
                    <a
                      href={b.butir.tautan.jalur}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-biru hover:text-biru-tua"
                    >
                      {b.butir.tautan.label}
                      <IkonPanahKanan ukuran={12} className="shrink-0" />
                    </a>
                  ) : (
                    <Link
                      href={b.butir.tautan.jalur}
                      onClick={tutupPanel}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-biru hover:text-biru-tua"
                    >
                      {b.butir.tautan.label}
                      <IkonPanahKanan ukuran={12} className="shrink-0" />
                    </Link>
                  ))}

                {b.lain && b.lain.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold tracking-wide text-samar uppercase">
                      Mungkin ini juga
                    </p>
                    <ul className="mt-1 space-y-1">
                      {b.lain.map((l) => (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => tanya(l.tanya)}
                            className="text-left text-xs leading-relaxed font-medium text-biru hover:text-biru-tua hover:underline"
                          >
                            {l.tanya}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {b.buntu && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href="/kontak"
                      onClick={tutupPanel}
                      className="rounded-lg bg-biru px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-biru-tua"
                    >
                      Kirim pertanyaan ke panitia
                    </Link>
                    <Link
                      href="/faq"
                      onClick={tutupPanel}
                      className="rounded-lg border border-garis bg-white px-3 py-1.5 text-xs font-semibold text-teks transition hover:border-biru hover:text-biru"
                    >
                      Telusuri semua Tanya Jawab
                    </Link>
                    <p className="w-full text-[11px] leading-relaxed text-samar">
                      Pertanyaan ini dicatat untuk panitia supaya dapat dijawab
                      lain kali. Yang tersimpan hanya kalimatnya.
                    </p>
                  </div>
                )}
              </div>
            ),
          )
        )}
        <div ref={bawah} />
      </div>

      {/* ---------- medan ketik ---------- */}
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          tanya(ketikan);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-garis bg-slate-50 px-4 py-3"
      >
        <input
          ref={medan}
          id="tanya-cepat"
          name="tanya-cepat"
          value={ketikan}
          onChange={(ev) => setKetikan(ev.target.value)}
          placeholder="Tulis pertanyaan…"
          aria-label="Tulis pertanyaan"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-garis bg-white px-3 py-2 text-xs text-teks outline-none focus:border-biru focus:ring-2 focus:ring-biru/20"
        />
        <button
          type="submit"
          disabled={!ketikan.trim()}
          className="shrink-0 rounded-lg bg-biru px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-biru-tua disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tanya
        </button>
      </form>
    </div>
  );
}

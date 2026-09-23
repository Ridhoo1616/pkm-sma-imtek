"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { Teks, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { PesanGalat } from "@/komponen/Memuat";
import type { HasilUjian, SoalPeserta } from "@/lib/tipe";

/**
 * Tes seleksi online.
 *
 * Tiga hal yang menentukan bentuk komponen ini.
 *
 * 1. Penghitung waktu di layar hanyalah tampilan. Yang menentukan adalah
 *    batas waktu di server; server menolak jawaban yang datang sesudahnya.
 *    Sisa waktu diselaraskan ulang dari setiap jawaban yang tersimpan,
 *    sehingga jam peserta yang salah tidak mengubah apa pun.
 *
 * 2. Jawaban dikirim satu per satu begitu dipilih, bukan dikumpulkan lalu
 *    dikirim di akhir. Kalau baterainya habis atau jaringannya putus di
 *    tengah jalan, yang sudah dijawab tetap tersimpan.
 *
 * 3. Token peserta disimpan di sessionStorage, bukan localStorage. Umurnya
 *    memang sependek sesi ujian, dan menyimpannya lebih lama hanya menambah
 *    peluang tertinggal di komputer bersama, misalnya di warnet.
 */

const KUNCI_SESI = "pkm_ujian";

interface Sesi {
  token: string;
  batasPada: string;
  namaPaket: string;
  namaPeserta: string;
  noRegistrasi: string;
}

function simpanSesi(s: Sesi | null) {
  try {
    if (s) window.sessionStorage.setItem(KUNCI_SESI, JSON.stringify(s));
    else window.sessionStorage.removeItem(KUNCI_SESI);
  } catch {
    // Penyimpanan bisa diblokir. Ujian tetap berjalan, hanya tidak dapat
    // dilanjutkan otomatis bila halamannya dimuat ulang.
  }
}

function bacaSesi(): Sesi | null {
  try {
    const t = window.sessionStorage.getItem(KUNCI_SESI);
    return t ? (JSON.parse(t) as Sesi) : null;
  } catch {
    return null;
  }
}

function jamMundur(detik: number): string {
  const d = Math.max(0, Math.floor(detik));
  const m = Math.floor(d / 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}

export default function Ujian() {
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const [soal, setSoal] = useState<SoalPeserta[]>([]);
  const [nomor, setNomor] = useState(0);
  const [sisa, setSisa] = useState(0);
  const [hasil, setHasil] = useState<HasilUjian | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [sedangKirim, setSedangKirim] = useState(false);

  /* ---------- masuk ---------- */
  const [isi, setIsi] = useState({ no_registrasi: "", tanggal_lahir: "" });
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [daftarGalat, setDaftarGalat] = useState<string[]>([]);

  const muatSoal = useCallback(async (token: string) => {
    const d = await api.soalUjian(token);
    if (d.selesai) {
      setHasil(d.hasil ?? null);
      setSoal([]);
      simpanSesi(null);
      return;
    }
    setSoal(d.soal ?? []);
    setSisa(d.sisa_detik ?? 0);
  }, []);

  // Sesi yang masih tersimpan dilanjutkan tanpa perlu mengetik ulang.
  //
  // Seluruh perubahan keadaan di sini terjadi sesudah await, bukan langsung
  // di badan efeknya. Menyetel keadaan secara langsung di dalam efek memicu
  // render berantai, dan React Compiler memang melarangnya.
  useEffect(() => {
    let dibatalkan = false;

    (async () => {
      const s = bacaSesi();
      if (!s) {
        await Promise.resolve();
        if (!dibatalkan) setMemuat(false);
        return;
      }
      try {
        await muatSoal(s.token);
        if (!dibatalkan) setSesi(s);
      } catch {
        // Token yang sudah tidak berlaku tidak perlu dijelaskan panjang
        // lebar: peserta cukup diminta masuk lagi.
        simpanSesi(null);
        if (!dibatalkan) setSesi(null);
      } finally {
        if (!dibatalkan) setMemuat(false);
      }
    })();

    return () => {
      dibatalkan = true;
    };
  }, [muatSoal]);

  const selesaikan = useCallback(
    async (token: string, otomatis: boolean) => {
      setSedangKirim(true);
      try {
        const d = await api.selesaikanUjian(token);
        setHasil(d.hasil);
        setSoal([]);
        simpanSesi(null);
        setSesi(null);
      } catch (e) {
        setGalat(
          e instanceof GalatApi
            ? e.message
            : otomatis
              ? "Waktu habis, tetapi hasil belum dapat diambil. Muat ulang halaman ini."
              : "Ujian belum dapat diselesaikan. Coba lagi.",
        );
      } finally {
        setSedangKirim(false);
      }
    },
    [],
  );

  // Penghitung mundur. Saat mencapai nol, ujian diselesaikan sendiri supaya
  // jawaban yang sudah diisi tetap dinilai, bukan hangus.
  const sudahOtomatis = useRef(false);
  useEffect(() => {
    if (!sesi || hasil) return;
    const id = window.setInterval(() => {
      setSisa((s) => {
        const baru = s - 1;
        if (baru <= 0 && !sudahOtomatis.current) {
          sudahOtomatis.current = true;
          void selesaikan(sesi.token, true);
        }
        return baru;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [sesi, hasil, selesaikan]);

  async function mulai(ev: React.FormEvent) {
    ev.preventDefault();
    setGalatKolom({});
    setDaftarGalat([]);
    setGalat("");
    setSedangKirim(true);
    try {
      const d = await api.mulaiUjian(isi);
      if (d.sudah_selesai) {
        setHasil(d.hasil ?? null);
        return;
      }
      const s: Sesi = {
        token: d.token!,
        batasPada: d.sesi!.batas_pada,
        namaPaket: d.sesi!.nama_paket,
        namaPeserta: d.sesi!.nama_peserta,
        noRegistrasi: d.sesi!.no_registrasi,
      };
      simpanSesi(s);
      setSesi(s);
      setSisa(d.sesi!.sisa_detik);
      await muatSoal(s.token);
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setDaftarGalat(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setGalat("Tidak dapat menghubungi server.");
      }
    } finally {
      setSedangKirim(false);
    }
  }

  async function jawab(soalID: number, huruf: string) {
    if (!sesi) return;
    // Tampilan diubah lebih dulu supaya terasa tanggap, lalu dikirim. Bila
    // pengirimannya gagal, pilihannya dikembalikan dan peserta diberi tahu.
    const sebelum = soal;
    setSoal((s) =>
      s.map((x) => (x.soal_id === soalID ? { ...x, jawaban: huruf } : x)),
    );
    try {
      const d = await api.jawabUjian(sesi.token, { soal_id: soalID, jawaban: huruf });
      setSisa(d.sisa_detik);
      setGalat("");
    } catch (e) {
      setSoal(sebelum);
      setGalat(
        e instanceof GalatApi
          ? e.message
          : "Jawaban belum tersimpan karena jaringan terputus. Coba pilih lagi.",
      );
    }
  }

  if (memuat) {
    return <p className="py-10 text-center text-sm text-samar">Menyiapkan…</p>;
  }

  /* ---------- hasil ---------- */
  if (hasil) {
    return (
      <div className="kartu overflow-hidden">
        <div className="border-b border-garis bg-biru-muda px-6 py-5">
          <p className="text-xs font-semibold tracking-wide text-samar uppercase">
            Hasil tes seleksi
          </p>
          <p className="mt-0.5 text-lg font-bold text-biru-tua">{hasil.nama_paket}</p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs text-samar">Nilai</p>
              <p className="text-4xl font-bold text-biru-tua tabular-nums">
                {hasil.skor.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-samar">Jawaban benar</p>
              <p className="text-xl font-semibold text-teks tabular-nums">
                {hasil.jumlah_benar} dari {hasil.jumlah_soal}
              </p>
            </div>
            <div>
              <p className="text-xs text-samar">Nilai minimum</p>
              <p className="text-xl font-semibold text-teks tabular-nums">
                {hasil.nilai_minimum}
              </p>
            </div>
          </div>

          <p
            className={
              "rounded-lg px-5 py-4 text-sm leading-relaxed " +
              (hasil.lulus
                ? "bg-green-50 text-green-800"
                : "bg-amber-50 text-amber-900")
            }
          >
            {hasil.status === "Kedaluwarsa"
              ? "Waktu pengerjaan habis, dan jawaban yang sudah terisi tetap dinilai. "
              : ""}
            {hasil.lulus
              ? "Nilai Anda memenuhi batas minimum tes seleksi. Hasil akhir penerimaan tetap diumumkan panitia, karena nilai tes bukan satu-satunya pertimbangan."
              : "Nilai Anda belum memenuhi batas minimum. Keputusan penerimaan tetap di tangan panitia, dan akan diumumkan lewat halaman Cek Status."}
          </p>

          <p className="text-xs leading-relaxed text-samar">
            Nilai ini juga dapat dilihat kapan saja di halaman Cek Status
            memakai nomor registrasi dan tanggal lahir Anda.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- masuk ---------- */
  if (!sesi) {
    return (
      <form onSubmit={mulai} className="kartu space-y-5 p-6">
        {daftarGalat.length > 0 && <RingkasanGalat daftar={daftarGalat} />}
        {galat && <PesanGalat pesan={galat} />}

        <p className="text-sm leading-relaxed text-samar">
          Masuk memakai nomor registrasi dan tanggal lahir, sama seperti pada
          halaman Cek Status. Waktu mulai berjalan begitu Anda menekan tombol di
          bawah, jadi pastikan perangkat dan jaringan Anda siap.
        </p>

        <Teks
          nama="no_registrasi"
          label="Nomor registrasi"
          wajib
          nilai={isi.no_registrasi}
          ubah={(v) => setIsi((s) => ({ ...s, no_registrasi: v }))}
          galat={galatKolom.no_registrasi}
          contoh="PPDB-2728-0001"
        />
        <Teks
          nama="tanggal_lahir"
          label="Tanggal lahir"
          tipe="date"
          wajib
          nilai={isi.tanggal_lahir}
          ubah={(v) => setIsi((s) => ({ ...s, tanggal_lahir: v }))}
          galat={galatKolom.tanggal_lahir}
        />
        <Tombol type="submit" sedangJalan={sedangKirim}>
          {sedangKirim ? "Menyiapkan…" : "Mulai Tes Seleksi"}
        </Tombol>
      </form>
    );
  }

  /* ---------- mengerjakan ---------- */
  const kini = soal[nomor];
  const terjawab = soal.filter((s) => s.jawaban).length;
  const hampirHabis = sisa <= 300;

  return (
    <div className="space-y-5">
      {/* Bilah waktu menempel di atas supaya sisa waktu selalu terlihat
          tanpa perlu menggulir ke atas. */}
      <div className="sticky top-16 z-30 rounded-kartu border border-garis bg-white px-5 py-3 shadow-lembut">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-samar">{sesi.namaPaket}</p>
            <p className="text-sm font-semibold text-teks">
              {sesi.namaPeserta} · {sesi.noRegistrasi}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-samar">Sisa waktu</p>
            <p
              className={
                "text-2xl font-bold tabular-nums " +
                (hampirHabis ? "text-red-600" : "text-biru-tua")
              }
              aria-live={hampirHabis ? "polite" : "off"}
            >
              {jamMundur(sisa)}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-biru-muda">
            <div
              className="h-full rounded-full bg-biru transition-[width] duration-300"
              style={{ width: `${(terjawab / Math.max(soal.length, 1)) * 100}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-samar tabular-nums">
            {terjawab}/{soal.length} terjawab
          </p>
        </div>
      </div>

      {galat && <PesanGalat pesan={galat} />}

      {/* Petak nomor soal. Warna menandai yang sudah dijawab, sehingga
          peserta tahu mana yang masih kosong tanpa membukanya satu per satu. */}
      <div className="kartu p-4">
        <div className="flex flex-wrap gap-2">
          {soal.map((s, i) => (
            <button
              key={s.soal_id}
              type="button"
              onClick={() => setNomor(i)}
              aria-current={i === nomor ? "true" : undefined}
              aria-label={`Soal nomor ${i + 1}${s.jawaban ? ", sudah dijawab" : ", belum dijawab"}`}
              className={
                "h-9 w-9 rounded-lg text-sm font-semibold transition " +
                (i === nomor
                  ? "bg-biru-tua text-white"
                  : s.jawaban
                    ? "bg-biru-muda text-biru"
                    : "border border-garis text-samar hover:border-biru hover:text-biru")
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {kini && (
        <div className="kartu overflow-hidden">
          <div className="border-b border-garis bg-biru-muda px-6 py-3">
            <p className="text-xs font-semibold tracking-wide text-samar uppercase">
              Soal {nomor + 1} dari {soal.length} · {kini.mata_pelajaran}
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-teks">
              {kini.pertanyaan}
            </p>

            <fieldset className="space-y-2.5">
              <legend className="sr-only">Pilihan jawaban</legend>
              {kini.pilihan.map((p) => (
                <label
                  key={p.huruf}
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-[15px] transition " +
                    (kini.jawaban === p.huruf
                      ? "border-biru bg-biru-muda text-biru-tua"
                      : "border-garis hover:border-biru hover:bg-biru-muda/40")
                  }
                >
                  <input
                    type="radio"
                    name={`soal-${kini.soal_id}`}
                    value={p.huruf}
                    checked={kini.jawaban === p.huruf}
                    onChange={() => jawab(kini.soal_id, p.huruf)}
                    className="mt-1"
                  />
                  <span>
                    <strong className="mr-1.5">{p.huruf}.</strong>
                    {p.teks}
                  </span>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-garis px-6 py-4">
            <Tombol
              type="button"
              jenis="kedua"
              onClick={() => setNomor((n) => Math.max(0, n - 1))}
              disabled={nomor === 0}
            >
              ← Sebelumnya
            </Tombol>
            {nomor < soal.length - 1 ? (
              <Tombol type="button" onClick={() => setNomor((n) => n + 1)}>
                Selanjutnya →
              </Tombol>
            ) : (
              <Tombol
                type="button"
                sedangJalan={sedangKirim}
                onClick={() => {
                  const belum = soal.length - terjawab;
                  const pesan =
                    belum > 0
                      ? `Masih ada ${belum} soal yang belum dijawab. Selesaikan ujian sekarang?`
                      : "Selesaikan ujian sekarang? Jawaban tidak dapat diubah lagi.";
                  if (window.confirm(pesan)) void selesaikan(sesi.token, false);
                }}
              >
                Selesaikan Ujian
              </Tombol>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-xs leading-relaxed text-samar">
        Setiap jawaban langsung tersimpan begitu dipilih. Bila halaman tertutup,
        ujian dapat dilanjutkan selama waktunya belum habis.
      </p>
    </div>
  );
}

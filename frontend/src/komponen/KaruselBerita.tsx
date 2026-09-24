"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { urlUnggahan } from "@/lib/api";
import { tanggalPanjang } from "@/lib/format";
import { IkonPanahKiri, IkonPanahKanan } from "@/komponen/Ikon";
import type { Berita } from "@/lib/tipe";

/**
 * Berita dan pengumuman di beranda, sebagai karusel foto berlatar gelap.
 *
 * Susunannya mengikuti rancangan yang diminta: satu foto besar di tengah,
 * tetangganya mengintip di kiri dan kanan, tombol panah pada kedua tepinya,
 * judul beserta tanggalnya di bawah, dan titik penanda di ujung.
 *
 * TIDAK BERJALAN SENDIRI. Karusel yang berpindah otomatis memindahkan bacaan
 * orang yang sedang membacanya, dan pengunjung yang memakai pembaca layar
 * maupun yang lambat membaca paling dirugikan. Perpindahannya karena ditekan:
 * tombol panah, titik penanda, tombol panah papan ketik, atau geseran jari.
 *
 * Tetangga yang mengintip diberi aria-hidden dan tidak dapat ditekan. Ia
 * hiasan yang menerangkan bahwa daftarnya bisa digeser; isi yang sungguhan —
 * judul, tanggal, dan tautannya — hanya satu, milik foto yang sedang di
 * tengah, sehingga pembaca layar tidak membacakan tiga berita sekaligus dan
 * papan ketik tidak berhenti di tautan yang tidak terlihat.
 */
/**
 * Foto satu berita. Dideklarasikan di tingkat modul, bukan di dalam
 * komponen karuselnya: komponen yang dibuat ulang setiap render akan dilepas
 * dan dipasang ulang oleh React, sehingga gambarnya dimuat lagi dari awal
 * setiap kali karuselnya berpindah.
 */
function Foto({ b, kelas }: { b: Berita; kelas: string }) {
  if (b.gambar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={urlUnggahan("berita", b.gambar)}
        alt={b.judul}
        className={kelas + " object-cover"}
        loading="lazy"
        decoding="async"
      />
    );
  }
  // Berita tanpa gambar tetap boleh masuk karusel: yang tampil bidang biru
  // bertuliskan kategorinya, bukan kotak kosong maupun foto karangan.
  return (
    <span
      className={
        kelas +
        " grid place-items-center bg-gradient-to-br from-biru to-biru-tua px-4 text-center text-sm font-semibold text-white/75"
      }
    >
      {b.kategori}
    </span>
  );
}

export default function KaruselBerita({ daftar }: { daftar: Berita[] }) {
  const [indeks, setIndeks] = useState(0);
  const wadah = useRef<HTMLDivElement>(null);
  const sentuhX = useRef<number | null>(null);

  const jumlah = daftar.length;
  // Modulo yang tetap benar untuk bilangan negatif: (-1 % 5) di JavaScript
  // menghasilkan -1, bukan 4, sehingga tombol "sebelumnya" pada butir
  // pertama akan menunjuk ke luar daftar.
  const putar = useCallback(
    (n: number) => ((n % jumlah) + jumlah) % jumlah,
    [jumlah],
  );
  const ke = useCallback((n: number) => setIndeks(putar(n)), [putar]);

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const papan = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndeks((i) => putar(i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndeks((i) => putar(i + 1));
      }
    };
    el.addEventListener("keydown", papan);
    return () => el.removeEventListener("keydown", papan);
  }, [putar]);

  if (jumlah === 0) return null;

  const aktif = daftar[indeks];
  const sebelum = daftar[putar(indeks - 1)];
  const sesudah = daftar[putar(indeks + 1)];

  return (
    <section
      aria-roledescription="karusel"
      aria-label="Berita dan pengumuman terbaru"
      className="relative overflow-hidden bg-biru-tua text-white"
    >
      {/* Latar: foto yang sedang di tengah, diburamkan dan digelapkan. Bukan
          sekadar hiasan — ia yang membuat warna seluruh bagian ini mengikuti
          fotonya, seperti pada rancangan acuan. Diberi aria-hidden karena
          fotonya sudah tampil utuh di tengah. */}
      <div aria-hidden className="absolute inset-0">
        {aktif.gambar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlUnggahan("berita", aktif.gambar)}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-35 blur-2xl"
          />
        )}
        <div className="absolute inset-0 bg-biru-tua/75" />
      </div>

      <div
        ref={wadah}
        tabIndex={-1}
        className="wadah relative py-16 outline-none md:py-20"
      >
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.18em] text-emas uppercase">
            Kabar Sekolah
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            Berita &amp; Pengumuman
          </h2>
          <span
            aria-hidden
            className="mx-auto mt-3 block h-1 w-16 rounded-full bg-emas"
          />
        </div>

        {/* Petak tiga kolom: tetangga kiri, foto tengah, tetangga kanan. Di
            layar sempit yang tampil hanya yang tengah — tetangga selebar
            seperlima layar ponsel tidak terbaca sebagai foto, hanya sebagai
            pita berwarna yang menyempitkan yang utama. */}
        <div
          className="relative mt-10 flex items-center justify-center gap-4"
          onTouchStart={(e) => {
            sentuhX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (sentuhX.current === null) return;
            const geser = e.changedTouches[0].clientX - sentuhX.current;
            sentuhX.current = null;
            // 48 piksel: cukup jauh untuk membedakan geseran dari ketukan
            // yang jarinya sedikit bergerak.
            if (Math.abs(geser) > 48) ke(indeks + (geser < 0 ? 1 : -1));
          }}
        >
          {jumlah > 1 && (
            <div
              aria-hidden
              className="hidden w-[22%] shrink-0 overflow-hidden rounded-2xl opacity-45 lg:block"
            >
              <Foto b={sebelum} kelas="aspect-[4/3] w-full" />
            </div>
          )}

          <div className="relative min-w-0 flex-1 lg:max-w-[52%]">
            <Link
              href={`/berita/${aktif.slug}`}
              className="block overflow-hidden rounded-2xl border-4 border-white/85 shadow-kuat transition hover:border-white"
            >
              <Foto b={aktif} kelas="aspect-[16/10] w-full" />
            </Link>

            {jumlah > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => ke(indeks - 1)}
                  aria-label="Berita sebelumnya"
                  className="absolute top-1/2 left-0 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-biru text-white shadow-kuat transition hover:bg-white hover:text-biru-tua"
                >
                  <IkonPanahKiri ukuran={20} />
                </button>
                <button
                  type="button"
                  onClick={() => ke(indeks + 1)}
                  aria-label="Berita berikutnya"
                  className="absolute top-1/2 right-0 grid h-11 w-11 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-biru text-white shadow-kuat transition hover:bg-white hover:text-biru-tua"
                >
                  <IkonPanahKanan ukuran={20} />
                </button>
              </>
            )}
          </div>

          {jumlah > 1 && (
            <div
              aria-hidden
              className="hidden w-[22%] shrink-0 overflow-hidden rounded-2xl opacity-45 lg:block"
            >
              <Foto b={sesudah} kelas="aspect-[4/3] w-full" />
            </div>
          )}
        </div>

        {/* Judul beserta tanggalnya. aria-live supaya pembaca layar
            menyuarakan berita yang baru muncul tanpa pemakainya harus
            mencari sendiri ke mana karuselnya berpindah. */}
        <div aria-live="polite" className="mx-auto mt-7 max-w-2xl text-center">
          <p className="text-[11px] font-bold tracking-[0.14em] text-emas uppercase">
            {aktif.kategori}
          </p>
          <h3 className="mt-2 text-lg leading-snug font-bold text-balance text-white md:text-xl">
            <Link href={`/berita/${aktif.slug}`} className="hover:underline">
              {aktif.judul}
            </Link>
          </h3>
          <p className="mt-2 text-sm text-white/70">
            {tanggalPanjang(aktif.dibuat)}
          </p>
        </div>

        {jumlah > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {daftar.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => ke(i)}
                aria-label={`Berita ${i + 1} dari ${jumlah}: ${b.judul}`}
                aria-current={i === indeks}
                className={
                  "h-2 rounded-full transition " +
                  (i === indeks
                    ? "w-7 bg-emas"
                    : "w-2 bg-white/40 hover:bg-white/70")
                }
              />
            ))}
          </div>
        )}

        <div className="mt-9 text-center">
          <Link
            href="/berita"
            className="inline-flex rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-biru-tua"
          >
            Semua berita
          </Link>
        </div>
      </div>
    </section>
  );
}

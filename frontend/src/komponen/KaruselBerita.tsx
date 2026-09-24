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
 * Seluruh berita berjajar pada satu rel, dan yang berpindah posisi relnya —
 * itulah yang membuat pergeserannya mengalir alih-alih berkedip.
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

  /**
   * Isi rel: salinan butir TERAKHIR di kepala, seluruh daftarnya, lalu
   * salinan butir PERTAMA di ekor.
   *
   * Gunanya supaya tetangga yang mengintip selalu ada di kedua sisi. Tanpa
   * itu, pada butir pertama sisi kirinya kosong dan pada butir terakhir sisi
   * kanannya kosong — dan karena tombolnya berputar ke ujung yang lain,
   * kekosongan itu terbaca sebagai cacat, bukan sebagai tanda "sudah di
   * ujung".
   *
   * Keduanya semata hiasan: disembunyikan dari pembaca layar, dilepas dari
   * urutan papan ketik, dan tidak dapat ditekan. Karena itu letak butir yang
   * sedang aktif pada rel ini indeks + 1, bukan indeks.
   */
  const rel =
    jumlah > 1
      ? [
          { b: daftar[jumlah - 1], kunci: "ujung-awal", ujung: true },
          ...daftar.map((b) => ({ b, kunci: String(b.id), ujung: false })),
          { b: daftar[0], kunci: "ujung-akhir", ujung: true },
        ]
      : [{ b: daftar[0], kunci: String(daftar[0].id), ujung: false }];
  const letak = jumlah > 1 ? indeks + 1 : 0;

  return (
    <section
      aria-roledescription="karusel"
      aria-label="Berita dan pengumuman terbaru"
      className="relative overflow-hidden bg-biru-tua text-white"
    >
      {/* Latar: foto yang sedang di tengah, diburamkan dan digelapkan. Bukan
          sekadar hiasan — ia yang membuat warna seluruh bagian ini mengikuti
          fotonya, seperti pada rancangan acuan.

          Keenamnya dirender sekaligus lalu yang aktif saja yang dibuat
          tampak, supaya pergantiannya memudar, bukan berkedip. Alamatnya sama
          dengan foto di relnya, jadi peramban memakai berkas yang sudah
          diambilnya, bukan mengunduh dua kali. */}
      <div aria-hidden className="absolute inset-0">
        {daftar.map((b, i) =>
          b.gambar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={b.id}
              src={urlUnggahan("berita", b.gambar)}
              alt=""
              className={
                "absolute inset-0 h-full w-full scale-110 object-cover blur-2xl transition-opacity duration-700 " +
                (i === indeks ? "opacity-35" : "opacity-0")
              }
            />
          ) : null,
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

        {/* Rel yang digeser, bukan satu foto yang ditukar.

            Seluruh berita berjajar pada satu rel, dan yang berpindah posisi
            relnya — itulah yang membuat pergeserannya terlihat mengalir.
            Sebelumnya hanya foto tengahnya yang ditukar sumbernya, sehingga
            perpindahannya berkedip tanpa arah.

            Perhitungan geserannya MEMAKAI SATUAN cqw, bukan persen dan bukan
            piksel hasil pengukuran JavaScript. Persen tidak bisa: pada
            transform, persen dihitung dari lebar elemen yang digeser — yaitu
            seluruh rel — bukan dari lebar jendela pandangnya. Mengukur dengan
            JavaScript bisa, tetapi berarti lebar barunya baru diketahui
            sesudah halaman terpasang, sehingga yang dikirim server tampil
            kacau sekejap. `cqw` dihitung dari lebar wadah yang ditandai
            @container, jadi seluruhnya selesai di CSS dan benar sejak lukisan
            pertama.

            Lebar satu butir disimpan pada --w supaya rumus geserannya dan
            letak tombol panahnya membaca angka yang sama. */}
        <div className="@container relative mt-10 [--g:0.75rem] [--w:100cqw] lg:[--w:52cqw]">
          <div
            className="overflow-hidden"
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
            <div
              className="flex gap-[var(--g)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
              style={{
                transform: `translateX(calc(50cqw - ${letak} * (var(--w) + var(--g)) - var(--w) / 2))`,
              }}
            >
              {rel.map(({ b, kunci, ujung }, i) => {
                const ini = !ujung && i === letak;
                return (
                  <div
                    key={kunci}
                    className={
                      "w-[var(--w)] shrink-0 transition duration-500 " +
                      (ini ? "opacity-100" : "scale-95 opacity-45")
                    }
                  >
                    {/* Yang bukan di tengah disembunyikan dari pembaca layar
                        dan dilepas dari urutan papan ketik: ia hiasan yang
                        menerangkan bahwa daftarnya bisa digeser, sedangkan
                        isi yang sungguhan — judul, tanggal, tautan — hanya
                        satu, milik yang di tengah. */}
                    <Link
                      href={`/berita/${b.slug}`}
                      aria-hidden={!ini}
                      tabIndex={ini ? 0 : -1}
                      className={
                        "block overflow-hidden rounded-2xl border-4 shadow-kuat transition " +
                        (ini
                          ? "border-white/85 hover:border-white"
                          : "pointer-events-none border-white/30")
                      }
                    >
                      <Foto b={b} kelas="aspect-[16/10] w-full" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tombol panah berdiri di tepi foto tengahnya. Di layar sempit
              butirnya selebar jendela pandang, jadi tombolnya masuk ke dalam;
              mulai ambang lg ia duduk tepat di tepi kiri dan kanan foto
              tengahnya — 26cqw dari titik tengah, yaitu separuh --w, dikurangi
              separuh lebar tombolnya sendiri. */}
          {jumlah > 1 && (
            <>
              <button
                type="button"
                onClick={() => ke(indeks - 1)}
                aria-label="Berita sebelumnya"
                className="absolute top-1/2 left-2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-biru text-white shadow-kuat transition hover:bg-white hover:text-biru-tua lg:left-[calc(50%-26cqw-1.375rem)]"
              >
                <IkonPanahKiri ukuran={20} />
              </button>
              <button
                type="button"
                onClick={() => ke(indeks + 1)}
                aria-label="Berita berikutnya"
                className="absolute top-1/2 right-2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-biru text-white shadow-kuat transition hover:bg-white hover:text-biru-tua lg:right-[calc(50%-26cqw-1.375rem)]"
              >
                <IkonPanahKanan ukuran={20} />
              </button>
            </>
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

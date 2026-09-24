import Link from "next/link";
import { urlUnggahan } from "@/lib/api";
import { belumTerisi, keParagraf } from "@/lib/format";
import { IkonGuru } from "@/komponen/Ikon";
import type { Pengaturan } from "@/lib/tipe";

/**
 * Sambutan kepala sekolah pada beranda, mengikuti rancangan yang dikirim
 * user: dua bidang bersebelahan — panel biru muda berisi potret beserta
 * semboyan bertulisan tangan di atasnya dan kartu nama putih di dasarnya,
 * lalu panel putih berisi naskah sambutannya.
 *
 * Bagian video pada rancangan itu SENGAJA tidak dibuat, atas permintaan
 * user. Kalau kelak diperlukan, tempatnya di samping tombol profil.
 *
 * Tiga hal yang membedakannya dari rancangan aslinya, dan ketiganya karena
 * bahannya harus datang dari sekolah:
 *
 * 1. Rancangan itu memuat DUA kalimat bertulisan tangan yang berbeda, satu
 *    di atas potret dan satu di kotak kanan atas. Yang tersedia hanya satu,
 *    yaitu pengaturan `tagline`. Memakainya dua kali akan terbaca sebagai
 *    pengulangan, dan mengarang yang kedua tidak boleh. Jadi yang dipakai
 *    hanya yang di atas potret.
 * 2. Kalimat "Mewujudkan lingkungan belajar yang aman, nyaman, dan berdaya
 *    saing" pada rancangan itu penilaian tentang sekolahnya. Tempatnya di
 *    bawah judul diisi `tagline` bila ada, dan dibiarkan kosong bila tidak —
 *    bukan diisi kalimat buatan.
 * 3. Tulisan tangan "Sekolah Unggul Generasi Hebat" di pojok kanan bawah
 *    juga semboyan yang bukan milik sekolah ini, jadi tidak dibuat. Yang
 *    tinggal di pojok itu gambar gedung bergaya garis — hiasan, tanpa kata.
 *
 * Seluruh bagian yang bahannya belum ada tetap tampil dalam keadaan
 * kosongnya, bukan disembunyikan: itu permintaan user, dan keadaan kosongnya
 * dibuat mengarahkan pengunjung ke halaman Profil Sekolah.
 */
export function SambutanRingkas({ pengaturan }: { pengaturan: Pengaturan }) {
  const p = pengaturan;
  const adaFoto = Boolean(p.foto_kepsek && !belumTerisi(p.foto_kepsek));
  const adaNama = !belumTerisi(p.kepala_sekolah ?? "");
  const adaNaskah = !belumTerisi(p.sambutan_kepsek ?? "");
  const adaSemboyan = !belumTerisi(p.tagline ?? "");
  const paragraf = adaNaskah ? keParagraf(p.sambutan_kepsek) : [];

  return (
    <section
      aria-labelledby="judul-sambutan-ringkas"
      className="wadah py-16 md:py-20"
    >
      <div className="kartu grid overflow-hidden md:grid-cols-[minmax(0,19rem)_1fr] lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* ---------- Panel potret ---------- */}
        <div className="relative flex flex-col bg-biru-muda">
          {/* Semboyan bertulisan tangan, di atas potret seperti pada
              rancangannya. Tidak dibuat bila sekolah belum mengirimnya. */}
          {adaSemboyan && (
            <p className="relative z-10 px-6 pt-6 md:px-7 md:pt-7">
              <span className="font-tangan block text-xl leading-tight font-semibold text-biru-tua sm:text-2xl">
                &ldquo;{p.tagline}&rdquo;
              </span>
              <span
                aria-hidden
                className="mt-2 block h-[3px] w-20 rounded-full bg-emas"
              />
            </p>
          )}

          {/* Bulatan pucat di belakang potret, satu-satunya hiasan panel ini.
              Pada rancangannya potretnya berupa gambar yang latarnya sudah
              dilepas, dan bulatan inilah yang memberinya dasar. */}
          <span
            aria-hidden
            className="absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white/55 sm:h-72 sm:w-72"
          />

          <div className="relative mt-auto flex min-h-56 items-end justify-center px-6 md:min-h-72">
            {adaFoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlUnggahan("profil", p.foto_kepsek)}
                alt={
                  adaNama
                    ? `Foto ${p.kepala_sekolah}, Kepala Sekolah`
                    : "Foto Kepala Sekolah"
                }
                // object-bottom supaya potret berlatar tembus pandang berdiri
                // di dasar panel, tidak mengapung di tengahnya.
                className="max-h-80 w-auto object-contain object-bottom"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <IkonGuru ukuran={72} className="mb-10 text-biru/30" />
            )}
          </div>

          {/* Kartu nama putih di dasar panel. Tetap ada meski namanya belum
              dikirim, karena ia yang memberi panel ini dasar yang rata. */}
          <div className="relative mx-4 mb-4 rounded-xl bg-white px-5 py-4 text-center shadow-lembut md:mx-5 md:mb-5">
            <p className="text-[15px] leading-snug font-bold text-biru-tua">
              {adaNama ? p.kepala_sekolah : "Nama kepala sekolah"}
            </p>
            <p className="mt-0.5 text-sm text-samar">Kepala Sekolah</p>
            <span
              aria-hidden
              className="mx-auto mt-2.5 block h-[3px] w-12 rounded-full bg-emas"
            />
          </div>
        </div>

        {/* ---------- Panel naskah ---------- */}
        <div className="relative overflow-hidden p-6 md:p-9">
          {/* Gedung sekolah sebagai LATAR SEPENUH PANEL, dengan naskahnya
              di atasnya. Hiasan, jadi tanpa kata sama sekali dan
              disembunyikan dari pembaca layar.

              Sebelumnya gambar garis yang ditulis sebagai jalur SVG di berkas
              ini, lalu sempat menjadi gambar kecil di pojok kanan bawah.
              Keduanya terlalu kecil: gedungnya nyaris tidak terbaca.

              Berkasnya JPEG. Aslinya PNG 1774x887 sebesar 1 MB tanpa lapisan
              tembus pandang, dan karena isinya bidang bergradasi yang sangat
              pucat, JPEG turun ke 28 KB.

              `object-right-bottom` menentukan bagian mana yang tersisa saat
              dipotong. Gambarnya berbanding 2:1 sedangkan panel ini jauh
              lebih jangkung, jadi object-cover pasti memotong — dan gedungnya
              berada di sisi kanan bawah gambar, sehingga di situlah jangkarnya
              ditaruh. Tanpa itu, yang tersisa justru langit kosong di sisi
              kirinya. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ilustrasi/gedung-sambutan.jpg"
            alt=""
            aria-hidden
            width={1000}
            height={500}
            className="pointer-events-none absolute inset-0 h-full w-full max-w-none object-cover object-right-bottom"
            loading="lazy"
            decoding="async"
          />

          {/* Peredam di atas gambarnya, di bawah naskahnya. INILAH yang
              menjaga naskah tetap terbaca; gambarnya sendiri pucat, tetapi
              pucat saja tidak cukup — huruf abu-abu di atas dedaunan hijau
              tetap berat dibaca.

              Dua bentuk, karena letak naskahnya berbeda. Mulai ambang sm
              naskahnya di kolom kiri sedangkan gedungnya di kanan, jadi
              peredamnya bergradasi mendatar: hampir pekat di kiri tempat
              hurufnya, menipis ke kanan supaya gedungnya tetap terlihat. Di
              layar sempit naskahnya memenuhi seluruh lebar panel, jadi tidak
              ada sisi yang boleh dibiarkan bening; peredamnya rata. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-white/90 sm:hidden"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-white via-white/95 to-white/55 sm:block"
          />

          <div className="relative">
            <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
              Sambutan
            </p>
            <h2
              id="judul-sambutan-ringkas"
              className="mt-2 text-2xl font-bold md:text-3xl"
            >
              Kepala Sekolah
            </h2>
            {/* Naskah di panel ini memakai text-teks, bukan text-samar. Di
                atas gambar latar, abu-abu samar #6b7280 turun ke 3,67:1 — di
                bawah ambang 4,5 untuk teks isi, dan itu terukur, bukan
                dikira. Bahkan di atas putih bersih ia cuma 4,83:1. */}
            {adaSemboyan && (
              <p className="mt-2 max-w-xl leading-relaxed text-teks">
                {p.tagline}
              </p>
            )}
            <span
              aria-hidden
              className="mt-4 block h-1 w-16 rounded-full bg-emas"
            />

            {paragraf.length > 0 ? (
              <div className="mt-6 max-w-2xl space-y-4">
                {paragraf.map((baris, i) => (
                  <p
                    key={i}
                    className={
                      "text-[15px] leading-relaxed whitespace-pre-line " +
                      // Baris pertama biasanya salam pembuka, jadi ditebalkan
                      // seperti pada rancangannya.
                      (i === 0 ? "font-semibold text-biru-tua" : "text-teks")
                    }
                  >
                    {baris}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-teks">
                Sambutan kepala sekolah akan dimuat di bagian ini. Sementara
                itu, profil sekolah beserta arah dan langkah yang dituju dapat
                dibaca lebih dulu di halaman Profil Sekolah.
              </p>
            )}

            <Link
              href="/profil"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-biru px-6 py-3 text-sm font-semibold text-white transition hover:bg-biru-tua"
            >
              {paragraf.length > 0
                ? "Lihat Profil Lengkap"
                : "Buka Profil Sekolah"}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

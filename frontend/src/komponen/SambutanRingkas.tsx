import Link from "next/link";
import { urlUnggahan } from "@/lib/api";
import { belumTerisi, keParagraf } from "@/lib/format";
import type { Pengaturan } from "@/lib/tipe";

/**
 * Sambutan kepala sekolah dalam bentuk ringkas, untuk beranda.
 *
 * Yang utuh tetap di halaman Profil Sekolah: potret besar, naskah penuh, dan
 * semboyan berhuruf tulisan tangan. Yang di sini hanya potret kecil, nama,
 * jabatan, dua kalimat pertama naskahnya, dan tautan ke yang utuh. Beranda
 * memperkenalkan, halaman profil yang menjelaskan — menyalin kartu besarnya
 * ke beranda hanya membuat pengunjung membaca hal yang sama dua kali.
 *
 * BAGIAN INI TIDAK MUNCUL SELAMA SEKOLAH BELUM MENGIRIM APA PUN. Di halaman
 * Profil, kerangka kosong beserta keterangannya memang berguna: panitia
 * melihat sendiri bahan apa yang masih ditunggu. Di beranda tidak: yang
 * membukanya orang tua yang sedang menimbang sekolah, dan kerangka foto
 * kosong di halaman depan membuat sekolahnya tampak belum siap. Jadi
 * bagiannya dibuka begitu ADA yang bisa ditampilkan — nama, foto, atau
 * naskahnya — dan sebelum itu tidak ada sama sekali.
 */
export function SambutanRingkas({ pengaturan }: { pengaturan: Pengaturan }) {
  const p = pengaturan;
  const adaFoto = Boolean(p.foto_kepsek && !belumTerisi(p.foto_kepsek));
  const adaNama = !belumTerisi(p.kepala_sekolah ?? "");
  const adaNaskah = !belumTerisi(p.sambutan_kepsek ?? "");

  if (!adaFoto && !adaNama && !adaNaskah) return null;

  // Dua kalimat pertama saja. Naskah sambutan biasanya beberapa paragraf,
  // dan beranda bukan tempatnya.
  const paragraf = adaNaskah ? keParagraf(p.sambutan_kepsek) : [];
  const kutipan = paragraf.length > 0 ? paragraf[0] : "";

  return (
    <section
      aria-labelledby="judul-sambutan-ringkas"
      className="wadah py-16 md:py-20"
    >
      <div className="kartu overflow-hidden md:flex md:items-stretch">
        {/* Potret. Pada layar sempit ia melebar penuh di atas naskahnya;
            dari ambang md ke atas jadi kolom kiri setinggi kartunya. */}
        {adaFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlUnggahan("profil", p.foto_kepsek)}
            alt={
              adaNama
                ? `Foto ${p.kepala_sekolah}, Kepala Sekolah`
                : "Foto Kepala Sekolah"
            }
            className="h-56 w-full bg-biru-muda object-cover object-top md:h-auto md:w-56 md:shrink-0 lg:w-64"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="grid h-40 w-full place-items-center bg-biru-muda px-6 text-center md:h-auto md:w-56 md:shrink-0 lg:w-64">
            <p className="text-xs leading-relaxed text-biru/70">
              Foto kepala sekolah diunggah lewat menu Pengaturan.
            </p>
          </div>
        )}

        <div className="p-6 md:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
            Sambutan
          </p>
          <h2
            id="judul-sambutan-ringkas"
            className="mt-2 text-xl font-bold md:text-2xl"
          >
            {adaNama ? p.kepala_sekolah : "Kepala Sekolah"}
          </h2>
          <p className="mt-0.5 text-sm text-samar">Kepala Sekolah</p>
          <span
            aria-hidden
            className="mt-3 block h-1 w-12 rounded-full bg-emas"
          />

          {kutipan ? (
            <blockquote className="mt-4 max-w-2xl">
              <p className="line-clamp-4 text-[15px] leading-relaxed text-teks italic">
                &ldquo;{kutipan}&rdquo;
              </p>
            </blockquote>
          ) : (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-samar">
              Naskah sambutan belum dikirim sekolah. Yang sudah ada dapat
              dibaca di halaman Profil Sekolah.
            </p>
          )}

          <Link
            href="/profil"
            className="mt-5 inline-block text-sm font-semibold text-biru underline-offset-4 hover:underline"
          >
            Baca sambutan lengkap →
          </Link>
        </div>
      </div>
    </section>
  );
}

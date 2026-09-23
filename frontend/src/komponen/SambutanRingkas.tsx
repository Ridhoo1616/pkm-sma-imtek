import Link from "next/link";
import { urlUnggahan } from "@/lib/api";
import { belumTerisi, keParagraf } from "@/lib/format";
import { IkonGuru } from "@/komponen/Ikon";
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
 * BAGIAN INI SELALU TAMPIL, termasuk sebelum sekolah mengirim apa pun —
 * begitu permintaan user, sesudah versi bersyaratnya dicoba dan bagiannya
 * tidak pernah muncul karena ketiga bahannya masih kosong.
 *
 * Konsekuensinya ditangani di keadaan kosongnya, bukan diabaikan. Dua hal
 * yang berbeda dari kerangka di halaman Profil:
 *
 * Pertama, tempat fotonya TIDAK memuat petunjuk unggah. Di halaman Profil
 * keterangan "diunggah lewat menu Pengaturan" masih pantas, karena panitia
 * memang membacanya. Di beranda yang membaca orang tua, dan menyuruh mereka
 * membuka panel admin tidak berarti apa-apa. Jadi yang tampil hanya lambang
 * orang tanpa satu kata pun.
 *
 * Kedua, kalimat penggantinya MENGARAHKAN, bukan melapor. "Naskah belum
 * dikirim sekolah" memberitahu pengunjung sesuatu yang bukan urusannya, dan
 * membuat sekolahnya terdengar lalai. Yang ditulis: sambutannya akan dimuat
 * di sini, dan sementara itu profil sekolahnya dapat dibaca — beserta
 * tautannya. Bagian yang kosong tetap jujur, tetapi tetap berguna.
 */
export function SambutanRingkas({ pengaturan }: { pengaturan: Pengaturan }) {
  const p = pengaturan;
  const adaFoto = Boolean(p.foto_kepsek && !belumTerisi(p.foto_kepsek));
  const adaNama = !belumTerisi(p.kepala_sekolah ?? "");
  const adaNaskah = !belumTerisi(p.sambutan_kepsek ?? "");

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
          <div
            aria-hidden
            className="grid h-40 w-full place-items-center bg-biru-muda md:h-auto md:w-56 md:shrink-0 lg:w-64"
          >
            <IkonGuru ukuran={56} className="text-biru/35" />
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
              Sambutan kepala sekolah akan dimuat di bagian ini. Sementara itu,
              profil sekolah beserta arah dan langkah yang dituju dapat dibaca
              lebih dulu di halaman Profil Sekolah.
            </p>
          )}

          <Link
            href="/profil"
            className="mt-5 inline-block text-sm font-semibold text-biru underline-offset-4 hover:underline"
          >
            {kutipan ? "Baca sambutan lengkap" : "Buka Profil Sekolah"} →
          </Link>
        </div>
      </div>
    </section>
  );
}

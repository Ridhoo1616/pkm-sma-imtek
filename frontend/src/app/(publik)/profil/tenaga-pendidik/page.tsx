import { api } from "@/lib/api";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { TanpaData } from "@/komponen/Memuat";
import { JejakMenu } from "@/komponen/JejakMenu";
import DaftarTenaga from "@/komponen/DaftarTenaga";
import type { Tenaga } from "@/lib/tipe";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tenaga Pendidik dan Kependidikan",
  description:
    "Guru dan tenaga kependidikan sekolah beserta jabatan dan bidang yang diampu.",
};

export default async function HalamanTenaga() {
  const hasil = await api
    .tenaga()
    .catch((): { data: Tenaga[]; kategori: string[] } => ({
      data: [],
      kategori: ["Pimpinan", "Pendidik", "Kependidikan"],
    }));

  return (
    <>
      <KepalaHalaman
        judul="Tenaga Pendidik dan Kependidikan"
        keterangan="Guru dan tenaga kependidikan yang bertugas di sekolah pada tahun pelajaran ini."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/tenaga-pendidik" />

        {/* Kartu pembuka, susunannya sama dengan kartu Visi dan Misi:
            naskah di kolom kiri, ilustrasi di kolom kanan setinggi kartunya,
            menempel tepi lewat margin negatif yang menghapus padding kartu.
            `object-contain` menjaga perbandingan sisinya dan `object-bottom`
            mendudukkan sosok orangnya di dasar kartu.

            Bedanya satu: gambar ini jauh lebih lebar daripada gambar visi dan
            misi — 1487x709, berbanding 2,1 — jadi kolomnya juga lebih lebar,
            dan di layar sempit ia turun ke bawah naskah. Dipaksa tetap di
            samping pada lebar ponsel, kolomnya cuma menyisakan seratusan
            piksel dan kelima wajahnya menjadi tidak terbaca.

            Latar gambarnya sudah dibuang sampai tembus pandang, jadi tidak
            ada kotak putih yang menabrak gradasi kartunya. */}
        <MunculNaik>
          <section
            aria-labelledby="judul-pembuka-tenaga"
            className="mt-8 flex flex-col gap-5 overflow-hidden rounded-kartu border border-garis bg-gradient-to-br from-biru-muda via-biru-muda to-white p-6 shadow-lembut sm:flex-row sm:items-stretch sm:gap-6 sm:p-7"
          >
            <div className="min-w-0 flex-1 sm:self-center">
              <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
                Tenaga Pendidik dan Kependidikan
              </p>
              <h2
                id="judul-pembuka-tenaga"
                className="mt-2 text-2xl leading-tight font-bold text-biru-tua md:text-3xl"
              >
                Guru dan Tenaga Kependidikan
              </h2>
              <span
                aria-hidden
                className="mt-3 block h-1 w-16 rounded-full bg-emas"
              />
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-teks">
                Tenaga pendidik dan kependidikan adalah bagian penting dalam
                mewujudkan proses pembelajaran yang berkualitas, serta mendukung
                terciptanya lingkungan sekolah yang aman, nyaman, dan
                berkarakter.
              </p>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ilustrasi/tenaga.png"
              alt="Ilustrasi lima guru dan siswa berdiri di depan gedung sekolah"
              width={1487}
              height={709}
              /* Margin ditulis PER SISI di kedua ambang, bukan memakai
                 ringkasan `-my`/`-mx` lalu dibatalkan sebagian. Percobaan
                 pertama memakai `sm:-my-7 ... sm:mb-0`, dan `mb-0` itu ikut
                 membatalkan tarikan ke bawahnya: gambarnya berhenti 29
                 piksel di atas dasar kartu — setebal padding kartu ditambah
                 garis tepinya. Urutan kelas di sini tidak menentukan, sebab
                 Tailwind menyusun ulang keluarannya sendiri, jadi ringkasan
                 yang saling menimpa memang tidak bisa diandalkan.

                 `max-w-none` WAJIB ada bersama `w-[calc(100%+3rem)]`.
                 Preflight Tailwind memasang `img { max-width: 100% }` untuk
                 seluruh gambar, dan aturan itu memangkas lebar yang melebihi
                 wadahnya kembali menjadi 100%. Tanpa max-w-none, gambarnya
                 tetap selebar isi kartu: tepi kirinya menyentuh tepi kartu
                 karena margin negatifnya, sedangkan tepi kanannya berhenti
                 24 piksel sebelum tepi kartu — dan lebarnya terukur 308 alih
                 alih 358 piksel pada layar 390 piksel. */
              className="pointer-events-none -mr-6 -mb-6 -ml-6 w-[calc(100%+3rem)] max-w-none self-end object-contain object-bottom sm:-mt-7 sm:-mr-7 sm:-mb-7 sm:ml-0 sm:w-72 sm:self-stretch md:w-96"
            />
          </section>
        </MunculNaik>

        <div className="mt-8">
          {hasil.data.length === 0 ? (
            <TanpaData
              judul="Data tenaga pendidik belum tersedia"
              keterangan="Daftarnya diisi lewat menu Tenaga Pendidik di panel admin. Nama, jabatan, mata pelajaran, dan kelas yang diampu hanya boleh berasal dari data sekolah."
            />
          ) : (
            <DaftarTenaga daftar={hasil.data} />
          )}
        </div>
      </div>
    </>
  );
}

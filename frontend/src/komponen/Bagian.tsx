import type { ReactNode } from "react";

/**
 * Kepala halaman dan judul bagian. Dipisah menjadi komponen agar susunan
 * dan jarak antar bagian tetap sama di seluruh halaman publik.
 */

export function KepalaHalaman({
  judul,
  keterangan,
  anak,
}: {
  judul: string;
  keterangan?: string;
  anak?: ReactNode;
}) {
  return (
    <div className="border-b border-garis bg-biru-muda">
      <div className="wadah py-12 md:py-16">
        <h1 className="text-3xl font-bold text-balance md:text-4xl">{judul}</h1>
        {keterangan && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-samar">
            {keterangan}
          </p>
        )}
        {anak && <div className="mt-6">{anak}</div>}
      </div>
    </div>
  );
}

export function JudulBagian({
  atas,
  judul,
  keterangan,
  tengah,
}: {
  atas?: string;
  judul: string;
  keterangan?: string;
  tengah?: boolean;
}) {
  return (
    <div className={`mb-8 ${tengah ? "text-center" : ""}`}>
      {atas && (
        <p className="mb-2 text-xs font-bold tracking-[0.14em] text-biru uppercase">
          {atas}
        </p>
      )}
      <h2 className="text-2xl font-bold text-balance md:text-3xl">{judul}</h2>
      <span
        className={`mt-3 block h-1 w-16 rounded-full bg-emas ${tengah ? "mx-auto" : ""}`}
        aria-hidden
      />
      {keterangan && (
        <p
          className={`mt-4 text-[15px] leading-relaxed text-samar ${
            tengah ? "mx-auto max-w-2xl" : "max-w-2xl"
          }`}
        >
          {keterangan}
        </p>
      )}
    </div>
  );
}

/** Tempat gambar yang belum tersedia; memberi bentuk, bukan kotak kosong. */
/**
 * Kelas untuk KARTU TERAKHIR pada petak "sm:grid-cols-2 lg:grid-cols-3",
 * supaya baris terakhirnya penuh.
 *
 * Jumlah kartu di beranda ditentukan isi basis data, bukan kode: peminatan
 * bisa tiga atau empat, keunggulan bisa berapa pun yang diketik sekolah.
 * Empat kartu pada petak tiga kolom meninggalkan satu kartu sendirian di
 * baris kedua beserta ruang kosong selebar dua kartu, dan itu terbaca
 * sebagai halaman yang rusak. Kartu terakhir dilebarkan supaya barisnya
 * habis, di kedua ambang layar sekaligus.
 *
 * Kelasnya dituliskan utuh sebagai teks di sini, bukan disusun dari potongan,
 * karena Tailwind memindai berkas sumber: kelas yang dirangkai saat program
 * berjalan tidak akan pernah ikut dihasilkan.
 */
export function kelasKartuAkhir(indeks: number, jumlah: number): string {
  if (indeks !== jumlah - 1) return "";
  // Kedua ambang selalu dituliskan, termasuk yang lebarnya satu kolom.
  // Ambang Tailwind itu min-width: "sm:col-span-2" tetap berlaku pada layar
  // lebar, dan tanpa "lg:col-span-1" di sebelahnya ia menjadikan kartu
  // terakhir dua kolom pada petak tiga kolom — tiga kartu pun jadi memakan
  // empat kolom dan barisnya justru terpecah. Itu kebalikan dari maksudnya.
  const sisa2 = jumlah % 2 === 1 ? "sm:col-span-2" : "sm:col-span-1";
  const sisa3 =
    jumlah % 3 === 1
      ? "lg:col-span-3"
      : jumlah % 3 === 2
        ? "lg:col-span-2"
        : "lg:col-span-1";
  return `${sisa2} ${sisa3}`;
}

export function GambarKosong({
  label,
  tinggi = "h-48",
}: {
  label: string;
  tinggi?: string;
}) {
  return (
    <div
      className={`${tinggi} grid w-full place-items-center bg-biru-muda text-center`}
      aria-hidden
    >
      <span className="px-4 text-xs font-semibold text-biru/60">{label}</span>
    </div>
  );
}

/**
 * Lencana status.
 *
 * Bentuknya isian warna padat dengan tulisan putih, bukan pil pastel
 * bergaris tepi. Alasannya bukan selera: pil pastel dengan garis tepi tipis
 * dan sudut bulat penuh adalah bentuk yang dipakai hampir setiap tampilan
 * hasil pembuat otomatis, dan pengguna proyek ini memang menilainya begitu.
 *
 * Tiga hal dijaga di sini:
 *
 *   1. Warnanya PADAT, tanpa transparansi. Latar setengah tembus membuat
 *      warnanya berubah mengikuti apa pun yang ada di belakangnya, dan itulah
 *      yang membuat lencananya terlihat mengambang.
 *   2. Tulisannya benar-benar di tengah. inline-flex beserta leading-none
 *      dipakai supaya tinggi barisnya tidak lagi menggeser tulisan ke atas,
 *      dan jarak atas-bawahnya dibuat sama.
 *   3. Warnanya dipilih lewat NAMA, bukan lewat kelas yang dikirim pemanggil.
 *      Sebelumnya setiap halaman menuliskan sendiri gabungan kelasnya, dan
 *      sudah terkumpul sembilan variasi yang seharusnya sama.
 *
 * Seluruh warna di bawah lulus rasio kontras 4,5:1 terhadap tulisan putih.
 */

export type JenisLencana =
  | "biru"
  | "hijau"
  | "merah"
  | "emas"
  | "abu"
  | "terang"
  | "putih";

const GAYA_LENCANA: Record<JenisLencana, string> = {
  biru: "bg-biru-tua text-white",
  hijau: "bg-green-700 text-white",
  merah: "bg-red-700 text-white",
  emas: "bg-amber-700 text-white",
  abu: "bg-slate-600 text-white",
  // Dua yang terakhir bukan status, melainkan label seperti kategori berita
  // dan tahap pembayaran. Keduanya tetap berisian padat, hanya lebih terang.
  terang: "bg-biru-muda text-biru-tua",
  putih: "bg-white text-biru-tua",
};

export function Lencana({
  children,
  jenis = "terang",
}: {
  children: ReactNode;
  jenis?: JenisLencana;
}) {
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-md px-2 py-1 " +
        "text-[11px] leading-none font-bold tracking-[0.06em] whitespace-nowrap uppercase " +
        GAYA_LENCANA[jenis]
      }
    >
      {children}
    </span>
  );
}

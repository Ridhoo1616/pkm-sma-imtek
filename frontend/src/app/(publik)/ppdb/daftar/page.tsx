import Link from "next/link";
import { api } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { tanggalPanjang } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import FormulirPpdb from "@/komponen/FormulirPpdb";
import type { Metadata } from "next";
import type { Jurusan } from "@/lib/tipe";

export const metadata: Metadata = {
  title: "Formulir Pendaftaran PPDB",
  description:
    "Isi formulir pendaftaran peserta didik baru dan unggah dokumen secara online.",
};

export default async function HalamanDaftar() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  // Pendaftaran yang tertutup ditolak backend juga, jadi halaman ini tidak
  // menampilkan formulirnya sama sekali agar tidak memberi harapan keliru.
  if (!profil.ppdb.dibuka) {
    return (
      <>
        <KepalaHalaman
          judul="Pendaftaran Belum Dibuka"
          keterangan="Formulir pendaftaran hanya dapat diisi selama masa pendaftaran berlangsung."
        />
        <div className="wadah py-14">
          <div className="kartu mx-auto max-w-2xl p-7 text-center">
            <p className="text-[15px] leading-relaxed text-teks">
              {p.ppdb_mulai ? (
                <>
                  Pendaftaran peserta didik baru Tahun Ajaran{" "}
                  <strong>{p.ppdb_tahun}</strong> dibuka mulai{" "}
                  <strong>{tanggalPanjang(p.ppdb_mulai)}</strong>
                  {p.ppdb_selesai && (
                    <>
                      {" "}
                      sampai <strong>{tanggalPanjang(p.ppdb_selesai)}</strong>
                    </>
                  )}
                  .
                </>
              ) : (
                "Jadwal pendaftaran akan diumumkan sekolah melalui halaman berita."
              )}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/ppdb"
                className="rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
              >
                Baca Informasi PPDB
              </Link>
              <Link
                href="/ppdb/cek"
                className="rounded-lg border border-garis px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru"
              >
                Cek Status Pendaftaran
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const jurusan = await api
    .jurusan()
    .then((h) => h.data)
    .catch((): Jurusan[] => []);

  return (
    <>
      <KepalaHalaman
        judul="Formulir Pendaftaran PPDB"
        keterangan={`Tahun Ajaran ${p.ppdb_tahun ?? ""}. Isian bertanda bintang wajib diisi. Pengisian dibagi menjadi lima langkah, dan Anda dapat berpindah antar langkah kapan saja sebelum mengirim.`}
      />
      <div className="wadah py-12">
        <div className="mx-auto max-w-4xl">
          <FormulirPpdb
            jurusan={jurusan}
            sumber={profil.ppdb.sumber}
            jalur={profil.ppdb.jalur}
            tahunAjaran={p.ppdb_tahun ?? ""}
            namaSekolah={p.nama_sekolah ?? "sekolah"}
          />
        </div>
      </div>
    </>
  );
}

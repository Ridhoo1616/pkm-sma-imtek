import { muatProfil } from "@/lib/profil";
import { KepalaHalaman } from "@/komponen/Bagian";
import CekStatus from "@/komponen/CekStatus";
import type { Metadata } from "next";
import { PenunjukAlur } from "@/komponen/PenunjukAlur";

export const metadata: Metadata = {
  title: "Cek Status Pendaftaran",
  description:
    "Pantau hasil verifikasi berkas dengan nomor registrasi dan tanggal lahir.",
};

export default async function HalamanCekStatus(props: PageProps<"/ppdb/cek">) {
  const kueri = await props.searchParams;
  const nomorAwal = typeof kueri.no === "string" ? kueri.no : "";
  const { profil } = await muatProfil();

  return (
    <>
      <KepalaHalaman
        judul="Cek Status Pendaftaran"
        keterangan="Masukkan nomor registrasi dan tanggal lahir yang Anda gunakan saat mendaftar. Keduanya diperlukan agar data pribadi tidak dapat dibuka oleh orang lain."
      />

      <PenunjukAlur aktif="pantau" ppdbDibuka={profil.ppdb.dibuka} />
      <div className="wadah py-12">
        <div className="mx-auto max-w-3xl">
          <CekStatus nomorAwal={nomorAwal} />
        </div>
      </div>
    </>
  );
}

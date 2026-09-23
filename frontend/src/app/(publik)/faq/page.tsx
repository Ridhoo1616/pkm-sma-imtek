import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import DaftarFaq from "@/komponen/DaftarFaq";
import type { Faq } from "@/lib/tipe";

export const metadata: Metadata = {
  title: "Tanya Jawab PPDB",
  description:
    "Pertanyaan yang sering diajukan orang tua dan calon peserta didik tentang pendaftaran, berkas, biaya, tes seleksi, dan pengumuman.",
};

export default async function HalamanFaq() {
  const faq = await api
    .faq()
    .catch(() => ({ data: [] as Faq[], kategori: [] as string[], pengantar: "" }));

  return (
    <>
      <KepalaHalaman
        judul="Tanya Jawab"
        keterangan="Jawaban atas pertanyaan yang paling sering diajukan orang tua dan calon peserta didik. Yang bertanda kuning adalah yang paling sering ditanyakan."
      />

      <div className="wadah max-w-4xl py-12">
        <MunculNaik>
          <DaftarFaq daftar={faq.data} kategori={faq.kategori} />
        </MunculNaik>

        <MunculNaik>
          <div className="mt-10 rounded-kartu border border-biru/20 bg-biru-muda px-6 py-5">
            <p className="text-[15px] leading-relaxed text-biru-tua">
              {faq.pengantar && !belumTerisi(faq.pengantar)
                ? faq.pengantar
                : "Belum menemukan jawabannya? Hubungi panitia lewat tombol WhatsApp di pojok kanan bawah, atau kirim pertanyaan dari halaman Kontak."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/kontak"
                className="rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
              >
                Kirim pertanyaan
              </Link>
              <Link
                href="/ppdb"
                className="rounded-lg border border-garis bg-white px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru"
              >
                Baca ketentuan PPDB
              </Link>
            </div>
          </div>
        </MunculNaik>
      </div>
    </>
  );
}

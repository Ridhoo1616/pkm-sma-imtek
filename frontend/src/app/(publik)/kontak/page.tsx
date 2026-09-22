import { muatProfil } from "@/lib/profil";
import { alamatLengkap, nomorWa, belumTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import FormulirKontak from "@/komponen/FormulirKontak";
import type { Metadata } from "next";
import {
  IkonJam,
  IkonLokasi,
  IkonSurel,
  IkonTelepon,
  IkonWhatsapp,
} from "@/komponen/Ikon";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Alamat, nomor telepon, dan formulir pertanyaan untuk sekolah.",
};

export default async function HalamanKontak() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;
  const wa = nomorWa(p.whatsapp ?? "");

  return (
    <>
      <KepalaHalaman
        judul="Kontak Sekolah"
        keterangan="Sampaikan pertanyaan seputar pendaftaran, biaya, atau kegiatan sekolah. Panitia akan membalas melalui jalur yang Anda cantumkan."
      />

      <div className="wadah grid gap-12 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <MunculNaik>
          <div>
            <JudulBagian atas="Hubungi" judul="Alamat & Jalur Kontak" />

            <div className="kartu divide-y divide-garis">
              <div className="px-6 py-5">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-samar uppercase">
                  <IkonLokasi ukuran={14} className="shrink-0" />
                  Alamat
                </p>
                <address className="mt-1 text-[15px] leading-relaxed not-italic text-teks">
                  {alamatLengkap(p.alamat, p.kode_pos)}
                </address>
              </div>

              {p.telepon && (
                <div className="px-6 py-5">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-samar uppercase">
                    <IkonTelepon ukuran={14} className="shrink-0" />
                    Telepon
                  </p>
                  <a
                    href={`tel:${p.telepon}`}
                    className="mt-1 block text-[15px] font-semibold text-biru hover:underline"
                  >
                    {p.telepon}
                  </a>
                </div>
              )}

              {p.email && (
                <div className="px-6 py-5">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-samar uppercase">
                    <IkonSurel ukuran={14} className="shrink-0" />
                    Surel
                  </p>
                  <a
                    href={`mailto:${p.email}`}
                    className="mt-1 block text-[15px] font-semibold text-biru hover:underline"
                  >
                    {p.email}
                  </a>
                </div>
              )}

              <div className="px-6 py-5">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-samar uppercase">
                  <IkonWhatsapp ukuran={14} className="shrink-0" />
                  WhatsApp panitia PPDB
                </p>
                {wa ? (
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    <IkonWhatsapp ukuran={16} className="shrink-0" />
                    Chat WhatsApp
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-samar">
                    Nomor WhatsApp panitia belum tersedia. Gunakan telepon, surel,
                    atau formulir di samping.
                  </p>
                )}
              </div>

              {p.jam_layanan && !belumTerisi(p.jam_layanan) && (
                <div className="px-6 py-5">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-samar uppercase">
                    <IkonJam ukuran={14} className="shrink-0" />
                    Jam layanan
                  </p>
                  <p className="mt-1 text-[15px] text-teks">{p.jam_layanan}</p>
                </div>
              )}
            </div>

            {p.peta_embed && !belumTerisi(p.peta_embed) && (
              <div className="kartu mt-6 overflow-hidden">
                <div
                  className="aspect-video w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: p.peta_embed }}
                />
              </div>
            )}
          </div>
        </MunculNaik>

        <MunculNaik jeda={0.1}>
          <div>
            <JudulBagian atas="Formulir" judul="Kirim Pertanyaan" />
            <div className="kartu p-6 md:p-7">
              <FormulirKontak />
            </div>
          </div>
        </MunculNaik>
      </div>
    </>
  );
}

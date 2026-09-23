import { muatProfil } from "@/lib/profil";
import { belumTerisi, alamatLengkap } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Sekolah",
  description:
    "Data pokok sekolah: NPSN, status, akreditasi, penyelenggara, alamat, dan jam layanan.",
};

export default async function HalamanDataSekolah() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  // Dikelompokkan supaya pembaca tidak menghadapi satu daftar panjang berisi
  // lima belas baris yang tidak ada hubungannya satu sama lain.
  const kelompok = [
    {
      judul: "Identitas",
      butir: [
        { k: "Nama sekolah", v: p.nama_sekolah },
        { k: "Nama singkat", v: p.nama_singkat },
        { k: "NPSN", v: p.npsn },
        { k: "Status sekolah", v: p.status_sekolah },
        { k: "Akreditasi", v: p.akreditasi },
        { k: "Yayasan penyelenggara", v: p.yayasan },
        { k: "Kepala sekolah", v: p.kepala_sekolah },
      ],
    },
    {
      judul: "Alamat",
      butir: [
        { k: "Alamat", v: alamatLengkap(p.alamat, p.kode_pos) },
        { k: "Kelurahan/Desa", v: p.kelurahan },
        { k: "Kecamatan", v: p.kecamatan },
        { k: "Kabupaten/Kota", v: p.kota },
        { k: "Provinsi", v: p.provinsi },
      ],
    },
    {
      judul: "Kontak dan layanan",
      butir: [
        { k: "Telepon", v: p.telepon },
        { k: "Surel", v: p.email },
        { k: "WhatsApp panitia", v: p.whatsapp },
        { k: "Jam layanan", v: p.jam_layanan },
      ],
    },
  ];

  const adaIsi = kelompok.some((g) => g.butir.some((b) => b.v && !belumTerisi(b.v)));
  // Peta hanya ditampilkan bila sematannya sudah diisi sekolah. Tanpa
  // pemeriksaan ini, tata letak dua kolom tetap dipakai dan kartu datanya
  // menyusut menjadi separuh lebar sementara separuh lainnya kosong.
  const adaPeta = Boolean(p.peta_embed && !belumTerisi(p.peta_embed));

  return (
    <>
      <KepalaHalaman
        judul="Data Sekolah"
        keterangan="Data pokok yang biasa diminta pada pendaftaran, pengurusan surat, dan verifikasi data pendidikan."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/profil" jalur="/profil/data-sekolah" />

        {!adaIsi ? (
          <div className="mt-8 max-w-3xl">
            <Menunggu apa="Data pokok sekolah" />
          </div>
        ) : (
          <div
            className={
              "mt-8 grid gap-6 lg:items-start " +
              (adaPeta ? "lg:grid-cols-[1fr_1fr]" : "max-w-3xl")
            }
          >
            <div className="space-y-6">
              {kelompok.map((g, i) => {
                const terisi = g.butir.filter((b) => b.v && !belumTerisi(b.v));
                if (terisi.length === 0) return null;
                return (
                  <MunculNaik key={g.judul} jeda={i * 0.06}>
                    <section className="kartu overflow-hidden">
                      <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                        {g.judul}
                      </h2>
                      <dl className="divide-y divide-garis text-sm">
                        {terisi.map((b) => (
                          <div
                            key={b.k}
                            className="grid gap-1 px-6 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4"
                          >
                            <dt className="text-xs font-semibold tracking-wide text-samar uppercase sm:text-sm sm:normal-case">
                              {b.k}
                            </dt>
                            <dd className="text-teks">{b.v}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  </MunculNaik>
                );
              })}
            </div>

            {adaPeta && (
              <MunculNaik jeda={0.1}>
                <section className="kartu overflow-hidden lg:sticky lg:top-28">
                  <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                    Lokasi
                  </h2>
                  <div
                    className="aspect-video w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
                    // Nilai ini hanya dapat diubah admin sekolah lewat menu
                    // Pengaturan, dan isinya memang berupa sematan peta.
                    dangerouslySetInnerHTML={{ __html: p.peta_embed }}
                  />
                </section>
              </MunculNaik>
            )}
          </div>
        )}
      </div>
    </>
  );
}

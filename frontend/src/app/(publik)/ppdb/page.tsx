import Link from "next/link";
import { api } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { angka, persen, tanggalPanjang, belumTerisi } from "@/lib/format";
import { KepalaHalaman, JudulBagian, Lencana } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import type { Metadata } from "next";
import type { Jurusan } from "@/lib/tipe";

export const metadata: Metadata = {
  title: "Informasi PPDB",
  description:
    "Jadwal, persyaratan, jalur, dan alur pendaftaran peserta didik baru.",
};

/** Dokumen yang diminta formulir; daftarnya sama dengan yang divalidasi backend. */
const DOKUMEN = [
  { nama: "Foto 3x4", wajib: true, tipe: "JPG atau PNG" },
  { nama: "Ijazah atau Surat Keterangan Lulus", wajib: true, tipe: "JPG, PNG, atau PDF" },
  { nama: "Kartu Keluarga", wajib: true, tipe: "JPG, PNG, atau PDF" },
  { nama: "Akta Kelahiran", wajib: false, tipe: "JPG, PNG, atau PDF" },
  { nama: "Rapor semester terakhir", wajib: false, tipe: "JPG, PNG, atau PDF" },
  {
    nama: "Sertifikat prestasi",
    wajib: false,
    tipe: "JPG, PNG, atau PDF",
    catatan: "Wajib bila mendaftar lewat jalur Prestasi.",
  },
];

const KETERANGAN_JALUR: Record<string, string> = {
  Reguler: "Jalur umum berdasarkan nilai rapor dan kelengkapan berkas.",
  Prestasi:
    "Untuk calon peserta didik dengan prestasi akademik maupun non-akademik. Sertifikat wajib diunggah.",
  Afirmasi:
    "Untuk calon peserta didik dari keluarga berpenghasilan rendah atau penyandang disabilitas.",
  "Perpindahan Tugas Orang Tua":
    "Untuk anak yang orang tuanya berpindah tugas ke wilayah sekolah.",
};

export default async function HalamanPpdb() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;
  const jurusan = await api
    .jurusan()
    .then((h) => h.data)
    .catch((): Jurusan[] => []);

  const alur = (p.ppdb_alur || "")
    .split("\n")
    .map((a) => a.trim().replace(/^[-•*\d.)\s]+/, ""))
    .filter(Boolean);
  const syarat = (p.ppdb_syarat || "")
    .split("\n")
    .map((a) => a.trim().replace(/^[-•*\d.)\s]+/, ""))
    .filter(Boolean);

  const sisa = Math.max(profil.ppdb.kuota - profil.ppdb.terisi, 0);

  return (
    <>
      <KepalaHalaman
        judul={`PPDB Tahun Ajaran ${p.ppdb_tahun || ""}`.trim()}
        keterangan="Seluruh tahap pendaftaran dilakukan secara online. Bacalah persyaratan dan jadwal berikut sebelum mengisi formulir."
        anak={
          <div className="flex flex-wrap items-center gap-3">
            <Lencana
              warna={
                profil.ppdb.dibuka
                  ? "border-green-200 bg-green-100 text-green-800"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }
            >
              {profil.ppdb.dibuka ? "Pendaftaran dibuka" : "Pendaftaran belum dibuka"}
            </Lencana>
            {profil.ppdb.dibuka ? (
              <Link
                href="/ppdb/daftar"
                className="rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
              >
                Isi Formulir Pendaftaran
              </Link>
            ) : null}
            <Link
              href="/ppdb/cek"
              className="rounded-lg border border-garis bg-white px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru"
            >
              Cek Status Pendaftaran
            </Link>
          </div>
        }
      />

      <div className="wadah py-14">
        {/* Angka penting */}
        <MunculNaik>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Kuota keseluruhan", v: angka(profil.ppdb.kuota) },
              { k: "Sudah mendaftar", v: angka(profil.ppdb.terisi) },
              { k: "Sisa kuota", v: angka(sisa) },
              {
                k: "Terisi",
                v: `${persen(profil.ppdb.terisi, profil.ppdb.kuota)}%`,
              },
            ].map((s) => (
              <div key={s.k} className="kartu px-5 py-6 text-center">
                <p className="text-3xl font-bold text-biru-tua tabular-nums">{s.v}</p>
                <p className="mt-1 text-sm text-samar">{s.k}</p>
              </div>
            ))}
          </div>
        </MunculNaik>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div className="space-y-14">
            {/* Jadwal */}
            <MunculNaik>
              <section>
                <JudulBagian atas="Waktu" judul="Jadwal Pendaftaran" />
                <ol className="relative space-y-6 border-l-2 border-garis pl-7">
                  {[
                    {
                      k: "Pendaftaran dibuka",
                      v: p.ppdb_mulai,
                      ket: "Formulir online mulai dapat diisi.",
                    },
                    {
                      k: "Pendaftaran ditutup",
                      v: p.ppdb_selesai,
                      ket: "Batas akhir pengisian formulir dan unggah berkas.",
                    },
                    {
                      k: "Pengumuman hasil",
                      v: p.ppdb_pengumuman,
                      ket: "Hasil verifikasi dapat dilihat lewat menu Cek Status.",
                    },
                  ].map(
                    (t) =>
                      t.v && (
                        <li key={t.k} className="relative">
                          <span
                            className="absolute top-1.5 -left-[35px] grid h-4 w-4 place-items-center rounded-full border-2 border-biru bg-white"
                            aria-hidden
                          />
                          <p className="font-semibold text-biru-tua">{t.k}</p>
                          <p className="text-[15px] text-teks">{tanggalPanjang(t.v)}</p>
                          <p className="mt-0.5 text-sm text-samar">{t.ket}</p>
                        </li>
                      ),
                  )}
                </ol>
                {p.ppdb_biaya && (
                  <p className="mt-6 rounded-lg border border-emas/40 bg-emas/10 px-5 py-4 text-sm text-biru-tua">
                    <strong>Biaya pendaftaran:</strong> {p.ppdb_biaya}
                  </p>
                )}
              </section>
            </MunculNaik>

            {/* Jalur */}
            <MunculNaik>
              <section>
                <JudulBagian
                  atas="Pilihan"
                  judul="Jalur Pendaftaran"
                  keterangan="Pilih satu jalur yang sesuai dengan keadaan Anda."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {profil.ppdb.jalur.map((j) => (
                    <div key={j} className="kartu p-5">
                      <h3 className="text-base">{j}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-samar">
                        {KETERANGAN_JALUR[j] ?? ""}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </MunculNaik>

            {/* Alur */}
            <MunculNaik>
              <section>
                <JudulBagian atas="Tahapan" judul="Alur Pendaftaran" />
                {alur.length > 0 && !belumTerisi(p.ppdb_alur) ? (
                  <ol className="space-y-3">
                    {alur.map((a, i) => (
                      <li key={i} className="kartu flex gap-4 p-5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-biru text-sm font-bold text-white tabular-nums">
                          {i + 1}
                        </span>
                        <span className="pt-1 text-[15px] leading-relaxed">{a}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  // Tanpa naskah dari sekolah, yang ditampilkan adalah alur
                  // yang benar-benar dijalankan sistem ini.
                  <ol className="space-y-3">
                    {[
                      "Isi formulir pendaftaran online dan unggah dokumen yang diminta.",
                      "Nomor registrasi diterbitkan seketika setelah formulir terkirim. Simpan nomor tersebut.",
                      "Panitia memverifikasi kelengkapan dan kesesuaian berkas.",
                      "Pantau hasil verifikasi lewat menu Cek Status memakai nomor registrasi dan tanggal lahir.",
                      "Peserta yang diterima melakukan daftar ulang sesuai ketentuan sekolah.",
                    ].map((a, i) => (
                      <li key={i} className="kartu flex gap-4 p-5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-biru text-sm font-bold text-white tabular-nums">
                          {i + 1}
                        </span>
                        <span className="pt-1 text-[15px] leading-relaxed">{a}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </MunculNaik>
          </div>

          <div className="space-y-8">
            {/* Dokumen */}
            <MunculNaik>
              <div className="kartu overflow-hidden">
                <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                  Dokumen yang Diunggah
                </h2>
                <ul className="divide-y divide-garis">
                  {DOKUMEN.map((d) => (
                    <li key={d.nama} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[15px] font-semibold text-teks">{d.nama}</p>
                        <Lencana
                          warna={
                            d.wajib
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-garis bg-slate-50 text-samar"
                          }
                        >
                          {d.wajib ? "Wajib" : "Opsional"}
                        </Lencana>
                      </div>
                      <p className="mt-0.5 text-xs text-samar">
                        {d.tipe}, maksimal 2 MB.
                        {d.catatan ? ` ${d.catatan}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </MunculNaik>

            {/* Persyaratan dari sekolah */}
            {syarat.length > 0 && !belumTerisi(p.ppdb_syarat) && (
              <MunculNaik>
                <div className="kartu overflow-hidden">
                  <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                    Persyaratan Tambahan
                  </h2>
                  <ul className="space-y-2.5 px-6 py-5 text-sm leading-relaxed">
                    {syarat.map((s, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-biru" aria-hidden />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </MunculNaik>
            )}

            {/* Kuota peminatan */}
            {jurusan.length > 0 && (
              <MunculNaik>
                <div className="kartu overflow-hidden">
                  <h2 className="border-b border-garis bg-biru-muda px-6 py-4 text-base">
                    Kuota per Peminatan
                  </h2>
                  <ul className="divide-y divide-garis">
                    {jurusan.map((j) => (
                      <li key={j.id} className="px-6 py-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[15px] font-semibold text-teks">{j.nama}</p>
                          <p className="text-sm text-samar tabular-nums">
                            {angka(j.pendaftar)} / {angka(j.kuota)}
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-biru-muda">
                          <div
                            className="h-full rounded-full bg-biru"
                            style={{
                              width: `${Math.min(persen(j.pendaftar, j.kuota), 100)}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </MunculNaik>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

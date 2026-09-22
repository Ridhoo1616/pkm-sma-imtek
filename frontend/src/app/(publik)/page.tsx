import Link from "next/link";
import { api, urlUnggahan } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import { angka, persen, tanggalPanjang, belumTerisi } from "@/lib/format";
import { JudulBagian, GambarKosong, Lencana } from "@/komponen/Bagian";
import { MunculNaik, MunculLangsung, KartuGerak } from "@/komponen/Gerak";
import type { Berita, Fasilitas, Jurusan } from "@/lib/tipe";

/**
 * Beranda. Seluruh isinya berasal dari basis data lewat API, sehingga
 * sekolah dapat mengubah tampilan halaman ini dari panel admin tanpa
 * menyentuh kode.
 */
export default async function Beranda() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  // Kegagalan satu bagian tidak boleh mengosongkan seluruh beranda.
  const [jurusan, fasilitas, berita] = await Promise.all([
    api.jurusan().then((h) => h.data).catch((): Jurusan[] => []),
    api.fasilitas().then((h) => h.data).catch((): Fasilitas[] => []),
    api.berita("?per_halaman=3").then((h) => h.data).catch((): Berita[] => []),
  ]);

  const sisaKuota = Math.max(profil.ppdb.kuota - profil.ppdb.terisi, 0);

  return (
    <>
      {/* ---------------- Sorotan ---------------- */}
      <section className="relative overflow-hidden bg-biru-tua text-white">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(1000px 420px at 12% 0%, #1d6ec0 0%, transparent 62%), " +
              "radial-gradient(760px 420px at 92% 100%, #f2b53c33 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <div className="wadah relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_1fr]">
          <MunculLangsung>
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {p.status_sekolah && (
                  <Lencana warna="border-white/25 bg-white/10 text-white">
                    {p.status_sekolah}
                  </Lencana>
                )}
                {p.akreditasi && (
                  <Lencana warna="border-emas/40 bg-emas/20 text-emas">
                    Akreditasi {p.akreditasi}
                  </Lencana>
                )}
                {p.npsn && (
                  <Lencana warna="border-white/25 bg-white/10 text-white">
                    NPSN {p.npsn}
                  </Lencana>
                )}
              </div>

              <h1 className="text-4xl leading-[1.12] font-bold text-balance text-white md:text-5xl">
                {p.nama_sekolah || "SMA IMTEK"}
              </h1>
              {p.tagline && !belumTerisi(p.tagline) && (
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/85">
                  {p.tagline}
                </p>
              )}
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">
                Pendaftaran peserta didik baru dilakukan sepenuhnya secara
                online. Mengisi formulir, mengunggah dokumen, sampai memantau
                hasil verifikasi, semuanya tanpa perlu datang berulang kali ke
                sekolah.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {profil.ppdb.dibuka ? (
                  <Link
                    href="/ppdb/daftar"
                    className="rounded-xl bg-emas px-6 py-3.5 font-semibold text-biru-tua transition hover:brightness-95"
                  >
                    Daftar Sekarang
                  </Link>
                ) : (
                  <Link
                    href="/ppdb"
                    className="rounded-xl bg-white/15 px-6 py-3.5 font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25"
                  >
                    Lihat Jadwal PPDB
                  </Link>
                )}
                <Link
                  href="/ppdb/cek"
                  className="rounded-xl bg-white/10 px-6 py-3.5 font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
                >
                  Cek Status Pendaftaran
                </Link>
                <Link
                  href="/profil"
                  className="rounded-xl px-6 py-3.5 font-semibold text-white/85 underline-offset-4 transition hover:text-white hover:underline"
                >
                  Kenali sekolah kami
                </Link>
              </div>
            </div>
          </MunculLangsung>

          {/* Kartu keadaan PPDB: angka yang paling dicari pengunjung. */}
          <MunculLangsung jeda={0.12}>
            <div className="rounded-kartu bg-white p-6 text-teks shadow-kuat md:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-samar uppercase">
                    Penerimaan Peserta Didik Baru
                  </p>
                  <p className="mt-1 text-2xl font-bold text-biru-tua">
                    Tahun Ajaran {p.ppdb_tahun || "-"}
                  </p>
                </div>
                <Lencana
                  warna={
                    profil.ppdb.dibuka
                      ? "border-green-200 bg-green-100 text-green-800"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  }
                >
                  {profil.ppdb.dibuka ? "Dibuka" : "Belum dibuka"}
                </Lencana>
              </div>

              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "Kuota", v: angka(profil.ppdb.kuota) },
                  { k: "Pendaftar", v: angka(profil.ppdb.terisi) },
                  { k: "Sisa", v: angka(sisaKuota) },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl bg-biru-muda px-3 py-4">
                    <dd className="text-2xl font-bold text-biru-tua tabular-nums">
                      {s.v}
                    </dd>
                    <dt className="mt-0.5 text-xs font-semibold text-samar">{s.k}</dt>
                  </div>
                ))}
              </dl>

              {profil.ppdb.kuota > 0 && (
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-samar">
                    <span>Kuota terisi</span>
                    <span className="tabular-nums">
                      {persen(profil.ppdb.terisi, profil.ppdb.kuota)}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-biru-muda">
                    <div
                      className="h-full rounded-full bg-biru"
                      style={{
                        width: `${Math.min(persen(profil.ppdb.terisi, profil.ppdb.kuota), 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <dl className="mt-6 space-y-2.5 border-t border-garis pt-5 text-sm">
                {[
                  { k: "Pendaftaran dibuka", v: p.ppdb_mulai },
                  { k: "Pendaftaran ditutup", v: p.ppdb_selesai },
                  { k: "Pengumuman hasil", v: p.ppdb_pengumuman },
                ].map(
                  (b) =>
                    b.v && (
                      <div key={b.k} className="flex justify-between gap-4">
                        <dt className="text-samar">{b.k}</dt>
                        <dd className="text-right font-semibold text-biru-tua">
                          {tanggalPanjang(b.v)}
                        </dd>
                      </div>
                    ),
                )}
                {p.ppdb_biaya && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-samar">Biaya pendaftaran</dt>
                    <dd className="text-right font-semibold text-biru-tua">
                      {p.ppdb_biaya}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </MunculLangsung>
        </div>
      </section>

      {/* ---------------- Peminatan ---------------- */}
      {jurusan.length > 0 && (
        <section className="wadah py-16 md:py-20">
          <JudulBagian
            atas="Pilihan Belajar"
            judul="Peminatan yang Dibuka"
            keterangan="Pilih peminatan saat mendaftar. Kuota setiap peminatan terbatas dan terisi berdasarkan urutan verifikasi berkas."
            tengah
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jurusan.map((j, i) => {
              const sisa = Math.max(j.kuota - j.pendaftar, 0);
              return (
                <MunculNaik key={j.id} jeda={i * 0.08}>
                  <KartuGerak className="kartu flex h-full flex-col p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-lg bg-biru-muda px-2.5 py-1 text-xs font-bold tracking-wider text-biru">
                        {j.kode}
                      </span>
                      <span className="text-xs font-semibold text-samar tabular-nums">
                        Kuota {angka(j.kuota)}
                      </span>
                    </div>
                    <h3 className="text-lg">{j.nama}</h3>
                    {j.deskripsi && !belumTerisi(j.deskripsi) && (
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-samar">
                        {j.deskripsi}
                      </p>
                    )}
                    <div className="mt-5 border-t border-garis pt-4">
                      <div className="mb-1.5 flex justify-between text-xs font-semibold text-samar">
                        <span>{angka(j.pendaftar)} pendaftar</span>
                        <span className="tabular-nums">sisa {angka(sisa)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-biru-muda">
                        <div
                          className="h-full rounded-full bg-biru"
                          style={{ width: `${Math.min(persen(j.pendaftar, j.kuota), 100)}%` }}
                        />
                      </div>
                    </div>
                  </KartuGerak>
                </MunculNaik>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------- Fasilitas ---------------- */}
      {fasilitas.length > 0 && (
        <section className="bg-biru-muda/50 py-16 md:py-20">
          <div className="wadah">
            <JudulBagian
              atas="Sarana Belajar"
              judul="Fasilitas Sekolah"
              keterangan="Sarana yang menunjang kegiatan belajar sehari-hari."
              tengah
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {fasilitas.slice(0, 8).map((f, i) => (
                <MunculNaik key={f.id} jeda={(i % 4) * 0.07}>
                  <div className="kartu h-full p-5">
                    <h3 className="text-base">{f.nama}</h3>
                    {f.deskripsi && (
                      <p className="mt-2 text-sm leading-relaxed text-samar">
                        {f.deskripsi}
                      </p>
                    )}
                  </div>
                </MunculNaik>
              ))}
            </div>
            {fasilitas.length > 8 && (
              <div className="mt-8 text-center">
                <Link
                  href="/fasilitas"
                  className="inline-block rounded-lg border border-garis bg-white px-5 py-2.5 text-sm font-semibold text-biru transition hover:bg-biru-muda"
                >
                  Lihat semua {fasilitas.length} fasilitas
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------- Berita ---------------- */}
      {berita.length > 0 && (
        <section className="wadah py-16 md:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <JudulBagian
              atas="Kabar Sekolah"
              judul="Berita & Pengumuman"
              keterangan="Kegiatan, prestasi, dan pengumuman terbaru."
            />
            <Link
              href="/berita"
              className="mb-8 shrink-0 rounded-lg border border-garis px-4 py-2 text-sm font-semibold text-biru transition hover:bg-biru-muda"
            >
              Semua berita
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {berita.map((b, i) => (
              <MunculNaik key={b.id} jeda={i * 0.08}>
                <KartuGerak className="kartu h-full overflow-hidden">
                  <Link href={`/berita/${b.slug}`} className="block h-full">
                    {b.gambar ? (
                      // Gambar berasal dari server API, bukan dari daftar
                      // domain yang dikenal next/image, jadi memakai <img>.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlUnggahan("berita", b.gambar)}
                        alt={b.judul}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <GambarKosong label={b.kategori} />
                    )}
                    <div className="p-5">
                      <div className="mb-2.5 flex items-center gap-2">
                        <Lencana>{b.kategori}</Lencana>
                        <span className="text-xs text-samar">
                          {tanggalPanjang(b.dibuat)}
                        </span>
                      </div>
                      <h3 className="text-base leading-snug text-balance">{b.judul}</h3>
                      {b.ringkasan && (
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-samar">
                          {b.ringkasan}
                        </p>
                      )}
                    </div>
                  </Link>
                </KartuGerak>
              </MunculNaik>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Ajakan ---------------- */}
      <section className="wadah pb-20">
        <MunculNaik>
          <div className="rounded-kartu bg-biru-tua px-7 py-12 text-center text-white md:px-12">
            <h2 className="text-2xl text-white md:text-3xl">
              {profil.ppdb.dibuka
                ? "Pendaftaran sedang dibuka"
                : "Siapkan dokumen pendaftaran Anda"}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-white/80">
              {profil.ppdb.dibuka
                ? `Isi formulir dan unggah dokumen dari mana saja. Nomor registrasi diterbitkan seketika, dan status verifikasi dapat dipantau kapan pun.`
                : `Formulir akan terbuka pada ${
                    p.ppdb_mulai ? tanggalPanjang(p.ppdb_mulai) : "jadwal yang diumumkan sekolah"
                  }. Persyaratannya dapat dibaca lebih dahulu di halaman informasi PPDB.`}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href={profil.ppdb.dibuka ? "/ppdb/daftar" : "/ppdb"}
                className="rounded-xl bg-emas px-6 py-3.5 font-semibold text-biru-tua transition hover:brightness-95"
              >
                {profil.ppdb.dibuka ? "Isi Formulir PPDB" : "Baca Persyaratan"}
              </Link>
              <Link
                href="/kontak"
                className="rounded-xl bg-white/10 px-6 py-3.5 font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
              >
                Tanya Panitia
              </Link>
            </div>
          </div>
        </MunculNaik>
      </section>
    </>
  );
}

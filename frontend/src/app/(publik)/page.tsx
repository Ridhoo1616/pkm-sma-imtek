import Link from "next/link";
import { api, urlUnggahan } from "@/lib/api";
import { muatProfil } from "@/lib/profil";
import {
  angka,
  persen,
  tanggalPanjang,
  belumTerisi,
  kePoinTerisi,
} from "@/lib/format";
import {
  JudulBagian,
  GambarKosong,
  Lencana,
  kelasKartuAkhir,
} from "@/komponen/Bagian";
import { MunculNaik, MunculLangsung, KartuGerak } from "@/komponen/Gerak";
import { MasalahJawaban } from "@/komponen/MasalahJawaban";
import type { Berita, Fasilitas, Jurusan } from "@/lib/tipe";
import { IkonFasilitas, IkonCentang, IkonLokasi } from "@/komponen/Ikon";

/**
 * Beranda. Seluruh isinya berasal dari basis data lewat API, sehingga
 * sekolah dapat mengubah tampilan halaman ini dari panel admin tanpa
 * menyentuh kode.
 *
 * URUTANNYA SENGAJA PROFIL SEKOLAH DULU, PPDB MENYUSUL. Sebelumnya beranda
 * dibuka dengan kartu besar berisi kuota dan jumlah pendaftar. Angka itu
 * menjawab pertanyaan orang yang sudah memutuskan mendaftar, padahal yang
 * lebih dulu ditanyakan orang tua yang baru mencari sekolah adalah
 * sekolahnya seperti apa, apa yang ditawarkan, dan sebagus apa. Judul PkM
 * ini pun tentang PROMOSI. Jadi bagian atas sekarang sekolahnya sendiri —
 * nama, akreditasi, foto gedung, dan angka yang bisa diperiksa — sedangkan
 * keadaan PPDB turun menjadi satu bilah ringkas, dan ajakan mendaftarnya
 * tetap ada di ujung halaman.
 *
 * Tidak ada satu kalimat pun tentang mutu sekolah yang ditulis di berkas
 * ini. Bagian keunggulan membaca pengaturan `keunggulan` yang diisi sekolah;
 * selama isinya masih bertanda [kurung siku], bagiannya tidak ditampilkan.
 */
export default async function Beranda() {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;

  // Kegagalan satu bagian tidak boleh mengosongkan seluruh beranda.
  const [jurusan, fasilitas, berita, prestasi] = await Promise.all([
    api.jurusan().then((h) => h.data).catch((): Jurusan[] => []),
    api.fasilitas().then((h) => h.data).catch((): Fasilitas[] => []),
    api.berita("?per_halaman=3").then((h) => h.data).catch((): Berita[] => []),
    api
      .berita("?kategori=Prestasi&per_halaman=3")
      .then((h) => h.data)
      .catch((): Berita[] => []),
  ]);

  const sisaKuota = Math.max(profil.ppdb.kuota - profil.ppdb.terisi, 0);
  const adaGedung = Boolean(p.foto_depan && !belumTerisi(p.foto_depan));
  // Diperiksa per baris, bukan sekali untuk seluruh nilainya: bila sekolah
  // baru mengisi sebagian poinnya, yang sudah diisi tetap tampil.
  const keunggulan = kePoinTerisi(p.keunggulan);

  // Angka sekolah: hanya yang benar-benar terhitung dari basis data. Yang
  // isinya masih nol tidak ditampilkan sebagai "0", tetapi dibuang dari
  // daftar, supaya halaman promosi tidak memamerkan angka kosong.
  const angkaSekolah = [
    { k: "Peminatan", v: jurusan.length, satuan: "pilihan" },
    { k: "Fasilitas", v: fasilitas.length, satuan: "sarana" },
  ].filter((a) => a.v > 0);

  return (
    <>
      {/* ---------------- Sorotan: sekolahnya, bukan pendaftarannya --------- */}
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
        <div className="wadah relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <MunculLangsung>
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {p.status_sekolah && (
                  <Lencana jenis="putih">{p.status_sekolah}</Lencana>
                )}
                {p.akreditasi && (
                  <Lencana jenis="emas">Akreditasi {p.akreditasi}</Lencana>
                )}
                {p.npsn && <Lencana jenis="putih">NPSN {p.npsn}</Lencana>}
              </div>

              <h1 className="text-4xl leading-[1.12] font-bold text-balance text-white md:text-5xl">
                {p.nama_sekolah || "SMA IMTEK"}
              </h1>

              {p.tagline && !belumTerisi(p.tagline) && (
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/85">
                  {p.tagline}
                </p>
              )}

              {/* Satu kalimat pengantar, SELALU tampil. Sorotan pernah
                  berisi lambang, nama, dan tombol saja, dan ketika semboyan
                  sekolah belum dikirim bagian itu jadi terlalu lapang.

                  Kalimatnya sengaja menerangkan APA YANG ADA DI SITUS INI,
                  bukan memuji sekolahnya. Kalimat tentang mutu sekolah hanya
                  boleh datang dari sekolah sendiri, dan tempatnya sudah
                  disediakan: semboyan di atas dan bagian keunggulan di
                  bawah. Yang ini dapat ditulis di sini karena isinya cuma
                  daftar bagian yang memang ada, dan itu dapat diperiksa
                  siapa pun dengan menggulir halamannya. */}
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">
                Di halaman ini tersedia profil sekolah, peminatan yang dibuka,
                sarana belajar, kegiatan siswa, beserta pendaftaran peserta
                didik baru yang seluruhnya dikerjakan online — mengisi
                formulir, mengunggah dokumen, sampai memantau hasil
                verifikasinya.
              </p>

              {/* Keterangan tempat, disusun dari data alamat yang sudah ada.
                  Bukan kalimat promosi: hanya menyebut sekolahnya di mana. */}
              {(p.kecamatan || p.kota) && (
                <p className="mt-4 flex items-start gap-2 text-white/75">
                  <IkonLokasi ukuran={18} className="mt-0.5 shrink-0" />
                  <span className="leading-relaxed">
                    {[p.kecamatan, p.kota, p.provinsi]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/profil"
                  className="rounded-xl bg-emas px-6 py-3.5 font-semibold text-biru-tua transition hover:brightness-95"
                >
                  Kenali Sekolah Kami
                </Link>
                <Link
                  href="/ppdb"
                  className="rounded-xl bg-white/10 px-6 py-3.5 font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
                >
                  Informasi PPDB
                </Link>
              </div>
            </div>
          </MunculLangsung>

          {/* Foto gedung sekolah beserta angka yang bisa diperiksa. */}
          <MunculLangsung jeda={0.12}>
            <div className="overflow-hidden rounded-kartu bg-white shadow-kuat">
              {adaGedung ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlUnggahan("profil", p.foto_depan)}
                  alt={`Gedung ${p.nama_sekolah || "sekolah"}`}
                  className="aspect-[4/3] w-full bg-biru-muda object-cover"
                />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center bg-biru-muda px-6 text-center">
                  <div>
                    <span
                      aria-hidden
                      className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-biru"
                    >
                      ☐
                    </span>
                    <p className="mt-3 text-sm font-semibold text-biru-tua">
                      Tempat foto gedung sekolah
                    </p>
                    <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-biru/70">
                      Foto mendatar, perbandingan sisi 4:3, paling tidak 1600
                      piksel lebarnya. Diunggah sebagai
                      <span className="font-semibold"> Foto halaman depan </span>
                      lewat menu Pengaturan di panel admin.
                    </p>
                  </div>
                </div>
              )}

              <dl className="grid grid-cols-3 divide-x divide-garis border-t border-garis text-center text-teks">
                {angkaSekolah.map((a) => (
                  <div key={a.k} className="px-3 py-4">
                    <dd className="text-2xl font-bold text-biru-tua tabular-nums">
                      {angka(a.v)}
                    </dd>
                    <dt className="mt-0.5 text-xs font-semibold text-samar">
                      {a.k}
                    </dt>
                  </div>
                ))}
                <div className="px-3 py-4">
                  <dd className="text-2xl font-bold text-biru-tua">
                    {p.akreditasi || "–"}
                  </dd>
                  <dt className="mt-0.5 text-xs font-semibold text-samar">
                    Akreditasi
                  </dt>
                </div>
              </dl>
            </div>
          </MunculLangsung>
        </div>
      </section>

      {/* ---------------- Bilah keadaan PPDB ----------------
          Ringkas dan satu baris. Angka lengkapnya ada di halaman PPDB; di
          sini cukup supaya pengunjung tahu pendaftarannya sedang dibuka atau
          belum, tanpa mengambil alih bagian atas halaman. */}
      <section className="border-b border-garis bg-biru-muda">
        <div className="wadah flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Lencana jenis={profil.ppdb.dibuka ? "hijau" : "abu"}>
              {profil.ppdb.dibuka ? "PPDB Dibuka" : "PPDB Belum Dibuka"}
            </Lencana>
            <p className="text-sm leading-relaxed text-biru-tua">
              <span className="font-semibold">
                Tahun Ajaran {p.ppdb_tahun || "-"}
              </span>
              {profil.ppdb.dibuka && p.ppdb_selesai && (
                <> · ditutup {tanggalPanjang(p.ppdb_selesai)}</>
              )}
              {!profil.ppdb.dibuka && p.ppdb_mulai && (
                <> · dibuka {tanggalPanjang(p.ppdb_mulai)}</>
              )}
              {profil.ppdb.kuota > 0 && (
                <>
                  {" "}
                  · sisa kuota{" "}
                  <span className="font-semibold tabular-nums">
                    {angka(sisaKuota)}
                  </span>{" "}
                  dari {angka(profil.ppdb.kuota)}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={profil.ppdb.dibuka ? "/ppdb/daftar" : "/ppdb"}
              className="rounded-lg bg-biru px-4 py-2 text-sm font-semibold text-white transition hover:bg-biru-tua"
            >
              {profil.ppdb.dibuka ? "Daftar Sekarang" : "Lihat Jadwal"}
            </Link>
            <Link
              href="/ppdb/cek"
              className="rounded-lg border border-biru/25 bg-white px-4 py-2 text-sm font-semibold text-biru transition hover:bg-white/60"
            >
              Cek Status
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Keunggulan ----------------
          Kalimatnya milik sekolah, diisi lewat pengaturan. Selama belum
          diisi, bagian ini tidak ada sama sekali — bukan diisi contoh. */}
      {keunggulan.length > 0 && (
        <section className="wadah py-16 md:py-20">
          <JudulBagian
            atas="Kenapa Di Sini"
            judul="Yang Ditawarkan Sekolah Ini"
            keterangan="Disampaikan langsung oleh pihak sekolah."
            tengah
          />
          <div className="grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-3">
            {keunggulan.map((poin, i) => (
              <MunculNaik
                key={poin}
                jeda={(i % 3) * 0.08}
                className={kelasKartuAkhir(i, keunggulan.length)}
              >
                <div className="kartu flex h-full gap-3.5 p-5">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-biru-muda text-biru"
                  >
                    <IkonCentang ukuran={17} />
                  </span>
                  <p className="text-[15px] leading-relaxed text-teks">
                    {poin}
                  </p>
                </div>
              </MunculNaik>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Peminatan ---------------- */}
      {jurusan.length > 0 && (
        <section
          className={
            keunggulan.length > 0
              ? "bg-biru-muda/50 py-16 md:py-20"
              : "wadah py-16 md:py-20"
          }
        >
          <div className={keunggulan.length > 0 ? "wadah" : undefined}>
            <JudulBagian
              atas="Pilihan Belajar"
              judul="Peminatan yang Dibuka"
              keterangan="Peminatan menentukan mata pelajaran pendalaman yang diambil siswa. Pilihannya ditetapkan saat mendaftar."
              tengah
            />
            <div className="grid auto-rows-fr gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jurusan.map((j, i) => {
                const sisa = Math.max(j.kuota - j.pendaftar, 0);
                return (
                  <MunculNaik
                    key={j.id}
                    jeda={i * 0.08}
                    className={kelasKartuAkhir(i, jurusan.length)}
                  >
                    <KartuGerak className="kartu flex h-full flex-col p-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 rounded-lg bg-biru-muda px-2.5 py-1 text-xs font-bold tracking-wider text-biru">
                          <IkonFasilitas nama={j.ikon} ukuran={15} />
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
                          <span className="tabular-nums">
                            sisa {angka(sisa)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-biru-muda">
                          <div
                            className="h-full rounded-full bg-biru"
                            style={{
                              width: `${Math.min(persen(j.pendaftar, j.kuota), 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </KartuGerak>
                  </MunculNaik>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Fasilitas ---------------- */}
      {fasilitas.length > 0 && (
        <section
          className={
            keunggulan.length > 0
              ? "wadah py-16 md:py-20"
              : "bg-biru-muda/50 py-16 md:py-20"
          }
        >
          <div className={keunggulan.length > 0 ? undefined : "wadah"}>
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

      {/* ---------------- Prestasi ----------------
          Bukan klaim, melainkan berita berkategori Prestasi yang memang
          sudah dicatat sekolah. Kosong berarti bagiannya tidak muncul. */}
      {prestasi.length > 0 && (
        <section className="bg-biru-tua py-16 text-white md:py-20">
          <div className="wadah">
            <div className="mb-8 text-center">
              <p className="text-xs font-bold tracking-[0.18em] text-emas uppercase">
                Catatan Prestasi
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                Yang Sudah Diraih Siswa
              </h2>
              <span
                aria-hidden
                className="mx-auto mt-3 block h-1 w-16 rounded-full bg-emas"
              />
            </div>
            <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {prestasi.map((b, i) => (
                <MunculNaik
                  key={b.id}
                  jeda={i * 0.08}
                  className={kelasKartuAkhir(i, prestasi.length)}
                >
                  <Link
                    href={`/berita/${b.slug}`}
                    className="flex h-full flex-col rounded-kartu bg-white/10 p-5 ring-1 ring-white/15 transition hover:bg-white/15"
                  >
                    <span className="text-xs font-semibold text-white/70">
                      {tanggalPanjang(b.dibuat)}
                    </span>
                    <h3 className="mt-2 text-base leading-snug text-balance text-white">
                      {b.judul}
                    </h3>
                    {b.ringkasan && (
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-white/75">
                        {b.ringkasan}
                      </p>
                    )}
                    <span className="mt-4 text-sm font-semibold text-emas">
                      Baca selengkapnya →
                    </span>
                  </Link>
                </MunculNaik>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/berita?kategori=Prestasi"
                className="inline-block rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
              >
                Semua prestasi
              </Link>
            </div>
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

          <div className="grid auto-rows-fr gap-6 md:grid-cols-3">
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
                      <h3 className="text-base leading-snug text-balance">
                        {b.judul}
                      </h3>
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

      {/* ---------------- Masalah dan jawabannya ----------------
          Ditaruh tepat sebelum ajakan mendaftar: yang dibaca lebih dulu
          alasannya, baru tombolnya. */}
      <MunculNaik>
        <MasalahJawaban />
      </MunculNaik>

      {/* ---------------- Ajakan mendaftar ----------------
          Tetap di ujung halaman: pengunjung sudah membaca sekolahnya dulu. */}
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
                    p.ppdb_mulai
                      ? tanggalPanjang(p.ppdb_mulai)
                      : "jadwal yang diumumkan sekolah"
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

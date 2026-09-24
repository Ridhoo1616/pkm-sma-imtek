"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import {
  angka,
  namaBulan,
  persen,
  tanggalJam,
  tanggalPanjang,
  warnaStatus,
} from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, KartuAngka, Tabel, BarisBilah } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { DiagramLingkaran } from "@/komponen/DiagramLingkaran";
import { Lencana } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";

/**
 * Tiga rentang bacaan diagram pendaftaran. Dipetakan di satu tempat supaya
 * label tombol, keterangan, medan datanya, dan cara menulis labelnya tidak
 * bisa berselisih satu dengan yang lain.
 */
type JenisRentang = "tanggal" | "bulan" | "tahun";

const RENTANG: Record<
  JenisRentang,
  {
    label: string;
    keterangan: string;
    medan: "tren" | "tren_bulan" | "tren_tahun";
    kosong: string;
    format: (label: string) => string;
  }
> = {
  tanggal: {
    label: "Tanggal",
    keterangan:
      "Bagian formulir yang masuk per tanggal, tiga puluh hari terakhir.",
    medan: "tren",
    kosong: "Belum ada pendaftaran dalam tiga puluh hari terakhir.",
    format: (l) => tanggalPanjang(l),
  },
  bulan: {
    label: "Bulan",
    keterangan:
      "Bagian formulir yang masuk per bulan, dua belas bulan terakhir.",
    medan: "tren_bulan",
    kosong: "Belum ada pendaftaran dalam dua belas bulan terakhir.",
    format: (l) => namaBulan(l),
  },
  tahun: {
    label: "Tahun",
    keterangan:
      "Bagian formulir yang masuk per tahun, sejak pendaftaran pertama.",
    medan: "tren_tahun",
    kosong: "Belum ada pendaftaran yang tercatat.",
    format: (l) => l,
  },
};

export default function HalamanDasbor() {
  return (
    <KerangkaAdmin>
      <IsiDasbor />
    </KerangkaAdmin>
  );
}

function IsiDasbor() {
  const { data, memuat, galat, muatUlang } = useMuat(() => api.dasbor());
  const [rentang, setRentang] = useState<JenisRentang>("tanggal");

  if (memuat) return <Memuat />;
  if (galat) return <PesanGalat pesan={galat} ulangi={muatUlang} />;
  if (!data) return null;

  const maksSumber = Math.max(...data.per_sumber.map((s) => s.jumlah), 1);
  const maksJalur = Math.max(...data.per_jalur.map((s) => s.jumlah), 1);

  return (
    <>
      <KepalaPanel
        judul="Dasbor"
        keterangan={`Ringkasan pendaftaran Tahun Ajaran ${data.tahun_ajaran}.`}
        aksi={
          <Lencana jenis={data.ppdb_dibuka ? "hijau" : "abu"}>
            {data.ppdb_dibuka ? "Pendaftaran dibuka" : "Pendaftaran ditutup"}
          </Lencana>
        }
      />

      {/* Angka utama */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuAngka
          label="Total pendaftar"
          nilai={angka(data.total)}
          keterangan={
            data.kuota > 0
              ? `${persen(data.total, data.kuota)}% dari kuota ${angka(data.kuota)}`
              : undefined
          }
        />
        <KartuAngka label="Masuk hari ini" nilai={angka(data.hari_ini)} />
        <KartuAngka
          label="Tujuh hari terakhir"
          nilai={angka(data.minggu_ini)}
        />
        <KartuAngka
          label="Pesan belum dibaca"
          nilai={angka(data.pesan_belum)}
          warna={data.pesan_belum > 0 ? "text-amber-600" : "text-biru-tua"}
        />
      </div>

      {/* Status pendaftar */}
      <MunculNaik>
        <section className="mt-8">
          <h2 className="mb-4 text-lg">Status Pendaftar</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {data.per_status.map((s) => (
              <Link
                key={s.label}
                href={`/admin/pendaftar?status=${encodeURIComponent(s.label)}`}
                className="kartu px-5 py-5 transition hover:shadow-kuat"
              >
                <p className="text-3xl font-bold text-biru-tua tabular-nums">
                  {angka(s.jumlah)}
                </p>
                <p className="mt-1.5 text-xs leading-snug font-semibold text-samar">
                  {s.label}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </MunculNaik>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Sumber informasi — inti tujuan program ini */}
        <MunculNaik>
          <section className="kartu p-6">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="text-lg">Kanal Promosi Teratas</h2>
              <Link
                href="/admin/laporan"
                className="shrink-0 text-sm font-semibold text-biru hover:underline"
              >
                Laporan lengkap
              </Link>
            </div>
            <p className="mb-5 text-sm text-samar">
              Dari mana pendaftar mengetahui sekolah ini.
            </p>
            {data.per_sumber.length === 0 ? (
              <p className="py-6 text-center text-sm text-samar">
                Belum ada data sumber informasi.
              </p>
            ) : (
              <div className="space-y-4">
                {data.per_sumber.map((s) => (
                  <BarisBilah
                    key={s.label}
                    label={s.label}
                    jumlah={s.jumlah}
                    maks={maksSumber}
                    keterangan={`(${persen(s.jumlah, data.total)}%)`}
                  />
                ))}
              </div>
            )}
          </section>
        </MunculNaik>

        {/* Jalur */}
        <MunculNaik jeda={0.08}>
          <section className="kartu p-6">
            <h2 className="mb-5 text-lg">Jalur Pendaftaran</h2>
            {data.per_jalur.length === 0 ? (
              <p className="py-6 text-center text-sm text-samar">
                Belum ada pendaftar.
              </p>
            ) : (
              <div className="space-y-4">
                {data.per_jalur.map((s) => (
                  <BarisBilah
                    key={s.label}
                    label={s.label}
                    jumlah={s.jumlah}
                    maks={maksJalur}
                    keterangan={`(${persen(s.jumlah, data.total)}%)`}
                  />
                ))}
              </div>
            )}
          </section>
        </MunculNaik>

        {/* Peminatan dengan kuota */}
        <MunculNaik>
          <section className="kartu p-6">
            <h2 className="mb-5 text-lg">Keterisian Peminatan</h2>
            {data.per_jurusan.length === 0 ? (
              <p className="py-6 text-center text-sm text-samar">
                Belum ada peminatan yang aktif.
              </p>
            ) : (
              <div className="space-y-4">
                {data.per_jurusan.map((s) => (
                  <BarisBilah
                    key={s.label}
                    label={s.label}
                    jumlah={s.jumlah}
                    maks={s.kuota || 1}
                    keterangan={`/ ${angka(s.kuota ?? 0)}`}
                    warna={
                      s.kuota && s.jumlah >= s.kuota
                        ? "var(--color-emas)"
                        : "var(--color-biru)"
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </MunculNaik>

        {/* Tren pendaftaran, sebagai diagram lingkaran.

            Bentuknya diminta lingkaran, dan yang dijawabnya memang pertanyaan
            komposisi: dari seluruh formulir yang masuk, berapa bagian datang
            pada tanggal, bulan, atau tahun yang mana.

            Yang perlu dicatat: diagram lingkaran TIDAK memperlihatkan arah
            naik-turunnya. Untuk melihat apakah pendaftaran sedang ramai atau
            sepi, bentuk bilah lebih menjawab — dan itu masih tersedia pada
            bagian Peminatan serta Sumber Informasi di sebelahnya.

            Ketiga rentangnya dihitung terpisah di basis data, bukan dari satu
            deret harian yang dijumlahkan ulang di sini: deret harian hanya
            memuat tiga puluh hari, sehingga angka per tahun yang dihitung
            darinya akan salah. */}
        <MunculNaik jeda={0.08}>
          <section className="kartu p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg">Waktu Pendaftaran Masuk</h2>
                <p className="mt-1 text-sm text-samar">
                  {RENTANG[rentang].keterangan}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 rounded-lg border border-garis p-1">
                {(Object.keys(RENTANG) as JenisRentang[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRentang(k)}
                    aria-pressed={rentang === k}
                    className={
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition " +
                      (rentang === k
                        ? "bg-biru text-white"
                        : "text-teks hover:bg-biru-muda hover:text-biru")
                    }
                  >
                    {RENTANG[k].label}
                  </button>
                ))}
              </div>
            </div>

            <DiagramLingkaran
              data={data[RENTANG[rentang].medan]}
              formatLabel={RENTANG[rentang].format}
              labelKosong={RENTANG[rentang].kosong}
            />
          </section>
        </MunculNaik>
      </div>

      {/* Kunjungan situs */}
      <MunculNaik>
        <BagianKunjungan />
      </MunculNaik>

      {/* Pendaftar terbaru */}
      <MunculNaik>
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg">Pendaftar Terbaru</h2>
            <Link
              href="/admin/pendaftar"
              className="text-sm font-semibold text-biru hover:underline"
            >
              Lihat semua
            </Link>
          </div>

          {data.terbaru.length === 0 ? (
            <TanpaData
              judul="Belum ada pendaftar"
              keterangan="Data akan muncul di sini setelah ada formulir yang dikirim."
            />
          ) : (
            <Tabel
              kepala={[
                "No. Registrasi",
                "Nama",
                "Peminatan",
                "Asal Sekolah",
                "Status",
                "Waktu",
              ]}
            >
              {data.terbaru.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">
                    <Link
                      href={`/admin/pendaftar/${p.id}`}
                      className="text-biru hover:underline"
                    >
                      {p.no_registrasi}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.nama_lengkap}</td>
                  <td className="px-4 py-3 text-samar">
                    {p.nama_jurusan || "-"}
                  </td>
                  <td className="px-4 py-3 text-samar">{p.asal_sekolah}</td>
                  <td className="px-4 py-3">
                    <Lencana jenis={warnaStatus(p.status)}>{p.status}</Lencana>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-samar">
                    {tanggalJam(p.dibuat)}
                  </td>
                </tr>
              ))}
            </Tabel>
          )}
        </section>
      </MunculNaik>
    </>
  );
}

/**
 * Kunjungan situs.
 *
 * Diambil terpisah dari dasbor utamanya, bukan digabung ke satu panggilan,
 * supaya kegagalan menghitung kunjungan tidak mengosongkan seluruh dasbor —
 * angka pendaftaran jauh lebih penting bagi panitia daripada angka kunjungan.
 *
 * Keterbatasannya DISEBUTKAN apa adanya di bawah angkanya. Angka ini tidak
 * sebanding dengan Google Analytics: pencatatannya dijalankan dari peramban
 * pengunjung, sehingga yang mematikan JavaScript dan sebagian besar perayap
 * mesin pencari tidak terhitung; dan yang dihitung "pengunjung" adalah sidik
 * alamat IP per hari, sehingga dua orang di satu jaringan sekolah terhitung
 * satu. Angka yang tidak diterangkan batasnya lebih menyesatkan daripada
 * tidak ada angka.
 */
function BagianKunjungan() {
  const { data, memuat, galat, muatUlang } = useMuat(() => api.kunjungan());
  const [rentang, setRentang] = useState<JenisRentang>("tanggal");

  const MEDAN: Record<JenisRentang, "per_hari" | "per_bulan" | "per_tahun"> = {
    tanggal: "per_hari",
    bulan: "per_bulan",
    tahun: "per_tahun",
  };

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg">Kunjungan Situs</h2>
          <p className="mt-1 text-sm text-samar">
            Berapa kali halaman publik dibuka, dan bagian mana yang paling
            banyak dibuka.
          </p>
        </div>
      </div>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KartuAngka
              label="Kunjungan hari ini"
              nilai={angka(data.hari_ini)}
            />
            <KartuAngka
              label="Pengunjung hari ini"
              nilai={angka(data.pengunjung_hari_ini)}
            />
            <KartuAngka
              label="Kunjungan tujuh hari"
              nilai={angka(data.minggu_ini)}
            />
            <KartuAngka
              label="Total kunjungan"
              nilai={angka(data.total_kunjungan)}
              keterangan={`${angka(data.total_pengunjung)} pengunjung berbeda`}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="kartu p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base">Waktu Kunjungan</h3>
                  <p className="mt-1 text-sm text-samar">
                    {RENTANG[rentang].keterangan.replace(
                      "formulir yang masuk",
                      "kunjungan",
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 rounded-lg border border-garis p-1">
                  {(Object.keys(RENTANG) as JenisRentang[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setRentang(k)}
                      aria-pressed={rentang === k}
                      className={
                        "rounded-md px-3 py-1.5 text-xs font-semibold transition " +
                        (rentang === k
                          ? "bg-biru text-white"
                          : "text-teks hover:bg-biru-muda hover:text-biru")
                      }
                    >
                      {RENTANG[k].label}
                    </button>
                  ))}
                </div>
              </div>
              <DiagramLingkaran
                data={data[MEDAN[rentang]]}
                formatLabel={RENTANG[rentang].format}
                labelKosong="Belum ada kunjungan yang tercatat pada rentang ini."
              />
            </section>

            <section className="kartu p-6">
              <h3 className="text-base">Bagian yang Paling Dibuka</h3>
              <p className="mt-1 mb-5 text-sm text-samar">
                Sepuluh bagian situs dengan kunjungan terbanyak.
              </p>
              <DiagramLingkaran
                data={data.per_halaman}
                labelKosong="Belum ada kunjungan yang tercatat."
                formatLabel={(l) => (l === "/" ? "Beranda" : l)}
              />
            </section>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-samar">
            Angka ini tidak sebanding dengan Google Analytics, dan sebaiknya
            dibaca sebagai perbandingan antarbagian, bukan sebagai jumlah orang
            yang pasti. Pencatatannya dijalankan dari peramban pengunjung,
            sehingga pengunjung yang mematikan JavaScript dan sebagian besar
            perayap mesin pencari tidak terhitung. Satu &ldquo;pengunjung&rdquo;
            berarti satu alamat jaringan per hari: dua orang pada satu jaringan
            terhitung satu, dan satu orang yang berganti dari Wi-Fi ke data
            seluler terhitung dua. Alamat IP-nya sendiri tidak disimpan; yang
            disimpan sidik ringkasnya yang berganti setiap hari.
          </p>
        </>
      )}
    </section>
  );
}

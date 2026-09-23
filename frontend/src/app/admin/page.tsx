"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { angka, persen, tanggalJam, tanggalPanjang, warnaStatus } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, KartuAngka, Tabel, BarisBilah } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";

export default function HalamanDasbor() {
  return (
    <KerangkaAdmin>
      <IsiDasbor />
    </KerangkaAdmin>
  );
}

function IsiDasbor() {
  const { data, memuat, galat, muatUlang } = useMuat(() => api.dasbor());

  if (memuat) return <Memuat />;
  if (galat) return <PesanGalat pesan={galat} ulangi={muatUlang} />;
  if (!data) return null;

  const maksSumber = Math.max(...data.per_sumber.map((s) => s.jumlah), 1);
  const maksJalur = Math.max(...data.per_jalur.map((s) => s.jumlah), 1);
  const maksTren = Math.max(...data.tren.map((s) => s.jumlah), 1);

  return (
    <>
      <KepalaPanel
        judul="Dasbor"
        keterangan={`Ringkasan pendaftaran Tahun Ajaran ${data.tahun_ajaran}.`}
        aksi={
          <Lencana
            jenis={
              data.ppdb_dibuka
                ? "hijau"
                : "abu"
            }
          >
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
        <KartuAngka label="Tujuh hari terakhir" nilai={angka(data.minggu_ini)} />
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

        {/* Tren harian */}
        <MunculNaik jeda={0.08}>
          <section className="kartu p-6">
            <h2 className="mb-1 text-lg">Pendaftaran 30 Hari Terakhir</h2>
            <p className="mb-5 text-sm text-samar">
              Jumlah formulir yang masuk per hari.
            </p>
            {data.tren.length === 0 ? (
              <p className="py-6 text-center text-sm text-samar">
                Belum ada pendaftaran dalam 30 hari terakhir.
              </p>
            ) : (
              <div className="flex h-40 items-end gap-1 overflow-x-auto">
                {data.tren.map((t) => (
                  <div
                    key={t.label}
                    // h-full wajib: tinggi berbentuk persen pada bilah di
                    // bawah hanya terhitung bila kolomnya punya tinggi pasti.
                    className="group flex h-full min-w-4 flex-1 flex-col items-center justify-end gap-1"
                    title={`${tanggalPanjang(t.label)}: ${t.jumlah} pendaftar`}
                  >
                    <span className="text-[10px] font-semibold text-samar tabular-nums opacity-0 transition group-hover:opacity-100">
                      {t.jumlah}
                    </span>
                    <span
                      // Lebar dibatasi agar satu hari tunggal tidak menjadi
                      // satu blok raksasa selebar kartunya.
                      className="w-full max-w-8 rounded-t bg-biru transition group-hover:bg-biru-tua"
                      style={{
                        height: `${Math.max((t.jumlah / maksTren) * 100, 6)}%`,
                      }}
                    />
                    <span className="text-[9px] text-samar tabular-nums">
                      {t.label.slice(8)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </MunculNaik>
      </div>

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
              kepala={["No. Registrasi", "Nama", "Peminatan", "Asal Sekolah", "Status", "Waktu"]}
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
                  <td className="px-4 py-3 text-samar">{p.nama_jurusan || "-"}</td>
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

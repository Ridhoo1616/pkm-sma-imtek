"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { angka, namaBulan, persen } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, KartuAngka, Tabel, BarisBilah } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { MunculNaik } from "@/komponen/Gerak";
import type { Cacah } from "@/lib/tipe";

export default function HalamanLaporan() {
  return (
    <KerangkaAdmin>
      <IsiLaporan />
    </KerangkaAdmin>
  );
}

function Bagian({
  judul,
  keterangan,
  data,
  total,
  warna,
  pakaiKuota,
}: {
  judul: string;
  keterangan?: string;
  data: Cacah[];
  total: number;
  warna?: string;
  pakaiKuota?: boolean;
}) {
  const maks = Math.max(...data.map((d) => d.jumlah), 1);
  return (
    <section className="kartu p-6">
      <h2 className="text-lg">{judul}</h2>
      {keterangan && <p className="mt-1 mb-5 text-sm text-samar">{keterangan}</p>}
      {!keterangan && <div className="mb-5" />}

      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-samar">Belum ada data.</p>
      ) : (
        <div className="space-y-4">
          {data.map((d) => (
            <BarisBilah
              key={d.label}
              label={d.label}
              jumlah={d.jumlah}
              // Peminatan yang kuotanya belum ditetapkan dibandingkan
              // terhadap peminatan terbanyak, dan ditandai keterangannya —
              // kalau tidak, bilahnya tampak penuh padahal tidak ada kuota.
              maks={pakaiKuota ? d.kuota || maks : maks}
              keterangan={
                pakaiKuota
                  ? d.kuota
                    ? `/ ${angka(d.kuota)}`
                    : "· kuota belum diisi"
                  : `(${persen(d.jumlah, total)}%)`
              }
              warna={warna}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function IsiLaporan() {
  const [tahun, setTahun] = useState("");
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.laporan(tahun),
    [tahun],
  );

  if (memuat) return <Memuat pesan="Menyusun laporan..." />;
  if (galat) return <PesanGalat pesan={galat} ulangi={muatUlang} />;
  if (!data) return null;

  const teratas = data.per_sumber.filter((s) => s.label !== "Tidak diisi")[0];
  const tidakDiisi =
    data.per_sumber.find((s) => s.label === "Tidak diisi")?.jumlah ?? 0;
  const diterima = data.per_status.find((s) => s.label === "Diterima")?.jumlah ?? 0;
  const maksBulan = Math.max(...data.per_bulan.map((b) => b.jumlah), 1);

  return (
    <>
      <KepalaPanel
        judul="Laporan Efektivitas Promosi"
        keterangan="Rekap pendaftar menurut kanal promosi, jalur, peminatan, dan asal sekolah. Angka inilah yang menjawab kanal promosi mana yang benar-benar membawa pendaftar."
        aksi={
          <div>
            <label htmlFor="tahun" className="sr-only">
              Tahun ajaran
            </label>
            <select
              id="tahun"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="rounded-lg border border-garis bg-white px-3.5 py-2.5 text-sm font-semibold focus:border-biru focus:ring-2 focus:ring-biru/20"
            >
              <option value="">
                Tahun aktif ({data.tahun_ajaran})
              </option>
              {data.pilihan_tahun.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {data.total === 0 ? (
        <TanpaData
          judul={`Belum ada pendaftar pada tahun ajaran ${data.tahun_ajaran}`}
          keterangan="Laporan akan terisi setelah ada formulir pendaftaran yang masuk."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KartuAngka
              label="Total pendaftar"
              nilai={angka(data.total)}
              keterangan={`Tahun ajaran ${data.tahun_ajaran}`}
            />
            <KartuAngka
              label="Kanal paling efektif"
              nilai={teratas ? angka(teratas.jumlah) : "-"}
              keterangan={
                teratas
                  ? `${data.label_sumber[teratas.label] ?? teratas.label} · ${persen(
                      teratas.jumlah,
                      data.total,
                    )}% pendaftar`
                  : "Belum ada yang mengisi sumber informasi"
              }
            />
            <KartuAngka
              label="Diterima"
              nilai={angka(diterima)}
              keterangan={`${persen(diterima, data.total)}% dari pendaftar`}
              warna="text-green-700"
            />
            <KartuAngka
              label="Sumber tidak diisi"
              nilai={angka(tidakDiisi)}
              keterangan={
                tidakDiisi > 0
                  ? `${persen(tidakDiisi, data.total)}% data promosi hilang`
                  : "Seluruh pendaftar mengisi"
              }
              warna={tidakDiisi > 0 ? "text-amber-600" : "text-biru-tua"}
            />
          </div>

          {/* Kanal promosi: tabel penuh, karena ini angka yang dikutip laporan PkM */}
          <MunculNaik>
            <section className="mt-8">
              <h2 className="mb-1 text-lg">Pendaftar per Kanal Promosi</h2>
              <p className="mb-4 text-sm text-samar">
                Jawaban pertanyaan &quot;dari mana Anda mengetahui sekolah
                ini?&quot; pada formulir pendaftaran.
              </p>
              <Tabel kepala={["Kanal Promosi", "Pendaftar", "Porsi", "Sebaran"]}>
                {data.per_sumber.map((s) => (
                  <tr key={s.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {data.label_sumber[s.label] ?? s.label}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {angka(s.jumlah)}
                    </td>
                    <td className="px-4 py-3 text-right text-samar tabular-nums">
                      {persen(s.jumlah, data.total)}%
                    </td>
                    <td className="w-64 px-4 py-3">
                      <div className="h-2.5 overflow-hidden rounded-full bg-biru-muda">
                        <div
                          className="h-full rounded-full bg-biru"
                          style={{
                            width: `${persen(s.jumlah, data.total)}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </Tabel>
            </section>
          </MunculNaik>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <MunculNaik>
              <Bagian
                judul="Jalur Pendaftaran"
                data={data.per_jalur}
                total={data.total}
              />
            </MunculNaik>
            <MunculNaik jeda={0.08}>
              <Bagian
                judul="Status Verifikasi"
                data={data.per_status}
                total={data.total}
              />
            </MunculNaik>
            <MunculNaik>
              <Bagian
                judul="Keterisian Peminatan"
                keterangan="Dibandingkan dengan kuota masing-masing peminatan."
                data={data.per_jurusan}
                total={data.total}
                pakaiKuota
              />
            </MunculNaik>
            <MunculNaik jeda={0.08}>
              <Bagian
                judul="Jenis Kelamin"
                data={data.per_jenis_kelamin}
                total={data.total}
              />
            </MunculNaik>
          </div>

          {/* Asal sekolah: menunjukkan jangkauan sosialisasi ke SMP/MTs */}
          <MunculNaik>
            <section className="mt-8">
              <h2 className="mb-1 text-lg">Asal Sekolah Terbanyak</h2>
              <p className="mb-4 text-sm text-samar">
                Menunjukkan SMP/MTs mana yang paling banyak mengirim pendaftar —
                berguna untuk menentukan sasaran sosialisasi tahun berikutnya.
              </p>
              <Tabel kepala={["Asal Sekolah", "Pendaftar", "Porsi"]}>
                {data.per_asal_sekolah.map((s) => (
                  <tr key={s.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{s.label}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {angka(s.jumlah)}
                    </td>
                    <td className="px-4 py-3 text-right text-samar tabular-nums">
                      {persen(s.jumlah, data.total)}%
                    </td>
                  </tr>
                ))}
              </Tabel>
            </section>
          </MunculNaik>

          {/* Sebaran bulanan */}
          {data.per_bulan.length > 0 && (
            <MunculNaik>
              <section className="kartu mt-8 p-6">
                <h2 className="mb-1 text-lg">Sebaran Pendaftaran per Bulan</h2>
                <p className="mb-6 text-sm text-samar">
                  Memperlihatkan bulan mana promosi paling berdampak.
                </p>
                <div className="flex h-48 items-end gap-3 overflow-x-auto pb-1">
                  {data.per_bulan.map((b) => (
                    <div
                      key={b.label}
                      // h-full wajib agar tinggi persen bilahnya terhitung.
                      className="flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="text-sm font-semibold text-biru-tua tabular-nums">
                        {angka(b.jumlah)}
                      </span>
                      <span
                        className="w-full max-w-20 rounded-t-lg bg-biru"
                        style={{
                          height: `${Math.max((b.jumlah / maksBulan) * 100, 5)}%`,
                        }}
                      />
                      <span className="text-center text-xs leading-tight text-samar">
                        {namaBulan(b.label)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </MunculNaik>
          )}
        </>
      )}
    </>
  );
}

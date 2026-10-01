"use client";

import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { tanggalJam } from "@/lib/format";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import {
  Teks,
  AreaTeks,
  Centang,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { PaketUjian, KomposisiMapel } from "@/lib/tipe";

/**
 * Paket ujian: jadwal tes seleksi beserta hasilnya.
 *
 * Paket tidak dapat diaktifkan bila bank soal aktifnya belum mencukupi. Itu
 * diperiksa server, dan pesannya ditampilkan di sini apa adanya, supaya
 * panitia tidak sempat membuka tes yang pasti gagal saat peserta masuk.
 */

/** Saran tes seleksi SMA: 50 soal dalam 90 menit, kira-kira 1,8 menit per
 *  soal. Matematika paling banyak karena paling membedakan kemampuan. */
const SARAN: Record<string, number> = {
  Matematika: 15,
  "Bahasa Indonesia": 10,
  "Bahasa Inggris": 10,
  IPA: 10,
  IPS: 5,
};

const KOSONG = {
  komposisi: {} as Record<string, number>,
  nama: "",
  tahun_ajaran: "",
  durasi_menit: 60,
  jumlah_soal: 20,
  acak_soal: true,
  mulai: "",
  selesai: "",
  nilai_minimum: 60,
  keterangan: "",
  aktif: false,
};

/** Waktu dari server berbentuk RFC 3339; input datetime-local memerlukan
 *  bentuk tanpa zona. */
function keInputWaktu(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

export default function HalamanUjian() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.paketUjian());

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<PaketUjian | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");
  const [lihatHasil, setLihatHasil] = useState<PaketUjian | null>(null);

  const mapelBaku = data?.mapel_baku ?? Object.keys(SARAN);
  const stok = data?.stok ?? {};
  const totalKomposisi = Object.values(isi.komposisi).reduce((a, n) => a + (n || 0), 0);
  const pakaiKomposisi = totalKomposisi > 0;

  function buka(p?: PaketUjian) {
    setGalatKolom({});
    setRingkasan([]);
    if (p) {
      setUbahId(p.id);
      setIsi({
        komposisi: Object.fromEntries(
          (p.komposisi ?? []).map((k: KomposisiMapel) => [k.mata_pelajaran, k.jumlah]),
        ),
        nama: p.nama,
        tahun_ajaran: p.tahun_ajaran,
        durasi_menit: p.durasi_menit,
        jumlah_soal: p.jumlah_soal,
        acak_soal: p.acak_soal,
        mulai: keInputWaktu(p.mulai),
        selesai: keInputWaktu(p.selesai),
        nilai_minimum: p.nilai_minimum,
        keterangan: p.keterangan,
        aktif: p.aktif,
      });
    } else {
      setUbahId(null);
      setIsi(KOSONG);
    }
    setJendela(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);
    try {
      const kirim = {
        ...isi,
        komposisi: Object.entries(isi.komposisi)
          .filter(([, n]) => n > 0)
          .map(([mata_pelajaran, jumlah]) => ({ mata_pelajaran, jumlah })),
      };
      const hasil =
        ubahId === null ? await api.simpanPaket(kirim) : await api.ubahPaket(ubahId, kirim);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Paket ujian gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setGalatHapus("");
    setMenghapus(true);
    try {
      const hasil = await api.hapusPaket(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      setGalatHapus(
        e instanceof GalatApi ? e.message : "Paket ujian gagal dihapus.",
      );
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Tes Seleksi"
        keterangan="Jadwal tes seleksi online beserta hasilnya. Tes baru dapat dikerjakan peserta bila paketnya aktif, jadwalnya sedang berjalan, dan pengaturan ujian_aktif bernilai 1."
        aksi={<Tombol onClick={() => buka()}>Tambah Paket</Tombol>}
      />

      <p className="mb-5 rounded-lg border border-garis bg-slate-50 px-5 py-4 text-sm leading-relaxed text-samar">
        Bank soal aktif saat ini{" "}
        <strong className="text-teks tabular-nums">{data?.jumlah_aktif ?? 0}</strong>{" "}
        butir. Paket tidak dapat diaktifkan bila jumlah soal yang diminta
        melebihi angka itu.
      </p>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada paket ujian"
          keterangan="Buat satu paket untuk menentukan jadwal, lama pengerjaan, dan jumlah soal tes seleksi."
        />
      ) : (
        <Tabel
          kepala={["Nama", "Jadwal", "Soal", "Durasi", "Minimum", "Peserta", "Keadaan", ""]}
        >
          {data.data.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium">{p.nama}</p>
                <p className="text-xs text-samar">{p.tahun_ajaran}</p>
              </td>
              <td className="px-4 py-3 text-xs text-samar">
                {p.mulai ? tanggalJam(p.mulai) : "kapan saja"}
                {p.selesai && <> &rarr; {tanggalJam(p.selesai)}</>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {p.jumlah_soal}
                {p.komposisi?.length > 0 && (
                  <span className="block text-xs text-samar">
                    {p.komposisi.map((k) => `${k.mata_pelajaran} ${k.jumlah}`).join(" · ")}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{p.durasi_menit}m</td>
              <td className="px-4 py-3 text-right tabular-nums">{p.nilai_minimum}</td>
              <td className="px-4 py-3 text-right text-xs tabular-nums">
                {p.jumlah_selesai} / {p.jumlah_peserta}
                <span className="block text-samar">selesai</span>
              </td>
              <td className="px-4 py-3">
                <Lencana
                  jenis={
                    p.aktif
                      ? "hijau"
                      : "abu"
                  }
                >
                  {p.aktif ? "Aktif" : "Nonaktif"}
                </Lencana>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {p.jumlah_peserta > 0 && (
                  <button
                    type="button"
                    onClick={() => setLihatHasil(p)}
                    className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                  >
                    Hasil
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => buka(p)}
                  className="ml-2 rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => setHapusTarget(p)}
                  className="ml-2 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      <Jendela
        terbuka={jendela}
        tutup={() => setJendela(false)}
        judul={ubahId === null ? "Tambah Paket Ujian" : "Ubah Paket Ujian"}
        lebar="max-w-2xl"
      >
        <form onSubmit={simpan} className="space-y-5">
          {ringkasan.length > 0 && <RingkasanGalat daftar={ringkasan} />}

          <Teks
            nama="nama"
            label="Nama paket"
            wajib
            maks={120}
            nilai={isi.nama}
            ubah={(v) => setIsi((s) => ({ ...s, nama: v }))}
            galat={galatKolom.nama}
            contoh="Tes Seleksi Gelombang 1"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="tahun_ajaran"
              label="Tahun ajaran"
              nilai={isi.tahun_ajaran}
              ubah={(v) => setIsi((s) => ({ ...s, tahun_ajaran: v }))}
              galat={galatKolom.tahun_ajaran}
              bantuan="Kosongkan untuk memakai tahun ajaran PPDB yang berjalan."
            />
            <Teks
              nama="nilai_minimum"
              label="Nilai minimum"
              tipe="number"
              nilai={String(isi.nilai_minimum)}
              ubah={(v) => setIsi((s) => ({ ...s, nilai_minimum: Number(v) || 0 }))}
              galat={galatKolom.nilai_minimum}
            />
            {pakaiKomposisi ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold">Jumlah soal per peserta</p>
                <p className="rounded-lg border border-garis bg-slate-50 px-4 py-2.5 font-bold tabular-nums">
                  {totalKomposisi}
                  <span className="ml-2 text-xs font-normal text-samar">
                    dihitung dari komposisi
                  </span>
                </p>
              </div>
            ) : (
              <Teks
                nama="jumlah_soal"
                label="Jumlah soal per peserta"
                tipe="number"
                nilai={String(isi.jumlah_soal)}
                ubah={(v) => setIsi((s) => ({ ...s, jumlah_soal: Number(v) || 0 }))}
                galat={galatKolom.jumlah_soal}
                bantuan="Diambil acak dari semua mata pelajaran. Isi komposisi di bawah agar jumlahnya per mata pelajaran."
              />
            )}
            <Teks
              nama="durasi_menit"
              label="Lama pengerjaan (menit)"
              tipe="number"
              nilai={String(isi.durasi_menit)}
              ubah={(v) => setIsi((s) => ({ ...s, durasi_menit: Number(v) || 0 }))}
              galat={galatKolom.durasi_menit}
            />
            <Teks
              nama="mulai"
              label="Dibuka sejak"
              tipe="datetime-local"
              nilai={isi.mulai}
              ubah={(v) => setIsi((s) => ({ ...s, mulai: v }))}
              galat={galatKolom.mulai}
              bantuan="Kosongkan bila boleh dikerjakan kapan saja."
            />
            <Teks
              nama="selesai"
              label="Ditutup pada"
              tipe="datetime-local"
              nilai={isi.selesai}
              ubah={(v) => setIsi((s) => ({ ...s, selesai: v }))}
              galat={galatKolom.selesai}
            />
          </div>

          <fieldset className="rounded-lg border border-garis p-4">
            <legend className="px-1 text-sm font-semibold">Komposisi per mata pelajaran</legend>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-samar">
                Isi 0 untuk mata pelajaran yang tidak diujikan. Soal dikelompokkan
                per mata pelajaran dan diacak di dalam kelompoknya.
              </p>
              <div className="flex gap-2">
                <Tombol
                  type="button"
                  jenis="halus"
                  onClick={() =>
                    setIsi((s) => ({
                      ...s,
                      komposisi: { ...SARAN },
                      durasi_menit: s.durasi_menit < 90 ? 90 : s.durasi_menit,
                    }))
                  }
                >
                  Pakai saran 50 soal
                </Tombol>
                {pakaiKomposisi && (
                  <Tombol
                    type="button"
                    jenis="halus"
                    onClick={() => setIsi((s) => ({ ...s, komposisi: {} }))}
                  >
                    Kosongkan
                  </Tombol>
                )}
              </div>
            </div>
            <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {mapelBaku.map((m) => {
                const n = isi.komposisi[m] ?? 0;
                const kurang = n > (stok[m] ?? 0);
                return (
                  <label key={m} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {m}
                      <span
                        className={`block text-xs ${kurang ? "font-semibold text-red-700" : "text-samar"}`}
                      >
                        {stok[m] ?? 0} soal aktif di bank soal
                      </span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={n || ""}
                      placeholder="0"
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setIsi((s) => ({ ...s, komposisi: { ...s.komposisi, [m]: v } }));
                      }}
                      className={`w-20 rounded-lg border px-3 py-1.5 text-right tabular-nums ${kurang ? "border-red-300 bg-red-50" : "border-garis"}`}
                      aria-label={`Jumlah soal ${m}`}
                    />
                  </label>
                );
              })}
            </div>
            {galatKolom.komposisi && (
              <p className="mt-3 text-sm text-red-700">{galatKolom.komposisi}</p>
            )}
          </fieldset>

          <AreaTeks
            nama="keterangan"
            label="Keterangan"
            baris={3}
            nilai={isi.keterangan}
            ubah={(v) => setIsi((s) => ({ ...s, keterangan: v }))}
          />

          <Centang
            nama="acak_soal"
            nilai={isi.acak_soal}
            ubah={(v) => setIsi((s) => ({ ...s, acak_soal: v }))}
          >
            Acak susunan soal untuk setiap peserta
          </Centang>
          <Centang
            nama="aktif"
            nilai={isi.aktif}
            ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
          >
            Aktif, boleh dikerjakan peserta
          </Centang>

          <div className="flex justify-end gap-3 border-t border-garis pt-5">
            <Tombol type="button" jenis="kedua" onClick={() => setJendela(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" sedangJalan={menyimpan}>
              Simpan
            </Tombol>
          </div>
        </form>
      </Jendela>

      {lihatHasil && (
        <HasilPaket paket={lihatHasil} tutup={() => setLihatHasil(null)} />
      )}

      <Konfirmasi
        terbuka={hapusTarget !== null}
        tutup={() => setHapusTarget(null)}
        judul="Hapus paket ujian"
        pesan={
          <>
            Paket <strong>{hapusTarget?.nama ?? ""}</strong> akan dihapus. Paket
            yang sudah dikerjakan peserta tidak dapat dihapus, hanya
            dinonaktifkan.
            {galatHapus && (
              <span className="mt-3 block text-sm text-red-700">{galatHapus}</span>
            )}
          </>
        }
        sedangJalan={menghapus}
        lanjut={hapus}
      />
    </>
  );
}

function HasilPaket({
  paket,
  tutup,
}: {
  paket: PaketUjian;
  tutup: () => void;
}) {
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.hasilUjian(paket.id),
    [paket.id],
  );

  return (
    <Jendela terbuka tutup={tutup} judul={`Hasil: ${paket.nama}`} lebar="max-w-4xl">
      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Belum ada peserta"
          keterangan="Hasil muncul di sini begitu peserta pertama mengerjakan tes."
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-samar">
            <strong className="text-teks tabular-nums">{data.jumlah_lulus}</strong>{" "}
            dari {data.data.length} peserta memenuhi nilai minimum{" "}
            {data.nilai_minimum}.
          </p>
          <Tabel
            kepala={[
              "No. registrasi",
              "Nama",
              "Peminatan",
              ...(data.mapel ?? []),
              "Benar",
              "Nilai",
              "Keadaan",
            ]}
          >
            {data.data.map((h) => (
              <tr key={h.sesi_id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                  {h.no_registrasi}
                </td>
                <td className="px-4 py-3">{h.nama_lengkap}</td>
                <td className="px-4 py-3 text-xs text-samar">{h.nama_jurusan}</td>
                {(data.mapel ?? []).map((m) => {
                  const n = h.per_mapel?.find((x) => x.mata_pelajaran === m);
                  return (
                    <td key={m} className="px-4 py-3 text-right tabular-nums">
                      {n ? (
                        <>
                          {n.skor.toFixed(0)}
                          <span className="block text-xs text-samar">
                            {n.benar}/{n.soal}
                          </span>
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right tabular-nums">
                  {h.jumlah_benar}/{h.jumlah_soal}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">
                  {h.skor.toFixed(0)}
                </td>
                <td className="px-4 py-3">
                  {h.status === "Berjalan" ? (
                    <Lencana jenis="emas">
                      Sedang mengerjakan
                    </Lencana>
                  ) : (
                    <Lencana
                      jenis={
                        h.lulus
                          ? "hijau"
                          : "merah"
                      }
                    >
                      {h.lulus ? "Memenuhi" : "Belum memenuhi"}
                      {h.status === "Kedaluwarsa" && " · waktu habis"}
                    </Lencana>
                  )}
                </td>
              </tr>
            ))}
          </Tabel>
        </div>
      )}
    </Jendela>
  );
}

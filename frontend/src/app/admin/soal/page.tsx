"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import {
  Teks,
  AreaTeks,
  Centang,
  Pilihan,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import type { Soal } from "@/lib/tipe";

// Awalan alamat demo GitHub Pages; kosong pada pemasangan sekolah.
const DASAR = process.env.NEXT_PUBLIC_DASAR ?? "";

const KOSONG = {
  mata_pelajaran: "",
  pertanyaan: "",
  pilihan_a: "",
  pilihan_b: "",
  pilihan_c: "",
  pilihan_d: "",
  pilihan_e: "",
  jawaban: "A",
  pembahasan: "",
  aktif: true,
};

const HURUF = ["A", "B", "C", "D", "E"];

/** Dipakai sebelum daftar dari server datang; isinya sama dengan
 *  DaftarMapel di backend/mapel.go. */
const MAPEL_AWAL = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "IPA",
  "IPS",
  "Pendidikan Agama",
  "Pengetahuan Umum",
  "Tes Potensi Akademik",
];

export default function HalamanSoal() {
  const kabar = useKabar();
  const [saring, setSaring] = useState("");
  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.soal(saring ? `?mata_pelajaran=${encodeURIComponent(saring)}` : ""),
    [saring],
  );

  const [jendela, setJendela] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Soal | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");
  const [impor, setImpor] = useState(false);

  const mapelBaku = data?.mapel_baku ?? MAPEL_AWAL;
  const stok = data?.stok ?? {};
  // Nama lama yang belum baku tetap dapat disaring sampai soalnya diubah.
  const opsiSaring = [
    ...mapelBaku,
    ...(data?.mata_pelajaran ?? []).filter((m) => !mapelBaku.includes(m)),
  ].map((m) => ({ nilai: m, label: `${m} (${stok[m] ?? 0} aktif)` }));

  function buka(s?: Soal) {
    setGalatKolom({});
    setRingkasan([]);
    if (s) {
      setUbahId(s.id);
      setIsi({
        mata_pelajaran: s.mata_pelajaran,
        pertanyaan: s.pertanyaan,
        pilihan_a: s.pilihan_a,
        pilihan_b: s.pilihan_b,
        pilihan_c: s.pilihan_c,
        pilihan_d: s.pilihan_d,
        pilihan_e: s.pilihan_e,
        jawaban: s.jawaban,
        pembahasan: s.pembahasan,
        aktif: s.aktif,
      });
    } else {
      setUbahId(null);
      // Mata pelajaran yang sedang disaring diisikan lebih dulu, karena soal
      // biasanya ditambahkan berkelompok per mata pelajaran.
      setIsi({ ...KOSONG, mata_pelajaran: saring });
    }
    setJendela(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);
    try {
      const hasil =
        ubahId === null ? await api.simpanSoal(isi) : await api.ubahSoal(ubahId, isi);
      kabar.beri(hasil.pesan);
      setJendela(false);
      muatUlang();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Soal gagal disimpan."]);
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
      const hasil = await api.hapusSoal(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      setGalatHapus(e instanceof GalatApi ? e.message : "Soal gagal dihapus.");
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul="Bank Soal"
        keterangan="Soal pilihan ganda untuk tes seleksi. Soal yang diambil tiap peserta dipilih dari yang berkeadaan aktif, dan susunannya diacak per peserta."
        aksi={
          <div className="flex flex-wrap gap-2">
            <Tombol jenis="kedua" onClick={() => setImpor(true)}>
              Impor dari Excel
            </Tombol>
            <Tombol onClick={() => buka()}>Tambah Soal</Tombol>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-xs flex-1">
          <Pilihan
            nama="saring_mapel"
            label="Saring mata pelajaran"
            nilai={saring}
            ubah={setSaring}
            opsi={opsiSaring}
            kosong="Semua mata pelajaran"
          />
        </div>
        <p className="pb-2.5 text-sm text-samar">
          <strong className="text-teks tabular-nums">{data?.jumlah_aktif ?? 0}</strong>{" "}
          soal aktif siap dipakai
        </p>
      </div>

      <ul className="mb-5 flex flex-wrap gap-2 text-xs">
        {mapelBaku.map((m) => (
          <li
            key={m}
            className="rounded-full border border-garis bg-white px-3 py-1 text-samar"
          >
            {m}{" "}
            <strong className="text-teks tabular-nums">{stok[m] ?? 0}</strong>
          </li>
        ))}
      </ul>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Bank soal masih kosong"
          keterangan="Paket ujian tidak dapat dibuka sebelum jumlah soal aktifnya mencukupi."
        />
      ) : (
        <Tabel kepala={["Mata pelajaran", "Pertanyaan", "Kunci", "Keadaan", ""]}>
          {data.data.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 whitespace-nowrap text-samar">
                {s.mata_pelajaran}
              </td>
              <td className="px-4 py-3">
                <p className="max-w-lg font-medium">{s.pertanyaan}</p>
                <p className="mt-0.5 max-w-lg text-xs text-samar">
                  A. {s.pilihan_a} · B. {s.pilihan_b}
                  {s.pilihan_c && ` · C. ${s.pilihan_c}`}
                  {s.pilihan_d && ` · D. ${s.pilihan_d}`}
                  {s.pilihan_e && ` · E. ${s.pilihan_e}`}
                </p>
              </td>
              <td className="px-4 py-3 text-center font-bold text-biru">{s.jawaban}</td>
              <td className="px-4 py-3">
                <Lencana
                  jenis={
                    s.aktif
                      ? "hijau"
                      : "abu"
                  }
                >
                  {s.aktif ? "Aktif" : "Nonaktif"}
                </Lencana>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => buka(s)}
                  className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => setHapusTarget(s)}
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
        judul={ubahId === null ? "Tambah Soal" : "Ubah Soal"}
        lebar="max-w-3xl"
      >
        <form onSubmit={simpan} className="space-y-5">
          {ringkasan.length > 0 && <RingkasanGalat daftar={ringkasan} />}

          <Pilihan
            nama="mata_pelajaran"
            label="Mata pelajaran"
            wajib
            nilai={isi.mata_pelajaran}
            ubah={(v) => setIsi((s) => ({ ...s, mata_pelajaran: v }))}
            opsi={
              isi.mata_pelajaran && !mapelBaku.includes(isi.mata_pelajaran)
                ? [...mapelBaku, isi.mata_pelajaran]
                : mapelBaku
            }
            kosong="-- Pilih mata pelajaran --"
            galat={galatKolom.mata_pelajaran}
          />

          <AreaTeks
            nama="pertanyaan"
            label="Pertanyaan"
            wajib
            baris={4}
            nilai={isi.pertanyaan}
            ubah={(v) => setIsi((s) => ({ ...s, pertanyaan: v }))}
            galat={galatKolom.pertanyaan}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Teks
              nama="pilihan_a"
              label="Pilihan A"
              wajib
              nilai={isi.pilihan_a}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_a: v }))}
              galat={galatKolom.pilihan_a}
            />
            <Teks
              nama="pilihan_b"
              label="Pilihan B"
              wajib
              nilai={isi.pilihan_b}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_b: v }))}
              galat={galatKolom.pilihan_b}
            />
            <Teks
              nama="pilihan_c"
              label="Pilihan C"
              nilai={isi.pilihan_c}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_c: v }))}
              bantuan="Kosongkan bila soal ini hanya dua pilihan."
            />
            <Teks
              nama="pilihan_d"
              label="Pilihan D"
              nilai={isi.pilihan_d}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_d: v }))}
            />
            <Teks
              nama="pilihan_e"
              label="Pilihan E"
              nilai={isi.pilihan_e}
              ubah={(v) => setIsi((s) => ({ ...s, pilihan_e: v }))}
            />
            <Pilihan
              nama="jawaban"
              label="Kunci jawaban"
              wajib
              nilai={isi.jawaban}
              ubah={(v) => setIsi((s) => ({ ...s, jawaban: v }))}
              opsi={HURUF}
              kosong="-- Pilih kunci --"
              galat={galatKolom.jawaban}
              bantuan="Harus menunjuk pilihan yang terisi."
            />
          </div>

          <AreaTeks
            nama="pembahasan"
            label="Pembahasan"
            baris={3}
            nilai={isi.pembahasan}
            ubah={(v) => setIsi((s) => ({ ...s, pembahasan: v }))}
            bantuan="Catatan untuk panitia. Tidak pernah ditampilkan kepada peserta."
          />

          <Centang
            nama="aktif"
            nilai={isi.aktif}
            ubah={(v) => setIsi((s) => ({ ...s, aktif: v }))}
          >
            Aktif, boleh terpilih untuk tes seleksi
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

      {impor && (
        <JendelaImpor
          tutup={() => setImpor(false)}
          selesai={(pesan) => {
            kabar.beri(pesan);
            setImpor(false);
            muatUlang();
          }}
        />
      )}

      <Konfirmasi
        terbuka={hapusTarget !== null}
        tutup={() => setHapusTarget(null)}
        judul="Hapus soal"
        pesan={
          <>
            Soal ini akan dihapus dari bank soal. Soal yang sudah pernah dipakai
            pada sesi ujian tidak dapat dihapus, hanya dinonaktifkan.
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

const KOLOM_TEMPLAT = [
  "mata_pelajaran", "pertanyaan", "pilihan_a", "pilihan_b", "pilihan_c",
  "pilihan_d", "pilihan_e", "jawaban", "pembahasan",
];

/**
 * Pratinjau sebelum impor: jumlah soal per isi kolom pertama. Hanya
 * perkiraan untuk panitia; pemeriksaan sebenarnya di server. Sel Excel yang
 * memuat baris baru dikutip, jadi baris di dalam tanda kutip tidak dihitung
 * sebagai soal baru.
 */
function ringkasTabel(teks: string): { jumlah: number; rincian: string } | null {
  const bersih = teks.replace(/^\uFEFF/, "").replace(/"(?:[^"]|"")*"/g, "x").trim();
  if (!bersih) return null;
  const baris = bersih.split(/\r?\n/).filter((b) => b.trim());
  const pertama = baris[0];
  const hitung = (c: string) => pertama.split(c).length - 1;
  const pemisah = [";", "\t", ","].reduce((a, c) => (hitung(c) > hitung(a) ? c : a), ",");
  if (/^mata.pelajaran/i.test(pertama.trim())) baris.shift();
  const per = new Map<string, number>();
  for (const b of baris) {
    const m = b.split(pemisah)[0].trim() || "(kosong)";
    per.set(m, (per.get(m) ?? 0) + 1);
  }
  if (!baris.length) return null;
  return {
    jumlah: baris.length,
    rincian: [...per].map(([m, n]) => `${m} ${n}`).join(", "),
  };
}

/**
 * Impor banyak soal sekaligus. Berkas dari Excel dibaca di peramban lalu
 * dikirim sebagai teks; panitia juga boleh menempel langsung dari Excel.
 * Satu baris salah menggagalkan seluruh impor supaya tidak ada soal ganda
 * saat berkasnya dibetulkan lalu diimpor ulang.
 */
function JendelaImpor({
  tutup,
  selesai,
}: {
  tutup: () => void;
  selesai: (pesan: string) => void;
}) {
  const [csv, setCsv] = useState("");
  const [namaBerkas, setNamaBerkas] = useState("");
  const [aktif, setAktif] = useState(true);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string[]>([]);
  const [tersalin, setTersalin] = useState(false);
  const [memuat, setMemuat] = useState<"latihan" | "contoh" | null>(null);

  async function bacaBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;
    setGalat([]);
    if (!/\.(csv|txt)$/i.test(berkas.name)) {
      setGalat([
        "Pilih berkas .csv. Di Excel: File > Save As > CSV UTF-8 (Comma delimited).",
      ]);
      return;
    }
    setNamaBerkas(berkas.name);
    setCsv(await berkas.text());
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat([]);
    setMengirim(true);
    try {
      const hasil = await api.imporSoal({ csv, aktif });
      selesai(hasil.pesan);
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalat(e.daftar.length ? [e.message, ...e.daftar] : [e.message]);
      } else {
        setGalat(["Soal gagal diimpor."]);
      }
    } finally {
      setMengirim(false);
    }
  }

  const ringkas = ringkasTabel(csv);

  // Judul kolom dipisah tab: begitu ditempel di Excel, tiap judul langsung
  // menempati kolomnya sendiri.
  async function salinTemplat() {
    const teks = KOLOM_TEMPLAT.join("\t") + "\n";
    try {
      await navigator.clipboard.writeText(teks);
    } catch {
      // Peramban lama atau halaman tanpa HTTPS: cara lama lewat seleksi.
      const t = document.createElement("textarea");
      t.value = teks;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setTersalin(true);
    setTimeout(() => setTersalin(false), 2500);
  }

  async function isiDari(berkas: string, kunci: "latihan" | "contoh") {
    setGalat([]);
    setMemuat(kunci);
    try {
      const j = await fetch(`${DASAR}/templat/${berkas}`);
      if (!j.ok) throw new Error();
      setCsv((await j.text()).replace(/^\uFEFF/, ""));
      setNamaBerkas("");
    } catch {
      setGalat(["Soal siap jadi gagal dimuat. Coba lagi, atau pakai berkas CSV."]);
    } finally {
      setMemuat(null);
    }
  }

  return (
    <Jendela terbuka tutup={tutup} judul="Impor Soal dari Excel" lebar="max-w-3xl">
      <form onSubmit={kirim} className="space-y-5">
        {galat.length > 0 && <RingkasanGalat daftar={galat} />}

        <section className="rounded-xl border border-garis bg-slate-50 p-4">
          <h3 className="text-sm font-semibold">Cara tercepat: salin dan tempel dari Excel</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-samar">
            <li>
              <span className="mr-2">Salin judul kolom, lalu tempel di sel A1 lembar Excel yang kosong.</span>
              <Tombol type="button" jenis="halus" onClick={salinTemplat}>
                {tersalin ? "Tersalin ✓" : "Salin kolom templat"}
              </Tombol>
            </li>
            <li>
              Isi satu baris untuk satu soal. <em>mata_pelajaran</em>: {MAPEL_AWAL.join(", ")}.{" "}
              <em>jawaban</em>: huruf A sampai E. Pilihan C sampai E boleh kosong.
            </li>
            <li>
              Blok seluruh tabel termasuk judulnya, tekan <kbd className="rounded border border-garis bg-white px-1">Ctrl</kbd>+
              <kbd className="rounded border border-garis bg-white px-1">C</kbd>, lalu tempel di kotak di bawah.
            </li>
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-garis pt-3 text-sm">
            <span className="text-samar">Atau langsung pakai soal siap jadi:</span>
            <Tombol type="button" jenis="kedua" sedangJalan={memuat === "latihan"} onClick={() => isiDari("latihan-soal-40.csv", "latihan")}>
              40 soal latihan tes
            </Tombol>
            <Tombol type="button" jenis="kedua" sedangJalan={memuat === "contoh"} onClick={() => isiDari("contoh-soal-seleksi.csv", "contoh")}>
              60 contoh soal SMP
            </Tombol>
          </div>
        </section>

        <AreaTeks
          nama="csv"
          label="Tempel tabel soal di sini"
          baris={8}
          nilai={csv}
          ubah={(v) => {
            setCsv(v);
            setNamaBerkas("");
          }}
          bantuan={
            ringkas
              ? `${ringkas.jumlah} soal terbaca: ${ringkas.rincian}. Periksa angkanya, lalu tekan Impor Soal.`
              : "Kosong. Tempel dari Excel, atau pilih salah satu soal siap jadi di atas."
          }
        />

        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-biru">Punya berkas CSV? Pilih berkasnya</summary>
          <div className="mt-3 space-y-2">
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={bacaBerkas}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-biru-muda file:px-4 file:py-2 file:font-semibold file:text-biru"
            />
            {namaBerkas && <span className="block text-xs text-samar">{namaBerkas} terbaca.</span>}
            <p className="text-xs text-samar">
              Unduh:{" "}
              <a href={`${DASAR}/templat/templat-soal.csv`} download className="text-biru underline">
                templat kosong
              </a>
              ,{" "}
              <a href={`${DASAR}/templat/latihan-soal-40.csv`} download className="text-biru underline">
                40 soal latihan
              </a>
              ,{" "}
              <a href={`${DASAR}/templat/contoh-soal-seleksi.csv`} download className="text-biru underline">
                60 contoh soal
              </a>
              . Dari Excel, simpan sebagai CSV UTF-8.
            </p>
          </div>
        </details>

        <Centang nama="aktif_impor" nilai={aktif} ubah={setAktif}>
          Langsung aktifkan soal hasil impor
        </Centang>

        <div className="flex justify-end gap-3 border-t border-garis pt-5">
          <Tombol type="button" jenis="kedua" onClick={tutup}>
            Batal
          </Tombol>
          <Tombol type="submit" sedangJalan={mengirim} disabled={csv.trim() === ""}>
            Impor Soal
          </Tombol>
        </div>
      </form>
    </Jendela>
  );
}

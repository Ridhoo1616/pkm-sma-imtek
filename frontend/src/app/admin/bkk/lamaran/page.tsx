"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ambilToken, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel, KartuAngka, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Teks, AreaTeks, Pilihan, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { Lencana } from "@/komponen/Bagian";
import { tanggalJam, tanggalPanjang, tautanWa, warnaLamaran } from "@/lib/format";
import type { LamaranBkk } from "@/lib/tipe";

/**
 * Lamaran lulusan dan penyalurannya.
 *
 * Tahapnya: Diajukan (masuk dari situs) -> Diteruskan (berkas dikirim ke
 * perusahaan) -> Wawancara -> Diterima atau Ditolak. Lamaran berstatus
 * Diterima itulah lulusan yang tersalurkan, dan angkanya dipakai untuk
 * laporan BKK per tahun lulus.
 *
 * Catatan pada setiap lamaran DIBACA pelamarnya di halaman Cek Lamaran,
 * jadi tulislah untuk mereka, bukan catatan internal.
 */

const KOSONG_MANUAL = {
  lowongan_id: "",
  nama: "",
  nisn: "",
  tanggal_lahir: "",
  jenis_kelamin: "",
  tahun_lulus: "",
  telepon: "",
  email: "",
  alamat: "",
  ringkasan: "",
};

export default function HalamanLamaranBkk() {
  return (
    <Suspense fallback={<Memuat />}>
      <IsiLamaran />
    </Suspense>
  );
}

function IsiLamaran() {
  const kabar = useKabar();
  const { pengguna } = useSesi();
  const parameter = useSearchParams();

  const [lowongan, setLowongan] = useState(parameter.get("lowongan") ?? "");
  const [status, setStatus] = useState("");
  const [cari, setCari] = useState("");
  const [cariBerlaku, setCariBerlaku] = useState("");

  const kueri = new URLSearchParams();
  if (lowongan) kueri.set("lowongan", lowongan);
  if (status) kueri.set("status", status);
  if (cariBerlaku) kueri.set("cari", cariBerlaku);
  const teksKueri = kueri.toString() ? `?${kueri}` : "";

  const { data, memuat, galat, muatUlang } = useMuat(() => api.lamaranBkkAdmin(teksKueri), [teksKueri]);
  const daftarLowongan = useMuat(() => api.lowonganBkkAdmin());

  const [proses, setProses] = useState<LamaranBkk | null>(null);
  const [isiProses, setIsiProses] = useState({ status: "", catatan: "" });
  const [galatProses, setGalatProses] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);

  const [manual, setManual] = useState(false);
  const [isiManual, setIsiManual] = useState(KOSONG_MANUAL);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);

  const [hapusTarget, setHapusTarget] = useState<LamaranBkk | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const r = data?.ringkasan ?? {};
  const total = Object.values(r).reduce((a, b) => a + b, 0);
  const opsiLowongan = (daftarLowongan.data?.data ?? []).map((l) => ({
    nilai: String(l.id),
    label: `${l.posisi} — ${l.nama_mitra}`,
  }));

  function bukaProses(s: LamaranBkk) {
    setProses(s);
    setIsiProses({ status: s.status, catatan: s.catatan });
    setGalatProses([]);
  }

  async function simpanProses(e: React.FormEvent) {
    e.preventDefault();
    if (!proses) return;
    setMenyimpan(true);
    setGalatProses([]);
    try {
      const hasil = await api.ubahLamaranBkk(proses.id, isiProses);
      kabar.beri(hasil.pesan);
      setProses(null);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setGalatProses(e instanceof GalatApi ? (e.daftar.length ? e.daftar : [e.message]) : ["Lamaran gagal diperbarui."]);
    } finally {
      setMenyimpan(false);
    }
  }

  async function simpanManual(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    setGalatKolom({});
    setRingkasan([]);
    try {
      const hasil = await api.tambahLamaranBkk(isiManual);
      kabar.beri(hasil.pesan);
      setManual(false);
      muatUlang();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Lamaran gagal dicatat."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusLamaranBkk(hapusTarget.id);
      kabar.beri(hasil.pesan);
      muatUlang();
    } catch (e) {
      kabar.beri(e instanceof GalatApi ? e.message : "Lamaran gagal dihapus.", "galat");
    } finally {
      setHapusTarget(null);
      setMenghapus(false);
    }
  }

  /** CV dilindungi token, jadi diambil lewat fetch lalu dibuka sebagai blob. */
  async function bukaCv(nama: string) {
    const jendelaBaru = window.open("", "_blank");
    try {
      const t = ambilToken();
      const jawaban = await fetch(urlUnggahan("bkk-cv", nama), {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!jawaban.ok) throw new Error();
      const alamat = URL.createObjectURL(await jawaban.blob());
      if (jendelaBaru) jendelaBaru.location.href = alamat;
      else window.open(alamat, "_blank", "noopener");
    } catch {
      jendelaBaru?.close();
      kabar.beri("CV tidak dapat dibuka.", "galat");
    }
  }

  const ubahManual = (k: keyof typeof KOSONG_MANUAL) => (v: string) => setIsiManual((s) => ({ ...s, [k]: v }));

  return (
    <>
      <KepalaPanel
        judul="Lamaran & Penyaluran"
        keterangan="Lamaran lulusan ke lowongan mitra BKK. Ubah tahapnya setiap kali berkas diteruskan, wawancara dijadwalkan, atau hasilnya keluar; pelamar memantaunya di halaman Cek Lamaran."
        aksi={
          <Tombol
            onClick={() => {
              setIsiManual({ ...KOSONG_MANUAL, lowongan_id: lowongan });
              setGalatKolom({});
              setRingkasan([]);
              setManual(true);
            }}
          >
            Catat Lamaran Manual
          </Tombol>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KartuAngka label="Seluruh lamaran" nilai={total} />
        <KartuAngka label="Diteruskan ke mitra" nilai={(r.Diteruskan ?? 0) + (r.Wawancara ?? 0)} keterangan="termasuk tahap wawancara" />
        <KartuAngka label="Tersalurkan" nilai={r.Diterima ?? 0} warna="text-green-700" keterangan="lamaran berstatus Diterima" />
        <KartuAngka label="Menunggu diperiksa" nilai={r.Diajukan ?? 0} warna="text-amber-700" />
      </div>

      <form
        className="kartu mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_2fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setCariBerlaku(cari.trim());
        }}
      >
        <Pilihan nama="saring_lowongan" label="Lowongan" kosong="Semua lowongan" nilai={lowongan} ubah={setLowongan} opsi={opsiLowongan} />
        <Pilihan nama="saring_status" label="Tahap" kosong="Semua tahap" nilai={status} ubah={setStatus} opsi={data?.status ?? []} />
        <Teks nama="cari" label="Cari nama, NISN, atau kode" nilai={cari} ubah={setCari} />
        <Tombol type="submit" jenis="kedua">
          Cari
        </Tombol>
      </form>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul={total === 0 ? "Belum ada lamaran" : "Tidak ada lamaran yang cocok"}
          keterangan={
            total === 0
              ? "Lamaran masuk sendiri begitu ada lowongan berstatus Dibuka. Lulusan yang melamar langsung ke ruang BKK dapat dicatat lewat tombol Catat Lamaran Manual."
              : "Ubah penyaring di atas."
          }
        />
      ) : (
        <Tabel kepala={["Kode", "Pelamar", "Lowongan", "Tahap", "Kontak", "CV", "Masuk", ""]}>
          {data.data.map((s) => {
            const wa = tautanWa(s.telepon, `Halo ${s.nama}, kami dari BKK terkait lamaran ${s.kode} (${s.posisi}).`);
            return (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{s.kode}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{s.nama}</p>
                  <p className="text-xs text-samar">
                    NISN {s.nisn} · Lulus {s.tahun_lulus} · {s.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{s.posisi}</p>
                  <p className="text-xs text-samar">{s.nama_mitra}</p>
                </td>
                <td className="px-4 py-3">
                  <Lencana jenis={warnaLamaran(s.status)}>{s.status}</Lencana>
                </td>
                <td className="px-4 py-3 text-xs">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-biru hover:underline">
                      {s.telepon}
                    </a>
                  ) : (
                    s.telepon
                  )}
                  {s.email && <p className="text-samar">{s.email}</p>}
                </td>
                <td className="px-4 py-3">
                  {s.cv ? (
                    <button type="button" onClick={() => bukaCv(s.cv)} className="text-xs font-semibold text-biru hover:underline">
                      Buka CV
                    </button>
                  ) : (
                    <span className="text-xs text-samar">{s.sumber === "manual" ? "Dicatat manual" : "-"}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-samar">{tanggalJam(s.dibuat)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => bukaProses(s)}
                      className="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15"
                    >
                      Proses
                    </button>
                    {pengguna?.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => setHapusTarget(s)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Tabel>
      )}

      {data && data.per_tahun.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold">Penyaluran per tahun lulus</h2>
          <p className="mb-4 text-sm text-samar">
            Dihitung per lulusan (NISN), bukan per lamaran: satu lulusan yang melamar tiga lowongan tetap dihitung satu.
          </p>
          <Tabel kepala={["Tahun lulus", "Lulusan melamar", "Tersalurkan", "Persentase"]}>
            {data.per_tahun.map((t) => (
              <tr key={t.tahun_lulus}>
                <td className="px-4 py-3 font-semibold tabular-nums">{t.tahun_lulus}</td>
                <td className="px-4 py-3 tabular-nums">{t.pelamar}</td>
                <td className="px-4 py-3 font-semibold tabular-nums text-green-700">{t.tersalurkan}</td>
                <td className="px-4 py-3 tabular-nums text-samar">
                  {t.pelamar ? Math.round((t.tersalurkan / t.pelamar) * 100) : 0}%
                </td>
              </tr>
            ))}
          </Tabel>
        </section>
      )}

      <Jendela judul={`Proses Lamaran ${proses?.kode ?? ""}`} terbuka={proses !== null} tutup={() => setProses(null)}>
        {proses && (
          <form onSubmit={simpanProses} className="space-y-5" noValidate>
            <RingkasanGalat daftar={galatProses} />
            <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-garis bg-slate-50 p-5 text-sm sm:grid-cols-2">
              {[
                ["Nama", proses.nama],
                ["NISN", proses.nisn],
                ["Tanggal lahir", tanggalPanjang(proses.tanggal_lahir)],
                ["Tahun lulus", String(proses.tahun_lulus)],
                ["Lowongan", `${proses.posisi} — ${proses.nama_mitra}`],
                ["Telepon", proses.telepon],
                ["Email", proses.email || "-"],
                ["Alamat", proses.alamat || "-"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold text-samar uppercase">{k}</dt>
                  <dd className="mt-0.5 break-words">{v}</dd>
                </div>
              ))}
              {proses.ringkasan && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-samar uppercase">Keahlian & pengalaman</dt>
                  <dd className="mt-0.5 whitespace-pre-line">{proses.ringkasan}</dd>
                </div>
              )}
            </dl>

            <Pilihan
              nama="status"
              label="Tahap penyaluran"
              wajib
              nilai={isiProses.status}
              ubah={(v) => setIsiProses((s) => ({ ...s, status: v }))}
              opsi={data?.status ?? []}
            />
            <AreaTeks
              nama="catatan"
              label="Catatan untuk pelamar"
              baris={3}
              nilai={isiProses.catatan}
              ubah={(v) => setIsiProses((s) => ({ ...s, catatan: v }))}
              bantuan="Tampil di halaman Cek Lamaran, misalnya jadwal dan tempat wawancara."
            />
            <div className="flex flex-wrap justify-end gap-2 border-t border-garis pt-5">
              <Tombol jenis="kedua" type="button" onClick={() => setProses(null)}>
                Batal
              </Tombol>
              <Tombol type="submit" sedangJalan={menyimpan}>
                {menyimpan ? "Menyimpan..." : "Simpan"}
              </Tombol>
            </div>
          </form>
        )}
      </Jendela>

      <Jendela judul="Catat Lamaran Manual" terbuka={manual} tutup={() => setManual(false)}>
        <form onSubmit={simpanManual} className="space-y-5" noValidate>
          <RingkasanGalat daftar={ringkasan} />
          <Pilihan nama="lowongan_id" label="Lowongan" wajib nilai={isiManual.lowongan_id} ubah={ubahManual("lowongan_id")} galat={galatKolom.lowongan_id} opsi={opsiLowongan} />
          <Teks nama="nama" label="Nama lengkap" wajib maks={120} nilai={isiManual.nama} ubah={ubahManual("nama")} galat={galatKolom.nama} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Teks nama="nisn" label="NISN" wajib maks={10} nilai={isiManual.nisn} ubah={ubahManual("nisn")} galat={galatKolom.nisn} />
            <Teks nama="tanggal_lahir" label="Tanggal lahir" wajib tipe="date" nilai={isiManual.tanggal_lahir} ubah={ubahManual("tanggal_lahir")} galat={galatKolom.tanggal_lahir} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="jenis_kelamin"
              label="Jenis kelamin"
              wajib
              nilai={isiManual.jenis_kelamin}
              ubah={ubahManual("jenis_kelamin")}
              galat={galatKolom.jenis_kelamin}
              opsi={[
                { nilai: "L", label: "Laki-laki" },
                { nilai: "P", label: "Perempuan" },
              ]}
            />
            <Teks nama="tahun_lulus" label="Tahun lulus" wajib tipe="number" nilai={isiManual.tahun_lulus} ubah={ubahManual("tahun_lulus")} galat={galatKolom.tahun_lulus} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Teks nama="telepon" label="Nomor HP/WhatsApp" wajib tipe="tel" maks={25} nilai={isiManual.telepon} ubah={ubahManual("telepon")} galat={galatKolom.telepon} />
            <Teks nama="email" label="Email" tipe="email" maks={120} nilai={isiManual.email} ubah={ubahManual("email")} galat={galatKolom.email} />
          </div>
          <AreaTeks nama="ringkasan" label="Keahlian dan pengalaman" baris={3} nilai={isiManual.ringkasan} ubah={ubahManual("ringkasan")} galat={galatKolom.ringkasan} />
          <div className="flex flex-wrap justify-end gap-2 border-t border-garis pt-5">
            <Tombol jenis="kedua" type="button" onClick={() => setManual(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" sedangJalan={menyimpan}>
              {menyimpan ? "Menyimpan..." : "Catat"}
            </Tombol>
          </div>
        </form>
      </Jendela>

      <Konfirmasi
        terbuka={hapusTarget !== null}
        judul="Hapus lamaran?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Lamaran <strong>{hapusTarget?.kode}</strong> atas nama <strong>{hapusTarget?.nama}</strong> beserta CV-nya akan
            dihapus permanen dan tidak lagi terhitung dalam laporan penyaluran.
          </p>
        }
      />
    </>
  );
}

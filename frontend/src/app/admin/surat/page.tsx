"use client";

import { useEffect, useState } from "react";
import { api, GalatApi, unduhSuratAdmin } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { bukaBlob } from "@/lib/berkas";
import { tanggalPanjang } from "@/lib/format";
import { useKabar } from "@/komponen/Kabar";
import { useSesi } from "@/komponen/Sesi";
import { KepalaPanel, Tabel, Jendela, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { Teks, Centang, Pilihan, Tombol, RingkasanGalat } from "@/komponen/Medan";
import type { JenisSurat, Surat } from "@/lib/tipe";
import { BENTUK_NOMOR, contohNomor, hariIni, LembarSurat, PenyusunNomor } from "@/komponen/BantuSurat";

/**
 * Surat keluar bernomor otomatis.
 *
 * Yang ditulis sekolah: format nomor, perihal, tujuan, dan naskah. Yang
 * dikerjakan sistem: nomor urutnya, per jenis surat, kembali ke 1 menurut
 * aturan yang dipilih sekolah. Penjelasan aturannya ada di backend/surat.go.
 *
 * Nomor yang sudah terbit tidak pernah berubah. Surat keliru dibatalkan,
 * bukan dihapus; hanya nomor paling akhir yang dapat dihapus admin.
 */

const ATUR_ULANG = [
  { nilai: "tahunan", label: "Setiap awal tahun (1 Januari mulai lagi dari 001)" },
  { nilai: "bulanan", label: "Setiap awal bulan (tanggal 1 mulai lagi dari 001)" },
  { nilai: "tidak", label: "Tidak pernah (nomor terus bertambah)" },
];

const STATUS = ["Menunggu Verifikasi", "Terverifikasi", "Diterima", "Cadangan", "Ditolak"];


type Galat = { kolom: Record<string, string>; daftar: string[] };
const tanpaGalat: Galat = { kolom: {}, daftar: [] };
function bacaGalat(e: unknown, bawaan: string): Galat {
  if (e instanceof GalatApi) return { kolom: e.kolom, daftar: e.daftar.length ? e.daftar : [e.message] };
  return { kolom: {}, daftar: [bawaan] };
}

export default function HalamanSurat() {
  const [tab, setTab] = useState<"agenda" | "jenis">("agenda");
  const jenis = useMuat(() => api.jenisSurat());
  const { pengguna } = useSesi();
  const admin = pengguna?.role === "admin";

  return (
    <>
      <KepalaPanel
        judul="Surat Keluar"
        keterangan="Nomor surat terisi otomatis dan tidak pernah berubah."
      />
      <div className="mb-6 flex gap-2 border-b border-garis">
        {(
          [
            ["agenda", "Buku Agenda Surat"],
            ["jenis", "Jenis Surat"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition " +
              (tab === k ? "border-biru text-biru" : "border-transparent text-samar hover:text-biru")
            }
          >
            {l}
          </button>
        ))}
      </div>

      {jenis.memuat ? (
        <Memuat />
      ) : jenis.galat ? (
        <PesanGalat pesan={jenis.galat} ulangi={jenis.muatUlang} />
      ) : tab === "agenda" ? (
        <Agenda daftarJenis={jenis.data?.data ?? []} admin={admin} keJenis={() => setTab("jenis")} />
      ) : (
        <DaftarJenis
          daftar={jenis.data?.data ?? []}
          admin={admin}
          muatUlang={jenis.muatUlang}
        />
      )}
    </>
  );
}

/* =============================================================
   Buku agenda surat
   ============================================================= */

function Agenda({ daftarJenis, admin, keJenis }: { daftarJenis: JenisSurat[]; admin: boolean; keJenis: () => void }) {
  const kabar = useKabar();
  const [jenisId, setJenisId] = useState("");
  const [cari, setCari] = useState("");
  const [cariBerlaku, setCariBerlaku] = useState("");
  const [halaman, setHalaman] = useState(1);
  const kueri = `?halaman=${halaman}${jenisId ? `&jenis_id=${jenisId}` : ""}${cariBerlaku ? `&cari=${encodeURIComponent(cariBerlaku)}` : ""}`;
  const { data, memuat, galat, muatUlang } = useMuat(() => api.daftarSurat(kueri), [kueri]);

  const [tulis, setTulis] = useState(false);
  const [massal, setMassal] = useState(false);
  const [ubah, setUbah] = useState<Surat | null>(null);
  const [batal, setBatal] = useState<Surat | null>(null);
  const [hapus, setHapus] = useState<Surat | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  const aktif = daftarJenis.filter((j) => j.aktif);
  const adaUntukPendaftar = aktif.some((j) => j.untuk_pendaftar);
  const jumlahHalaman = data ? Math.max(Math.ceil(data.total / data.per_halaman), 1) : 1;

  async function pdf(s: Surat) {
    try {
      const { nama, blob } = await unduhSuratAdmin(s.id, s.nomor_surat);
      bukaBlob(nama, blob);
    } catch {
      kabar.beri("Surat gagal dibuat.", "galat");
    }
  }

  async function lakukanHapus() {
    if (!hapus) return;
    setGalatHapus("");
    setMenghapus(true);
    try {
      const hasil = await api.hapusSurat(hapus.id);
      kabar.beri(hasil.pesan);
      setHapus(null);
      muatUlang();
    } catch (e) {
      setGalatHapus(e instanceof GalatApi ? e.message : "Surat gagal dihapus.");
    } finally {
      setMenghapus(false);
    }
  }

  if (daftarJenis.length === 0) {
    return (
      <TanpaData
        judul="Belum ada jenis surat"
        keterangan={
          admin
            ? "Buat jenis surat lebih dulu di tab Jenis Surat: nama, format nomor, dan kapan urutannya kembali ke 1."
            : "Admin sekolah perlu membuat jenis surat lebih dulu di tab Jenis Surat."
        }
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Pilihan
            nama="saring-jenis"
            label="Jenis surat"
            nilai={jenisId}
            ubah={(v) => {
              setJenisId(v);
              setHalaman(1);
            }}
            opsi={daftarJenis.map((j) => ({ nilai: String(j.id), label: j.nama }))}
            kosong="Semua jenis"
          />
        </div>
        <form
          className="flex w-full items-end gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setCariBerlaku(cari.trim());
            setHalaman(1);
          }}
        >
          <div className="w-full sm:w-72">
            <Teks nama="cari-surat" label="Cari" nilai={cari} ubah={setCari} contoh="Nomor, perihal, tujuan, atau nama" />
          </div>
          <Tombol type="submit" jenis="kedua">
            Cari
          </Tombol>
        </form>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {adaUntukPendaftar && (
            <Tombol jenis="kedua" onClick={() => setMassal(true)}>
              Terbitkan untuk Pendaftar
            </Tombol>
          )}
          <Tombol onClick={() => setTulis(true)} disabled={aktif.length === 0}>
            Tulis Surat
          </Tombol>
        </div>
      </div>

      {aktif.length === 0 && (
        <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Semua jenis surat sedang nonaktif.{" "}
          <button type="button" onClick={keJenis} className="font-semibold underline">
            Aktifkan di tab Jenis Surat
          </button>
          .
        </p>
      )}

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul={cariBerlaku || jenisId ? "Tidak ada surat yang cocok" : "Belum ada surat"}
          keterangan="Surat yang diterbitkan tercatat di sini beserta nomornya."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-samar">{data.total} surat tercatat.</p>
          <Tabel kepala={["Nomor", "Tanggal", "Perihal dan tujuan", "Keadaan", ""]}>
            {data.data.map((s) => (
              <tr key={s.id} className={"hover:bg-slate-50 " + (s.dibatalkan ? "opacity-70" : "")}>
                <td className="px-4 py-3 font-mono text-sm font-semibold whitespace-nowrap">{s.nomor_surat}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">{tanggalPanjang(s.tanggal_surat)}</td>
                <td className="px-4 py-3">
                  <p className="text-xs text-samar">{s.nama_jenis}</p>
                  <p className="font-medium">{s.perihal || "-"}</p>
                  <p className="mt-0.5 max-w-[16rem] truncate text-xs text-samar">
                    {s.nama_pendaftar ? `${s.nama_pendaftar} (${s.no_registrasi})` : s.tujuan.split("\n")[0]}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {s.dibatalkan ? (
                    <>
                      <Lencana jenis="merah">Dibatalkan</Lencana>
                      <p className="mt-1 max-w-[12rem] text-xs text-samar">{s.alasan_batal}</p>
                    </>
                  ) : (
                    <Lencana jenis="hijau">Terbit</Lencana>
                  )}
                </td>
                <td className="w-52 px-4 py-3">
                  {/* Lebar tetap dan boleh terlipat: empat tombol berderet
                      membuat tabelnya lebih lebar daripada panel di laptop,
                      dan tombol paling kanan terpotong. */}
                  <div className="flex flex-wrap justify-end gap-1.5">
                  <button type="button" onClick={() => pdf(s)} className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru">
                    PDF
                  </button>
                  {!s.dibatalkan && (
                    <button type="button" onClick={() => setUbah(s)} className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru">
                      Ubah
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBatal(s)}
                    className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-50"
                  >
                    {s.dibatalkan ? "Cabut batal" : "Batalkan"}
                  </button>
                  {admin && (
                    <button
                      type="button"
                      onClick={() => {
                        setGalatHapus("");
                        setHapus(s);
                      }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </Tabel>
          {jumlahHalaman > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <Tombol jenis="kedua" disabled={halaman <= 1} onClick={() => setHalaman((h) => h - 1)}>
                Sebelumnya
              </Tombol>
              <span className="text-samar tabular-nums">
                Halaman {halaman} dari {jumlahHalaman}
              </span>
              <Tombol jenis="kedua" disabled={halaman >= jumlahHalaman} onClick={() => setHalaman((h) => h + 1)}>
                Berikutnya
              </Tombol>
            </div>
          )}
        </>
      )}

      {tulis && <JendelaTulis daftarJenis={aktif} tutup={() => setTulis(false)} selesai={muatUlang} />}
      {massal && <JendelaMassal daftarJenis={aktif.filter((j) => j.untuk_pendaftar)} tutup={() => setMassal(false)} selesai={muatUlang} />}
      {ubah && <JendelaUbah surat={ubah} jenis={daftarJenis.find((j) => j.id === ubah.jenis_id)} tutup={() => setUbah(null)} selesai={muatUlang} />}
      {batal && <JendelaBatal surat={batal} tutup={() => setBatal(null)} selesai={muatUlang} />}

      <Konfirmasi
        terbuka={hapus !== null}
        tutup={() => setHapus(null)}
        judul="Hapus surat"
        pesan={
          <>
            Surat <strong>{hapus?.nomor_surat}</strong> akan dihapus, dan nomornya dipakai surat berikutnya. Hanya
            nomor paling akhir pada periodenya yang dapat dihapus; surat lain dibatalkan saja.
            {galatHapus && <span className="mt-3 block text-sm text-red-700">{galatHapus}</span>}
          </>
        }
        sedangJalan={menghapus}
        lanjut={lakukanHapus}
      />
    </>
  );
}

/* ---------------- menulis satu surat ---------------- */

function naskahBawaan(j?: JenisSurat) {
  return { perihal: j?.perihal_bawaan ?? "", tujuan: j?.tujuan_bawaan ?? "", lampiran: "", isi: j?.isi_bawaan ?? "" };
}

function JendelaTulis({ daftarJenis, tutup, selesai }: { daftarJenis: JenisSurat[]; tutup: () => void; selesai: () => void }) {
  const kabar = useKabar();
  const [jenisId, setJenisId] = useState(String(daftarJenis[0]?.id ?? ""));
  const [tanggal, setTanggal] = useState(hariIni());
  // Naskah bawaan jenis pertama langsung menjadi isi awalnya.
  const [isi, setIsi] = useState(() => naskahBawaan(daftarJenis[0]));
  const [noReg, setNoReg] = useState("");
  const [pendaftar, setPendaftar] = useState<{ id: number; nama: string; no_registrasi: string } | null>(null);
  const [galatCari, setGalatCari] = useState("");
  const [nomor, setNomor] = useState("");
  const [galat, setGalat] = useState<Galat>(tanpaGalat);
  const [menyimpan, setMenyimpan] = useState(false);
  const jenis = daftarJenis.find((j) => String(j.id) === jenisId);

  // Naskah bawaan jenisnya diisikan saat jenis dipilih. Penandanya
  // ({nama_lengkap} dan seterusnya) dibiarkan: backend mengisinya saat surat
  // disimpan, sesudah nomornya ditetapkan.
  function pilihJenis(v: string) {
    setJenisId(v);
    setIsi(naskahBawaan(daftarJenis.find((x) => String(x.id) === v)));
    setPendaftar(null);
  }

  // Pratinjau nomor mengikuti jenis dan tanggal. Nomornya belum dipesan.
  useEffect(() => {
    if (!jenisId || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return;
    let batal = false;
    api
      .pratinjauNomor(Number(jenisId), tanggal)
      .then((h) => !batal && setNomor(h.nomor_surat))
      .catch(() => !batal && setNomor(""));
    return () => {
      batal = true;
    };
  }, [jenisId, tanggal]);

  async function cariPendaftar() {
    setGalatCari("");
    setPendaftar(null);
    try {
      const h = await api.daftarPendaftar(`?cari=${encodeURIComponent(noReg.trim())}`);
      const p = h.data.find((x) => x.no_registrasi.toUpperCase() === noReg.trim().toUpperCase());
      if (p) setPendaftar({ id: p.id, nama: p.nama_lengkap, no_registrasi: p.no_registrasi });
      else setGalatCari("Nomor registrasi tidak ditemukan.");
    } catch {
      setGalatCari("Pendaftar gagal dicari.");
    }
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(tanpaGalat);
    if (jenis?.untuk_pendaftar && !pendaftar) {
      setGalat({ kolom: { no_registrasi: "Cari pendaftarnya dulu." }, daftar: ["Surat ini untuk pendaftar: cari nomor registrasinya dulu."] });
      return;
    }
    setMenyimpan(true);
    try {
      const h = await api.buatSurat({ jenis_id: Number(jenisId), tanggal_surat: tanggal, ...isi, pendaftar_id: pendaftar?.id ?? null });
      kabar.beri(h.pesan);
      tutup();
      selesai();
    } catch (e) {
      setGalat(bacaGalat(e, "Surat gagal diterbitkan."));
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <Jendela terbuka tutup={tutup} judul="Tulis Surat" lebar="max-w-4xl">
      <form onSubmit={simpan} className="space-y-5">
        {galat.daftar.length > 0 && <RingkasanGalat daftar={galat.daftar} />}
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <Pilihan
            nama="jenis_id"
            label="Jenis surat"
            wajib
            nilai={jenisId}
            ubah={pilihJenis}
            opsi={daftarJenis.map((j) => ({ nilai: String(j.id), label: j.nama }))}
            galat={galat.kolom.jenis_id}
          />
          <Teks nama="tanggal_surat" label="Tanggal" tipe="date" wajib nilai={tanggal} ubah={setTanggal} galat={galat.kolom.tanggal_surat} />
          <div className="rounded-lg bg-biru-muda px-4 py-2.5" title="Nomor pasti ditetapkan saat disimpan">
            <p className="text-[11px] font-semibold text-biru uppercase">Nomor</p>
            <p className="font-mono text-sm font-bold text-biru-tua">{nomor || "-"}</p>
          </div>
        </div>

        {jenis?.untuk_pendaftar && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Teks
                nama="no_registrasi"
                label="Untuk pendaftar (nomor registrasi)"
                wajib
                nilai={noReg}
                ubah={(v) => {
                  setNoReg(v);
                  setPendaftar(null);
                }}
                galat={galatCari || galat.kolom.no_registrasi}
                contoh="PPDB-2728-0001"
              />
            </div>
            <Tombol type="button" jenis="kedua" onClick={cariPendaftar} disabled={!noReg.trim()}>
              Cari
            </Tombol>
            {pendaftar && <p className="pb-3 text-sm font-semibold text-green-700">{pendaftar.nama}</p>}
          </div>
        )}

        <LembarSurat
          naskah={isi}
          ubah={setIsi}
          nomor={nomor}
          tanggal={tanggal}
          untukPendaftar={!!jenis?.untuk_pendaftar}
          penanda={{ nama: jenis?.penanda_tangan_nama ?? "", jabatan: jenis?.penanda_tangan_jabatan ?? "", nip: jenis?.penanda_tangan_nip ?? "" }}
        />

        <div className="flex justify-end gap-3 border-t border-garis pt-5">
          <Tombol type="button" jenis="kedua" onClick={tutup}>
            Batal
          </Tombol>
          <Tombol type="submit" sedangJalan={menyimpan}>
            Terbitkan Surat
          </Tombol>
        </div>
      </form>
    </Jendela>
  );
}

/* ---------------- menerbitkan untuk banyak pendaftar ---------------- */

function JendelaMassal({ daftarJenis, tutup, selesai }: { daftarJenis: JenisSurat[]; tutup: () => void; selesai: () => void }) {
  const kabar = useKabar();
  const [jenisId, setJenisId] = useState(String(daftarJenis[0]?.id ?? ""));
  const [tanggal, setTanggal] = useState(hariIni());
  const [status, setStatus] = useState("Diterima");
  const [lewati, setLewati] = useState(true);
  const [galat, setGalat] = useState<Galat>(tanpaGalat);
  const [sedang, setSedang] = useState(false);
  const isi = { jenis_id: Number(jenisId), tanggal_surat: tanggal, status, lewati_yang_sudah: lewati };

  // Hitungan disimpan bersama pilihan yang dihitungnya. Begitu salah satu
  // pilihan berubah, hitungan lama tidak berlaku lagi dengan sendirinya,
  // tanpa effect yang mengosongkannya.
  const kunci = JSON.stringify(isi);
  const [hitungan, setHitungan] = useState<{ kunci: string; jumlah: number } | null>(null);
  const jumlah = hitungan?.kunci === kunci ? hitungan.jumlah : null;

  async function hitung() {
    setGalat(tanpaGalat);
    setSedang(true);
    try {
      setHitungan({ kunci, jumlah: (await api.buatSuratMassal({ ...isi, hanya_hitung: true })).jumlah });
    } catch (e) {
      setGalat(bacaGalat(e, "Pendaftar gagal dihitung."));
    } finally {
      setSedang(false);
    }
  }

  async function terbitkan() {
    setGalat(tanpaGalat);
    setSedang(true);
    try {
      const h = await api.buatSuratMassal(isi);
      kabar.beri(h.pesan ?? `${h.jumlah} surat diterbitkan.`);
      tutup();
      selesai();
    } catch (e) {
      setGalat(bacaGalat(e, "Surat gagal diterbitkan."));
    } finally {
      setSedang(false);
    }
  }

  return (
    <Jendela terbuka tutup={tutup} judul="Terbitkan untuk Pendaftar">
      <div className="space-y-5">
        {galat.daftar.length > 0 && <RingkasanGalat daftar={galat.daftar} />}
        <p className="text-sm leading-relaxed text-samar">
          Setiap pendaftar mendapat suratnya sendiri dengan nomor berurutan, memakai naskah bawaan jenisnya. Semuanya
          terbit bersamaan atau tidak sama sekali, jadi nomornya tidak berlubang.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Pilihan
            nama="jenis_id"
            label="Jenis surat"
            wajib
            nilai={jenisId}
            ubah={setJenisId}
            opsi={daftarJenis.map((j) => ({ nilai: String(j.id), label: j.nama }))}
            galat={galat.kolom.jenis_id}
          />
          <Teks nama="tanggal_surat" label="Tanggal surat" tipe="date" wajib nilai={tanggal} ubah={setTanggal} galat={galat.kolom.tanggal_surat} />
        </div>
        <Pilihan nama="status" label="Pendaftar berstatus" wajib nilai={status} ubah={setStatus} opsi={STATUS} galat={galat.kolom.status} bantuan="Tahun ajaran PPDB yang sedang berjalan." />
        <Centang nama="lewati" nilai={lewati} ubah={setLewati}>
          Lewati pendaftar yang sudah punya surat berjenis ini
        </Centang>
        {jumlah !== null && (
          <p className="rounded-lg bg-biru-muda px-5 py-4 text-sm text-biru-tua">
            {jumlah === 0 ? (
              "Tidak ada pendaftar yang cocok."
            ) : (
              <>
                <strong>{jumlah} pendaftar</strong> akan menerima surat, berurutan menurut nomor registrasi.
              </>
            )}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-garis pt-5">
          <Tombol type="button" jenis="kedua" onClick={tutup}>
            Batal
          </Tombol>
          {jumlah === null ? (
            <Tombol type="button" onClick={hitung} sedangJalan={sedang}>
              Hitung Pendaftar
            </Tombol>
          ) : (
            <Tombol type="button" onClick={terbitkan} sedangJalan={sedang} disabled={jumlah === 0}>
              Terbitkan {jumlah} Surat
            </Tombol>
          )}
        </div>
      </div>
    </Jendela>
  );
}

/* ---------------- menyunting dan membatalkan ---------------- */

function JendelaUbah({ surat, jenis, tutup, selesai }: { surat: Surat; jenis?: JenisSurat; tutup: () => void; selesai: () => void }) {
  const kabar = useKabar();
  const [isi, setIsi] = useState({
    tanggal_surat: surat.tanggal_surat,
    perihal: surat.perihal,
    tujuan: surat.tujuan,
    lampiran: surat.lampiran,
    isi: surat.isi,
  });
  const [galat, setGalat] = useState<Galat>(tanpaGalat);
  const [menyimpan, setMenyimpan] = useState(false);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(tanpaGalat);
    setMenyimpan(true);
    try {
      kabar.beri((await api.ubahSurat(surat.id, isi)).pesan);
      tutup();
      selesai();
    } catch (e) {
      setGalat(bacaGalat(e, "Surat gagal disimpan."));
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <Jendela terbuka tutup={tutup} judul={`Ubah Surat ${surat.nomor_surat}`} lebar="max-w-4xl">
      <form onSubmit={simpan} className="space-y-5">
        {galat.daftar.length > 0 && <RingkasanGalat daftar={galat.daftar} />}
        <div className="max-w-xs">
          <Teks
            nama="tanggal_surat"
            label="Tanggal"
            tipe="date"
            wajib
            nilai={isi.tanggal_surat}
            ubah={(v) => setIsi((s) => ({ ...s, tanggal_surat: v }))}
            galat={galat.kolom.tanggal_surat}
            bantuan={`Nomornya tetap; tanggal hanya dapat digeser di ${surat.periode === "-" ? "periode yang sama" : `periode ${surat.periode}`}.`}
          />
        </div>
        <LembarSurat
          naskah={{ perihal: isi.perihal, tujuan: isi.tujuan, lampiran: isi.lampiran, isi: isi.isi }}
          ubah={(n) => setIsi((s) => ({ ...s, ...n }))}
          nomor={surat.nomor_surat}
          tanggal={isi.tanggal_surat}
          untukPendaftar={false}
          penanda={{ nama: jenis?.penanda_tangan_nama ?? "", jabatan: jenis?.penanda_tangan_jabatan ?? "", nip: jenis?.penanda_tangan_nip ?? "" }}
        />
        <div className="flex justify-end gap-3 border-t border-garis pt-5">
          <Tombol type="button" jenis="kedua" onClick={tutup}>
            Batal
          </Tombol>
          <Tombol type="submit" sedangJalan={menyimpan}>
            Simpan Perubahan
          </Tombol>
        </div>
      </form>
    </Jendela>
  );
}

function JendelaBatal({ surat, tutup, selesai }: { surat: Surat; tutup: () => void; selesai: () => void }) {
  const kabar = useKabar();
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<Galat>(tanpaGalat);
  const [sedang, setSedang] = useState(false);
  const cabut = surat.dibatalkan;

  async function lakukan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(tanpaGalat);
    setSedang(true);
    try {
      kabar.beri((await api.batalSurat(surat.id, !cabut, alasan)).pesan);
      tutup();
      selesai();
    } catch (e) {
      setGalat(bacaGalat(e, "Surat gagal dibatalkan."));
    } finally {
      setSedang(false);
    }
  }

  return (
    <Jendela terbuka tutup={tutup} judul={cabut ? `Cabut Pembatalan ${surat.nomor_surat}` : `Batalkan Surat ${surat.nomor_surat}`}>
      <form onSubmit={lakukan} className="space-y-5">
        {galat.daftar.length > 0 && <RingkasanGalat daftar={galat.daftar} />}
        {cabut ? (
          <p className="text-sm text-samar">Surat ini akan berlaku lagi dengan nomor yang sama.</p>
        ) : (
          <>
            <p className="text-sm text-samar">
              Nomornya tetap tercatat di buku agenda dan tidak dipakai ulang. PDF-nya diberi tanda DIBATALKAN, dan surat
              ini hilang dari halaman Cek Status pendaftar.
            </p>
            <Teks nama="alasan" label="Alasan pembatalan" wajib maks={200} nilai={alasan} ubah={setAlasan} galat={galat.kolom.alasan} contoh="Salah tujuan" />
          </>
        )}
        <div className="flex justify-end gap-3 border-t border-garis pt-5">
          <Tombol type="button" jenis="kedua" onClick={tutup}>
            Kembali
          </Tombol>
          <Tombol type="submit" jenis={cabut ? "utama" : "bahaya"} sedangJalan={sedang}>
            {cabut ? "Cabut Pembatalan" : "Batalkan Surat"}
          </Tombol>
        </div>
      </form>
    </Jendela>
  );
}

/* =============================================================
   Jenis surat
   ============================================================= */

const JENIS_KOSONG = {
  nama: "",
  kode: "",
  format_nomor: "{urut:3}/{kode}/SMA-IMTEK/{bulan_romawi}/{tahun}",
  atur_ulang: "tahunan" as JenisSurat["atur_ulang"],
  untuk_pendaftar: false,
  tampil_di_cek_status: false,
  perihal_bawaan: "",
  tujuan_bawaan: "",
  isi_bawaan: "",
  penanda_tangan_nama: "",
  penanda_tangan_jabatan: "",
  penanda_tangan_nip: "",
  aktif: true,
  urutan: 0,
};

/**
 * Titik mulai jenis surat yang umum dipakai sekolah. Bagian yang harus diisi
 * sekolah sendiri ditulis dalam [kurung siku], sesuai kebiasaan proyek ini:
 * tidak ada tanggal, tempat, atau nama yang dikarang.
 */
const CONTOH_JENIS: { label: string; isi: Partial<typeof JENIS_KOSONG> }[] = [
  {
    label: "Surat Undangan",
    isi: {
      nama: "Surat Undangan", kode: "UND", format_nomor: BENTUK_NOMOR[0], atur_ulang: "tahunan",
      perihal_bawaan: "Undangan [nama kegiatan]",
      tujuan_bawaan: "Bapak/Ibu Orang Tua/Wali Siswa\ndi tempat",
      isi_bawaan: "Dengan hormat,\n\nDengan ini kami mengundang Bapak/Ibu untuk hadir pada kegiatan berikut:\nHari, tanggal: [hari, tanggal]\nWaktu: [pukul]\nTempat: [tempat]\nAcara: [acara]\n\nMengingat pentingnya kegiatan tersebut, kami mengharapkan kehadiran Bapak/Ibu. Atas perhatiannya kami ucapkan terima kasih.",
      penanda_tangan_jabatan: "Kepala Sekolah",
    },
  },
  {
    label: "Surat Keterangan Diterima",
    isi: {
      nama: "Surat Keterangan Diterima", kode: "SKD", format_nomor: BENTUK_NOMOR[0], atur_ulang: "tahunan",
      untuk_pendaftar: true, tampil_di_cek_status: true,
      perihal_bawaan: "Keterangan Diterima sebagai Peserta Didik Baru",
      tujuan_bawaan: "{nama_lengkap}\nCalon Peserta Didik Baru",
      isi_bawaan: "Dengan hormat,\n\nBerdasarkan hasil seleksi Penerimaan Peserta Didik Baru {nama_sekolah} tahun ajaran {tahun_ajaran}, dengan ini kami menerangkan bahwa:\nNama: {nama_lengkap}\nNomor registrasi: {no_registrasi}\nNISN: {nisn}\nPeminatan: {peminatan}\n\ndinyatakan DITERIMA sebagai peserta didik baru. Silakan melakukan daftar ulang sesuai jadwal yang ditetapkan sekolah.\n\nDemikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.",
      penanda_tangan_jabatan: "Kepala Sekolah",
    },
  },
  {
    label: "Surat Pemberitahuan",
    isi: {
      nama: "Surat Pemberitahuan", kode: "PBR", format_nomor: BENTUK_NOMOR[0], atur_ulang: "tahunan",
      perihal_bawaan: "Pemberitahuan [hal yang diberitahukan]",
      tujuan_bawaan: "Bapak/Ibu Orang Tua/Wali Siswa\ndi tempat",
      isi_bawaan: "Dengan hormat,\n\nBersama surat ini kami memberitahukan bahwa [isi pemberitahuan].\n\nDemikian pemberitahuan ini kami sampaikan. Atas perhatian Bapak/Ibu kami ucapkan terima kasih.",
      penanda_tangan_jabatan: "Kepala Sekolah",
    },
  },
  {
    label: "Surat Tugas",
    isi: {
      nama: "Surat Tugas", kode: "ST", format_nomor: BENTUK_NOMOR[1], atur_ulang: "bulanan",
      perihal_bawaan: "Surat Tugas",
      isi_bawaan: "Yang bertanda tangan di bawah ini menugaskan:\nNama: [nama]\nJabatan: [jabatan]\n\nuntuk [keperluan tugas] pada [hari, tanggal] di [tempat].\n\nDemikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.",
      penanda_tangan_jabatan: "Kepala Sekolah",
    },
  },
];

function DaftarJenis({ daftar, admin, muatUlang }: { daftar: JenisSurat[]; admin: boolean; muatUlang: () => void }) {
  const kabar = useKabar();
  const [buka, setBuka] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [jumlahSurat, setJumlahSurat] = useState(0);
  const [isi, setIsi] = useState(JENIS_KOSONG);
  const [galat, setGalat] = useState<Galat>(tanpaGalat);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapus, setHapus] = useState<JenisSurat | null>(null);
  const [galatHapus, setGalatHapus] = useState("");
  const [menghapus, setMenghapus] = useState(false);
  const setel = <K extends keyof typeof JENIS_KOSONG>(k: K) => (v: (typeof JENIS_KOSONG)[K]) => setIsi((s) => ({ ...s, [k]: v }));

  function bukaJendela(j?: JenisSurat) {
    setGalat(tanpaGalat);
    if (j) {
      setUbahId(j.id);
      setJumlahSurat(j.jumlah_surat);
      setIsi(
        Object.fromEntries(Object.keys(JENIS_KOSONG).map((k) => [k, j[k as keyof typeof JENIS_KOSONG]])) as typeof JENIS_KOSONG,
      );
    } else {
      setUbahId(null);
      setJumlahSurat(0);
      setIsi({ ...JENIS_KOSONG, urutan: daftar.length + 1 });
    }
    setBuka(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(tanpaGalat);
    setMenyimpan(true);
    try {
      const h = ubahId === null ? await api.simpanJenisSurat(isi) : await api.ubahJenisSurat(ubahId, isi);
      kabar.beri(h.pesan);
      setBuka(false);
      muatUlang();
    } catch (e) {
      setGalat(bacaGalat(e, "Jenis surat gagal disimpan."));
    } finally {
      setMenyimpan(false);
    }
  }

  async function lakukanHapus() {
    if (!hapus) return;
    setGalatHapus("");
    setMenghapus(true);
    try {
      kabar.beri((await api.hapusJenisSurat(hapus.id)).pesan);
      setHapus(null);
      muatUlang();
    } catch (e) {
      setGalatHapus(e instanceof GalatApi ? e.message : "Jenis surat gagal dihapus.");
    } finally {
      setMenghapus(false);
    }
  }

  const labelAtur = (a: string) => ATUR_ULANG.find((x) => x.nilai === a)?.label.split(" (")[0] ?? a;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-samar">
          {admin ? "Setiap jenis surat punya nomornya sendiri." : "Hanya admin sekolah yang dapat mengubah jenis surat."}
        </p>
        {admin && <Tombol onClick={() => bukaJendela()}>Tambah Jenis Surat</Tombol>}
      </div>

      {daftar.length === 0 ? (
        <TanpaData judul="Belum ada jenis surat" keterangan="Contoh: Surat Undangan, Surat Keterangan Diterima, Surat Pemberitahuan." />
      ) : (
        <Tabel kepala={["Jenis surat", "Contoh nomor", "Mulai lagi dari 001", "Untuk", "Surat", "Keadaan", ""]}>
          {daftar.map((j) => (
            <tr key={j.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium">{j.nama}</p>
                {j.kode && <p className="text-xs text-samar">Kode {j.kode}</p>}
              </td>
              <td className="px-4 py-3">
                <p className="font-mono text-sm font-semibold text-biru-tua">{contohNomor(j.format_nomor, j.kode, hariIni())}</p>
              </td>
              <td className="px-4 py-3 text-sm text-samar">{labelAtur(j.atur_ulang)}</td>
              <td className="px-4 py-3 text-sm text-samar">
                {j.untuk_pendaftar ? (j.tampil_di_cek_status ? "Pendaftar (dapat diunduh)" : "Pendaftar") : "Umum"}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums">{j.jumlah_surat}</td>
              <td className="px-4 py-3">
                <Lencana jenis={j.aktif ? "hijau" : "abu"}>{j.aktif ? "Aktif" : "Nonaktif"}</Lencana>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {admin && (
                  <>
                    <button type="button" onClick={() => bukaJendela(j)} className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda hover:text-biru">
                      Ubah
                    </button>
                    {j.jumlah_surat === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setGalatHapus("");
                          setHapus(j);
                        }}
                        className="ml-2 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </Tabel>
      )}

      <Jendela terbuka={buka} tutup={() => setBuka(false)} judul={ubahId === null ? "Tambah Jenis Surat" : "Ubah Jenis Surat"} lebar="max-w-4xl">
        <form onSubmit={simpan} className="space-y-6">
          {galat.daftar.length > 0 && <RingkasanGalat daftar={galat.daftar} />}
          {ubahId === null && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-samar">Pakai contoh:</span>
              {CONTOH_JENIS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setIsi({ ...JENIS_KOSONG, urutan: isi.urutan, ...c.isi })}
                  className="rounded-full border border-biru/30 bg-biru-muda px-3 py-1 text-sm font-semibold text-biru hover:border-biru"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Teks nama="nama" label="Nama surat" wajib maks={120} nilai={isi.nama} ubah={setel("nama")} galat={galat.kolom.nama} contoh="Surat Undangan" />
            <Teks nama="kode" label="Kode" maks={30} nilai={isi.kode} ubah={setel("kode")} galat={galat.kolom.kode} contoh="UND" />
          </div>
          <Centang nama="untuk_pendaftar" nilai={isi.untuk_pendaftar} ubah={setel("untuk_pendaftar")}>
            Surat ini untuk pendaftar PPDB
          </Centang>
          <PenyusunNomor nilai={isi.format_nomor} ubah={setel("format_nomor")} kode={isi.kode} aturUlang={isi.atur_ulang} galat={galat.kolom.format_nomor} />
          <div>
            <p className="mb-2 text-sm font-semibold text-teks">Naskah surat</p>
            <LembarSurat
              naskah={{ perihal: isi.perihal_bawaan, tujuan: isi.tujuan_bawaan, lampiran: "", isi: isi.isi_bawaan }}
              ubah={(n) => setIsi((s) => ({ ...s, perihal_bawaan: n.perihal, tujuan_bawaan: n.tujuan, isi_bawaan: n.isi }))}
              nomor={contohNomor(isi.format_nomor, isi.kode, hariIni())}
              tanggal={hariIni()}
              untukPendaftar={isi.untuk_pendaftar}
              penanda={{ nama: isi.penanda_tangan_nama, jabatan: isi.penanda_tangan_jabatan, nip: isi.penanda_tangan_nip }}
              ubahPenanda={(p) => setIsi((s) => ({ ...s, penanda_tangan_nama: p.nama, penanda_tangan_jabatan: p.jabatan, penanda_tangan_nip: p.nip }))}
            />
          </div>

          <details className="rounded-lg border border-garis px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-teks">Pengaturan lain</summary>
            <div className="mt-4 space-y-4">
              <Pilihan
                nama="atur_ulang"
                label="Nomor mulai lagi dari 001"
                wajib
                nilai={isi.atur_ulang}
                ubah={(v) => setel("atur_ulang")(v as JenisSurat["atur_ulang"])}
                opsi={ATUR_ULANG}
                galat={galat.kolom.atur_ulang}
                bantuan={jumlahSurat > 0 ? "Tidak dapat diganti karena sudah ada surat berjenis ini." : undefined}
              />
              {isi.untuk_pendaftar && (
                <Centang nama="tampil_di_cek_status" nilai={isi.tampil_di_cek_status} ubah={setel("tampil_di_cek_status")}>
                  Pendaftar dapat mengunduhnya di Cek Status
                </Centang>
              )}
              <div className="flex flex-wrap items-center gap-6">
                <Centang nama="aktif" nilai={isi.aktif} ubah={setel("aktif")}>
                  Aktif
                </Centang>
                <div className="w-32">
                  <Teks nama="urutan" label="Urutan tampil" tipe="number" nilai={String(isi.urutan)} ubah={(v) => setel("urutan")(Number(v) || 0)} />
                </div>
              </div>
            </div>
          </details>

          <div className="flex justify-end gap-3 border-t border-garis pt-5">
            <Tombol type="button" jenis="kedua" onClick={() => setBuka(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" sedangJalan={menyimpan}>
              Simpan
            </Tombol>
          </div>
        </form>
      </Jendela>

      <Konfirmasi
        terbuka={hapus !== null}
        tutup={() => setHapus(null)}
        judul="Hapus jenis surat"
        pesan={
          <>
            Jenis <strong>{hapus?.nama}</strong> akan dihapus.
            {galatHapus && <span className="mt-3 block text-sm text-red-700">{galatHapus}</span>}
          </>
        }
        sedangJalan={menghapus}
        lanjut={lakukanHapus}
      />
    </>
  );
}

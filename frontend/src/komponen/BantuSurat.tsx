"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { namaLengkapSekolah, tanggalPanjang } from "@/lib/format";

/**
 * Alat bantu halaman Surat untuk petugas yang tidak terbiasa dengan kode.
 *
 * Backend menyimpan format nomor dan naskah sebagai teks berpenanda, misalnya
 * "{urut:3}/{kode}/{tahun}" dan "Yth. {nama_lengkap}". Bentuk itu tetap yang
 * dikirim ke server. Di layar, petugas menulis langsung di lembar surat, dan
 * penanda tampil sebagai «Nama pendaftar» yang dapat dibaca siapa saja.
 */

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function hariIni() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** Contoh nomor untuk sebuah format; sama dengan susunNomor di backend. */
export function contohNomor(format: string, kode: string, tanggal: string, urut = 1): string {
  const [tahun, bulan] = tanggal.split("-");
  return format.replace(/\{([a-z_]+)(?::(\d+))?\}/g, (asli, nama: string, lebar?: string) => {
    switch (nama) {
      case "urut":
        return lebar ? String(urut).padStart(Number(lebar), "0") : String(urut);
      case "kode":
        return kode || "KODE";
      case "bulan":
        return bulan;
      case "bulan_romawi":
        return ROMAWI.at(Number(bulan) - 1) ?? "";
      case "tahun":
        return tahun;
      case "tahun_ajaran":
        return "2027/2028";
      default:
        return asli;
    }
  });
}

/* =============================================================
   Bentuk nomor surat
   ============================================================= */

type Bagian =
  | { jenis: "urut"; lebar: number }
  | { jenis: "kode" | "bulan" | "bulan_romawi" | "tahun" | "tahun_ajaran" }
  | { jenis: "teks"; isi: string };

const NAMA_BAGIAN: Record<Bagian["jenis"], string> = {
  urut: "Nomor urut",
  kode: "Kode surat",
  bulan: "Bulan (09)",
  bulan_romawi: "Bulan (IX)",
  tahun: "Tahun",
  tahun_ajaran: "Tahun ajaran",
  teks: "Tulisan",
};

const PEMISAH = ["/", "-", "."];

function keFormat(bagian: Bagian[], pemisah: string): string {
  return bagian
    .map((b) => (b.jenis === "urut" ? (b.lebar > 1 ? `{urut:${b.lebar}}` : "{urut}") : b.jenis === "teks" ? b.isi : `{${b.jenis}}`))
    .join(pemisah);
}

/** Memecah format menjadi bagian-bagian. Null bila bentuknya tidak dapat disusun lewat tombol. */
function dariFormat(format: string): { bagian: Bagian[]; pemisah: string } | null {
  const pemisah = PEMISAH.find((p) => format.includes(p)) ?? "/";
  const bagian: Bagian[] = [];
  for (const potong of format.split(pemisah)) {
    const m = /^\{([a-z_]+)(?::(\d))?\}$/.exec(potong);
    if (m) {
      if (m[1] === "urut") bagian.push({ jenis: "urut", lebar: Number(m[2] ?? 0) });
      else if (["kode", "bulan", "bulan_romawi", "tahun", "tahun_ajaran"].includes(m[1])) bagian.push({ jenis: m[1] as "kode" });
      else return null;
    } else if (/^[^{}]+$/.test(potong)) bagian.push({ jenis: "teks", isi: potong });
    else return null;
  }
  return bagian.length ? { bagian, pemisah } : null;
}

export const BENTUK_NOMOR = [
  "{urut:3}/{kode}/SMAS-IMTEK/{bulan_romawi}/{tahun}",
  "{urut:3}/{kode}/{bulan_romawi}/{tahun}",
  "{kode}/{urut:3}/SMAS-IMTEK/{tahun}",
  "{urut:3}/SMAS-IMTEK/{tahun}",
];

/**
 * Kekurangan format menurut aturan mulai-lagi-dari-001 yang dipilih, beserta
 * perbaikannya. Aturannya sama dengan periksaFormatNomor di backend; di sini
 * supaya petugas tahu sebelum menekan Simpan.
 */
export function kekuranganFormat(format: string, aturUlang: string): { pesan: string; perbaiki: string }[] {
  const hasil: { pesan: string; perbaiki: string }[] = [];
  const pisah = PEMISAH.find((p) => format.includes(p)) ?? "/";
  if (!/\{urut(:\d)?\}/.test(format)) hasil.push({ pesan: "Nomor urut belum ada.", perbaiki: `{urut:3}${pisah}${format}` });
  if ((aturUlang === "tahunan" || aturUlang === "bulanan") && !format.includes("{tahun}")) {
    hasil.push({ pesan: "Tahun belum ada, jadi nomornya bisa sama dengan tahun lalu.", perbaiki: `${format}${pisah}{tahun}` });
  }
  if (aturUlang === "bulanan" && !format.includes("{bulan}") && !format.includes("{bulan_romawi}")) {
    hasil.push({
      pesan: "Bulan belum ada, padahal nomor mulai lagi setiap bulan.",
      perbaiki: format.includes("{tahun}") ? format.replace("{tahun}", `{bulan_romawi}${pisah}{tahun}`) : `${format}${pisah}{bulan_romawi}`,
    });
  }
  return hasil;
}

export function PenyusunNomor({ nilai, ubah, kode, aturUlang, galat }: { nilai: string; ubah: (v: string) => void; kode: string; aturUlang: string; galat?: string }) {
  const terurai = dariFormat(nilai);
  const [susun, setSusun] = useState(!BENTUK_NOMOR.includes(nilai));
  const [ketik, setKetik] = useState(terurai === null);
  const kurang = kekuranganFormat(nilai, aturUlang);
  const ganti = (bagian: Bagian[], pemisah = terurai?.pemisah ?? "/") => ubah(keFormat(bagian, pemisah));
  const bagian = terurai?.bagian ?? [];
  const tombolKecil = "rounded px-1 text-samar hover:bg-biru-muda disabled:opacity-30";

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-teks">Bentuk nomor surat</p>
      <div className="flex flex-wrap gap-2">
        {BENTUK_NOMOR.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              ubah(f);
              setSusun(false);
            }}
            className={"rounded-lg border px-3 py-2 font-mono text-sm transition " + (f === nilai && !susun ? "border-biru bg-biru-muda font-bold text-biru-tua" : "border-garis hover:border-biru")}
          >
            {contohNomor(f, kode, hariIni())}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSusun(true)}
          className={"rounded-lg border px-3 py-2 text-sm font-semibold transition " + (susun ? "border-biru bg-biru-muda text-biru-tua" : "border-dashed border-garis text-biru hover:border-biru")}
        >
          Susun sendiri
        </button>
      </div>

      {susun && (
        <div className="mt-3 rounded-lg border border-garis p-3">
          <p className="font-mono text-base font-bold text-biru-tua">{contohNomor(nilai, kode, hariIni())}</p>
          {ketik || !terurai ? (
            <input aria-label="Kode format nomor" value={nilai} onChange={(e) => ubah(e.target.value)} className="mt-2 w-full rounded-lg border border-garis px-3 py-2 font-mono text-sm" />
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {bagian.map((b, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="font-mono font-bold text-samar">{terurai.pemisah}</span>}
                    <span className="inline-flex items-center gap-0.5 rounded-lg border border-garis bg-white py-1 pr-1 pl-2 text-sm">
                      {b.jenis === "teks" ? (
                        <input
                          aria-label="Tulisan"
                          value={b.isi}
                          onChange={(e) => ganti(bagian.map((x, j) => (j === i ? { jenis: "teks", isi: e.target.value.replace(/[{}/]/g, "") } : x)))}
                          className="w-24 rounded border border-garis px-1.5 py-0.5 font-mono text-xs"
                        />
                      ) : b.jenis === "urut" ? (
                        <select
                          aria-label="Jumlah angka nomor urut"
                          value={b.lebar}
                          onChange={(e) => ganti(bagian.map((x, j) => (j === i ? { jenis: "urut", lebar: Number(e.target.value) } : x)))}
                          className="rounded border border-garis px-1 py-0.5 text-xs"
                        >
                          <option value={0}>Nomor 1</option>
                          <option value={2}>Nomor 01</option>
                          <option value={3}>Nomor 001</option>
                          <option value={4}>Nomor 0001</option>
                        </select>
                      ) : (
                        <span className="px-0.5 font-medium">{NAMA_BAGIAN[b.jenis]}</span>
                      )}
                      <button type="button" aria-label="Geser ke kiri" disabled={i === 0} onClick={() => ganti(bagian.map((x, j) => (j === i - 1 ? bagian[i] : j === i ? bagian[i - 1] : x)))} className={tombolKecil}>
                        ‹
                      </button>
                      <button type="button" aria-label="Geser ke kanan" disabled={i === bagian.length - 1} onClick={() => ganti(bagian.map((x, j) => (j === i + 1 ? bagian[i] : j === i ? bagian[i + 1] : x)))} className={tombolKecil}>
                        ›
                      </button>
                      <button type="button" aria-label="Buang" onClick={() => ganti(bagian.filter((_, j) => j !== i))} className="rounded px-1 text-red-600 hover:bg-red-50">
                        ×
                      </button>
                    </span>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-samar">Tambah:</span>
                {(Object.keys(NAMA_BAGIAN) as Bagian["jenis"][]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => ganti([...bagian, k === "urut" ? { jenis: "urut", lebar: 3 } : k === "teks" ? { jenis: "teks", isi: "SMAS-IMTEK" } : { jenis: k }])}
                    className="rounded-full border border-biru/30 bg-biru-muda px-2 py-0.5 font-semibold text-biru hover:border-biru"
                  >
                    + {NAMA_BAGIAN[k]}
                  </button>
                ))}
                <select aria-label="Tanda pemisah" value={terurai.pemisah} onChange={(e) => ganti(bagian, e.target.value)} className="ml-auto rounded border border-garis px-1.5 py-0.5 font-mono">
                  {PEMISAH.map((p) => (
                    <option key={p} value={p}>
                      pemisah {p}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button type="button" onClick={() => setKetik((m) => !m)} className="mt-2 text-xs text-samar hover:text-biru hover:underline">
            {ketik ? "Pakai tombol" : "Ketik kode"}
          </button>
        </div>
      )}

      {kurang.map((k) => (
        <p key={k.pesan} className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-300">
          <span className="flex-1">{k.pesan}</span>
          <button type="button" onClick={() => ubah(k.perbaiki)} className="rounded-md bg-amber-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-800">
            Perbaiki
          </button>
        </p>
      ))}
      {galat && <p className="mt-2 text-sm text-red-700">{galat}</p>}
    </div>
  );
}

/* =============================================================
   Isian otomatis: {kode} di server, «Label» di layar
   ============================================================= */

export const ISIAN = [
  { kode: "nomor_surat", label: "Nomor surat", contoh: "001/UND/SMAS-IMTEK/IX/2026", pendaftar: false },
  { kode: "tanggal_surat", label: "Tanggal surat", contoh: "29 September 2026", pendaftar: false },
  { kode: "nama_sekolah", label: "Nama sekolah", contoh: "SMA Swasta IMTEK", pendaftar: false },
  { kode: "tahun_ajaran", label: "Tahun ajaran", contoh: "2027/2028", pendaftar: false },
  { kode: "nama_lengkap", label: "Nama pendaftar", contoh: "Siti Aminah Zahra", pendaftar: true },
  { kode: "no_registrasi", label: "No. registrasi", contoh: "PPDB-2728-0003", pendaftar: true },
  { kode: "nisn", label: "NISN", contoh: "0112345672", pendaftar: true },
  { kode: "jalur", label: "Jalur", contoh: "Reguler", pendaftar: true },
  { kode: "peminatan", label: "Peminatan", contoh: "Peminatan MIPA", pendaftar: true },
  { kode: "sekolah_asal", label: "Sekolah asal", contoh: "SMP Negeri 1", pendaftar: true },
  { kode: "status", label: "Status", contoh: "Diterima", pendaftar: true },
] as const;

const KE_LABEL = new Map<string, string>(ISIAN.map((i) => [i.kode, i.label]));
const KE_KODE = new Map<string, string>(ISIAN.map((i) => [i.label.toLowerCase(), i.kode]));

/** {nama_lengkap} menjadi «Nama pendaftar», untuk ditampilkan. */
export const keTampil = (t: string) => t.replace(/\{([a-z_]+)\}/g, (asli, k: string) => (KE_LABEL.has(k) ? `«${KE_LABEL.get(k)}»` : asli));
/** «Nama pendaftar» kembali menjadi {nama_lengkap}, untuk disimpan. */
export const keKode = (t: string) => t.replace(/«([^»\n]{1,40})»/g, (asli, l: string) => (KE_KODE.has(l.trim().toLowerCase()) ? `{${KE_KODE.get(l.trim().toLowerCase())}}` : asli));

/** Isian yang tidak dikenal sistem, biasanya karena salah ketik: {..} atau «..». */
export function isianTakDikenal(teks: string): string[] {
  const kode = [...teks.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((k) => !KE_LABEL.has(k)).map((k) => `{${k}}`);
  const label = [...keKode(teks).matchAll(/«([^»\n]{1,40})»/g)].map((m) => `«${m[1]}»`);
  return [...new Set([...kode, ...label])];
}

/** Bagian dalam [kurung siku]: tempat yang masih harus diganti petugas. */
export const belumDiisi = (teks: string) => [...new Set(teks.match(/\[[^\]\n]{1,60}\]/g) ?? [])];

/* =============================================================
   Lembar surat yang dapat ditulisi langsung
   ============================================================= */

export type Naskah = { perihal: string; tujuan: string; lampiran: string; isi: string };

/** Kotak ketik tanpa bingkai yang memanjang mengikuti isinya, seperti menulis di kertas. */
function Tulisan({
  id,
  nilai,
  ubah,
  fokus,
  contoh,
  tebal,
  satuBaris,
}: {
  id: string;
  nilai: string;
  ubah: (v: string) => void;
  fokus: (id: string) => void;
  contoh: string;
  tebal?: boolean;
  satuBaris?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const tampil = keTampil(nilai);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [tampil]);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={1}
      value={tampil}
      placeholder={contoh}
      onFocus={() => fokus(id)}
      onChange={(e) => ubah(keKode(satuBaris ? e.target.value.replace(/\n/g, " ") : e.target.value))}
      className={
        "block w-full resize-none overflow-hidden rounded bg-transparent px-1 -mx-1 leading-relaxed outline-none transition placeholder:text-slate-400 placeholder:italic hover:bg-amber-50 focus:bg-amber-50 focus:ring-1 focus:ring-amber-300 " +
        (tebal ? "font-bold" : "")
      }
    />
  );
}

/**
 * Lembar surat seperti hasil PDF-nya: kop, tanggal, nomor, perihal, tujuan,
 * isi, penanda tangan. Bagian yang boleh diubah langsung ditulisi di tempatnya.
 */
export function LembarSurat({
  naskah,
  ubah,
  nomor,
  tanggal,
  untukPendaftar,
  penanda,
  ubahPenanda,
}: {
  naskah: Naskah;
  ubah: (n: Naskah) => void;
  nomor: string;
  tanggal: string;
  untukPendaftar: boolean;
  penanda: { nama: string; jabatan: string; nip: string };
  ubahPenanda?: (p: { nama: string; jabatan: string; nip: string }) => void;
}) {
  const [sekolah, setSekolah] = useState<Record<string, string>>({});
  const [aktif, setAktif] = useState("lembar-isi");
  useEffect(() => {
    api.profil().then((p) => setSekolah(p.pengaturan)).catch(() => undefined);
  }, []);
  const set = (k: keyof Naskah) => (v: string) => ubah({ ...naskah, [k]: v });
  const medan: Record<string, keyof Naskah> = { "lembar-perihal": "perihal", "lembar-tujuan": "tujuan", "lembar-isi": "isi", "lembar-lampiran": "lampiran" };

  function sisip(label: string) {
    const k = medan[aktif] ?? "isi";
    const el = document.getElementById(aktif) as HTMLTextAreaElement | null;
    const tampil = keTampil(naskah[k]);
    const awal = el?.selectionStart ?? tampil.length;
    const akhir = el?.selectionEnd ?? tampil.length;
    const token = (awal > 0 && !/\s/.test(tampil[awal - 1]) ? " " : "") + `«${label}»`;
    ubah({ ...naskah, [k]: keKode(tampil.slice(0, awal) + token + tampil.slice(akhir)) });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(awal + token.length, awal + token.length);
    });
  }

  const semua = `${naskah.perihal}\n${naskah.tujuan}\n${naskah.isi}`;
  const salah = isianTakDikenal(semua);
  const kosong = belumDiisi(semua);
  const fokus = setAktif;
  const tanggalTampil = /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? tanggalPanjang(tanggal) : "";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-samar">Sisipkan:</span>
        {ISIAN.filter((i) => untukPendaftar || !i.pendaftar).map((i) => (
          <button
            key={i.kode}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => sisip(i.label)}
            className="rounded-full border border-biru/30 bg-biru-muda px-2.5 py-0.5 text-xs font-semibold text-biru hover:border-biru"
          >
            {i.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-slate-100 p-3 sm:p-5">
        <div className="mx-auto max-w-[42rem] rounded bg-white px-6 py-6 text-[13.5px] text-slate-900 shadow sm:px-10">
          <div className="border-b-2 border-slate-800 pb-2 text-center">
            <p className="text-base font-bold uppercase">{namaLengkapSekolah(sekolah)}</p>
            {sekolah.alamat && <p className="text-xs text-slate-600">{sekolah.alamat}</p>}
          </div>
          <p className="mt-4 text-right">
            {sekolah.kota ? `${sekolah.kota}, ` : ""}
            {tanggalTampil}
          </p>
          <div className="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-0.5">
            <span>Nomor</span>
            <span className="font-mono">: {nomor || "(dibagikan sistem)"}</span>
            <span>Lampiran</span>
            <span className="flex gap-1">
              : <Tulisan id="lembar-lampiran" nilai={naskah.lampiran} ubah={set("lampiran")} fokus={fokus} contoh="-" satuBaris />
            </span>
            <span>Perihal</span>
            <span className="flex gap-1">
              : <Tulisan id="lembar-perihal" nilai={naskah.perihal} ubah={set("perihal")} fokus={fokus} contoh="tulis perihal" tebal satuBaris />
            </span>
          </div>
          <div className="mt-4">
            <p>Kepada Yth.</p>
            <Tulisan id="lembar-tujuan" nilai={naskah.tujuan} ubah={set("tujuan")} fokus={fokus} contoh="tulis tujuan surat" />
          </div>
          <div className="mt-4">
            <Tulisan id="lembar-isi" nilai={naskah.isi} ubah={set("isi")} fokus={fokus} contoh="Tulis isi surat di sini..." />
          </div>
          <div className="mt-6 ml-auto w-1/2">
            {ubahPenanda ? (
              <>
                <input aria-label="Jabatan penanda tangan" value={penanda.jabatan} placeholder="Kepala Sekolah" onChange={(e) => ubahPenanda({ ...penanda, jabatan: e.target.value })} className="block w-full rounded bg-transparent px-1 -mx-1 outline-none hover:bg-amber-50 focus:bg-amber-50" />
                <input aria-label="Nama penanda tangan" value={penanda.nama} placeholder="nama penanda tangan" onChange={(e) => ubahPenanda({ ...penanda, nama: e.target.value })} className="mt-12 block w-full rounded bg-transparent px-1 -mx-1 font-bold outline-none placeholder:font-normal placeholder:italic hover:bg-amber-50 focus:bg-amber-50" />
                <input aria-label="NIP" value={penanda.nip} placeholder="NIP (bila ada)" onChange={(e) => ubahPenanda({ ...penanda, nip: e.target.value })} className="block w-full rounded bg-transparent px-1 -mx-1 outline-none placeholder:italic hover:bg-amber-50 focus:bg-amber-50" />
              </>
            ) : (
              <>
                <p>{penanda.jabatan || "Kepala Sekolah"}</p>
                <p className="mt-12 font-bold">{penanda.nama || "...................................."}</p>
                {penanda.nip && <p>NIP {penanda.nip}</p>}
              </>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-samar">Klik tulisan pada surat untuk mengubahnya. «Isian» terisi otomatis saat surat disimpan.</p>

      {salah.length > 0 && (
        <p className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-300">
          <span className="flex-1">Isian tidak dikenal: {salah.join(", ")}.</span>
          <button
            type="button"
            onClick={() => {
              const buang = (t: string) => salah.reduce((x, s) => x.replaceAll(s, ""), keTampil(t));
              ubah({ ...naskah, perihal: keKode(buang(naskah.perihal)), tujuan: keKode(buang(naskah.tujuan)), isi: keKode(buang(naskah.isi)) });
            }}
            className="rounded-md bg-amber-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-800"
          >
            Buang
          </button>
        </p>
      )}
      {kosong.length > 0 && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-300">Masih perlu diganti: {kosong.join(", ")}</p>
      )}
    </div>
  );
}

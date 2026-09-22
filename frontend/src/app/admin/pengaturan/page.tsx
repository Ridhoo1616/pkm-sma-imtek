"use client";

import { useState } from "react";
import { api, GalatApi, segarkanHalamanPublik } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { belumTerisi } from "@/lib/format";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel } from "@/komponen/Panel";
import { Memuat, PesanGalat } from "@/komponen/Memuat";
import { Tombol, RingkasanGalat } from "@/komponen/Medan";
import { Lencana } from "@/komponen/Bagian";

/**
 * Pengelompokan pengaturan. Kunci apa pun yang tidak tercantum di sini tetap
 * muncul pada kelompok "Lainnya", sehingga pengaturan baru di basis data
 * tidak pernah tersembunyi dari admin.
 */
const KELOMPOK: { judul: string; keterangan: string; kunci: string[] }[] = [
  {
    judul: "Identitas Sekolah",
    keterangan: "Nama dan data pokok yang tampil di seluruh halaman.",
    kunci: [
      "nama_sekolah",
      "nama_singkat",
      "tagline",
      "npsn",
      "status_sekolah",
      "akreditasi",
      "yayasan",
      "kepala_sekolah",
    ],
  },
  {
    judul: "Naskah Profil",
    keterangan:
      "Isi halaman Profil. Untuk misi, tulis satu poin per baris. Untuk sambutan dan sejarah, pisahkan paragraf dengan baris kosong.",
    kunci: ["visi", "misi", "sambutan_kepsek", "sejarah"],
  },
  {
    judul: "Alamat & Kontak",
    keterangan: "Dipakai pada bar atas, halaman Kontak, dan bagian bawah situs.",
    kunci: [
      "alamat",
      "kelurahan",
      "kecamatan",
      "kota",
      "provinsi",
      "kode_pos",
      "telepon",
      "email",
      "whatsapp",
      "jam_layanan",
      "peta_embed",
    ],
  },
  {
    judul: "Media Sosial",
    keterangan:
      "Tulis alamat lengkap, misalnya https://instagram.com/namaakun. Yang dibiarkan kosong tidak ditampilkan.",
    kunci: ["instagram", "facebook", "youtube", "tiktok"],
  },
  {
    judul: "Pendaftaran (PPDB)",
    keterangan:
      "Mengatur buka-tutup pendaftaran. Status \"tutup\" menutup formulirnya sekaligus, bukan hanya menyembunyikan tombolnya.",
    kunci: [
      "ppdb_status",
      "ppdb_tahun",
      "ppdb_mulai",
      "ppdb_selesai",
      "ppdb_pengumuman",
      "ppdb_kuota",
      "ppdb_biaya",
      "ppdb_syarat",
      "ppdb_alur",
    ],
  },
  {
    judul: "Gambar",
    keterangan: "Nama berkas gambar yang sudah diunggah ke server.",
    kunci: ["logo", "foto_depan"],
  },
];

/** Kunci yang lebih pantas ditulis pada kotak beberapa baris. */
const AREA_TEKS = [
  "visi",
  "misi",
  "sambutan_kepsek",
  "sejarah",
  "alamat",
  "ppdb_syarat",
  "ppdb_alur",
  "peta_embed",
];

const TANGGAL = ["ppdb_mulai", "ppdb_selesai", "ppdb_pengumuman"];

function labelDari(kunci: string): string {
  const khusus: Record<string, string> = {
    npsn: "NPSN",
    ppdb_status: "Status pendaftaran",
    ppdb_tahun: "Tahun ajaran",
    ppdb_mulai: "Tanggal mulai pendaftaran",
    ppdb_selesai: "Tanggal tutup pendaftaran",
    ppdb_pengumuman: "Tanggal pengumuman hasil",
    ppdb_kuota: "Kuota keseluruhan",
    ppdb_biaya: "Biaya pendaftaran",
    ppdb_syarat: "Persyaratan tambahan",
    ppdb_alur: "Alur pendaftaran",
    sambutan_kepsek: "Sambutan kepala sekolah",
    peta_embed: "Sematan peta (kode iframe)",
    nama_singkat: "Nama singkat",
    foto_depan: "Foto halaman depan",
    whatsapp: "Nomor WhatsApp panitia",
  };
  if (khusus[kunci]) return khusus[kunci];
  return kunci
    .split("_")
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(" ");
}

export default function HalamanPengaturan() {
  return (
    <KerangkaAdmin>
      <IsiPengaturan />
    </KerangkaAdmin>
  );
}

function IsiPengaturan() {
  const kabar = useKabar();
  const { data, memuat, galat, muatUlang } = useMuat(() => api.pengaturan());

  // State hanya menyimpan suntingan petugas, bukan salinan seluruh
  // pengaturan. Nilai asalnya dibaca langsung dari data setiap render,
  // sehingga tidak ada penyalinan data ke state di dalam effect.
  const [suntingan, setSuntingan] = useState<Record<string, string>>({});
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);

  if (memuat) return <Memuat />;
  if (galat) return <PesanGalat pesan={galat} ulangi={muatUlang} />;
  if (!data) return null;

  const awal: Record<string, string> = {};
  const keterangan: Record<string, string> = {};
  for (const b of data.data) {
    awal[b.nama_setting] = b.nilai;
    keterangan[b.nama_setting] = b.keterangan;
  }
  const isi: Record<string, string> = { ...awal, ...suntingan };

  const setNilai = (kunci: string, nilai: string) =>
    setSuntingan((s) => ({ ...s, [kunci]: nilai }));

  // Hanya yang benar-benar berubah yang dikirim, agar riwayat perubahan
  // di sisi server tidak dipenuhi penulisan nilai yang sama. Suntingan yang
  // ternyata kembali ke nilai asalnya juga tidak dihitung sebagai perubahan.
  const berubah = Object.keys(suntingan).filter((k) => suntingan[k] !== awal[k]);

  const kunciDikenal = new Set(KELOMPOK.flatMap((k) => k.kunci));
  const lainnya = data.data
    .map((b) => b.nama_setting)
    .filter((k) => !kunciDikenal.has(k));

  const semuaKelompok = [
    ...KELOMPOK,
    ...(lainnya.length > 0
      ? [
          {
            judul: "Lainnya",
            keterangan:
              "Pengaturan yang belum dikelompokkan. Tetap dapat diubah di sini.",
            kunci: lainnya,
          },
        ]
      : []),
  ];

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (berubah.length === 0) return;
    setGalatKolom({});
    setRingkasan([]);
    setMenyimpan(true);

    const kirim: Record<string, string> = {};
    for (const k of berubah) kirim[k] = isi[k];

    try {
      const hasil = await api.simpanPengaturan(kirim);
      kabar.beri(`${hasil.pesan} (${berubah.length} pengaturan diperbarui)`);
      setSuntingan({});
      muatUlang();
      // Pengaturan menentukan hampir seluruh isi situs publik.
      segarkanHalamanPublik();
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalatKolom(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Pengaturan gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={simpan}>
      <KepalaPanel
        judul="Pengaturan Sekolah"
        keterangan="Seluruh isi situs publik berasal dari nilai-nilai di halaman ini, sehingga tampilan situs dapat diubah tanpa menyentuh kode."
        aksi={
          <>
            {berubah.length > 0 && (
              <Lencana warna="border-amber-200 bg-amber-100 text-amber-800">
                {berubah.length} perubahan belum disimpan
              </Lencana>
            )}
            <Tombol
              type="submit"
              sedangJalan={menyimpan}
              disabled={berubah.length === 0}
            >
              {menyimpan ? "Menyimpan..." : "Simpan Perubahan"}
            </Tombol>
          </>
        }
      />

      {ringkasan.length > 0 && (
        <div className="mb-5">
          <RingkasanGalat daftar={ringkasan} />
        </div>
      )}

      <div className="space-y-6">
        {semuaKelompok.map((kel) => {
          const ada = kel.kunci.filter((k) => k in isi);
          if (ada.length === 0) return null;

          return (
            <section key={kel.judul} className="kartu overflow-hidden">
              <div className="border-b border-garis bg-slate-50 px-6 py-4">
                <h2 className="text-base">{kel.judul}</h2>
                <p className="mt-1 text-sm text-samar">{kel.keterangan}</p>
              </div>

              <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                {ada.map((k) => {
                  const areaTeks = AREA_TEKS.includes(k);
                  const g = galatKolom[k];
                  const menunggu = belumTerisi(awal[k]);

                  return (
                    <div
                      key={k}
                      className={areaTeks ? "md:col-span-2" : undefined}
                    >
                      <label
                        htmlFor={`set-${k}`}
                        className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-teks"
                      >
                        {labelDari(k)}
                        {menunggu && (
                          <Lencana warna="border-amber-200 bg-amber-50 text-amber-800">
                            belum terisi
                          </Lencana>
                        )}
                        {isi[k] !== awal[k] && (
                          <Lencana warna="border-biru/20 bg-biru-muda text-biru">
                            diubah
                          </Lencana>
                        )}
                      </label>

                      {k === "ppdb_status" ? (
                        <select
                          id={`set-${k}`}
                          value={isi[k]}
                          onChange={(e) => setNilai(k, e.target.value)}
                          className="w-full rounded-lg border border-garis bg-white px-3.5 py-2.5 text-[15px] focus:border-biru focus:ring-2 focus:ring-biru/20"
                        >
                          <option value="buka">buka (formulir dapat diisi)</option>
                          <option value="tutup">tutup (formulir ditutup)</option>
                        </select>
                      ) : areaTeks ? (
                        <textarea
                          id={`set-${k}`}
                          rows={k === "alamat" ? 3 : 6}
                          value={isi[k]}
                          onChange={(e) => setNilai(k, e.target.value)}
                          className={
                            "w-full resize-y rounded-lg border px-3.5 py-2.5 text-[15px] focus:border-biru focus:ring-2 focus:ring-biru/20 " +
                            (g ? "border-red-400 bg-red-50/40" : "border-garis")
                          }
                        />
                      ) : (
                        <input
                          id={`set-${k}`}
                          type={TANGGAL.includes(k) ? "date" : "text"}
                          value={isi[k]}
                          onChange={(e) => setNilai(k, e.target.value)}
                          className={
                            "w-full rounded-lg border px-3.5 py-2.5 text-[15px] focus:border-biru focus:ring-2 focus:ring-biru/20 " +
                            (g ? "border-red-400 bg-red-50/40" : "border-garis")
                          }
                        />
                      )}

                      {g ? (
                        <p className="mt-1 text-xs font-medium text-red-700">{g}</p>
                      ) : (
                        keterangan[k] && (
                          <p className="mt-1 text-xs text-samar">{keterangan[k]}</p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Tombol simpan kedua di bawah, karena halaman ini panjang. */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-garis pt-6">
        <Tombol type="submit" sedangJalan={menyimpan} disabled={berubah.length === 0}>
          {menyimpan ? "Menyimpan..." : "Simpan Perubahan"}
        </Tombol>
        {berubah.length > 0 && (
          <Tombol jenis="kedua" type="button" onClick={() => setSuntingan({})}>
            Batalkan perubahan
          </Tombol>
        )}
        <p className="text-sm text-samar">
          {berubah.length === 0
            ? "Belum ada perubahan."
            : `${berubah.length} pengaturan akan diperbarui.`}
        </p>
      </div>
    </form>
  );
}

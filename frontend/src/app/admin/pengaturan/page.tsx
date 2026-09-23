"use client";

import { useState } from "react";
import { api, urlUnggahan, GalatApi, segarkanHalamanPublik } from "@/lib/api";
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
    judul: "Akademik",
    keterangan:
      "Mengisi halaman di menu Akademik. Alamat e-learning dan jadwal yang dibiarkan kosong membuat halamannya menjelaskan bahwa layanannya belum tersedia, bukan menampilkan tautan mati.",
    kunci: [
      "tautan_elearning",
      "tautan_jadwal",
      "jadwal_keterangan",
      "perpustakaan_keterangan",
    ],
  },
  {
    judul: "Struktur Organisasi",
    keterangan:
      "Keterangan di bawah bagan struktur organisasi. Bagannya sendiri diunggah pada bagian Gambar di bawah.",
    kunci: ["struktur_keterangan"],
  },
];

/**
 * Pengaturan yang isinya nama berkas gambar, bukan teks.
 *
 * Keempatnya tidak ikut ditampilkan sebagai kotak teks, karena mengetik nama
 * berkas dengan tangan tidak pernah berguna: berkasnya harus diunggah lebih
 * dulu, dan itulah yang dikerjakan bagian Gambar di bawah halaman.
 */
const KUNCI_GAMBAR: { kunci: string; label: string; bantuan: string }[] = [
  {
    kunci: "logo",
    label: "Logo sekolah",
    bantuan: "Sebaiknya PNG berlatar tembus pandang, sisi sekitar 512 piksel.",
  },
  {
    kunci: "foto_depan",
    label: "Foto halaman depan",
    bantuan: "Foto mendatar, perbandingan sisi 16:9, paling tidak 1600 piksel lebarnya.",
  },
  {
    kunci: "foto_kepsek",
    label: "Foto kepala sekolah",
    bantuan:
      "Potret setengah badan, perbandingan sisi 3:4, paling tidak 600x800 piksel. Tampil pada bagian sambutan di halaman Profil Sekolah.",
  },
  {
    kunci: "struktur_organisasi",
    label: "Bagan struktur organisasi",
    bantuan:
      "Gambar mendatar, perbandingan sisi 4:3, paling tidak 1200 piksel lebarnya.",
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
  "struktur_keterangan",
  "jadwal_keterangan",
  "perpustakaan_keterangan",
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
    foto_kepsek: "Foto kepala sekolah",
    struktur_organisasi: "Bagan struktur organisasi",
    struktur_keterangan: "Keterangan struktur organisasi",
    tautan_elearning: "Alamat e-learning / LMS",
    tautan_jadwal: "Alamat atau berkas jadwal pelajaran",
    jadwal_keterangan: "Keterangan jadwal pelajaran",
    perpustakaan_keterangan: "Keterangan perpustakaan",
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

  // Kunci gambar ditangani bagian unggahan, jadi tidak boleh ikut muncul
  // sebagai kotak teks, termasuk lewat kelompok "Lainnya".
  const kunciGambar = new Set(KUNCI_GAMBAR.map((g) => g.kunci));
  const kunciDikenal = new Set([
    ...KELOMPOK.flatMap((k) => k.kunci),
    ...kunciGambar,
  ]);
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

      <BagianGambar isi={isi} muatUlang={muatUlang} />

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

/**
 * Unggah dan hapus gambar pengaturan.
 *
 * Berbeda dari kotak teks di atasnya, bagian ini tidak menunggu tombol
 * "Simpan Perubahan": unggahan berjalan sendiri lewat alamat API terpisah,
 * dan nama berkasnya langsung dicatat ke pengaturan oleh server. Karena itu
 * seluruh tombol di sini bertipe button, supaya tidak ikut mengirim formulir
 * pengaturan yang membungkusnya.
 */
function BagianGambar({
  isi,
  muatUlang,
}: {
  isi: Record<string, string>;
  muatUlang: () => void;
}) {
  const kabar = useKabar();
  const [pilihan, setPilihan] = useState<Record<string, File | null>>({});
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<Record<string, string>>({});

  async function unggah(kunci: string) {
    const berkas = pilihan[kunci];
    if (!berkas) return;
    setSibuk(kunci);
    setGalat((g) => ({ ...g, [kunci]: "" }));
    try {
      const hasil = await api.unggahGambarPengaturan(kunci, berkas);
      kabar.beri(hasil.pesan);
      setPilihan((p) => ({ ...p, [kunci]: null }));
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setGalat((g) => ({
        ...g,
        [kunci]:
          e instanceof GalatApi
            ? e.kolom.gambar || e.message
            : "Gambar gagal diunggah.",
      }));
    } finally {
      setSibuk(null);
    }
  }

  async function hapus(kunci: string) {
    setSibuk(kunci);
    setGalat((g) => ({ ...g, [kunci]: "" }));
    try {
      const hasil = await api.hapusGambarPengaturan(kunci);
      kabar.beri(hasil.pesan);
      muatUlang();
      segarkanHalamanPublik();
    } catch (e) {
      setGalat((g) => ({
        ...g,
        [kunci]:
          e instanceof GalatApi ? e.message : "Gambar gagal dihapus.",
      }));
    } finally {
      setSibuk(null);
    }
  }

  return (
    <section className="kartu mt-6 overflow-hidden">
      <div className="border-b border-garis bg-slate-50 px-6 py-4">
        <h2 className="text-base">Gambar</h2>
        <p className="mt-1 text-sm text-samar">
          Diunggah langsung dari sini, tanpa menekan tombol simpan. JPG atau
          PNG, maksimal 2 MB. Gambar lama otomatis dibuang setelah penggantinya
          tersimpan.
        </p>
      </div>

      <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
        {KUNCI_GAMBAR.filter((g) => g.kunci in isi).map((g) => {
          const nama = isi[g.kunci];
          const sedang = sibuk === g.kunci;
          return (
            <div key={g.kunci} className="rounded-lg border border-garis p-5">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-teks">
                {g.label}
                {!nama && (
                  <Lencana warna="border-amber-200 bg-amber-50 text-amber-800">
                    belum ada
                  </Lencana>
                )}
              </p>

              {nama ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlUnggahan("profil", nama)}
                  alt={g.label}
                  className="mt-3 max-h-40 w-full rounded border border-garis bg-white object-contain"
                />
              ) : (
                <div className="mt-3 grid h-40 w-full place-items-center rounded border border-dashed border-garis bg-slate-50 text-xs text-samar">
                  Belum ada gambar
                </div>
              )}

              <p className="mt-2 text-xs leading-relaxed text-samar">{g.bantuan}</p>

              <input
                id={`gambar-${g.kunci}`}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) =>
                  setPilihan((p) => ({
                    ...p,
                    [g.kunci]: e.target.files?.[0] ?? null,
                  }))
                }
                className="mt-3 w-full rounded-lg border border-garis px-3.5 py-2 text-sm text-samar file:mr-3 file:rounded-md file:border-0 file:bg-biru-muda file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-biru hover:file:bg-biru/10"
              />

              {galat[g.kunci] && (
                <p className="mt-2 text-xs font-medium text-red-700">
                  {galat[g.kunci]}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Tombol
                  type="button"
                  sedangJalan={sedang}
                  disabled={!pilihan[g.kunci] || sedang}
                  onClick={() => unggah(g.kunci)}
                >
                  {sedang ? "Mengunggah..." : "Unggah"}
                </Tombol>
                {nama && (
                  <Tombol
                    jenis="kedua"
                    type="button"
                    disabled={sedang}
                    onClick={() => hapus(g.kunci)}
                  >
                    Hapus
                  </Tombol>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, urlUnggahan, ambilToken, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import {
  jenisKelaminPanjang,
  nilai as formatNilai,
  tanggalJam,
  tanggalPanjang,
  warnaStatus,
} from "@/lib/format";
import { useSesi } from "@/komponen/Sesi";
import KerangkaAdmin from "@/komponen/KerangkaAdmin";
import { KepalaPanel, Konfirmasi } from "@/komponen/Panel";
import { Memuat, PesanGalat, PesanBerhasil } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { Pilihan, AreaTeks, Tombol } from "@/komponen/Medan";
import type { Pendaftar } from "@/lib/tipe";

export default function HalamanDetailPendaftar() {
  return (
    <KerangkaAdmin>
      <IsiDetail />
    </KerangkaAdmin>
  );
}

/** Kelompok isian yang ditampilkan sebagai daftar istilah. */
function Blok({
  judul,
  butir,
}: {
  judul: string;
  butir: { k: string; v: string }[];
}) {
  const terisi = butir.filter((b) => b.v && b.v !== "-");
  if (terisi.length === 0) return null;

  return (
    <section className="kartu overflow-hidden">
      <h2 className="border-b border-garis bg-slate-50 px-6 py-3.5 text-base">
        {judul}
      </h2>
      <dl className="divide-y divide-garis text-sm">
        {terisi.map((b) => (
          <div
            key={b.k}
            className="flex flex-col gap-0.5 px-6 py-3 sm:flex-row sm:gap-4"
          >
            <dt className="text-samar sm:w-56 sm:shrink-0">{b.k}</dt>
            <dd className="min-w-0 break-words text-teks">{b.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Dokumen pendaftar dilindungi token, jadi tidak bisa dipasang langsung
 * sebagai src gambar. Berkasnya diambil lewat fetch berotorisasi lalu
 * ditampilkan dari alamat objek sementara di peramban.
 */
function TautanBerkas({
  label,
  subfolder,
  nama,
}: {
  label: string;
  subfolder: string;
  nama: string;
}) {
  const [url, setUrl] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    // Alamat objek dibebaskan saat komponen dilepas agar tidak menumpuk.
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function buka() {
    if (url) {
      window.open(url, "_blank", "noopener");
      return;
    }
    setMemuat(true);
    setGalat("");
    try {
      const t = ambilToken();
      const jawaban = await fetch(urlUnggahan(subfolder, nama), {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!jawaban.ok) throw new Error();
      const alamat = URL.createObjectURL(await jawaban.blob());
      setUrl(alamat);
      window.open(alamat, "_blank", "noopener");
    } catch {
      setGalat("Berkas tidak dapat dibuka.");
    } finally {
      setMemuat(false);
    }
  }

  if (!nama) {
    return (
      <div className="rounded-lg border border-dashed border-garis px-4 py-3">
        <p className="text-sm font-semibold text-samar">{label}</p>
        <p className="text-xs text-samar">Tidak diunggah</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-garis px-4 py-3">
      <p className="text-sm font-semibold text-teks">{label}</p>
      <button
        type="button"
        onClick={buka}
        disabled={memuat}
        className="mt-1 text-xs font-semibold text-biru hover:underline disabled:opacity-60"
      >
        {memuat ? "Membuka..." : "Buka berkas →"}
      </button>
      {galat && <p className="mt-1 text-xs text-red-700">{galat}</p>}
    </div>
  );
}

function IsiDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { pengguna } = useSesi();

  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.detailPendaftar(id),
    [id],
  );

  // Isian verifikasi menyimpan suntingan petugas saja, ditandai dengan
  // versi data yang sedang disunting. Selama penandanya belum cocok,
  // yang ditampilkan adalah nilai dari server — sehingga tidak perlu
  // menyalin data ke state di dalam effect.
  const [suntingan, setSuntingan] = useState<{
    kunci: string;
    status: string;
    catatan: string;
  } | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanSimpan, setPesanSimpan] = useState("");
  const [galatSimpan, setGalatSimpan] = useState("");
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [menghapus, setMenghapus] = useState(false);

  if (memuat) return <Memuat />;
  if (galat) return <PesanGalat pesan={galat} ulangi={muatUlang} />;
  if (!data) return null;

  const p: Pendaftar = data.data;

  const kunci = `${p.id}-${p.diubah}`;
  const selaras = suntingan?.kunci === kunci;
  const status = selaras ? suntingan.status : p.status;
  const catatan = selaras ? suntingan.catatan : p.catatan_admin;

  const setStatus = (v: string) =>
    setSuntingan({ kunci, status: v, catatan });
  const setCatatan = (v: string) =>
    setSuntingan({ kunci, status, catatan: v });

  async function simpan() {
    setPesanSimpan("");
    setGalatSimpan("");
    setMenyimpan(true);
    try {
      const hasil = await api.ubahStatus(id, {
        status,
        catatan_admin: catatan,
      });
      setPesanSimpan(hasil.pesan);
      muatUlang();
    } catch (e) {
      setGalatSimpan(
        e instanceof GalatApi ? e.message : "Status gagal disimpan.",
      );
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    setMenghapus(true);
    try {
      await api.hapusPendaftar(id);
      router.replace("/admin/pendaftar");
    } catch (e) {
      setGalatSimpan(e instanceof GalatApi ? e.message : "Data gagal dihapus.");
      setKonfirmasiHapus(false);
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <KepalaPanel
        judul={p.nama_lengkap}
        keterangan={`${p.no_registrasi} · Tahun Ajaran ${p.tahun_ajaran} · Jalur ${p.jalur}`}
        aksi={
          <>
            <Lencana warna={warnaStatus(p.status)}>{p.status}</Lencana>
            <Link
              href="/admin/pendaftar"
              className="rounded-lg border border-garis bg-white px-4 py-2 text-sm font-semibold text-teks hover:border-biru hover:text-biru"
            >
              ← Daftar pendaftar
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Blok
            judul="Data Pribadi"
            butir={[
              { k: "Nama lengkap", v: p.nama_lengkap },
              { k: "Jenis kelamin", v: jenisKelaminPanjang(p.jenis_kelamin) },
              { k: "NISN", v: p.nisn },
              { k: "NIK", v: p.nik },
              { k: "Tempat lahir", v: p.tempat_lahir },
              { k: "Tanggal lahir", v: tanggalPanjang(p.tanggal_lahir) },
              { k: "Agama", v: p.agama },
              { k: "Anak ke-", v: p.anak_ke },
              { k: "Jumlah saudara", v: p.jumlah_saudara },
            ]}
          />

          <Blok
            judul="Alamat & Kontak"
            butir={[
              { k: "Alamat", v: p.alamat },
              { k: "Kelurahan/Desa", v: p.kelurahan },
              { k: "Kecamatan", v: p.kecamatan },
              { k: "Kabupaten/Kota", v: p.kota },
              { k: "Provinsi", v: p.provinsi },
              { k: "Kode pos", v: p.kode_pos },
              { k: "No. HP/WhatsApp", v: p.no_hp },
              { k: "Email", v: p.email },
            ]}
          />

          <Blok
            judul="Sekolah Asal"
            butir={[
              { k: "Nama sekolah", v: p.asal_sekolah },
              { k: "NPSN", v: p.npsn_sekolah },
              { k: "Alamat sekolah", v: p.alamat_sekolah },
              { k: "Tahun lulus", v: p.tahun_lulus },
              { k: "Nilai rata-rata rapor", v: formatNilai(p.nilai_rata2) },
            ]}
          />

          <Blok
            judul="Orang Tua / Wali"
            butir={[
              { k: "Nama ayah", v: p.nama_ayah },
              { k: "Pekerjaan ayah", v: p.pekerjaan_ayah },
              { k: "Pendidikan ayah", v: p.pendidikan_ayah },
              { k: "Nama ibu", v: p.nama_ibu },
              { k: "Pekerjaan ibu", v: p.pekerjaan_ibu },
              { k: "Pendidikan ibu", v: p.pendidikan_ibu },
              { k: "Penghasilan orang tua", v: p.penghasilan },
              { k: "No. HP orang tua", v: p.no_hp_ortu },
              { k: "Nama wali", v: p.nama_wali },
            ]}
          />

          <Blok
            judul="Sumber Informasi & Jejak Pendaftaran"
            butir={[
              {
                k: "Mengetahui sekolah dari",
                v: p.sumber_informasi
                  ? (data.label_sumber[p.sumber_informasi] ?? p.sumber_informasi)
                  : "",
              },
              { k: "Keterangan tambahan", v: p.catatan_sumber },
              { k: "Peminatan dipilih", v: p.nama_jurusan },
              { k: "Waktu mendaftar", v: tanggalJam(p.dibuat) },
              { k: "Terakhir diubah", v: tanggalJam(p.diubah) },
              { k: "Alamat IP pendaftar", v: p.ip_pendaftar },
            ]}
          />
        </div>

        <div className="space-y-6">
          {/* Verifikasi */}
          <section className="kartu overflow-hidden">
            <h2 className="border-b border-garis bg-slate-50 px-6 py-3.5 text-base">
              Verifikasi Berkas
            </h2>
            <div className="space-y-5 px-6 py-5">
              {pesanSimpan && <PesanBerhasil pesan={pesanSimpan} />}
              {galatSimpan && <PesanGalat pesan={galatSimpan} />}

              <Pilihan
                nama="status"
                label="Status pendaftaran"
                wajib
                nilai={status}
                ubah={setStatus}
                opsi={data.pilihan_status}
                kosong="-- Pilih status --"
              />

              <AreaTeks
                nama="catatan_admin"
                label="Catatan panitia"
                baris={5}
                maks={2000}
                nilai={catatan}
                ubah={setCatatan}
                bantuan="Catatan ini terbaca oleh pendaftar pada halaman Cek Status, jadi tulislah dengan bahasa yang jelas dan sopan."
              />

              <Tombol onClick={simpan} sedangJalan={menyimpan} penuh>
                {menyimpan ? "Menyimpan..." : "Simpan Verifikasi"}
              </Tombol>

              {p.nama_verifikator && (
                <p className="border-t border-garis pt-4 text-xs text-samar">
                  Terakhir diverifikasi oleh{" "}
                  <strong className="text-biru-tua">{p.nama_verifikator}</strong>.
                </p>
              )}
            </div>
          </section>

          {/* Dokumen */}
          <section className="kartu overflow-hidden">
            <h2 className="border-b border-garis bg-slate-50 px-6 py-3.5 text-base">
              Dokumen Terunggah
            </h2>
            <div className="space-y-3 px-6 py-5">
              <p className="text-xs leading-relaxed text-samar">
                Dokumen ini memuat data pribadi. Berkas hanya dapat dibuka
                selama Anda masuk sebagai petugas, dan tidak boleh dibagikan
                ke luar panitia.
              </p>
              <TautanBerkas label="Foto 3x4" subfolder="pendaftar" nama={p.file_foto} />
              <TautanBerkas
                label="Ijazah / SKL"
                subfolder="pendaftar"
                nama={p.file_ijazah}
              />
              <TautanBerkas
                label="Kartu Keluarga"
                subfolder="pendaftar"
                nama={p.file_kk}
              />
              <TautanBerkas
                label="Akta Kelahiran"
                subfolder="pendaftar"
                nama={p.file_akta}
              />
              <TautanBerkas label="Rapor" subfolder="pendaftar" nama={p.file_raport} />
              <TautanBerkas
                label="Sertifikat Prestasi"
                subfolder="pendaftar"
                nama={p.file_prestasi}
              />
            </div>
          </section>

          {/* Hapus — hanya admin penuh */}
          {pengguna?.role === "admin" && (
            <section className="rounded-kartu border border-red-200 bg-red-50 p-6">
              <h2 className="text-base text-red-900">Hapus Data Pendaftar</h2>
              <p className="mt-2 text-sm leading-relaxed text-red-800">
                Menghapus data ini juga menghapus seluruh dokumen pribadi yang
                diunggah dari server. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="mt-4">
                <Tombol jenis="bahaya" onClick={() => setKonfirmasiHapus(true)}>
                  Hapus Pendaftar
                </Tombol>
              </div>
            </section>
          )}
        </div>
      </div>

      <Konfirmasi
        terbuka={konfirmasiHapus}
        judul="Hapus data pendaftar?"
        labelYa="Ya, hapus permanen"
        sedangJalan={menghapus}
        tutup={() => setKonfirmasiHapus(false)}
        lanjut={hapus}
        pesan={
          <div className="space-y-3">
            <p>
              Data <strong>{p.nama_lengkap}</strong> ({p.no_registrasi}) akan
              dihapus dari basis data.
            </p>
            <p>
              Seluruh dokumen yang diunggah, yaitu foto, ijazah, Kartu Keluarga,
              akta kelahiran, rapor, dan sertifikat, juga akan dihapus dari
              server dan tidak dapat dipulihkan.
            </p>
            <p className="font-semibold">
              Bila hanya ingin menolak pendaftaran, ubah statusnya menjadi
              &quot;Ditolak&quot; saja agar riwayatnya tetap ada.
            </p>
          </div>
        }
      />
    </>
  );
}

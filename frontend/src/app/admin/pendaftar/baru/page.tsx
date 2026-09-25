"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { KepalaPanel } from "@/komponen/Panel";
import { PesanGalat, Kerangka } from "@/komponen/Memuat";
import {
  Teks,
  AreaTeks,
  Pilihan,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import { PilihSekolah } from "@/komponen/PilihSekolah";
import { AGAMA, JENIS_KELAMIN, PENDIDIKAN, PENGHASILAN } from "@/lib/pilihan";

/**
 * Menambah pendaftar dari panel.
 *
 * Gunanya satu keadaan yang sangat lazim dan sebelumnya tidak tertangani:
 * ada calon yang datang langsung ke sekolah SESUDAH pendaftaran ditutup, lalu
 * kepala sekolah memutuskan menerimanya. Formulir publik ditolak backend
 * ketika PPDB tutup, jadi satu-satunya jalan adalah membuka kembali PPDB
 * untuk semua orang, memasukkan satu data, lalu menutupnya lagi. Selama
 * jendela itu terbuka, siapa pun di internet dapat mendaftar.
 *
 * Halaman ini TETAP bekerja meski PPDB sudah ditutup.
 *
 * Bentuknya satu halaman panjang, bukan lima langkah seperti formulir
 * publik. Yang mengisi petugas yang sudah hafal isinya dan sedang menghadapi
 * orang di meja pendaftaran; memecahnya menjadi lima langkah hanya menambah
 * ketukan.
 *
 * TIDAK ADA UNGGAHAN BERKAS di sini, dan itu disengaja: dokumennya diterima
 * petugas dalam bentuk kertas. Akibatnya diterima dengan sadar dan
 * dikatakan apa adanya di halaman ini.
 */

const KOSONG = {
  jalur: "Reguler",
  jurusan_id: "",
  nama_lengkap: "",
  jenis_kelamin: "",
  nisn: "",
  nik: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  agama: "",
  anak_ke: "",
  jumlah_saudara: "",
  alamat: "",
  kelurahan: "",
  kecamatan: "",
  kota: "",
  provinsi: "",
  kode_pos: "",
  no_hp: "",
  email: "",
  asal_sekolah: "",
  npsn_sekolah: "",
  alamat_sekolah: "",
  tahun_lulus: "",
  nilai_rata2: "",
  nama_ayah: "",
  pekerjaan_ayah: "",
  pendidikan_ayah: "",
  nama_ibu: "",
  pekerjaan_ibu: "",
  pendidikan_ibu: "",
  penghasilan: "",
  no_hp_ortu: "",
  nama_wali: "",
  sumber_informasi: "",
  catatan_sumber: "",
};

export default function HalamanTambahPendaftar() {
  const router = useRouter();
  const kabar = useKabar();
  const {
    data: profil,
    memuat,
    galat: galatProfil,
  } = useMuat(() => api.profil());
  const { data: jurusan } = useMuat(() => api.jurusanAdmin());

  const [isi, setIsi] = useState(KOSONG);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);

  const ubah = (k: keyof typeof KOSONG) => (v: string) => {
    setIsi((s) => ({ ...s, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: "" } : g));
  };

  const jurusanAktif = (jurusan?.data ?? []).filter((j) => j.aktif);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setRingkasan([]);
    setMenyimpan(true);
    try {
      const hasil = await api.tambahPendaftar(isi);
      kabar.beri(hasil.pesan);
      router.push("/admin/pendaftar");
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalat(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setRingkasan(["Pendaftar gagal disimpan."]);
      }
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat)
    return (
      <>
        <KepalaPanel judul="Tambah Pendaftar" keterangan="Memuat pilihan..." />
        <div className="kartu space-y-4 p-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Kerangka key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </>
    );
  if (galatProfil) return <PesanGalat pesan={galatProfil} />;

  return (
    <>
      <KepalaPanel
        judul="Tambah Pendaftar"
        keterangan="Memasukkan pendaftar yang mendaftar langsung di sekolah. Tetap dapat dipakai meski pendaftaran online sudah ditutup."
        aksi={
          <Link
            href="/admin/pendaftar"
            className="rounded-lg border border-garis px-3.5 py-2 text-sm font-semibold text-teks hover:border-biru hover:text-biru"
          >
            ← Kembali
          </Link>
        }
      />

      {ringkasan.length > 0 && (
        <div className="mb-6">
          <RingkasanGalat daftar={ringkasan} />
        </div>
      )}

      <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
        <strong>Dokumennya tidak diunggah lewat halaman ini.</strong> Pendaftar
        yang dimasukkan dari sini tidak punya foto, ijazah, kartu keluarga,
        akta, maupun rapor di dalam sistem, jadi verifikasinya harus dicocokkan
        dari berkas kertas yang Anda terima. Nama Anda dicatat sebagai yang
        memasukkan data ini.
        {profil && !profil.ppdb.dibuka && (
          <>
            {" "}
            Pendaftaran online sedang <strong>ditutup</strong>, dan halaman ini
            tetap bekerja.
          </>
        )}
      </p>

      <form onSubmit={simpan} className="space-y-6">
        <section className="kartu space-y-5 p-6">
          <h2 className="text-base">Jalur & Data Diri</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="jalur"
              label="Jalur pendaftaran"
              wajib
              nilai={isi.jalur}
              ubah={ubah("jalur")}
              galat={galat.jalur}
              opsi={profil?.ppdb.jalur ?? []}
              kosong="-- Pilih jalur --"
            />
            {jurusanAktif.length > 0 && (
              <Pilihan
                nama="jurusan_id"
                label="Peminatan"
                wajib
                nilai={isi.jurusan_id}
                ubah={ubah("jurusan_id")}
                galat={galat.jurusan_id}
                opsi={jurusanAktif.map((j) => ({
                  nilai: String(j.id),
                  label: `${j.nama} (kuota ${j.kuota})`,
                }))}
                kosong="-- Pilih peminatan --"
              />
            )}
            <Teks
              nama="nama_lengkap"
              label="Nama lengkap"
              wajib
              maks={100}
              nilai={isi.nama_lengkap}
              ubah={ubah("nama_lengkap")}
              galat={galat.nama_lengkap}
              bantuan="Sesuai ijazah atau akta. Tanpa angka."
            />
            <Pilihan
              nama="jenis_kelamin"
              label="Jenis kelamin"
              wajib
              nilai={isi.jenis_kelamin}
              ubah={ubah("jenis_kelamin")}
              galat={galat.jenis_kelamin}
              opsi={JENIS_KELAMIN}
            />
            <Teks
              nama="nisn"
              label="NISN"
              maks={10}
              nilai={isi.nisn}
              ubah={ubah("nisn")}
              galat={galat.nisn}
              bantuan="10 angka, tiga angka pertamanya sama dengan tiga angka terakhir tahun lahir."
            />
            <Teks
              nama="nik"
              label="NIK"
              wajib
              maks={16}
              nilai={isi.nik}
              ubah={ubah("nik")}
              galat={galat.nik}
              bantuan="16 angka, dari kartu keluarga."
            />
            <Teks
              nama="tempat_lahir"
              label="Tempat lahir"
              wajib
              maks={80}
              nilai={isi.tempat_lahir}
              ubah={ubah("tempat_lahir")}
              galat={galat.tempat_lahir}
            />
            <Teks
              nama="tanggal_lahir"
              label="Tanggal lahir"
              tipe="date"
              wajib
              nilai={isi.tanggal_lahir}
              ubah={ubah("tanggal_lahir")}
              galat={galat.tanggal_lahir}
            />
            <Pilihan
              nama="agama"
              label="Agama"
              wajib
              nilai={isi.agama}
              ubah={ubah("agama")}
              galat={galat.agama}
              opsi={AGAMA}
            />
            <Teks
              nama="anak_ke"
              label="Anak ke-"
              tipe="number"
              nilai={isi.anak_ke}
              ubah={ubah("anak_ke")}
              galat={galat.anak_ke}
            />
            <Teks
              nama="jumlah_saudara"
              label="Jumlah saudara"
              tipe="number"
              nilai={isi.jumlah_saudara}
              ubah={ubah("jumlah_saudara")}
              galat={galat.jumlah_saudara}
            />
          </div>
        </section>

        <section className="kartu space-y-5 p-6">
          <h2 className="text-base">Alamat & Kontak</h2>
          <AreaTeks
            nama="alamat"
            label="Alamat tempat tinggal"
            wajib
            baris={2}
            maks={1000}
            nilai={isi.alamat}
            ubah={ubah("alamat")}
            galat={galat.alamat}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <Teks
              nama="kelurahan"
              label="Kelurahan/Desa"
              wajib
              maks={80}
              nilai={isi.kelurahan}
              ubah={ubah("kelurahan")}
              galat={galat.kelurahan}
            />
            <Teks
              nama="kecamatan"
              label="Kecamatan"
              wajib
              maks={80}
              nilai={isi.kecamatan}
              ubah={ubah("kecamatan")}
              galat={galat.kecamatan}
            />
            <Teks
              nama="kota"
              label="Kota/Kabupaten"
              wajib
              maks={80}
              nilai={isi.kota}
              ubah={ubah("kota")}
              galat={galat.kota}
            />
            <Teks
              nama="provinsi"
              label="Provinsi"
              wajib
              maks={80}
              nilai={isi.provinsi}
              ubah={ubah("provinsi")}
              galat={galat.provinsi}
            />
            <Teks
              nama="kode_pos"
              label="Kode pos"
              wajib
              maks={5}
              nilai={isi.kode_pos}
              ubah={ubah("kode_pos")}
              galat={galat.kode_pos}
            />
            <Teks
              nama="no_hp"
              label="No. HP / WhatsApp"
              tipe="tel"
              wajib
              maks={25}
              nilai={isi.no_hp}
              ubah={ubah("no_hp")}
              galat={galat.no_hp}
            />
            <Teks
              nama="email"
              label="Email"
              tipe="email"
              maks={120}
              nilai={isi.email}
              ubah={ubah("email")}
              galat={galat.email}
              bantuan="Dipakai mengirim notifikasi; boleh dikosongkan."
            />
          </div>
        </section>

        <section className="kartu space-y-5 p-6">
          <h2 className="text-base">Sekolah Asal</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <PilihSekolah
              nama={isi.asal_sekolah}
              npsn={isi.npsn_sekolah}
              ubahNama={ubah("asal_sekolah")}
              ubahNpsn={ubah("npsn_sekolah")}
              galatNama={galat.asal_sekolah}
              galatNpsn={galat.npsn_sekolah}
              tidakTerdaftar={false}
              // Petugas memasukkan data dengan ijazahnya di tangan, jadi
              // sekolah di luar daftar rujukan tidak ditolak dan pernyataan
              // "tidak ada di daftar" tidak perlu dicentang.
              ubahTidakTerdaftar={() => {}}
            />
            <Teks
              nama="tahun_lulus"
              label="Tahun lulus"
              tipe="number"
              wajib
              nilai={isi.tahun_lulus}
              ubah={ubah("tahun_lulus")}
              galat={galat.tahun_lulus}
            />
            <Teks
              nama="nilai_rata2"
              label="Nilai rata-rata rapor"
              nilai={isi.nilai_rata2}
              ubah={ubah("nilai_rata2")}
              galat={galat.nilai_rata2}
              contoh="85.50"
            />
          </div>
          <Teks
            nama="alamat_sekolah"
            label="Alamat sekolah asal"
            wajib
            maks={200}
            nilai={isi.alamat_sekolah}
            ubah={ubah("alamat_sekolah")}
            galat={galat.alamat_sekolah}
          />
        </section>

        <section className="kartu space-y-5 p-6">
          <h2 className="text-base">Orang Tua / Wali</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <Teks
              nama="nama_ayah"
              label="Nama ayah"
              wajib
              maks={120}
              nilai={isi.nama_ayah}
              ubah={ubah("nama_ayah")}
              galat={galat.nama_ayah}
            />
            <Teks
              nama="pekerjaan_ayah"
              label="Pekerjaan ayah"
              maks={80}
              nilai={isi.pekerjaan_ayah}
              ubah={ubah("pekerjaan_ayah")}
              galat={galat.pekerjaan_ayah}
            />
            <Pilihan
              nama="pendidikan_ayah"
              label="Pendidikan ayah"
              nilai={isi.pendidikan_ayah}
              ubah={ubah("pendidikan_ayah")}
              galat={galat.pendidikan_ayah}
              opsi={PENDIDIKAN}
            />
            <Teks
              nama="nama_ibu"
              label="Nama ibu"
              wajib
              maks={120}
              nilai={isi.nama_ibu}
              ubah={ubah("nama_ibu")}
              galat={galat.nama_ibu}
            />
            <Teks
              nama="pekerjaan_ibu"
              label="Pekerjaan ibu"
              maks={80}
              nilai={isi.pekerjaan_ibu}
              ubah={ubah("pekerjaan_ibu")}
              galat={galat.pekerjaan_ibu}
            />
            <Pilihan
              nama="pendidikan_ibu"
              label="Pendidikan ibu"
              nilai={isi.pendidikan_ibu}
              ubah={ubah("pendidikan_ibu")}
              galat={galat.pendidikan_ibu}
              opsi={PENDIDIKAN}
            />
            <Pilihan
              nama="penghasilan"
              label="Penghasilan orang tua"
              nilai={isi.penghasilan}
              ubah={ubah("penghasilan")}
              galat={galat.penghasilan}
              opsi={PENGHASILAN}
            />
            <Teks
              nama="no_hp_ortu"
              label="No. HP orang tua"
              tipe="tel"
              maks={25}
              nilai={isi.no_hp_ortu}
              ubah={ubah("no_hp_ortu")}
              galat={galat.no_hp_ortu}
              bantuan="Dipakai lebih dulu untuk notifikasi WhatsApp."
            />
            <Teks
              nama="nama_wali"
              label="Nama wali"
              maks={120}
              nilai={isi.nama_wali}
              ubah={ubah("nama_wali")}
              galat={galat.nama_wali}
              bantuan="Bila tidak tinggal bersama orang tua."
            />
          </div>
        </section>

        <section className="kartu space-y-5 p-6">
          <h2 className="text-base">Sumber Informasi</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="sumber_informasi"
              label="Tahu PPDB dari mana"
              nilai={isi.sumber_informasi}
              ubah={ubah("sumber_informasi")}
              galat={galat.sumber_informasi}
              opsi={profil?.ppdb.sumber ?? []}
            />
            <Teks
              nama="catatan_sumber"
              label="Keterangan tambahan"
              maks={200}
              nilai={isi.catatan_sumber}
              ubah={ubah("catatan_sumber")}
              galat={galat.catatan_sumber}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/admin/pendaftar"
            className="rounded-lg border border-garis px-5 py-2.5 text-sm font-semibold text-teks hover:border-biru hover:text-biru"
          >
            Batal
          </Link>
          <Tombol type="submit" sedangJalan={menyimpan}>
            Simpan Pendaftar
          </Tombol>
        </div>
      </form>
    </>
  );
}

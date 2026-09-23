"use client";

import { useState } from "react";
import Link from "next/link";
import { api, unduhBukti, unduhKartu, GalatApi } from "@/lib/api";
import { bukaBlob } from "@/lib/berkas";
import { Teks, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { PesanGalat } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import { tanggalJam, tanggalPanjang, warnaStatus } from "@/lib/format";
import type { StatusPendaftaran } from "@/lib/tipe";
import { MunculLangsung } from "@/komponen/Gerak";

/** Keterangan tiap status, supaya pendaftar paham artinya tanpa bertanya. */
const ARTI_STATUS: Record<string, string> = {
  "Menunggu Verifikasi":
    "Berkas Anda sudah kami terima dan sedang menunggu pemeriksaan panitia. Belum ada tindakan yang perlu Anda lakukan.",
  Terverifikasi:
    "Berkas Anda sudah diperiksa dan dinyatakan lengkap. Menunggu penetapan hasil seleksi.",
  Diterima:
    "Selamat, Anda dinyatakan diterima. Lanjutkan dengan daftar ulang sesuai ketentuan sekolah.",
  Cadangan:
    "Anda masuk daftar cadangan. Bila ada peserta diterima yang tidak melakukan daftar ulang, panitia akan menghubungi Anda.",
  Ditolak:
    "Pendaftaran Anda belum dapat diterima. Keterangan dari panitia dapat dibaca di bawah, bila ada.",
};

export default function CekStatus({ nomorAwal = "" }: { nomorAwal?: string }) {
  const [no, setNo] = useState(nomorAwal);
  const [tgl, setTgl] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [mencari, setMencari] = useState(false);
  const [hasil, setHasil] = useState<StatusPendaftaran | null>(null);
  const [mengunduh, setMengunduh] = useState(false);
  const [mengunduhKartu, setMengunduhKartu] = useState(false);
  const [galatBukti, setGalatBukti] = useState("");

  async function cari(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setRingkasan([]);
    setHasil(null);
    setMencari(true);
    try {
      setHasil(
        await api.cekStatus({ no_registrasi: no.trim(), tanggal_lahir: tgl }),
      );
    } catch (e) {
      if (e instanceof GalatApi) {
        setGalat(e.kolom);
        setRingkasan(e.daftar.length ? e.daftar : [e.message]);
      } else {
        setRingkasan(["Terjadi gangguan yang tidak dikenali. Silakan coba lagi."]);
      }
    } finally {
      setMencari(false);
    }
  }

  async function ambilBukti() {
    if (!hasil) return;
    setGalatBukti("");
    setMengunduh(true);
    try {
      const { nama, blob } = await unduhBukti({
        no_registrasi: hasil.no_registrasi,
        tanggal_lahir: tgl,
      });
      bukaBlob(nama, blob);
    } catch (e) {
      setGalatBukti(
        e instanceof GalatApi ? e.message : "Bukti pendaftaran gagal dibuat.",
      );
    } finally {
      setMengunduh(false);
    }
  }

  async function ambilKartu() {
    if (!hasil) return;
    setGalatBukti("");
    setMengunduhKartu(true);
    try {
      const { nama, blob } = await unduhKartu({
        no_registrasi: hasil.no_registrasi,
        tanggal_lahir: tgl,
      });
      bukaBlob(nama, blob);
    } catch (e) {
      setGalatBukti(
        e instanceof GalatApi ? e.message : "Kartu peserta gagal dibuat.",
      );
    } finally {
      setMengunduhKartu(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={cari} className="kartu p-6 md:p-7" noValidate>
        <div className="space-y-5">
          <RingkasanGalat daftar={ringkasan} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Teks
              nama="no_registrasi"
              label="Nomor registrasi"
              wajib
              nilai={no}
              ubah={setNo}
              galat={galat.no_registrasi}
              contoh="PPDB-2728-0001"
              bantuan="Nomor yang Anda terima setelah mengirim formulir."
            />
            <Teks
              nama="tanggal_lahir"
              label="Tanggal lahir"
              tipe="date"
              wajib
              nilai={tgl}
              ubah={setTgl}
              galat={galat.tanggal_lahir}
              bantuan="Dipakai sebagai pengaman agar data Anda tidak terbuka oleh orang lain."
            />
          </div>

          <Tombol type="submit" sedangJalan={mencari}>
            {mencari ? "Mencari..." : "Lihat Status"}
          </Tombol>
        </div>
      </form>

      {hasil && (
        <MunculLangsung className="kartu overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-garis bg-biru-muda px-6 py-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-samar uppercase">
                Nomor registrasi
              </p>
              <p className="mt-0.5 text-2xl font-bold text-biru-tua">
                {hasil.no_registrasi}
              </p>
            </div>
            <Lencana warna={warnaStatus(hasil.status)}>{hasil.status}</Lencana>
          </div>

          <dl className="divide-y divide-garis text-sm">
            {[
              { k: "Nama lengkap", v: hasil.nama_lengkap },
              { k: "Tahun ajaran", v: hasil.tahun_ajaran },
              { k: "Jalur pendaftaran", v: hasil.jalur },
              { k: "Peminatan", v: hasil.nama_jurusan },
              { k: "Waktu mendaftar", v: tanggalJam(hasil.dibuat) },
            ].map(
              (b) =>
                b.v && (
                  <div
                    key={b.k}
                    className="flex flex-col gap-0.5 px-6 py-3.5 sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <dt className="text-samar">{b.k}</dt>
                    <dd className="font-semibold text-teks sm:text-right">{b.v}</dd>
                  </div>
                ),
            )}
          </dl>

          <div className="space-y-4 border-t border-garis px-6 py-5">
            <p className="text-sm leading-relaxed text-teks">
              {ARTI_STATUS[hasil.status] ?? ""}
            </p>

            {hasil.catatan_admin && (
              <div className="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4">
                <p className="text-xs font-semibold tracking-wide text-biru uppercase">
                  Catatan panitia
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-teks">
                  {hasil.catatan_admin}
                </p>
              </div>
            )}

            {hasil.pengumuman && (
              <p className="text-sm text-samar">
                Pengumuman hasil seleksi dijadwalkan pada{" "}
                <strong className="text-biru-tua">
                  {tanggalPanjang(hasil.pengumuman)}
                </strong>
                .
              </p>
            )}

            {/* Tes seleksi. Seluruh keadaannya datang dari server, jadi
                halaman ini tidak pernah menawarkan tombol yang akan ditolak
                begitu ditekan. */}
            {hasil.ujian && (hasil.ujian.dibuka || hasil.ujian.hasil) && (
              <div className="tanpa-cetak space-y-3 border-t border-garis pt-4">
                <p className="text-xs font-semibold tracking-wide text-samar uppercase">
                  Tes seleksi
                </p>

                {hasil.ujian.hasil ? (
                  <div className="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4">
                    <p className="text-sm text-samar">
                      {hasil.ujian.hasil.nama_paket}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-biru-tua tabular-nums">
                      Nilai {hasil.ujian.hasil.skor.toFixed(0)}
                      <span className="ml-2 text-sm font-semibold text-samar">
                        ({hasil.ujian.hasil.jumlah_benar} dari{" "}
                        {hasil.ujian.hasil.jumlah_soal} benar)
                      </span>
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-teks">
                      {hasil.ujian.hasil.lulus
                        ? `Nilai Anda memenuhi batas minimum ${hasil.ujian.hasil.nilai_minimum}. Keputusan penerimaan tetap diumumkan panitia.`
                        : `Nilai Anda belum memenuhi batas minimum ${hasil.ujian.hasil.nilai_minimum}. Keputusan penerimaan tetap diumumkan panitia.`}
                    </p>
                  </div>
                ) : hasil.ujian.boleh_ikut ? (
                  <>
                    <p className="text-sm leading-relaxed text-teks">
                      Tes seleksi sedang dibuka
                      {hasil.ujian.jumlah_soal
                        ? `: ${hasil.ujian.jumlah_soal} soal dalam ${hasil.ujian.durasi_menit} menit.`
                        : "."}{" "}
                      Waktu mulai berjalan begitu Anda membukanya.
                    </p>
                    <Link
                      href="/ppdb/ujian"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
                    >
                      Kerjakan Tes Seleksi
                    </Link>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-samar">
                    {hasil.ujian.alasan ||
                      "Tes seleksi belum dapat Anda kerjakan saat ini."}
                  </p>
                )}
              </div>
            )}

            <div className="tanpa-cetak space-y-3 border-t border-garis pt-4">
              {galatBukti && <PesanGalat pesan={galatBukti} />}
              <div className="flex flex-wrap gap-2">
                <Tombol onClick={ambilBukti} sedangJalan={mengunduh}>
                  {mengunduh ? "Menyiapkan..." : "Unduh Bukti Pendaftaran (PDF)"}
                </Tombol>
                {hasil.ujian?.kartu_siap && (
                  <Tombol
                    jenis="kedua"
                    onClick={ambilKartu}
                    sedangJalan={mengunduhKartu}
                  >
                    {mengunduhKartu ? "Menyiapkan..." : "Kartu Peserta Ujian (PDF)"}
                  </Tombol>
                )}
                <Tombol jenis="kedua" onClick={() => window.print()}>
                  Cetak halaman ini
                </Tombol>
              </div>
              <p className="text-xs leading-relaxed text-samar">
                Bukti pendaftaran dirakit di server, jadi bentuknya sama di semua
                peramban. Berkasnya memuat data pribadi, simpan di tempat yang aman.
              </p>
            </div>
          </div>
        </MunculLangsung>
      )}
    </div>
  );
}

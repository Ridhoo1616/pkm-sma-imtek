"use client";

import { useState } from "react";
import { api, unduhBukti, GalatApi } from "@/lib/api";
import { bukaBlob } from "@/lib/berkas";
import { Teks, Tombol, RingkasanGalat } from "@/komponen/Medan";
import { PesanGalat } from "@/komponen/Memuat";
import { belumTerisi, kePoinTerisi, tanggalJam, tanggalPanjang } from "@/lib/format";
import type { StatusPendaftaran } from "@/lib/tipe";
import { MunculLangsung } from "@/komponen/Gerak";

/** Nama peminatan di basis data sering sudah berawalan "Peminatan". */
const ringkasPeminatan = (nama: string) => nama.replace(/^Peminatan\s+/i, "");

/**
 * Judul dan kalimat pengantar tiap status. Yang diterima disapa langsung dan
 * disebut peminatannya; yang lain cukup jelas dan tenang, tanpa hiasan.
 */
function isiHasil(h: StatusPendaftaran, pengumuman: string) {
  const nama = h.nama_lengkap.split(" ")[0];
  const peminatan = ringkasPeminatan(h.nama_jurusan);
  switch (h.status) {
    case "Diterima":
      return {
        judul: "Selamat, kamu diterima di SMAS IMTEK.",
        pengantar: peminatan
          ? `${nama}, kamu dinyatakan lulus seleksi dan diterima di Peminatan ${peminatan}. Kami menunggu kamu bergabung.`
          : `${nama}, kamu dinyatakan lulus seleksi dan diterima. Kami menunggu kamu bergabung.`,
      };
    case "Cadangan":
      return {
        judul: "Kamu masuk daftar cadangan.",
        pengantar: `Terima kasih sudah mendaftar, ${nama}. Bila ada peserta diterima yang tidak daftar ulang, panitia akan menghubungi kamu.`,
      };
    case "Ditolak":
      return {
        judul: "Pendaftaranmu belum dapat kami terima.",
        pengantar: `Terima kasih sudah mendaftar di SMAS IMTEK, ${nama}. Catatan dari panitia, bila ada, dapat dibaca di bawah.`,
      };
    case "Terverifikasi":
      return {
        judul: "Berkasmu sudah lengkap.",
        pengantar: pengumuman
          ? `Hasil seleksi diumumkan pada ${tanggalPanjang(pengumuman)}. Belum ada yang perlu kamu lakukan.`
          : "Kami sedang menetapkan hasil seleksi. Belum ada yang perlu kamu lakukan.",
      };
    default:
      return {
        judul: "Berkasmu sedang diperiksa.",
        pengantar: pengumuman
          ? `Panitia memeriksa kelengkapan berkas. Hasil seleksi diumumkan pada ${tanggalPanjang(pengumuman)}. Belum ada yang perlu kamu lakukan.`
          : "Panitia memeriksa kelengkapan berkas. Belum ada yang perlu kamu lakukan.",
      };
  }
}

export default function CekStatus({ nomorAwal = "" }: { nomorAwal?: string }) {
  const [no, setNo] = useState(nomorAwal);
  const [tgl, setTgl] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [ringkasan, setRingkasan] = useState<string[]>([]);
  const [mencari, setMencari] = useState(false);
  const [hasil, setHasil] = useState<StatusPendaftaran | null>(null);
  const [mengunduh, setMengunduh] = useState(false);
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

      {hasil && (() => {
        const isi = isiHasil(hasil, hasil.pengumuman);
        const diterima = hasil.status === "Diterima";
        const du = hasil.daftar_ulang;
        const langkah: { t: string; k: string }[] = du
          ? [
              ...(belumTerisi(du.jadwal)
                ? []
                : [{ t: `Daftar ulang pada ${du.jadwal}`, k: belumTerisi(du.tempat) ? "" : `Di ${du.tempat}` }]),
              ...kePoinTerisi(du.syarat).map((t) => ({ t, k: "" })),
            ]
          : [];
        return (
          <MunculLangsung className="border-t border-garis pt-10">
            <p className={"text-xs font-semibold tracking-[0.14em] uppercase " + (diterima ? "text-green-700" : "text-samar")}>
              Hasil seleksi · PPDB {hasil.tahun_ajaran}
            </p>
            <h2 className="mt-4 max-w-[18ch] text-4xl leading-[1.05] font-bold tracking-tight text-biru-tua md:text-5xl">
              {isi.judul}
            </h2>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-teks">{isi.pengantar}</p>

            <dl className="mt-8 grid border-y border-garis sm:grid-cols-3">
              {[
                { k: "Nomor registrasi", v: hasil.no_registrasi },
                { k: "Peminatan", v: ringkasPeminatan(hasil.nama_jurusan) },
                { k: "Jalur", v: hasil.jalur },
              ]
                .filter((b) => b.v)
                .map((b, i) => (
                  <div key={b.k} className={"py-4 " + (i > 0 ? "border-t border-garis sm:border-t-0 sm:border-l sm:pl-6" : "")}>
                    <dt className="text-sm text-samar">{b.k}</dt>
                    <dd className="mt-0.5 text-xl font-semibold text-biru-tua">{b.v}</dd>
                  </div>
                ))}
            </dl>
            <p className="mt-3 text-sm text-samar">
              {hasil.nama_lengkap} · mendaftar {tanggalJam(hasil.dibuat)} · status {hasil.status}
            </p>

            {hasil.catatan_admin && (
              <div className="mt-8 max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.14em] text-samar uppercase">Catatan panitia</p>
                <p className="mt-1.5 leading-relaxed whitespace-pre-line text-teks">{hasil.catatan_admin}</p>
              </div>
            )}

            {diterima && du && (
              <div className="mt-10">
                <h3 className="text-xl font-bold text-biru-tua">Yang perlu kamu lakukan</h3>
                {langkah.length > 0 ? (
                  <ol className="mt-3">
                    {langkah.map((b, i) => (
                      <li key={i} className="grid grid-cols-[2.25rem_1fr] border-t border-garis py-3.5 last:border-b">
                        <span className="text-xl leading-snug font-bold text-emas tabular-nums">{i + 1}</span>
                        <span>
                          {b.t}
                          {b.k && <small className="block text-sm text-samar">{b.k}</small>}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 max-w-[56ch] text-teks">
                    Panitia akan menghubungi kamu lewat WhatsApp untuk jadwal dan berkas daftar ulang.
                  </p>
                )}
                <p className="mt-4 max-w-[56ch] text-sm text-samar">
                  Bila tidak daftar ulang sampai batas waktunya, tempatmu dapat diberikan kepada pendaftar cadangan.
                </p>
              </div>
            )}

            <div className="tanpa-cetak mt-8 space-y-3">
              {galatBukti && <PesanGalat pesan={galatBukti} />}
              <div className="flex flex-wrap gap-2">
                <Tombol onClick={ambilBukti} sedangJalan={mengunduh}>
                  {mengunduh ? "Menyiapkan..." : "Unduh Bukti Pendaftaran (PDF)"}
                </Tombol>
                <Tombol jenis="kedua" onClick={() => window.print()}>
                  Cetak halaman ini
                </Tombol>
              </div>
              <p className="text-xs leading-relaxed text-samar">
                Berkas bukti memuat data pribadi, simpan di tempat yang aman.
              </p>
            </div>
          </MunculLangsung>
        );
      })()}
    </div>
  );
}

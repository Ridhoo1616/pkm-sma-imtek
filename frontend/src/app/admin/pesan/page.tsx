"use client";

import { useState } from "react";
import { api, GalatApi } from "@/lib/api";
import { useMuat } from "@/lib/muat";
import { useKabar } from "@/komponen/Kabar";
import { angka, tanggalJam, nomorWa, tautanWa } from "@/lib/format";
import { KepalaPanel, KartuAngka, Konfirmasi, Jendela } from "@/komponen/Panel";
import { Memuat, PesanGalat, TanpaData } from "@/komponen/Memuat";
import { Lencana } from "@/komponen/Bagian";
import {
  Teks,
  AreaTeks,
  Pilihan,
  Tombol,
  RingkasanGalat,
} from "@/komponen/Medan";
import { IkonSurel, IkonWhatsapp } from "@/komponen/Ikon";
import type { Pesan } from "@/lib/tipe";

/**
 * Pesan masuk dari halaman Kontak, beserta balasan panitia.
 *
 * Sebelumnya halaman ini hanya memasang tautan `mailto:` dan `wa.me`. Yang
 * `wa.me` bekerja, tetapi yang `mailto:` TIDAK MELAKUKAN APA PUN di komputer
 * yang tidak punya aplikasi email terpasang, dan itulah keadaan sebagian besar
 * komputer sekolah. Panitia melihat tombol yang tidak bisa diklik.
 *
 * Sekarang balasannya diarang di dalam panel. Email dikirim server lewat SMTP
 * yang sama dengan notifikasi PPDB; WhatsApp tetap dibuka di aplikasinya,
 * sebab pengiriman otomatis hanya sah lewat WhatsApp Business API resmi.
 *
 * Alamat tujuannya boleh diubah, tidak dipaksa sama dengan yang tertulis pada
 * pesannya: pengunjung kadang salah menulis alamatnya sendiri, dan yang harus
 * dijawab kadang orang tuanya.
 */

type Kanal = "Email" | "WhatsApp";

const KOSONG = { kanal: "Email" as Kanal, tujuan: "", perihal: "", isi: "" };

/**
 * Naskah awal balasan. Sengaja tidak memuat nama sekolah, sebab halaman ini
 * tidak memuat pengaturan sekolah dan mengarang namanya lebih buruk daripada
 * membiarkan panitia menuliskannya sendiri.
 */
function naskahAwal(p: Pesan): string {
  const soal = p.subjek.trim();
  return (
    `Assalamualaikum, Bapak/Ibu ${p.nama}.\n\n` +
    `Terima kasih atas pertanyaan yang Anda kirim${soal ? ` mengenai "${soal}"` : ""}.\n\n` +
    `\n\nHormat kami,\nPanitia PPDB`
  );
}

export default function HalamanPesanAdmin() {
  const kabar = useKabar();
  const [saring, setSaring] = useState({ dibaca: "", cari: "" });
  const kueri = (() => {
    const u = new URLSearchParams({ per_halaman: "50" });
    if (saring.dibaca) u.set("dibaca", saring.dibaca);
    if (saring.cari.trim()) u.set("cari", saring.cari.trim());
    return `?${u.toString()}`;
  })();

  const { data, memuat, galat, muatUlang } = useMuat(
    () => api.pesanMasuk(kueri),
    [kueri],
  );

  const [galatAksi, setGalatAksi] = useState("");
  const [sibuk, setSibuk] = useState<number | null>(null);
  const [hapusTarget, setHapusTarget] = useState<Pesan | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const [balas, setBalas] = useState<Pesan | null>(null);
  const [isi, setIsi] = useState(KOSONG);
  const [mengirim, setMengirim] = useState(false);
  const [ringkasan, setRingkasan] = useState<string[]>([]);

  function bukaBalas(p: Pesan) {
    setRingkasan([]);
    setBalas(p);
    // Kanal awalnya mengikuti yang tersedia. Email lebih dulu karena balasan
    // panjang lebih pantas di email, tetapi pesan yang pengirimnya hanya
    // meninggalkan nomor HP langsung dibuka pada kanal WhatsApp.
    const adaEmail = p.email.trim() !== "";
    setIsi({
      kanal: adaEmail || !p.no_hp.trim() ? "Email" : "WhatsApp",
      tujuan: adaEmail ? p.email : p.no_hp,
      perihal: `Balasan: ${p.subjek.trim() || "pertanyaan Anda"}`,
      isi: naskahAwal(p),
    });
  }

  function gantiKanal(kanal: string) {
    const k = kanal === "WhatsApp" ? "WhatsApp" : "Email";
    setRingkasan([]);
    setIsi((s) => ({
      ...s,
      kanal: k,
      // Alamat tujuannya mengikuti kanalnya, tetapi hanya bila yang tertulis
      // sekarang masih yang bawaan. Yang sudah diubah panitia tidak ditimpa.
      tujuan:
        s.tujuan === (balas?.email ?? "") || s.tujuan === (balas?.no_hp ?? "")
          ? k === "Email"
            ? (balas?.email ?? "")
            : (balas?.no_hp ?? "")
          : s.tujuan,
    }));
  }

  async function tandai(p: Pesan) {
    setGalatAksi("");
    setSibuk(p.id);
    try {
      await api.tandaiPesan(p.id, !p.dibaca);
      muatUlang();
    } catch (e) {
      setGalatAksi(
        e instanceof GalatApi ? e.message : "Tanda baca gagal diubah.",
      );
    } finally {
      setSibuk(null);
    }
  }

  async function kirimBalasan() {
    if (!balas) return;
    setRingkasan([]);
    setMengirim(true);
    try {
      const hasil = await api.balasPesan(balas.id, {
        kanal: isi.kanal,
        tujuan: isi.tujuan,
        perihal: isi.kanal === "Email" ? isi.perihal : undefined,
        isi: isi.isi,
      });
      kabar.beri(hasil.pesan);
      setBalas(null);
      muatUlang();
    } catch (e) {
      if (e instanceof GalatApi) {
        const kolom = Object.values(e.kolom);
        setRingkasan(kolom.length > 0 ? kolom : [e.message]);
      } else {
        setRingkasan(["Balasan gagal dikirim."]);
      }
    } finally {
      setMengirim(false);
    }
  }

  /**
   * WhatsApp tidak dikirim server. Tautannya dibuka oleh elemen <a> yang
   * ditekan panitia sendiri, jadi tidak pernah dihadang penghalang jendela
   * sembulan, dan pencatatannya dijalankan di sini pada ketukan yang sama.
   */
  async function catatBalasanWa() {
    if (!balas) return;
    setRingkasan([]);
    setMengirim(true);
    try {
      await api.balasPesan(balas.id, {
        kanal: "WhatsApp",
        tujuan: isi.tujuan,
        isi: isi.isi,
      });
      kabar.beri("Balasan dicatat. Tekan kirim di WhatsApp yang terbuka.");
      setBalas(null);
      muatUlang();
    } catch (e) {
      setRingkasan([
        e instanceof GalatApi
          ? e.message
          : "WhatsApp terbuka, tetapi balasannya gagal dicatat.",
      ]);
    } finally {
      setMengirim(false);
    }
  }

  async function hapus() {
    if (!hapusTarget) return;
    setMenghapus(true);
    try {
      const hasil = await api.hapusPesan(hapusTarget.id);
      kabar.beri(hasil.pesan);
      setHapusTarget(null);
      muatUlang();
    } catch (e) {
      setGalatAksi(e instanceof GalatApi ? e.message : "Pesan gagal dihapus.");
      setHapusTarget(null);
    } finally {
      setMenghapus(false);
    }
  }

  const waSiap = nomorWa(isi.tujuan) !== "" && isi.isi.trim() !== "";
  const emailMati = data ? data.email_aktif === false : false;

  return (
    <>
      <KepalaPanel
        judul="Pesan Masuk"
        keterangan="Pertanyaan yang dikirim pengunjung lewat halaman Kontak, beserta balasan panitia."
      />

      {galatAksi && (
        <div className="mb-5">
          <PesanGalat pesan={galatAksi} />
        </div>
      )}

      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KartuAngka label="Total pesan" nilai={angka(data.total)} />
          <KartuAngka
            label="Belum dibaca"
            nilai={angka(data.belum_dibaca)}
            warna={data.belum_dibaca > 0 ? "text-amber-600" : "text-biru-tua"}
          />
        </div>
      )}

      {emailMati && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          <strong>Balasan lewat email belum dapat dikirim.</strong> SMTP belum
          disetel di server, jadi yang tersedia baru balasan lewat WhatsApp. Isi
          SMTP_HOST, SMTP_USER, SMTP_PASS, dan SMTP_DARI pada berkas .env di
          server, lalu nyalakan ulang. Untuk Gmail, SMTP_PASS adalah sandi
          aplikasi, bukan sandi akunnya.
        </p>
      )}

      <div className="kartu mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="cari-pesan"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Pencarian
            </label>
            <input
              id="cari-pesan"
              type="search"
              value={saring.cari}
              onChange={(e) =>
                setSaring((s) => ({ ...s, cari: e.target.value }))
              }
              placeholder="Nama pengirim, subjek, atau isi"
              className="w-full rounded-lg border border-garis px-3.5 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            />
          </div>
          <div>
            <label
              htmlFor="saring-dibaca"
              className="mb-1.5 block text-xs font-semibold text-samar uppercase"
            >
              Keadaan
            </label>
            <select
              id="saring-dibaca"
              value={saring.dibaca}
              onChange={(e) =>
                setSaring((s) => ({ ...s, dibaca: e.target.value }))
              }
              className="w-full rounded-lg border border-garis bg-white px-3 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20"
            >
              <option value="">Semua pesan</option>
              <option value="0">Belum dibaca</option>
              <option value="1">Sudah dibaca</option>
            </select>
          </div>
        </div>
      </div>

      {memuat ? (
        <Memuat />
      ) : galat ? (
        <PesanGalat pesan={galat} ulangi={muatUlang} />
      ) : !data || data.data.length === 0 ? (
        <TanpaData
          judul="Tidak ada pesan yang cocok"
          keterangan="Pesan dari halaman Kontak akan muncul di sini."
        />
      ) : (
        <div className="space-y-4">
          {data.data.map((p) => (
            <article
              key={p.id}
              className={
                "kartu p-6 " + (p.dibaca ? "" : "border-l-4 border-l-amber-400")
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base">
                      {p.subjek || "(tanpa subjek)"}
                    </h2>
                    {!p.dibaca && <Lencana jenis="emas">Belum dibaca</Lencana>}
                    {p.dibalas_pada && (
                      <Lencana jenis="hijau">Sudah dibalas</Lencana>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-samar">
                    Dari <strong className="text-teks">{p.nama}</strong> ·{" "}
                    {tanggalJam(p.dibuat)}
                    {p.dibalas_pada && (
                      <> · dibalas {tanggalJam(p.dibalas_pada)}</>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Tombol
                    jenis="kedua"
                    onClick={() => tandai(p)}
                    sedangJalan={sibuk === p.id}
                  >
                    {p.dibaca ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                  </Tombol>
                  <Tombol jenis="bahaya" onClick={() => setHapusTarget(p)}>
                    Hapus
                  </Tombol>
                </div>
              </div>

              <p className="mt-4 border-t border-garis pt-4 text-[15px] leading-relaxed whitespace-pre-line text-teks">
                {p.isi}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-garis pt-4">
                <Tombol onClick={() => bukaBalas(p)}>
                  {p.dibalas_pada ? "Balas lagi" : "Balas"}
                </Tombol>
                <p className="text-sm text-samar">
                  {p.email || p.no_hp ? (
                    <>
                      {p.email && (
                        <span className="inline-flex items-center gap-1.5">
                          <IkonSurel ukuran={14} />
                          {p.email}
                        </span>
                      )}
                      {p.email && p.no_hp && " · "}
                      {p.no_hp && (
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <IkonWhatsapp ukuran={14} />
                          {p.no_hp}
                        </span>
                      )}
                    </>
                  ) : (
                    "Pengirim tidak mencantumkan email maupun nomor HP; alamat tujuannya diisi sendiri saat membalas."
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <Jendela
        terbuka={balas !== null}
        tutup={() => setBalas(null)}
        judul="Balas pesan"
      >
        <div className="space-y-5">
          {ringkasan.length > 0 && <RingkasanGalat daftar={ringkasan} />}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-samar">Pengirim</dt>
            <dd className="font-semibold">{balas?.nama}</dd>
            <dt className="text-samar">Pertanyaannya</dt>
            <dd className="font-semibold">
              {balas?.subjek || "(tanpa subjek)"}
            </dd>
          </dl>

          <div className="grid gap-5 sm:grid-cols-2">
            <Pilihan
              nama="kanal-balasan"
              label="Kirim lewat"
              nilai={isi.kanal}
              ubah={gantiKanal}
              opsi={[
                { nilai: "Email", label: "Email" },
                { nilai: "WhatsApp", label: "WhatsApp" },
              ]}
              kosong=""
            />
            <Teks
              nama="tujuan-balasan"
              label={
                isi.kanal === "Email"
                  ? "Alamat email tujuan"
                  : "Nomor WhatsApp tujuan"
              }
              tipe={isi.kanal === "Email" ? "email" : "tel"}
              wajib
              maks={isi.kanal === "Email" ? 120 : 25}
              nilai={isi.tujuan}
              ubah={(v) => setIsi((s) => ({ ...s, tujuan: v }))}
              contoh={
                isi.kanal === "Email" ? "nama@contoh.com" : "0812xxxxxxxx"
              }
              bantuan="Boleh diubah, misalnya ke alamat orang tua atau bila pengirimnya salah menulis alamatnya sendiri."
            />
          </div>

          {isi.kanal === "Email" && (
            <Teks
              nama="perihal-balasan"
              label="Perihal"
              wajib
              maks={200}
              nilai={isi.perihal}
              ubah={(v) => setIsi((s) => ({ ...s, perihal: v }))}
            />
          )}

          <AreaTeks
            nama="isi-balasan"
            label="Isi balasan"
            baris={10}
            wajib
            maks={4000}
            nilai={isi.isi}
            ubah={(v) => setIsi((s) => ({ ...s, isi: v }))}
            bantuan={
              isi.kanal === "Email"
                ? "Dikirim server sebagai teks biasa, dari alamat pengirim yang disetel pada menu Pengaturan."
                : "Dibawa ke WhatsApp sebagai pesan yang sudah terisi; Anda tinggal menekan kirim di sana."
            }
          />

          {isi.kanal === "Email" && emailMati && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              SMTP belum disetel di server, jadi balasan email belum dapat
              dikirim. Pilih WhatsApp, atau setel SMTP lebih dulu.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-garis pt-5">
            <Tombol type="button" jenis="kedua" onClick={() => setBalas(null)}>
              Tutup
            </Tombol>
            {isi.kanal === "Email" ? (
              <Tombol
                type="button"
                sedangJalan={mengirim}
                disabled={emailMati}
                onClick={kirimBalasan}
              >
                <IkonSurel ukuran={16} />
                Kirim email
              </Tombol>
            ) : waSiap ? (
              // Sengaja <a>, bukan <button>: tautannya dibuka oleh ketukan
              // panitia sendiri sehingga tidak pernah dihadang penghalang
              // jendela sembulan, sedangkan pencatatannya jalan pada ketukan
              // yang sama.
              <a
                href={tautanWa(isi.tujuan, isi.isi)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={catatBalasanWa}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
              >
                <IkonWhatsapp ukuran={16} />
                Buka WhatsApp
              </a>
            ) : (
              <Tombol type="button" disabled>
                <IkonWhatsapp ukuran={16} />
                Buka WhatsApp
              </Tombol>
            )}
          </div>
        </div>
      </Jendela>

      <Konfirmasi
        terbuka={hapusTarget !== null}
        judul="Hapus pesan?"
        labelYa="Ya, hapus"
        sedangJalan={menghapus}
        tutup={() => setHapusTarget(null)}
        lanjut={hapus}
        pesan={
          <p>
            Pesan dari <strong>{hapusTarget?.nama}</strong> akan dihapus
            permanen. Pastikan sudah ditindaklanjuti sebelum menghapusnya.
          </p>
        }
      />
    </>
  );
}

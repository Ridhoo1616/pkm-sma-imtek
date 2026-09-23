import Link from "next/link";
import { keParagraf } from "@/lib/format";
import { anakMenu } from "@/lib/menu";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";
import { kelasKartuAkhir } from "@/komponen/Bagian";

/**
 * Bagian yang dipakai berulang oleh halaman Profil Sekolah, Akademik, dan
 * Kesiswaan.
 *
 * Yang dijaga di sini satu hal: halaman yang naskahnya belum dikirim sekolah
 * tidak boleh tampil sebagai halaman kosong tanpa penjelasan, dan tidak boleh
 * diisi karangan. Jadi setiap bagian yang belum ada isinya menampilkan
 * keterangan yang menyebut dari menu mana isinya diisi.
 */

/**
 * Penanda isi yang belum dikirim sekolah. Bukan data karangan.
 *
 * Dulu berupa kotak kuning bergaris putus-putus. Itu dilepas atas permintaan
 * user: kotak berwarna adalah bahasa untuk peringatan yang harus ditindak,
 * sedangkan ini cuma catatan bahwa bahannya belum sampai. Dengan warna
 * peringatan, catatan itu justru menarik mata lebih kuat daripada isi
 * halamannya sendiri. Sekarang bentuknya sama seperti kartu yang akan
 * memuat naskahnya nanti, dengan keterangan berupa teks miring redup di
 * tempat naskahnya — jadi tata letak halaman sudah final sebelum bahannya
 * ada. Kotak kuning tetap dipakai di tempat lain yang memang peringatan:
 * server tidak merespons, jumlah biaya masih nol, dan konfirmasi hapus.
 *
 * `polos` untuk pemakaian DI DALAM kartu yang sudah ada (bagian sambutan),
 * supaya kartunya tidak bersarang di dalam kartu.
 */
export function Menunggu({
  apa,
  dari,
  polos,
}: {
  apa: string;
  dari?: string;
  polos?: boolean;
}) {
  const keterangan = (
    <p className="text-[15px] leading-relaxed text-samar italic">
      {apa} belum tersedia. Bagian ini akan terisi setelah pihak sekolah
      mengirimkan naskahnya, dan dapat diisi lewat menu{" "}
      {dari ?? "Pengaturan"} di panel admin.
    </p>
  );

  if (polos) return keterangan;
  return <div className="kartu p-6 md:p-8">{keterangan}</div>;
}

/** Naskah panjang: dipecah menjadi paragraf, bukan satu blok rapat. */
export function Naskah({ isi }: { isi: string }) {
  const paragraf = keParagraf(isi);
  return (
    <div className="space-y-4">
      {paragraf.map((p, i) => (
        <p key={i} className="text-[15px] leading-relaxed whitespace-pre-line text-teks">
          {p}
        </p>
      ))}
    </div>
  );
}

/**
 * Kartu pengantar ke halaman-halaman turunan sebuah kelompok menu.
 *
 * Dibaca dari susunan menu yang sama dengan navigasi atas, sehingga halaman
 * indeks tidak pernah menyebut halaman yang tidak ada di menu, atau
 * sebaliknya.
 */
export function PetaAnak({ induk }: { induk: string }) {
  const anak = anakMenu(induk);
  if (anak.length === 0) return null;

  return (
    <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {anak.map((a, i) => (
        <MunculNaik
          key={a.label}
          jeda={(i % 3) * 0.08}
          className={kelasKartuAkhir(i, anak.length)}
        >
          <KartuGerak className="kartu h-full">
            <Link href={a.jalur} className="flex h-full flex-col p-5">
              <h3 className="flex items-start gap-2 text-base">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-biru-muda text-xs font-bold text-biru tabular-nums"
                >
                  {i + 1}
                </span>
                <span className="min-w-0">{a.label}</span>
              </h3>
              {a.keterangan && (
                <p className="mt-2 flex-1 text-sm leading-relaxed text-samar">
                  {a.keterangan}
                </p>
              )}
              <span className="mt-4 text-sm font-semibold text-biru">
                Buka halaman →
              </span>
            </Link>
          </KartuGerak>
        </MunculNaik>
      ))}
    </div>
  );
}

/** Kotak tautan keluar, dipakai E-Learning dan Jadwal Pelajaran. */
export function TautanKeluar({
  tautan,
  label,
  keterangan,
}: {
  tautan: string;
  label: string;
  keterangan?: string;
}) {
  return (
    <div className="kartu p-6">
      <p className="text-sm leading-relaxed text-teks">
        {keterangan ?? "Layanan ini berada di luar situs sekolah."}
      </p>
      <a
        href={tautan}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
      >
        {label} →
      </a>
      <p className="mt-3 text-xs break-all text-samar">{tautan}</p>
    </div>
  );
}

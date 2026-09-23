import Link from "next/link";
import { urlUnggahan } from "@/lib/api";
import { belumTerisi, keParagraf } from "@/lib/format";
import { anakMenu } from "@/lib/menu";
import { MunculNaik, KartuGerak } from "@/komponen/Gerak";

/**
 * Bagian yang dipakai berulang oleh halaman Profil Sekolah, Akademik, dan
 * Kesiswaan.
 *
 * Yang dijaga di sini satu hal: halaman yang naskahnya belum dikirim sekolah
 * tidak boleh tampil sebagai halaman kosong tanpa penjelasan, dan tidak boleh
 * diisi karangan. Jadi setiap bagian yang belum ada isinya menampilkan
 * keterangan yang menyebut dari menu mana isinya diisi.
 */

/** Penanda isi yang belum dikirim sekolah. Bukan data karangan. */
export function Menunggu({ apa, dari }: { apa: string; dari?: string }) {
  return (
    <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
      {apa} belum tersedia. Bagian ini akan terisi setelah pihak sekolah
      mengirimkan naskahnya, dan dapat diisi lewat menu{" "}
      {dari ?? "Pengaturan"} di panel admin.
    </p>
  );
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
        <MunculNaik key={a.label} jeda={(i % 3) * 0.08}>
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

/**
 * Potret kepala sekolah beserta kerangkanya.
 *
 * Selama fotonya belum diunggah, yang tampil adalah kerangka berukuran sama
 * yang menyebutkan ukuran dan perbandingan sisi yang diharapkan. Dengan
 * begitu tata letak halaman sudah final sejak sebelum fotonya ada, dan
 * panitia tahu foto seperti apa yang perlu disiapkan.
 */
export function PotretKepsek({
  foto,
  nama,
  jabatan = "Kepala Sekolah",
}: {
  foto?: string;
  nama?: string;
  jabatan?: string;
}) {
  const adaFoto = Boolean(foto && !belumTerisi(foto));
  const adaNama = Boolean(nama && !belumTerisi(nama));

  return (
    <figure className="kartu overflow-hidden">
      {adaFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlUnggahan("profil", foto as string)}
          alt={adaNama ? `Foto ${nama}, ${jabatan}` : `Foto ${jabatan}`}
          className="aspect-[3/4] w-full bg-biru-muda object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="grid aspect-[3/4] w-full place-items-center border-b border-dashed border-garis bg-biru-muda px-5 text-center">
          <div>
            <span
              aria-hidden
              className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl text-biru"
            >
              ☐
            </span>
            <p className="mt-3 text-sm font-semibold text-biru-tua">
              Tempat foto {jabatan.toLowerCase()}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-biru/70">
              Potret setengah badan, perbandingan sisi 3:4, paling tidak
              600×800 piksel. Diunggah lewat menu Pengaturan di panel admin.
            </p>
          </div>
        </div>
      )}
      <figcaption className="px-5 py-4 text-center">
        <span className="block font-bold text-biru-tua">
          {adaNama ? nama : "Nama kepala sekolah belum diisi"}
        </span>
        <span className="mt-0.5 block text-xs tracking-wide text-samar uppercase">
          {jabatan}
        </span>
      </figcaption>
    </figure>
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

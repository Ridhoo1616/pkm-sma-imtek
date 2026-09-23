import { alamatLengkap, belumTerisi } from "@/lib/format";
import { IkonLokasi } from "@/komponen/Ikon";
import type { Pengaturan } from "@/lib/tipe";

/**
 * Peta lokasi sekolah beserta jalan untuk mengukur jarak dan waktu tempuh
 * dari rumah pengunjung.
 *
 * PERHITUNGANNYA TIDAK DIKERJAKAN SITUS INI, dan itu keputusan yang
 * disengaja. Menghitung jarak jalan beserta estimasi waktu memerlukan layanan
 * rute — Google Directions, Mapbox, atau sejenisnya — dan seluruhnya menuntut
 * kunci API yang ditagih per permintaan. Kunci itu tidak boleh diletakkan di
 * repositori publik, dan sekolah tidak punya anggaran langganan.
 *
 * Menghitung sendiri dengan rumus jarak lurus juga bukan jalan keluar: jarak
 * lurus 5 km bisa berarti 12 km lewat jalan, dan angka yang menyesatkan lebih
 * buruk daripada tidak ada angka sama sekali.
 *
 * Yang dikerjakan di sini menyerahkan pengukurannya ke Google Maps lewat
 * tautan arah. Google yang memakai lokasi pengunjung, Google yang menghitung
 * rutenya, dan Google yang menampilkan jarak beserta waktu tempuhnya. Tidak
 * ada kunci API, tidak ada biaya, dan lokasi pengunjung tidak pernah melewati
 * server sekolah — itu keuntungan yang jarang disadari: kalau rutenya
 * dihitung di sini, alamat rumah setiap pengunjung akan tercatat di server.
 *
 * Tautannya sengaja TANPA titik asal. Google Maps yang kosong titik asalnya
 * memakai lokasi pengunjung sendiri, dan di ponsel ia membuka aplikasi
 * Maps-nya — jadi tidak perlu mengetik alamat rumah sama sekali.
 */

/** Tiga moda yang masuk akal di sini. `two-wheeler` untuk sepeda motor. */
const MODA = [
  { kode: "driving", label: "Mobil" },
  { kode: "two-wheeler", label: "Motor" },
  { kode: "transit", label: "Angkutan umum" },
];

export function PetaJarak({ pengaturan }: { pengaturan: Pengaturan }) {
  const p = pengaturan;
  const alamat = alamatLengkap(p.alamat, p.kode_pos);
  const koordinat = (p.peta_koordinat ?? "").trim();
  const adaPeta = Boolean(p.peta_embed && !belumTerisi(p.peta_embed));

  // Tujuan tautannya: koordinat bila sekolah sudah mengisinya, kalau tidak
  // alamatnya sebagai teks. Keduanya diterima Google Maps; koordinat lebih
  // tepat karena tidak bergantung pengenalan alamat.
  const tujuan = koordinat || `${p.nama_sekolah ?? ""} ${alamat}`.trim();
  const arah = (moda: string) =>
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(tujuan) +
    "&travelmode=" +
    moda;

  return (
    <section aria-labelledby="judul-peta" className="bg-biru-muda/50 py-16 md:py-20">
      <div className="wadah grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* ---------- Peta ---------- */}
        <div>
          {adaPeta ? (
            <div
              className="peta-sematan overflow-hidden rounded-kartu shadow-lembut"
              // Kode sematan berasal dari panitia lewat menu Pengaturan, dan
              // hanya peran admin yang dapat mengubahnya. Isinya iframe
              // Google Maps; tidak ada jalan lain memasang peta tanpa kunci
              // API selain memasang iframe yang mereka berikan.
              dangerouslySetInnerHTML={{ __html: p.peta_embed }}
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-kartu border border-dashed border-biru/30 bg-white px-6 text-center">
              <div className="max-w-md">
                <IkonLokasi ukuran={36} className="mx-auto text-biru/40" />
                <p className="mt-3 text-sm font-semibold text-biru-tua">
                  Peta lokasi sekolah
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-biru/70">
                  Petanya dipasang dengan menempelkan kode sematan Google Maps
                  pada pengaturan
                  <span className="font-semibold"> Sematan peta</span>. Tombol
                  penunjuk arah di samping tetap bekerja tanpa peta ini.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Alamat dan penunjuk arah ---------- */}
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-biru uppercase">
            Lokasi
          </p>
          <h2 id="judul-peta" className="mt-2 text-2xl font-bold md:text-3xl">
            Seberapa Jauh dari Rumah Anda?
          </h2>
          <span
            aria-hidden
            className="mt-3 block h-1 w-16 rounded-full bg-emas"
          />

          {alamat && !belumTerisi(alamat) && (
            <p className="mt-5 flex items-start gap-2.5 text-[15px] leading-relaxed text-teks">
              <IkonLokasi ukuran={18} className="mt-1 shrink-0 text-biru" />
              <span>{alamat}</span>
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-samar">
            Tekan salah satu tombol di bawah. Google Maps akan terbuka memakai
            lokasi Anda sendiri, lalu menampilkan jaraknya beserta perkiraan
            waktu tempuhnya. Anda tidak perlu mengetik alamat rumah, dan
            lokasi Anda tidak dikirim ke server sekolah.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {MODA.map((m, i) => (
              <a
                key={m.kode}
                href={arah(m.kode)}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  i === 0
                    ? "rounded-xl bg-biru px-5 py-3 text-sm font-semibold text-white transition hover:bg-biru-tua"
                    : "rounded-xl border border-biru/25 bg-white px-5 py-3 text-sm font-semibold text-biru transition hover:bg-biru-muda"
                }
              >
                {i === 0 ? `Hitung jarak — ${m.label}` : m.label}
              </a>
            ))}
          </div>

          {!koordinat && (
            <p className="mt-4 text-xs leading-relaxed text-samar">
              Titik tujuannya memakai alamat sekolah. Agar tepat sampai ke
              gerbang, panitia dapat mengisi koordinat lokasi pada menu
              Pengaturan.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

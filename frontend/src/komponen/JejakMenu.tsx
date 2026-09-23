import Link from "next/link";
import { menuDari } from "@/lib/menu";

/**
 * Jejak lokasi beserta tautan ke halaman sekelompok.
 *
 * Dipasang di bagian atas setiap halaman turunan. Dua gunanya: pengunjung
 * tahu ia sedang berada di dalam kelompok menu yang mana, dan dapat langsung
 * berpindah ke halaman sebelah tanpa kembali ke menu atas. Halaman yang
 * sedang dibuka diberi tanda dan tidak dibuat tautan, sama seperti penunjuk
 * alur pada halaman PPDB.
 *
 * Seluruhnya dirender di server: isinya hanya bergantung pada jalur yang
 * dikirim pemanggilnya.
 */
export function JejakMenu({
  induk,
  jalur,
}: {
  /** Jalur halaman indeks kelompok, misalnya "/profil". */
  induk: string;
  /** Jalur halaman yang sedang dibuka. */
  jalur: string;
}) {
  const kelompok = menuDari(induk);
  if (!kelompok) return null;
  const anak = kelompok.anak ?? [];
  const sekarang = anak.find((a) => a.jalur === jalur);

  return (
    <div className="tanpa-cetak">
      <nav aria-label="Jejak lokasi" className="text-sm text-samar">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-biru">
              Beranda
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={kelompok.jalur} className="hover:text-biru">
              {kelompok.label}
            </Link>
          </li>
          {sekarang && (
            <>
              <li aria-hidden>/</li>
              <li className="font-semibold text-teks" aria-current="page">
                {sekarang.label}
              </li>
            </>
          )}
        </ol>
      </nav>

      {anak.length > 0 && (
        <nav
          aria-label={`Halaman lain dalam ${kelompok.label}`}
          className="mt-4 border-b border-garis pb-3"
        >
          <ul className="flex snap-x gap-2 overflow-x-auto pb-1">
            {anak.map((a) => {
              const ini = a.jalur === jalur;
              const gaya =
                "block snap-start rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ";
              return (
                <li key={a.label}>
                  {ini ? (
                    <span
                      aria-current="page"
                      className={gaya + "bg-biru-muda text-biru-tua"}
                    >
                      {a.label}
                    </span>
                  ) : (
                    <Link
                      href={a.jalur}
                      className={
                        gaya + "text-teks hover:bg-biru-muda hover:text-biru"
                      }
                    >
                      {a.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

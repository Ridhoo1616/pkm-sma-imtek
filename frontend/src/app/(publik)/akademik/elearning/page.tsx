import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { Menunggu, TautanKeluar } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-Learning",
  description: "Pintu masuk ke ruang belajar daring sekolah.",
};

/**
 * Halaman ini sengaja berupa pintu masuk, bukan sistem belajar daring yang
 * dibangun sendiri: satu tautan ke layanan yang sudah dipakai sekolah,
 * misalnya Google Classroom atau folder Google Drive, diatur di menu
 * Pengaturan.
 */
export default async function HalamanElearning() {
  const { profil } = await muatProfil();
  const isian = (profil.pengaturan.tautan_elearning ?? "").trim();
  const ada = isian !== "" && !belumTerisi(isian);
  // Alamat yang ditempel tanpa skema ("classroom.google.com/c/...") akan
  // dibaca peramban sebagai jalur di situs ini, jadi dilengkapi https://.
  const tautan = /^https?:\/\//i.test(isian) ? isian : "https://" + isian;

  return (
    <>
      <KepalaHalaman
        judul="E-Learning"
        keterangan="Ruang belajar daring tempat guru membagikan materi, tugas, dan penilaian."
      />
      <div className="wadah py-14">
        <JejakMenu induk="/akademik" jalur="/akademik/elearning" />

        <MunculNaik>
          <div className="mt-8 max-w-2xl">
            {ada ? (
              <TautanKeluar
                tautan={tautan}
                label="Masuk ke e-learning sekolah"
                keterangan="Materi dan tugas berada di layanan terpisah, misalnya Google Classroom atau Google Drive. Masuk dengan akun yang diberikan sekolah atau guru kelas, bukan akun situs ini."
              />
            ) : (
              <Menunggu apa="Alamat e-learning" />
            )}
          </div>
        </MunculNaik>
      </div>
    </>
  );
}

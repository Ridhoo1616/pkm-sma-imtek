import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";
import { KepalaHalaman } from "@/komponen/Bagian";
import { MunculNaik } from "@/komponen/Gerak";
import { TautanKeluar } from "@/komponen/Halaman";
import { JejakMenu } from "@/komponen/JejakMenu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-Learning / LMS",
  description: "Pintu masuk ke ruang belajar daring sekolah.",
};

/**
 * Halaman ini sengaja berupa pintu masuk, bukan sistem belajar daring yang
 * dibangun sendiri.
 *
 * Alasannya praktis: sekolah yang sudah memakai Google Classroom, Moodle,
 * atau layanan sejenis tidak akan memindahkan kelasnya ke sistem baru, dan
 * membangun sistem kedua hanya menghasilkan ruang kelas kosong yang harus
 * dirawat. Yang berguna justru satu tautan yang selalu mudah ditemukan, dan
 * tautan itulah yang diatur di menu Pengaturan.
 */
export default async function HalamanElearning() {
  const { profil } = await muatProfil();
  const tautan = (profil.pengaturan.tautan_elearning ?? "").trim();
  const ada = tautan !== "" && !belumTerisi(tautan);

  return (
    <>
      <KepalaHalaman
        judul="E-Learning / LMS"
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
                keterangan="Ruang belajar daring sekolah berada di layanan terpisah. Nama pengguna dan kata sandinya diberikan guru kelas masing-masing, bukan oleh situs ini."
              />
            ) : (
              <div className="kartu p-6">
                <p className="font-semibold text-teks">
                  Alamat e-learning belum dicantumkan
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-samar">
                  Sekolah dapat memakai layanan yang sudah ada, misalnya Google
                  Classroom atau Moodle, lalu mencantumkan alamatnya lewat menu
                  Pengaturan di panel admin. Setelah alamatnya diisi, tombol
                  masuknya muncul di halaman ini.
                </p>
                <p className="mt-4 rounded-lg bg-biru-muda px-4 py-3 text-sm leading-relaxed text-biru-tua">
                  Sistem ini tidak menyediakan ruang kelas daring sendiri.
                  Halaman ini hanya menjadi satu pintu masuk yang mudah
                  ditemukan siswa dan orang tua.
                </p>
              </div>
            )}
          </div>
        </MunculNaik>
      </div>
    </>
  );
}

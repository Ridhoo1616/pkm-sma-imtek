/**
 * Template naskah untuk halaman bernaskah (Kurikulum, OSIS, Pendidikan
 * Karakter, dan halaman lain). Dipasang lewat tombol "Pakai template" di
 * Halaman Profil pada panel admin.
 *
 * Aturannya sama dengan naskah biasa: baris "## " menjadi judul bagian dan
 * dipakai pula sebagai daftar isi. Petunjuk pengisian ditulis di dalam kurung
 * siku, dan paragraf yang seluruhnya berkurung siku TIDAK pernah tampil di
 * halaman publik (lihat bagianNaskah di lib/format.ts). Jadi template yang
 * belum selesai diisi tidak membocorkan petunjuknya ke pengunjung; bagian
 * yang isinya masih petunjuk semata pun disembunyikan seluruhnya.
 */

export interface TemplatHalaman {
  ringkasan: string;
  isi: string;
}

const UMUM: TemplatHalaman = {
  ringkasan: "[Satu kalimat tentang isi halaman ini]",
  isi: `## Gambaran umum

[Tulis dua atau tiga kalimat: apa topik halaman ini dan siapa yang berkepentingan dengannya.]

## Hal pokok

[Uraikan hal-hal terpenting. Gunakan paragraf pendek, satu gagasan per paragraf.]

## Informasi lanjutan

[Tuliskan kontak, jadwal, atau tautan bila pembaca perlu bertanya lebih jauh.]`,
};

const KHUSUS: Record<string, TemplatHalaman> = {
  kurikulum: {
    ringkasan: "Kurikulum yang dipakai sekolah beserta struktur mata pelajarannya.",
    isi: `## Kurikulum yang dipakai

[Sebut nama kurikulum dan tahun penerapannya, misalnya Kurikulum Merdeka sejak tahun pelajaran 2022/2023.]

## Struktur mata pelajaran

[Tuliskan mata pelajaran kelompok umum yang diajarkan di kelas X, XI, dan XII.]

## Peminatan

[Jelaskan peminatan yang dibuka, mata pelajaran pilihan tiap peminatan, dan kapan siswa memilihnya.]

## Jam belajar

[Tulis jumlah jam pelajaran per minggu, lama satu jam pelajaran, dan jam masuk serta pulang.]

## Penilaian dan rapor

[Jelaskan bentuk penilaian, kapan rapor dibagikan, dan kriteria kenaikan kelas.]`,
  },
  osis: {
    ringkasan: "Organisasi Siswa Intra Sekolah: susunan pengurus dan program kerjanya.",
    isi: `## Tentang OSIS

[Tulis tujuan OSIS di sekolah ini dan pembinanya.]

## Susunan pengurus

[Tuliskan ketua, wakil, sekretaris, bendahara, dan sekbid beserta nama kelasnya, satu orang per baris.]

## Program kerja tahun ini

[Daftar program kerja beserta waktunya, misalnya Peringatan Hari Besar, Pentas Seni, Class Meeting.]

## Cara ikut serta

[Jelaskan kapan pemilihan pengurus dan bagaimana siswa dapat mendaftar atau memberi usul.]`,
  },
  "pendidikan-karakter": {
    ringkasan: "Pembinaan karakter dan kedisiplinan peserta didik.",
    isi: `## Nilai yang ditanamkan

[Sebut nilai pokok sekolah, misalnya disiplin, jujur, tanggung jawab, dan hormat, beserta artinya dalam keseharian.]

## Bentuk pembinaan

[Jelaskan kegiatannya: apel pagi, pembiasaan ibadah, program kebersihan, bimbingan konseling, dan seterusnya.]

## Tata tertib pokok

[Tuliskan aturan terpenting yang harus diketahui siswa dan orang tua: kehadiran, seragam, ponsel, dan lainnya.]

## Peran orang tua

[Jelaskan bagaimana orang tua dilibatkan dan ke siapa mereka dapat berkonsultasi.]`,
  },
};

/** Template untuk halaman dengan slug tertentu; halaman lain memakai yang umum. */
export function templatUntuk(slug: string): TemplatHalaman {
  return KHUSUS[slug] ?? UMUM;
}

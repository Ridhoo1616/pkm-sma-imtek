# Frontend Astro (halaman publik)

Pengganti bertahap frontend Next di `../frontend`. Yang sudah dipindah: **beranda**
(rancangan berkaca) dan **seluruh menu Profil Sekolah** (`/profil`, sejarah, data
sekolah, visi & misi, `/fasilitas`, struktur organisasi, tenaga pendidik), **Akademik**
(e-learning, jadwal, kalender, perpustakaan), **Kesiswaan** (ekstrakurikuler, prestasi),
`/halaman/[slug]` (Kurikulum, OSIS, Pendidikan Karakter), Berita, Galeri, Kontak, FAQ, dan
**PPDB** (ketentuan, formulir, cek status, tes seleksi). Yang masih di Next hanya panel admin. Halaman lain untuk sementara dialihkan ke frontend Next oleh
`src/pages/[...jalur].ts`; begitu halamannya dibuat di `src/pages`, pengalihan itu
berhenti sendiri untuk alamat tersebut.

```bash
npm install
npm run dev            # http://localhost:4321
npm run build && npm run start
```

Susunan di komputer sekolah (`jalankan.command`): situs Astro di **3000**, panel admin
Next di **3001**, backend Go di 8090. Astro meneruskan `/admin` ke Next tanpa mengganti
alamatnya (`SITUS_LAMA_DITERUSKAN=ya`), jadi panel tetap dibuka di `localhost:3000/admin`,
asal yang sudah diizinkan `CORS_ORIGINS` backend. Saat pengembangan di porta lain,
biarkan setelan itu kosong: `/admin` lalu dialihkan ke alamat Next sendiri.

Hal yang perlu diketahui:

- `@/lib` dan `@/komponen` menunjuk ke `../frontend/src`, tidak disalin. Folder
  `frontend/node_modules` tetap diperlukan untuk Tailwind yang diimpor `globals.css`.
- `next/link` dan `next/navigation` diganti `src/shim/`, jadi komponen React lama
  dapat dipakai tanpa diubah.
- Kerangka halaman turunan: `KepalaHalaman.astro` (kepala gelap + bilah halaman
  sekelompok) dan `PetaAnak.astro`. Interaksi seluruh halaman ada di
  `komponen/Interaksi.astro`, dipasang sekali di tata letak.
- Seluruh tombol bergaya `tombol-kilau` otomatis bermagnet; tautan lain diberi
  `data-magnet` (tombol menu atas, pil sub menu).
- `gaya.css` memuat `@source "./"` karena pemindai otomatis Tailwind melewatkan
  berkas rute bernama `[slug].astro`.
- Jawaban API di sisi server disimpan 15 detik (`src/lib/tembolok.ts`); perubahan
  dari panel admin terlihat paling lambat selama itu.
- Alamat gambar unggahan selalu relatif (`/unggahan/...`) di server maupun peramban,
  supaya komponen React tidak gagal hidrasi.
- Di peramban, alamat API dikosongkan (`astro.config.mjs`) dan `/api/*` serta
  `/unggahan/*` diteruskan server Astro ke backend, supaya backend tidak perlu
  menambah asal baru di `CORS_ORIGINS`.
- **Jangan menjalankan `astro build` selagi `astro dev` menyala.** Keduanya memakai
  tembolok `node_modules/.vite` yang sama; sesudahnya komponen React di dev gagal
  dengan `_jsxDEV is not a function` dan beranda dialihkan ke Next. Pulihkan dengan
  mematikan dev, `rm -rf node_modules/.vite .astro`, lalu `npm run dev -- --force`.

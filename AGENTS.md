# Aturan kerja di repositori ini

Catatan bagi siapa pun — orang maupun asisten kode — yang menyentuh
repositori ini. Isinya bukan penjelasan arsitektur; itu ada di `README.md`.
Yang ditulis di sini hanya hal yang **pernah menimbulkan kerusakan nyata**,
sehingga tidak cukup dihafal satu orang.

Cara memasang dan menjalankan: `PANDUAN-INSTALASI.md`. Untuk laptop kedua
beserta cara membawa datanya: bagian 4c.

## Bahasa

Seluruh tulisan berbahasa Indonesia: nama fungsi dan peubah, komentar, pesan
commit, naskah antarmuka, dan dokumen. Kode lama yang masih berbahasa Inggris
dibiarkan sampai memang disentuh, bukan diganti massal.

## Repositori ini PUBLIK

| Jangan pernah masuk repositori | Sebabnya |
|---|---|
| `backend/.env` | kredensial sungguhan, termasuk sandi SMTP |
| `backend/data/` | dokumen pribadi pendaftar: NIK, Kartu Keluarga, akta, ijazah |
| cadangan basis data (`*.dump`, `cadangan-*.sql`) | isinya sama |

Ketiganya sudah ditolak `.gitignore`. Jangan pernah menulis nilai sungguhan ke
`.env.example`. Sandi SMTP disimpan di `.env` saja, tidak di basis data, sebab
cadangan basis data beredar jauh lebih bebas daripada berkas konfigurasi.

Akun bawaan `admin` / `admin123` ada hash-nya di repositori publik ini, jadi
sandinya wajib diganti sebelum dipakai sungguhan.

## Basis data

**Cadangkan lebih dulu sebelum menjalankan migrasi terhadap basis data yang
dipakai.** Migrasi dijalankan otomatis saat backend dinyalakan, dan migrasi
yang gagal **menghentikan server** — situsnya mati.

```bash
pg_dump sma_imtek > ~/Desktop/cadangan-$(date +%F).sql
```

**Jangan menguji jalur tulis terhadap basis data yang sedang dipakai.** Buat
basis data sekali pakai, pakai, lalu buang:

```bash
createdb uji_001
# ... jalankan backend dengan DB_NAME=uji_001, uji, lalu:
dropdb uji_001
```

Jangan pernah `DROP DATABASE` terhadap basis data yang sedang dipakai orang.

**`pengaturan.keterangan` maksimal 160 aksara.** Migrasi 015 pernah menulis
163 aksara dan menghentikan backend milik user. Hitung panjangnya sebelum
commit.

## Pengaturan baru tidak muncul sendiri di situs publik

`pengaturanPublik` di `backend/handler_publik.go` adalah **daftar izin**.
Pengaturan yang tidak disebut di sana tidak ikut di `/api/profil`, jadi
halaman publik tidak akan pernah melihatnya — tanpa satu pun galat yang
menandainya.

Tembolok pengaturan disimpan di memori (`a.atur()`). Mengubah pengaturan lewat
SQL langsung menuntut backend dinyalakan ulang; lewat panel tidak, sebab panel
memanggil `POST /api/segarkan`.

## Jangan mengarang data sekolah

Angka, tanggal, nama guru, prestasi, dan naskah profil adalah milik sekolah.
Yang belum dikonfirmasi diisi penanda `[kurung siku]`, dan halaman publik
**menyembunyikan** bagian yang isinya masih penanda — bukan menampilkannya
sebagai "0" atau teks contoh. Halaman promosi tidak boleh memamerkan angka
karangan.

Hal yang sama berlaku untuk `sekolah_referensi`: NPSN yang salah akan menolak
pendaftar yang sah, jadi daftarnya diisi sekolah, bukan ditebak.

## Tailwind 4

Aturan dasar CSS **wajib berada di dalam `@layer base`**. Aturan di luar layer
mengalahkan utilitas Tailwind, sehingga kelas warna dan spasi tampak tidak
berpengaruh. Tema proyek ini ada di `frontend/src/app/globals.css`.

Hindari utilitas ringkas yang saling menimpa (`p-*` bersama `px-*`); urutan
menangnya tidak dapat diandalkan.

## Prettier

**Jangan menjalankan `prettier --write` atas seluruh berkas.** Repositori ini
belum pernah rapi menurut prettier, jadi sekali dijalankan ia memformat ulang
ratusan baris milik orang lain dan diff-nya tidak dapat ditinjau lagi. Bila
ingin memastikan baris sendiri rapi: salin berkasnya ke folder sementara,
jalankan prettier di salinan itu, lalu bandingkan.

## Sebelum push

```bash
cd backend  && gofmt -l . && go vet ./...
cd frontend && npx tsc --noEmit && npx eslint src
cd frontend && npx next build
```

`next build` yang tidak dijalankan sudah dua kali membuat `dev` tidak dapat
disusun: satu kali karena anggota union `JenisLencana` yang kurang, satu kali
karena aturan penyusun React.

## Demo di `docs/`

Demo GitHub Pages **wajib memakai CSS aplikasi yang sebenarnya**, bukan desain
yang ditulis ulang. Demo yang tampilannya berbeda dari aplikasinya menyesatkan
penilai, dan perbedaannya tidak akan terlihat sampai keduanya dibuka
berdampingan.

## Pesan commit

Ditulis berbahasa Indonesia, menerangkan **sebabnya**, bukan hanya apanya.
Tanpa baris atribusi asisten apa pun: repositori ini dipakai untuk tugas
Program Kreativitas Mahasiswa, jadi atribusinya murni atas nama penulisnya.

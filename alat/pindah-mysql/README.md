# Alat pindah MySQL ke PostgreSQL

Memindahkan isi basis data versi PHP (MySQL) ke basis data versi Go
(PostgreSQL). Dipakai sekali, lalu tidak diperlukan lagi.

Alat ini punya `go.mod` sendiri supaya backend tidak perlu membawa penggerak
MySQL hanya untuk keperluan satu kali.

## Cara memakai

Jalankan backend Go lebih dulu agar skema dan data awalnya terbentuk, lalu:

```bash
MYSQL_DSN='root:sandi@tcp(127.0.0.1:3306)/sma_imtek' \
PG_DSN='postgres://ppdb:sandi@127.0.0.1:5432/sma_imtek?sslmode=disable' \
KOSONGKAN=1 go run .
```

| Variabel | Arti |
|---|---|
| `MYSQL_DSN` | sumber data MySQL, bentuknya mengikuti `go-sql-driver/mysql` |
| `PG_DSN` | sumber data PostgreSQL tujuan |
| `KOSONGKAN=1` | **menghapus isi** delapan tabel tujuan lebih dulu |
| `PAKSA=1` | menambahkan di atas isi yang sudah ada, tanpa mengosongkan |

Tanpa `KOSONGKAN` maupun `PAKSA`, alat berhenti dan tidak mengubah apa pun.
Itu disengaja, supaya basis data yang sudah dipakai sekolah tidak tertimpa
karena salah menyalin alamat.

## Yang diterjemahkan

Nama tabel dan nama kolom kedua skema sengaja dibuat sama, jadi hanya tiga hal
yang berbeda:

| MySQL | PostgreSQL | Perlakuan |
|---|---|---|
| `tinyint(1)` | `boolean` | `0` dan `1` diubah menjadi `f` dan `t` |
| `enum` | `varchar` + `CHECK` | teksnya dipakai apa adanya |
| `datetime` | `timestamptz` | zona sesi disetel `Asia/Jakarta` agar jamnya tidak bergeser |

Kolom yang hanya ada di salah satu sisi dilewati, jadi alat ini tetap jalan
bila salah satu skema berubah.

## Dua perlakuan khusus

**Tabel `pengaturan` ditimpa per kunci**, bukan diganti seluruhnya. Versi Go
menambah dua belas kunci pengaturan yang belum ada pada versi PHP, misalnya
`sambutan_kepsek`, `jam_layanan`, dan `peta_embed`. Bila tabel itu dikosongkan,
kunci-kunci tersebut hilang, dan sekolah tidak akan bisa mengisinya dari
halaman Pengaturan karena halaman itu hanya menampilkan kunci yang barisnya
ada.

**Nilai `id` lama dipertahankan**, karena tabel lain menunjuk kepadanya.
Kolom `id` ditulis `GENERATED ALWAYS AS IDENTITY` yang biasanya menolak nilai
yang disebutkan sendiri, jadi penolakan itu dilewati dengan
`OVERRIDING SYSTEM VALUE`. Sesudah selesai, pencacahnya disetel ulang ke nilai
tertinggi ditambah satu agar baris berikutnya tidak bertabrakan.

## Yang tidak ikut

Berkas unggahan. Salin sendiri folder `legacy-php/uploads/` ke folder yang
ditunjuk `UPLOAD_DIR`. Nama berkasnya tidak berubah, jadi gambar dan dokumen
langsung terbaca setelah dipindah.

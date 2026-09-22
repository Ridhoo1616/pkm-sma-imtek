// Alat sekali pakai untuk memindahkan isi basis data versi PHP (MySQL) ke
// basis data versi Go (PostgreSQL).
//
// Alat ini terpisah dari backend dan punya go.mod sendiri, supaya backend
// tidak perlu lagi membawa penggerak MySQL hanya untuk keperluan satu kali.
//
// Nama tabel dan nama kolom kedua skema sengaja dibuat sama, jadi yang perlu
// diterjemahkan hanya tiga hal:
//
//   - tinyint(1) MySQL menjadi boolean PostgreSQL
//   - enum MySQL menjadi varchar beserta CHECK
//   - datetime MySQL yang tanpa zona waktu menjadi timestamptz
//
// Pemakaian:
//
//	MYSQL_DSN='root@tcp(127.0.0.1:3306)/sma_imtek' \
//	PG_DSN='postgres://ppdb:sandi@127.0.0.1:5432/sma_imtek?sslmode=disable' \
//	go run .
//
// Backend Go menyemai data awal saat migrasi pertama, jadi tabel tujuan
// biasanya sudah berisi beberapa baris contoh. Tambahkan KOSONGKAN=1 untuk
// membuang isi kesembilan tabel itu lebih dulu, atau PAKSA=1 untuk menambahkan
// di atas isi yang ada. Tanpa salah satunya, alat berhenti dan tidak mengubah
// apa pun.
//
// KOSONGKAN=1 MENGHAPUS DATA. Pakai hanya pada basis data tujuan yang baru
// dibuat, jangan pada basis data yang sudah dipakai sekolah.
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jackc/pgx/v5"
)

// Urutan penting: tabel yang diacu tabel lain dipindahkan lebih dulu, agar
// kunci asing tidak menolak barisnya. Tabel migrasi tidak ikut karena itu
// catatan internal backend Go, bukan data sekolah.
// Tabel pengaturan tidak diganti seluruhnya, melainkan ditimpa per kunci.
// Alasannya: seed backend Go memuat beberapa kunci pengaturan yang belum ada
// pada versi PHP. Mengosongkan tabel ini akan membuang kunci-kunci itu, dan
// sekolah tidak akan pernah bisa mengisinya dari halaman Pengaturan karena
// halaman itu hanya menampilkan kunci yang barisnya ada.
var kunciUnik = map[string]string{
	"pengaturan": "nama_setting",
}

var tabel = []string{
	"users",
	"pengaturan",
	"jurusan",
	"pendaftar",
	"berita",
	"galeri",
	"fasilitas",
	"pesan",
	"statistik_kunjungan",
}

func main() {
	dsnMy := os.Getenv("MYSQL_DSN")
	dsnPg := os.Getenv("PG_DSN")
	if dsnMy == "" || dsnPg == "" {
		log.Fatal("setel MYSQL_DSN dan PG_DSN lebih dulu")
	}
	paksa := os.Getenv("PAKSA") == "1"
	kosongkan := os.Getenv("KOSONGKAN") == "1"
	ctx := context.Background()

	my, err := sql.Open("mysql", dsnMy)
	if err != nil {
		log.Fatalf("MySQL: %v", err)
	}
	defer my.Close()
	if err := my.Ping(); err != nil {
		log.Fatalf("MySQL tidak merespons: %v", err)
	}

	pg, err := pgx.Connect(ctx, dsnPg)
	if err != nil {
		log.Fatalf("PostgreSQL: %v", err)
	}
	defer pg.Close(ctx)

	// datetime MySQL tidak menyimpan zona waktu. Nilainya adalah waktu
	// setempat, jadi zona sesi PostgreSQL disetel ke Asia/Jakarta supaya
	// teks tanggalnya tidak bergeser saat disimpan sebagai timestamptz.
	if _, err := pg.Exec(ctx, "SET TIME ZONE 'Asia/Jakarta'"); err != nil {
		log.Fatalf("gagal menyetel zona waktu: %v", err)
	}

	if kosongkan {
		var dikosongkan []string
		for _, t := range tabel {
			if kunciUnik[t] == "" {
				dikosongkan = append(dikosongkan, t)
			}
		}
		// Sekali jalan untuk seluruh tabel, karena TRUNCATE per tabel akan
		// tertolak oleh kunci asing yang saling menunjuk.
		if _, err := pg.Exec(ctx, "TRUNCATE "+strings.Join(dikosongkan, ",")+
			" RESTART IDENTITY CASCADE"); err != nil {
			log.Fatalf("gagal mengosongkan tabel tujuan: %v", err)
		}
		fmt.Println("  isi tabel tujuan dikosongkan lebih dulu (KOSONGKAN=1)")
	}

	total := 0
	for _, t := range tabel {
		n, err := pindahkan(ctx, my, pg, t, paksa)
		if err != nil {
			log.Fatalf("tabel %s: %v", t, err)
		}
		fmt.Printf("  %-20s %5d baris\n", t, n)
		total += n
	}
	fmt.Printf("\nSelesai, %d baris dipindahkan.\n", total)
	fmt.Println("Berkas unggahan tidak ikut; salin folder uploads/ secara terpisah.")
}

// pindahkan menyalin satu tabel. Kolom yang dibaca adalah irisan kolom kedua
// skema, jadi kolom yang hanya ada di salah satu sisi dilewati dengan aman.
func pindahkan(ctx context.Context, my *sql.DB, pg *pgx.Conn, nama string, paksa bool) (int, error) {
	kolomPg, boolean, identitas, err := kolomPostgres(ctx, pg, nama)
	if err != nil {
		return 0, err
	}
	kolomMy, err := kolomMySQL(my, nama)
	if err != nil {
		return 0, err
	}

	kunci := kunciUnik[nama]

	var pakai []string
	for _, k := range kolomPg {
		if !kolomMy[k] {
			continue
		}
		// Pada tabel yang ditimpa per kunci, id lama tidak dibawa: baris
		// hasil seed sudah memakai id sendiri, dan tidak ada tabel lain yang
		// menunjuk ke pengaturan.
		if kunci != "" && k == "id" {
			continue
		}
		pakai = append(pakai, k)
	}
	if len(pakai) == 0 {
		return 0, fmt.Errorf("tidak ada kolom yang cocok")
	}

	var sudah int
	if err := pg.QueryRow(ctx, "SELECT count(*) FROM "+nama).Scan(&sudah); err != nil {
		return 0, err
	}
	if sudah > 0 && !paksa && kunci == "" {
		return 0, fmt.Errorf("tabel tujuan sudah berisi %d baris; "+
			"jalankan dengan KOSONGKAN=1 untuk menggantinya, "+
			"atau PAKSA=1 untuk menambahkan di atasnya", sudah)
	}

	baris, err := my.Query("SELECT `" + strings.Join(pakai, "`,`") + "` FROM `" + nama + "`")
	if err != nil {
		return 0, err
	}
	defer baris.Close()

	tx, err := pg.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	tanda := make([]string, len(pakai))
	for i := range pakai {
		tanda[i] = fmt.Sprintf("$%d", i+1)
	}
	// Kolom id ditulis GENERATED ALWAYS AS IDENTITY, yang menolak nilai yang
	// disebutkan sendiri. Di sini id lama justru harus dipertahankan, karena
	// tabel lain menunjuk kepadanya, jadi penolakan itu dilewati dengan
	// OVERRIDING SYSTEM VALUE.
	lewati := ""
	for _, k := range pakai {
		if identitas[k] {
			lewati = " OVERRIDING SYSTEM VALUE"
			break
		}
	}
	perintah := "INSERT INTO " + nama + " (" + strings.Join(pakai, ",") + ")" + lewati +
		" VALUES (" + strings.Join(tanda, ",") + ")"

	if kunci != "" {
		var setel []string
		for _, k := range pakai {
			if k != kunci {
				setel = append(setel, k+" = EXCLUDED."+k)
			}
		}
		perintah += " ON CONFLICT (" + kunci + ") DO UPDATE SET " + strings.Join(setel, ", ")
	}

	jml := 0
	for baris.Next() {
		mentah := make([][]byte, len(pakai))
		tujuan := make([]any, len(pakai))
		for i := range mentah {
			tujuan[i] = &mentah[i]
		}
		if err := baris.Scan(tujuan...); err != nil {
			return 0, err
		}

		nilai := make([]any, len(pakai))
		for i, k := range pakai {
			if mentah[i] == nil {
				nilai[i] = nil
				continue
			}
			isi := string(mentah[i])
			if boolean[k] {
				// MySQL menyimpannya sebagai 0 atau 1; PostgreSQL menerima
				// "t" dan "f".
				if isi == "0" {
					isi = "f"
				} else {
					isi = "t"
				}
			}
			nilai[i] = isi
		}
		if _, err := tx.Exec(ctx, perintah, nilai...); err != nil {
			return 0, fmt.Errorf("baris ke-%d: %w", jml+1, err)
		}
		jml++
	}
	if err := baris.Err(); err != nil {
		return 0, err
	}

	// Kolom id memakai GENERATED ... AS IDENTITY, dan pencacahnya tidak tahu
	// bahwa baris dimasukkan beserta id-nya. Tanpa disetel ulang, pendaftaran
	// berikutnya akan memakai id 1 dan ditolak sebagai kembar.
	if kolomAda(kolomPg, "id") {
		var tertinggi int
		if err := tx.QueryRow(ctx, "SELECT COALESCE(MAX(id),0) FROM "+nama).Scan(&tertinggi); err != nil {
			return 0, err
		}
		if _, err := tx.Exec(ctx, fmt.Sprintf(
			"ALTER TABLE %s ALTER COLUMN id RESTART WITH %d", nama, tertinggi+1)); err != nil {
			return 0, err
		}
	}

	return jml, tx.Commit(ctx)
}

func kolomAda(daftar []string, nama string) bool {
	for _, k := range daftar {
		if k == nama {
			return true
		}
	}
	return false
}

func kolomPostgres(ctx context.Context, pg *pgx.Conn, tabel string) (
	urut []string, boolean, identitas map[string]bool, err error) {

	baris, err := pg.Query(ctx, `
		SELECT column_name, data_type, is_identity
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = $1
		ORDER BY ordinal_position`, tabel)
	if err != nil {
		return nil, nil, nil, err
	}
	defer baris.Close()

	boolean = map[string]bool{}
	identitas = map[string]bool{}
	for baris.Next() {
		var nama, tipe, identitasnya string
		if err := baris.Scan(&nama, &tipe, &identitasnya); err != nil {
			return nil, nil, nil, err
		}
		urut = append(urut, nama)
		if tipe == "boolean" {
			boolean[nama] = true
		}
		if identitasnya == "YES" {
			identitas[nama] = true
		}
	}
	if len(urut) == 0 {
		return nil, nil, nil, fmt.Errorf("tabel tidak ada di PostgreSQL")
	}
	return urut, boolean, identitas, baris.Err()
}

func kolomMySQL(my *sql.DB, tabel string) (map[string]bool, error) {
	baris, err := my.Query(`
		SELECT column_name FROM information_schema.columns
		WHERE table_schema = DATABASE() AND table_name = ?`, tabel)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	ada := map[string]bool{}
	for baris.Next() {
		var nama string
		if err := baris.Scan(&nama); err != nil {
			return nil, err
		}
		ada[nama] = true
	}
	if len(ada) == 0 {
		return nil, fmt.Errorf("tabel tidak ada di MySQL")
	}
	return ada, baris.Err()
}

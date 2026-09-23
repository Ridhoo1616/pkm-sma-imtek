package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func bukaBasisData(dsn string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("membuka koneksi: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Tunggu basis data siap; berguna saat dijalankan bersama container
	// yang belum selesai menyala.
	var galatTerakhir error
	for i := 0; i < 15; i++ {
		if galatTerakhir = db.Ping(); galatTerakhir == nil {
			return db, nil
		}
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("basis data tidak merespons: %w", galatTerakhir)
}

// penomoran menghitung penanda parameter untuk kueri yang syaratnya
// dirangkai saat berjalan. PostgreSQL memakai penanda bernomor seperti $1
// dan $2, bukan tanda tanya, jadi nomornya tidak dapat ditulis tetap pada
// potongan syarat yang belum tentu terpakai.
type penomoran struct{ n int }

func (p *penomoran) berikut() string {
	p.n++
	return "$" + strconv.Itoa(p.n)
}

// jalankanMigrasi menerapkan berkas .sql di folder migrations satu per satu
// dan mencatat yang sudah dijalankan, sehingga aman dipanggil berulang kali.
func jalankanMigrasi(db *sql.DB, folder string) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS migrasi (
			berkas     varchar(160) NOT NULL PRIMARY KEY,
			dijalankan timestamptz  NOT NULL DEFAULT now()
		)`); err != nil {
		return fmt.Errorf("menyiapkan tabel migrasi: %w", err)
	}

	berkas, err := filepath.Glob(filepath.Join(folder, "*.sql"))
	if err != nil {
		return err
	}
	sort.Strings(berkas)

	dasar, err := perluDijadikanDasar(db)
	if err != nil {
		return err
	}

	for _, b := range berkas {
		nama := filepath.Base(b)

		var ada string
		err := db.QueryRow("SELECT berkas FROM migrasi WHERE berkas = $1", nama).Scan(&ada)
		if err == nil {
			continue // sudah pernah dijalankan
		}
		if err != sql.ErrNoRows {
			return fmt.Errorf("memeriksa migrasi %s: %w", nama, err)
		}

		// Basis data yang sudah berisi tabel aplikasi berasal dari versi PHP
		// yang belum mengenal tabel migrasi. Skemanya sudah benar, jadi
		// migrasi awal cukup dicatat sebagai sudah diterapkan. Tanpa ini,
		// pernyataan seed akan dijalankan ulang dan menggandakan data
		// fasilitas serta berita yang tidak punya kunci unik.
		//
		// Yang dilewati HANYA migrasi pertama. Sebelumnya seluruh migrasi
		// ikut dilewati, sehingga basis data warisan versi PHP tidak pernah
		// mendapat tabel apa pun yang ditambahkan migrasi berikutnya, dan
		// aplikasinya gagal dengan galat "relation does not exist".
		if dasar && nama == filepath.Base(berkas[0]) {
			log.Printf("melewati migrasi %s: basis data sudah berisi skema aplikasi", nama)
			if _, err := db.Exec("INSERT INTO migrasi (berkas) VALUES ($1)", nama); err != nil {
				return fmt.Errorf("mencatat migrasi %s: %w", nama, err)
			}
			continue
		}

		isi, err := os.ReadFile(b)
		if err != nil {
			return fmt.Errorf("membaca %s: %w", nama, err)
		}

		log.Printf("menjalankan migrasi %s", nama)
		for _, perintah := range pecahPerintahSQL(string(isi)) {
			if _, err := db.Exec(perintah); err != nil {
				return fmt.Errorf("migrasi %s gagal: %w", nama, err)
			}
		}
		if _, err := db.Exec("INSERT INTO migrasi (berkas) VALUES ($1)", nama); err != nil {
			return fmt.Errorf("mencatat migrasi %s: %w", nama, err)
		}
	}
	return nil
}

// perluDijadikanDasar menjawab apakah basis data ini sudah berisi skema
// aplikasi padahal belum punya catatan migrasi sama sekali.
func perluDijadikanDasar(db *sql.DB) (bool, error) {
	var jumlahCatatan int
	if err := db.QueryRow("SELECT COUNT(*) FROM migrasi").Scan(&jumlahCatatan); err != nil {
		return false, fmt.Errorf("membaca catatan migrasi: %w", err)
	}
	if jumlahCatatan > 0 {
		return false, nil
	}

	var adaTabel int
	if err := db.QueryRow(`SELECT COUNT(*) FROM information_schema.tables
	                        WHERE table_schema = current_schema() AND table_name = 'pendaftar'`).
		Scan(&adaTabel); err != nil {
		return false, fmt.Errorf("memeriksa skema yang sudah ada: %w", err)
	}
	return adaTabel > 0, nil
}

// pecahPerintahSQL memisahkan berkas SQL menjadi perintah-perintah tunggal.
// Titik koma di dalam tanda kutip maupun di dalam blok bertanda dolar tidak
// dianggap pemisah. Blok bertanda dolar penting untuk PostgreSQL, karena badan
// fungsi plpgsql ditulis di antara $$ dan berisi titik koma sendiri.
func pecahPerintahSQL(isi string) []string {
	var hasil []string
	var b strings.Builder
	var kutip rune
	var tanda string // tanda pembuka blok dolar yang sedang berjalan
	lolos := false

	r := []rune(isi)
	for i := 0; i < len(r); i++ {
		c := r[i]

		// Di dalam blok bertanda dolar, hanya tanda penutup yang sama yang
		// mengakhirinya. Isinya diambil apa adanya.
		if tanda != "" {
			if c == '$' {
				if t, panjang := bacaTandaDolar(r, i); t == tanda {
					b.WriteString(tanda)
					i += panjang - 1
					tanda = ""
					continue
				}
			}
			b.WriteRune(c)
			continue
		}

		if kutip != 0 {
			b.WriteRune(c)
			switch {
			case lolos:
				lolos = false
			case c == '\\':
				lolos = true
			case c == kutip:
				kutip = 0
			}
			continue
		}

		switch c {
		case '$':
			if t, panjang := bacaTandaDolar(r, i); t != "" {
				b.WriteString(t)
				i += panjang - 1
				tanda = t
				continue
			}
			b.WriteRune(c)
		case '\'', '"':
			kutip = c
			b.WriteRune(c)
		case ';':
			if p := bersihkanPerintah(b.String()); p != "" {
				hasil = append(hasil, p)
			}
			b.Reset()
		default:
			b.WriteRune(c)
		}
	}
	if p := bersihkanPerintah(b.String()); p != "" {
		hasil = append(hasil, p)
	}
	return hasil
}

// bacaTandaDolar mengenali tanda pembuka blok seperti $$ atau $badan$ pada
// posisi i. Mengembalikan tandanya beserta panjangnya, atau string kosong
// bila yang ada di sana bukan tanda blok.
func bacaTandaDolar(r []rune, i int) (string, int) {
	if r[i] != '$' {
		return "", 0
	}
	j := i + 1
	for j < len(r) && (r[j] == '_' ||
		(r[j] >= 'a' && r[j] <= 'z') || (r[j] >= 'A' && r[j] <= 'Z') ||
		(j > i+1 && r[j] >= '0' && r[j] <= '9')) {
		j++
	}
	if j < len(r) && r[j] == '$' {
		return string(r[i : j+1]), j + 1 - i
	}
	return "", 0
}

// bersihkanPerintah membuang baris komentar dan spasi berlebih. Perintah yang
// hanya berisi komentar dibuang seluruhnya.
func bersihkanPerintah(s string) string {
	var baris []string
	for _, l := range strings.Split(s, "\n") {
		t := strings.TrimSpace(l)
		if t == "" || strings.HasPrefix(t, "--") {
			continue
		}
		baris = append(baris, l)
	}
	return strings.TrimSpace(strings.Join(baris, "\n"))
}

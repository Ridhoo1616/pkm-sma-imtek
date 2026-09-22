package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

func bukaBasisData(dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
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

// jalankanMigrasi menerapkan berkas .sql di folder migrations satu per satu
// dan mencatat yang sudah dijalankan, sehingga aman dipanggil berulang kali.
func jalankanMigrasi(db *sql.DB, folder string) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS migrasi (
			berkas     VARCHAR(160) NOT NULL PRIMARY KEY,
			dijalankan DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`); err != nil {
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
		err := db.QueryRow("SELECT berkas FROM migrasi WHERE berkas = ?", nama).Scan(&ada)
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
		if dasar {
			log.Printf("melewati migrasi %s: basis data sudah berisi skema aplikasi", nama)
			if _, err := db.Exec("INSERT INTO migrasi (berkas) VALUES (?)", nama); err != nil {
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
		if _, err := db.Exec("INSERT INTO migrasi (berkas) VALUES (?)", nama); err != nil {
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
	                        WHERE table_schema = DATABASE() AND table_name = 'pendaftar'`).
		Scan(&adaTabel); err != nil {
		return false, fmt.Errorf("memeriksa skema yang sudah ada: %w", err)
	}
	return adaTabel > 0, nil
}

// pecahPerintahSQL memisahkan berkas SQL menjadi perintah-perintah tunggal.
// Titik koma di dalam tanda kutip tidak dianggap pemisah.
func pecahPerintahSQL(isi string) []string {
	var hasil []string
	var b strings.Builder
	var kutip rune
	lolos := false

	for _, r := range isi {
		if kutip != 0 {
			b.WriteRune(r)
			switch {
			case lolos:
				lolos = false
			case r == '\\':
				lolos = true
			case r == kutip:
				kutip = 0
			}
			continue
		}
		switch r {
		case '\'', '"', '`':
			kutip = r
			b.WriteRune(r)
		case ';':
			if p := bersihkanPerintah(b.String()); p != "" {
				hasil = append(hasil, p)
			}
			b.Reset()
		default:
			b.WriteRune(r)
		}
	}
	if p := bersihkanPerintah(b.String()); p != "" {
		hasil = append(hasil, p)
	}
	return hasil
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

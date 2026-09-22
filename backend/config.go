package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
)

// Konfigurasi dibaca dari variabel lingkungan supaya aplikasi ini dapat
// dijalankan di mana saja tanpa mengubah kode: komputer sendiri, VPS,
// maupun layanan seperti Railway atau Render.
type Konfigurasi struct {
	Alamat        string // alamat dan porta yang didengarkan, contoh ":8090"
	DSN           string // sumber data MySQL
	RahasiaToken  []byte // kunci penanda tangan token masuk
	AsalDiizinkan []string
	FolderUnggah  string
	BatasUnggah   int64
	Produksi      bool
}

func lingkungan(kunci, bawaan string) string {
	if v := strings.TrimSpace(os.Getenv(kunci)); v != "" {
		return v
	}
	return bawaan
}

func muatKonfigurasi() Konfigurasi {
	dbHost := lingkungan("DB_HOST", "127.0.0.1")
	dbPort := lingkungan("DB_PORT", "3306")
	dbNama := lingkungan("DB_NAME", "sma_imtek")
	dbUser := lingkungan("DB_USER", "root")
	dbSandi := lingkungan("DB_PASS", "")

	// DSN lengkap boleh diberikan langsung; berguna pada layanan yang
	// menyediakan satu variabel berisi seluruh kredensial.
	dsn := lingkungan("DATABASE_URL", "")
	if dsn == "" {
		dsn = fmt.Sprintf(
			"%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci&loc=Asia%%2FJakarta",
			dbUser, dbSandi, dbHost, dbPort, dbNama,
		)
	}

	rahasia := lingkungan("JWT_SECRET", "")
	produksi := lingkungan("APP_ENV", "pengembangan") == "produksi"
	if rahasia == "" {
		if produksi {
			log.Fatal("JWT_SECRET wajib diisi saat APP_ENV=produksi")
		}
		// Hanya untuk pengembangan di komputer sendiri.
		rahasia = "kunci-pengembangan-jangan-dipakai-di-produksi"
	}

	batas, err := strconv.ParseInt(lingkungan("UPLOAD_MAX_BYTES", "2097152"), 10, 64)
	if err != nil || batas <= 0 {
		batas = 2 << 20 // 2 MB, sama dengan versi PHP
	}

	// Peramban menganggap "localhost" dan "127.0.0.1" sebagai dua asal yang
	// berbeda, jadi keduanya diizinkan secara bawaan agar frontend berjalan
	// tanpa penyetelan tambahan di komputer sendiri.
	asal := []string{}
	for _, a := range strings.Split(
		lingkungan("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"), ",") {
		if a = strings.TrimSpace(a); a != "" {
			asal = append(asal, a)
		}
	}

	return Konfigurasi{
		Alamat:        ":" + lingkungan("PORT", "8090"),
		DSN:           dsn,
		RahasiaToken:  []byte(rahasia),
		AsalDiizinkan: asal,
		FolderUnggah:  lingkungan("UPLOAD_DIR", "data/unggahan"),
		BatasUnggah:   batas,
		Produksi:      produksi,
	}
}

package main

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// Konfigurasi dibaca dari variabel lingkungan supaya aplikasi ini dapat
// dijalankan di mana saja tanpa mengubah kode: komputer sendiri, VPS,
// maupun layanan seperti Railway atau Render.
type Konfigurasi struct {
	Alamat        string // alamat dan porta yang didengarkan, contoh ":8090"
	DSN           string // sumber data PostgreSQL
	RahasiaToken  []byte // kunci penanda tangan token masuk
	AsalDiizinkan []string
	FolderUnggah  string
	BatasUnggah   int64
	Produksi      bool

	// Gateway WhatsApp. Kosong berarti pengiriman otomatis tidak aktif, dan
	// panitia mengirim sendiri lewat tautan wa.me. Lihat notifikasi.go untuk
	// alasan kenapa yang otomatis tidak dijadikan bawaan.
	WaGatewayURL   string
	WaGatewayToken string
	// Nama medan pada badan permintaan gateway. Tiap penyedia memakai nama
	// yang berbeda, jadi dibuat dapat disetel tanpa mengubah kode.
	WaMedanTujuan string
	WaMedanPesan  string
}

// muatBerkasEnv membaca berkas .env di sebelah program dan menyetel
// variabel lingkungan dari isinya. Variabel yang SUDAH ada di lingkungan
// tidak ditimpa, karena layanan hosting menyuntikkan kredensialnya lewat
// lingkungan dan nilai itu harus menang atas berkas yang mungkin tertinggal.
//
// Berkasnya ditulis sendiri, bukan memakai pustaka luar, karena bentuknya
// hanya "KUNCI=nilai" per baris. Tanda # mengawali komentar, dan tanda
// kutip di kedua ujung nilai dibuang.
func muatBerkasEnv(jalur string) {
	isi, err := os.ReadFile(jalur)
	if err != nil {
		// Tidak adanya berkas .env bukan kesalahan: di produksi seluruh
		// konfigurasi memang datang dari lingkungan.
		return
	}
	for _, baris := range strings.Split(string(isi), "\n") {
		baris = strings.TrimSpace(baris)
		if baris == "" || strings.HasPrefix(baris, "#") {
			continue
		}
		kunci, nilai, ada := strings.Cut(baris, "=")
		if !ada {
			continue
		}
		kunci = strings.TrimSpace(kunci)
		nilai = strings.TrimSpace(nilai)
		if len(nilai) >= 2 && (nilai[0] == '"' || nilai[0] == '\'') && nilai[len(nilai)-1] == nilai[0] {
			nilai = nilai[1 : len(nilai)-1]
		}
		if kunci == "" {
			continue
		}
		if _, sudahAda := os.LookupEnv(kunci); sudahAda {
			continue
		}
		os.Setenv(kunci, nilai)
	}
}

func lingkungan(kunci, bawaan string) string {
	if v := strings.TrimSpace(os.Getenv(kunci)); v != "" {
		return v
	}
	return bawaan
}

func muatKonfigurasi() Konfigurasi {
	muatBerkasEnv(".env")

	dbHost := lingkungan("DB_HOST", "127.0.0.1")
	dbPort := lingkungan("DB_PORT", "5432")
	dbNama := lingkungan("DB_NAME", "sma_imtek")
	dbUser := lingkungan("DB_USER", "postgres")
	dbSandi := lingkungan("DB_PASS", "")

	// DSN lengkap boleh diberikan langsung; berguna pada layanan yang
	// menyediakan satu variabel berisi seluruh kredensial, dan itu memang
	// bentuk yang dipakai hampir semua penyedia PostgreSQL.
	dsn := lingkungan("DATABASE_URL", "")
	if dsn == "" {
		// TimeZone disetel supaya jam pendaftaran yang dibaca kembali dari
		// basis data sama dengan jam yang dilihat panitia.
		sslMode := lingkungan("DB_SSLMODE", "disable")
		dsn = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=%s&TimeZone=Asia%%2FJakarta",
			url.QueryEscape(dbUser), url.QueryEscape(dbSandi),
			dbHost, dbPort, dbNama, sslMode,
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

	waGateway := lingkungan("WA_GATEWAY_URL", "")
	if waGateway != "" && !gatewaySah(waGateway) {
		// Pesan notifikasi memuat nama dan nomor telepon orang tua. Mengirim
		// data itu tanpa TLS berarti membocorkannya di sepanjang jalur.
		//
		// Kecualinya localhost: gateway WhatsApp sering dijalankan sebagai
		// proses terpisah di server yang sama, dan lalu lintas yang tidak
		// pernah meninggalkan mesin itu tidak melewati jaringan mana pun.
		log.Fatal("WA_GATEWAY_URL harus memakai https, kecuali bila menunjuk ke localhost")
	}

	return Konfigurasi{
		Alamat:         ":" + lingkungan("PORT", "8090"),
		DSN:            dsn,
		RahasiaToken:   []byte(rahasia),
		AsalDiizinkan:  asal,
		FolderUnggah:   lingkungan("UPLOAD_DIR", "data/unggahan"),
		BatasUnggah:    batas,
		WaGatewayURL:   waGateway,
		WaGatewayToken: lingkungan("WA_GATEWAY_TOKEN", ""),
		WaMedanTujuan:  lingkungan("WA_MEDAN_TUJUAN", "to"),
		WaMedanPesan:   lingkungan("WA_MEDAN_PESAN", "message"),
		Produksi:       produksi,
	}
}

// gatewaySah menerima https ke mana pun, atau http yang menunjuk ke mesin
// yang sama.
func gatewaySah(alamat string) bool {
	u, err := url.Parse(alamat)
	if err != nil || u.Host == "" {
		return false
	}
	if u.Scheme == "https" {
		return true
	}
	if u.Scheme != "http" {
		return false
	}
	tuan := u.Hostname()
	return tuan == "localhost" || tuan == "127.0.0.1" || tuan == "::1"
}

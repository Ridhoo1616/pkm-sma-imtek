package main

import (
	"context"
	"database/sql"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Aplikasi struct {
	cfg Konfigurasi
	db  *sql.DB
	log *log.Logger

	pembatas      *pembatasMasuk
	kunciPembatas sync.Mutex

	// batas menahan permintaan berlebihan pada rute publik, termasuk
	// penebakan tanggal lahir pada rute yang menyerahkan data pendaftar.
	batas *pembatasPublik

	// Pengaturan berubah sangat jarang tetapi dibaca hampir di setiap
	// permintaan, jadi disimpan di memori dan disegarkan setelah diubah.
	pengaturan      map[string]string
	kunciPengaturan sync.RWMutex
}

func aplikasiBaru(cfg Konfigurasi, db *sql.DB, l *log.Logger) (*Aplikasi, error) {
	a := &Aplikasi{
		cfg:      cfg,
		db:       db,
		log:      l,
		pembatas: pembatasBaru(),
		batas:    pembatasPublikBaru(),
	}
	if err := a.muatPengaturan(); err != nil {
		return nil, err
	}
	return a, nil
}

/* ---------------- pengaturan ---------------- */

func (a *Aplikasi) muatPengaturan() error {
	baris, err := a.db.Query("SELECT nama_setting, nilai FROM pengaturan")
	if err != nil {
		return err
	}
	defer baris.Close()

	isi := map[string]string{}
	for baris.Next() {
		var nama string
		var nilai sql.NullString
		if err := baris.Scan(&nama, &nilai); err != nil {
			return err
		}
		isi[nama] = nilai.String
	}
	if err := baris.Err(); err != nil {
		return err
	}

	a.kunciPengaturan.Lock()
	a.pengaturan = isi
	a.kunciPengaturan.Unlock()
	return nil
}

func (a *Aplikasi) atur(kunci string, bawaan ...string) string {
	a.kunciPengaturan.RLock()
	nilai, ada := a.pengaturan[kunci]
	a.kunciPengaturan.RUnlock()
	if !ada || nilai == "" {
		if len(bawaan) > 0 {
			return bawaan[0]
		}
	}
	return nilai
}

// ppdbDibuka menyatukan tiga syarat seperti versi PHP: status harus "buka",
// dan hari ini harus berada di dalam rentang tanggal pendaftaran.
func (a *Aplikasi) ppdbDibuka() bool {
	return a.keadaanPpdb() == KeadaanPpdbDibuka
}

// Keadaan PPDB. Yang tertutup dipecah menjadi TIGA, sebab maknanya berbeda
// dan kalimat yang pantas untuk pengunjung juga berbeda.
//
// Sebelumnya yang tersedia hanya boolean, dan halaman publik memakai satu
// kalimat untuk ketiganya: "Segera Dibuka, mulai {ppdb_mulai}". Pada
// pendaftaran yang ditutup manual atau yang tanggalnya sudah lewat, kalimat
// itu menjanjikan tanggal yang sudah berlalu — dan itu tampil bersebelahan
// dengan judul "Pendaftaran Belum Dibuka" pada halaman yang sama.
const (
	KeadaanPpdbDibuka  = "dibuka"
	KeadaanPpdbBelum   = "belum_mulai"
	KeadaanPpdbSelesai = "sudah_selesai"
	KeadaanPpdbDitutup = "ditutup"
)

/*
keadaanPpdb menyatukan ketiga syarat menjadi satu keadaan.

Urutan pemeriksaannya penting. Tanggal diperiksa LEBIH DULU daripada saklar
`ppdb_status`, sebab tanggal yang sudah lewat lebih menerangkan daripada
saklar: sekolah yang lupa menutup saklarnya sesudah tanggal selesai tetap
mendapat kalimat "sudah ditutup pada ...", bukan "sedang tidak dibuka".
*/
func (a *Aplikasi) keadaanPpdb() string {
	return keadaanPpdbDari(
		a.atur("ppdb_status", "tutup"),
		a.atur("ppdb_mulai"),
		a.atur("ppdb_selesai"),
		time.Now().Format("2006-01-02"),
	)
}

// keadaanPpdbDari memuat aturannya sendiri, terpisah dari pembacaan
// pengaturan dan dari jam, supaya dapat diuji tanpa basis data.
func keadaanPpdbDari(status, mulai, selesai, hariIni string) string {
	if selesai != "" && hariIni > selesai {
		return KeadaanPpdbSelesai
	}
	if mulai != "" && hariIni < mulai {
		return KeadaanPpdbBelum
	}
	if status != "buka" {
		return KeadaanPpdbDitutup
	}
	return KeadaanPpdbDibuka
}

/* ---------------- pembantu ---------------- */

// galatServer mencatat penyebab sebenarnya ke log server dan hanya
// mengirimkan pesan umum ke pemanggil, agar rincian basis data tidak bocor.
func (a *Aplikasi) galatServer(w http.ResponseWriter, saat string, err error) {
	a.log.Printf("galat saat %s: %v", saat, err)
	pesan := "Terjadi gangguan di server. Silakan coba lagi beberapa saat."
	if !a.cfg.Produksi {
		pesan += " (" + saat + ": " + err.Error() + ")"
	}
	kirimGalat(w, http.StatusInternalServerError, pesan)
}

// alamatPemanggil mengembalikan alamat IP pemanggil.
//
// X-Forwarded-For HANYA dipercaya bila permintaannya datang dari jaringan
// tepercaya, yaitu tempat proksi baliknya berada. Sebelumnya kepala itu
// dipakai apa adanya dengan alasan "hanya untuk pembatas laju", dan justru di
// situ salahnya: siapa pun dapat mengirim X-Forwarded-For berisi angka acak
// pada setiap permintaan, sehingga setiap permintaan terhitung berasal dari
// alamat yang berbeda dan SELURUH pembatas laju menjadi tidak berarti,
// termasuk pembatas percobaan masuk panel.
//
// Di belakang proksi balik, r.RemoteAddr selalu alamat proksinya sendiri
// (127.0.0.1), jadi tanpa membaca kepala itu seluruh pengunjung akan
// terhitung sebagai satu alamat. Keduanya salah, dan yang benar membaca
// kepalanya hanya dari pengirim yang memang berhak mengisinya.
func alamatPemanggil(r *http.Request) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	alamat := net.ParseIP(ip)
	if alamat == nil || !tepercaya(alamat) {
		return ip
	}
	// Rantai X-Forwarded-For ditulis proksi paling belakang di paling kanan.
	// Yang diambil yang paling kanan TETAPI di luar jaringan tepercaya, sebab
	// bagian kiri rantainya dapat diisi pemanggil sendiri.
	bagian := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	for i := len(bagian) - 1; i >= 0; i-- {
		calon := net.ParseIP(strings.TrimSpace(bagian[i]))
		if calon == nil {
			continue
		}
		if !tepercaya(calon) {
			return calon.String()
		}
	}
	if x := strings.TrimSpace(r.Header.Get("X-Real-IP")); x != "" {
		if calon := net.ParseIP(x); calon != nil {
			return calon.String()
		}
	}
	return ip
}

/* ---------------- lapisan tengah ---------------- */

/*
kepalaKeamanan memasang kepala keamanan pada setiap jawaban API.

Sebelumnya tidak ada satu pun. Yang dipasang di sini untuk JAWABAN API, dan
sengaja berbeda dari kepala pada halaman Next: yang keluar dari sini JSON, PDF,
dan berkas unggahan, bukan halaman yang menjalankan skrip.

  - nosniff menutup tebak-menebak jenis berkas. Dokumen pendaftar diunggah
    orang luar; tanpa kepala ini, berkas yang isinya HTML dapat terbaca sebagai
    halaman dan berjalan pada asal backend.
  - Kerangka CSP-nya paling sempit yang mungkin: jawaban API tidak pernah boleh
    memuat apa pun. object-src dan frame-src TIDAK dilonggarkan di sini, sebab
    PDF-nya tidak pernah dibuka langsung dari asal ini; frontend memintanya
    lewat fetch lalu membukanya sebagai blob pada asalnya sendiri.
  - X-Frame-Options DENY beserta frame-ancestors 'none': tidak ada jawaban API
    yang pantas dibingkai halaman lain.
  - Referrer-Policy no-referrer, bukan strict-origin: alamat API memuat nomor
    registrasi dan id pendaftar pada jalurnya, dan itu tidak boleh ikut
    terkirim ke situs lain.
  - HSTS hanya saat produksi. Pada http ia diabaikan peramban, dan menyetelnya
    saat di komputer sendiri membuat peramban menolak http://localhost sesudah
    sekali menerimanya.
*/
func (a *Aplikasi) kepalaKeamanan(berikut http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy",
			"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
		h.Set("Cross-Origin-Resource-Policy", "cross-origin")
		if a.cfg.Produksi {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		berikut.ServeHTTP(w, r)
	})
}

type kunciKonteks string

const kunciPengguna kunciKonteks = "pengguna"

func penggunaDari(r *http.Request) IsiToken {
	if isi, ok := r.Context().Value(kunciPengguna).(IsiToken); ok {
		return isi
	}
	return IsiToken{}
}

// wajibMasuk menolak permintaan tanpa token yang sah, lalu menyelipkan
// identitas pemanggil ke dalam konteks permintaan.
func (a *Aplikasi) wajibMasuk(berikut http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		kepala := r.Header.Get("Authorization")
		if !strings.HasPrefix(kepala, "Bearer ") {
			kirimGalat(w, http.StatusUnauthorized, "Anda harus masuk terlebih dahulu.")
			return
		}
		isi, err := periksaToken(a.cfg.RahasiaToken, strings.TrimPrefix(kepala, "Bearer "))
		if err != nil {
			kirimGalat(w, http.StatusUnauthorized, err.Error())
			return
		}
		// Peran diperiksa di sini, bukan hanya tanda tangannya. Token peserta
		// tes seleksi ditandatangani dengan kunci yang sama, jadi tanpa
		// pemeriksaan ini seorang peserta dapat memakai token ujiannya untuk
		// membuka data seluruh pendaftar.
		if isi.Role != "admin" && isi.Role != "operator" {
			kirimGalat(w, http.StatusForbidden,
				"Token ini bukan token petugas, jadi tidak berlaku untuk panel panitia.")
			return
		}
		berikut(w, r.WithContext(context.WithValue(r.Context(), kunciPengguna, isi)))
	}
}

// wajibAdmin dipakai untuk tindakan yang hanya boleh dilakukan admin penuh,
// seperti mengelola pengguna dan mengubah pengaturan sekolah.
func (a *Aplikasi) wajibAdmin(berikut http.HandlerFunc) http.HandlerFunc {
	return a.wajibMasuk(func(w http.ResponseWriter, r *http.Request) {
		if penggunaDari(r).Role != "admin" {
			kirimGalat(w, http.StatusForbidden,
				"Menu ini hanya dapat diakses oleh admin.")
			return
		}
		berikut(w, r)
	})
}

// lintasAsal memasang kepala CORS. Frontend Next.js berjalan pada asal yang
// berbeda dari API, jadi asalnya harus disebutkan satu per satu — bukan "*",
// karena permintaan membawa token.
func (a *Aplikasi) lintasAsal(berikut http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		asal := r.Header.Get("Origin")
		if asal != "" && adaDalam(a.cfg.AsalDiizinkan, asal) {
			w.Header().Set("Access-Control-Allow-Origin", asal)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		berikut.ServeHTTP(w, r)
	})
}

// catatPermintaan menulis satu baris log per permintaan: metode, jalur, status,
// dan lamanya. Cukup untuk menelusuri masalah tanpa pustaka tambahan.
func (a *Aplikasi) catatPermintaan(berikut http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mulai := time.Now()
		p := &perekamStatus{ResponseWriter: w, status: http.StatusOK}
		berikut.ServeHTTP(p, r)
		a.log.Printf("%s %s %d %s", r.Method, r.URL.Path, p.status, time.Since(mulai).Round(time.Millisecond))
	})
}

type perekamStatus struct {
	http.ResponseWriter
	status int
}

func (p *perekamStatus) WriteHeader(kode int) {
	p.status = kode
	p.ResponseWriter.WriteHeader(kode)
}

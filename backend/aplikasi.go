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

	// Pengaturan berubah sangat jarang tetapi dibaca hampir di setiap
	// permintaan, jadi disimpan di memori dan disegarkan setelah diubah.
	pengaturan      map[string]string
	kunciPengaturan sync.RWMutex
}

func aplikasiBaru(cfg Konfigurasi, db *sql.DB, l *log.Logger) (*Aplikasi, error) {
	a := &Aplikasi{cfg: cfg, db: db, log: l, pembatas: pembatasBaru()}
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
	if a.atur("ppdb_status", "tutup") != "buka" {
		return false
	}
	hariIni := time.Now().Format("2006-01-02")
	if m := a.atur("ppdb_mulai"); m != "" && hariIni < m {
		return false
	}
	if s := a.atur("ppdb_selesai"); s != "" && hariIni > s {
		return false
	}
	return true
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

func alamatPemanggil(r *http.Request) string {
	// X-Forwarded-For hanya berarti bila ada proksi tepercaya di depan
	// aplikasi; nilainya dipakai apa adanya karena hanya untuk pembatas laju.
	if maju := r.Header.Get("X-Forwarded-For"); maju != "" {
		return strings.TrimSpace(strings.Split(maju, ",")[0])
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

/* ---------------- lapisan tengah ---------------- */

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

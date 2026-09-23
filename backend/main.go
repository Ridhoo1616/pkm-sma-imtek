package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

func main() {
	catat := log.New(os.Stdout, "", log.LstdFlags)
	cfg := muatKonfigurasi()

	db, err := bukaBasisData(cfg.DSN)
	if err != nil {
		catat.Fatalf("tidak dapat terhubung ke basis data: %v", err)
	}
	defer db.Close()

	if err := jalankanMigrasi(db, "migrations"); err != nil {
		catat.Fatalf("migrasi gagal: %v", err)
	}

	app, err := aplikasiBaru(cfg, db, catat)
	if err != nil {
		catat.Fatalf("aplikasi gagal disiapkan: %v", err)
	}

	server := &http.Server{
		Addr:              cfg.Alamat,
		Handler:           app.rute(),
		ReadHeaderTimeout: 10 * time.Second,
		// Unggahan enam dokumen pada koneksi lambat butuh waktu, jadi batas
		// tulis-baca dibuat longgar tetapi tetap ada.
		ReadTimeout:  5 * time.Minute,
		WriteTimeout: 5 * time.Minute,
		IdleTimeout:  2 * time.Minute,
	}

	// Server dimatikan dengan rapi ketika menerima sinyal berhenti, supaya
	// permintaan yang sedang berjalan (termasuk unggahan) tidak terpotong.
	berhenti := make(chan os.Signal, 1)
	signal.Notify(berhenti, os.Interrupt, syscall.SIGTERM)

	go func() {
		catat.Printf("server berjalan di %s (lingkungan: %s)", cfg.Alamat, lingkunganTeks(cfg))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			catat.Fatalf("server berhenti: %v", err)
		}
	}()

	<-berhenti
	catat.Println("menutup server...")
	konteks, batal := context.WithTimeout(context.Background(), 20*time.Second)
	defer batal()
	if err := server.Shutdown(konteks); err != nil {
		catat.Printf("server tidak menutup dengan rapi: %v", err)
	}
	catat.Println("server berhenti.")
}

func lingkunganTeks(cfg Konfigurasi) string {
	if cfg.Produksi {
		return "produksi"
	}
	return "pengembangan"
}

// rute menyusun seluruh alamat API. Pola "METODE /jalur" adalah kemampuan
// perutean pustaka standar Go, jadi tidak perlu pustaka router tambahan.
func (a *Aplikasi) rute() http.Handler {
	m := http.NewServeMux()

	/* ---- umum ---- */
	m.HandleFunc("GET /api/sehat", func(w http.ResponseWriter, r *http.Request) {
		status := "baik"
		kode := http.StatusOK
		if err := a.db.Ping(); err != nil {
			status, kode = "basis data tidak terjangkau", http.StatusServiceUnavailable
		}
		kirimJSON(w, kode, map[string]string{"status": status})
	})

	/* ---- halaman publik ---- */
	m.HandleFunc("GET /api/profil", a.tanganiProfil)
	m.HandleFunc("GET /api/jurusan", a.tanganiJurusanPublik)
	m.HandleFunc("GET /api/fasilitas", a.tanganiFasilitasPublik)
	m.HandleFunc("GET /api/berita", a.tanganiBeritaPublik)
	m.HandleFunc("GET /api/berita/{slug}", a.tanganiBeritaDetail)
	m.HandleFunc("GET /api/galeri", a.tanganiGaleriPublik)
	m.HandleFunc("POST /api/pesan", a.tanganiKirimPesan)
	m.HandleFunc("GET /api/biaya", a.tanganiBiayaPublik)

	/* ---- PPDB ---- */
	m.HandleFunc("POST /api/ppdb/daftar", a.tanganiDaftar)
	m.HandleFunc("POST /api/ppdb/cek", a.tanganiCekStatus)
	m.HandleFunc("POST /api/ppdb/bukti", a.tanganiBuktiPendaftar)
	m.HandleFunc("POST /api/ppdb/kartu", a.tanganiKartuPendaftar)

	/* ---- tes seleksi online ----
	   Peserta tidak punya akun. Jalur /mulai memakai nomor registrasi beserta
	   tanggal lahir, lalu menerbitkan token berperan "peserta" yang hanya
	   berlaku untuk tiga jalur di bawahnya. */
	m.HandleFunc("GET /api/ppdb/ujian", a.tanganiInfoUjian)
	m.HandleFunc("POST /api/ppdb/ujian/mulai", a.tanganiMulaiUjian)
	m.HandleFunc("GET /api/ppdb/ujian/soal", a.wajibPeserta(a.tanganiSoalUjian))
	m.HandleFunc("PATCH /api/ppdb/ujian/jawab", a.wajibPeserta(a.tanganiJawabUjian))
	m.HandleFunc("POST /api/ppdb/ujian/selesai", a.wajibPeserta(a.tanganiSelesaikanUjian))

	/* ---- autentikasi ---- */
	m.HandleFunc("POST /api/masuk", a.tanganiMasuk)
	m.HandleFunc("GET /api/saya", a.wajibMasuk(a.tanganiSayaSiapa))
	m.HandleFunc("POST /api/saya/sandi", a.wajibMasuk(a.tanganiGantiSandi))

	/* ---- dasbor & pendaftar ---- */
	m.HandleFunc("GET /api/admin/dasbor", a.wajibMasuk(a.tanganiDasbor))
	m.HandleFunc("GET /api/admin/pendaftar", a.wajibMasuk(a.tanganiDaftarPendaftar))
	m.HandleFunc("GET /api/admin/pendaftar/ekspor", a.wajibMasuk(a.tanganiEksporPendaftar))
	m.HandleFunc("GET /api/admin/pendaftar/{id}", a.wajibMasuk(a.tanganiDetailPendaftar))
	m.HandleFunc("PATCH /api/admin/pendaftar/{id}/status", a.wajibMasuk(a.tanganiUbahStatus))
	m.HandleFunc("GET /api/admin/pendaftar/{id}/bukti", a.wajibMasuk(a.tanganiBuktiAdmin))
	m.HandleFunc("GET /api/admin/pendaftar/{id}/kartu", a.wajibMasuk(a.tanganiKartuAdmin))
	m.HandleFunc("PATCH /api/admin/pendaftar/{id}/ruang", a.wajibMasuk(a.tanganiUbahRuangUjian))
	// Menghapus data pendaftar berarti menghapus dokumen pribadinya juga,
	// jadi hanya admin penuh yang boleh.
	m.HandleFunc("DELETE /api/admin/pendaftar/{id}", a.wajibAdmin(a.tanganiHapusPendaftar))
	m.HandleFunc("GET /api/admin/laporan", a.wajibMasuk(a.tanganiLaporan))

	/* ---- jurusan ---- */
	m.HandleFunc("GET /api/admin/jurusan", a.wajibMasuk(a.tanganiJurusanAdmin))
	m.HandleFunc("POST /api/admin/jurusan", a.wajibAdmin(a.tanganiSimpanJurusan))
	m.HandleFunc("PUT /api/admin/jurusan/{id}", a.wajibAdmin(a.tanganiUbahJurusan))
	m.HandleFunc("DELETE /api/admin/jurusan/{id}", a.wajibAdmin(a.tanganiHapusJurusan))

	/* ---- berita ---- */
	m.HandleFunc("GET /api/admin/berita", a.wajibMasuk(a.tanganiBeritaAdmin))
	m.HandleFunc("POST /api/admin/berita", a.wajibMasuk(a.tanganiSimpanBerita))
	m.HandleFunc("PUT /api/admin/berita/{id}", a.wajibMasuk(a.tanganiUbahBerita))
	m.HandleFunc("DELETE /api/admin/berita/{id}", a.wajibMasuk(a.tanganiHapusBerita))

	/* ---- galeri ---- */
	m.HandleFunc("POST /api/admin/galeri", a.wajibMasuk(a.tanganiSimpanGaleri))
	m.HandleFunc("PUT /api/admin/galeri/{id}", a.wajibMasuk(a.tanganiUbahGaleri))
	m.HandleFunc("DELETE /api/admin/galeri/{id}", a.wajibMasuk(a.tanganiHapusGaleri))

	/* ---- fasilitas ---- */
	m.HandleFunc("POST /api/admin/fasilitas", a.wajibMasuk(a.tanganiSimpanFasilitas))
	m.HandleFunc("PUT /api/admin/fasilitas/{id}", a.wajibMasuk(a.tanganiUbahFasilitas))
	m.HandleFunc("DELETE /api/admin/fasilitas/{id}", a.wajibMasuk(a.tanganiHapusFasilitas))

	/* ---- rincian biaya ---- */
	m.HandleFunc("GET /api/admin/biaya", a.wajibMasuk(a.tanganiDaftarBiayaAdmin))
	// Besaran biaya adalah keputusan sekolah, bukan pekerjaan operator
	// harian, jadi dibatasi admin penuh seperti halnya Pengaturan.
	m.HandleFunc("POST /api/admin/biaya", a.wajibAdmin(a.tanganiSimpanBiaya))
	m.HandleFunc("PUT /api/admin/biaya/{id}", a.wajibAdmin(a.tanganiUbahBiaya))
	m.HandleFunc("DELETE /api/admin/biaya/{id}", a.wajibAdmin(a.tanganiHapusBiaya))

	/* ---- bank soal dan paket ujian ---- */
	m.HandleFunc("GET /api/admin/soal", a.wajibMasuk(a.tanganiDaftarSoal))
	m.HandleFunc("POST /api/admin/soal", a.wajibMasuk(a.tanganiSimpanSoal))
	m.HandleFunc("PUT /api/admin/soal/{id}", a.wajibMasuk(a.tanganiUbahSoal))
	m.HandleFunc("DELETE /api/admin/soal/{id}", a.wajibMasuk(a.tanganiHapusSoal))

	m.HandleFunc("GET /api/admin/paket-ujian", a.wajibMasuk(a.tanganiDaftarPaket))
	m.HandleFunc("GET /api/admin/paket-ujian/{id}/hasil", a.wajibMasuk(a.tanganiHasilUjian))
	// Membuka dan menutup jadwal tes menentukan siapa yang dapat mengerjakan,
	// jadi dibatasi admin penuh.
	m.HandleFunc("POST /api/admin/paket-ujian", a.wajibAdmin(a.tanganiSimpanPaket))
	m.HandleFunc("PUT /api/admin/paket-ujian/{id}", a.wajibAdmin(a.tanganiUbahPaket))
	m.HandleFunc("DELETE /api/admin/paket-ujian/{id}", a.wajibAdmin(a.tanganiHapusPaket))

	/* ---- notifikasi ---- */
	m.HandleFunc("GET /api/admin/notifikasi", a.wajibMasuk(a.tanganiDaftarNotifikasi))
	m.HandleFunc("POST /api/admin/notifikasi", a.wajibMasuk(a.tanganiBuatNotifikasi))
	m.HandleFunc("POST /api/admin/notifikasi/{id}/kirim", a.wajibMasuk(a.tanganiKirimNotifikasi))
	m.HandleFunc("PATCH /api/admin/notifikasi/{id}/batal", a.wajibMasuk(a.tanganiBatalkanNotifikasi))

	/* ---- pesan masuk ---- */
	m.HandleFunc("GET /api/admin/pesan", a.wajibMasuk(a.tanganiDaftarPesan))
	m.HandleFunc("PATCH /api/admin/pesan/{id}", a.wajibMasuk(a.tanganiTandaiPesan))
	m.HandleFunc("DELETE /api/admin/pesan/{id}", a.wajibMasuk(a.tanganiHapusPesan))

	/* ---- pengaturan & pengguna ---- */
	m.HandleFunc("GET /api/admin/pengaturan", a.wajibAdmin(a.tanganiDaftarPengaturan))
	m.HandleFunc("PUT /api/admin/pengaturan", a.wajibAdmin(a.tanganiSimpanPengaturan))
	m.HandleFunc("GET /api/admin/pengguna", a.wajibAdmin(a.tanganiDaftarPengguna))
	m.HandleFunc("POST /api/admin/pengguna", a.wajibAdmin(a.tanganiSimpanPengguna))
	m.HandleFunc("PUT /api/admin/pengguna/{id}", a.wajibAdmin(a.tanganiUbahPengguna))
	m.HandleFunc("DELETE /api/admin/pengguna/{id}", a.wajibAdmin(a.tanganiHapusPengguna))

	/* ---- berkas unggahan ---- */
	m.Handle("GET /unggahan/", a.sajikanUnggahan())

	// Permintaan ke jalur yang tidak dikenal tetap dijawab dalam bentuk JSON,
	// bukan halaman HTML bawaan, supaya frontend dapat mengolahnya.
	m.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		kirimGalat(w, http.StatusNotFound, "Alamat "+r.URL.Path+" tidak tersedia.")
	})

	return a.catatPermintaan(a.lintasAsal(m))
}

// sajikanUnggahan melayani berkas unggahan. Dokumen pendaftar bersifat
// pribadi: hanya gambar berita, galeri, dan fasilitas yang boleh dibuka bebas,
// sedangkan folder "pendaftar" wajib membawa token petugas.
func (a *Aplikasi) sajikanUnggahan() http.Handler {
	berkas := http.FileServer(http.Dir(a.cfg.FolderUnggah))
	sajikan := http.StripPrefix("/unggahan/", berkas)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jalur := strings.TrimPrefix(r.URL.Path, "/unggahan/")
		bersih := filepath.Clean("/" + jalur)

		if strings.HasPrefix(bersih, "/pendaftar/") {
			a.wajibMasuk(func(w http.ResponseWriter, r *http.Request) {
				// Dokumen pribadi tidak boleh disimpan di cache bersama.
				w.Header().Set("Cache-Control", "private, no-store")
				sajikan.ServeHTTP(w, r)
			})(w, r)
			return
		}

		w.Header().Set("Cache-Control", "public, max-age=86400")
		sajikan.ServeHTTP(w, r)
	})
}

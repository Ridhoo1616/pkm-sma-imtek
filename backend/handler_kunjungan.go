package main

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"regexp"
	"strings"
	"time"
)

/*
Pencatatan dan pelaporan kunjungan situs.

Yang perlu diluruskan lebih dulu: angka di sini TIDAK sebanding dengan angka
Google Analytics atau sejenisnya, dan tidak berpura-pura begitu.

  - Pencatatannya dijalankan dari peramban pengunjung. Halaman publik
    disajikan sebagai halaman statis yang disimpan cache, sehingga kunjungan
    tidak selalu sampai ke server ini; satu permintaan kecil dari perambanlah
    yang memberi tahu. Akibatnya pengunjung yang mematikan JavaScript, dan
    sebagian besar perayap mesin pencari, TIDAK terhitung.
  - Yang dihitung "pengunjung" adalah sidik dari alamat IP per hari. Dua orang
    di satu jaringan sekolah terhitung satu, dan satu orang yang berganti dari
    Wi-Fi ke data seluler terhitung dua.

Keduanya keterbatasan yang disebutkan apa adanya kepada panitia di panel,
bukan disembunyikan. Untuk keperluan sekolah — melihat bagian mana yang
dibuka orang dan apakah promosi berpengaruh — angka seperti ini sudah cukup,
dan harganya jauh lebih murah daripada mengirim data pengunjung ke layanan
luar.
*/

// polaHalamanKunjungan menjaga isi kolom halaman tetap berupa alamat yang
// masuk akal. Tanpa ini, siapa pun dapat mengirim alamat karangan sepanjang
// apa pun dan membuat tabelnya membengkak.
var polaHalamanKunjungan = regexp.MustCompile(`^/[a-z0-9\-/]*$`)

// awalanRincian adalah bagian situs yang segmen keduanya berupa satu butir
// isi, bukan nama halaman: /berita/{slug} dan /halaman/{slug}. Hanya untuk
// keduanya segmen kedua dibuang.
//
// Dibedakan begini, bukan dipotong satu segmen untuk semuanya, karena
// /profil/visi-misi dan /akademik/kalender memang HALAMAN tersendiri —
// memotongnya menjadi /profil dan /akademik akan menghilangkan justru angka
// yang berguna bagi sekolah. Sebaliknya, membiarkan /berita/{slug} utuh
// membuat daftar "bagian yang paling dibuka" berisi judul berita satu per
// satu, dan jumlah barisnya tumbuh mengikuti banyaknya berita.
var awalanRincian = map[string]bool{"berita": true, "halaman": true}

// halamanKunjungan menormalkan alamat yang dikirim peramban menjadi nama
// bagian situs. Mengembalikan string kosong bila alamatnya tidak masuk akal,
// dan pemanggilnya yang memutuskan untuk tidak mencatatnya.
func halamanKunjungan(jalur string) string {
	jalur = strings.ToLower(strings.TrimSpace(jalur))
	if jalur == "" {
		return ""
	}
	// Tanda tanya dan pagar dibuang: keduanya bukan bagian dari halamannya.
	if i := strings.IndexAny(jalur, "?#"); i >= 0 {
		jalur = jalur[:i]
	}
	if !strings.HasPrefix(jalur, "/") {
		jalur = "/" + jalur
	}
	jalur = strings.TrimSuffix(jalur, "/")
	if jalur == "" {
		return "/"
	}
	if !polaHalamanKunjungan.MatchString(jalur) || len(jalur) > 120 {
		return ""
	}

	bagian := strings.Split(strings.TrimPrefix(jalur, "/"), "/")
	if awalanRincian[bagian[0]] {
		bagian = bagian[:1]
	} else if len(bagian) > 2 {
		bagian = bagian[:2]
	}
	return "/" + strings.Join(bagian, "/")
}

// penandaPengunjung membuat sidik ringkas pengunjung untuk satu hari.
//
// Alamat IP aslinya TIDAK disimpan. Yang disimpan enam belas huruf pertama
// SHA-256 atas gabungan rahasia server, alamat IP, dan tanggalnya. Rahasia
// server membuat sidiknya tidak dapat dicocokkan oleh siapa pun yang hanya
// memegang isi tabelnya, dan tanggalnya membuat sidik orang yang sama berbeda
// dari hari ke hari — sehingga riwayat kunjungan seseorang tidak dapat
// dirangkai dari tabel ini.
func (a *Aplikasi) penandaPengunjung(ip, tanggal string) string {
	h := sha256.New()
	h.Write(a.cfg.RahasiaToken)
	h.Write([]byte("kunjungan"))
	h.Write([]byte(ip))
	h.Write([]byte(tanggal))
	return hex.EncodeToString(h.Sum(nil))[:16]
}

// potongTeks memotong teks agar tidak melebihi panjang kolomnya. Referer
// datang dari peramban dan panjangnya tidak dijamin apa pun.
func potongTeks(teks string, maks int) string {
	teks = strings.TrimSpace(teks)
	if len(teks) > maks {
		return teks[:maks]
	}
	return teks
}

type permintaanKunjungan struct {
	Halaman string `json:"halaman"`
}

// tanganiCatatKunjungan menerima satu kunjungan dari peramban pengunjung.
//
// Selalu menjawab 204, juga ketika alamatnya ditolak atau penyimpanannya
// gagal. Pencatat kunjungan tidak boleh pernah menjadi sebab halaman terasa
// rusak di sisi pengunjung: ia hiasan bagi panitia, bukan bagian dari
// layanannya. Kegagalannya dicatat di log server, tempat yang memang dibaca
// saat ada yang perlu diperiksa.
func (a *Aplikasi) tanganiCatatKunjungan(w http.ResponseWriter, r *http.Request) {
	var p permintaanKunjungan
	if !bacaJSON(w, r, &p) {
		return
	}

	halaman := halamanKunjungan(p.Halaman)
	// Halaman panel panitia tidak dihitung: yang ingin diketahui sekolah
	// jumlah pengunjung situsnya, bukan seberapa sering panitianya sendiri
	// membuka panel.
	if halaman == "" || strings.HasPrefix(halaman, "/admin") {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Tanggalnya diambil di sini, bukan dibiarkan current_date mengurusnya,
	// sebab tanggal itu ikut menjadi bahan sidiknya.
	penanda := a.penandaPengunjung(alamatPemanggil(r), time.Now().Format("2006-01-02"))
	if _, err := a.db.Exec(`
		INSERT INTO statistik_kunjungan (tanggal, halaman, referer, penanda, jumlah)
		VALUES (current_date, $1, NULLIF($2, ''), $3, 1)
		ON CONFLICT (tanggal, halaman, penanda)
		DO UPDATE SET jumlah = statistik_kunjungan.jumlah + 1`,
		halaman, potongTeks(r.Header.Get("Referer"), 255), penanda); err != nil {
		a.log.Printf("mencatat kunjungan %s: %v", halaman, err)
	}
	w.WriteHeader(http.StatusNoContent)
}

// tanganiKunjunganAdmin melaporkan kunjungan dalam bentuk yang langsung dapat
// digambar panel: angka ringkas, deret per hari, per bulan, per tahun, dan
// bagian situs yang paling banyak dibuka.
func (a *Aplikasi) tanganiKunjunganAdmin(w http.ResponseWriter, r *http.Request) {
	var totalKunjungan, totalPengunjung, hariIni, pengunjungHariIni, mingguIni int
	tunggal := []struct {
		sql  string
		tuju *int
		saat string
	}{
		{"SELECT COALESCE(SUM(jumlah), 0) FROM statistik_kunjungan", &totalKunjungan, "menghitung total kunjungan"},
		{"SELECT COUNT(DISTINCT penanda) FROM statistik_kunjungan", &totalPengunjung, "menghitung total pengunjung"},
		{"SELECT COALESCE(SUM(jumlah), 0) FROM statistik_kunjungan WHERE tanggal = current_date", &hariIni, "menghitung kunjungan hari ini"},
		{"SELECT COUNT(DISTINCT penanda) FROM statistik_kunjungan WHERE tanggal = current_date", &pengunjungHariIni, "menghitung pengunjung hari ini"},
		{"SELECT COALESCE(SUM(jumlah), 0) FROM statistik_kunjungan WHERE tanggal >= current_date - interval '6 days'", &mingguIni, "menghitung kunjungan minggu ini"},
	}
	for _, k := range tunggal {
		if err := a.db.QueryRow(k.sql).Scan(k.tuju); err != nil {
			a.galatServer(w, k.saat, err)
			return
		}
	}

	var perHari, perBulan, perTahun, perHalaman []Cacah
	deret := []struct {
		nama string
		sql  string
		isi  *[]Cacah
	}{
		{"per hari", `SELECT to_char(tanggal, 'YYYY-MM-DD'), SUM(jumlah) FROM statistik_kunjungan
		   WHERE tanggal >= current_date - interval '29 days' GROUP BY 1 ORDER BY 1`, &perHari},
		{"per bulan", `SELECT to_char(tanggal, 'YYYY-MM'), SUM(jumlah) FROM statistik_kunjungan
		   WHERE tanggal >= date_trunc('month', current_date) - interval '11 months'
		   GROUP BY 1 ORDER BY 1`, &perBulan},
		{"per tahun", `SELECT to_char(tanggal, 'YYYY'), SUM(jumlah) FROM statistik_kunjungan
		   GROUP BY 1 ORDER BY 1`, &perTahun},
		{"per halaman", `SELECT halaman, SUM(jumlah) FROM statistik_kunjungan
		   GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, &perHalaman},
	}

	for _, d := range deret {
		hasil, err := a.cacahKan(d.sql)
		if err != nil {
			a.galatServer(w, "menghitung kunjungan "+d.nama, err)
			return
		}
		*d.isi = hasil
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"total_kunjungan":     totalKunjungan,
		"total_pengunjung":    totalPengunjung,
		"hari_ini":            hariIni,
		"pengunjung_hari_ini": pengunjungHariIni,
		"minggu_ini":          mingguIni,
		"per_hari":            perHari,
		"per_bulan":           perBulan,
		"per_tahun":           perTahun,
		"per_halaman":         perHalaman,
	})
}

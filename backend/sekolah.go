package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode"
)

/* ==================================================================
   Daftar rujukan sekolah asal

   Keterangan lengkap tentang mengapa rujukannya disimpan sendiri, dan bukan
   ditanyakan ke API pemerintah, ada di migrations/017_sekolah_referensi.sql.
   Ringkasnya: tidak ada API resmi yang boleh dipakai program lain, dan API
   pihak ketiga yang tidak resmi tidak dapat dijadikan tumpuan sistem
   penerimaan sekolah.
   ================================================================== */

type SekolahRujukan struct {
	NPSN      string `json:"npsn"`
	Nama      string `json:"nama"`
	Bentuk    string `json:"bentuk,omitempty"`
	Status    string `json:"status,omitempty"`
	Kecamatan string `json:"kecamatan,omitempty"`
	Kabupaten string `json:"kabupaten,omitempty"`
	Provinsi  string `json:"provinsi,omitempty"`
}

var polaBukanHurufAngka = regexp.MustCompile(`[^a-z0-9]+`)

/*
namaSekolahBaku menyeragamkan nama sekolah untuk dibandingkan.

Nama yang sama sering ditulis berbeda-beda: "SMPN 1 Legok", "SMP N 1 Legok",
"SMP Negeri 1 Legok", "SMP NEGERI 1 LEGOK". Kalau dibandingkan apa adanya,
pendaftar yang menulis singkatan yang lazim akan ditolak padahal sekolahnya
ada.

Yang dilakukan: huruf dikecilkan, singkatan yang lazim dibakukan, lalu
seluruh yang bukan huruf dan angka dibuang. Hasilnya "smpnegeri1legok" untuk
keempat tulisan di atas.
*/
func namaSekolahBaku(nama string) string {
	s := strings.ToLower(strings.TrimSpace(nama))

	// Urutannya penting: yang lebih panjang lebih dulu, supaya "smp negeri"
	// tidak terpotong menjadi "smpn" + "egeri".
	for _, g := range [][2]string{
		{"sekolah menengah pertama", "smp"},
		{"madrasah tsanawiyah", "mts"},
		{"sekolah luar biasa", "slb"},
		{" negeri ", " n "},
		{" swasta ", " "},
	} {
		s = strings.ReplaceAll(s, g[0], g[1])
	}
	s = polaBukanHurufAngka.ReplaceAllString(s, "")

	// "smpn1legok" dan "smpnegeri1legok" harus sama. Sesudah tanda baca
	// dibuang, "negeri" yang menempel dipendekkan menjadi "n".
	for _, g := range [][2]string{
		{"smpnegeri", "smpn"},
		{"mtsnegeri", "mtsn"},
		{"smanegeri", "sman"},
		{"slbnegeri", "slbn"},
	} {
		s = strings.ReplaceAll(s, g[0], g[1])
	}
	return s
}

// adaRujukanSekolah melaporkan apakah daftar rujukannya sudah diisi sekolah.
// Selama masih kosong, seluruh pemeriksaan pencocokan dilewati.
func (a *Aplikasi) adaRujukanSekolah() (bool, error) {
	var ada bool
	err := a.db.QueryRow("SELECT EXISTS (SELECT 1 FROM sekolah_referensi)").Scan(&ada)
	return ada, err
}

// sekolahMenurutNpsn mencari satu sekolah menurut NPSN-nya.
func (a *Aplikasi) sekolahMenurutNpsn(npsn string) (SekolahRujukan, error) {
	var s SekolahRujukan
	err := a.db.QueryRow(
		`SELECT npsn, nama, bentuk, status, kecamatan, kabupaten, provinsi
		   FROM sekolah_referensi WHERE npsn = $1`, npsn).
		Scan(&s.NPSN, &s.Nama, &s.Bentuk, &s.Status, &s.Kecamatan, &s.Kabupaten, &s.Provinsi)
	s.NPSN = strings.TrimSpace(s.NPSN)
	return s, err
}

// sekolahMenurutNama mencari sekolah yang nama bakunya sama. Yang dikembalikan
// seluruh yang cocok, sebab dua sekolah dapat bernama sama di kecamatan yang
// berbeda dan panitia yang harus memutuskan, bukan sistem.
func (a *Aplikasi) sekolahMenurutNama(nama string) ([]SekolahRujukan, error) {
	baris, err := a.db.Query(
		`SELECT npsn, nama, bentuk, status, kecamatan, kabupaten, provinsi
		   FROM sekolah_referensi`)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	cari := namaSekolahBaku(nama)
	hasil := []SekolahRujukan{}
	for baris.Next() {
		var s SekolahRujukan
		if err := baris.Scan(&s.NPSN, &s.Nama, &s.Bentuk, &s.Status,
			&s.Kecamatan, &s.Kabupaten, &s.Provinsi); err != nil {
			return nil, err
		}
		if namaSekolahBaku(s.Nama) == cari {
			s.NPSN = strings.TrimSpace(s.NPSN)
			hasil = append(hasil, s)
		}
	}
	return hasil, baris.Err()
}

/*
periksaAsalSekolah mencocokkan sekolah asal ke daftar rujukan.

Yang dikembalikan: apakah cocok dengan rujukan, untuk disimpan pada kolom
pendaftar.asal_sekolah_terdaftar.

Lima keadaan, dan masing-masing menghasilkan pesan yang menyebut apa yang
harus dibetulkan:

 1. Daftar rujukannya masih kosong. Tidak ada yang diperiksa; formulirnya
    bekerja seperti sebelum ada daftar ini.
 2. NPSN-nya ada di rujukan dan namanya cocok. Diterima, cocok = true.
 3. NPSN-nya ada di rujukan tetapi namanya lain. Ditolak, dan pesannya
    MENYEBUTKAN nama sekolah yang terdaftar dengan NPSN itu, sebab yang
    paling sering terjadi NPSN-nya benar dan namanya salah ketik.
 4. NPSN-nya tidak ada di rujukan, tetapi namanya cocok dengan satu sekolah.
    Ditolak pada kolom NPSN, dan pesannya menyebutkan NPSN yang benar.
 5. Dua-duanya tidak ada di rujukan. Ditolak, KECUALI pendaftar menyatakan
    sekolahnya tidak ada dalam daftar. Pernyataan itu perlu, sebab daftar
    rujukan tidak akan pernah lengkap: ada sekolah baru, ada pendaftar dari
    luar wilayah, dan ada yang dari pendidikan kesetaraan. Yang menyatakan
    begitu tetap diterima dengan cocok = false, dan panitia melihat
    penandanya saat memverifikasi berkas.
*/
func (a *Aplikasi) periksaAsalSekolah(v *Validasi, nama, npsn string, diakuiTidakAda bool) bool {
	nama = strings.TrimSpace(nama)
	npsn = strings.TrimSpace(npsn)
	if nama == "" || npsn == "" {
		return false // kekosongannya sudah diurus v.wajib
	}

	ada, err := a.adaRujukanSekolah()
	if err != nil {
		// Galat basis data tidak boleh menjelma menjadi penolakan formulir
		// yang tidak dapat dimengerti pendaftar. Dicatat, lalu dilewati.
		a.log.Printf("gagal memeriksa daftar rujukan sekolah: %v", err)
		return false
	}
	if !ada {
		return false
	}

	menurutNpsn, err := a.sekolahMenurutNpsn(npsn)
	if err != nil && err != sql.ErrNoRows {
		a.log.Printf("gagal mencari sekolah menurut npsn: %v", err)
		return false
	}
	if err == nil {
		if namaSekolahBaku(menurutNpsn.Nama) == namaSekolahBaku(nama) {
			return true
		}
		v.tambah("asal_sekolah", fmt.Sprintf(
			"NPSN %s terdaftar atas nama %q, bukan %q. Periksa kembali nama sekolah beserta NPSN-nya, atau pilih sekolah dari daftar yang muncul saat mengetik.",
			npsn, menurutNpsn.Nama, nama))
		return false
	}

	menurutNama, err := a.sekolahMenurutNama(nama)
	if err != nil {
		a.log.Printf("gagal mencari sekolah menurut nama: %v", err)
		return false
	}
	if len(menurutNama) == 1 {
		v.tambah("npsn_sekolah", fmt.Sprintf(
			"NPSN %s tidak ada dalam daftar sekolah. NPSN yang terdaftar untuk %q adalah %s. Periksa kembali nomornya.",
			npsn, menurutNama[0].Nama, menurutNama[0].NPSN))
		return false
	}
	if len(menurutNama) > 1 {
		v.tambah("npsn_sekolah", fmt.Sprintf(
			"NPSN %s tidak ada dalam daftar sekolah, sedangkan nama itu terdaftar pada %d sekolah. Pilih sekolah dari daftar yang muncul saat mengetik agar NPSN-nya terisi tepat.",
			npsn, len(menurutNama)))
		return false
	}

	if !diakuiTidakAda {
		v.tambah("asal_sekolah",
			"Sekolah ini tidak ada dalam daftar sekolah yang dimiliki panitia. "+
				"Pilih sekolah dari daftar yang muncul saat mengetik namanya. "+
				"Bila sekolah Anda memang tidak ada dalam daftar itu, centang "+
				"pilihan di bawah kolom ini agar diperiksa panitia secara manual.")
	}
	return false
}

/* ---------------- pencarian untuk formulir ---------------- */

// tanganiCariSekolah melayani pencarian ketik-sambil-cari pada formulir.
//
// Terbuka tanpa token, sebab yang memakainya calon pendaftar yang belum punya
// akun apa pun. Yang dikembalikan hanya data sekolah, yang memang data
// publik; tidak ada data pribadi di sini. Laju permintaannya tetap dibatasi.
func (a *Aplikasi) tanganiCariSekolah(w http.ResponseWriter, r *http.Request) {
	cari := strings.TrimSpace(r.URL.Query().Get("cari"))

	// Dua huruf tidak menyaring apa pun dan hanya mengembalikan sepuluh baris
	// pertama yang kebetulan cocok. Kosong pun dijawab kosong, bukan seluruh
	// daftar, supaya tidak ada yang menarik seluruh tabel lewat alamat ini.
	if len([]rune(cari)) < 3 {
		kirimJSON(w, http.StatusOK, map[string]any{
			"data": []SekolahRujukan{}, "aktif": true,
		})
		return
	}

	ada, err := a.adaRujukanSekolah()
	if err != nil {
		a.galatServer(w, "memeriksa daftar sekolah", err)
		return
	}

	pola := "%" + cari + "%"
	baris, err := a.db.Query(
		`SELECT npsn, nama, bentuk, status, kecamatan, kabupaten, provinsi
		   FROM sekolah_referensi
		  WHERE nama ILIKE $1 OR npsn = $2
		  ORDER BY nama
		  LIMIT 10`, pola, cari)
	if err != nil {
		a.galatServer(w, "mencari sekolah", err)
		return
	}
	defer baris.Close()

	daftar := []SekolahRujukan{}
	for baris.Next() {
		var s SekolahRujukan
		if err := baris.Scan(&s.NPSN, &s.Nama, &s.Bentuk, &s.Status,
			&s.Kecamatan, &s.Kabupaten, &s.Provinsi); err != nil {
			a.galatServer(w, "membaca sekolah", err)
			return
		}
		s.NPSN = strings.TrimSpace(s.NPSN)
		daftar = append(daftar, s)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca sekolah", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar,
		// Formulir memakai ini untuk memutuskan apakah perlu menuntut
		// pilihan dari daftar. Selama daftarnya kosong, ia tidak menuntut
		// apa pun.
		"aktif": ada,
	})
}

/* ---------------- panel: daftar dan impor ---------------- */

func (a *Aplikasi) tanganiDaftarSekolahAdmin(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	cari := strings.TrimSpace(q.Get("cari"))
	halaman := bilanganKueri(q.Get("halaman"), 1, 1, 10000)
	perHalaman := bilanganKueri(q.Get("per_halaman"), 25, 5, 100)

	syarat := "1 = 1"
	arg := []any{}
	p := &penomoran{}
	if cari != "" {
		syarat = "(nama ILIKE " + p.berikut() + " OR npsn = " + p.berikut() +
			" OR kecamatan ILIKE " + p.berikut() + ")"
		arg = append(arg, "%"+cari+"%", cari, "%"+cari+"%")
	}

	var total int
	if err := a.db.QueryRow(
		"SELECT COUNT(*) FROM sekolah_referensi WHERE "+syarat, arg...).Scan(&total); err != nil {
		a.galatServer(w, "menghitung sekolah", err)
		return
	}

	arg = append(arg, perHalaman, (halaman-1)*perHalaman)
	baris, err := a.db.Query(
		`SELECT npsn, nama, bentuk, status, kecamatan, kabupaten, provinsi
		   FROM sekolah_referensi WHERE `+syarat+`
		  ORDER BY nama LIMIT `+p.berikut()+` OFFSET `+p.berikut(), arg...)
	if err != nil {
		a.galatServer(w, "mengambil sekolah", err)
		return
	}
	defer baris.Close()

	daftar := []SekolahRujukan{}
	for baris.Next() {
		var s SekolahRujukan
		if err := baris.Scan(&s.NPSN, &s.Nama, &s.Bentuk, &s.Status,
			&s.Kecamatan, &s.Kabupaten, &s.Provinsi); err != nil {
			a.galatServer(w, "membaca sekolah", err)
			return
		}
		s.NPSN = strings.TrimSpace(s.NPSN)
		daftar = append(daftar, s)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca sekolah", err)
		return
	}

	var semua int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM sekolah_referensi").Scan(&semua); err != nil {
		a.galatServer(w, "menghitung seluruh sekolah", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar, "total": total, "semua": semua,
		"halaman": halaman, "per_halaman": perHalaman,
	})
}

type permintaanImporSekolah struct {
	// Csv boleh ditempel langsung dari Excel: pemisahnya dikenali sendiri,
	// koma maupun titik koma maupun tab.
	Csv string `json:"csv"`
	// Ganti mengosongkan tabelnya lebih dulu. Bawaannya menambah dan
	// memperbarui, sebab itu yang paling sering dimaksud.
	Ganti bool `json:"ganti"`
}

var polaNpsnSekolah = regexp.MustCompile(`^[0-9]{8}$`)

// pemisahCsv menebak pemisah kolom dari baris pertama. Tempelan dari Excel
// di Indonesia hampir selalu memakai titik koma atau tab, bukan koma.
func pemisahCsv(baris string) rune {
	jumlah := map[rune]int{';': 0, '\t': 0, ',': 0}
	for _, r := range baris {
		if _, ada := jumlah[r]; ada {
			jumlah[r]++
		}
	}
	terbanyak, pilihan := 0, ','
	for _, r := range []rune{';', '\t', ','} {
		if jumlah[r] > terbanyak {
			terbanyak, pilihan = jumlah[r], r
		}
	}
	return pilihan
}

/*
tanganiImporSekolah memasukkan daftar sekolah dari teks CSV yang ditempel
panitia.

Bentuk yang diterima: npsn;nama;bentuk;status;kecamatan;kabupaten;provinsi.
Hanya dua kolom pertama yang wajib. Baris kepala tabel dikenali dan dilewati.

Dibuat menerima TEMPELAN TEKS, bukan unggahan berkas, dan itu pilihan yang
sadar: panitia menyalin dari Excel atau dari laman Referensi Kemendikbud, dan
menempel jauh lebih mudah daripada menyimpan berkas lalu mengunggahnya.
Daftarnya satu wilayah, ratusan baris, jadi ukurannya tidak menjadi masalah.

Baris yang salah TIDAK menghentikan impor. Yang salah dikumpulkan lalu
dilaporkan beserta nomor barisnya, sebab satu baris rusak di tengah berkas
tidak boleh membuang sembilan ratus baris yang benar.
*/
func (a *Aplikasi) tanganiImporSekolah(w http.ResponseWriter, r *http.Request) {
	var p permintaanImporSekolah
	if !bacaJSON(w, r, &p) {
		return
	}
	isi := strings.TrimSpace(p.Csv)
	if isi == "" {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Tempelkan dulu daftar sekolahnya. Bentuknya: NPSN, nama sekolah, lalu kolom lain yang opsional.")
		return
	}
	if len(isi) > 4<<20 {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Daftar yang ditempel terlalu besar. Bagi menjadi beberapa kali impor.")
		return
	}

	barisPertama := isi
	if i := strings.IndexAny(isi, "\r\n"); i >= 0 {
		barisPertama = isi[:i]
	}
	pembaca := csv.NewReader(strings.NewReader(isi))
	pembaca.Comma = pemisahCsv(barisPertama)
	pembaca.FieldsPerRecord = -1 // jumlah kolom boleh berbeda antarbaris
	pembaca.TrimLeadingSpace = true
	pembaca.LazyQuotes = true

	rekaman, err := pembaca.ReadAll()
	if err != nil {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Daftarnya tidak dapat dibaca sebagai tabel: "+err.Error())
		return
	}

	type barisSekolah struct {
		s SekolahRujukan
	}
	sah := []barisSekolah{}
	masalah := []string{}
	for i, rek := range rekaman {
		if len(rek) == 0 {
			continue
		}
		npsn := strings.TrimSpace(rek[0])
		if npsn == "" && len(rek) == 1 {
			continue
		}
		// Baris kepala tabel, misalnya "npsn;nama_sekolah;kecamatan".
		if i == 0 && !polaNpsnSekolah.MatchString(npsn) &&
			strings.Contains(strings.ToLower(npsn), "npsn") {
			continue
		}
		if !polaNpsnSekolah.MatchString(npsn) {
			masalah = append(masalah, fmt.Sprintf(
				"baris %d: NPSN %q bukan delapan angka", i+1, potong(npsn, 20)))
			continue
		}
		ambil := func(k int) string {
			if k < len(rek) {
				return strings.TrimSpace(rek[k])
			}
			return ""
		}
		nama := ambil(1)
		if nama == "" {
			masalah = append(masalah, fmt.Sprintf("baris %d: nama sekolah kosong", i+1))
			continue
		}
		if !adaHuruf(nama) {
			masalah = append(masalah, fmt.Sprintf(
				"baris %d: nama sekolah %q tidak memuat huruf", i+1, potong(nama, 30)))
			continue
		}
		sah = append(sah, barisSekolah{SekolahRujukan{
			NPSN:      npsn,
			Nama:      potong(nama, 140),
			Bentuk:    potong(ambil(2), 20),
			Status:    potong(ambil(3), 10),
			Kecamatan: potong(ambil(4), 80),
			Kabupaten: potong(ambil(5), 80),
			Provinsi:  potong(ambil(6), 80),
		}})
	}

	if len(sah) == 0 {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Tidak ada satu baris pun yang dapat dipakai. "+strings.Join(masalah, "; "))
		return
	}

	tx, err := a.db.Begin()
	if err != nil {
		a.galatServer(w, "memulai impor sekolah", err)
		return
	}
	defer tx.Rollback()

	if p.Ganti {
		if _, err := tx.Exec("DELETE FROM sekolah_referensi"); err != nil {
			a.galatServer(w, "mengosongkan daftar sekolah", err)
			return
		}
	}
	for _, b := range sah {
		if _, err := tx.Exec(
			`INSERT INTO sekolah_referensi
			   (npsn, nama, bentuk, status, kecamatan, kabupaten, provinsi)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (npsn) DO UPDATE SET
			   nama = EXCLUDED.nama, bentuk = EXCLUDED.bentuk,
			   status = EXCLUDED.status, kecamatan = EXCLUDED.kecamatan,
			   kabupaten = EXCLUDED.kabupaten, provinsi = EXCLUDED.provinsi`,
			b.s.NPSN, b.s.Nama, b.s.Bentuk, b.s.Status,
			b.s.Kecamatan, b.s.Kabupaten, b.s.Provinsi); err != nil {
			a.galatServer(w, "menyimpan sekolah", err)
			return
		}
	}
	if err := tx.Commit(); err != nil {
		a.galatServer(w, "menyelesaikan impor sekolah", err)
		return
	}

	var semua int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM sekolah_referensi").Scan(&semua); err != nil {
		a.galatServer(w, "menghitung sekolah", err)
		return
	}

	pesan := fmt.Sprintf("%d sekolah diimpor. Daftar sekarang memuat %d sekolah.", len(sah), semua)
	if len(masalah) > 0 {
		pesan += fmt.Sprintf(" %d baris dilewati.", len(masalah))
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"pesan": pesan, "masuk": len(sah), "semua": semua,
		"dilewati": masalah,
	})
}

func (a *Aplikasi) tanganiHapusSekolah(w http.ResponseWriter, r *http.Request) {
	npsn := strings.TrimSpace(r.PathValue("npsn"))
	if !polaNpsnSekolah.MatchString(npsn) {
		kirimGalat(w, http.StatusUnprocessableEntity, "NPSN harus delapan angka.")
		return
	}
	hasil, err := a.db.Exec("DELETE FROM sekolah_referensi WHERE npsn = $1", npsn)
	if err != nil {
		a.galatServer(w, "menghapus sekolah", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Sekolah tidak ditemukan dalam daftar.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Sekolah dihapus dari daftar."})
}

func adaHuruf(s string) bool {
	for _, r := range s {
		if unicode.IsLetter(r) {
			return true
		}
	}
	return false
}

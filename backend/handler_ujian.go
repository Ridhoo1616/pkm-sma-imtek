package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

/* ==================================================================
   Tes seleksi online (CBT)

   Tiga keputusan yang menentukan bentuk kode ini.

   1. Batas waktu disimpan sebagai waktu mutlak saat sesi dimulai
      (sesi_ujian.batas_pada), bukan dihitung ulang dari durasi pada setiap
      permintaan. Kalau dihitung ulang, peserta hanya perlu memuat ulang
      halaman untuk mendapat waktu penuh lagi. Penghitung di layar hanyalah
      hiasan; yang menentukan adalah batas_pada di basis data.

   2. Susunan soal dibekukan ke tabel sesi_soal saat sesi dimulai. Mengacak
      ulang setiap permintaan membuat nomor soal berpindah, dan jawaban yang
      sudah diisi menjadi salah tempat.

   3. Kunci jawaban tidak pernah dikirim ke peramban. Penilaian seluruhnya
      dikerjakan server. Mengirim kunci lalu menyembunyikannya di antarmuka
      sama dengan tidak menyembunyikannya.

   Peserta tidak punya akun. Yang dipakai adalah kunci yang sama dengan cek
   status, yaitu nomor registrasi beserta tanggal lahir. Sesudah lolos, ia
   menerima token berperan "peserta" yang hanya berlaku untuk jalur ujian.
   ================================================================== */

// PeranPeserta dipakai pada token ujian. Harus berbeda dari peran petugas,
// dan wajibMasuk menolaknya, supaya token ini tidak dapat membuka panel.
const PeranPeserta = "peserta"

// GalatSoalKurang dibedakan dari galat lain karena penanganannya berbeda:
// ini bukan kesalahan peserta, jadi pesannya mengarahkan ke panitia.
var GalatSoalKurang = errors.New("jumlah soal pada bank soal belum mencukupi")

/* ---------------- bank soal (panitia) ---------------- */

type Soal struct {
	ID            int    `json:"id"`
	MataPelajaran string `json:"mata_pelajaran"`
	Pertanyaan    string `json:"pertanyaan"`
	PilihanA      string `json:"pilihan_a"`
	PilihanB      string `json:"pilihan_b"`
	PilihanC      string `json:"pilihan_c"`
	PilihanD      string `json:"pilihan_d"`
	PilihanE      string `json:"pilihan_e"`
	Jawaban       string `json:"jawaban"`
	Pembahasan    string `json:"pembahasan"`
	Aktif         bool   `json:"aktif"`
}

func (a *Aplikasi) tanganiDaftarSoal(w http.ResponseWriter, r *http.Request) {
	mapel := strings.TrimSpace(r.URL.Query().Get("mata_pelajaran"))
	kueri := `SELECT id, mata_pelajaran, pertanyaan, pilihan_a, pilihan_b, pilihan_c,
	                 pilihan_d, pilihan_e, jawaban, pembahasan, aktif
	          FROM soal`
	nilai := []any{}
	if mapel != "" {
		kueri += " WHERE mata_pelajaran = $1"
		nilai = append(nilai, mapel)
	}
	kueri += " ORDER BY mata_pelajaran, id"

	baris, err := a.db.Query(kueri, nilai...)
	if err != nil {
		a.galatServer(w, "mengambil bank soal", err)
		return
	}
	defer baris.Close()

	daftar := []Soal{}
	for baris.Next() {
		var s Soal
		if err := baris.Scan(&s.ID, &s.MataPelajaran, &s.Pertanyaan, &s.PilihanA,
			&s.PilihanB, &s.PilihanC, &s.PilihanD, &s.PilihanE, &s.Jawaban,
			&s.Pembahasan, &s.Aktif); err != nil {
			a.galatServer(w, "membaca bank soal", err)
			return
		}
		daftar = append(daftar, s)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca bank soal", err)
		return
	}

	var mapels []string
	barisMapel, err := a.db.Query(
		"SELECT DISTINCT mata_pelajaran FROM soal ORDER BY mata_pelajaran")
	if err == nil {
		defer barisMapel.Close()
		for barisMapel.Next() {
			var m string
			if err := barisMapel.Scan(&m); err == nil {
				mapels = append(mapels, m)
			}
		}
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":           daftar,
		"mata_pelajaran": mapels,
		"jumlah_aktif":   jumlahSoalAktif(a),
	})
}

func jumlahSoalAktif(a *Aplikasi) int {
	var n int
	_ = a.db.QueryRow("SELECT COUNT(*) FROM soal WHERE aktif = true").Scan(&n)
	return n
}

type permintaanSoal struct {
	MataPelajaran string `json:"mata_pelajaran"`
	Pertanyaan    string `json:"pertanyaan"`
	PilihanA      string `json:"pilihan_a"`
	PilihanB      string `json:"pilihan_b"`
	PilihanC      string `json:"pilihan_c"`
	PilihanD      string `json:"pilihan_d"`
	PilihanE      string `json:"pilihan_e"`
	Jawaban       string `json:"jawaban"`
	Pembahasan    string `json:"pembahasan"`
	Aktif         bool   `json:"aktif"`
}

func (p *permintaanSoal) periksa() *Validasi {
	v := validasiBaru()
	p.MataPelajaran = strings.TrimSpace(p.MataPelajaran)
	p.Pertanyaan = strings.TrimSpace(p.Pertanyaan)
	p.PilihanA = strings.TrimSpace(p.PilihanA)
	p.PilihanB = strings.TrimSpace(p.PilihanB)
	p.PilihanC = strings.TrimSpace(p.PilihanC)
	p.PilihanD = strings.TrimSpace(p.PilihanD)
	p.PilihanE = strings.TrimSpace(p.PilihanE)
	p.Jawaban = strings.ToUpper(strings.TrimSpace(p.Jawaban))
	p.Pembahasan = strings.TrimSpace(p.Pembahasan)

	v.wajib("mata_pelajaran", "Mata pelajaran", p.MataPelajaran)
	v.panjangMaks("mata_pelajaran", "Mata pelajaran", p.MataPelajaran, 60)
	v.wajib("pertanyaan", "Pertanyaan", p.Pertanyaan)
	v.panjangMaks("pertanyaan", "Pertanyaan", p.Pertanyaan, 4000)
	v.wajib("pilihan_a", "Pilihan A", p.PilihanA)
	v.wajib("pilihan_b", "Pilihan B", p.PilihanB)

	// Kunci jawaban harus menunjuk pilihan yang benar-benar terisi. Tanpa
	// pemeriksaan ini, soal dengan kunci E tetapi pilihan E kosong akan
	// mustahil dijawab benar oleh peserta mana pun.
	isi := map[string]string{
		"A": p.PilihanA, "B": p.PilihanB, "C": p.PilihanC,
		"D": p.PilihanD, "E": p.PilihanE,
	}
	teks, dikenal := isi[p.Jawaban]
	switch {
	case !dikenal:
		v.tambah("jawaban", "Kunci jawaban harus salah satu dari A sampai E.")
	case teks == "":
		v.tambah("jawaban",
			fmt.Sprintf("Kunci jawaban %s menunjuk pilihan yang masih kosong.", p.Jawaban))
	}
	return v
}

func (a *Aplikasi) tanganiSimpanSoal(w http.ResponseWriter, r *http.Request) {
	var p permintaanSoal
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	var id int
	err := a.db.QueryRow(
		`INSERT INTO soal (mata_pelajaran, pertanyaan, pilihan_a, pilihan_b,
		                   pilihan_c, pilihan_d, pilihan_e, jawaban, pembahasan, aktif)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		p.MataPelajaran, p.Pertanyaan, p.PilihanA, p.PilihanB, p.PilihanC,
		p.PilihanD, p.PilihanE, p.Jawaban, p.Pembahasan, p.Aktif).Scan(&id)
	if err != nil {
		a.galatServer(w, "menyimpan soal", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Soal berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahSoal(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanSoal
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	hasil, err := a.db.Exec(
		`UPDATE soal SET mata_pelajaran=$1, pertanyaan=$2, pilihan_a=$3, pilihan_b=$4,
		                 pilihan_c=$5, pilihan_d=$6, pilihan_e=$7, jawaban=$8,
		                 pembahasan=$9, aktif=$10
		 WHERE id=$11`,
		p.MataPelajaran, p.Pertanyaan, p.PilihanA, p.PilihanB, p.PilihanC,
		p.PilihanD, p.PilihanE, p.Jawaban, p.Pembahasan, p.Aktif, id)
	if err != nil {
		a.galatServer(w, "mengubah soal", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Soal tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Soal berhasil disimpan."})
}

func (a *Aplikasi) tanganiHapusSoal(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	// Soal yang sudah pernah dipakai pada sesi ujian tidak boleh hilang,
	// karena jawaban peserta menunjuk kepadanya dan hasilnya akan menjadi
	// tidak dapat ditelusuri. Kunci asingnya memakai ON DELETE RESTRICT, dan
	// di sini penolakannya diterjemahkan menjadi pesan yang dapat dimengerti.
	var terpakai int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM sesi_soal WHERE soal_id = $1", id).
		Scan(&terpakai); err != nil {
		a.galatServer(w, "memeriksa pemakaian soal", err)
		return
	}
	if terpakai > 0 {
		kirimGalat(w, http.StatusConflict,
			"Soal ini sudah dipakai pada sesi ujian yang berjalan atau selesai, "+
				"jadi tidak dapat dihapus. Nonaktifkan saja agar tidak terpilih lagi.")
		return
	}

	hasil, err := a.db.Exec("DELETE FROM soal WHERE id = $1", id)
	if err != nil {
		a.galatServer(w, "menghapus soal", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Soal tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Soal berhasil dihapus."})
}

/* ---------------- paket ujian (panitia) ---------------- */

type PaketUjian struct {
	ID            int     `json:"id"`
	Nama          string  `json:"nama"`
	TahunAjaran   string  `json:"tahun_ajaran"`
	DurasiMenit   int     `json:"durasi_menit"`
	JumlahSoal    int     `json:"jumlah_soal"`
	AcakSoal      bool    `json:"acak_soal"`
	Mulai         *string `json:"mulai"`
	Selesai       *string `json:"selesai"`
	NilaiMinimum  int     `json:"nilai_minimum"`
	Keterangan    string  `json:"keterangan"`
	Aktif         bool    `json:"aktif"`
	JumlahPeserta int     `json:"jumlah_peserta"`
	JumlahSelesai int     `json:"jumlah_selesai"`
}

func (a *Aplikasi) tanganiDaftarPaket(w http.ResponseWriter, r *http.Request) {
	baris, err := a.db.Query(
		`SELECT p.id, p.nama, p.tahun_ajaran, p.durasi_menit, p.jumlah_soal,
		        p.acak_soal, p.mulai, p.selesai, p.nilai_minimum, p.keterangan, p.aktif,
		        (SELECT COUNT(*) FROM sesi_ujian s WHERE s.paket_id = p.id),
		        (SELECT COUNT(*) FROM sesi_ujian s WHERE s.paket_id = p.id AND s.status = 'Selesai')
		 FROM paket_ujian p ORDER BY p.id DESC`)
	if err != nil {
		a.galatServer(w, "mengambil paket ujian", err)
		return
	}
	defer baris.Close()

	daftar := []PaketUjian{}
	for baris.Next() {
		var p PaketUjian
		var mulai, selesai sql.NullTime
		if err := baris.Scan(&p.ID, &p.Nama, &p.TahunAjaran, &p.DurasiMenit,
			&p.JumlahSoal, &p.AcakSoal, &mulai, &selesai, &p.NilaiMinimum,
			&p.Keterangan, &p.Aktif, &p.JumlahPeserta, &p.JumlahSelesai); err != nil {
			a.galatServer(w, "membaca paket ujian", err)
			return
		}
		p.Mulai = waktuAtauNil(mulai)
		p.Selesai = waktuAtauNil(selesai)
		daftar = append(daftar, p)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca paket ujian", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"data":         daftar,
		"jumlah_aktif": jumlahSoalAktif(a),
	})
}

func waktuAtauNil(t sql.NullTime) *string {
	if !t.Valid {
		return nil
	}
	s := t.Time.Format(time.RFC3339)
	return &s
}

type permintaanPaket struct {
	Nama         string `json:"nama"`
	TahunAjaran  string `json:"tahun_ajaran"`
	DurasiMenit  int    `json:"durasi_menit"`
	JumlahSoal   int    `json:"jumlah_soal"`
	AcakSoal     bool   `json:"acak_soal"`
	Mulai        string `json:"mulai"`
	Selesai      string `json:"selesai"`
	NilaiMinimum int    `json:"nilai_minimum"`
	Keterangan   string `json:"keterangan"`
	Aktif        bool   `json:"aktif"`
}

func (p *permintaanPaket) periksa(a *Aplikasi) (*Validasi, *time.Time, *time.Time) {
	v := validasiBaru()
	p.Nama = strings.TrimSpace(p.Nama)
	p.TahunAjaran = strings.TrimSpace(p.TahunAjaran)
	p.Keterangan = strings.TrimSpace(p.Keterangan)

	v.wajib("nama", "Nama paket", p.Nama)
	v.panjangMaks("nama", "Nama paket", p.Nama, 120)
	if p.TahunAjaran == "" {
		p.TahunAjaran = a.atur("ppdb_tahun", "")
	}
	v.wajib("tahun_ajaran", "Tahun ajaran", p.TahunAjaran)

	if p.DurasiMenit < 5 || p.DurasiMenit > 300 {
		v.tambah("durasi_menit", "Durasi harus antara 5 dan 300 menit.")
	}
	if p.JumlahSoal < 1 || p.JumlahSoal > 200 {
		v.tambah("jumlah_soal", "Jumlah soal harus antara 1 dan 200.")
	}
	if p.NilaiMinimum < 0 || p.NilaiMinimum > 100 {
		v.tambah("nilai_minimum", "Nilai minimum harus antara 0 dan 100.")
	}

	// Paket tidak boleh dibuka bila bank soalnya belum cukup. Kalau tetap
	// dibuka, peserta pertama yang masuk akan mendapat galat, dan itu terjadi
	// justru saat ujian sudah dimulai.
	if p.Aktif {
		if tersedia := jumlahSoalAktif(a); tersedia < p.JumlahSoal {
			v.tambah("jumlah_soal", fmt.Sprintf(
				"Bank soal aktif baru berisi %d soal, sedangkan paket ini meminta %d. "+
					"Tambah soal dulu, atau kurangi jumlahnya.", tersedia, p.JumlahSoal))
		}
	}

	var mulai, selesai *time.Time
	if p.Mulai != "" {
		t, err := waktuDariISO(p.Mulai)
		if err != nil {
			v.tambah("mulai", "Waktu mulai tidak dapat dibaca.")
		} else {
			mulai = &t
		}
	}
	if p.Selesai != "" {
		t, err := waktuDariISO(p.Selesai)
		if err != nil {
			v.tambah("selesai", "Waktu selesai tidak dapat dibaca.")
		} else {
			selesai = &t
		}
	}
	if mulai != nil && selesai != nil && !selesai.After(*mulai) {
		v.tambah("selesai", "Waktu selesai harus sesudah waktu mulai.")
	}
	return v, mulai, selesai
}

// waktuDariISO menerima bentuk yang dikirim input datetime-local peramban
// maupun bentuk RFC 3339 penuh.
func waktuDariISO(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	for _, bentuk := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02T15:04"} {
		if t, err := time.ParseInLocation(bentuk, s, zonaJakarta()); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("waktu tidak dikenal: %s", s)
}

func zonaJakarta() *time.Location {
	if l, err := time.LoadLocation("Asia/Jakarta"); err == nil {
		return l
	}
	// Bila basis data zona waktu sistem tidak tersedia, WIB tetap UTC+7.
	return time.FixedZone("WIB", 7*3600)
}

func (a *Aplikasi) tanganiSimpanPaket(w http.ResponseWriter, r *http.Request) {
	var p permintaanPaket
	if !bacaJSON(w, r, &p) {
		return
	}
	v, mulai, selesai := p.periksa(a)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	var id int
	err := a.db.QueryRow(
		`INSERT INTO paket_ujian (nama, tahun_ajaran, durasi_menit, jumlah_soal,
		                          acak_soal, mulai, selesai, nilai_minimum, keterangan, aktif)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		p.Nama, p.TahunAjaran, p.DurasiMenit, p.JumlahSoal, p.AcakSoal,
		mulai, selesai, p.NilaiMinimum, p.Keterangan, p.Aktif).Scan(&id)
	if err != nil {
		a.galatServer(w, "menyimpan paket ujian", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Paket ujian berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahPaket(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanPaket
	if !bacaJSON(w, r, &p) {
		return
	}
	v, mulai, selesai := p.periksa(a)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	hasil, err := a.db.Exec(
		`UPDATE paket_ujian SET nama=$1, tahun_ajaran=$2, durasi_menit=$3, jumlah_soal=$4,
		                        acak_soal=$5, mulai=$6, selesai=$7, nilai_minimum=$8,
		                        keterangan=$9, aktif=$10
		 WHERE id=$11`,
		p.Nama, p.TahunAjaran, p.DurasiMenit, p.JumlahSoal, p.AcakSoal,
		mulai, selesai, p.NilaiMinimum, p.Keterangan, p.Aktif, id)
	if err != nil {
		a.galatServer(w, "mengubah paket ujian", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Paket ujian tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Paket ujian berhasil disimpan."})
}

func (a *Aplikasi) tanganiHapusPaket(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var adaSesi int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM sesi_ujian WHERE paket_id = $1", id).
		Scan(&adaSesi); err != nil {
		a.galatServer(w, "memeriksa sesi ujian", err)
		return
	}
	if adaSesi > 0 {
		kirimGalat(w, http.StatusConflict, fmt.Sprintf(
			"Paket ini sudah dipakai %d peserta, jadi tidak dapat dihapus. "+
				"Nonaktifkan saja agar tidak dapat dimulai lagi.", adaSesi))
		return
	}
	hasil, err := a.db.Exec("DELETE FROM paket_ujian WHERE id = $1", id)
	if err != nil {
		a.galatServer(w, "menghapus paket ujian", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Paket ujian tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Paket ujian berhasil dihapus."})
}

// tanganiHasilUjian memberi panitia rekap nilai satu paket.
func (a *Aplikasi) tanganiHasilUjian(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var nilaiMinimum int
	err := a.db.QueryRow("SELECT nilai_minimum FROM paket_ujian WHERE id = $1", id).
		Scan(&nilaiMinimum)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Paket ujian tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil paket ujian", err)
		return
	}

	baris, err := a.db.Query(
		`SELECT s.id, p.id, p.no_registrasi, p.nama_lengkap, COALESCE(j.nama, ''),
		        s.status, s.jumlah_benar, s.jumlah_soal, s.skor,
		        s.mulai_pada, s.selesai_pada
		 FROM sesi_ujian s
		 JOIN pendaftar p ON p.id = s.pendaftar_id
		 LEFT JOIN jurusan j ON j.id = p.jurusan_id
		 WHERE s.paket_id = $1
		 ORDER BY s.skor DESC, p.no_registrasi`, id)
	if err != nil {
		a.galatServer(w, "mengambil hasil ujian", err)
		return
	}
	defer baris.Close()

	hasil := []map[string]any{}
	var jumlahLulus int
	for baris.Next() {
		var sesiID, pendaftarID, benar, total int
		var noReg, nama, jurusan, status string
		var skor float64
		var mulai time.Time
		var selesai sql.NullTime
		if err := baris.Scan(&sesiID, &pendaftarID, &noReg, &nama, &jurusan,
			&status, &benar, &total, &skor, &mulai, &selesai); err != nil {
			a.galatServer(w, "membaca hasil ujian", err)
			return
		}
		lulus := status == "Selesai" && int(skor+0.5) >= nilaiMinimum
		if lulus {
			jumlahLulus++
		}
		hasil = append(hasil, map[string]any{
			"sesi_id": sesiID, "pendaftar_id": pendaftarID,
			"no_registrasi": noReg, "nama_lengkap": nama, "nama_jurusan": jurusan,
			"status": status, "jumlah_benar": benar, "jumlah_soal": total,
			"skor": skor, "lulus": lulus,
			"mulai_pada":   mulai.Format(time.RFC3339),
			"selesai_pada": waktuAtauNil(selesai),
		})
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca hasil ujian", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":          hasil,
		"nilai_minimum": nilaiMinimum,
		"jumlah_lulus":  jumlahLulus,
	})
}

/* ---------------- sisi peserta ---------------- */

type permintaanMulaiUjian struct {
	NoRegistrasi string `json:"no_registrasi"`
	TanggalLahir string `json:"tanggal_lahir"`
}

// paketBerlaku mengambil paket yang sedang dibuka untuk diikuti.
func (a *Aplikasi) paketBerlaku() (PaketUjian, error) {
	var p PaketUjian
	var mulai, selesai sql.NullTime
	err := a.db.QueryRow(
		`SELECT id, nama, tahun_ajaran, durasi_menit, jumlah_soal, acak_soal,
		        mulai, selesai, nilai_minimum, keterangan, aktif
		 FROM paket_ujian
		 WHERE aktif = true
		   AND (mulai IS NULL OR mulai <= now())
		   AND (selesai IS NULL OR selesai >= now())
		 ORDER BY id DESC LIMIT 1`).
		Scan(&p.ID, &p.Nama, &p.TahunAjaran, &p.DurasiMenit, &p.JumlahSoal,
			&p.AcakSoal, &mulai, &selesai, &p.NilaiMinimum, &p.Keterangan, &p.Aktif)
	if err != nil {
		return p, err
	}
	p.Mulai = waktuAtauNil(mulai)
	p.Selesai = waktuAtauNil(selesai)
	return p, nil
}

// tanganiInfoUjian dipakai halaman Info PPDB untuk memberi tahu apakah tes
// seleksi sedang dibuka, tanpa perlu identitas peserta.
func (a *Aplikasi) tanganiInfoUjian(w http.ResponseWriter, r *http.Request) {
	jawab := map[string]any{
		"dibuka": false,
		"info":   a.atur("ujian_info"),
		"paket":  nil,
	}
	if a.atur("ujian_aktif") != "1" {
		kirimJSON(w, http.StatusOK, jawab)
		return
	}
	p, err := a.paketBerlaku()
	if err == sql.ErrNoRows {
		kirimJSON(w, http.StatusOK, jawab)
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil paket ujian", err)
		return
	}
	jawab["dibuka"] = true
	jawab["paket"] = map[string]any{
		"nama": p.Nama, "durasi_menit": p.DurasiMenit,
		"jumlah_soal": p.JumlahSoal, "mulai": p.Mulai, "selesai": p.Selesai,
		"keterangan": p.Keterangan, "nilai_minimum": p.NilaiMinimum,
	}
	kirimJSON(w, http.StatusOK, jawab)
}

func (a *Aplikasi) tanganiMulaiUjian(w http.ResponseWriter, r *http.Request) {
	var p permintaanMulaiUjian
	if !bacaJSON(w, r, &p) {
		return
	}
	if a.atur("ujian_aktif") != "1" {
		kirimGalat(w, http.StatusForbidden,
			"Tes seleksi sedang tidak dibuka. Perhatikan jadwal pada halaman Info PPDB.")
		return
	}

	paket, err := a.paketBerlaku()
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusForbidden,
			"Belum ada jadwal tes seleksi yang sedang berjalan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil paket ujian", err)
		return
	}

	// Identitas peserta memakai kunci yang sama dengan cek status: nomor
	// registrasi beserta tanggal lahir. Nomor saja tidak cukup, supaya orang
	// lain tidak dapat mengerjakan ujian atas nama pendaftar dengan menebak
	// nomor urut.
	var pendaftarID int
	var nama, status string
	err = a.db.QueryRow(
		`SELECT id, nama_lengkap, status FROM pendaftar
		 WHERE upper(no_registrasi) = upper($1) AND tanggal_lahir = $2`,
		strings.TrimSpace(p.NoRegistrasi), strings.TrimSpace(p.TanggalLahir)).
		Scan(&pendaftarID, &nama, &status)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound,
			"Data tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir.")
		return
	}
	if err != nil {
		a.galatServer(w, "mencari pendaftar", err)
		return
	}

	// Yang berkasnya belum diverifikasi belum tentu berhak ikut, dan yang
	// sudah ditolak jelas tidak. Pemeriksaan ini di server, bukan hanya
	// menyembunyikan tombolnya di halaman.
	if status == "Menunggu Verifikasi" {
		kirimGalat(w, http.StatusForbidden,
			"Berkas Anda masih menunggu verifikasi panitia, jadi tes seleksi belum dapat dimulai.")
		return
	}
	if status == "Ditolak" {
		kirimGalat(w, http.StatusForbidden,
			"Pendaftaran Anda tidak dapat dilanjutkan ke tes seleksi. Silakan hubungi panitia.")
		return
	}

	sesi, err := a.mulaiAtauLanjutkanSesi(r.Context(), pendaftarID, paket)
	if err != nil {
		if errors.Is(err, GalatSoalKurang) {
			kirimGalat(w, http.StatusConflict,
				"Bank soal belum mencukupi untuk paket ini. Silakan hubungi panitia.")
			return
		}
		a.galatServer(w, "memulai sesi ujian", err)
		return
	}

	if sesi.Status == "Selesai" || sesi.Status == "Kedaluwarsa" {
		kirimJSON(w, http.StatusOK, map[string]any{
			"sudah_selesai": true,
			"hasil":         a.ringkasanSesi(sesi, paket),
		})
		return
	}

	token, err := buatToken(a.cfg.RahasiaToken, IsiToken{
		ID:       sesi.ID,
		Username: strings.ToUpper(strings.TrimSpace(p.NoRegistrasi)),
		Nama:     nama,
		Role:     PeranPeserta,
		// Token berlaku sampai batas waktu sesi ditambah sedikit kelonggaran,
		// supaya peserta tetap dapat mengirim jawaban terakhirnya.
		Kedaluwarsa: sesi.BatasPada.Add(5 * time.Minute).Unix(),
	})
	if err != nil {
		a.galatServer(w, "membuat token peserta", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"sudah_selesai": false,
		"token":         token,
		"sesi": map[string]any{
			"id":            sesi.ID,
			"batas_pada":    sesi.BatasPada.Format(time.RFC3339),
			"sisa_detik":    int(time.Until(sesi.BatasPada).Seconds()),
			"jumlah_soal":   sesi.JumlahSoal,
			"nama_paket":    paket.Nama,
			"nama_peserta":  nama,
			"no_registrasi": strings.ToUpper(strings.TrimSpace(p.NoRegistrasi)),
		},
	})
}

type SesiUjian struct {
	ID          int
	PendaftarID int
	PaketID     int
	BatasPada   time.Time
	JumlahSoal  int
	JumlahBenar int
	Skor        float64
	Status      string
	SelesaiPada sql.NullTime
}

// mulaiAtauLanjutkanSesi mengembalikan sesi yang sedang berjalan bila ada,
// atau membuat yang baru beserta susunan soalnya.
func (a *Aplikasi) mulaiAtauLanjutkanSesi(ctx context.Context, pendaftarID int, paket PaketUjian) (SesiUjian, error) {
	var s SesiUjian

	t, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return s, err
	}
	defer t.Rollback()

	// Dua permintaan yang datang bersamaan dari peserta yang sama tidak boleh
	// menghasilkan dua sesi. Kuncinya diambil atas nama pasangan
	// pendaftar-paket, bukan seluruh tabel, supaya peserta lain tidak ikut
	// menunggu.
	if _, err := t.Exec("SELECT pg_advisory_xact_lock(hashtext($1))",
		fmt.Sprintf("sesi-%d-%d", pendaftarID, paket.ID)); err != nil {
		return s, err
	}

	err = t.QueryRow(
		`SELECT id, pendaftar_id, paket_id, batas_pada, jumlah_soal,
		        jumlah_benar, skor, status, selesai_pada
		 FROM sesi_ujian WHERE pendaftar_id = $1 AND paket_id = $2`,
		pendaftarID, paket.ID).
		Scan(&s.ID, &s.PendaftarID, &s.PaketID, &s.BatasPada, &s.JumlahSoal,
			&s.JumlahBenar, &s.Skor, &s.Status, &s.SelesaiPada)

	switch {
	case err == nil:
		// Sesi yang waktunya sudah lewat dinilai apa adanya, lalu ditutup.
		if s.Status == "Berjalan" && time.Now().After(s.BatasPada) {
			if err := nilaiSesi(t, &s, paket, "Kedaluwarsa"); err != nil {
				return s, err
			}
		}
		return s, t.Commit()
	case err != sql.ErrNoRows:
		return s, err
	}

	// Sesi baru.
	var tersedia int
	if err := t.QueryRow("SELECT COUNT(*) FROM soal WHERE aktif = true").Scan(&tersedia); err != nil {
		return s, err
	}
	if tersedia < paket.JumlahSoal {
		return s, GalatSoalKurang
	}

	batas := time.Now().Add(time.Duration(paket.DurasiMenit) * time.Minute)
	// Bila paket punya waktu selesai, batas sesi tidak boleh melewatinya.
	if paket.Selesai != nil {
		if akhir, err := time.Parse(time.RFC3339, *paket.Selesai); err == nil && batas.After(akhir) {
			batas = akhir
		}
	}

	err = t.QueryRow(
		`INSERT INTO sesi_ujian (pendaftar_id, paket_id, batas_pada, jumlah_soal, status)
		 VALUES ($1, $2, $3, $4, 'Berjalan') RETURNING id`,
		pendaftarID, paket.ID, batas, paket.JumlahSoal).Scan(&s.ID)
	if err != nil {
		return s, err
	}
	s.PendaftarID, s.PaketID, s.BatasPada = pendaftarID, paket.ID, batas
	s.JumlahSoal, s.Status = paket.JumlahSoal, "Berjalan"

	urut := "id"
	if paket.AcakSoal {
		urut = "random()"
	}
	if _, err := t.Exec(
		`INSERT INTO sesi_soal (sesi_id, soal_id, urutan)
		 SELECT $1, id, row_number() OVER ()
		 FROM (SELECT id FROM soal WHERE aktif = true ORDER BY `+urut+` LIMIT $2) pilihan`,
		s.ID, paket.JumlahSoal); err != nil {
		return s, err
	}

	return s, t.Commit()
}

// nilaiSesi menghitung skor dari jawaban yang sudah tersimpan lalu menutup
// sesinya. Dipanggil saat peserta menekan selesai, maupun saat waktunya habis.
func nilaiSesi(t *sql.Tx, s *SesiUjian, paket PaketUjian, statusAkhir string) error {
	// Kebenaran jawaban ditetapkan di sini, sekali, dan disimpan. Menghitung
	// ulang setiap kali hasilnya dibuka akan memberi jawaban berbeda bila
	// kunci soalnya kemudian diperbaiki panitia.
	if _, err := t.Exec(
		`UPDATE sesi_soal ss
		 SET benar = (ss.jawaban IS NOT NULL AND ss.jawaban = so.jawaban)
		 FROM soal so
		 WHERE so.id = ss.soal_id AND ss.sesi_id = $1`, s.ID); err != nil {
		return err
	}

	var benar int
	if err := t.QueryRow(
		"SELECT COUNT(*) FROM sesi_soal WHERE sesi_id = $1 AND benar = true", s.ID).
		Scan(&benar); err != nil {
		return err
	}

	total := s.JumlahSoal
	if total <= 0 {
		total = paket.JumlahSoal
	}
	skor := 0.0
	if total > 0 {
		skor = float64(benar) / float64(total) * 100
	}

	if _, err := t.Exec(
		`UPDATE sesi_ujian SET jumlah_benar = $1, skor = $2, status = $3,
		        selesai_pada = COALESCE(selesai_pada, now())
		 WHERE id = $4`, benar, skor, statusAkhir, s.ID); err != nil {
		return err
	}
	s.JumlahBenar, s.Skor, s.Status = benar, skor, statusAkhir
	return nil
}

func (a *Aplikasi) ringkasanSesi(s SesiUjian, paket PaketUjian) map[string]any {
	return map[string]any{
		"status":        s.Status,
		"jumlah_benar":  s.JumlahBenar,
		"jumlah_soal":   s.JumlahSoal,
		"skor":          s.Skor,
		"nilai_minimum": paket.NilaiMinimum,
		"lulus":         s.Status == "Selesai" && int(s.Skor+0.5) >= paket.NilaiMinimum,
		"nama_paket":    paket.Nama,
	}
}

// wajibPeserta memeriksa token ujian. Dipisah dari wajibMasuk karena
// perannya berbeda dan jalurnya pun berbeda.
func (a *Aplikasi) wajibPeserta(berikut http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		kepala := r.Header.Get("Authorization")
		if !strings.HasPrefix(kepala, "Bearer ") {
			kirimGalat(w, http.StatusUnauthorized,
				"Sesi ujian tidak dikenali. Silakan mulai kembali dari halaman Cek Status.")
			return
		}
		isi, err := periksaToken(a.cfg.RahasiaToken, strings.TrimPrefix(kepala, "Bearer "))
		if err != nil {
			kirimGalat(w, http.StatusUnauthorized, err.Error())
			return
		}
		if isi.Role != PeranPeserta {
			kirimGalat(w, http.StatusForbidden, "Token ini bukan token peserta ujian.")
			return
		}
		berikut(w, r.WithContext(context.WithValue(r.Context(), kunciPengguna, isi)))
	}
}

// muatSesi mengambil sesi beserta paketnya untuk permintaan dari peserta.
func (a *Aplikasi) muatSesi(sesiID int) (SesiUjian, PaketUjian, error) {
	var s SesiUjian
	var p PaketUjian
	var mulai, selesai sql.NullTime
	err := a.db.QueryRow(
		`SELECT s.id, s.pendaftar_id, s.paket_id, s.batas_pada, s.jumlah_soal,
		        s.jumlah_benar, s.skor, s.status, s.selesai_pada,
		        p.id, p.nama, p.tahun_ajaran, p.durasi_menit, p.jumlah_soal,
		        p.acak_soal, p.mulai, p.selesai, p.nilai_minimum, p.keterangan, p.aktif
		 FROM sesi_ujian s JOIN paket_ujian p ON p.id = s.paket_id
		 WHERE s.id = $1`, sesiID).
		Scan(&s.ID, &s.PendaftarID, &s.PaketID, &s.BatasPada, &s.JumlahSoal,
			&s.JumlahBenar, &s.Skor, &s.Status, &s.SelesaiPada,
			&p.ID, &p.Nama, &p.TahunAjaran, &p.DurasiMenit, &p.JumlahSoal,
			&p.AcakSoal, &mulai, &selesai, &p.NilaiMinimum, &p.Keterangan, &p.Aktif)
	if err != nil {
		return s, p, err
	}
	p.Mulai = waktuAtauNil(mulai)
	p.Selesai = waktuAtauNil(selesai)
	return s, p, nil
}

func (a *Aplikasi) tanganiSoalUjian(w http.ResponseWriter, r *http.Request) {
	sesiID := penggunaDari(r).ID
	s, paket, err := a.muatSesi(sesiID)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Sesi ujian tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil sesi ujian", err)
		return
	}

	if s.Status != "Berjalan" {
		kirimJSON(w, http.StatusOK, map[string]any{
			"selesai": true,
			"hasil":   a.ringkasanSesi(s, paket),
		})
		return
	}
	if time.Now().After(s.BatasPada) {
		if err := a.tutupSesi(r.Context(), &s, paket, "Kedaluwarsa"); err != nil {
			a.galatServer(w, "menutup sesi ujian", err)
			return
		}
		kirimJSON(w, http.StatusOK, map[string]any{
			"selesai": true,
			"hasil":   a.ringkasanSesi(s, paket),
		})
		return
	}

	// Kunci jawaban SENGAJA tidak ikut di SELECT ini. Kalau ikut, kuncinya
	// sampai ke peramban dan seluruh ujian jadi tidak ada artinya.
	baris, err := a.db.Query(
		`SELECT ss.urutan, so.id, so.mata_pelajaran, so.pertanyaan,
		        so.pilihan_a, so.pilihan_b, so.pilihan_c, so.pilihan_d, so.pilihan_e,
		        COALESCE(ss.jawaban, '')
		 FROM sesi_soal ss JOIN soal so ON so.id = ss.soal_id
		 WHERE ss.sesi_id = $1 ORDER BY ss.urutan`, s.ID)
	if err != nil {
		a.galatServer(w, "mengambil soal ujian", err)
		return
	}
	defer baris.Close()

	soal := []map[string]any{}
	terjawab := 0
	for baris.Next() {
		var urutan, id int
		var mapel, pertanyaan, a1, b1, c1, d1, e1, jawaban string
		if err := baris.Scan(&urutan, &id, &mapel, &pertanyaan,
			&a1, &b1, &c1, &d1, &e1, &jawaban); err != nil {
			a.galatServer(w, "membaca soal ujian", err)
			return
		}
		if jawaban != "" {
			terjawab++
		}
		pilihan := []map[string]string{{"huruf": "A", "teks": a1}, {"huruf": "B", "teks": b1}}
		for huruf, teks := range map[string]string{"C": c1, "D": d1, "E": e1} {
			if teks != "" {
				pilihan = append(pilihan, map[string]string{"huruf": huruf, "teks": teks})
			}
		}
		// Urutan pilihan harus tetap A, B, C, D, E; map di Go tidak berurutan.
		urutPilihan(pilihan)
		soal = append(soal, map[string]any{
			"urutan": urutan, "soal_id": id, "mata_pelajaran": mapel,
			"pertanyaan": pertanyaan, "pilihan": pilihan, "jawaban": jawaban,
		})
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca soal ujian", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"selesai":     false,
		"soal":        soal,
		"terjawab":    terjawab,
		"jumlah_soal": len(soal),
		"sisa_detik":  int(time.Until(s.BatasPada).Seconds()),
		"batas_pada":  s.BatasPada.Format(time.RFC3339),
		"nama_paket":  paket.Nama,
	})
}

func urutPilihan(p []map[string]string) {
	urutan := map[string]int{"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
	for i := 1; i < len(p); i++ {
		for j := i; j > 0 && urutan[p[j]["huruf"]] < urutan[p[j-1]["huruf"]]; j-- {
			p[j], p[j-1] = p[j-1], p[j]
		}
	}
}

type permintaanJawab struct {
	SoalID  int    `json:"soal_id"`
	Jawaban string `json:"jawaban"`
}

func (a *Aplikasi) tanganiJawabUjian(w http.ResponseWriter, r *http.Request) {
	var p permintaanJawab
	if !bacaJSON(w, r, &p) {
		return
	}
	jawaban := strings.ToUpper(strings.TrimSpace(p.Jawaban))
	if jawaban != "" && !strings.Contains("ABCDE", jawaban) {
		kirimGalat(w, http.StatusUnprocessableEntity, "Pilihan jawaban tidak dikenal.")
		return
	}

	sesiID := penggunaDari(r).ID
	s, _, err := a.muatSesi(sesiID)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Sesi ujian tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil sesi ujian", err)
		return
	}
	if s.Status != "Berjalan" {
		kirimGalat(w, http.StatusConflict, "Sesi ujian sudah ditutup.")
		return
	}
	// Batas waktu ditegakkan di sini juga, bukan hanya saat soal diambil.
	// Tanpa ini, jawaban masih bisa dikirim setelah waktunya habis.
	if time.Now().After(s.BatasPada) {
		kirimGalat(w, http.StatusConflict, "Waktu ujian sudah habis.")
		return
	}

	var nilaiJawaban any
	if jawaban != "" {
		nilaiJawaban = jawaban
	}
	hasil, err := a.db.Exec(
		"UPDATE sesi_soal SET jawaban = $1 WHERE sesi_id = $2 AND soal_id = $3",
		nilaiJawaban, s.ID, p.SoalID)
	if err != nil {
		a.galatServer(w, "menyimpan jawaban", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Soal itu tidak ada pada sesi ujian Anda.")
		return
	}

	var terjawab int
	_ = a.db.QueryRow(
		"SELECT COUNT(*) FROM sesi_soal WHERE sesi_id = $1 AND jawaban IS NOT NULL", s.ID).
		Scan(&terjawab)

	kirimJSON(w, http.StatusOK, map[string]any{
		"pesan":      "Jawaban tersimpan.",
		"terjawab":   terjawab,
		"sisa_detik": int(time.Until(s.BatasPada).Seconds()),
	})
}

// tutupSesi menilai lalu menutup sesi di luar transaksi pemanggilnya.
func (a *Aplikasi) tutupSesi(ctx context.Context, s *SesiUjian, paket PaketUjian, statusAkhir string) error {
	t, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer t.Rollback()
	if err := nilaiSesi(t, s, paket, statusAkhir); err != nil {
		return err
	}
	return t.Commit()
}

func (a *Aplikasi) tanganiSelesaikanUjian(w http.ResponseWriter, r *http.Request) {
	sesiID := penggunaDari(r).ID
	s, paket, err := a.muatSesi(sesiID)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Sesi ujian tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil sesi ujian", err)
		return
	}
	if s.Status != "Berjalan" {
		kirimJSON(w, http.StatusOK, map[string]any{"hasil": a.ringkasanSesi(s, paket)})
		return
	}

	statusAkhir := "Selesai"
	if time.Now().After(s.BatasPada) {
		statusAkhir = "Kedaluwarsa"
	}
	if err := a.tutupSesi(r.Context(), &s, paket, statusAkhir); err != nil {
		a.galatServer(w, "menutup sesi ujian", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"pesan": "Ujian selesai. Hasilnya dapat dilihat di halaman Cek Status.",
		"hasil": a.ringkasanSesi(s, paket),
	})
}

package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

/* ================= dasbor ================= */

type Cacah struct {
	Label  string `json:"label"`
	Jumlah int    `json:"jumlah"`
	Kuota  int    `json:"kuota,omitempty"`
}

// cacahKan menjalankan kueri yang mengembalikan dua kolom (label, jumlah)
// dan dipakai oleh hampir seluruh ringkasan pada dasbor dan laporan.
func (a *Aplikasi) cacahKan(sqlStr string, arg ...any) ([]Cacah, error) {
	baris, err := a.db.Query(sqlStr, arg...)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Cacah{}
	for baris.Next() {
		var c Cacah
		var label sql.NullString
		if err := baris.Scan(&label, &c.Jumlah); err != nil {
			return nil, err
		}
		c.Label = label.String
		hasil = append(hasil, c)
	}
	return hasil, baris.Err()
}

// cacahJurusan menghitung pendaftar per peminatan sekaligus membawa kuotanya,
// supaya bilah keterisian pada dasbor dan laporan dibandingkan terhadap
// kuota yang benar — bukan terhadap nilai peminatan terbanyak.
func (a *Aplikasi) cacahJurusan(tahunAjaran string, hanyaAktif bool) ([]Cacah, error) {
	sqlStr := `SELECT j.nama, COUNT(p.id), j.kuota FROM jurusan j
	             LEFT JOIN pendaftar p ON p.jurusan_id = j.id AND p.tahun_ajaran = $1`
	if hanyaAktif {
		sqlStr += " WHERE j.aktif = true"
	}
	sqlStr += " GROUP BY j.id ORDER BY j.urutan, j.id"

	baris, err := a.db.Query(sqlStr, tahunAjaran)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Cacah{}
	for baris.Next() {
		var c Cacah
		if err := baris.Scan(&c.Label, &c.Jumlah, &c.Kuota); err != nil {
			return nil, err
		}
		hasil = append(hasil, c)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiDasbor(w http.ResponseWriter, r *http.Request) {
	ta := a.atur("ppdb_tahun")

	perStatus, err := a.cacahKan(
		"SELECT status, COUNT(*) FROM pendaftar WHERE tahun_ajaran = $1 GROUP BY status", ta)
	if err != nil {
		a.galatServer(w, "menghitung status pendaftar", err)
		return
	}
	// Status yang belum punya pendaftar tetap ditampilkan sebagai nol supaya
	// susunan kartu pada dasbor tidak berubah-ubah.
	jumlahStatus := map[string]int{}
	for _, c := range perStatus {
		jumlahStatus[c.Label] = c.Jumlah
	}
	statusLengkap := make([]Cacah, 0, len(StatusPendaftar))
	total := 0
	for _, s := range StatusPendaftar {
		statusLengkap = append(statusLengkap, Cacah{Label: s, Jumlah: jumlahStatus[s]})
		total += jumlahStatus[s]
	}

	var hariIni, mingguIni, pesanBelum int
	kueriTunggal := []struct {
		sql  string
		arg  []any
		tuju *int
		saat string
	}{
		{"SELECT COUNT(*) FROM pendaftar WHERE created_at::date = current_date", nil, &hariIni, "menghitung pendaftar hari ini"},
		{"SELECT COUNT(*) FROM pendaftar WHERE created_at >= current_date - interval '7 days'", nil, &mingguIni, "menghitung pendaftar minggu ini"},
		{"SELECT COUNT(*) FROM pesan WHERE dibaca = false", nil, &pesanBelum, "menghitung pesan belum dibaca"},
	}
	for _, k := range kueriTunggal {
		if err := a.db.QueryRow(k.sql, k.arg...).Scan(k.tuju); err != nil {
			a.galatServer(w, k.saat, err)
			return
		}
	}

	perJurusan, err := a.cacahJurusan(ta, true)
	if err != nil {
		a.galatServer(w, "menghitung pendaftar per jurusan", err)
		return
	}

	perJalur, err := a.cacahKan(
		"SELECT jalur, COUNT(*) FROM pendaftar WHERE tahun_ajaran = $1 GROUP BY jalur ORDER BY COUNT(*) DESC", ta)
	if err != nil {
		a.galatServer(w, "menghitung pendaftar per jalur", err)
		return
	}

	perSumber, err := a.cacahKan(`SELECT COALESCE(NULLIF(sumber_informasi, ''), 'Tidak diisi'), COUNT(*)
	     FROM pendaftar WHERE tahun_ajaran = $1 GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, ta)
	if err != nil {
		a.galatServer(w, "menghitung sumber informasi", err)
		return
	}

	// Tiga tingkat rentang, karena diagram di panel dapat dibaca per tanggal,
	// per bulan, atau per tahun. Ketiganya dihitung di basis data, bukan satu
	// deret harian yang lalu dijumlahkan ulang di peramban: deret harian
	// hanya memuat tiga puluh hari, sehingga tidak mungkin menghasilkan angka
	// per tahun yang benar.
	tren, err := a.cacahKan(`SELECT to_char(created_at, 'YYYY-MM-DD'), COUNT(*) FROM pendaftar
	     WHERE created_at >= current_date - interval '29 days' GROUP BY 1 ORDER BY 1`)
	if err != nil {
		a.galatServer(w, "menghitung tren pendaftaran", err)
		return
	}

	trenBulan, err := a.cacahKan(`SELECT to_char(created_at, 'YYYY-MM'), COUNT(*) FROM pendaftar
	     WHERE created_at >= date_trunc('month', current_date) - interval '11 months'
	     GROUP BY 1 ORDER BY 1`)
	if err != nil {
		a.galatServer(w, "menghitung tren bulanan pendaftaran", err)
		return
	}

	trenTahun, err := a.cacahKan(`SELECT to_char(created_at, 'YYYY'), COUNT(*) FROM pendaftar
	     GROUP BY 1 ORDER BY 1`)
	if err != nil {
		a.galatServer(w, "menghitung tren tahunan pendaftaran", err)
		return
	}

	terbaru, err := a.ambilPendaftar(penyaringPendaftar{TahunAjaran: ta, PerHalaman: 5, Halaman: 1}, false)
	if err != nil {
		a.galatServer(w, "mengambil pendaftar terbaru", err)
		return
	}

	kuotaTotal, _ := strconv.Atoi(a.atur("ppdb_kuota", "0"))
	kirimJSON(w, http.StatusOK, map[string]any{
		"tahun_ajaran": ta,
		"ppdb_dibuka":  a.ppdbDibuka(),
		"ppdb_keadaan": a.keadaanPpdb(),
		"total":        total,
		"kuota":        kuotaTotal,
		"hari_ini":     hariIni,
		"minggu_ini":   mingguIni,
		"pesan_belum":  pesanBelum,
		"per_status":   statusLengkap,
		"per_jurusan":  perJurusan,
		"per_jalur":    perJalur,
		"per_sumber":   perSumber,
		"tren":         tren,
		"tren_bulan":   trenBulan,
		"tren_tahun":   trenTahun,
		"terbaru":      terbaru.Data,
	})
}

/* ================= daftar pendaftar ================= */

// Kolom pendaftar untuk tampilan daftar. Sengaja tidak memuat seluruh kolom
// agar daftar tetap ringan; rincian lengkap diambil pada halaman detail.
const kolomRingkas = `p.id, p.no_registrasi, p.tahun_ajaran, p.jalur, p.jurusan_id,
	COALESCE(j.nama, '') AS nama_jurusan, p.nama_lengkap, COALESCE(p.nisn, ''),
	p.jenis_kelamin, to_char(p.tanggal_lahir, 'YYYY-MM-DD'), p.asal_sekolah,
	p.no_hp, COALESCE(p.email, ''), p.nilai_rata2,
	COALESCE(p.sumber_informasi, ''), p.status,
	to_char(p.created_at, 'YYYY-MM-DD HH24:MI') AS dibuat`

type RingkasPendaftar struct {
	ID           int      `json:"id"`
	NoRegistrasi string   `json:"no_registrasi"`
	TahunAjaran  string   `json:"tahun_ajaran"`
	Jalur        string   `json:"jalur"`
	JurusanID    *int     `json:"jurusan_id"`
	NamaJurusan  string   `json:"nama_jurusan"`
	NamaLengkap  string   `json:"nama_lengkap"`
	NISN         string   `json:"nisn"`
	JenisKelamin string   `json:"jenis_kelamin"`
	TanggalLahir string   `json:"tanggal_lahir"`
	AsalSekolah  string   `json:"asal_sekolah"`
	NoHP         string   `json:"no_hp"`
	Email        string   `json:"email"`
	NilaiRata2   *float64 `json:"nilai_rata2"`
	SumberInfo   string   `json:"sumber_informasi"`
	Status       string   `json:"status"`
	Dibuat       string   `json:"dibuat"`
}

type penyaringPendaftar struct {
	TahunAjaran string
	Status      string
	Jalur       string
	JurusanID   string
	Sumber      string
	Cari        string
	Urut        string
	Halaman     int
	PerHalaman  int
}

type hasilPendaftar struct {
	Data       []RingkasPendaftar `json:"data"`
	Total      int                `json:"total"`
	Halaman    int                `json:"halaman"`
	PerHalaman int                `json:"per_halaman"`
}

// urutanDiizinkan memetakan nama urutan dari luar ke potongan SQL yang sudah
// ditetapkan, sehingga nilai dari pemanggil tidak pernah masuk ke kueri.
var urutanDiizinkan = map[string]string{
	"terbaru":       "p.created_at DESC, p.id DESC",
	"terlama":       "p.created_at ASC, p.id ASC",
	"nama":          "p.nama_lengkap ASC",
	"nilai":         "p.nilai_rata2 IS NULL, p.nilai_rata2 DESC",
	"no_registrasi": "p.no_registrasi ASC",
}

func (a *Aplikasi) ambilPendaftar(f penyaringPendaftar, semuaTahun bool) (hasilPendaftar, error) {
	n := &penomoran{}
	syarat := []string{"1 = 1"}
	arg := []any{}

	if !semuaTahun && f.TahunAjaran != "" {
		syarat = append(syarat, "p.tahun_ajaran = "+n.berikut())
		arg = append(arg, f.TahunAjaran)
	}
	if statusSah(f.Status) {
		syarat = append(syarat, "p.status = "+n.berikut())
		arg = append(arg, f.Status)
	}
	if jalurSah(f.Jalur) {
		syarat = append(syarat, "p.jalur = "+n.berikut())
		arg = append(arg, f.Jalur)
	}
	if id, err := strconv.Atoi(f.JurusanID); err == nil && id > 0 {
		syarat = append(syarat, "p.jurusan_id = "+n.berikut())
		arg = append(arg, id)
	}
	if sumberSah(f.Sumber) {
		syarat = append(syarat, "p.sumber_informasi = "+n.berikut())
		arg = append(arg, f.Sumber)
	}
	if cari := strings.TrimSpace(f.Cari); cari != "" {
		syarat = append(syarat, fmt.Sprintf(
			"(p.nama_lengkap ILIKE %s OR p.no_registrasi ILIKE %s OR "+
				"p.nisn ILIKE %s OR p.asal_sekolah ILIKE %s)",
			n.berikut(), n.berikut(), n.berikut(), n.berikut()))
		pola := "%" + cari + "%"
		arg = append(arg, pola, pola, pola, pola)
	}
	dimana := " WHERE " + strings.Join(syarat, " AND ")

	hasil := hasilPendaftar{Halaman: f.Halaman, PerHalaman: f.PerHalaman, Data: []RingkasPendaftar{}}
	if err := a.db.QueryRow(
		"SELECT COUNT(*) FROM pendaftar p"+dimana, arg...).Scan(&hasil.Total); err != nil {
		return hasil, err
	}

	urut, ada := urutanDiizinkan[f.Urut]
	if !ada {
		urut = urutanDiizinkan["terbaru"]
	}

	argHal := append(append([]any{}, arg...), f.PerHalaman, (f.Halaman-1)*f.PerHalaman)
	baris, err := a.db.Query("SELECT "+kolomRingkas+
		" FROM pendaftar p LEFT JOIN jurusan j ON j.id = p.jurusan_id"+dimana+
		" ORDER BY "+urut+" LIMIT "+n.berikut()+" OFFSET "+n.berikut(), argHal...)
	if err != nil {
		return hasil, err
	}
	defer baris.Close()

	for baris.Next() {
		var p RingkasPendaftar
		if err := baris.Scan(&p.ID, &p.NoRegistrasi, &p.TahunAjaran, &p.Jalur, &p.JurusanID,
			&p.NamaJurusan, &p.NamaLengkap, &p.NISN, &p.JenisKelamin, &p.TanggalLahir,
			&p.AsalSekolah, &p.NoHP, &p.Email, &p.NilaiRata2, &p.SumberInfo,
			&p.Status, &p.Dibuat); err != nil {
			return hasil, err
		}
		hasil.Data = append(hasil.Data, p)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) penyaringDariKueri(r *http.Request) penyaringPendaftar {
	q := r.URL.Query()
	ta := strings.TrimSpace(q.Get("tahun_ajaran"))
	if ta == "" {
		ta = a.atur("ppdb_tahun")
	}
	return penyaringPendaftar{
		TahunAjaran: ta,
		Status:      q.Get("status"),
		Jalur:       q.Get("jalur"),
		JurusanID:   q.Get("jurusan_id"),
		Sumber:      q.Get("sumber"),
		Cari:        q.Get("cari"),
		Urut:        q.Get("urut"),
		Halaman:     bilanganKueri(q.Get("halaman"), 1, 1, 100000),
		PerHalaman:  bilanganKueri(q.Get("per_halaman"), 25, 1, 200),
	}
}

func (a *Aplikasi) tanganiDaftarPendaftar(w http.ResponseWriter, r *http.Request) {
	f := a.penyaringDariKueri(r)
	semua := r.URL.Query().Get("tahun_ajaran") == "semua"

	hasil, err := a.ambilPendaftar(f, semua)
	if err != nil {
		a.galatServer(w, "mengambil daftar pendaftar", err)
		return
	}

	tahunAda, err := a.tahunAjaranAda()
	if err != nil {
		a.galatServer(w, "mengambil daftar tahun ajaran", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":         hasil.Data,
		"total":        hasil.Total,
		"halaman":      hasil.Halaman,
		"per_halaman":  hasil.PerHalaman,
		"tahun_ajaran": f.TahunAjaran,
		"pilihan": map[string]any{
			"status":       StatusPendaftar,
			"jalur":        JalurPendaftaran,
			"sumber":       SumberInformasi,
			"tahun_ajaran": tahunAda,
		},
	})
}

func (a *Aplikasi) tahunAjaranAda() ([]string, error) {
	baris, err := a.db.Query("SELECT DISTINCT tahun_ajaran FROM pendaftar ORDER BY tahun_ajaran DESC")
	if err != nil {
		return nil, err
	}
	defer baris.Close()
	hasil := []string{}
	for baris.Next() {
		var t string
		if err := baris.Scan(&t); err != nil {
			return nil, err
		}
		hasil = append(hasil, t)
	}
	return hasil, baris.Err()
}

/* ================= detail pendaftar ================= */

func (a *Aplikasi) tanganiDetailPendaftar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		kirimGalat(w, http.StatusBadRequest, "Nomor data tidak valid.")
		return
	}

	var p Pendaftar
	err = a.db.QueryRow(`
		SELECT p.id, p.no_registrasi, p.tahun_ajaran, p.jalur, p.jurusan_id, COALESCE(j.nama, ''),
		       p.nama_lengkap, COALESCE(p.nisn, ''), COALESCE(p.nik, ''), p.jenis_kelamin,
		       p.tempat_lahir, to_char(p.tanggal_lahir, 'YYYY-MM-DD'), p.agama,
		       COALESCE(p.anak_ke, ''), COALESCE(p.jumlah_saudara, ''), p.alamat,
		       COALESCE(p.kelurahan, ''), COALESCE(p.kecamatan, ''), COALESCE(p.kota, ''),
		       COALESCE(p.provinsi, ''), COALESCE(p.kode_pos, ''), p.no_hp, COALESCE(p.email, ''),
		       p.asal_sekolah, p.asal_sekolah_terdaftar,
		       COALESCE(p.npsn_sekolah, ''), COALESCE(p.alamat_sekolah, ''),
		       COALESCE(p.tahun_lulus, ''), p.nilai_rata2,
		       p.nama_ayah, COALESCE(p.pekerjaan_ayah, ''), COALESCE(p.pendidikan_ayah, ''),
		       p.nama_ibu, COALESCE(p.pekerjaan_ibu, ''), COALESCE(p.pendidikan_ibu, ''),
		       COALESCE(p.penghasilan, ''), COALESCE(p.no_hp_ortu, ''), COALESCE(p.nama_wali, ''),
		       COALESCE(p.file_foto, ''), COALESCE(p.file_ijazah, ''), COALESCE(p.file_kk, ''),
		       COALESCE(p.file_akta, ''), COALESCE(p.file_raport, ''), COALESCE(p.file_prestasi, ''),
		       COALESCE(p.sumber_informasi, ''), COALESCE(p.catatan_sumber, ''),
		       p.status, COALESCE(p.catatan_admin, ''), p.diverifikasi_oleh, COALESCE(u.nama, ''),
		       COALESCE(p.ip_pendaftar, ''), COALESCE(t.nama, ''),
		       to_char(p.created_at, 'YYYY-MM-DD HH24:MI'), to_char(p.updated_at, 'YYYY-MM-DD HH24:MI')
		  FROM pendaftar p
		  LEFT JOIN jurusan j ON j.id = p.jurusan_id
		  LEFT JOIN users u ON u.id = p.diverifikasi_oleh
		  LEFT JOIN users t ON t.id = p.dibuat_oleh
		 WHERE p.id = $1`, id).Scan(
		&p.ID, &p.NoRegistrasi, &p.TahunAjaran, &p.Jalur, &p.JurusanID, &p.NamaJurusan,
		&p.NamaLengkap, &p.NISN, &p.NIK, &p.JenisKelamin,
		&p.TempatLahir, &p.TanggalLahir, &p.Agama,
		&p.AnakKe, &p.JumlahSaudara, &p.Alamat,
		&p.Kelurahan, &p.Kecamatan, &p.Kota, &p.Provinsi, &p.KodePos, &p.NoHP, &p.Email,
		&p.AsalSekolah, &p.AsalSekolahTerdaftar, &p.NPSNSekolah, &p.AlamatSekolah,
		&p.TahunLulus, &p.NilaiRata2,
		&p.NamaAyah, &p.PekerjaanAyah, &p.PendidikanAyah,
		&p.NamaIbu, &p.PekerjaanIbu, &p.PendidikanIbu,
		&p.Penghasilan, &p.NoHPOrtu, &p.NamaWali,
		&p.FileFoto, &p.FileIjazah, &p.FileKK, &p.FileAkta, &p.FileRaport, &p.FilePrestasi,
		&p.SumberInfo, &p.CatatanSumber,
		&p.Status, &p.CatatanAdmin, &p.DiverifikasiOleh, &p.NamaVerifikator,
		&p.IPPendaftar, &p.DitambahkanOleh, &p.Dibuat, &p.Diubah)

	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Data pendaftar tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil detail pendaftar", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":           p,
		"pilihan_status": StatusPendaftar,
		"label_sumber":   LabelSumberInformasi,
	})
}

/* ================= ubah status ================= */

type permintaanStatus struct {
	Status       string `json:"status"`
	CatatanAdmin string `json:"catatan_admin"`
}

func (a *Aplikasi) tanganiUbahStatus(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		kirimGalat(w, http.StatusBadRequest, "Nomor data tidak valid.")
		return
	}
	var p permintaanStatus
	if !bacaJSON(w, r, &p) {
		return
	}
	if !statusSah(p.Status) {
		kirimGalat(w, http.StatusUnprocessableEntity, "Status yang dipilih tidak valid.")
		return
	}
	if len([]rune(p.CatatanAdmin)) > 2000 {
		kirimGalat(w, http.StatusUnprocessableEntity, "Catatan maksimal 2000 karakter.")
		return
	}

	saya := penggunaDari(r)
	hasil, err := a.db.Exec(
		`UPDATE pendaftar SET status = $1, catatan_admin = $2, diverifikasi_oleh = $3 WHERE id = $4`,
		p.Status, kosongJadiNil(p.CatatanAdmin), saya.ID, id)
	if err != nil {
		a.galatServer(w, "memperbarui status pendaftar", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		// Nol baris juga terjadi bila nilainya memang sudah sama, jadi
		// keberadaan datanya diperiksa dulu sebelum melaporkan tidak ada.
		var ada int
		if a.db.QueryRow("SELECT id FROM pendaftar WHERE id = $1", id).Scan(&ada) == sql.ErrNoRows {
			kirimGalat(w, http.StatusNotFound, "Data pendaftar tidak ditemukan.")
			return
		}
	}

	// Notifikasi disusun otomatis, tetapi TIDAK langsung dikirim. Yang
	// tercatat berstatus Menunggu di menu Notifikasi, dan panitia meninjaunya
	// lebih dulu. Pesan yang salah tidak dapat ditarik kembali dari WhatsApp,
	// jadi satu langkah peninjauan lebih murah daripada satu pesan keliru.
	//
	// Kegagalannya tidak membatalkan perubahan status: status pendaftar lebih
	// penting daripada pesan pengantarnya.
	// Diterima mendapat jenisnya sendiri, `daftar_ulang`, BUKAN `kelulusan`.
	// Satu pesan yang sekaligus mengabarkan hasilnya dan menerangkan langkah
	// daftar ulangnya lebih berguna daripada dua pesan berurutan yang
	// setengah-setengah: pendaftar yang diterima pertanyaan berikutnya selalu
	// "lalu saya harus apa". Ditolak dan Cadangan tetap memakai `kelulusan`.
	jenis := "verifikasi"
	switch p.Status {
	case "Diterima":
		jenis = "daftar_ulang"
	case "Ditolak", "Cadangan":
		jenis = "kelulusan"
	}
	if err := a.buatNotifikasi(id, jenis, map[string]string{
		"status":  strings.ToLower(p.Status),
		"catatan": strings.TrimSpace(p.CatatanAdmin),
	}); err != nil {
		a.log.Printf("gagal menyusun notifikasi untuk pendaftar %d: %v", id, err)
	}

	kirimJSON(w, http.StatusOK, map[string]string{
		"pesan": "Status pendaftar berhasil diperbarui.",
	})
}

type permintaanRuangUjian struct {
	RuangUjian string `json:"ruang_ujian"`
	KursiUjian string `json:"kursi_ujian"`
}

// tanganiUbahRuangUjian menyimpan ruang dan nomor kursi yang dicetak pada
// kartu peserta.
func (a *Aplikasi) tanganiUbahRuangUjian(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanRuangUjian
	if !bacaJSON(w, r, &p) {
		return
	}
	p.RuangUjian = strings.TrimSpace(p.RuangUjian)
	p.KursiUjian = strings.TrimSpace(p.KursiUjian)

	v := validasiBaru()
	v.panjangMaks("ruang_ujian", "Ruang ujian", p.RuangUjian, 40)
	v.panjangMaks("kursi_ujian", "Nomor kursi", p.KursiUjian, 20)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	hasil, err := a.db.Exec(
		"UPDATE pendaftar SET ruang_ujian = $1, kursi_ujian = $2 WHERE id = $3",
		p.RuangUjian, p.KursiUjian, id)
	if err != nil {
		a.galatServer(w, "menyimpan ruang ujian", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		var ada int
		if a.db.QueryRow("SELECT id FROM pendaftar WHERE id = $1", id).Scan(&ada) == sql.ErrNoRows {
			kirimGalat(w, http.StatusNotFound, "Data pendaftar tidak ditemukan.")
			return
		}
	}
	kirimJSON(w, http.StatusOK, map[string]string{
		"pesan": "Ruang dan nomor kursi disimpan.",
	})
}

/* ================= hapus pendaftar ================= */

func (a *Aplikasi) tanganiHapusPendaftar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		kirimGalat(w, http.StatusBadRequest, "Nomor data tidak valid.")
		return
	}

	// Nama berkas dibaca lebih dulu supaya dokumen pribadi pendaftar ikut
	// terhapus dari server, tidak hanya barisnya di basis data.
	var berkas [6]sql.NullString
	err = a.db.QueryRow(`SELECT file_foto, file_ijazah, file_kk, file_akta, file_raport, file_prestasi
	                       FROM pendaftar WHERE id = $1`, id).
		Scan(&berkas[0], &berkas[1], &berkas[2], &berkas[3], &berkas[4], &berkas[5])
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Data pendaftar tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil berkas pendaftar", err)
		return
	}

	if _, err := a.db.Exec("DELETE FROM pendaftar WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus pendaftar", err)
		return
	}
	for _, b := range berkas {
		a.hapusUnggahan("pendaftar", b.String)
	}

	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Data pendaftar berhasil dihapus."})
}

/* ================= ekspor CSV ================= */

// tanganiEksporPendaftar mengirim berkas CSV agar data dapat dibuka di Excel
// atau LibreOffice untuk keperluan laporan sekolah.
func (a *Aplikasi) tanganiEksporPendaftar(w http.ResponseWriter, r *http.Request) {
	f := a.penyaringDariKueri(r)
	f.Halaman, f.PerHalaman = 1, 5000
	semua := r.URL.Query().Get("tahun_ajaran") == "semua"

	hasil, err := a.ambilPendaftar(f, semua)
	if err != nil {
		a.galatServer(w, "mengambil data untuk ekspor", err)
		return
	}

	namaBerkas := fmt.Sprintf("pendaftar-%s-%s.csv",
		strings.ReplaceAll(f.TahunAjaran, "/", "-"), time.Now().Format("20060102"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+namaBerkas+`"`)

	// BOM UTF-8 supaya Excel di Windows membaca huruf beraksen dengan benar.
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	tulis := csv.NewWriter(w)
	defer tulis.Flush()

	tulis.Write([]string{
		"No. Registrasi", "Tahun Ajaran", "Jalur", "Peminatan", "Nama Lengkap", "NISN",
		"Jenis Kelamin", "Tanggal Lahir", "Asal Sekolah", "No. HP", "Email",
		"Nilai Rata-rata", "Sumber Informasi", "Status", "Waktu Mendaftar",
	})
	for _, p := range hasil.Data {
		nilai := ""
		if p.NilaiRata2 != nil {
			nilai = strconv.FormatFloat(*p.NilaiRata2, 'f', 2, 64)
		}
		jk := "Laki-laki"
		if p.JenisKelamin == "P" {
			jk = "Perempuan"
		}
		tulis.Write([]string{
			p.NoRegistrasi, p.TahunAjaran, p.Jalur, p.NamaJurusan, p.NamaLengkap, p.NISN,
			jk, p.TanggalLahir, p.AsalSekolah, p.NoHP, p.Email,
			nilai, p.SumberInfo, p.Status, p.Dibuat,
		})
	}
}

/* ================= laporan ================= */

// tanganiLaporan menyusun angka-angka yang menjadi inti tujuan program ini:
// mengukur kanal promosi mana yang benar-benar membawa pendaftar.
func (a *Aplikasi) tanganiLaporan(w http.ResponseWriter, r *http.Request) {
	ta := strings.TrimSpace(r.URL.Query().Get("tahun_ajaran"))
	if ta == "" {
		ta = a.atur("ppdb_tahun")
	}

	var total int
	if err := a.db.QueryRow(
		"SELECT COUNT(*) FROM pendaftar WHERE tahun_ajaran = $1", ta).Scan(&total); err != nil {
		a.galatServer(w, "menghitung total pendaftar", err)
		return
	}

	bagian := map[string]string{
		"per_sumber": `SELECT COALESCE(NULLIF(sumber_informasi, ''), 'Tidak diisi'), COUNT(*)
		                 FROM pendaftar WHERE tahun_ajaran = $1 GROUP BY 1 ORDER BY 2 DESC`,
		"per_status": `SELECT status, COUNT(*) FROM pendaftar WHERE tahun_ajaran = $1 GROUP BY status`,
		"per_jalur": `SELECT jalur, COUNT(*) FROM pendaftar WHERE tahun_ajaran = $1
		                GROUP BY jalur ORDER BY 2 DESC`,
		"per_jenis_kelamin": `SELECT CASE WHEN jenis_kelamin = 'L' THEN 'Laki-laki' ELSE 'Perempuan' END, COUNT(*)
		                        FROM pendaftar WHERE tahun_ajaran = $1 GROUP BY jenis_kelamin`,
		"per_asal_sekolah": `SELECT asal_sekolah, COUNT(*) FROM pendaftar WHERE tahun_ajaran = $1
		                       GROUP BY asal_sekolah ORDER BY 2 DESC LIMIT 12`,
		"per_bulan": `SELECT to_char(created_at, 'YYYY-MM'), COUNT(*) FROM pendaftar
		                WHERE tahun_ajaran = $1 GROUP BY 1 ORDER BY 1`,
	}

	laporan := map[string]any{}
	for nama, kueri := range bagian {
		data, err := a.cacahKan(kueri, ta)
		if err != nil {
			a.galatServer(w, "menyusun laporan "+nama, err)
			return
		}
		laporan[nama] = data
	}

	perJurusan, err := a.cacahJurusan(ta, false)
	if err != nil {
		a.galatServer(w, "menyusun laporan per jurusan", err)
		return
	}
	laporan["per_jurusan"] = perJurusan

	tahunAda, err := a.tahunAjaranAda()
	if err != nil {
		a.galatServer(w, "mengambil daftar tahun ajaran", err)
		return
	}

	laporan["tahun_ajaran"] = ta
	laporan["total"] = total
	laporan["pilihan_tahun"] = tahunAda
	laporan["label_sumber"] = LabelSumberInformasi
	kirimJSON(w, http.StatusOK, laporan)
}

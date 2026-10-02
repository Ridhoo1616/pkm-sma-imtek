package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

/*
Bursa Kerja Khusus (BKK): penyaluran lulusan ke dunia kerja.

Alurnya sengaja sependek mungkin bagi lulusan, dan sejelas mungkin bagi
petugas:

	mitra  ->  lowongan dibuka  ->  lulusan melamar lewat situs
	       ->  petugas meneruskan ke mitra, mencatat wawancara
	       ->  Diterima (tersalurkan) atau Ditolak

Lulusan memantau lamarannya dengan NISN dan tanggal lahir, pasangan yang
sama seperti cek status PPDB. Kode lamaran tetap diberikan sebagai nomor
rujukan ketika menghubungi petugas, tetapi tidak wajib diingat.

CV masuk folder `bkk-cv` yang dilindungi token (lihat sajikanUnggahan),
sebab isinya data pribadi. Logo mitra masuk folder `bkk-mitra` yang publik.
*/

var (
	JenisLowongan  = []string{"Penuh Waktu", "Kontrak", "Paruh Waktu", "Magang"}
	StatusLowongan = []string{"draf", "buka", "tutup"}
	// Urutannya urutan tahap penyaluran, dipakai panel untuk menyusun
	// ringkasan dari kiri ke kanan.
	StatusLamaran = []string{"Diajukan", "Diteruskan", "Wawancara", "Diterima", "Ditolak"}
)

const (
	folderCvBkk    = "bkk-cv"
	folderMitraBkk = "bkk-mitra"
)

type MitraBkk struct {
	ID             int    `json:"id"`
	Nama           string `json:"nama"`
	Bidang         string `json:"bidang"`
	Alamat         string `json:"alamat"`
	KontakNama     string `json:"kontak_nama,omitempty"`
	KontakTelepon  string `json:"kontak_telepon,omitempty"`
	KontakEmail    string `json:"kontak_email,omitempty"`
	Situs          string `json:"situs"`
	Logo           string `json:"logo"`
	Aktif          bool   `json:"aktif"`
	LowonganDibuka int    `json:"lowongan_dibuka"`
	JumlahLowongan int    `json:"jumlah_lowongan"`
	Tersalurkan    int    `json:"tersalurkan"`
}

type LowonganBkk struct {
	ID          int     `json:"id"`
	MitraID     int     `json:"mitra_id"`
	NamaMitra   string  `json:"nama_mitra"`
	LogoMitra   string  `json:"logo_mitra"`
	BidangMitra string  `json:"bidang_mitra"`
	Posisi      string  `json:"posisi"`
	Jenis       string  `json:"jenis"`
	Lokasi      string  `json:"lokasi"`
	Deskripsi   string  `json:"deskripsi"`
	Kualifikasi string  `json:"kualifikasi"`
	Gaji        string  `json:"gaji"`
	Kuota       *int    `json:"kuota"`
	BatasLamar  *string `json:"batas_lamar"`
	Status      string  `json:"status"`
	// Dibuka = status buka, batas lamar belum lewat, dan mitranya aktif.
	// Ketiganya dihitung di basis data supaya situs dan panel sepakat.
	Dibuka        bool   `json:"dibuka"`
	JumlahPelamar int    `json:"jumlah_pelamar"`
	Diterima      int    `json:"diterima"`
	Dibuat        string `json:"dibuat"`
}

type LamaranBkk struct {
	ID           int    `json:"id"`
	Kode         string `json:"kode"`
	LowonganID   int    `json:"lowongan_id"`
	Posisi       string `json:"posisi"`
	NamaMitra    string `json:"nama_mitra"`
	Nama         string `json:"nama"`
	Nisn         string `json:"nisn"`
	TanggalLahir string `json:"tanggal_lahir"`
	JenisKelamin string `json:"jenis_kelamin"`
	TahunLulus   int    `json:"tahun_lulus"`
	Telepon      string `json:"telepon"`
	Email        string `json:"email"`
	Alamat       string `json:"alamat"`
	Ringkasan    string `json:"ringkasan"`
	Cv           string `json:"cv"`
	Status       string `json:"status"`
	Catatan      string `json:"catatan"`
	Sumber       string `json:"sumber"`
	Dibuat       string `json:"dibuat"`
	Diubah       string `json:"diubah"`
}

// syaratLowonganDibuka dipakai di setiap kueri yang perlu tahu apakah sebuah
// lowongan masih menerima lamaran. Alias tabelnya harus `l` dan `m`.
const syaratLowonganDibuka = `(l.status = 'buka' AND m.aktif
	AND (l.batas_lamar IS NULL OR l.batas_lamar >= CURRENT_DATE))`

func pelanggaranUnik(err error) bool { return kodeGanda(err) }

// pelanggaranAcuan mengenali SQLSTATE 23503: baris masih dirujuk tabel lain
// (ON DELETE RESTRICT), atau rujukannya tidak ada.
func pelanggaranAcuan(err error) bool {
	var galatSQL interface{ SQLState() string }
	return err != nil && errors.As(err, &galatSQL) && galatSQL.SQLState() == "23503"
}

func tautanSah(v *Validasi, kolom, label, nilai string) {
	if nilai != "" && !strings.HasPrefix(nilai, "http://") && !strings.HasPrefix(nilai, "https://") {
		v.tambah(kolom, label+" harus dimulai dengan http:// atau https://.")
	}
}

/* ================= mitra ================= */

func (a *Aplikasi) ambilMitraBkk(hanyaAktif bool) ([]MitraBkk, error) {
	syarat := ""
	if hanyaAktif {
		syarat = "WHERE m.aktif"
	}
	baris, err := a.db.Query(`
		SELECT m.id, m.nama, m.bidang, m.alamat, m.kontak_nama, m.kontak_telepon,
		       m.kontak_email, m.situs, COALESCE(m.logo, ''), m.aktif,
		       (SELECT COUNT(*) FROM bkk_lowongan l WHERE l.mitra_id = m.id AND ` + syaratLowonganDibuka + `),
		       (SELECT COUNT(*) FROM bkk_lowongan l WHERE l.mitra_id = m.id),
		       (SELECT COUNT(*) FROM bkk_lamaran s JOIN bkk_lowongan l ON l.id = s.lowongan_id
		         WHERE l.mitra_id = m.id AND s.status = 'Diterima')
		  FROM bkk_mitra m ` + syarat + `
		 ORDER BY m.aktif DESC, m.nama`)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []MitraBkk{}
	for baris.Next() {
		var m MitraBkk
		if err := baris.Scan(&m.ID, &m.Nama, &m.Bidang, &m.Alamat, &m.KontakNama,
			&m.KontakTelepon, &m.KontakEmail, &m.Situs, &m.Logo, &m.Aktif,
			&m.LowonganDibuka, &m.JumlahLowongan, &m.Tersalurkan); err != nil {
			return nil, err
		}
		hasil = append(hasil, m)
	}
	return hasil, baris.Err()
}

// Kontak petugas di perusahaan mitra hanya untuk BKK. Situs publik cukup
// menampilkan nama, bidang, alamat, dan situs perusahaannya.
func (a *Aplikasi) tanganiMitraBkkPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilMitraBkk(true)
	if err != nil {
		a.galatServer(w, "mengambil mitra BKK", err)
		return
	}
	for i := range daftar {
		daftar[i].KontakNama, daftar[i].KontakTelepon, daftar[i].KontakEmail = "", "", ""
		// Jumlah seluruh lowongan ikut menghitung draf.
		daftar[i].JumlahLowongan = 0
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

func (a *Aplikasi) tanganiMitraBkkAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilMitraBkk(false)
	if err != nil {
		a.galatServer(w, "mengambil mitra BKK", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

func bacaIsianMitra(r *http.Request) (m MitraBkk, v *Validasi) {
	ambil := func(s string) string { return strings.TrimSpace(r.FormValue(s)) }
	v = validasiBaru()

	m.Nama = v.wajib("nama", "Nama perusahaan", ambil("nama"))
	v.panjangMaks("nama", "Nama perusahaan", m.Nama, 160)
	m.Bidang = ambil("bidang")
	v.panjangMaks("bidang", "Bidang usaha", m.Bidang, 120)
	m.Alamat = ambil("alamat")
	v.panjangMaks("alamat", "Alamat", m.Alamat, 500)
	m.KontakNama = ambil("kontak_nama")
	v.panjangMaks("kontak_nama", "Nama narahubung", m.KontakNama, 120)
	m.KontakTelepon = ambil("kontak_telepon")
	v.telepon("kontak_telepon", "Telepon narahubung", m.KontakTelepon, false)
	m.KontakEmail = ambil("kontak_email")
	v.panjangMaks("kontak_email", "Email narahubung", m.KontakEmail, 120)
	v.email("kontak_email", m.KontakEmail)
	m.Situs = ambil("situs")
	v.panjangMaks("situs", "Situs perusahaan", m.Situs, 300)
	tautanSah(v, "situs", "Situs perusahaan", m.Situs)
	m.Aktif = bolean(r, "aktif")
	return
}

func (a *Aplikasi) tanganiSimpanMitraBkk(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	m, v := bacaIsianMitra(r)
	logo, errL := a.ambilUnggahan(r.MultipartForm, "logo", folderMitraBkk, TipeGambar)
	if errL != nil && !errors.Is(errL, GalatTanpaBerkas) {
		v.tambah("logo", "Logo: "+errL.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan(folderMitraBkk, logo)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO bkk_mitra
	        (nama, bidang, alamat, kontak_nama, kontak_telepon, kontak_email, situs, logo, aktif)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		m.Nama, m.Bidang, m.Alamat, m.KontakNama, m.KontakTelepon, m.KontakEmail,
		m.Situs, kosongJadiNil(logo), m.Aktif).Scan(&id)
	if err != nil {
		a.hapusUnggahan(folderMitraBkk, logo)
		a.galatServer(w, "menyimpan mitra BKK", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Mitra berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahMitraBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var logoLama string
	err := a.db.QueryRow("SELECT COALESCE(logo, '') FROM bkk_mitra WHERE id = $1", id).Scan(&logoLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Mitra tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil mitra BKK", err)
		return
	}

	m, v := bacaIsianMitra(r)
	logoBaru, errL := a.ambilUnggahan(r.MultipartForm, "logo", folderMitraBkk, TipeGambar)
	if errL != nil && !errors.Is(errL, GalatTanpaBerkas) {
		v.tambah("logo", "Logo: "+errL.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan(folderMitraBkk, logoBaru)
		kirimGalatValidasi(w, v)
		return
	}

	logo := logoLama
	if logoBaru != "" {
		logo = logoBaru
	} else if bolean(r, "hapus_logo") {
		logo = ""
	}
	if _, err := a.db.Exec(`UPDATE bkk_mitra SET nama = $1, bidang = $2, alamat = $3,
	        kontak_nama = $4, kontak_telepon = $5, kontak_email = $6, situs = $7,
	        logo = $8, aktif = $9 WHERE id = $10`,
		m.Nama, m.Bidang, m.Alamat, m.KontakNama, m.KontakTelepon, m.KontakEmail,
		m.Situs, kosongJadiNil(logo), m.Aktif, id); err != nil {
		a.hapusUnggahan(folderMitraBkk, logoBaru)
		a.galatServer(w, "memperbarui mitra BKK", err)
		return
	}
	if logoLama != "" && logo != logoLama {
		a.hapusUnggahan(folderMitraBkk, logoLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Mitra berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusMitraBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var logo string
	err := a.db.QueryRow("DELETE FROM bkk_mitra WHERE id = $1 RETURNING COALESCE(logo, '')", id).Scan(&logo)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Mitra tidak ditemukan.")
		return
	}
	if pelanggaranAcuan(err) {
		kirimGalat(w, http.StatusConflict,
			"Mitra ini sudah pernah membuka lowongan, jadi tidak dapat dihapus tanpa menghapus riwayat penyalurannya. Nonaktifkan saja mitranya.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghapus mitra BKK", err)
		return
	}
	a.hapusUnggahan(folderMitraBkk, logo)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Mitra berhasil dihapus."})
}

/* ================= lowongan ================= */

func (a *Aplikasi) ambilLowonganBkk(hanyaDibuka bool, id int) ([]LowonganBkk, error) {
	n := &penomoran{}
	syarat := []string{"1 = 1"}
	arg := []any{}
	if hanyaDibuka {
		syarat = append(syarat, syaratLowonganDibuka)
	}
	if id > 0 {
		syarat = append(syarat, "l.id = "+n.berikut())
		arg = append(arg, id)
	}
	baris, err := a.db.Query(`
		SELECT l.id, l.mitra_id, m.nama, COALESCE(m.logo, ''), m.bidang, l.posisi, l.jenis,
		       l.lokasi, l.deskripsi, l.kualifikasi, l.gaji, l.kuota,
		       to_char(l.batas_lamar, 'YYYY-MM-DD'), l.status, `+syaratLowonganDibuka+`,
		       (SELECT COUNT(*) FROM bkk_lamaran s WHERE s.lowongan_id = l.id),
		       (SELECT COUNT(*) FROM bkk_lamaran s WHERE s.lowongan_id = l.id AND s.status = 'Diterima'),
		       to_char(l.created_at, 'YYYY-MM-DD')
		  FROM bkk_lowongan l JOIN bkk_mitra m ON m.id = l.mitra_id
		 WHERE `+strings.Join(syarat, " AND ")+`
		 ORDER BY `+syaratLowonganDibuka+` DESC, l.batas_lamar NULLS LAST, l.id DESC`, arg...)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []LowonganBkk{}
	for baris.Next() {
		var l LowonganBkk
		var kuota sql.NullInt64
		var batas sql.NullString
		if err := baris.Scan(&l.ID, &l.MitraID, &l.NamaMitra, &l.LogoMitra, &l.BidangMitra,
			&l.Posisi, &l.Jenis, &l.Lokasi, &l.Deskripsi, &l.Kualifikasi, &l.Gaji, &kuota,
			&batas, &l.Status, &l.Dibuka, &l.JumlahPelamar, &l.Diterima, &l.Dibuat); err != nil {
			return nil, err
		}
		if kuota.Valid {
			k := int(kuota.Int64)
			l.Kuota = &k
		}
		if batas.Valid {
			l.BatasLamar = &batas.String
		}
		hasil = append(hasil, l)
	}
	return hasil, baris.Err()
}

// tanganiLowonganBkkPublik menyertakan angka ringkas BKK. Angkanya dihitung
// dari data, bukan diisi tangan, jadi halaman BKK tidak pernah memamerkan
// angka yang tidak dapat dipertanggungjawabkan.
func (a *Aplikasi) tanganiLowonganBkkPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilLowonganBkk(true, 0)
	if err != nil {
		a.galatServer(w, "mengambil lowongan BKK", err)
		return
	}
	for i := range daftar {
		// Jumlah pelamar tidak diumumkan: angka itu milik petugas, dan
		// lowongan yang pelamarnya sedikit tidak perlu tampak sepi.
		daftar[i].JumlahPelamar, daftar[i].Diterima = 0, 0
	}
	var mitra, tersalurkan int
	if err := a.db.QueryRow(`SELECT (SELECT COUNT(*) FROM bkk_mitra WHERE aktif),
	        (SELECT COUNT(*) FROM bkk_lamaran WHERE status = 'Diterima')`).Scan(&mitra, &tersalurkan); err != nil {
		a.galatServer(w, "menghitung angka BKK", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar,
		"angka": map[string]int{
			"mitra":           mitra,
			"lowongan_dibuka": len(daftar),
			"tersalurkan":     tersalurkan,
		},
	})
}

func (a *Aplikasi) tanganiLowonganBkkDetail(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	// Lowongan yang sudah ditutup tetap dapat dibuka dari tautan lamanya,
	// supaya lulusan yang menyimpan tautannya mendapat penjelasan, bukan
	// halaman tidak ditemukan. Hanya draf yang benar-benar tersembunyi.
	daftar, err := a.ambilLowonganBkk(false, id)
	if err != nil {
		a.galatServer(w, "mengambil lowongan BKK", err)
		return
	}
	if len(daftar) == 0 || daftar[0].Status == "draf" {
		kirimGalat(w, http.StatusNotFound, "Lowongan tidak ditemukan.")
		return
	}
	l := daftar[0]
	l.JumlahPelamar, l.Diterima = 0, 0
	kirimJSON(w, http.StatusOK, l)
}

func (a *Aplikasi) tanganiLowonganBkkAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilLowonganBkk(false, 0)
	if err != nil {
		a.galatServer(w, "mengambil lowongan BKK", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"data":   daftar,
		"jenis":  JenisLowongan,
		"status": StatusLowongan,
	})
}

type permintaanLowongan struct {
	MitraID     int    `json:"mitra_id"`
	Posisi      string `json:"posisi"`
	Jenis       string `json:"jenis"`
	Lokasi      string `json:"lokasi"`
	Deskripsi   string `json:"deskripsi"`
	Kualifikasi string `json:"kualifikasi"`
	Gaji        string `json:"gaji"`
	Kuota       string `json:"kuota"`
	BatasLamar  string `json:"batas_lamar"`
	Status      string `json:"status"`
}

func (p *permintaanLowongan) periksa(a *Aplikasi) (*int, *Validasi) {
	v := validasiBaru()
	p.Posisi = v.wajib("posisi", "Posisi", p.Posisi)
	v.panjangMaks("posisi", "Posisi", p.Posisi, 160)
	p.Jenis = strings.TrimSpace(p.Jenis)
	if p.Jenis == "" {
		p.Jenis = "Penuh Waktu"
	}
	v.pilihan("jenis", "Jenis pekerjaan", p.Jenis, JenisLowongan)
	p.Lokasi = strings.TrimSpace(p.Lokasi)
	v.panjangMaks("lokasi", "Lokasi kerja", p.Lokasi, 160)
	p.Deskripsi = strings.TrimSpace(p.Deskripsi)
	v.panjangMaks("deskripsi", "Deskripsi pekerjaan", p.Deskripsi, 6000)
	p.Kualifikasi = strings.TrimSpace(p.Kualifikasi)
	v.panjangMaks("kualifikasi", "Kualifikasi", p.Kualifikasi, 6000)
	p.Gaji = strings.TrimSpace(p.Gaji)
	v.panjangMaks("gaji", "Kisaran gaji", p.Gaji, 100)
	kuota := v.bulatRentang("kuota", "Jumlah yang dibutuhkan", strings.TrimSpace(p.Kuota), 1, 10000)
	p.BatasLamar = strings.TrimSpace(p.BatasLamar)
	v.tanggal("batas_lamar", "Batas lamaran", p.BatasLamar, false)
	p.Status = strings.TrimSpace(p.Status)
	if p.Status == "" {
		p.Status = "draf"
	}
	v.pilihan("status", "Status lowongan", p.Status, StatusLowongan)

	if p.MitraID <= 0 {
		v.tambah("mitra_id", "Pilih perusahaan mitra yang membuka lowongan ini.")
	} else {
		var ada bool
		if err := a.db.QueryRow("SELECT EXISTS (SELECT 1 FROM bkk_mitra WHERE id = $1)", p.MitraID).Scan(&ada); err != nil || !ada {
			v.tambah("mitra_id", "Perusahaan mitra tidak ditemukan.")
		}
	}
	return kuota, v
}

func (a *Aplikasi) tanganiSimpanLowonganBkk(w http.ResponseWriter, r *http.Request) {
	var p permintaanLowongan
	if !bacaJSON(w, r, &p) {
		return
	}
	kuota, v := p.periksa(a)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	var id int
	if err := a.db.QueryRow(`INSERT INTO bkk_lowongan
	        (mitra_id, posisi, jenis, lokasi, deskripsi, kualifikasi, gaji, kuota, batas_lamar, status)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
		p.MitraID, p.Posisi, p.Jenis, p.Lokasi, p.Deskripsi, p.Kualifikasi, p.Gaji,
		kuota, kosongJadiNil(p.BatasLamar), p.Status).Scan(&id); err != nil {
		a.galatServer(w, "menyimpan lowongan BKK", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Lowongan berhasil disimpan.", "id": id})
}

func (a *Aplikasi) tanganiUbahLowonganBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanLowongan
	if !bacaJSON(w, r, &p) {
		return
	}
	kuota, v := p.periksa(a)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	hasil, err := a.db.Exec(`UPDATE bkk_lowongan SET mitra_id = $1, posisi = $2, jenis = $3,
	        lokasi = $4, deskripsi = $5, kualifikasi = $6, gaji = $7, kuota = $8,
	        batas_lamar = $9, status = $10, updated_at = now() WHERE id = $11`,
		p.MitraID, p.Posisi, p.Jenis, p.Lokasi, p.Deskripsi, p.Kualifikasi, p.Gaji,
		kuota, kosongJadiNil(p.BatasLamar), p.Status, id)
	if err != nil {
		a.galatServer(w, "memperbarui lowongan BKK", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Lowongan tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Lowongan berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusLowonganBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	hasil, err := a.db.Exec("DELETE FROM bkk_lowongan WHERE id = $1", id)
	if pelanggaranAcuan(err) {
		kirimGalat(w, http.StatusConflict,
			"Lowongan ini sudah punya pelamar, jadi tidak dapat dihapus tanpa menghapus riwayat penyalurannya. Ubah statusnya menjadi Ditutup.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghapus lowongan BKK", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Lowongan tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Lowongan berhasil dihapus."})
}

/* ================= lamaran ================= */

// isianLamaran memuat data diri pelamar, sama untuk kiriman daring dan
// pencatatan manual oleh petugas.
type isianLamaran struct {
	LowonganID   int
	Nama         string
	Nisn         string
	TanggalLahir string
	JenisKelamin string
	TahunLulus   int
	Telepon      string
	Email        string
	Alamat       string
	Ringkasan    string
}

func periksaIsianLamaran(ambil func(string) string) (isianLamaran, *Validasi) {
	v := validasiBaru()
	var d isianLamaran

	d.LowonganID, _ = strconv.Atoi(ambil("lowongan_id"))
	if d.LowonganID <= 0 {
		v.tambah("lowongan_id", "Pilih lowongan yang dilamar.")
	}
	d.Nama = v.wajib("nama", "Nama lengkap", ambil("nama"))
	v.panjangMaks("nama", "Nama lengkap", d.Nama, 120)
	v.teksWajar("nama", "Nama lengkap", d.Nama, false)

	d.TanggalLahir = ambil("tanggal_lahir")
	v.tanggal("tanggal_lahir", "Tanggal lahir", d.TanggalLahir, true)
	d.Nisn = strings.ReplaceAll(ambil("nisn"), " ", "")
	v.periksaNisn(d.Nisn, "", d.TanggalLahir)

	d.JenisKelamin = strings.ToUpper(ambil("jenis_kelamin"))
	if d.JenisKelamin == "" {
		v.tambah("jenis_kelamin", "Jenis kelamin wajib dipilih.")
	}
	v.pilihan("jenis_kelamin", "Jenis kelamin", d.JenisKelamin, []string{"L", "P"})

	tahunIni := time.Now().Year()
	if t := v.bulatRentang("tahun_lulus", "Tahun lulus", ambil("tahun_lulus"), 1990, tahunIni+1); t != nil {
		d.TahunLulus = *t
	} else if ambil("tahun_lulus") == "" {
		v.tambah("tahun_lulus", "Tahun lulus wajib diisi.")
	}

	d.Telepon = ambil("telepon")
	v.telepon("telepon", "Nomor HP/WhatsApp", d.Telepon, true)
	d.Email = ambil("email")
	v.panjangMaks("email", "Email", d.Email, 120)
	v.email("email", d.Email)
	d.Alamat = ambil("alamat")
	v.panjangMaks("alamat", "Alamat", d.Alamat, 500)
	d.Ringkasan = ambil("ringkasan")
	v.panjangMaks("ringkasan", "Keahlian dan pengalaman", d.Ringkasan, 2000)
	return d, v
}

// simpanLamaran menulis satu lamaran dan mengembalikan kodenya. Kode
// diturunkan dari id, jadi pasti unik tanpa perlu dikunci.
func (a *Aplikasi) simpanLamaran(d isianLamaran, cv, sumber string) (string, error) {
	var id int
	if err := a.db.QueryRow("SELECT nextval(pg_get_serial_sequence('bkk_lamaran', 'id'))").Scan(&id); err != nil {
		return "", err
	}
	kode := fmt.Sprintf("BKK-%s-%04d", time.Now().Format("06"), id)
	_, err := a.db.Exec(`INSERT INTO bkk_lamaran
	        (id, kode, lowongan_id, nama, nisn, tanggal_lahir, jenis_kelamin, tahun_lulus,
	         telepon, email, alamat, ringkasan, cv, sumber)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		id, kode, d.LowonganID, d.Nama, d.Nisn, d.TanggalLahir, d.JenisKelamin, d.TahunLulus,
		d.Telepon, d.Email, d.Alamat, d.Ringkasan, kosongJadiNil(cv), sumber)
	return kode, err
}

const pesanSudahMelamar = "NISN ini sudah tercatat melamar lowongan yang sama. Pantau lamarannya di halaman Cek Lamaran."

func (a *Aplikasi) tanganiLamarBkk(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	d, v := periksaIsianLamaran(func(s string) string { return strings.TrimSpace(r.FormValue(s)) })
	if !bolean(r, "setuju") {
		v.tambah("setuju", "Centang pernyataan bahwa data yang diisi benar dan boleh diteruskan ke perusahaan.")
	}
	if d.LowonganID > 0 {
		var dibuka bool
		err := a.db.QueryRow(`SELECT `+syaratLowonganDibuka+` FROM bkk_lowongan l
		        JOIN bkk_mitra m ON m.id = l.mitra_id WHERE l.id = $1`, d.LowonganID).Scan(&dibuka)
		if err == sql.ErrNoRows || (err == nil && !dibuka) {
			kirimGalat(w, http.StatusConflict, "Lowongan ini sudah tidak menerima lamaran.")
			return
		}
		if err != nil {
			a.galatServer(w, "memeriksa lowongan BKK", err)
			return
		}
	}
	cv, errC := a.ambilUnggahan(r.MultipartForm, "cv", folderCvBkk, TipeDokumen)
	if errC != nil && !errors.Is(errC, GalatTanpaBerkas) {
		v.tambah("cv", "CV: "+errC.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan(folderCvBkk, cv)
		kirimGalatValidasi(w, v)
		return
	}

	kode, err := a.simpanLamaran(d, cv, "daring")
	if err != nil {
		a.hapusUnggahan(folderCvBkk, cv)
		if pelanggaranUnik(err) {
			kirimGalat(w, http.StatusConflict, pesanSudahMelamar)
			return
		}
		a.galatServer(w, "menyimpan lamaran BKK", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]string{
		"pesan": "Lamaran terkirim. Petugas BKK akan memeriksanya sebelum diteruskan ke perusahaan.",
		"kode":  kode,
	})
}

// tanganiCekLamaranBkk menampilkan SELURUH lamaran milik satu lulusan.
// Penebakan tanggal lahir dikunci per NISN, sama seperti cek status PPDB
// dikunci per nomor registrasi.
func (a *Aplikasi) tanganiCekLamaranBkk(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Nisn         string `json:"nisn"`
		TanggalLahir string `json:"tanggal_lahir"`
	}
	if !bacaJSON(w, r, &p) {
		return
	}
	v := validasiBaru()
	p.Nisn = strings.ReplaceAll(v.wajib("nisn", "NISN", p.Nisn), " ", "")
	p.TanggalLahir = strings.TrimSpace(p.TanggalLahir)
	v.tanggal("tanggal_lahir", "Tanggal lahir", p.TanggalLahir, true)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	kunci := "BKK:" + p.Nisn
	if !a.izinkanCobaIdentitas(w, kunci) {
		return
	}

	baris, err := a.db.Query(`
		SELECT s.kode, s.nama, l.posisi, m.nama, s.status, s.catatan,
		       to_char(s.created_at, 'YYYY-MM-DD'), to_char(s.updated_at, 'YYYY-MM-DD')
		  FROM bkk_lamaran s
		  JOIN bkk_lowongan l ON l.id = s.lowongan_id
		  JOIN bkk_mitra m ON m.id = l.mitra_id
		 WHERE s.nisn = $1 AND s.tanggal_lahir = $2
		 ORDER BY s.created_at DESC`, p.Nisn, p.TanggalLahir)
	if err != nil {
		a.galatServer(w, "mencari lamaran BKK", err)
		return
	}
	defer baris.Close()
	hasil := []map[string]string{}
	for baris.Next() {
		var kode, nama, posisi, mitra, status, catatan, dibuat, diubah string
		if err := baris.Scan(&kode, &nama, &posisi, &mitra, &status, &catatan, &dibuat, &diubah); err != nil {
			a.galatServer(w, "membaca lamaran BKK", err)
			return
		}
		hasil = append(hasil, map[string]string{
			"kode": kode, "nama": nama, "posisi": posisi, "nama_mitra": mitra,
			"status": status, "catatan": catatan, "dibuat": dibuat, "diubah": diubah,
		})
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca lamaran BKK", err)
		return
	}
	if len(hasil) == 0 {
		a.catatGagalIdentitas(kunci)
		kirimGalat(w, http.StatusNotFound,
			"Lamaran tidak ditemukan. Periksa kembali NISN dan tanggal lahir yang Anda pakai saat melamar.")
		return
	}
	a.bersihkanGagalIdentitas(kunci)
	kirimJSON(w, http.StatusOK, map[string]any{"data": hasil})
}

func (a *Aplikasi) tanganiLamaranBkkAdmin(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	n := &penomoran{}
	syarat := []string{"1 = 1"}
	arg := []any{}
	if id, _ := strconv.Atoi(q.Get("lowongan")); id > 0 {
		syarat = append(syarat, "s.lowongan_id = "+n.berikut())
		arg = append(arg, id)
	}
	if st := strings.TrimSpace(q.Get("status")); st != "" {
		syarat = append(syarat, "s.status = "+n.berikut())
		arg = append(arg, st)
	}
	if cari := strings.TrimSpace(q.Get("cari")); cari != "" {
		k := n.berikut()
		syarat = append(syarat, "(s.nama ILIKE "+k+" OR s.nisn LIKE "+k+" OR s.kode ILIKE "+k+")")
		arg = append(arg, "%"+cari+"%")
	}

	baris, err := a.db.Query(`
		SELECT s.id, s.kode, s.lowongan_id, l.posisi, m.nama, s.nama, s.nisn,
		       to_char(s.tanggal_lahir, 'YYYY-MM-DD'), s.jenis_kelamin, s.tahun_lulus,
		       s.telepon, s.email, s.alamat, s.ringkasan, COALESCE(s.cv, ''), s.status,
		       s.catatan, s.sumber, to_char(s.created_at, 'YYYY-MM-DD HH24:MI'),
		       to_char(s.updated_at, 'YYYY-MM-DD HH24:MI')
		  FROM bkk_lamaran s
		  JOIN bkk_lowongan l ON l.id = s.lowongan_id
		  JOIN bkk_mitra m ON m.id = l.mitra_id
		 WHERE `+strings.Join(syarat, " AND ")+`
		 ORDER BY s.created_at DESC
		 LIMIT 1000`, arg...)
	if err != nil {
		a.galatServer(w, "mengambil lamaran BKK", err)
		return
	}
	defer baris.Close()
	daftar := []LamaranBkk{}
	for baris.Next() {
		var s LamaranBkk
		if err := baris.Scan(&s.ID, &s.Kode, &s.LowonganID, &s.Posisi, &s.NamaMitra, &s.Nama,
			&s.Nisn, &s.TanggalLahir, &s.JenisKelamin, &s.TahunLulus, &s.Telepon, &s.Email,
			&s.Alamat, &s.Ringkasan, &s.Cv, &s.Status, &s.Catatan, &s.Sumber, &s.Dibuat,
			&s.Diubah); err != nil {
			a.galatServer(w, "membaca lamaran BKK", err)
			return
		}
		daftar = append(daftar, s)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca lamaran BKK", err)
		return
	}

	// Ringkasan selalu atas SELURUH lamaran, tidak mengikuti penyaring,
	// supaya angka penyaluran di kepala halaman tidak berubah-ubah.
	ringkasan := map[string]int{}
	for _, st := range StatusLamaran {
		ringkasan[st] = 0
	}
	rb, err := a.db.Query("SELECT status, COUNT(*) FROM bkk_lamaran GROUP BY status")
	if err != nil {
		a.galatServer(w, "meringkas lamaran BKK", err)
		return
	}
	defer rb.Close()
	for rb.Next() {
		var st string
		var jml int
		if err := rb.Scan(&st, &jml); err != nil {
			a.galatServer(w, "meringkas lamaran BKK", err)
			return
		}
		ringkasan[st] = jml
	}
	if err := rb.Err(); err != nil {
		a.galatServer(w, "meringkas lamaran BKK", err)
		return
	}

	// Penyaluran per tahun lulus: bahan laporan BKK ke dinas.
	pt, err := a.db.Query(`SELECT tahun_lulus, COUNT(DISTINCT nisn),
	        COUNT(DISTINCT nisn) FILTER (WHERE status = 'Diterima')
	        FROM bkk_lamaran GROUP BY tahun_lulus ORDER BY tahun_lulus DESC`)
	if err != nil {
		a.galatServer(w, "meringkas penyaluran BKK", err)
		return
	}
	defer pt.Close()
	perTahun := []map[string]int{}
	for pt.Next() {
		var tahun, pelamar, tersalur int
		if err := pt.Scan(&tahun, &pelamar, &tersalur); err != nil {
			a.galatServer(w, "meringkas penyaluran BKK", err)
			return
		}
		perTahun = append(perTahun, map[string]int{"tahun_lulus": tahun, "pelamar": pelamar, "tersalurkan": tersalur})
	}
	if err := pt.Err(); err != nil {
		a.galatServer(w, "meringkas penyaluran BKK", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":      daftar,
		"status":    StatusLamaran,
		"ringkasan": ringkasan,
		"per_tahun": perTahun,
	})
}

// tanganiTambahLamaranBkk mencatat lulusan yang melamar langsung ke ruang
// BKK. Lowongannya boleh sudah ditutup: yang dicatat kejadian yang sudah
// terjadi, bukan kiriman baru.
func (a *Aplikasi) tanganiTambahLamaranBkk(w http.ResponseWriter, r *http.Request) {
	var p map[string]string
	if !bacaJSON(w, r, &p) {
		return
	}
	d, v := periksaIsianLamaran(func(s string) string { return strings.TrimSpace(p[s]) })
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	kode, err := a.simpanLamaran(d, "", "manual")
	if pelanggaranUnik(err) {
		kirimGalat(w, http.StatusConflict, "NISN ini sudah tercatat melamar lowongan yang sama.")
		return
	}
	if pelanggaranAcuan(err) {
		kirimGalatValidasi(w, &Validasi{
			Kolom:  map[string]string{"lowongan_id": "Lowongan tidak ditemukan."},
			Daftar: []string{"Lowongan tidak ditemukan."},
		})
		return
	}
	if err != nil {
		a.galatServer(w, "mencatat lamaran BKK", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]string{"pesan": "Lamaran " + kode + " tercatat.", "kode": kode})
}

func (a *Aplikasi) tanganiUbahLamaranBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p struct {
		Status  string `json:"status"`
		Catatan string `json:"catatan"`
	}
	if !bacaJSON(w, r, &p) {
		return
	}
	v := validasiBaru()
	p.Status = v.wajib("status", "Status", p.Status)
	v.pilihan("status", "Status", p.Status, StatusLamaran)
	p.Catatan = strings.TrimSpace(p.Catatan)
	v.panjangMaks("catatan", "Catatan untuk pelamar", p.Catatan, 1000)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	hasil, err := a.db.Exec(`UPDATE bkk_lamaran SET status = $1, catatan = $2, updated_at = now()
	        WHERE id = $3`, p.Status, p.Catatan, id)
	if err != nil {
		a.galatServer(w, "memperbarui lamaran BKK", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Lamaran tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Lamaran diperbarui menjadi " + p.Status + "."})
}

func (a *Aplikasi) tanganiHapusLamaranBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var cv string
	err := a.db.QueryRow("DELETE FROM bkk_lamaran WHERE id = $1 RETURNING COALESCE(cv, '')", id).Scan(&cv)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Lamaran tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghapus lamaran BKK", err)
		return
	}
	a.hapusUnggahan(folderCvBkk, cv)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Lamaran berhasil dihapus."})
}

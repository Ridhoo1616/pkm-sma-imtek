package main

import (
	"database/sql"
	"net/http"
	"strings"
)

/* ==================================================================
   Rincian biaya

   Sebelumnya biaya hanya satu baris teks pada pengaturan, jadi tidak bisa
   dirinci maupun dijumlahkan. Sekarang setiap pos berdiri sendiri, dan
   totalnya dihitung di sini, bukan diketik panitia. Dengan begitu angka yang
   dilihat orang tua tidak pernah berbeda dari jumlah pos-posnya.

   Pos yang jumlahnya masih nol tetap dikirim, tetapi ditandai belum
   ditetapkan. Menyembunyikannya akan membuat halaman terlihat lengkap
   padahal belum, dan itu bertentangan dengan tujuan halaman ini.
   ================================================================== */

type Biaya struct {
	ID         int    `json:"id"`
	Nama       string `json:"nama"`
	Jumlah     int64  `json:"jumlah"`
	Satuan     string `json:"satuan"`
	Tahap      string `json:"tahap"`
	Keterangan string `json:"keterangan"`
	Wajib      bool   `json:"wajib"`
	Urutan     int    `json:"urutan"`
	Aktif      bool   `json:"aktif"`
	Ditetapkan bool   `json:"ditetapkan"`
}

// TahapBiaya adalah urutan tampil tahap pembayaran, bukan urutan abjad,
// karena orang tua membacanya sebagai runtutan waktu.
var TahapBiaya = []string{"Pendaftaran", "Daftar Ulang", "Rutin Bulanan", "Lainnya"}

func tahapBiayaSah(t string) bool {
	for _, x := range TahapBiaya {
		if x == t {
			return true
		}
	}
	return false
}

func (a *Aplikasi) ambilBiaya(hanyaAktif bool) ([]Biaya, error) {
	kueri := `SELECT id, nama, jumlah, satuan, tahap, keterangan, wajib, urutan, aktif
	          FROM biaya`
	if hanyaAktif {
		kueri += " WHERE aktif = true"
	}
	kueri += " ORDER BY urutan, id"

	baris, err := a.db.Query(kueri)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	daftar := []Biaya{}
	for baris.Next() {
		var b Biaya
		if err := baris.Scan(&b.ID, &b.Nama, &b.Jumlah, &b.Satuan, &b.Tahap,
			&b.Keterangan, &b.Wajib, &b.Urutan, &b.Aktif); err != nil {
			return nil, err
		}
		b.Ditetapkan = b.Jumlah > 0
		daftar = append(daftar, b)
	}
	return daftar, baris.Err()
}

// tanganiBiayaPublik melayani halaman Info PPDB.
func (a *Aplikasi) tanganiBiayaPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilBiaya(true)
	if err != nil {
		a.galatServer(w, "mengambil rincian biaya", err)
		return
	}

	// Total dipisah per tahap. Menjumlahkan biaya sekali bayar dengan biaya
	// bulanan menjadi satu angka akan menyesatkan.
	totalTahap := map[string]int64{}
	var lengkap = true
	for _, b := range daftar {
		totalTahap[b.Tahap] += b.Jumlah
		if !b.Ditetapkan {
			lengkap = false
		}
	}

	urutTahap := []map[string]any{}
	for _, t := range TahapBiaya {
		if _, ada := totalTahap[t]; !ada {
			continue
		}
		urutTahap = append(urutTahap, map[string]any{"tahap": t, "total": totalTahap[t]})
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":        daftar,
		"total_tahap": urutTahap,
		// Dipakai frontend untuk menampilkan keterangan bahwa besarannya
		// masih menunggu penetapan sekolah, bukan menampilkan Rp0.
		"lengkap": lengkap,
		"catatan": a.atur("biaya_catatan"),
		"tahapan": TahapBiaya,
	})
}

func (a *Aplikasi) tanganiDaftarBiayaAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilBiaya(false)
	if err != nil {
		a.galatServer(w, "mengambil rincian biaya", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "tahapan": TahapBiaya})
}

type permintaanBiaya struct {
	Nama       string `json:"nama"`
	Jumlah     int64  `json:"jumlah"`
	Satuan     string `json:"satuan"`
	Tahap      string `json:"tahap"`
	Keterangan string `json:"keterangan"`
	Wajib      bool   `json:"wajib"`
	Urutan     int    `json:"urutan"`
	Aktif      bool   `json:"aktif"`
}

func (p *permintaanBiaya) periksa() *Validasi {
	v := validasiBaru()
	p.Nama = strings.TrimSpace(p.Nama)
	p.Satuan = strings.TrimSpace(p.Satuan)
	p.Tahap = strings.TrimSpace(p.Tahap)
	p.Keterangan = strings.TrimSpace(p.Keterangan)

	v.wajib("nama", "Nama pos biaya", p.Nama)
	v.panjangMaks("nama", "Nama pos biaya", p.Nama, 120)
	v.panjangMaks("satuan", "Satuan", p.Satuan, 40)
	v.panjangMaks("keterangan", "Keterangan", p.Keterangan, 2000)

	if p.Jumlah < 0 {
		v.tambah("jumlah", "Jumlah biaya tidak boleh kurang dari nol.")
	}
	// Seratus miliar rupiah untuk satu pos biaya sekolah jelas salah ketik.
	if p.Jumlah > 100_000_000_000 {
		v.tambah("jumlah", "Jumlah biaya terlalu besar, periksa kembali angkanya.")
	}
	if !tahapBiayaSah(p.Tahap) {
		v.tambah("tahap", "Tahap pembayaran tidak dikenal.")
	}
	if p.Satuan == "" {
		p.Satuan = "sekali bayar"
	}
	return v
}

func (a *Aplikasi) tanganiSimpanBiaya(w http.ResponseWriter, r *http.Request) {
	var p permintaanBiaya
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(
		`INSERT INTO biaya (nama, jumlah, satuan, tahap, keterangan, wajib, urutan, aktif)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		p.Nama, p.Jumlah, p.Satuan, p.Tahap, p.Keterangan, p.Wajib, p.Urutan, p.Aktif).Scan(&id)
	if err != nil {
		a.galatServer(w, "menyimpan pos biaya", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan": "Pos biaya berhasil ditambahkan.", "id": id,
	})
}

func (a *Aplikasi) tanganiUbahBiaya(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanBiaya
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	hasil, err := a.db.Exec(
		`UPDATE biaya SET nama = $1, jumlah = $2, satuan = $3, tahap = $4,
		                  keterangan = $5, wajib = $6, urutan = $7, aktif = $8
		 WHERE id = $9`,
		p.Nama, p.Jumlah, p.Satuan, p.Tahap, p.Keterangan, p.Wajib, p.Urutan, p.Aktif, id)
	if err != nil {
		a.galatServer(w, "mengubah pos biaya", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Pos biaya tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pos biaya berhasil disimpan."})
}

func (a *Aplikasi) tanganiHapusBiaya(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var nama string
	err := a.db.QueryRow("SELECT nama FROM biaya WHERE id = $1", id).Scan(&nama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Pos biaya tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil pos biaya", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM biaya WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus pos biaya", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pos biaya berhasil dihapus."})
}

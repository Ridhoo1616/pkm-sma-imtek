package main

import (
	"database/sql"
	"net/http"
	"strings"
)

/* ==================================================================
   Tanya jawab

   Dipisah dari pengaturan menjadi tabelnya sendiri, karena jumlahnya
   bertambah terus dan panitia perlu menyusun urutannya. Menyimpannya sebagai
   satu blok teks pada pengaturan membuat setiap penambahan berarti menyunting
   naskah panjang, dan urutannya tidak dapat diatur tanpa menggeser baris.

   Pertanyaan yang ditandai sorot muncul lebih dulu di halaman publik. Itu
   dipakai panitia untuk yang paling sering ditanyakan, supaya orang tua tidak
   perlu membaca seluruh daftar untuk menemukan yang ia cari.
   ================================================================== */

type Faq struct {
	ID         int    `json:"id"`
	Pertanyaan string `json:"pertanyaan"`
	Jawaban    string `json:"jawaban"`
	Kategori   string `json:"kategori"`
	Sorot      bool   `json:"sorot"`
	Urutan     int    `json:"urutan"`
	Aktif      bool   `json:"aktif"`
}

// KategoriFaq adalah urutan tampil kategori, bukan urutan abjad, karena
// pembacanya mengikuti runtutan proses pendaftaran.
var KategoriFaq = []string{
	"Umum", "Pendaftaran", "Berkas", "Biaya", "Tes Seleksi", "Pengumuman",
}

func kategoriFaqSah(k string) bool {
	for _, x := range KategoriFaq {
		if x == k {
			return true
		}
	}
	return false
}

func (a *Aplikasi) ambilFaq(hanyaAktif bool) ([]Faq, error) {
	kueri := `SELECT id, pertanyaan, jawaban, kategori, sorot, urutan, aktif FROM faq`
	if hanyaAktif {
		kueri += " WHERE aktif = true"
	}
	// Yang disorot lebih dulu, lalu urutan yang ditetapkan panitia.
	kueri += " ORDER BY sorot DESC, urutan, id"

	baris, err := a.db.Query(kueri)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	daftar := []Faq{}
	for baris.Next() {
		var f Faq
		if err := baris.Scan(&f.ID, &f.Pertanyaan, &f.Jawaban, &f.Kategori,
			&f.Sorot, &f.Urutan, &f.Aktif); err != nil {
			return nil, err
		}
		daftar = append(daftar, f)
	}
	return daftar, baris.Err()
}

func (a *Aplikasi) tanganiFaqPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilFaq(true)
	if err != nil {
		a.galatServer(w, "mengambil tanya jawab", err)
		return
	}

	// Kategori yang benar-benar terpakai dikirim terpisah, supaya frontend
	// tidak menampilkan penyaring kategori yang isinya kosong.
	adaKategori := map[string]bool{}
	for _, f := range daftar {
		adaKategori[f.Kategori] = true
	}
	terpakai := []string{}
	for _, k := range KategoriFaq {
		if adaKategori[k] {
			terpakai = append(terpakai, k)
		}
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":      daftar,
		"kategori":  terpakai,
		"pengantar": a.atur("faq_pengantar"),
	})
}

func (a *Aplikasi) tanganiDaftarFaqAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilFaq(false)
	if err != nil {
		a.galatServer(w, "mengambil tanya jawab", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar, "kategori": KategoriFaq,
	})
}

type permintaanFaq struct {
	Pertanyaan string `json:"pertanyaan"`
	Jawaban    string `json:"jawaban"`
	Kategori   string `json:"kategori"`
	Sorot      bool   `json:"sorot"`
	Urutan     int    `json:"urutan"`
	Aktif      bool   `json:"aktif"`
}

func (p *permintaanFaq) periksa() *Validasi {
	v := validasiBaru()
	p.Pertanyaan = strings.TrimSpace(p.Pertanyaan)
	p.Jawaban = strings.TrimSpace(p.Jawaban)
	p.Kategori = strings.TrimSpace(p.Kategori)

	v.wajib("pertanyaan", "Pertanyaan", p.Pertanyaan)
	v.panjangMaks("pertanyaan", "Pertanyaan", p.Pertanyaan, 300)
	v.wajib("jawaban", "Jawaban", p.Jawaban)
	v.panjangMaks("jawaban", "Jawaban", p.Jawaban, 4000)
	if !kategoriFaqSah(p.Kategori) {
		v.tambah("kategori", "Kategori tidak dikenal.")
	}
	return v
}

func (a *Aplikasi) tanganiSimpanFaq(w http.ResponseWriter, r *http.Request) {
	var p permintaanFaq
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	var id int
	err := a.db.QueryRow(
		`INSERT INTO faq (pertanyaan, jawaban, kategori, sorot, urutan, aktif)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		p.Pertanyaan, p.Jawaban, p.Kategori, p.Sorot, p.Urutan, p.Aktif).Scan(&id)
	if err != nil {
		a.galatServer(w, "menyimpan tanya jawab", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan": "Pertanyaan berhasil ditambahkan.", "id": id,
	})
}

func (a *Aplikasi) tanganiUbahFaq(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanFaq
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	hasil, err := a.db.Exec(
		`UPDATE faq SET pertanyaan=$1, jawaban=$2, kategori=$3, sorot=$4,
		                urutan=$5, aktif=$6 WHERE id=$7`,
		p.Pertanyaan, p.Jawaban, p.Kategori, p.Sorot, p.Urutan, p.Aktif, id)
	if err != nil {
		a.galatServer(w, "mengubah tanya jawab", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Pertanyaan tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pertanyaan berhasil disimpan."})
}

func (a *Aplikasi) tanganiHapusFaq(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var ada int
	err := a.db.QueryRow("SELECT id FROM faq WHERE id = $1", id).Scan(&ada)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Pertanyaan tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil tanya jawab", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM faq WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus tanya jawab", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pertanyaan berhasil dihapus."})
}

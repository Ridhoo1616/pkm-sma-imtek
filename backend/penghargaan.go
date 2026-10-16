package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

/*
Penghargaan sekolah (revisi sekolah, Oktober 2026): prestasi sekolah, OSIS,
dan kegiatan di sekolah, ditampilkan pada menu Profil Sekolah.

Tidak ada isi bawaan. Halaman publik menampilkan keadaan "belum ada" selama
tabelnya kosong, bukan penghargaan contoh: penghargaan adalah klaim yang
hanya boleh datang dari sekolah.
*/

const folderPenghargaan = "penghargaan"

var KategoriPenghargaan = []string{"Prestasi Sekolah", "OSIS", "Kegiatan Sekolah"}

type Penghargaan struct {
	ID         int    `json:"id"`
	Judul      string `json:"judul"`
	Kategori   string `json:"kategori"`
	Tingkat    string `json:"tingkat"`
	Tahun      string `json:"tahun"`
	Keterangan string `json:"keterangan"`
	Foto       string `json:"foto"`
	Urutan     int    `json:"urutan"`
	Aktif      bool   `json:"aktif"`
}

func (a *Aplikasi) ambilPenghargaan(hanyaAktif bool) ([]Penghargaan, error) {
	syarat := ""
	if hanyaAktif {
		syarat = "WHERE aktif"
	}
	// Tahun terbaru lebih dulu; urutan manual hanya memisahkan yang setahun.
	baris, err := a.db.Query(`
		SELECT id, judul, kategori, tingkat, tahun, keterangan, COALESCE(foto, ''), urutan, aktif
		  FROM penghargaan ` + syarat + `
		 ORDER BY tahun DESC, urutan, id`)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Penghargaan{}
	for baris.Next() {
		var p Penghargaan
		if err := baris.Scan(&p.ID, &p.Judul, &p.Kategori, &p.Tingkat, &p.Tahun,
			&p.Keterangan, &p.Foto, &p.Urutan, &p.Aktif); err != nil {
			return nil, err
		}
		hasil = append(hasil, p)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiPenghargaanPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilPenghargaan(true)
	if err != nil {
		a.galatServer(w, "mengambil penghargaan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": KategoriPenghargaan})
}

func (a *Aplikasi) tanganiPenghargaanAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilPenghargaan(false)
	if err != nil {
		a.galatServer(w, "mengambil penghargaan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": KategoriPenghargaan})
}

func bacaIsianPenghargaan(r *http.Request) (p Penghargaan, v *Validasi) {
	ambil := func(s string) string { return strings.TrimSpace(r.FormValue(s)) }
	v = validasiBaru()

	p.Judul = v.wajib("judul", "Nama penghargaan", ambil("judul"))
	v.panjangMaks("judul", "Nama penghargaan", p.Judul, 200)
	p.Kategori = v.wajib("kategori", "Kategori", ambil("kategori"))
	v.pilihan("kategori", "Kategori", p.Kategori, KategoriPenghargaan)
	p.Tingkat = ambil("tingkat")
	v.panjangMaks("tingkat", "Tingkat", p.Tingkat, 60)
	p.Tahun = ambil("tahun")
	v.panjangMaks("tahun", "Tahun", p.Tahun, 9)
	p.Keterangan = ambil("keterangan")
	v.panjangMaks("keterangan", "Keterangan", p.Keterangan, 2000)
	v.bulatRentang("urutan", "Urutan tampil", ambil("urutan"), 0, 9999)
	if u, err := strconv.Atoi(ambil("urutan")); err == nil {
		p.Urutan = u
	}
	p.Aktif = bolean(r, "aktif")
	return
}

func (a *Aplikasi) tanganiSimpanPenghargaan(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	p, v := bacaIsianPenghargaan(r)
	foto, errF := a.ambilUnggahan(r.MultipartForm, "foto", folderPenghargaan, TipeGambar)
	if errF != nil && !errors.Is(errF, GalatTanpaBerkas) {
		v.tambah("foto", "Foto: "+errF.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan(folderPenghargaan, foto)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO penghargaan
	        (judul, kategori, tingkat, tahun, keterangan, foto, urutan, aktif)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		p.Judul, p.Kategori, p.Tingkat, p.Tahun, p.Keterangan,
		kosongJadiNil(foto), p.Urutan, p.Aktif).Scan(&id)
	if err != nil {
		a.hapusUnggahan(folderPenghargaan, foto)
		a.galatServer(w, "menyimpan penghargaan", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Penghargaan berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahPenghargaan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var fotoLama string
	err := a.db.QueryRow("SELECT COALESCE(foto, '') FROM penghargaan WHERE id = $1", id).Scan(&fotoLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Penghargaan tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil penghargaan", err)
		return
	}

	p, v := bacaIsianPenghargaan(r)
	fotoBaru, errF := a.ambilUnggahan(r.MultipartForm, "foto", folderPenghargaan, TipeGambar)
	if errF != nil && !errors.Is(errF, GalatTanpaBerkas) {
		v.tambah("foto", "Foto: "+errF.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan(folderPenghargaan, fotoBaru)
		kirimGalatValidasi(w, v)
		return
	}

	foto := fotoLama
	if fotoBaru != "" {
		foto = fotoBaru
	} else if bolean(r, "hapus_foto") {
		foto = ""
	}
	if _, err := a.db.Exec(`UPDATE penghargaan SET judul = $1, kategori = $2, tingkat = $3,
	        tahun = $4, keterangan = $5, foto = $6, urutan = $7, aktif = $8 WHERE id = $9`,
		p.Judul, p.Kategori, p.Tingkat, p.Tahun, p.Keterangan,
		kosongJadiNil(foto), p.Urutan, p.Aktif, id); err != nil {
		a.hapusUnggahan(folderPenghargaan, fotoBaru)
		a.galatServer(w, "memperbarui penghargaan", err)
		return
	}
	if fotoLama != "" && foto != fotoLama {
		a.hapusUnggahan(folderPenghargaan, fotoLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Penghargaan berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusPenghargaan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var foto string
	err := a.db.QueryRow("DELETE FROM penghargaan WHERE id = $1 RETURNING COALESCE(foto, '')", id).Scan(&foto)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Penghargaan tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghapus penghargaan", err)
		return
	}
	a.hapusUnggahan(folderPenghargaan, foto)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Penghargaan berhasil dihapus."})
}

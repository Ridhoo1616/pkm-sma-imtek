package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

/*
Profil alumni yang sudah bekerja lewat BKK (permintaan sekolah, Oktober 2026).

Tampil di halaman /bkk sebagai bukti hasil penyaluran. Isinya data pribadi
alumni — nama, foto, dan tempat kerja — jadi hanya diisi petugas dengan izin
alumni yang bersangkutan; panelnya mengingatkan hal itu. Tidak ada angka atau
kisah bawaan: halaman publik menyembunyikan bagian ini selama belum ada satu
pun alumni yang aktif.

Foto masuk folder `bkk-alumni` yang publik, sama seperti logo mitra.
*/

const folderAlumniBkk = "bkk-alumni"

type AlumniBkk struct {
	ID         int    `json:"id"`
	Nama       string `json:"nama"`
	Angkatan   string `json:"angkatan"`
	Jabatan    string `json:"jabatan"`
	Perusahaan string `json:"perusahaan"`
	Kisah      string `json:"kisah"`
	Foto       string `json:"foto"`
	Urutan     int    `json:"urutan"`
	Aktif      bool   `json:"aktif"`
}

func (a *Aplikasi) ambilAlumniBkk(hanyaAktif bool) ([]AlumniBkk, error) {
	syarat := ""
	if hanyaAktif {
		syarat = "WHERE aktif"
	}
	baris, err := a.db.Query(`
		SELECT id, nama, angkatan, jabatan, perusahaan, kisah, COALESCE(foto, ''), urutan, aktif
		  FROM bkk_alumni ` + syarat + `
		 ORDER BY urutan, id`)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []AlumniBkk{}
	for baris.Next() {
		var al AlumniBkk
		if err := baris.Scan(&al.ID, &al.Nama, &al.Angkatan, &al.Jabatan, &al.Perusahaan,
			&al.Kisah, &al.Foto, &al.Urutan, &al.Aktif); err != nil {
			return nil, err
		}
		hasil = append(hasil, al)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiAlumniBkkPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilAlumniBkk(true)
	if err != nil {
		a.galatServer(w, "mengambil alumni BKK", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

func (a *Aplikasi) tanganiAlumniBkkAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilAlumniBkk(false)
	if err != nil {
		a.galatServer(w, "mengambil alumni BKK", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

func bacaIsianAlumni(r *http.Request) (al AlumniBkk, v *Validasi) {
	ambil := func(s string) string { return strings.TrimSpace(r.FormValue(s)) }
	v = validasiBaru()

	al.Nama = v.wajib("nama", "Nama alumni", ambil("nama"))
	v.panjangMaks("nama", "Nama alumni", al.Nama, 120)
	v.teksWajar("nama", "Nama alumni", al.Nama, false)
	al.Angkatan = ambil("angkatan")
	v.panjangMaks("angkatan", "Angkatan", al.Angkatan, 9)
	al.Jabatan = v.wajib("jabatan", "Posisi / jabatan", ambil("jabatan"))
	v.panjangMaks("jabatan", "Posisi / jabatan", al.Jabatan, 120)
	al.Perusahaan = v.wajib("perusahaan", "Tempat bekerja", ambil("perusahaan"))
	v.panjangMaks("perusahaan", "Tempat bekerja", al.Perusahaan, 160)
	al.Kisah = ambil("kisah")
	v.panjangMaks("kisah", "Profil singkat", al.Kisah, 1500)
	v.bulatRentang("urutan", "Urutan tampil", ambil("urutan"), 0, 9999)
	if u, err := strconv.Atoi(ambil("urutan")); err == nil {
		al.Urutan = u
	}
	al.Aktif = bolean(r, "aktif")
	return
}

func (a *Aplikasi) tanganiSimpanAlumniBkk(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	al, v := bacaIsianAlumni(r)
	foto, errF := a.ambilUnggahan(r.MultipartForm, "foto", folderAlumniBkk, TipeGambar)
	if errF != nil && !errors.Is(errF, GalatTanpaBerkas) {
		v.tambah("foto", "Foto: "+errF.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan(folderAlumniBkk, foto)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO bkk_alumni
	        (nama, angkatan, jabatan, perusahaan, kisah, foto, urutan, aktif)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		al.Nama, al.Angkatan, al.Jabatan, al.Perusahaan, al.Kisah,
		kosongJadiNil(foto), al.Urutan, al.Aktif).Scan(&id)
	if err != nil {
		a.hapusUnggahan(folderAlumniBkk, foto)
		a.galatServer(w, "menyimpan alumni BKK", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Alumni berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahAlumniBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var fotoLama string
	err := a.db.QueryRow("SELECT COALESCE(foto, '') FROM bkk_alumni WHERE id = $1", id).Scan(&fotoLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Alumni tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil alumni BKK", err)
		return
	}

	al, v := bacaIsianAlumni(r)
	fotoBaru, errF := a.ambilUnggahan(r.MultipartForm, "foto", folderAlumniBkk, TipeGambar)
	if errF != nil && !errors.Is(errF, GalatTanpaBerkas) {
		v.tambah("foto", "Foto: "+errF.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan(folderAlumniBkk, fotoBaru)
		kirimGalatValidasi(w, v)
		return
	}

	foto := fotoLama
	if fotoBaru != "" {
		foto = fotoBaru
	} else if bolean(r, "hapus_foto") {
		foto = ""
	}
	if _, err := a.db.Exec(`UPDATE bkk_alumni SET nama = $1, angkatan = $2, jabatan = $3,
	        perusahaan = $4, kisah = $5, foto = $6, urutan = $7, aktif = $8 WHERE id = $9`,
		al.Nama, al.Angkatan, al.Jabatan, al.Perusahaan, al.Kisah,
		kosongJadiNil(foto), al.Urutan, al.Aktif, id); err != nil {
		a.hapusUnggahan(folderAlumniBkk, fotoBaru)
		a.galatServer(w, "memperbarui alumni BKK", err)
		return
	}
	if fotoLama != "" && foto != fotoLama {
		a.hapusUnggahan(folderAlumniBkk, fotoLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Alumni berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusAlumniBkk(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var foto string
	err := a.db.QueryRow("DELETE FROM bkk_alumni WHERE id = $1 RETURNING COALESCE(foto, '')", id).Scan(&foto)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Alumni tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghapus alumni BKK", err)
		return
	}
	a.hapusUnggahan(folderAlumniBkk, foto)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Alumni berhasil dihapus."})
}

package main

import (
	"database/sql"
	"errors"
	"net/http"
	"regexp"
	"strings"
)

/*
Menu Profil Sekolah, Akademik, dan Kesiswaan.

Berkas ini menangani isi yang belum tertampung di tempat lain. Yang sudah ada
tidak diduplikasi, dan halaman publiknya mengambil dari sumber yang sudah
dipakai panitia sehari-hari:

	Sejarah, Visi, Misi, Data Sekolah  -> tabel pengaturan
	Sarana dan Prasarana               -> tabel fasilitas
	Prestasi Siswa                     -> tabel berita, kategori Prestasi

Yang ditangani di sini: halaman bernaskah panjang, tenaga pendidik, agenda
kalender akademik, kegiatan siswa, dan katalog perpustakaan.
*/

/* ================= halaman isi bebas ================= */

var polaSlug = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// ambilHalaman mengambil daftar halaman. Naskah lengkapnya tidak ikut karena
// pemakainya hanya butuh judul dan ringkasan untuk menyusun daftar menu.
func (a *Aplikasi) ambilHalaman(kelompok string, hanyaAktif bool) ([]Halaman, error) {
	n := &penomoran{}
	syarat := []string{"1 = 1"}
	arg := []any{}
	if hanyaAktif {
		syarat = append(syarat, "aktif = true")
	}
	if kelompok != "" {
		syarat = append(syarat, "kelompok = "+n.berikut())
		arg = append(arg, kelompok)
	}

	baris, err := a.db.Query(`SELECT id, slug, judul, ringkasan, COALESCE(gambar, ''),
	                                 kelompok, urutan, aktif, updated_at
	                            FROM halaman WHERE `+strings.Join(syarat, " AND ")+`
	                           ORDER BY kelompok, urutan, id`, arg...)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Halaman{}
	for baris.Next() {
		var h Halaman
		if err := baris.Scan(&h.ID, &h.Slug, &h.Judul, &h.Ringkasan, &h.Gambar,
			&h.Kelompok, &h.Urutan, &h.Aktif, &h.Diubah); err != nil {
			return nil, err
		}
		hasil = append(hasil, h)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiHalamanPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilHalaman(strings.TrimSpace(r.URL.Query().Get("kelompok")), true)
	if err != nil {
		a.galatServer(w, "mengambil daftar halaman", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

func (a *Aplikasi) tanganiHalamanDetail(w http.ResponseWriter, r *http.Request) {
	slug := strings.ToLower(strings.TrimSpace(r.PathValue("slug")))
	if !polaSlug.MatchString(slug) || len(slug) > 120 {
		kirimGalat(w, http.StatusBadRequest, "Alamat halaman tidak valid.")
		return
	}

	var h Halaman
	err := a.db.QueryRow(`SELECT id, slug, judul, ringkasan, isi, COALESCE(gambar, ''),
	                             kelompok, urutan, aktif, updated_at
	                        FROM halaman WHERE slug = $1 AND aktif = true`, slug).
		Scan(&h.ID, &h.Slug, &h.Judul, &h.Ringkasan, &h.Isi, &h.Gambar,
			&h.Kelompok, &h.Urutan, &h.Aktif, &h.Diubah)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Halaman tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil halaman", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": h})
}

func (a *Aplikasi) tanganiHalamanAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilHalaman("", false)
	if err != nil {
		a.galatServer(w, "mengambil daftar halaman", err)
		return
	}
	// Naskah lengkap ikut dikirim, karena panel admin yang menyuntingnya.
	isi := map[int]string{}
	baris, err := a.db.Query("SELECT id, isi FROM halaman")
	if err != nil {
		a.galatServer(w, "mengambil naskah halaman", err)
		return
	}
	defer baris.Close()
	for baris.Next() {
		var id int
		var naskah string
		if err := baris.Scan(&id, &naskah); err != nil {
			a.galatServer(w, "membaca naskah halaman", err)
			return
		}
		isi[id] = naskah
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca naskah halaman", err)
		return
	}
	for i := range daftar {
		daftar[i].Isi = isi[daftar[i].ID]
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar, "kelompok": KelompokHalaman,
	})
}

// bacaHalaman membaca isian formulir halaman sekaligus memeriksanya.
func bacaIsianHalaman(r *http.Request) (slug, judul, ringkasan, isi, kelompok string, urutan int, aktif bool, v *Validasi) {
	ambil := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v = validasiBaru()

	judul = v.wajib("judul", "Judul halaman", ambil("judul"))
	v.panjangMaks("judul", "Judul halaman", judul, 180)

	slug = strings.ToLower(ambil("slug"))
	if slug == "" {
		slug = buatSlug(judul)
	}
	if !polaSlug.MatchString(slug) || len(slug) > 120 {
		v.tambah("slug",
			"Alamat halaman hanya boleh huruf kecil, angka, dan tanda hubung, misalnya kurikulum-merdeka.")
	}

	ringkasan = ambil("ringkasan")
	v.panjangMaks("ringkasan", "Ringkasan", ringkasan, 400)
	isi = strings.TrimSpace(r.FormValue("isi"))
	if len([]rune(isi)) > 60000 {
		v.tambah("isi", "Naskah halaman terlalu panjang.")
	}

	kelompok = ambil("kelompok")
	if kelompok == "" {
		kelompok = "Profil"
	}
	v.pilihan("kelompok", "Kelompok menu", kelompok, KelompokHalaman)

	urutan = bilanganKueri(ambil("urutan"), 0, 0, 1000)
	aktif = bolean(r, "aktif")
	return
}

func (a *Aplikasi) tanganiSimpanHalaman(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	slug, judul, ringkasan, isi, kelompok, urutan, aktif, v := bacaIsianHalaman(r)
	gambar, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "profil", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("profil", gambar)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO halaman (slug, judul, ringkasan, isi, gambar, kelompok, urutan, aktif)
	                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		slug, judul, ringkasan, isi, kosongJadiNil(gambar), kelompok, urutan, aktif).Scan(&id)
	if err != nil {
		a.hapusUnggahan("profil", gambar)
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict,
				"Alamat halaman "+slug+" sudah dipakai halaman lain.")
			return
		}
		a.galatServer(w, "menyimpan halaman", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Halaman berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahHalaman(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var gambarLama string
	err := a.db.QueryRow("SELECT COALESCE(gambar, '') FROM halaman WHERE id = $1", id).Scan(&gambarLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Halaman tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil halaman", err)
		return
	}

	slug, judul, ringkasan, isi, kelompok, urutan, aktif, v := bacaIsianHalaman(r)
	gambarBaru, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "profil", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("profil", gambarBaru)
		kirimGalatValidasi(w, v)
		return
	}

	gambarDipakai := gambarLama
	if gambarBaru != "" {
		gambarDipakai = gambarBaru
	} else if bolean(r, "hapus_gambar") {
		gambarDipakai = ""
	}

	if _, err := a.db.Exec(`UPDATE halaman SET slug = $1, judul = $2, ringkasan = $3, isi = $4,
	                               gambar = $5, kelompok = $6, urutan = $7, aktif = $8
	                         WHERE id = $9`,
		slug, judul, ringkasan, isi, kosongJadiNil(gambarDipakai),
		kelompok, urutan, aktif, id); err != nil {
		a.hapusUnggahan("profil", gambarBaru)
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict,
				"Alamat halaman "+slug+" sudah dipakai halaman lain.")
			return
		}
		a.galatServer(w, "memperbarui halaman", err)
		return
	}
	if gambarLama != "" && gambarDipakai != gambarLama {
		a.hapusUnggahan("profil", gambarLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Halaman berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusHalaman(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var gambar string
	err := a.db.QueryRow("SELECT COALESCE(gambar, '') FROM halaman WHERE id = $1", id).Scan(&gambar)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Halaman tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil halaman", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM halaman WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus halaman", err)
		return
	}
	a.hapusUnggahan("profil", gambar)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Halaman berhasil dihapus."})
}

/* ================= tenaga pendidik dan kependidikan ================= */

func (a *Aplikasi) ambilTenaga(hanyaAktif bool) ([]Tenaga, error) {
	sqlStr := `SELECT id, nama, nip, jabatan, mata_pelajaran, wali_kelas,
	                  kategori, COALESCE(foto, ''), urutan, aktif
	             FROM tenaga_pendidik`
	if hanyaAktif {
		sqlStr += " WHERE aktif = true"
	}
	// Urutan kategori mengikuti CASE, bukan abjad, supaya pimpinan tampil
	// lebih dulu seperti pada papan struktur sekolah.
	sqlStr += ` ORDER BY CASE kategori WHEN 'Pimpinan' THEN 0
	                                   WHEN 'Pendidik' THEN 1 ELSE 2 END,
	                     urutan, nama, id`

	baris, err := a.db.Query(sqlStr)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Tenaga{}
	for baris.Next() {
		var t Tenaga
		if err := baris.Scan(&t.ID, &t.Nama, &t.NIP, &t.Jabatan, &t.MataPelajaran,
			&t.WaliKelas, &t.Kategori, &t.Foto, &t.Urutan, &t.Aktif); err != nil {
			return nil, err
		}
		hasil = append(hasil, t)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiTenagaPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilTenaga(true)
	if err != nil {
		a.galatServer(w, "mengambil tenaga pendidik", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": KategoriTenaga})
}

func (a *Aplikasi) tanganiTenagaAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilTenaga(false)
	if err != nil {
		a.galatServer(w, "mengambil tenaga pendidik", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": KategoriTenaga})
}

func bacaIsianTenaga(r *http.Request) (t Tenaga, v *Validasi) {
	ambil := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v = validasiBaru()

	t.Nama = v.wajib("nama", "Nama", ambil("nama"))
	v.panjangMaks("nama", "Nama", t.Nama, 120)
	t.NIP = ambil("nip")
	v.panjangMaks("nip", "NIP", t.NIP, 30)
	t.Jabatan = ambil("jabatan")
	v.panjangMaks("jabatan", "Jabatan", t.Jabatan, 120)
	t.MataPelajaran = ambil("mata_pelajaran")
	v.panjangMaks("mata_pelajaran", "Mata pelajaran", t.MataPelajaran, 120)
	t.WaliKelas = ambil("wali_kelas")
	v.panjangMaks("wali_kelas", "Wali kelas", t.WaliKelas, 40)

	t.Kategori = ambil("kategori")
	if t.Kategori == "" {
		t.Kategori = "Pendidik"
	}
	v.pilihan("kategori", "Kategori", t.Kategori, KategoriTenaga)

	t.Urutan = bilanganKueri(ambil("urutan"), 0, 0, 1000)
	t.Aktif = bolean(r, "aktif")
	return
}

func (a *Aplikasi) tanganiSimpanTenaga(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	t, v := bacaIsianTenaga(r)
	foto, errF := a.ambilUnggahan(r.MultipartForm, "foto", "profil", TipeGambar)
	if errF != nil && !errors.Is(errF, GalatTanpaBerkas) {
		v.tambah("foto", "Foto: "+errF.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("profil", foto)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO tenaga_pendidik
	        (nama, nip, jabatan, mata_pelajaran, wali_kelas, kategori, foto,
	         urutan, aktif)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		t.Nama, t.NIP, t.Jabatan, t.MataPelajaran, t.WaliKelas, t.Kategori,
		kosongJadiNil(foto), t.Urutan, t.Aktif).Scan(&id)
	if err != nil {
		a.hapusUnggahan("profil", foto)
		a.galatServer(w, "menyimpan tenaga pendidik", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Data berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahTenaga(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var fotoLama string
	err := a.db.QueryRow("SELECT COALESCE(foto, '') FROM tenaga_pendidik WHERE id = $1", id).Scan(&fotoLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Data tenaga pendidik tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil tenaga pendidik", err)
		return
	}

	t, v := bacaIsianTenaga(r)
	fotoBaru, errF := a.ambilUnggahan(r.MultipartForm, "foto", "profil", TipeGambar)
	if errF != nil && !errors.Is(errF, GalatTanpaBerkas) {
		v.tambah("foto", "Foto: "+errF.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("profil", fotoBaru)
		kirimGalatValidasi(w, v)
		return
	}

	fotoDipakai := fotoLama
	if fotoBaru != "" {
		fotoDipakai = fotoBaru
	} else if bolean(r, "hapus_foto") {
		fotoDipakai = ""
	}

	if _, err := a.db.Exec(`UPDATE tenaga_pendidik SET nama = $1, nip = $2, jabatan = $3,
	                               mata_pelajaran = $4, wali_kelas = $5, kategori = $6,
	                               foto = $7, urutan = $8, aktif = $9 WHERE id = $10`,
		t.Nama, t.NIP, t.Jabatan, t.MataPelajaran, t.WaliKelas, t.Kategori,
		kosongJadiNil(fotoDipakai), t.Urutan, t.Aktif, id); err != nil {
		a.hapusUnggahan("profil", fotoBaru)
		a.galatServer(w, "memperbarui tenaga pendidik", err)
		return
	}
	if fotoLama != "" && fotoDipakai != fotoLama {
		a.hapusUnggahan("profil", fotoLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Data berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusTenaga(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var foto string
	err := a.db.QueryRow("SELECT COALESCE(foto, '') FROM tenaga_pendidik WHERE id = $1", id).Scan(&foto)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Data tenaga pendidik tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil tenaga pendidik", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM tenaga_pendidik WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus tenaga pendidik", err)
		return
	}
	a.hapusUnggahan("profil", foto)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Data berhasil dihapus."})
}

/* ================= agenda, kalender akademik ================= */

func (a *Aplikasi) ambilAgenda(hanyaAktif bool, tahun string) ([]Agenda, error) {
	n := &penomoran{}
	syarat := []string{"1 = 1"}
	arg := []any{}
	if hanyaAktif {
		syarat = append(syarat, "aktif = true")
	}
	if tahun != "" {
		// Kegiatan yang melintasi akhir tahun tetap ikut selama salah satu
		// ujungnya berada di tahun yang diminta.
		syarat = append(syarat, "(EXTRACT(YEAR FROM mulai) = "+n.berikut()+
			"::int OR EXTRACT(YEAR FROM COALESCE(selesai, mulai)) = "+n.berikut()+"::int)")
		arg = append(arg, tahun, tahun)
	}

	baris, err := a.db.Query(`SELECT id, judul, to_char(mulai, 'YYYY-MM-DD'),
	                                 COALESCE(to_char(selesai, 'YYYY-MM-DD'), ''),
	                                 kategori, keterangan, aktif
	                            FROM agenda WHERE `+strings.Join(syarat, " AND ")+`
	                           ORDER BY mulai, id`, arg...)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Agenda{}
	for baris.Next() {
		var g Agenda
		if err := baris.Scan(&g.ID, &g.Judul, &g.Mulai, &g.Selesai,
			&g.Kategori, &g.Keterangan, &g.Aktif); err != nil {
			return nil, err
		}
		hasil = append(hasil, g)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiAgendaPublik(w http.ResponseWriter, r *http.Request) {
	tahun := strings.TrimSpace(r.URL.Query().Get("tahun"))
	if tahun != "" && bilanganKueri(tahun, 0, 1900, 2200) == 0 {
		kirimGalat(w, http.StatusBadRequest, "Tahun tidak valid.")
		return
	}
	daftar, err := a.ambilAgenda(true, tahun)
	if err != nil {
		a.galatServer(w, "mengambil agenda", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": KategoriAgenda})
}

func (a *Aplikasi) tanganiAgendaAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilAgenda(false, "")
	if err != nil {
		a.galatServer(w, "mengambil agenda", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": KategoriAgenda})
}

type permintaanAgenda struct {
	Judul      string `json:"judul"`
	Mulai      string `json:"mulai"`
	Selesai    string `json:"selesai"`
	Kategori   string `json:"kategori"`
	Keterangan string `json:"keterangan"`
	Aktif      bool   `json:"aktif"`
}

func (p *permintaanAgenda) periksa() *Validasi {
	v := validasiBaru()
	p.Judul = v.wajib("judul", "Judul kegiatan", p.Judul)
	v.panjangMaks("judul", "Judul kegiatan", p.Judul, 180)

	p.Mulai = strings.TrimSpace(p.Mulai)
	p.Selesai = strings.TrimSpace(p.Selesai)
	mulai, adaMulai := v.tanggal("mulai", "Tanggal mulai", p.Mulai, true)
	if p.Selesai != "" {
		selesai, adaSelesai := v.tanggal("selesai", "Tanggal selesai", p.Selesai, false)
		// Diperiksa di sini juga, bukan hanya oleh CHECK di basis data,
		// supaya panitia mendapat pesan yang menjelaskan masalahnya.
		if adaMulai && adaSelesai && selesai.Before(mulai) {
			v.tambah("selesai", "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.")
		}
	}

	if p.Kategori == "" {
		p.Kategori = "Kegiatan"
	}
	v.pilihan("kategori", "Kategori", p.Kategori, KategoriAgenda)
	p.Keterangan = strings.TrimSpace(p.Keterangan)
	if len([]rune(p.Keterangan)) > 4000 {
		v.tambah("keterangan", "Keterangan terlalu panjang.")
	}
	return v
}

func (a *Aplikasi) tanganiSimpanAgenda(w http.ResponseWriter, r *http.Request) {
	var p permintaanAgenda
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO agenda (judul, mulai, selesai, kategori, keterangan, aktif)
	                      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		p.Judul, p.Mulai, kosongJadiNil(p.Selesai), p.Kategori, p.Keterangan, p.Aktif).Scan(&id)
	if err != nil {
		a.galatServer(w, "menyimpan agenda", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Agenda berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahAgenda(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanAgenda
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	hasil, err := a.db.Exec(`UPDATE agenda SET judul = $1, mulai = $2, selesai = $3,
	                                kategori = $4, keterangan = $5, aktif = $6 WHERE id = $7`,
		p.Judul, p.Mulai, kosongJadiNil(p.Selesai), p.Kategori, p.Keterangan, p.Aktif, id)
	if err != nil {
		a.galatServer(w, "memperbarui agenda", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Agenda tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Agenda berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusAgenda(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	hasil, err := a.db.Exec("DELETE FROM agenda WHERE id = $1", id)
	if err != nil {
		a.galatServer(w, "menghapus agenda", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Agenda tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Agenda berhasil dihapus."})
}

/* ================= kegiatan siswa ================= */

func (a *Aplikasi) ambilKegiatan(hanyaAktif bool) ([]KegiatanSiswa, error) {
	sqlStr := `SELECT id, nama, jenis, deskripsi, pembina, jadwal,
	                  COALESCE(gambar, ''), urutan, aktif
	             FROM kegiatan_siswa`
	if hanyaAktif {
		sqlStr += " WHERE aktif = true"
	}
	sqlStr += " ORDER BY jenis, urutan, nama, id"

	baris, err := a.db.Query(sqlStr)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []KegiatanSiswa{}
	for baris.Next() {
		var k KegiatanSiswa
		if err := baris.Scan(&k.ID, &k.Nama, &k.Jenis, &k.Deskripsi, &k.Pembina,
			&k.Jadwal, &k.Gambar, &k.Urutan, &k.Aktif); err != nil {
			return nil, err
		}
		hasil = append(hasil, k)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiKegiatanPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilKegiatan(true)
	if err != nil {
		a.galatServer(w, "mengambil kegiatan siswa", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "jenis": JenisKegiatan})
}

func (a *Aplikasi) tanganiKegiatanAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilKegiatan(false)
	if err != nil {
		a.galatServer(w, "mengambil kegiatan siswa", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "jenis": JenisKegiatan})
}

func bacaIsianKegiatan(r *http.Request) (k KegiatanSiswa, v *Validasi) {
	ambil := func(s string) string { return strings.TrimSpace(r.FormValue(s)) }
	v = validasiBaru()

	k.Nama = v.wajib("nama", "Nama kegiatan", ambil("nama"))
	v.panjangMaks("nama", "Nama kegiatan", k.Nama, 120)
	k.Jenis = ambil("jenis")
	if k.Jenis == "" {
		k.Jenis = "Ekstrakurikuler"
	}
	v.pilihan("jenis", "Jenis kegiatan", k.Jenis, JenisKegiatan)

	k.Deskripsi = strings.TrimSpace(r.FormValue("deskripsi"))
	if len([]rune(k.Deskripsi)) > 8000 {
		v.tambah("deskripsi", "Deskripsi terlalu panjang.")
	}
	k.Pembina = ambil("pembina")
	v.panjangMaks("pembina", "Pembina", k.Pembina, 120)
	k.Jadwal = ambil("jadwal")
	v.panjangMaks("jadwal", "Jadwal", k.Jadwal, 160)

	k.Urutan = bilanganKueri(ambil("urutan"), 0, 0, 1000)
	k.Aktif = bolean(r, "aktif")
	return
}

func (a *Aplikasi) tanganiSimpanKegiatan(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	k, v := bacaIsianKegiatan(r)
	gambar, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "kegiatan", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("kegiatan", gambar)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO kegiatan_siswa
	        (nama, jenis, deskripsi, pembina, jadwal, gambar, urutan, aktif)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		k.Nama, k.Jenis, k.Deskripsi, k.Pembina, k.Jadwal,
		kosongJadiNil(gambar), k.Urutan, k.Aktif).Scan(&id)
	if err != nil {
		a.hapusUnggahan("kegiatan", gambar)
		a.galatServer(w, "menyimpan kegiatan siswa", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Kegiatan berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahKegiatan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var gambarLama string
	err := a.db.QueryRow("SELECT COALESCE(gambar, '') FROM kegiatan_siswa WHERE id = $1", id).Scan(&gambarLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Kegiatan tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil kegiatan siswa", err)
		return
	}

	k, v := bacaIsianKegiatan(r)
	gambarBaru, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "kegiatan", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("kegiatan", gambarBaru)
		kirimGalatValidasi(w, v)
		return
	}

	gambarDipakai := gambarLama
	if gambarBaru != "" {
		gambarDipakai = gambarBaru
	} else if bolean(r, "hapus_gambar") {
		gambarDipakai = ""
	}

	if _, err := a.db.Exec(`UPDATE kegiatan_siswa SET nama = $1, jenis = $2, deskripsi = $3,
	                               pembina = $4, jadwal = $5, gambar = $6, urutan = $7, aktif = $8
	                         WHERE id = $9`,
		k.Nama, k.Jenis, k.Deskripsi, k.Pembina, k.Jadwal,
		kosongJadiNil(gambarDipakai), k.Urutan, k.Aktif, id); err != nil {
		a.hapusUnggahan("kegiatan", gambarBaru)
		a.galatServer(w, "memperbarui kegiatan siswa", err)
		return
	}
	if gambarLama != "" && gambarDipakai != gambarLama {
		a.hapusUnggahan("kegiatan", gambarLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Kegiatan berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusKegiatan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var gambar string
	err := a.db.QueryRow("SELECT COALESCE(gambar, '') FROM kegiatan_siswa WHERE id = $1", id).Scan(&gambar)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Kegiatan tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil kegiatan siswa", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM kegiatan_siswa WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus kegiatan siswa", err)
		return
	}
	a.hapusUnggahan("kegiatan", gambar)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Kegiatan berhasil dihapus."})
}

/* ================= perpustakaan digital ================= */

func (a *Aplikasi) ambilPustaka(hanyaAktif bool) ([]Pustaka, []string, error) {
	sqlStr := `SELECT id, judul, penulis, kategori, tahun, keterangan,
	                  tautan, COALESCE(berkas, ''), urutan, aktif
	             FROM pustaka`
	if hanyaAktif {
		sqlStr += " WHERE aktif = true"
	}
	sqlStr += " ORDER BY kategori, urutan, judul, id"

	baris, err := a.db.Query(sqlStr)
	if err != nil {
		return nil, nil, err
	}
	defer baris.Close()

	hasil := []Pustaka{}
	// Kategori dikumpulkan dari data, bukan dari daftar tetap, karena
	// sekolah yang menentukan sendiri pengelompokan koleksinya.
	adaKategori := map[string]bool{}
	kategori := []string{}
	for baris.Next() {
		var p Pustaka
		if err := baris.Scan(&p.ID, &p.Judul, &p.Penulis, &p.Kategori, &p.Tahun,
			&p.Keterangan, &p.Tautan, &p.Berkas, &p.Urutan, &p.Aktif); err != nil {
			return nil, nil, err
		}
		hasil = append(hasil, p)
		if !adaKategori[p.Kategori] {
			adaKategori[p.Kategori] = true
			kategori = append(kategori, p.Kategori)
		}
	}
	return hasil, kategori, baris.Err()
}

func (a *Aplikasi) tanganiPustakaPublik(w http.ResponseWriter, r *http.Request) {
	daftar, kategori, err := a.ambilPustaka(true)
	if err != nil {
		a.galatServer(w, "mengambil koleksi pustaka", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": kategori})
}

func (a *Aplikasi) tanganiPustakaAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, kategori, err := a.ambilPustaka(false)
	if err != nil {
		a.galatServer(w, "mengambil koleksi pustaka", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": kategori})
}

func bacaIsianPustaka(r *http.Request) (p Pustaka, v *Validasi) {
	ambil := func(s string) string { return strings.TrimSpace(r.FormValue(s)) }
	v = validasiBaru()

	p.Judul = v.wajib("judul", "Judul koleksi", ambil("judul"))
	v.panjangMaks("judul", "Judul koleksi", p.Judul, 200)
	p.Penulis = ambil("penulis")
	v.panjangMaks("penulis", "Penulis", p.Penulis, 160)
	p.Kategori = ambil("kategori")
	if p.Kategori == "" {
		p.Kategori = "Umum"
	}
	v.panjangMaks("kategori", "Kategori", p.Kategori, 60)

	if t := ambil("tahun"); t != "" {
		p.Tahun = v.bulatRentang("tahun", "Tahun terbit", t, 1900, 2200)
	}
	p.Keterangan = strings.TrimSpace(r.FormValue("keterangan"))
	if len([]rune(p.Keterangan)) > 4000 {
		v.tambah("keterangan", "Keterangan terlalu panjang.")
	}

	p.Tautan = ambil("tautan")
	v.panjangMaks("tautan", "Tautan", p.Tautan, 500)
	if p.Tautan != "" && !strings.HasPrefix(p.Tautan, "http://") && !strings.HasPrefix(p.Tautan, "https://") {
		v.tambah("tautan", "Tautan harus dimulai dengan http:// atau https://.")
	}

	p.Urutan = bilanganKueri(ambil("urutan"), 0, 0, 1000)
	p.Aktif = bolean(r, "aktif")
	return
}

func (a *Aplikasi) tanganiSimpanPustaka(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	p, v := bacaIsianPustaka(r)
	berkas, errB := a.ambilUnggahan(r.MultipartForm, "berkas", "pustaka", TipeDokumen)
	if errB != nil && !errors.Is(errB, GalatTanpaBerkas) {
		v.tambah("berkas", "Berkas: "+errB.Error()+".")
	}
	// Satu koleksi harus dapat dibuka, entah lewat berkas atau lewat tautan.
	// Tanpa keduanya, barisnya hanya menjadi judul yang tidak bisa diapa-apakan.
	if berkas == "" && p.Tautan == "" {
		v.tambah("tautan", "Isi tautan koleksinya, atau unggah berkasnya.")
	}
	if v.bermasalah() {
		a.hapusUnggahan("pustaka", berkas)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(`INSERT INTO pustaka
	        (judul, penulis, kategori, tahun, keterangan, tautan, berkas, urutan, aktif)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		p.Judul, p.Penulis, p.Kategori, p.Tahun, p.Keterangan, p.Tautan,
		kosongJadiNil(berkas), p.Urutan, p.Aktif).Scan(&id)
	if err != nil {
		a.hapusUnggahan("pustaka", berkas)
		a.galatServer(w, "menyimpan koleksi pustaka", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Koleksi berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahPustaka(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var berkasLama string
	err := a.db.QueryRow("SELECT COALESCE(berkas, '') FROM pustaka WHERE id = $1", id).Scan(&berkasLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Koleksi tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil koleksi pustaka", err)
		return
	}

	p, v := bacaIsianPustaka(r)
	berkasBaru, errB := a.ambilUnggahan(r.MultipartForm, "berkas", "pustaka", TipeDokumen)
	if errB != nil && !errors.Is(errB, GalatTanpaBerkas) {
		v.tambah("berkas", "Berkas: "+errB.Error()+".")
	}

	berkasDipakai := berkasLama
	if berkasBaru != "" {
		berkasDipakai = berkasBaru
	} else if bolean(r, "hapus_berkas") {
		berkasDipakai = ""
	}
	if berkasDipakai == "" && p.Tautan == "" {
		v.tambah("tautan", "Isi tautan koleksinya, atau unggah berkasnya.")
	}
	if v.bermasalah() {
		a.hapusUnggahan("pustaka", berkasBaru)
		kirimGalatValidasi(w, v)
		return
	}

	if _, err := a.db.Exec(`UPDATE pustaka SET judul = $1, penulis = $2, kategori = $3,
	                               tahun = $4, keterangan = $5, tautan = $6, berkas = $7,
	                               urutan = $8, aktif = $9 WHERE id = $10`,
		p.Judul, p.Penulis, p.Kategori, p.Tahun, p.Keterangan, p.Tautan,
		kosongJadiNil(berkasDipakai), p.Urutan, p.Aktif, id); err != nil {
		a.hapusUnggahan("pustaka", berkasBaru)
		a.galatServer(w, "memperbarui koleksi pustaka", err)
		return
	}
	if berkasLama != "" && berkasDipakai != berkasLama {
		a.hapusUnggahan("pustaka", berkasLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Koleksi berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusPustaka(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var berkas string
	err := a.db.QueryRow("SELECT COALESCE(berkas, '') FROM pustaka WHERE id = $1", id).Scan(&berkas)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Koleksi tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil koleksi pustaka", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM pustaka WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus koleksi pustaka", err)
		return
	}
	a.hapusUnggahan("pustaka", berkas)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Koleksi berhasil dihapus."})
}

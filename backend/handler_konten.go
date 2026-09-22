package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

// idJalur membaca nomor data dari jalur URL dan melaporkan galat yang seragam.
func idJalur(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		kirimGalat(w, http.StatusBadRequest, "Nomor data tidak valid.")
		return 0, false
	}
	return id, true
}

// bacaFormulir membaca isian bertipe multipart (isian teks bercampur berkas).
// Dipakai seluruh menu konten karena hampir semuanya bisa mengunggah gambar.
func (a *Aplikasi) bacaFormulir(w http.ResponseWriter, r *http.Request) bool {
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.BatasUnggah+(1<<20))
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		kirimGalat(w, http.StatusBadRequest,
			"Data formulir tidak dapat dibaca. Periksa kembali ukuran gambar yang diunggah.")
		return false
	}
	return true
}

func bolean(r *http.Request, kolom string) bool {
	v := strings.ToLower(strings.TrimSpace(r.FormValue(kolom)))
	return v == "1" || v == "true" || v == "on" || v == "ya"
}

/* ================= jurusan ================= */

func (a *Aplikasi) tanganiJurusanAdmin(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilJurusan(false)
	if err != nil {
		a.galatServer(w, "mengambil jurusan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

type permintaanJurusan struct {
	Kode      string `json:"kode"`
	Nama      string `json:"nama"`
	Deskripsi string `json:"deskripsi"`
	Kuota     int    `json:"kuota"`
	Ikon      string `json:"ikon"`
	Aktif     bool   `json:"aktif"`
	Urutan    int    `json:"urutan"`
}

func (p *permintaanJurusan) periksa() *Validasi {
	v := validasiBaru()
	p.Kode = strings.ToUpper(v.wajib("kode", "Kode peminatan", p.Kode))
	p.Nama = v.wajib("nama", "Nama peminatan", p.Nama)
	p.Deskripsi = strings.TrimSpace(p.Deskripsi)
	p.Ikon = strings.TrimSpace(p.Ikon)

	v.panjangMaks("kode", "Kode peminatan", p.Kode, 20)
	v.panjangMaks("nama", "Nama peminatan", p.Nama, 100)
	v.panjangMaks("ikon", "Nama ikon", p.Ikon, 50)
	if p.Kuota < 0 || p.Kuota > 10000 {
		v.tambah("kuota", "Kuota harus berupa angka 0 sampai 10000.")
	}
	return v
}

func (a *Aplikasi) tanganiSimpanJurusan(w http.ResponseWriter, r *http.Request) {
	var p permintaanJurusan
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	// PostgreSQL tidak punya LastInsertId; nomornya diminta lewat RETURNING.
	var id int
	err := a.db.QueryRow(
		`INSERT INTO jurusan (kode, nama, deskripsi, kuota, icon, aktif, urutan)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		p.Kode, p.Nama, kosongJadiNil(p.Deskripsi), p.Kuota, kosongJadiNil(p.Ikon),
		p.Aktif, p.Urutan).Scan(&id)
	if err != nil {
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict, "Kode peminatan "+p.Kode+" sudah dipakai.")
			return
		}
		a.galatServer(w, "menyimpan jurusan", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan": "Peminatan berhasil ditambahkan.", "id": id,
	})
}

func (a *Aplikasi) tanganiUbahJurusan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanJurusan
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	_, err := a.db.Exec(
		`UPDATE jurusan SET kode = $1, nama = $2, deskripsi = $3, kuota = $4, icon = $5, aktif = $6, urutan = $7
		  WHERE id = $8`,
		p.Kode, p.Nama, kosongJadiNil(p.Deskripsi), p.Kuota, kosongJadiNil(p.Ikon), p.Aktif, p.Urutan, id)
	if err != nil {
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict, "Kode peminatan "+p.Kode+" sudah dipakai peminatan lain.")
			return
		}
		a.galatServer(w, "memperbarui jurusan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Peminatan berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusJurusan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}

	// Peminatan yang sudah dipilih pendaftar tidak boleh hilang, karena
	// riwayat pendaftarannya akan kehilangan keterangan. Sarankan
	// menonaktifkannya saja.
	var dipakai int
	if err := a.db.QueryRow(
		"SELECT COUNT(*) FROM pendaftar WHERE jurusan_id = $1", id).Scan(&dipakai); err != nil {
		a.galatServer(w, "memeriksa pemakaian jurusan", err)
		return
	}
	if dipakai > 0 {
		kirimGalat(w, http.StatusConflict, fmt.Sprintf(
			"Peminatan ini sudah dipilih oleh %d pendaftar sehingga tidak dapat dihapus. "+
				"Nonaktifkan saja agar tidak muncul lagi di formulir.", dipakai))
		return
	}

	if _, err := a.db.Exec("DELETE FROM jurusan WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus jurusan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Peminatan berhasil dihapus."})
}

/* ================= berita ================= */

var bukanHurufAngka = regexp.MustCompile(`[^a-z0-9]+`)

// buatSlug mengubah judul menjadi bagian URL yang aman dibaca manusia.
func buatSlug(judul string) string {
	s := bukanHurufAngka.ReplaceAllString(strings.ToLower(judul), "-")
	s = strings.Trim(s, "-")
	if len([]rune(s)) > 190 {
		s = string([]rune(s)[:190])
		s = strings.Trim(s, "-")
	}
	if s == "" {
		s = "berita"
	}
	return s
}

// slugUnik menambahkan angka di belakang slug bila sudah dipakai berita lain.
func (a *Aplikasi) slugUnik(dasar string, kecualiID int) (string, error) {
	for i := 0; i < 200; i++ {
		calon := dasar
		if i > 0 {
			calon = fmt.Sprintf("%s-%d", dasar, i+1)
		}
		var id int
		err := a.db.QueryRow("SELECT id FROM berita WHERE slug = $1", calon).Scan(&id)
		if err == sql.ErrNoRows || (err == nil && id == kecualiID) {
			return calon, nil
		}
		if err != nil {
			return "", err
		}
	}
	return "", errors.New("slug unik tidak dapat dibuat")
}

func (a *Aplikasi) tanganiBeritaAdmin(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	halaman := bilanganKueri(q.Get("halaman"), 1, 1, 10000)
	perHalaman := bilanganKueri(q.Get("per_halaman"), 20, 1, 100)

	n := &penomoran{}
	syarat := []string{"1 = 1"}
	arg := []any{}
	if k := q.Get("kategori"); kategoriSah(k) {
		syarat = append(syarat, "kategori = "+n.berikut())
		arg = append(arg, k)
	}
	// Penyaring publish menerima "1" atau "0"; nilai lain berarti tidak menyaring.
	switch q.Get("publish") {
	case "1":
		syarat = append(syarat, "publish = true")
	case "0":
		syarat = append(syarat, "publish = false")
	}
	if cari := strings.TrimSpace(q.Get("cari")); cari != "" {
		syarat = append(syarat, fmt.Sprintf("(judul ILIKE %s OR ringkasan ILIKE %s)",
			n.berikut(), n.berikut()))
		pola := "%" + cari + "%"
		arg = append(arg, pola, pola)
	}
	dimana := " WHERE " + strings.Join(syarat, " AND ")

	var total int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM berita"+dimana, arg...).Scan(&total); err != nil {
		a.galatServer(w, "menghitung berita", err)
		return
	}

	argHal := append(append([]any{}, arg...), perHalaman, (halaman-1)*perHalaman)
	baris, err := a.db.Query("SELECT "+kolomBerita+" FROM berita"+dimana+
		" ORDER BY created_at DESC LIMIT "+n.berikut()+" OFFSET "+n.berikut(), argHal...)
	if err != nil {
		a.galatServer(w, "mengambil berita", err)
		return
	}
	defer baris.Close()

	daftar, err := pindaiBerita(baris)
	if err != nil {
		a.galatServer(w, "membaca berita", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar, "total": total, "halaman": halaman,
		"per_halaman": perHalaman, "kategori": KategoriBerita,
	})
}

func (a *Aplikasi) tanganiSimpanBerita(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()
	judul := v.wajib("judul", "Judul", isi("judul"))
	teks := v.wajib("isi", "Isi berita", isi("isi"))
	kategori := isi("kategori")
	if kategori == "" {
		kategori = "Berita"
	}
	v.pilihan("kategori", "Kategori", kategori, KategoriBerita)
	v.panjangMaks("judul", "Judul", judul, 200)
	v.panjangMaks("ringkasan", "Ringkasan", isi("ringkasan"), 300)

	gambar, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "berita", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}

	if v.bermasalah() {
		a.hapusUnggahan("berita", gambar)
		kirimGalatValidasi(w, v)
		return
	}

	slug, err := a.slugUnik(buatSlug(judul), 0)
	if err != nil {
		a.hapusUnggahan("berita", gambar)
		a.galatServer(w, "membuat slug berita", err)
		return
	}

	penulis := isi("penulis")
	if penulis == "" {
		penulis = penggunaDari(r).Nama
	}

	var id int
	err = a.db.QueryRow(
		`INSERT INTO berita (judul, slug, kategori, ringkasan, isi, gambar, penulis, publish)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		judul, slug, kategori, kosongJadiNil(isi("ringkasan")), teks,
		kosongJadiNil(gambar), penulis, bolean(r, "publish")).Scan(&id)
	if err != nil {
		a.hapusUnggahan("berita", gambar)
		a.galatServer(w, "menyimpan berita", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan": "Berita berhasil disimpan.", "id": id, "slug": slug,
	})
}

func (a *Aplikasi) tanganiUbahBerita(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var gambarLama string
	var judulLama string
	err := a.db.QueryRow("SELECT COALESCE(gambar, ''), judul FROM berita WHERE id = $1", id).
		Scan(&gambarLama, &judulLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Berita tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil berita", err)
		return
	}

	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()
	judul := v.wajib("judul", "Judul", isi("judul"))
	teks := v.wajib("isi", "Isi berita", isi("isi"))
	kategori := isi("kategori")
	if kategori == "" {
		kategori = "Berita"
	}
	v.pilihan("kategori", "Kategori", kategori, KategoriBerita)
	v.panjangMaks("judul", "Judul", judul, 200)
	v.panjangMaks("ringkasan", "Ringkasan", isi("ringkasan"), 300)

	gambarBaru, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "berita", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("berita", gambarBaru)
		kirimGalatValidasi(w, v)
		return
	}

	// Slug hanya diperbarui bila judulnya berubah, supaya tautan yang sudah
	// dibagikan ke media sosial tidak rusak tanpa alasan.
	slugBaru := ""
	if judul != judulLama {
		slugBaru, err = a.slugUnik(buatSlug(judul), id)
		if err != nil {
			a.hapusUnggahan("berita", gambarBaru)
			a.galatServer(w, "membuat slug berita", err)
			return
		}
	}

	gambarDipakai := gambarLama
	if gambarBaru != "" {
		gambarDipakai = gambarBaru
	} else if bolean(r, "hapus_gambar") {
		gambarDipakai = ""
	}

	n2 := &penomoran{}
	sqlStr := fmt.Sprintf(`UPDATE berita SET judul = %s, kategori = %s, ringkasan = %s,
	                  isi = %s, gambar = %s, penulis = %s, publish = %s`,
		n2.berikut(), n2.berikut(), n2.berikut(), n2.berikut(),
		n2.berikut(), n2.berikut(), n2.berikut())
	arg := []any{judul, kategori, kosongJadiNil(isi("ringkasan")), teks,
		kosongJadiNil(gambarDipakai), kosongJadiNil(isi("penulis")), bolean(r, "publish")}
	if slugBaru != "" {
		sqlStr += ", slug = " + n2.berikut()
		arg = append(arg, slugBaru)
	}
	sqlStr += " WHERE id = " + n2.berikut()
	arg = append(arg, id)

	if _, err := a.db.Exec(sqlStr, arg...); err != nil {
		a.hapusUnggahan("berita", gambarBaru)
		a.galatServer(w, "memperbarui berita", err)
		return
	}

	// Gambar lama dibuang hanya setelah basis data berhasil diperbarui.
	if gambarLama != "" && gambarDipakai != gambarLama {
		a.hapusUnggahan("berita", gambarLama)
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"pesan": "Berita berhasil diperbarui.", "slug": slugBaru,
	})
}

func (a *Aplikasi) tanganiHapusBerita(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var gambar string
	err := a.db.QueryRow("SELECT COALESCE(gambar, '') FROM berita WHERE id = $1", id).Scan(&gambar)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Berita tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil berita", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM berita WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus berita", err)
		return
	}
	a.hapusUnggahan("berita", gambar)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Berita berhasil dihapus."})
}

/* ================= galeri ================= */

func (a *Aplikasi) tanganiSimpanGaleri(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()
	judul := v.wajib("judul", "Judul foto", isi("judul"))
	v.panjangMaks("judul", "Judul foto", judul, 160)
	v.panjangMaks("kategori", "Kategori", isi("kategori"), 60)
	v.panjangMaks("keterangan", "Keterangan", isi("keterangan"), 300)

	gambar, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "galeri", TipeGambar)
	if errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Foto wajib diunggah.")
	} else if errG != nil {
		v.tambah("gambar", "Foto: "+errG.Error()+".")
	}

	if v.bermasalah() {
		a.hapusUnggahan("galeri", gambar)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(
		"INSERT INTO galeri (judul, kategori, gambar, keterangan) VALUES ($1, $2, $3, $4) RETURNING id",
		judul, kosongJadiNil(isi("kategori")), gambar,
		kosongJadiNil(isi("keterangan"))).Scan(&id)
	if err != nil {
		a.hapusUnggahan("galeri", gambar)
		a.galatServer(w, "menyimpan foto galeri", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Foto berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahGaleri(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var gambarLama string
	err := a.db.QueryRow("SELECT gambar FROM galeri WHERE id = $1", id).Scan(&gambarLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Foto tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil foto galeri", err)
		return
	}

	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()
	judul := v.wajib("judul", "Judul foto", isi("judul"))
	v.panjangMaks("judul", "Judul foto", judul, 160)
	v.panjangMaks("kategori", "Kategori", isi("kategori"), 60)
	v.panjangMaks("keterangan", "Keterangan", isi("keterangan"), 300)

	// Berbeda dengan berita, galeri tanpa gambar tidak ada gunanya, jadi
	// gambar lama dipertahankan bila tidak ada unggahan baru.
	gambarBaru, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "galeri", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Foto: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("galeri", gambarBaru)
		kirimGalatValidasi(w, v)
		return
	}

	gambarDipakai := gambarLama
	if gambarBaru != "" {
		gambarDipakai = gambarBaru
	}

	if _, err := a.db.Exec(
		"UPDATE galeri SET judul = $1, kategori = $2, gambar = $3, keterangan = $4 WHERE id = $5",
		judul, kosongJadiNil(isi("kategori")), gambarDipakai,
		kosongJadiNil(isi("keterangan")), id); err != nil {
		a.hapusUnggahan("galeri", gambarBaru)
		a.galatServer(w, "memperbarui foto galeri", err)
		return
	}

	if gambarBaru != "" {
		a.hapusUnggahan("galeri", gambarLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Foto berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusGaleri(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var gambar string
	err := a.db.QueryRow("SELECT gambar FROM galeri WHERE id = $1", id).Scan(&gambar)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Foto tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil foto galeri", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM galeri WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus foto galeri", err)
		return
	}
	a.hapusUnggahan("galeri", gambar)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Foto berhasil dihapus."})
}

/* ================= fasilitas ================= */

func (a *Aplikasi) tanganiSimpanFasilitas(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()
	nama := v.wajib("nama", "Nama fasilitas", isi("nama"))
	v.panjangMaks("nama", "Nama fasilitas", nama, 120)
	v.panjangMaks("ikon", "Nama ikon", isi("ikon"), 50)
	urutan := bilanganKueri(isi("urutan"), 0, 0, 1000)

	gambar, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "fasilitas", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("fasilitas", gambar)
		kirimGalatValidasi(w, v)
		return
	}

	var id int
	err := a.db.QueryRow(
		"INSERT INTO fasilitas (nama, deskripsi, gambar, icon, urutan) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		nama, kosongJadiNil(isi("deskripsi")), kosongJadiNil(gambar),
		kosongJadiNil(isi("ikon")), urutan).Scan(&id)
	if err != nil {
		a.hapusUnggahan("fasilitas", gambar)
		a.galatServer(w, "menyimpan fasilitas", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Fasilitas berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahFasilitas(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	var gambarLama string
	err := a.db.QueryRow("SELECT COALESCE(gambar, '') FROM fasilitas WHERE id = $1", id).Scan(&gambarLama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Fasilitas tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil fasilitas", err)
		return
	}

	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()
	nama := v.wajib("nama", "Nama fasilitas", isi("nama"))
	v.panjangMaks("nama", "Nama fasilitas", nama, 120)
	v.panjangMaks("ikon", "Nama ikon", isi("ikon"), 50)
	urutan := bilanganKueri(isi("urutan"), 0, 0, 1000)

	gambarBaru, errG := a.ambilUnggahan(r.MultipartForm, "gambar", "fasilitas", TipeGambar)
	if errG != nil && !errors.Is(errG, GalatTanpaBerkas) {
		v.tambah("gambar", "Gambar: "+errG.Error()+".")
	}
	if v.bermasalah() {
		a.hapusUnggahan("fasilitas", gambarBaru)
		kirimGalatValidasi(w, v)
		return
	}

	gambarDipakai := gambarLama
	if gambarBaru != "" {
		gambarDipakai = gambarBaru
	} else if bolean(r, "hapus_gambar") {
		gambarDipakai = ""
	}

	if _, err := a.db.Exec(
		"UPDATE fasilitas SET nama = $1, deskripsi = $2, gambar = $3, icon = $4, urutan = $5 WHERE id = $6",
		nama, kosongJadiNil(isi("deskripsi")), kosongJadiNil(gambarDipakai),
		kosongJadiNil(isi("ikon")), urutan, id); err != nil {
		a.hapusUnggahan("fasilitas", gambarBaru)
		a.galatServer(w, "memperbarui fasilitas", err)
		return
	}

	if gambarLama != "" && gambarDipakai != gambarLama {
		a.hapusUnggahan("fasilitas", gambarLama)
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Fasilitas berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusFasilitas(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var gambar string
	err := a.db.QueryRow("SELECT COALESCE(gambar, '') FROM fasilitas WHERE id = $1", id).Scan(&gambar)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Fasilitas tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil fasilitas", err)
		return
	}
	if _, err := a.db.Exec("DELETE FROM fasilitas WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus fasilitas", err)
		return
	}
	a.hapusUnggahan("fasilitas", gambar)
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Fasilitas berhasil dihapus."})
}

/* ================= pembantu ================= */

// kodeGanda mengenali galat "nilai unik ganda". PostgreSQL memberi kode
// SQLSTATE 23505 untuk itu. Kodenya dibaca lewat antarmuka kecil, bukan
// dengan mencocokkan teks galatnya, supaya tidak ikut berubah bila pesannya
// diterjemahkan.
func kodeGanda(err error) bool {
	if err == nil {
		return false
	}
	var galatSQL interface{ SQLState() string }
	if errors.As(err, &galatSQL) {
		return galatSQL.SQLState() == "23505"
	}
	return strings.Contains(err.Error(), "23505")
}

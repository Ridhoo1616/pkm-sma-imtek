package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// Pengaturan yang boleh dibaca tanpa masuk. Kredensial dan kunci apa pun yang
// mungkin ditambahkan kemudian tidak akan ikut terkirim karena daftar ini
// bersifat izin-eksplisit, bukan larangan-eksplisit.
var pengaturanPublik = []string{
	"nama_sekolah", "nama_singkat", "tagline", "npsn", "akreditasi", "status_sekolah",
	"kepala_sekolah", "sambutan_kepsek", "visi", "misi", "sejarah", "yayasan",
	"keunggulan",
	"alamat", "kelurahan", "kecamatan", "kota", "provinsi", "kode_pos",
	"telepon", "email", "whatsapp", "instagram", "facebook", "youtube", "tiktok",
	"jam_layanan", "logo", "foto_depan", "peta_embed",
	"foto_kepsek", "struktur_organisasi", "struktur_keterangan",
	"tautan_elearning", "tautan_jadwal", "jadwal_keterangan",
	"perpustakaan_keterangan",
	"ppdb_status", "ppdb_tahun", "ppdb_mulai", "ppdb_selesai",
	"ppdb_pengumuman", "ppdb_kuota", "ppdb_biaya", "ppdb_syarat", "ppdb_alur",
}

func (a *Aplikasi) tanganiProfil(w http.ResponseWriter, r *http.Request) {
	a.kunciPengaturan.RLock()
	isi := map[string]string{}
	for _, k := range pengaturanPublik {
		isi[k] = a.pengaturan[k]
	}
	a.kunciPengaturan.RUnlock()

	kuota, _ := strconv.Atoi(a.atur("ppdb_kuota", "0"))
	terisi, err := a.hitungPendaftar("")
	if err != nil {
		a.galatServer(w, "menghitung pendaftar", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"pengaturan": isi,
		"ppdb": map[string]any{
			"dibuka": a.ppdbDibuka(),
			"kuota":  kuota,
			"terisi": terisi,
			"jalur":  JalurPendaftaran,
			"sumber": SumberInformasi,
		},
	})
}

func (a *Aplikasi) hitungPendaftar(status string) (int, error) {
	n := &penomoran{}
	sqlStr := "SELECT COUNT(*) FROM pendaftar WHERE tahun_ajaran = " + n.berikut()
	arg := []any{a.atur("ppdb_tahun")}
	if status != "" {
		sqlStr += " AND status = " + n.berikut()
		arg = append(arg, status)
	}
	var jumlah int
	err := a.db.QueryRow(sqlStr, arg...).Scan(&jumlah)
	return jumlah, err
}

/* ---------------- jurusan ---------------- */

// ambilJurusan mengambil daftar peminatan beserta jumlah pendaftarnya pada
// tahun ajaran aktif. hanyaAktif dipakai halaman publik; admin melihat semua.
func (a *Aplikasi) ambilJurusan(hanyaAktif bool) ([]Jurusan, error) {
	sqlStr := `SELECT j.id, j.kode, j.nama, COALESCE(j.deskripsi, ''), j.kuota,
	                  COALESCE(j.icon, ''), j.aktif, j.urutan,
	                  (SELECT COUNT(*) FROM pendaftar p
	                    WHERE p.jurusan_id = j.id AND p.tahun_ajaran = $1) AS pendaftar
	             FROM jurusan j`
	if hanyaAktif {
		sqlStr += " WHERE j.aktif = true"
	}
	sqlStr += " ORDER BY j.urutan, j.id"

	baris, err := a.db.Query(sqlStr, a.atur("ppdb_tahun"))
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Jurusan{}
	for baris.Next() {
		var j Jurusan
		if err := baris.Scan(&j.ID, &j.Kode, &j.Nama, &j.Deskripsi, &j.Kuota,
			&j.Ikon, &j.Aktif, &j.Urutan, &j.Pendaftar); err != nil {
			return nil, err
		}
		hasil = append(hasil, j)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiJurusanPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilJurusan(true)
	if err != nil {
		a.galatServer(w, "mengambil jurusan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

/* ---------------- fasilitas ---------------- */

func (a *Aplikasi) ambilFasilitas() ([]Fasilitas, error) {
	baris, err := a.db.Query(`SELECT id, nama, COALESCE(deskripsi, ''), COALESCE(gambar, ''),
	                                 COALESCE(icon, ''), urutan
	                            FROM fasilitas ORDER BY urutan, id`)
	if err != nil {
		return nil, err
	}
	defer baris.Close()

	hasil := []Fasilitas{}
	for baris.Next() {
		var f Fasilitas
		if err := baris.Scan(&f.ID, &f.Nama, &f.Deskripsi, &f.Gambar, &f.Ikon, &f.Urutan); err != nil {
			return nil, err
		}
		hasil = append(hasil, f)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiFasilitasPublik(w http.ResponseWriter, r *http.Request) {
	daftar, err := a.ambilFasilitas()
	if err != nil {
		a.galatServer(w, "mengambil fasilitas", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

/* ---------------- berita ---------------- */

const kolomBerita = `id, judul, slug, kategori, COALESCE(ringkasan, ''), isi,
                     COALESCE(gambar, ''), COALESCE(penulis, ''), dibaca, publish, created_at, updated_at`

func pindaiBerita(baris *sql.Rows) ([]Berita, error) {
	hasil := []Berita{}
	for baris.Next() {
		var b Berita
		if err := baris.Scan(&b.ID, &b.Judul, &b.Slug, &b.Kategori, &b.Ringkasan, &b.Isi,
			&b.Gambar, &b.Penulis, &b.Dibaca, &b.Publish, &b.Dibuat, &b.Diubah); err != nil {
			return nil, err
		}
		hasil = append(hasil, b)
	}
	return hasil, baris.Err()
}

func (a *Aplikasi) tanganiBeritaPublik(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	halaman := bilanganKueri(q.Get("halaman"), 1, 1, 10000)
	perHalaman := bilanganKueri(q.Get("per_halaman"), 9, 1, 50)
	kategori := q.Get("kategori")
	cari := strings.TrimSpace(q.Get("cari"))

	n := &penomoran{}
	syarat := []string{"publish = true"}
	arg := []any{}
	if kategoriSah(kategori) {
		syarat = append(syarat, "kategori = "+n.berikut())
		arg = append(arg, kategori)
	}
	if cari != "" {
		// ILIKE dipakai supaya pencarian tidak membedakan huruf besar kecil;
		// LIKE pada PostgreSQL bersifat peka huruf, berbeda dari MySQL.
		syarat = append(syarat, fmt.Sprintf(
			"(judul ILIKE %s OR ringkasan ILIKE %s OR isi ILIKE %s)",
			n.berikut(), n.berikut(), n.berikut()))
		pola := "%" + cari + "%"
		arg = append(arg, pola, pola, pola)
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
		"data":        daftar,
		"total":       total,
		"halaman":     halaman,
		"per_halaman": perHalaman,
		"kategori":    KategoriBerita,
	})
}

// tanganiBeritaDetail mencari berita berdasarkan slug dan menaikkan pencacah
// dibaca. Kegagalan menaikkan pencacah tidak boleh menggagalkan permintaan.
func (a *Aplikasi) tanganiBeritaDetail(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	var b Berita
	err := a.db.QueryRow("SELECT "+kolomBerita+" FROM berita WHERE slug = $1 AND publish = true", slug).
		Scan(&b.ID, &b.Judul, &b.Slug, &b.Kategori, &b.Ringkasan, &b.Isi,
			&b.Gambar, &b.Penulis, &b.Dibaca, &b.Publish, &b.Dibuat, &b.Diubah)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Berita yang Anda cari tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil detail berita", err)
		return
	}

	if _, err := a.db.Exec("UPDATE berita SET dibaca = dibaca + 1 WHERE id = $1", b.ID); err != nil {
		a.log.Printf("gagal menaikkan pencacah dibaca: %v", err)
	}
	b.Dibaca++

	// Berita lain pada kategori yang sama, untuk tautan "baca juga".
	baris, err := a.db.Query("SELECT "+kolomBerita+
		" FROM berita WHERE publish = true AND kategori = $1 AND id <> $2 ORDER BY created_at DESC LIMIT 3",
		b.Kategori, b.ID)
	if err != nil {
		a.galatServer(w, "mengambil berita terkait", err)
		return
	}
	defer baris.Close()
	terkait, err := pindaiBerita(baris)
	if err != nil {
		a.galatServer(w, "membaca berita terkait", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{"data": b, "terkait": terkait})
}

/* ---------------- galeri ---------------- */

func (a *Aplikasi) tanganiGaleriPublik(w http.ResponseWriter, r *http.Request) {
	kategori := strings.TrimSpace(r.URL.Query().Get("kategori"))

	sqlStr := `SELECT id, judul, COALESCE(kategori, ''), gambar,
	                  COALESCE(keterangan, ''), created_at FROM galeri`
	arg := []any{}
	if kategori != "" {
		sqlStr += " WHERE kategori = $1"
		arg = append(arg, kategori)
	}
	sqlStr += " ORDER BY created_at DESC, id DESC"

	baris, err := a.db.Query(sqlStr, arg...)
	if err != nil {
		a.galatServer(w, "mengambil galeri", err)
		return
	}
	defer baris.Close()

	daftar := []Galeri{}
	for baris.Next() {
		var g Galeri
		if err := baris.Scan(&g.ID, &g.Judul, &g.Kategori, &g.Gambar, &g.Keterangan, &g.Dibuat); err != nil {
			a.galatServer(w, "membaca galeri", err)
			return
		}
		daftar = append(daftar, g)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca galeri", err)
		return
	}

	// Daftar kategori dikirim sekalian supaya frontend bisa membuat penyaring
	// tanpa permintaan kedua.
	barisKat, err := a.db.Query(
		"SELECT DISTINCT kategori FROM galeri WHERE kategori IS NOT NULL AND kategori <> '' ORDER BY kategori")
	if err != nil {
		a.galatServer(w, "mengambil kategori galeri", err)
		return
	}
	defer barisKat.Close()
	kategoriAda := []string{}
	for barisKat.Next() {
		var k string
		if err := barisKat.Scan(&k); err != nil {
			a.galatServer(w, "membaca kategori galeri", err)
			return
		}
		kategoriAda = append(kategoriAda, k)
	}

	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "kategori": kategoriAda})
}

/* ---------------- pesan kontak ---------------- */

type permintaanPesan struct {
	Nama    string `json:"nama"`
	Email   string `json:"email"`
	NoHP    string `json:"no_hp"`
	Subjek  string `json:"subjek"`
	Isi     string `json:"isi"`
	Website string `json:"website"` // perangkap spam, harus tetap kosong
}

func (a *Aplikasi) tanganiKirimPesan(w http.ResponseWriter, r *http.Request) {
	var p permintaanPesan
	if !bacaJSON(w, r, &p) {
		return
	}
	// Perangkap spam: robot pengisi formulir biasanya mengisi semua kolom.
	if strings.TrimSpace(p.Website) != "" {
		kirimGalat(w, http.StatusBadRequest, "Permintaan ditolak.")
		return
	}

	v := validasiBaru()
	p.Nama = v.wajib("nama", "Nama", p.Nama)
	p.Subjek = v.wajib("subjek", "Subjek", p.Subjek)
	p.Isi = v.wajib("isi", "Isi pesan", p.Isi)
	p.Email = strings.TrimSpace(p.Email)
	p.NoHP = strings.TrimSpace(p.NoHP)

	v.panjangMaks("nama", "Nama", p.Nama, 100)
	v.panjangMaks("subjek", "Subjek", p.Subjek, 200)
	v.panjangMaks("isi", "Isi pesan", p.Isi, 5000)
	v.email("email", p.Email)
	v.telepon("no_hp", "Nomor HP", p.NoHP, false)

	// Minimal salah satu jalur balasan harus ada, kalau tidak pesannya
	// tidak dapat ditindaklanjuti sekolah.
	if p.Email == "" && p.NoHP == "" {
		v.tambah("email", "Isi email atau nomor HP agar sekolah dapat membalas.")
	}
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	_, err := a.db.Exec(
		`INSERT INTO pesan (nama, email, no_hp, subjek, isi) VALUES ($1, $2, $3, $4, $5)`,
		p.Nama, kosongJadiNil(p.Email), kosongJadiNil(p.NoHP), p.Subjek, p.Isi)
	if err != nil {
		a.galatServer(w, "menyimpan pesan", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]string{
		"pesan": "Terima kasih, pesan Anda sudah terkirim. Sekolah akan menghubungi Anda kembali.",
	})
}

/* ---------------- pembantu kueri ---------------- */

// bilanganKueri membaca satu parameter kueri sebagai bilangan bulat dan
// menjepitnya ke rentang yang aman, sehingga nilai aneh dari luar tidak
// membuat kueri berat atau galat.
func bilanganKueri(teks string, bawaan, min, maks int) int {
	n, err := strconv.Atoi(strings.TrimSpace(teks))
	if err != nil {
		return bawaan
	}
	if n < min {
		return min
	}
	if n > maks {
		return maks
	}
	return n
}

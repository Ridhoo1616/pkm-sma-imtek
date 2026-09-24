package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

/* ================= pesan masuk ================= */

func (a *Aplikasi) tanganiDaftarPesan(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	halaman := bilanganKueri(q.Get("halaman"), 1, 1, 10000)
	perHalaman := bilanganKueri(q.Get("per_halaman"), 20, 1, 100)

	n := &penomoran{}
	syarat := []string{"1 = 1"}
	arg := []any{}
	switch q.Get("dibaca") {
	case "0":
		syarat = append(syarat, "dibaca = false")
	case "1":
		syarat = append(syarat, "dibaca = true")
	}
	if cari := strings.TrimSpace(q.Get("cari")); cari != "" {
		syarat = append(syarat, fmt.Sprintf(
			"(nama ILIKE %s OR subjek ILIKE %s OR isi ILIKE %s)",
			n.berikut(), n.berikut(), n.berikut()))
		pola := "%" + cari + "%"
		arg = append(arg, pola, pola, pola)
	}
	dimana := " WHERE " + strings.Join(syarat, " AND ")

	var total, belum int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM pesan"+dimana, arg...).Scan(&total); err != nil {
		a.galatServer(w, "menghitung pesan", err)
		return
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM pesan WHERE dibaca = false").Scan(&belum); err != nil {
		a.galatServer(w, "menghitung pesan belum dibaca", err)
		return
	}

	argHal := append(append([]any{}, arg...), perHalaman, (halaman-1)*perHalaman)
	baris, err := a.db.Query(`SELECT id, nama, COALESCE(email, ''), COALESCE(no_hp, ''),
	                                 COALESCE(subjek, ''), isi, dibaca, created_at, dibalas_pada
	                            FROM pesan`+dimana+` ORDER BY created_at DESC LIMIT `+n.berikut()+` OFFSET `+n.berikut(), argHal...)
	if err != nil {
		a.galatServer(w, "mengambil pesan", err)
		return
	}
	defer baris.Close()

	daftar := []Pesan{}
	for baris.Next() {
		var p Pesan
		var dibalas sql.NullTime
		if err := baris.Scan(&p.ID, &p.Nama, &p.Email, &p.NoHP, &p.Subjek, &p.Isi,
			&p.Dibaca, &p.Dibuat, &dibalas); err != nil {
			a.galatServer(w, "membaca pesan", err)
			return
		}
		if dibalas.Valid {
			t := dibalas.Time
			p.DibalasPada = &t
		}
		daftar = append(daftar, p)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca pesan", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar, "total": total, "belum_dibaca": belum,
		"halaman": halaman, "per_halaman": perHalaman,
		// Panel perlu tahu sebelum panitia mengarang balasan panjang: tanpa
		// SMTP, kanal email pasti gagal, dan lebih baik dikatakan lebih dulu.
		"email_aktif": a.emailDisetel(),
	})
}

func (a *Aplikasi) tanganiTandaiPesan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p struct {
		Dibaca bool `json:"dibaca"`
	}
	if !bacaJSON(w, r, &p) {
		return
	}
	hasil, err := a.db.Exec("UPDATE pesan SET dibaca = $1 WHERE id = $2", p.Dibaca, id)
	if err != nil {
		a.galatServer(w, "menandai pesan", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		var ada int
		if a.db.QueryRow("SELECT id FROM pesan WHERE id = $1", id).Scan(&ada) == sql.ErrNoRows {
			kirimGalat(w, http.StatusNotFound, "Pesan tidak ditemukan.")
			return
		}
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Tanda baca pesan diperbarui."})
}

type permintaanBalasPesan struct {
	Kanal   string `json:"kanal"`
	Tujuan  string `json:"tujuan"`
	Perihal string `json:"perihal"`
	Isi     string `json:"isi"`
}

/*
tanganiBalasPesan mengirim balasan panitia atas satu pesan masuk.

Sebelum ini panel hanya memasang tautan mailto:, dan tautan mailto: tidak
melakukan apa pun di komputer yang tidak punya aplikasi email terpasang.
Sekarang balasannya diarang di dalam panel dan dikirim server lewat SMTP yang
sama dengan notifikasi PPDB.

Alamat tujuannya DAPAT DIUBAH panitia, tidak dipaksa sama dengan yang tertulis
pada pesannya. Pengunjung kadang salah menulis alamatnya sendiri, dan yang
harus dijawab kadang orang tuanya, bukan pengirimnya.

Dua kanal, dan keduanya tidak setara:

  - Email dikirim server. Bila SMTP belum disetel, pengirimannya memang tidak
    mungkin, dan itu dijawab apa adanya SEBELUM apa pun dicatat.
  - WhatsApp tidak dikirim server, sebab pengiriman otomatis hanya sah lewat
    WhatsApp Business API resmi. Yang dilakukan di sini hanya mencatat, lalu
    mengembalikan tautan wa.me berisi pesan yang sudah terisi; panitia yang
    menekan kirim dari akun WhatsApp-nya sendiri. Sama seperti notifikasi
    PPDB, jadi panitia tidak menghadapi dua kebiasaan yang berbeda.

Setiap balasan dicatat di tabel notifikasi, satu tempat dengan pesan PPDB,
supaya panitia dapat menunjukkan persis apa yang dikirim bila ada sengketa.
*/
func (a *Aplikasi) tanganiBalasPesan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanBalasPesan
	if !bacaJSON(w, r, &p) {
		return
	}

	var nama string
	err := a.db.QueryRow("SELECT nama FROM pesan WHERE id = $1", id).Scan(&nama)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Pesan tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil pesan", err)
		return
	}

	p.Kanal = strings.TrimSpace(p.Kanal)
	v := validasiBaru()
	p.Isi = v.wajib("isi", "Isi balasan", p.Isi)
	// Batas yang sama dengan notifikasi PPDB, yaitu batas satu pesan
	// WhatsApp. Email sanggup jauh lebih panjang, tetapi satu batas untuk
	// kedua kanal membuat naskah yang sama dapat dikirim ke dua-duanya.
	v.panjangMaks("isi", "Isi balasan", p.Isi, 4000)

	switch p.Kanal {
	case "Email":
		p.Tujuan = v.wajib("tujuan", "Alamat email tujuan", p.Tujuan)
		v.panjangMaks("tujuan", "Alamat email tujuan", p.Tujuan, 120)
		v.email("tujuan", p.Tujuan)
		p.Perihal = v.wajib("perihal", "Perihal", p.Perihal)
		v.panjangMaks("perihal", "Perihal", p.Perihal, 200)
	case "WhatsApp":
		p.Tujuan = v.wajib("tujuan", "Nomor WhatsApp tujuan", p.Tujuan)
		v.telepon("tujuan", "Nomor WhatsApp tujuan", p.Tujuan, false)
		// Perihal tidak dipakai WhatsApp; kalau ikut terkirim, dibuang saja
		// daripada tersimpan sebagai catatan yang menyesatkan.
		p.Perihal = ""
	default:
		v.tambah("kanal", "Kanal balasan tidak dikenal. Pilih Email atau WhatsApp.")
	}
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	saya := penggunaDari(r)

	if p.Kanal == "Email" {
		if !a.emailDisetel() {
			kirimGalat(w, http.StatusServiceUnavailable,
				"Pengiriman email belum disetel di server. Isi SMTP_HOST, SMTP_USER, "+
					"SMTP_PASS, dan SMTP_DARI pada berkas .env, lalu nyalakan ulang server.")
			return
		}
		if err := a.kirimEmail(r.Context(), p.Tujuan, p.Perihal, p.Isi); err != nil {
			// Yang gagal tetap dicatat beserta sebabnya. Panitia perlu tahu
			// bahwa percobaannya ada dan mengapa tidak sampai, bukan
			// menghadapi daftar yang bersih seolah tidak pernah dicoba.
			if _, errCatat := a.catatBalasan(id, "Email", p.Tujuan, p.Perihal, p.Isi,
				"Gagal", err.Error(), 0); errCatat != nil {
				a.log.Printf("gagal mencatat balasan gagal untuk pesan %d: %v", id, errCatat)
			}
			a.log.Printf("balasan email untuk pesan %d gagal: %v", id, err)
			kirimGalat(w, http.StatusBadGateway,
				"Balasan gagal dikirim. Keterangannya tercatat pada menu Notifikasi.")
			return
		}
		if _, err := a.catatBalasan(id, "Email", p.Tujuan, p.Perihal, p.Isi,
			"Terkirim", "", saya.ID); err != nil {
			a.galatServer(w, "mencatat balasan", err)
			return
		}
		if err := a.tandaiPesanDibalas(id, saya.ID); err != nil {
			a.galatServer(w, "menandai pesan sudah dibalas", err)
			return
		}
		kirimJSON(w, http.StatusOK, map[string]any{
			"pesan":      "Balasan terkirim lewat email ke " + p.Tujuan + ".",
			"dikirim_ke": p.Tujuan,
		})
		return
	}

	nomor := nomorWaKirim(p.Tujuan)
	if _, err := a.catatBalasan(id, "WhatsApp", nomor, "", p.Isi,
		"Terkirim", "", saya.ID); err != nil {
		a.galatServer(w, "mencatat balasan", err)
		return
	}
	if err := a.tandaiPesanDibalas(id, saya.ID); err != nil {
		a.galatServer(w, "menandai pesan sudah dibalas", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"pesan":      "Balasan dicatat. WhatsApp terbuka dengan pesan yang sudah terisi.",
		"tautan_wa":  tautanWa(nomor, p.Isi),
		"dikirim_ke": nomor,
	})
}

// catatBalasan menyimpan satu balasan ke tabel notifikasi. pendaftar_id
// dibiarkan kosong: balasan pesan masuk tidak berasal dari pendaftar mana pun.
// olehID nol berarti belum ada yang berhasil mengirimnya.
func (a *Aplikasi) catatBalasan(pesanID int, kanal, tujuan, perihal, isi, status, galat string, olehID int) (int, error) {
	var id int
	var oleh any
	var dikirim any
	if status == "Terkirim" && olehID > 0 {
		oleh = olehID
		dikirim = time.Now()
	}
	err := a.db.QueryRow(
		`INSERT INTO notifikasi (pendaftar_id, kanal, tujuan, jenis, perihal, pesan,
		                         status, galat, dikirim_pada, dikirim_oleh)
		 VALUES (NULL, $1, $2, 'balasan_pesan', $3, $4, $5, $6, $7, $8)
		 RETURNING id`,
		kanal, tujuan, perihal, isi, status, potong(galat, 1000), dikirim, oleh).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("mencatat balasan pesan %d: %w", pesanID, err)
	}
	return id, nil
}

// tandaiPesanDibalas menandai pesannya sudah dijawab, dan sekaligus sudah
// dibaca: membalas tanpa membaca tidak mungkin, dan pesan yang sudah dibalas
// tetapi masih bertanda "belum dibaca" hanya membingungkan panitia berikutnya.
func (a *Aplikasi) tandaiPesanDibalas(pesanID, olehID int) error {
	_, err := a.db.Exec(
		`UPDATE pesan SET dibaca = true, dibalas_pada = now(), dibalas_oleh = $1
		 WHERE id = $2`, olehID, pesanID)
	return err
}

func (a *Aplikasi) tanganiHapusPesan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	hasil, err := a.db.Exec("DELETE FROM pesan WHERE id = $1", id)
	if err != nil {
		a.galatServer(w, "menghapus pesan", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Pesan tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pesan berhasil dihapus."})
}

/* ================= pengaturan ================= */

type ButirPengaturan struct {
	Nama       string `json:"nama_setting"`
	Nilai      string `json:"nilai"`
	Keterangan string `json:"keterangan"`
}

func (a *Aplikasi) tanganiDaftarPengaturan(w http.ResponseWriter, r *http.Request) {
	baris, err := a.db.Query(
		"SELECT nama_setting, COALESCE(nilai, ''), COALESCE(keterangan, '') FROM pengaturan ORDER BY nama_setting")
	if err != nil {
		a.galatServer(w, "mengambil pengaturan", err)
		return
	}
	defer baris.Close()

	daftar := []ButirPengaturan{}
	for baris.Next() {
		var b ButirPengaturan
		if err := baris.Scan(&b.Nama, &b.Nilai, &b.Keterangan); err != nil {
			a.galatServer(w, "membaca pengaturan", err)
			return
		}
		daftar = append(daftar, b)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca pengaturan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar})
}

// tanganiSimpanPengaturan memperbarui beberapa pengaturan sekaligus. Hanya
// kunci yang sudah ada di basis data yang diterima, sehingga isian dari luar
// tidak bisa menambah kunci baru yang tidak dikenali aplikasi.
func (a *Aplikasi) tanganiSimpanPengaturan(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Pengaturan map[string]string `json:"pengaturan"`
	}
	if !bacaJSON(w, r, &p) {
		return
	}
	if len(p.Pengaturan) == 0 {
		kirimGalat(w, http.StatusBadRequest, "Tidak ada pengaturan yang dikirim.")
		return
	}
	if len(p.Pengaturan) > 100 {
		kirimGalat(w, http.StatusBadRequest, "Terlalu banyak pengaturan dalam satu permintaan.")
		return
	}

	a.kunciPengaturan.RLock()
	dikenal := make(map[string]bool, len(a.pengaturan))
	for k := range a.pengaturan {
		dikenal[k] = true
	}
	a.kunciPengaturan.RUnlock()

	v := validasiBaru()
	for kunci, nilai := range p.Pengaturan {
		if !dikenal[kunci] {
			v.tambah(kunci, "Pengaturan "+kunci+" tidak dikenali.")
			continue
		}
		if len([]rune(nilai)) > 20000 {
			v.tambah(kunci, "Nilai pengaturan "+kunci+" terlalu panjang.")
		}
	}
	// Status PPDB hanya boleh salah satu dari dua nilai, karena seluruh
	// logika buka-tutup pendaftaran bergantung padanya.
	if s, ada := p.Pengaturan["ppdb_status"]; ada && s != "buka" && s != "tutup" {
		v.tambah("ppdb_status", "Status PPDB hanya boleh \"buka\" atau \"tutup\".")
	}
	for _, kunci := range []string{"ppdb_mulai", "ppdb_selesai", "ppdb_pengumuman"} {
		if t, ada := p.Pengaturan[kunci]; ada && strings.TrimSpace(t) != "" {
			v.tanggal(kunci, "Tanggal "+kunci, strings.TrimSpace(t), false)
		}
	}
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	transaksi, err := a.db.Begin()
	if err != nil {
		a.galatServer(w, "memulai transaksi pengaturan", err)
		return
	}
	defer transaksi.Rollback()

	pernyataan, err := transaksi.Prepare("UPDATE pengaturan SET nilai = $1 WHERE nama_setting = $2")
	if err != nil {
		a.galatServer(w, "menyiapkan pembaruan pengaturan", err)
		return
	}
	defer pernyataan.Close()

	for kunci, nilai := range p.Pengaturan {
		if _, err := pernyataan.Exec(strings.TrimSpace(nilai), kunci); err != nil {
			a.galatServer(w, "menyimpan pengaturan "+kunci, err)
			return
		}
	}
	if err := transaksi.Commit(); err != nil {
		a.galatServer(w, "menyelesaikan pembaruan pengaturan", err)
		return
	}

	// Cache di memori harus segera disegarkan, kalau tidak halaman publik
	// masih menampilkan nilai lama sampai server dimulai ulang.
	if err := a.muatPengaturan(); err != nil {
		a.galatServer(w, "menyegarkan pengaturan", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pengaturan berhasil disimpan."})
}

/* ================= pengguna ================= */

func (a *Aplikasi) tanganiDaftarPengguna(w http.ResponseWriter, r *http.Request) {
	baris, err := a.db.Query(
		"SELECT id, nama, username, role, last_login, created_at FROM users ORDER BY id")
	if err != nil {
		a.galatServer(w, "mengambil pengguna", err)
		return
	}
	defer baris.Close()

	daftar := []Pengguna{}
	for baris.Next() {
		var p Pengguna
		if err := baris.Scan(&p.ID, &p.Nama, &p.Username, &p.Role, &p.MasukAkhir, &p.Dibuat); err != nil {
			a.galatServer(w, "membaca pengguna", err)
			return
		}
		daftar = append(daftar, p)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca pengguna", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "peran": []string{"admin", "operator"}})
}

type permintaanPengguna struct {
	Nama     string `json:"nama"`
	Username string `json:"username"`
	Sandi    string `json:"sandi"`
	Role     string `json:"role"`
}

// usernameSah menjaga nama pengguna tetap sederhana dan aman dipakai sebagai
// penanda akun: huruf kecil, angka, titik, dan garis bawah, 3-50 karakter.
func usernameSah(s string) bool {
	if len(s) < 3 || len(s) > 50 {
		return false
	}
	for _, c := range s {
		if !(c >= 'a' && c <= 'z') && !(c >= '0' && c <= '9') && c != '.' && c != '_' {
			return false
		}
	}
	return true
}

func (p *permintaanPengguna) periksa(sandiWajib bool) *Validasi {
	v := validasiBaru()
	p.Nama = v.wajib("nama", "Nama", p.Nama)
	p.Username = strings.ToLower(v.wajib("username", "Nama pengguna", p.Username))
	v.panjangMaks("nama", "Nama", p.Nama, 100)

	if p.Username != "" && !usernameSah(p.Username) {
		v.tambah("username",
			"Nama pengguna hanya boleh huruf kecil, angka, titik, dan garis bawah (3-50 karakter).")
	}
	if p.Role == "" {
		p.Role = "operator"
	}
	v.pilihan("role", "Peran", p.Role, []string{"admin", "operator"})

	if sandiWajib || p.Sandi != "" {
		if len([]rune(p.Sandi)) < 8 {
			v.tambah("sandi", "Kata sandi minimal 8 karakter.")
		}
	}
	return v
}

func (a *Aplikasi) tanganiSimpanPengguna(w http.ResponseWriter, r *http.Request) {
	var p permintaanPengguna
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(true); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(p.Sandi), bcrypt.DefaultCost)
	if err != nil {
		a.galatServer(w, "membuat hash kata sandi", err)
		return
	}

	var id int
	err = a.db.QueryRow(
		"INSERT INTO users (nama, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
		p.Nama, p.Username, string(hash), p.Role).Scan(&id)
	if err != nil {
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict, "Nama pengguna "+p.Username+" sudah dipakai.")
			return
		}
		a.galatServer(w, "menyimpan pengguna", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Pengguna berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahPengguna(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanPengguna
	if !bacaJSON(w, r, &p) {
		return
	}
	// Kata sandi opsional saat mengubah: kosong berarti tidak diganti.
	if v := p.periksa(false); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	saya := penggunaDari(r)
	// Admin tidak boleh menurunkan perannya sendiri, karena bisa membuat
	// tidak ada lagi yang dapat mengelola pengguna.
	if id == saya.ID && p.Role != "admin" {
		kirimGalat(w, http.StatusConflict,
			"Anda tidak dapat menurunkan peran akun Anda sendiri. Minta admin lain melakukannya.")
		return
	}
	if err := a.pastikanMasihAdaAdmin(id, p.Role); err != nil {
		kirimGalat(w, http.StatusConflict, err.Error())
		return
	}

	n := &penomoran{}
	sqlStr := fmt.Sprintf("UPDATE users SET nama = %s, username = %s, role = %s",
		n.berikut(), n.berikut(), n.berikut())
	arg := []any{p.Nama, p.Username, p.Role}
	if p.Sandi != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(p.Sandi), bcrypt.DefaultCost)
		if err != nil {
			a.galatServer(w, "membuat hash kata sandi", err)
			return
		}
		sqlStr += ", password = " + n.berikut()
		arg = append(arg, string(hash))
	}
	sqlStr += " WHERE id = " + n.berikut()
	arg = append(arg, id)

	hasil, err := a.db.Exec(sqlStr, arg...)
	if err != nil {
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict, "Nama pengguna "+p.Username+" sudah dipakai akun lain.")
			return
		}
		a.galatServer(w, "memperbarui pengguna", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		var ada int
		if a.db.QueryRow("SELECT id FROM users WHERE id = $1", id).Scan(&ada) == sql.ErrNoRows {
			kirimGalat(w, http.StatusNotFound, "Pengguna tidak ditemukan.")
			return
		}
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pengguna berhasil diperbarui."})
}

func (a *Aplikasi) tanganiHapusPengguna(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	if id == penggunaDari(r).ID {
		kirimGalat(w, http.StatusConflict, "Anda tidak dapat menghapus akun Anda sendiri.")
		return
	}
	if err := a.pastikanMasihAdaAdmin(id, ""); err != nil {
		kirimGalat(w, http.StatusConflict, err.Error())
		return
	}

	hasil, err := a.db.Exec("DELETE FROM users WHERE id = $1", id)
	if err != nil {
		a.galatServer(w, "menghapus pengguna", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Pengguna tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Pengguna berhasil dihapus."})
}

// pastikanMasihAdaAdmin mencegah aplikasi terkunci tanpa admin. peranBaru
// kosong berarti pengguna tersebut akan dihapus.
func (a *Aplikasi) pastikanMasihAdaAdmin(id int, peranBaru string) error {
	if peranBaru == "admin" {
		return nil
	}
	var peranSekarang string
	if err := a.db.QueryRow("SELECT role FROM users WHERE id = $1", id).Scan(&peranSekarang); err != nil {
		return nil // keberadaan data diperiksa oleh pemanggil
	}
	if peranSekarang != "admin" {
		return nil
	}
	var jumlahAdmin int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&jumlahAdmin); err != nil {
		return nil
	}
	if jumlahAdmin <= 1 {
		return errors.New("Ini satu-satunya akun admin. Tambahkan admin lain terlebih dahulu.")
	}
	return nil
}

/* ================= gambar pada pengaturan ================= */

// gambarPengaturan adalah pengaturan yang isinya nama berkas gambar, bukan
// teks biasa. Sebelumnya keempatnya harus diketik sendiri nama berkasnya,
// padahal tidak ada cara mengunggahnya lewat aplikasi; dua penangan di bawah
// menutup celah itu.
var gambarPengaturan = map[string]string{
	"logo":                "Logo sekolah",
	"foto_depan":          "Foto halaman depan",
	"foto_kepsek":         "Foto kepala sekolah",
	"struktur_organisasi": "Bagan struktur organisasi",
}

// tanganiUnggahGambarPengaturan menyimpan satu gambar ke folder profil dan
// mencatat nama berkasnya pada pengaturan yang diminta.
func (a *Aplikasi) tanganiUnggahGambarPengaturan(w http.ResponseWriter, r *http.Request) {
	if !a.bacaFormulir(w, r) {
		return
	}
	defer r.MultipartForm.RemoveAll()

	kunci := strings.TrimSpace(r.FormValue("kunci"))
	label, boleh := gambarPengaturan[kunci]
	if !boleh {
		kirimGalat(w, http.StatusBadRequest,
			"Pengaturan "+kunci+" bukan pengaturan gambar.")
		return
	}

	nama, err := a.ambilUnggahan(r.MultipartForm, "gambar", "profil", TipeGambar)
	if errors.Is(err, GalatTanpaBerkas) {
		kirimGalat(w, http.StatusBadRequest, "Pilih dulu berkas gambarnya.")
		return
	}
	if err != nil {
		v := validasiBaru()
		v.tambah("gambar", label+": "+err.Error()+".")
		kirimGalatValidasi(w, v)
		return
	}

	lama := a.atur(kunci)
	if _, err := a.db.Exec(
		"UPDATE pengaturan SET nilai = $1 WHERE nama_setting = $2", nama, kunci); err != nil {
		a.hapusUnggahan("profil", nama)
		a.galatServer(w, "menyimpan "+kunci, err)
		return
	}
	if err := a.muatPengaturan(); err != nil {
		a.galatServer(w, "menyegarkan pengaturan", err)
		return
	}
	// Berkas lama dibuang setelah penggantinya tercatat, supaya kegagalan
	// penyimpanan tidak meninggalkan pengaturan yang menunjuk berkas hilang.
	if lama != "" && lama != nama {
		a.hapusUnggahan("profil", lama)
	}

	kirimJSON(w, http.StatusOK, map[string]string{
		"pesan": label + " berhasil diunggah.",
		"nama":  nama,
	})
}

func (a *Aplikasi) tanganiHapusGambarPengaturan(w http.ResponseWriter, r *http.Request) {
	kunci := strings.TrimSpace(r.PathValue("kunci"))
	label, boleh := gambarPengaturan[kunci]
	if !boleh {
		kirimGalat(w, http.StatusBadRequest,
			"Pengaturan "+kunci+" bukan pengaturan gambar.")
		return
	}

	lama := a.atur(kunci)
	if lama == "" {
		kirimJSON(w, http.StatusOK, map[string]string{"pesan": label + " memang belum ada."})
		return
	}
	if _, err := a.db.Exec(
		"UPDATE pengaturan SET nilai = '' WHERE nama_setting = $1", kunci); err != nil {
		a.galatServer(w, "menghapus "+kunci, err)
		return
	}
	if err := a.muatPengaturan(); err != nil {
		a.galatServer(w, "menyegarkan pengaturan", err)
		return
	}
	a.hapusUnggahan("profil", lama)

	kirimJSON(w, http.StatusOK, map[string]string{"pesan": label + " berhasil dihapus."})
}

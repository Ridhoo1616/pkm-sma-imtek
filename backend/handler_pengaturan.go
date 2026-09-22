package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

/* ================= pesan masuk ================= */

func (a *Aplikasi) tanganiDaftarPesan(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	halaman := bilanganKueri(q.Get("halaman"), 1, 1, 10000)
	perHalaman := bilanganKueri(q.Get("per_halaman"), 20, 1, 100)

	syarat := []string{"1 = 1"}
	arg := []any{}
	switch q.Get("dibaca") {
	case "0":
		syarat = append(syarat, "dibaca = 0")
	case "1":
		syarat = append(syarat, "dibaca = 1")
	}
	if cari := strings.TrimSpace(q.Get("cari")); cari != "" {
		syarat = append(syarat, "(nama LIKE ? OR subjek LIKE ? OR isi LIKE ?)")
		pola := "%" + cari + "%"
		arg = append(arg, pola, pola, pola)
	}
	dimana := " WHERE " + strings.Join(syarat, " AND ")

	var total, belum int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM pesan"+dimana, arg...).Scan(&total); err != nil {
		a.galatServer(w, "menghitung pesan", err)
		return
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM pesan WHERE dibaca = 0").Scan(&belum); err != nil {
		a.galatServer(w, "menghitung pesan belum dibaca", err)
		return
	}

	argHal := append(append([]any{}, arg...), perHalaman, (halaman-1)*perHalaman)
	baris, err := a.db.Query(`SELECT id, nama, COALESCE(email, ''), COALESCE(no_hp, ''),
	                                 COALESCE(subjek, ''), isi, dibaca, created_at
	                            FROM pesan`+dimana+` ORDER BY created_at DESC LIMIT ? OFFSET ?`, argHal...)
	if err != nil {
		a.galatServer(w, "mengambil pesan", err)
		return
	}
	defer baris.Close()

	daftar := []Pesan{}
	for baris.Next() {
		var p Pesan
		if err := baris.Scan(&p.ID, &p.Nama, &p.Email, &p.NoHP, &p.Subjek, &p.Isi,
			&p.Dibaca, &p.Dibuat); err != nil {
			a.galatServer(w, "membaca pesan", err)
			return
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
	hasil, err := a.db.Exec("UPDATE pesan SET dibaca = ? WHERE id = ?", p.Dibaca, id)
	if err != nil {
		a.galatServer(w, "menandai pesan", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		var ada int
		if a.db.QueryRow("SELECT id FROM pesan WHERE id = ?", id).Scan(&ada) == sql.ErrNoRows {
			kirimGalat(w, http.StatusNotFound, "Pesan tidak ditemukan.")
			return
		}
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Tanda baca pesan diperbarui."})
}

func (a *Aplikasi) tanganiHapusPesan(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	hasil, err := a.db.Exec("DELETE FROM pesan WHERE id = ?", id)
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

	pernyataan, err := transaksi.Prepare("UPDATE pengaturan SET nilai = ? WHERE nama_setting = ?")
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

	hasil, err := a.db.Exec(
		"INSERT INTO users (nama, username, password, role) VALUES (?, ?, ?, ?)",
		p.Nama, p.Username, string(hash), p.Role)
	if err != nil {
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict, "Nama pengguna "+p.Username+" sudah dipakai.")
			return
		}
		a.galatServer(w, "menyimpan pengguna", err)
		return
	}

	id, _ := hasil.LastInsertId()
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

	sqlStr := "UPDATE users SET nama = ?, username = ?, role = ?"
	arg := []any{p.Nama, p.Username, p.Role}
	if p.Sandi != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(p.Sandi), bcrypt.DefaultCost)
		if err != nil {
			a.galatServer(w, "membuat hash kata sandi", err)
			return
		}
		sqlStr += ", password = ?"
		arg = append(arg, string(hash))
	}
	sqlStr += " WHERE id = ?"
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
		if a.db.QueryRow("SELECT id FROM users WHERE id = ?", id).Scan(&ada) == sql.ErrNoRows {
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

	hasil, err := a.db.Exec("DELETE FROM users WHERE id = ?", id)
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
	if err := a.db.QueryRow("SELECT role FROM users WHERE id = ?", id).Scan(&peranSekarang); err != nil {
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

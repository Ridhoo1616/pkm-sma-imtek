package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// Token masuk memakai format JWT HS256. Ditulis dengan pustaka standar saja
// supaya tidak menambah dependensi; cakupannya memang hanya satu keperluan.
type IsiToken struct {
	ID          int    `json:"sub"`
	Username    string `json:"username"`
	Nama        string `json:"nama"`
	Role        string `json:"role"`
	Kedaluwarsa int64  `json:"exp"`
}

var GalatTokenTidakSah = errors.New("token tidak sah")

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func buatToken(rahasia []byte, isi IsiToken) (string, error) {
	kepala := b64([]byte(`{"alg":"HS256","typ":"JWT"}`))
	badan, err := json.Marshal(isi)
	if err != nil {
		return "", err
	}
	pesan := kepala + "." + b64(badan)
	m := hmac.New(sha256.New, rahasia)
	m.Write([]byte(pesan))
	return pesan + "." + b64(m.Sum(nil)), nil
}

func periksaToken(rahasia []byte, token string) (IsiToken, error) {
	var isi IsiToken
	bagian := strings.Split(token, ".")
	if len(bagian) != 3 {
		return isi, GalatTokenTidakSah
	}
	pesan := bagian[0] + "." + bagian[1]
	m := hmac.New(sha256.New, rahasia)
	m.Write([]byte(pesan))

	// Yang dibandingkan adalah bentuk base64-nya, bukan hasil dekodenya.
	// Tanda tangan 32 bita menyisakan dua bit tak terpakai pada karakter
	// base64 terakhir, sehingga empat karakter berbeda mendekode ke bita
	// yang sama; membandingkan hasil dekode akan menerima token yang
	// karakter terakhirnya sudah diubah.
	if !hmac.Equal([]byte(b64(m.Sum(nil))), []byte(bagian[2])) {
		return isi, GalatTokenTidakSah
	}
	badan, err := base64.RawURLEncoding.DecodeString(bagian[1])
	if err != nil || json.Unmarshal(badan, &isi) != nil {
		return isi, GalatTokenTidakSah
	}
	if time.Now().Unix() > isi.Kedaluwarsa {
		return isi, errors.New("sesi sudah berakhir, silakan masuk kembali")
	}
	return isi, nil
}

// pembatasMasuk membatasi percobaan masuk yang gagal, meniru aturan versi PHP:
// maksimal lima kali dalam sepuluh menit per alamat IP.
type pembatasMasuk struct {
	percobaan map[string][]time.Time
}

func pembatasBaru() *pembatasMasuk {
	return &pembatasMasuk{percobaan: map[string][]time.Time{}}
}

func (p *pembatasMasuk) bolehMencoba(ip string) (boleh bool, sisa int) {
	batas := time.Now().Add(-10 * time.Minute)
	var tersisa []time.Time
	for _, t := range p.percobaan[ip] {
		if t.After(batas) {
			tersisa = append(tersisa, t)
		}
	}
	p.percobaan[ip] = tersisa
	return len(tersisa) < 5, 5 - len(tersisa)
}

func (p *pembatasMasuk) catatGagal(ip string) {
	p.percobaan[ip] = append(p.percobaan[ip], time.Now())
}

func (p *pembatasMasuk) bersihkan(ip string) { delete(p.percobaan, ip) }

/* ---------------- penangan ---------------- */

type permintaanMasuk struct {
	Username string `json:"username"`
	Sandi    string `json:"sandi"`
}

func (a *Aplikasi) tanganiMasuk(w http.ResponseWriter, r *http.Request) {
	var p permintaanMasuk
	if !bacaJSON(w, r, &p) {
		return
	}
	p.Username = strings.ToLower(strings.TrimSpace(p.Username))

	ip := alamatPemanggil(r)
	a.kunciPembatas.Lock()
	boleh, sisa := a.pembatas.bolehMencoba(ip)
	a.kunciPembatas.Unlock()
	if !boleh {
		kirimGalat(w, http.StatusTooManyRequests,
			"Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam 10 menit.")
		return
	}

	if p.Username == "" || p.Sandi == "" {
		kirimGalat(w, http.StatusBadRequest, "Nama pengguna dan kata sandi wajib diisi.")
		return
	}

	var (
		id     int
		nama   string
		sandiT string
		role   string
	)
	err := a.db.QueryRow(
		"SELECT id, nama, password, role FROM users WHERE username = ?", p.Username,
	).Scan(&id, &nama, &sandiT, &role)

	gagal := func() {
		a.kunciPembatas.Lock()
		a.pembatas.catatGagal(ip)
		a.kunciPembatas.Unlock()
		pesan := "Nama pengguna atau kata sandi salah."
		if sisa-1 <= 2 {
			pesan += fmt.Sprintf(" Sisa percobaan: %d.", sisa-1)
		}
		kirimGalat(w, http.StatusUnauthorized, pesan)
	}

	if err == sql.ErrNoRows {
		// Tetap jalankan perbandingan hash agar waktu responsnya seragam,
		// sehingga tidak bisa dipakai menebak nama pengguna yang ada.
		bcrypt.CompareHashAndPassword([]byte("$2y$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid"), []byte(p.Sandi))
		gagal()
		return
	}
	if err != nil {
		a.galatServer(w, "mencari pengguna", err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(sandiT), []byte(p.Sandi)) != nil {
		gagal()
		return
	}

	a.kunciPembatas.Lock()
	a.pembatas.bersihkan(ip)
	a.kunciPembatas.Unlock()

	if _, err := a.db.Exec("UPDATE users SET last_login = NOW() WHERE id = ?", id); err != nil {
		a.log.Printf("gagal mencatat waktu masuk: %v", err)
	}

	token, err := buatToken(a.cfg.RahasiaToken, IsiToken{
		ID: id, Username: p.Username, Nama: nama, Role: role,
		Kedaluwarsa: time.Now().Add(8 * time.Hour).Unix(),
	})
	if err != nil {
		a.galatServer(w, "membuat token", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"pengguna": map[string]any{
			"id": id, "nama": nama, "username": p.Username, "role": role,
		},
	})
}

func (a *Aplikasi) tanganiSayaSiapa(w http.ResponseWriter, r *http.Request) {
	isi := penggunaDari(r)
	kirimJSON(w, http.StatusOK, map[string]any{
		"id": isi.ID, "nama": isi.Nama, "username": isi.Username, "role": isi.Role,
	})
}

type permintaanGantiSandi struct {
	SandiLama string `json:"sandi_lama"`
	SandiBaru string `json:"sandi_baru"`
}

func (a *Aplikasi) tanganiGantiSandi(w http.ResponseWriter, r *http.Request) {
	var p permintaanGantiSandi
	if !bacaJSON(w, r, &p) {
		return
	}
	saya := penggunaDari(r)

	var hash string
	if err := a.db.QueryRow("SELECT password FROM users WHERE id = ?", saya.ID).Scan(&hash); err != nil {
		a.galatServer(w, "mengambil kata sandi", err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(p.SandiLama)) != nil {
		kirimGalat(w, http.StatusUnauthorized, "Kata sandi lama tidak sesuai.")
		return
	}
	if len([]rune(p.SandiBaru)) < 8 {
		kirimGalat(w, http.StatusUnprocessableEntity, "Kata sandi baru minimal 8 karakter.")
		return
	}
	baru, err := bcrypt.GenerateFromPassword([]byte(p.SandiBaru), bcrypt.DefaultCost)
	if err != nil {
		a.galatServer(w, "membuat hash kata sandi", err)
		return
	}
	if _, err := a.db.Exec("UPDATE users SET password = ? WHERE id = ?", string(baru), saya.ID); err != nil {
		a.galatServer(w, "menyimpan kata sandi", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Kata sandi berhasil diperbarui."})
}

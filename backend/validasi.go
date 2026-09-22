package main

import (
	"fmt"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Validasi mengumpulkan galat masukan. Pesan per kolom dipakai frontend untuk
// menempelkan keterangan di bawah input yang salah; Daftar berisi urutan pesan
// yang sama untuk ditampilkan sebagai ringkasan di atas formulir.
type Validasi struct {
	Kolom  map[string]string
	Daftar []string
}

func validasiBaru() *Validasi {
	return &Validasi{Kolom: map[string]string{}}
}

// tambah mencatat galat pada satu kolom. Galat pertama pada sebuah kolom yang
// dipertahankan, karena pesan pertama biasanya yang paling mendasar
// ("wajib diisi" lebih berguna daripada "format tidak valid" pada kolom kosong).
func (v *Validasi) tambah(kolom, pesan string) {
	if _, sudah := v.Kolom[kolom]; !sudah {
		v.Kolom[kolom] = pesan
		v.Daftar = append(v.Daftar, pesan)
	}
}

// tambahUmum untuk galat yang tidak melekat pada satu kolom tertentu.
func (v *Validasi) tambahUmum(pesan string) {
	v.Daftar = append(v.Daftar, pesan)
}

func (v *Validasi) bermasalah() bool { return len(v.Daftar) > 0 }

/* ---------------- pemeriksa satuan ---------------- */

var (
	polaAngka   = regexp.MustCompile(`^\d+$`)
	polaTelepon = regexp.MustCompile(`^[0-9+\-\s()]{9,25}$`)
)

// wajib memeriksa kolom teks yang tidak boleh kosong, sekaligus mengembalikan
// nilai yang sudah dirapikan spasinya.
func (v *Validasi) wajib(kolom, label, nilai string) string {
	nilai = strings.TrimSpace(nilai)
	if nilai == "" {
		v.tambah(kolom, label+" wajib diisi.")
	}
	return nilai
}

func (v *Validasi) panjangMaks(kolom, label, nilai string, maks int) {
	if len([]rune(nilai)) > maks {
		v.tambah(kolom, fmt.Sprintf("%s maksimal %d karakter.", label, maks))
	}
}

// pilihan memastikan nilai termasuk salah satu opsi yang sah. Kolom kosong
// dilewati supaya pemeriksaan "wajib" yang memberi pesannya, bukan yang ini.
func (v *Validasi) pilihan(kolom, label, nilai string, opsi []string) {
	if nilai == "" {
		return
	}
	if !adaDalam(opsi, nilai) {
		v.tambah(kolom, label+" tidak valid.")
	}
}

// digitTepat untuk kolom seperti NISN dan NIK: opsional, tetapi bila diisi
// panjangnya harus tepat.
func (v *Validasi) digitTepat(kolom, label, nilai string, jumlah int) {
	if nilai == "" {
		return
	}
	if !polaAngka.MatchString(nilai) || len(nilai) != jumlah {
		v.tambah(kolom, fmt.Sprintf("%s harus berupa %d angka.", label, jumlah))
	}
}

func (v *Validasi) telepon(kolom, label, nilai string, wajib bool) {
	if nilai == "" {
		if wajib {
			v.tambah(kolom, label+" wajib diisi.")
		}
		return
	}
	if !polaTelepon.MatchString(nilai) {
		v.tambah(kolom, label+" tidak valid (gunakan 9-15 angka).")
	}
}

func (v *Validasi) email(kolom, nilai string) {
	if nilai == "" {
		return
	}
	if _, err := mail.ParseAddress(nilai); err != nil || !strings.Contains(nilai, ".") {
		v.tambah(kolom, "Format email tidak valid.")
	}
}

// tanggal memeriksa format Y-m-d. Mengembalikan waktu hasil baca dan penanda
// apakah kolomnya terisi dan sah.
func (v *Validasi) tanggal(kolom, label, nilai string, wajib bool) (time.Time, bool) {
	if nilai == "" {
		if wajib {
			v.tambah(kolom, label+" wajib diisi.")
		}
		return time.Time{}, false
	}
	t, err := time.Parse("2006-01-02", nilai)
	if err != nil {
		v.tambah(kolom, "Format "+strings.ToLower(label)+" tidak valid.")
		return time.Time{}, false
	}
	return t, true
}

// usiaWajar meniru batas versi PHP: 11-25 tahun untuk calon peserta didik SMA.
func (v *Validasi) usiaWajar(kolom string, lahir time.Time) {
	umur := usiaTahun(lahir, time.Now())
	if umur < 11 || umur > 25 {
		v.tambah(kolom, fmt.Sprintf(
			"Tanggal lahir tidak wajar untuk calon peserta didik SMA (usia terhitung %d tahun).", umur))
	}
}

func usiaTahun(lahir, acuan time.Time) int {
	umur := acuan.Year() - lahir.Year()
	// Kurangi satu bila ulang tahun pada tahun ini belum terlewati.
	if acuan.Month() < lahir.Month() ||
		(acuan.Month() == lahir.Month() && acuan.Day() < lahir.Day()) {
		umur--
	}
	return umur
}

// desimalRentang untuk kolom numerik opsional seperti nilai rata-rata rapor.
// Mengembalikan pointer supaya kolom kosong bisa disimpan sebagai NULL.
func (v *Validasi) desimalRentang(kolom, label, nilai string, min, maks float64) *float64 {
	if nilai == "" {
		return nil
	}
	angka, err := strconv.ParseFloat(strings.Replace(nilai, ",", ".", 1), 64)
	if err != nil || angka < min || angka > maks {
		v.tambah(kolom, fmt.Sprintf("%s harus berupa angka %g sampai %g.", label, min, maks))
		return nil
	}
	return &angka
}

// bulatRentang untuk kolom bilangan bulat opsional (anak ke-, jumlah saudara,
// tahun lulus).
func (v *Validasi) bulatRentang(kolom, label, nilai string, min, maks int) *int {
	if nilai == "" {
		return nil
	}
	angka, err := strconv.Atoi(nilai)
	if err != nil || angka < min || angka > maks {
		v.tambah(kolom, fmt.Sprintf("%s harus berupa angka %d sampai %d.", label, min, maks))
		return nil
	}
	return &angka
}

/* ---------------- pembantu penyimpanan ---------------- */

// kosongJadiNil memetakan string kosong ke NULL basis data, seperti idiom
// `$d['x'] ?: null` pada versi PHP.
func kosongJadiNil(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}

package main

import (
	"sort"
	"strings"
	"testing"
)

/*
Uji aturan NIK dan NISN.

Aturannya murni perhitungan, tanpa basis data maupun jaringan, jadi dapat
diuji dengan `go test ./...` tanpa menyiapkan apa pun. Yang diperiksa bukan
hanya diterima atau ditolak, melainkan juga KOLOM yang disalahkan: seluruh
gunanya pemeriksaan ini adalah memberi tahu pendaftar bagian mana yang
keliru, sehingga galat yang menempel pada kolom yang salah sama buruknya
dengan tidak ada pemeriksaan.
*/

// NIK contoh disusun sendiri dari aturan penomorannya: 3603 = Kabupaten
// Tangerang, 08 = kecamatan, lalu tanggal lahir dan nomor urut.
//
// Nomor urutnya sengaja 9001 dan 9002, bukan 0001. Nomor urut diberikan
// berurutan mulai dari 0001 untuk setiap tanggal lahir di satu kecamatan,
// sehingga 0001 justru nomor yang paling mungkin benar-benar diterbitkan
// kepada seseorang. Berkas ini berada di repositori publik, jadi yang dipakai
// nomor di ujung rentang yang jauh lebih kecil kemungkinannya terpakai.
const (
	nikLaki      = "3603081505119001" // 15 Mei 2011, laki-laki
	nikPerempuan = "3603085505119002" // 15 Mei 2011, perempuan (15 + 40 = 55)
)

func TestBacaNikMembacaTanggalDanJenisKelamin(t *testing.T) {
	hasil, galat := bacaNik(nikLaki, 2026)
	if galat != "" {
		t.Fatalf("NIK yang sah ditolak: %s", galat)
	}
	if hasil.TanggalLahir != "2011-05-15" {
		t.Errorf("tanggal lahir terbaca %q, seharusnya 2011-05-15", hasil.TanggalLahir)
	}
	if hasil.Perempuan {
		t.Error("NIK laki-laki terbaca sebagai perempuan")
	}
	if hasil.Provinsi != "Banten" {
		t.Errorf("provinsi terbaca %q, seharusnya Banten", hasil.Provinsi)
	}

	hasil, galat = bacaNik(nikPerempuan, 2026)
	if galat != "" {
		t.Fatalf("NIK perempuan yang sah ditolak: %s", galat)
	}
	if !hasil.Perempuan {
		t.Error("tanggal lahir di atas 40 seharusnya terbaca sebagai perempuan")
	}
	if hasil.TanggalLahir != "2011-05-15" {
		t.Errorf("tanggal lahir perempuan terbaca %q, seharusnya 2011-05-15", hasil.TanggalLahir)
	}
}

func TestBacaNikMenolakStrukturYangTidakMungkin(t *testing.T) {
	kasus := []struct {
		nama, nik, penanda string
	}{
		{"terlalu pendek", "360308150511900", "16 angka"},
		{"ada hurufnya", "36030815051190A1", "hanya boleh berisi angka"},
		{"kode provinsi tidak ada", "9903081505119001", "kode provinsi"},
		{"kode kabupaten nol", "3600081505119001", "kabupaten"},
		{"kode kecamatan nol", "3603001505119001", "kecamatan"},
		{"bulan ke-13", "3603081513119001", "bulan lahir"},
		{"tanggal 32", "3603083205119001", "tanggal lahir"},
		{"31 Februari", "3603083102119001", "bukan tanggal yang ada"},
		{"nomor urut nol", "3603081505110000", "nomor urut"},
	}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			_, galat := bacaNik(k.nik, 2026)
			if galat == "" {
				t.Fatalf("NIK %s diterima, padahal seharusnya ditolak", k.nik)
			}
			if !berisi(galat, k.penanda) {
				t.Errorf("pesan galat tidak menyebut %q: %s", k.penanda, galat)
			}
		})
	}
}

func TestPeriksaNikMencocokkanDenganIsianLain(t *testing.T) {
	t.Run("cocok seluruhnya", func(t *testing.T) {
		v := validasiBaru()
		v.periksaNik(nikLaki, "2011-05-15", "L")
		if v.bermasalah() {
			t.Errorf("NIK yang cocok justru ditolak: %v", v.Daftar)
		}
	})

	t.Run("tanggal lahir beda tahun menyalahkan kolom tanggal lahir", func(t *testing.T) {
		v := validasiBaru()
		v.periksaNik(nikLaki, "2012-05-15", "L")
		kolom := kolomBermasalah(v)
		if kolom != "tanggal_lahir" {
			t.Fatalf("kolom yang disalahkan %q, seharusnya tanggal_lahir; NIK-nya benar dan hanya tahunnya berbeda", kolom)
		}
		if !berisi(pesanKolom(v, "tanggal_lahir"), "2011") {
			t.Errorf("pesannya tidak menyebutkan tahun dari NIK: %s", pesanKolom(v, "tanggal_lahir"))
		}
	})

	t.Run("tanggal lahir beda hari menyalahkan kolom NIK", func(t *testing.T) {
		v := validasiBaru()
		v.periksaNik(nikLaki, "2011-05-20", "L")
		if kolomBermasalah(v) != "nik" {
			t.Fatalf("kolom yang disalahkan %q, seharusnya nik", kolomBermasalah(v))
		}
		if !berisi(pesanKolom(v, "nik"), "15 Mei 2011") {
			t.Errorf("pesannya tidak menyebutkan tanggal dari NIK: %s", pesanKolom(v, "nik"))
		}
	})

	t.Run("jenis kelamin bertentangan", func(t *testing.T) {
		v := validasiBaru()
		v.periksaNik(nikPerempuan, "2011-05-15", "L")
		if !berisi(pesanKolom(v, "nik"), "perempuan") {
			t.Errorf("pesannya tidak menjelaskan pertentangan jenis kelamin: %s", pesanKolom(v, "nik"))
		}

		v = validasiBaru()
		v.periksaNik(nikLaki, "2011-05-15", "P")
		if !berisi(pesanKolom(v, "nik"), "laki-laki") {
			t.Errorf("pesannya tidak menjelaskan pertentangan jenis kelamin: %s", pesanKolom(v, "nik"))
		}
	})

	t.Run("kosong tidak diperiksa", func(t *testing.T) {
		v := validasiBaru()
		v.periksaNik("", "2011-05-15", "L")
		if v.bermasalah() {
			t.Error("NIK kosong seharusnya dilewati, karena kolomnya opsional")
		}
	})
}

func TestPeriksaNisn(t *testing.T) {
	kasus := []struct {
		nama, nisn, nik, penanda string
	}{
		{"sah", "0119876543", "", ""},
		{"sembilan angka", "011987654", "", "10 angka"},
		{"panjang NIK", nikLaki, "", "itu panjang NIK"},
		{"ada hurufnya", "01198765A3", "", "hanya boleh berisi angka"},
		{"nol semua", "0000000000", "", "nol semuanya"},
		{"sepuluh angka pertama NIK", nikLaki[:10], nikLaki, "sepuluh angka pertama NIK"},
	}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			v := validasiBaru()
			v.periksaNisn(k.nisn, k.nik)
			if k.penanda == "" {
				if v.bermasalah() {
					t.Fatalf("NISN yang sah ditolak: %v", v.Daftar)
				}
				return
			}
			if !v.bermasalah() {
				t.Fatalf("NISN %q diterima, padahal seharusnya ditolak", k.nisn)
			}
			if kolomBermasalah(v) != "nisn" {
				t.Errorf("kolom yang disalahkan %q, seharusnya nisn", kolomBermasalah(v))
			}
			if !berisi(pesanKolom(v, "nisn"), k.penanda) {
				t.Errorf("pesan galat tidak menyebut %q: %s", k.penanda, pesanKolom(v, "nisn"))
			}
		})
	}
}

func TestNisnSesuaiTahunLahir(t *testing.T) {
	kasus := []struct {
		nisn, lahir           string
		cocok, dapatDiperiksa bool
	}{
		{"0119876543", "2011-05-15", true, true},
		{"0129876543", "2011-05-15", false, true},
		{"9989876543", "1998-05-15", true, true},
		{"01198765", "2011-05-15", false, false}, // panjangnya salah
		{"0119876543", "", false, false},         // tanggal lahir belum diisi
		{"0119876543", "bukan tanggal", false, false},
	}
	for _, k := range kasus {
		cocok, dapat := nisnSesuaiTahunLahir(k.nisn, k.lahir)
		if cocok != k.cocok || dapat != k.dapatDiperiksa {
			t.Errorf("nisnSesuaiTahunLahir(%q, %q) = (%v, %v), seharusnya (%v, %v)",
				k.nisn, k.lahir, cocok, dapat, k.cocok, k.dapatDiperiksa)
		}
	}
}

/* ---------- pembantu uji ---------- */

func berisi(teks, bagian string) bool {
	return strings.Contains(teks, bagian)
}

// kolomBermasalah mengembalikan satu-satunya kolom yang bermasalah. Dipakai
// memastikan galatnya menempel pada kolom yang benar; bila yang bermasalah
// lebih dari satu, namanya digabung supaya pesan kegagalan ujinya jelas.
func kolomBermasalah(v *Validasi) string {
	nama := make([]string, 0, len(v.Kolom))
	for k := range v.Kolom {
		nama = append(nama, k)
	}
	sort.Strings(nama)
	return strings.Join(nama, "+")
}

func pesanKolom(v *Validasi, kolom string) string {
	return v.Kolom[kolom]
}

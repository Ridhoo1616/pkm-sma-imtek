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
	// Tahun lahir acuan 2011, jadi awalan NISN yang sah adalah 011.
	const lahir2011 = "2011-05-15"

	kasus := []struct {
		nama, nisn, nik, lahir, penanda string
	}{
		// Dua contoh "sah" di bawah ini semula 0119876543 dan 9876543210.
		// Keduanya ternyata berpola berurutan turun, jadi sejak pemeriksaan
		// pola karangan ada, keduanya memang HARUS ditolak — contohnya yang
		// keliru dipilih, bukan pemeriksaannya. Diganti nomor yang acak.
		{"sah", "0119384756", "", lahir2011, ""},
		{"tanpa tanggal lahir, awalan tidak diperiksa", "5839274615", "", "", ""},
		{"kosong padahal wajib", "", "", lahir2011, "wajib diisi"},
		{"sembilan angka", "011987654", "", lahir2011, "10 angka"},
		{"panjang NIK", nikLaki, "", lahir2011, "itu panjang NIK"},
		{"ada hurufnya", "01198765A3", "", lahir2011, "hanya boleh berisi angka"},
		{"nol semua", "0000000000", "", lahir2011, "nol semuanya"},
		{"sepuluh angka pertama NIK", nikLaki[:10], nikLaki, lahir2011, "sepuluh angka pertama NIK"},
		// Inilah yang dulu lolos: sepuluh angka, bukan nol semuanya, tetapi
		// awalannya mustahil bagi tahun lahir mana pun yang wajar.
		{"nol berderet lalu angka", "0000000098", "", lahir2011, "tiga angka terakhir tahun lahir"},
		{"awalan tidak cocok tahun lahir", "9876543210", "", lahir2011, "tiga angka terakhir tahun lahir"},
		{"awalan cocok tahun lahir lain", "0129876543", "", lahir2011, "011"},
	}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			v := validasiBaru()
			v.periksaNisn(k.nisn, k.nik, k.lahir)
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

// TestPeriksaNisnMenolakPolaKarangan menjaga celah yang ditemukan setelah
// NISN diwajibkan: nomor yang tiga angka pertamanya sengaja dibuat cocok
// dengan tahun lahir, tetapi tujuh angka sisanya asal-asalan. Sebelum
// pemeriksaan pola ada, seluruh nomor pada daftar "tolak" di bawah ini
// diterima apa adanya.
func TestPeriksaNisnMenolakPolaKarangan(t *testing.T) {
	const lahir = "2011-05-14" // awalan NISN yang sah: 011

	tolak := []string{
		"0111111111", // tujuh angka sesudah awalan seluruhnya sama
		"0110000000", // idem, nol semua
		"0119999999",
		"0111234567", // berurutan naik
		"0119876543", // berurutan turun
		"1111111111", // kesepuluh angkanya sama
		"0123456789", // kesepuluhnya berurutan naik
	}
	for _, n := range tolak {
		v := validasiBaru()
		v.periksaNisn(n, "", lahir)
		if !v.bermasalah() {
			t.Errorf("NISN %s seharusnya ditolak, tetapi diterima", n)
		}
	}

	// Tanpa tanggal lahir, pemeriksaan tahun lahir tidak dapat berjalan.
	// Pemeriksaan pola HARUS tetap menjaring, supaya tidak ada celah di situ.
	for _, n := range []string{"1111111111", "0111111111", "0123456789"} {
		v := validasiBaru()
		v.periksaNisn(n, "", "")
		if !v.bermasalah() {
			t.Errorf("NISN %s tanpa tanggal lahir seharusnya tetap ditolak", n)
		}
	}

	// Nomor yang sah tidak boleh ikut tertolak.
	terima := []string{
		"0112345680", // acak, awalan tahunnya benar
		"0119384756",
		"0110293847",
		"0117654320",
	}
	for _, n := range terima {
		v := validasiBaru()
		v.periksaNisn(n, "", lahir)
		if v.bermasalah() {
			t.Errorf("NISN %s seharusnya diterima, tetapi ditolak: %s", n, v.Daftar[0])
		}
	}
}

func TestAngkaKarangan(t *testing.T) {
	kasus := []struct {
		angka  string
		karang bool
	}{
		{"1111111", true},
		{"0000000", true},
		{"1234567", true},
		{"7654321", true},
		{"0123456789", true},
		{"9876543210", true},
		{"1234", true},
		{"123", false}, // terlalu pendek untuk dinilai
		{"1122334", false},
		{"0112345680", false},
		{"1029384756", false},
		{"1234568", false}, // nyaris berurutan, tetapi tidak
	}
	for _, k := range kasus {
		if dapat := angkaKarangan(k.angka); dapat != k.karang {
			t.Errorf("angkaKarangan(%q) = %v, diharapkan %v", k.angka, dapat, k.karang)
		}
	}
}

// TestTeksWajar menjaga agar penolakan isian asal-asalan tidak ikut menolak
// nama dan alamat yang sungguhan. Salah tolak pada kolom nama jauh lebih
// merugikan daripada satu kiriman sampah yang lolos, jadi daftar "terima" di
// bawah ini sengaja memuat bentuk-bentuk yang mudah tertolak keliru.
func TestTeksWajar(t *testing.T) {
	terima := []struct {
		nilai      string
		bolehAngka bool
	}{
		{"Nurhayati", false},
		{"Abdullah Syafi'i", false}, // huruf ganda, bukan tiga
		{"Raditia Vindua", false},
		{"Siti Aisyah binti Umar", false},
		{"R.A. Kartini", false},
		{"Ng Wei Ming", false},
		{"Jl. Raya Pagedangan No. 12, RT 003/RW 002", true},
		{"SMP Negeri 1 Pagedangan", true},
	}
	for _, k := range terima {
		v := validasiBaru()
		v.teksWajar("uji", "Kolom", k.nilai, k.bolehAngka)
		if v.bermasalah() {
			t.Errorf("%q seharusnya diterima, tetapi ditolak: %s", k.nilai, v.Daftar[0])
		}
	}

	tolak := []struct {
		nilai      string
		bolehAngka bool
	}{
		{"aaaa", false}, // tiga huruf sama berturut-turut
		{"AAA", false},
		{"ab", false},     // kurang dari tiga huruf
		{"123456", false}, // berangka pada kolom nama
		{"Budi 2", false},
		{".....", false},  // tanpa huruf sama sekali
		{"12345", true},   // berangka boleh, tetapi hurufnya kurang
		{"zxcvbn", false}, // tanpa huruf hidup
		{"aaaa", true},
	}
	for _, k := range tolak {
		v := validasiBaru()
		v.teksWajar("uji", "Kolom", k.nilai, k.bolehAngka)
		if !v.bermasalah() {
			t.Errorf("%q seharusnya ditolak, tetapi diterima", k.nilai)
		}
	}

	// Kolom kosong dilewati: kewajibannya diurus v.wajib, dan dua galat untuk
	// satu kolom hanya membingungkan.
	v := validasiBaru()
	v.teksWajar("uji", "Kolom", "", false)
	if v.bermasalah() {
		t.Error("isian kosong seharusnya dilewati, bukan ditolak di sini")
	}
}

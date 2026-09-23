package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

/*
Pemeriksaan NIK dan NISN.

Yang perlu diluruskan lebih dulu: sistem ini TIDAK dapat mencocokkan NIK
maupun NISN ke basis data pemerintah, dan tidak pernah mengaku begitu.

  - NIK hanya dapat diperiksa ke Dukcapil, dan aksesnya diberikan lewat
    perjanjian kerja sama resmi, bukan lewat alamat API terbuka.
  - NISN dapat dicari satu per satu di https://nisn.data.kemdikbud.go.id,
    tetapi laman itu tidak menyediakan API yang boleh dipakai program lain.
  - PDDIKTI bukan sumber yang tepat: isinya data pendidikan TINGGI. Untuk
    jenjang SMA, sumbernya Dapodik beserta referensi NISN-nya.

Karena itu yang dikerjakan di sini adalah pemeriksaan STRUKTUR beserta
pencocokan silang dengan isian lain pada formulir yang sama. Hasilnya bukan
"NIK ini benar milik orang tersebut", melainkan "NIK ini tidak mungkin benar,
dan inilah bagian yang salahnya". Itu sudah cukup menangkap kesalahan yang
paling sering terjadi: satu angka tertukar, digit kurang, atau nomor NISN
diketik pada kolom NIK.

Bentuk NIK menurut Permendagri tentang nomor induk kependudukan, 16 angka:

	1-2    kode provinsi
	3-4    kode kabupaten atau kota
	5-6    kode kecamatan
	7-8    tanggal lahir, DITAMBAH 40 bila perempuan
	9-10   bulan lahir
	11-12  dua angka terakhir tahun lahir
	13-16  nomor urut, 0001 sampai 9999

Bagian tanggal dan penanda perempuan itulah yang membuat pencocokan silang
mungkin: tanggal lahir dan jenis kelamin sudah diisi pendaftar di kolom lain,
jadi ketidakcocokannya dapat ditunjukkan dengan tepat.
*/

// kodeProvinsi adalah dua angka pertama NIK. Daftarnya mengikuti kode wilayah
// Kemendagri, termasuk enam provinsi baru di Papua. Kode di luar daftar ini
// pasti salah ketik, karena nomornya tidak pernah diterbitkan.
var kodeProvinsi = map[string]string{
	"11": "Aceh",
	"12": "Sumatera Utara",
	"13": "Sumatera Barat",
	"14": "Riau",
	"15": "Jambi",
	"16": "Sumatera Selatan",
	"17": "Bengkulu",
	"18": "Lampung",
	"19": "Kepulauan Bangka Belitung",
	"21": "Kepulauan Riau",
	"31": "DKI Jakarta",
	"32": "Jawa Barat",
	"33": "Jawa Tengah",
	"34": "DI Yogyakarta",
	"35": "Jawa Timur",
	"36": "Banten",
	"51": "Bali",
	"52": "Nusa Tenggara Barat",
	"53": "Nusa Tenggara Timur",
	"61": "Kalimantan Barat",
	"62": "Kalimantan Tengah",
	"63": "Kalimantan Selatan",
	"64": "Kalimantan Timur",
	"65": "Kalimantan Utara",
	"71": "Sulawesi Utara",
	"72": "Sulawesi Tengah",
	"73": "Sulawesi Selatan",
	"74": "Sulawesi Tenggara",
	"75": "Gorontalo",
	"76": "Sulawesi Barat",
	"81": "Maluku",
	"82": "Maluku Utara",
	"91": "Papua",
	"92": "Papua Barat",
	"93": "Papua Selatan",
	"94": "Papua Tengah",
	"95": "Papua Pegunungan",
	"96": "Papua Barat Daya",
}

// HasilNik adalah bagian NIK yang berhasil dibaca. Dipakai pencocokan silang
// dan ditampilkan kembali kepada pendaftar sebagai keterangan, supaya ia dapat
// melihat sendiri bahwa yang dibaca sistem memang bukan datanya.
type HasilNik struct {
	Provinsi     string
	TanggalLahir string // YYYY-MM-DD, tahunnya sudah ditebak
	Perempuan    bool
}

// bacaNik membaca struktur NIK. Galat yang dikembalikan sudah berupa kalimat
// yang siap ditampilkan kepada pendaftar, dan selalu menyebut bagian mana yang
// bermasalah, bukan hanya "NIK tidak valid".
//
// tahunAcuan dipakai menebak abad kelahiran: NIK hanya menyimpan dua angka
// terakhir tahun lahir, sehingga "05" dapat berarti 1905, 2005, atau 2105.
// Yang dipilih adalah tahun yang menghasilkan usia paling wajar bagi calon
// peserta didik.
func bacaNik(nik string, tahunAcuan int) (*HasilNik, string) {
	if len(nik) != 16 {
		return nil, fmt.Sprintf(
			"NIK harus 16 angka, yang Anda tulis %d angka. Nomor ini ada di kartu keluarga dan KTP.",
			len(nik))
	}
	if !polaAngka.MatchString(nik) {
		return nil, "NIK hanya boleh berisi angka, tanpa spasi maupun tanda hubung."
	}

	provinsi, dikenal := kodeProvinsi[nik[0:2]]
	if !dikenal {
		return nil, fmt.Sprintf(
			"Dua angka pertama NIK adalah kode provinsi, dan %s bukan kode provinsi yang ada. Periksa kembali angka pertama NIK Anda.",
			nik[0:2])
	}

	// Kode kabupaten dan kecamatan tidak diperiksa ke daftar wilayah, karena
	// daftarnya berubah setiap ada pemekaran dan menyimpannya di sini berarti
	// menolak NIK yang sah begitu daftarnya basi. Yang diperiksa hanya bahwa
	// keduanya bukan nol, karena kode 00 tidak pernah diterbitkan.
	if nik[2:4] == "00" {
		return nil, "Angka ke-3 dan ke-4 NIK adalah kode kabupaten atau kota, dan tidak boleh 00."
	}
	if nik[4:6] == "00" {
		return nil, "Angka ke-5 dan ke-6 NIK adalah kode kecamatan, dan tidak boleh 00."
	}

	hari, _ := strconv.Atoi(nik[6:8])
	bulan, _ := strconv.Atoi(nik[8:10])
	tahun2, _ := strconv.Atoi(nik[10:12])

	perempuan := hari > 40
	if perempuan {
		hari -= 40
	}
	if hari < 1 || hari > 31 {
		return nil, fmt.Sprintf(
			"Angka ke-7 dan ke-8 NIK adalah tanggal lahir (ditambah 40 untuk perempuan), dan %s tidak menghasilkan tanggal yang mungkin.",
			nik[6:8])
	}
	if bulan < 1 || bulan > 12 {
		return nil, fmt.Sprintf(
			"Angka ke-9 dan ke-10 NIK adalah bulan lahir, dan %s bukan bulan yang ada.",
			nik[8:10])
	}

	// Abad ditebak: calon peserta didik SMA lahir jauh lebih mungkin pada
	// abad ini daripada seratus tahun lalu.
	tahun := (tahunAcuan/100)*100 + tahun2
	if tahun > tahunAcuan-5 {
		tahun -= 100
	}

	lahir := time.Date(tahun, time.Month(bulan), hari, 0, 0, 0, 0, time.UTC)
	// time.Date membetulkan tanggal yang tidak ada, misalnya 31 Februari
	// menjadi 3 Maret. Pembetulan itu justru menandakan NIK-nya salah.
	if lahir.Day() != hari || int(lahir.Month()) != bulan {
		return nil, fmt.Sprintf(
			"Tanggal lahir yang terbaca dari NIK, %d-%02d, bukan tanggal yang ada.", hari, bulan)
	}

	if nik[12:16] == "0000" {
		return nil, "Empat angka terakhir NIK adalah nomor urut, dan tidak pernah 0000."
	}

	return &HasilNik{
		Provinsi:     provinsi,
		TanggalLahir: lahir.Format("2006-01-02"),
		Perempuan:    perempuan,
	}, ""
}

// periksaNik memeriksa NIK beserta kecocokannya dengan tanggal lahir dan jenis
// kelamin yang sudah diisi pendaftar. Kolom yang disalahkan sengaja dipilih
// sesuai bagian yang bertentangan, supaya pendaftar tahu mana yang harus
// dibetulkan, bukan menerima galat pada kolom yang sebenarnya sudah benar.
func (v *Validasi) periksaNik(nik, tanggalLahir, jenisKelamin string) {
	if nik == "" {
		return
	}
	hasil, galat := bacaNik(nik, time.Now().Year())
	if galat != "" {
		v.tambah("nik", galat)
		return
	}

	if tanggalLahir != "" && hasil.TanggalLahir != tanggalLahir {
		diisi, err := time.Parse("2006-01-02", tanggalLahir)
		dariNik, _ := time.Parse("2006-01-02", hasil.TanggalLahir)
		// Bila tanggal dan bulannya sama tetapi tahunnya berbeda, yang salah
		// hampir selalu tahun pada kolom tanggal lahir, bukan NIK-nya.
		if err == nil && diisi.Day() == dariNik.Day() && diisi.Month() == dariNik.Month() {
			v.tambah("tanggal_lahir", fmt.Sprintf(
				"Tanggal dan bulannya cocok dengan NIK, tetapi tahunnya berbeda: NIK Anda menunjukkan tahun %d. Periksa tahun pada tanggal lahir.",
				dariNik.Year()))
		} else {
			v.tambah("nik", fmt.Sprintf(
				"NIK ini memuat tanggal lahir %s, sedangkan tanggal lahir yang Anda isi %s. Salah satu di antaranya keliru.",
				tanggalIndonesia(hasil.TanggalLahir), tanggalIndonesia(tanggalLahir)))
		}
		return
	}

	if jenisKelamin == "L" && hasil.Perempuan {
		v.tambah("nik", "NIK ini menunjukkan jenis kelamin perempuan, sedangkan yang Anda pilih laki-laki. Pada NIK perempuan, tanggal lahirnya ditambah 40.")
	}
	if jenisKelamin == "P" && !hasil.Perempuan {
		v.tambah("nik", "NIK ini menunjukkan jenis kelamin laki-laki, sedangkan yang Anda pilih perempuan. Pada NIK perempuan, tanggal lahirnya ditambah 40.")
	}
}

// periksaNisn memeriksa NISN beserta kecocokannya dengan tanggal lahir pada
// formulir yang sama.
//
// NISN WAJIB diisi, dan tiga angka pertamanya HARUS sama dengan tiga angka
// terakhir tahun lahir. Aturan kedua itu semula hanya peringatan, dengan alasan
// yang masih benar: penomorannya kebiasaan, bukan aturan yang mengikat, dan ada
// NISN sah yang tidak mengikutinya. Tetapi sebagai peringatan ia membiarkan
// nomor karangan lewat — 0000000098 dan sejenisnya diterima apa adanya —
// padahal nomor yang dikarang jauh lebih sering daripada NISN sah yang
// menyimpang dari kebiasaan penomorannya.
//
// Konsekuensinya diterima dengan sadar: pendaftar yang NISN aslinya memang
// tidak mengikuti kebiasaan itu tidak dapat mengirim formulir sendiri, dan
// pesan galatnya karena itu WAJIB menyebutkan bahwa ia dapat menghubungi
// panitia. Tanpa kalimat itu, pendaftar yang datanya benar akan mengira
// dirinya yang salah.
//
// Yang TIDAK dapat dikerjakan di sini: memastikan NISN-nya benar-benar ada dan
// benar-benar milik pendaftar. Laman NISN Kemendikbud tidak menyediakan API,
// dan Dapodik hanya terbuka bagi sekolah lewat akunnya sendiri. Kepastian itu
// tetap harus datang dari panitia yang mencocokkan nomor pada rapor atau
// ijazah SMP yang diunggah pendaftar.
func (v *Validasi) periksaNisn(nisn, nik, tanggalLahir string) {
	if nisn == "" {
		v.tambah("nisn", "NISN wajib diisi. Nomor 10 angka ini tercantum pada rapor atau ijazah SMP; bila tidak ditemukan, tanyakan ke sekolah asal atau ke panitia.")
		return
	}
	if !polaAngka.MatchString(nisn) {
		v.tambah("nisn", "NISN hanya boleh berisi angka, tanpa spasi maupun tanda hubung.")
		return
	}
	if len(nisn) == 16 {
		// Kekeliruan yang sering terjadi: NIK diketik pada kolom NISN.
		v.tambah("nisn", "Yang Anda tulis 16 angka, itu panjang NIK. NISN terdiri atas 10 angka dan tercantum pada rapor atau ijazah SMP.")
		return
	}
	if len(nisn) != 10 {
		v.tambah("nisn", fmt.Sprintf(
			"NISN harus 10 angka, yang Anda tulis %d angka. Nomor ini tercantum pada rapor atau ijazah SMP.",
			len(nisn)))
		return
	}
	if nisn == strings.Repeat("0", 10) {
		v.tambah("nisn", "NISN tidak boleh berisi angka nol semuanya.")
		return
	}
	if nik != "" && nisn == nik[:10] {
		v.tambah("nisn", "NISN yang Anda tulis adalah sepuluh angka pertama NIK. Keduanya nomor yang berbeda: NISN ada di rapor atau ijazah SMP.")
		return
	}
	if cocok, dapat := nisnSesuaiTahunLahir(nisn, tanggalLahir); dapat && !cocok {
		tahun := "tahun lahir yang Anda isi"
		if lahir, err := time.Parse("2006-01-02", tanggalLahir); err == nil {
			tahun = fmt.Sprintf("tahun lahir %d", lahir.Year())
			v.tambah("nisn", fmt.Sprintf(
				"Tiga angka pertama NISN harus sama dengan tiga angka terakhir tahun lahir, yaitu %03d untuk %s. Yang Anda tulis %s. Periksa kembali NISN dan tanggal lahirnya; bila keduanya sudah sesuai rapor, hubungi panitia lewat halaman Kontak agar dicatat manual.",
				lahir.Year()%1000, tahun, nisn[0:3]))
			return
		}
		v.tambah("nisn", "Tiga angka pertama NISN harus sama dengan tiga angka terakhir tahun lahir. Periksa kembali NISN dan tanggal lahirnya.")
	}
}

// nisnSesuaiTahunLahir melaporkan apakah tiga angka pertama NISN cocok dengan
// tiga angka terakhir tahun lahir. Sejak NISN diwajibkan, ketidakcocokannya
// MENOLAK kiriman; panitia tetap melihatnya sebagai penanda saat memverifikasi
// berkas yang diunggah.
func nisnSesuaiTahunLahir(nisn, tanggalLahir string) (cocok bool, dapatDiperiksa bool) {
	if len(nisn) != 10 || len(tanggalLahir) < 4 {
		return false, false
	}
	lahir, err := time.Parse("2006-01-02", tanggalLahir)
	if err != nil {
		return false, false
	}
	return nisn[0:3] == fmt.Sprintf("%03d", lahir.Year()%1000), true
}

package main

import "testing"

// TestSusunPesanMempertahankanBarisBaru menjaga cacat yang ditemukan saat
// memeriksa email yang benar-benar diterima server SMTP: susunPesan semula
// meratakan seluruh spasi putih dengan strings.Fields, dan itu ikut melumat
// baris barunya. Naskah daftar ulang yang memuat jadwal, tempat, dan daftar
// berkas berbaris-baris tiba sebagai satu paragraf rapat.
func TestSusunPesanMempertahankanBarisBaru(t *testing.T) {
	naskah := "Kepada {nama}.\n\nJadwal: {jadwal}\nTempat: {tempat}\n\nBerkas:\n{syarat}\n\nTerima kasih."
	nilai := map[string]string{
		"nama":   "Rahmawati",
		"jadwal": "1-10 Juli 2027",
		"tempat": "Ruang Tata Usaha",
		"syarat": "1. Ijazah\n2. Kartu Keluarga",
	}
	hasil := susunPesan(naskah, nilai)

	mau := "Kepada Rahmawati.\n\nJadwal: 1-10 Juli 2027\nTempat: Ruang Tata Usaha\n\n" +
		"Berkas:\n1. Ijazah\n2. Kartu Keluarga\n\nTerima kasih."
	if hasil != mau {
		t.Errorf("hasil tidak sesuai.\ndapat:\n%q\nmau:\n%q", hasil, mau)
	}
}

func TestSusunPesanMerapikanSpasiDanBarisKosong(t *testing.T) {
	kasus := []struct{ nama, naskah, mau string }{
		{
			"spasi ganda dalam satu baris dirapikan",
			"Halo   {nama}    apa kabar",
			"Halo Budi apa kabar",
		},
		{
			"penanda kosong tidak meninggalkan spasi ganda",
			"Halo {nama}. {catatan} Terima kasih.",
			"Halo Budi. Terima kasih.",
		},
		{
			"penanda kosong yang berdiri sendiri tidak meninggalkan dua baris kosong",
			"Baris satu\n\n{catatan}\n\nBaris dua",
			"Baris satu\n\nBaris dua",
		},
		{
			"penanda yang tidak dikenal dibiarkan apa adanya",
			"Halo {nama}, lihat {tidak_ada}.",
			"Halo Budi, lihat {tidak_ada}.",
		},
		{
			"baris baru tunggal tetap tunggal",
			"Baris satu\nBaris dua",
			"Baris satu\nBaris dua",
		},
	}
	nilai := map[string]string{"nama": "Budi", "catatan": ""}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			if dapat := susunPesan(k.naskah, nilai); dapat != k.mau {
				t.Errorf("dapat %q, mau %q", dapat, k.mau)
			}
		})
	}
}

// TestHalamanKunjungan menjaga penormalan alamat pada pencatat kunjungan.
func TestHalamanKunjungan(t *testing.T) {
	kasus := []struct{ masuk, mau string }{
		{"/", "/"},
		{"/profil", "/profil"},
		{"/profil/visi-misi", "/profil/visi-misi"},
		{"/PROFIL", "/profil"},
		{"/profil/", "/profil"},
		{"/berita/pendaftaran-ppdb-resmi-dibuka", "/berita"},
		{"/halaman/osis", "/halaman"},
		{"/ppdb/daftar?utm=abc", "/ppdb/daftar"},
		{"/akademik/kalender#bagian", "/akademik/kalender"},
		{"../../etc/passwd", ""},
		{"/profil/visi misi", ""},
		{"", ""},
	}
	for _, k := range kasus {
		if dapat := halamanKunjungan(k.masuk); dapat != k.mau {
			t.Errorf("halamanKunjungan(%q) = %q, mau %q", k.masuk, dapat, k.mau)
		}
	}
}

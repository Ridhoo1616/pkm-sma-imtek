package main

import "testing"

// Nama sekolah yang sama sering ditulis berbeda-beda. Kalau dibandingkan apa
// adanya, pendaftar yang menulis singkatan yang lazim akan ditolak padahal
// sekolahnya ada.
func TestNamaSekolahBakuMenyamakanTulisanYangLazim(t *testing.T) {
	sama := [][]string{
		{
			"SMP Negeri 1 Legok",
			"SMPN 1 Legok",
			"smpn1legok",
			"SMP NEGERI 1 LEGOK",
			"  SMP   Negeri   1   Legok  ",
			"Sekolah Menengah Pertama Negeri 1 Legok",
		},
		{
			"MTs Negeri 2 Tangerang",
			"MTsN 2 Tangerang",
			"Madrasah Tsanawiyah Negeri 2 Tangerang",
		},
		{
			"SMP Islam Al-Hikmah",
			"SMP Islam Al Hikmah",
			"smp islam alhikmah",
		},
	}
	for _, kelompok := range sama {
		acuan := namaSekolahBaku(kelompok[0])
		for _, n := range kelompok[1:] {
			if got := namaSekolahBaku(n); got != acuan {
				t.Errorf("%q -> %q, seharusnya sama dengan %q -> %q",
					n, got, kelompok[0], acuan)
			}
		}
	}
}

// Yang berbeda harus tetap berbeda; kalau tidak, pencocokannya menerima
// sekolah yang salah.
func TestNamaSekolahBakuTidakMenyamakanYangBerbeda(t *testing.T) {
	beda := [][2]string{
		{"SMP Negeri 1 Legok", "SMP Negeri 2 Legok"},
		{"SMP Negeri 1 Legok", "SMP Negeri 1 Cisauk"},
		{"MTs Negeri 2 Tangerang", "SMP Negeri 2 Tangerang"},
		{"SMP Islam Al-Hikmah", "SMP Islam Al-Hidayah"},
	}
	for _, p := range beda {
		if namaSekolahBaku(p[0]) == namaSekolahBaku(p[1]) {
			t.Errorf("%q dan %q tidak boleh dianggap sama", p[0], p[1])
		}
	}
}

func TestPemisahCsvDitebakDariBarisPertama(t *testing.T) {
	kasus := map[string]rune{
		"npsn;nama;kecamatan":   ';',
		"npsn\tnama\tkecamatan": '\t',
		"npsn,nama,kecamatan":   ',',
		// Nama sekolah kadang memuat koma, sedangkan pemisahnya titik koma.
		"20614321;SMP Negeri 1 Legok, Tangerang;Legok": ';',
		"tanpa pemisah": ',',
	}
	for baris, mau := range kasus {
		if got := pemisahCsv(baris); got != mau {
			t.Errorf("pemisah untuk %q -> %q, seharusnya %q", baris, got, mau)
		}
	}
}

func TestAdaHuruf(t *testing.T) {
	if adaHuruf("12345678") {
		t.Error("angka saja seharusnya tidak dianggap memuat huruf")
	}
	if adaHuruf(" -- ") {
		t.Error("tanda baca saja seharusnya tidak dianggap memuat huruf")
	}
	if !adaHuruf("SMP 1") {
		t.Error("seharusnya memuat huruf")
	}
}

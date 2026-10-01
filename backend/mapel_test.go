package main

import "testing"

func TestMapelBaku(t *testing.T) {
	kasus := map[string]string{
		"Matematika":      "Matematika",
		"MATEMATIKA":      "Matematika",
		" mtk ":           "Matematika",
		"B. Indonesia":    "Bahasa Indonesia",
		"bahasa  inggris": "Bahasa Inggris",
		"ipa":             "IPA",
		"TPA":             "Tes Potensi Akademik",
		"Seni Budaya":     "",
		"":                "",
	}
	for masuk, harap := range kasus {
		if dapat := mapelBaku(masuk); dapat != harap {
			t.Errorf("mapelBaku(%q) = %q, seharusnya %q", masuk, dapat, harap)
		}
	}
}

func TestPeriksaKomposisi(t *testing.T) {
	v := validasiBaru()
	bersih, total := periksaKomposisi(v, []KomposisiMapel{
		{"mtk", 15}, {"Bahasa Indonesia", 10}, {"IPS", 0},
	})
	if v.bermasalah() || total != 25 || len(bersih) != 2 || bersih[0].MataPelajaran != "Matematika" {
		t.Fatalf("komposisi sah ditolak: %v %d %v", bersih, total, v.Daftar)
	}

	v = validasiBaru()
	periksaKomposisi(v, []KomposisiMapel{{"Matematika", 5}, {"MTK", 5}})
	if !v.bermasalah() {
		t.Error("mata pelajaran ganda seharusnya ditolak")
	}

	kurang := kekuranganStok([]KomposisiMapel{{"Matematika", 15}, {"IPA", 10}},
		map[string]int{"Matematika": 20, "IPA": 4})
	if len(kurang) != 1 {
		t.Errorf("seharusnya hanya IPA yang kurang, dapat %v", kurang)
	}
}

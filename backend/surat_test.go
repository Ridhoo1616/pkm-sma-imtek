package main

import (
	"strings"
	"testing"
	"time"
)

func TestSusunNomor(t *testing.T) {
	tgl := time.Date(2026, 9, 29, 0, 0, 0, 0, time.UTC)
	kasus := []struct{ format, harap string }{
		{"{urut:3}/{kode}/SMAS-IMTEK/{bulan_romawi}/{tahun}", "007/UND/SMAS-IMTEK/IX/2026"},
		{"{urut}/PPDB/{tahun_ajaran}", "7/PPDB/2027/2028"},
		{"SK-{urut:4}-{bulan}.{tahun}", "SK-0007-09.2026"},
	}
	for _, k := range kasus {
		if dapat := susunNomor(k.format, 7, "UND", tgl, "2027/2028"); dapat != k.harap {
			t.Errorf("%q: dapat %q, harap %q", k.format, dapat, k.harap)
		}
	}
	// Nomor urut yang lebih panjang daripada lebarnya tidak dipotong.
	if dapat := susunNomor("{urut:2}", 1234, "", tgl, ""); dapat != "1234" {
		t.Errorf("urut melebihi lebar: dapat %q", dapat)
	}
}

func TestPeriksaFormatNomor(t *testing.T) {
	sah := []struct{ format, atur string }{
		{"{urut:3}/UND/{tahun}", "tahunan"},
		{"{urut}/{bulan_romawi}/{tahun}", "bulanan"},
		{"{urut}/{bulan}/{tahun}", "bulanan"},
		{"{urut:5}/ARSIP", "tidak"},
	}
	for _, k := range sah {
		if pesan := periksaFormatNomor(k.format, k.atur); pesan != "" {
			t.Errorf("%q (%s) seharusnya sah, ditolak: %s", k.format, k.atur, pesan)
		}
	}
	salah := []struct{ format, atur, memuat string }{
		{"", "tahunan", "wajib diisi"},
		{"UND/{tahun}", "tahunan", "{urut}"},
		{"{urut}/UND", "tahunan", "{tahun}"},
		{"{urut}/{tahun}", "bulanan", "{bulan}"},
		{"{urut}/{bulan}", "bulanan", "{tahun}"},
		{"{urut:9}/{tahun}", "tahunan", "antara 1 dan 6"},
		{"{urut}/{tahunn}", "tidak", "tidak dikenal"},
	}
	for _, k := range salah {
		pesan := periksaFormatNomor(k.format, k.atur)
		if !strings.Contains(pesan, k.memuat) {
			t.Errorf("%q (%s): pesan %q seharusnya memuat %q", k.format, k.atur, pesan, k.memuat)
		}
	}
}

func TestPeriodeSurat(t *testing.T) {
	tgl := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	for atur, harap := range map[string]string{"tahunan": "2026", "bulanan": "2026-12", "tidak": "-"} {
		if dapat := periodeSurat(atur, tgl); dapat != harap {
			t.Errorf("%s: dapat %q, harap %q", atur, dapat, harap)
		}
	}
	// Surat bertanggal 1 Januari masuk periode tahun baru, bukan tahun lalu.
	if dapat := periodeSurat("tahunan", time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC)); dapat != "2027" {
		t.Errorf("awal tahun: dapat %q", dapat)
	}
}

func TestIsiNaskah(t *testing.T) {
	nilai := map[string]string{"nama_lengkap": "Siti Aminah", "nomor_surat": "001/SK/2026"}
	dapat := isiNaskah("Surat {nomor_surat} untuk {nama_lengkap}. {tidak_ada} tetap.", nilai)
	if dapat != "Surat 001/SK/2026 untuk Siti Aminah. {tidak_ada} tetap." {
		t.Errorf("dapat %q", dapat)
	}
	if periksaPenandaNaskah("Halo {nama_lengkap}") != "" {
		t.Error("penanda dikenal ditolak")
	}
	if !strings.Contains(periksaPenandaNaskah("Halo {nama}"), "{nama}") {
		t.Error("penanda asing tidak ditolak")
	}
}

func TestKeParagrafSurat(t *testing.T) {
	p := keParagrafSurat("Dengan hormat,\r\n\r\nKami mengundang:\n1. Orang tua\n2. Wali\n\n\n  Terima kasih.  ")
	if len(p) != 3 {
		t.Fatalf("jumlah paragraf %d, harap 3: %q", len(p), p)
	}
	if len(p[1]) != 3 || p[1][1] != "1. Orang tua" {
		t.Errorf("daftar bernomor dilebur: %q", p[1])
	}
	if p[2][0] != "Terima kasih." {
		t.Errorf("spasi tepi tidak dibuang: %q", p[2][0])
	}
}

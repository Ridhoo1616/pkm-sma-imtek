package main

import "testing"

// Ketiga keadaan tertutup harus dapat dibedakan, sebab kalimat yang pantas
// untuk pengunjung berbeda-beda. Yang diuji urutan pemeriksaannya, yaitu
// bagian yang paling mudah salah.
func TestKeadaanPpdb(t *testing.T) {
	kasus := []struct {
		nama    string
		status  string
		mulai   string
		selesai string
		hariIni string
		mau     string
	}{
		{"di dalam jendela dan saklar buka", "buka", "2026-09-01", "2027-06-30", "2026-09-25", KeadaanPpdbDibuka},
		{"belum sampai tanggal mulai", "buka", "2026-10-01", "2027-06-30", "2026-09-25", KeadaanPpdbBelum},
		{"tanggal selesai sudah lewat", "buka", "2025-09-01", "2026-06-30", "2026-09-25", KeadaanPpdbSelesai},
		{"ditutup manual di dalam jendela", "tutup", "2026-09-01", "2027-06-30", "2026-09-25", KeadaanPpdbDitutup},
		// Sekolah yang lupa menutup saklarnya sesudah tanggal selesai tetap
		// mendapat "sudah ditutup", sebab tanggal lebih menerangkan.
		{"lupa tutup saklar, tanggal sudah lewat", "buka", "2025-09-01", "2026-06-30", "2026-09-25", KeadaanPpdbSelesai},
		// Saklar tutup DAN tanggal sudah lewat: tanggalnya yang dipakai.
		{"saklar tutup dan tanggal lewat", "tutup", "2025-09-01", "2026-06-30", "2026-09-25", KeadaanPpdbSelesai},
		{"tanpa tanggal sama sekali, saklar buka", "buka", "", "", "2026-09-25", KeadaanPpdbDibuka},
		{"tanpa tanggal sama sekali, saklar tutup", "tutup", "", "", "2026-09-25", KeadaanPpdbDitutup},
		{"hari terakhir masih dibuka", "buka", "2026-09-01", "2026-09-25", "2026-09-25", KeadaanPpdbDibuka},
		{"hari pertama sudah dibuka", "buka", "2026-09-25", "2027-06-30", "2026-09-25", KeadaanPpdbDibuka},
	}
	for _, k := range kasus {
		got := keadaanPpdbDari(k.status, k.mulai, k.selesai, k.hariIni)
		if got != k.mau {
			t.Errorf("%s: dapat %q, seharusnya %q", k.nama, got, k.mau)
		}
	}
}

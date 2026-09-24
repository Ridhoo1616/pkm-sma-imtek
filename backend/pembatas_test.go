package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestPembatasLajuMenolakSesudahBatas(t *testing.T) {
	p := pembatasLajuBaru(3, time.Minute)
	for i := 1; i <= 3; i++ {
		if boleh, _ := p.izinkan("a"); !boleh {
			t.Fatalf("permintaan ke-%d seharusnya diizinkan", i)
		}
	}
	boleh, tunggu := p.izinkan("a")
	if boleh {
		t.Fatal("permintaan ke-4 seharusnya ditolak")
	}
	if tunggu <= 0 || tunggu > time.Minute {
		t.Fatalf("lama menunggu tidak wajar: %v", tunggu)
	}
	// Kunci lain punya jatah sendiri.
	if boleh, _ := p.izinkan("b"); !boleh {
		t.Fatal("kunci lain seharusnya tidak terpengaruh")
	}
}

func TestPembatasLajuJendelaBergeser(t *testing.T) {
	p := pembatasLajuBaru(2, 50*time.Millisecond)
	p.izinkan("a")
	p.izinkan("a")
	if boleh, _ := p.izinkan("a"); boleh {
		t.Fatal("seharusnya penuh")
	}
	time.Sleep(60 * time.Millisecond)
	if boleh, _ := p.izinkan("a"); !boleh {
		t.Fatal("jendelanya sudah lewat, seharusnya diizinkan lagi")
	}
}

// boleh() tidak boleh ikut mencatat: pembatas kegagalan memeriksa lebih dulu,
// lalu mencatat hanya bila hasilnya memang gagal.
func TestBolehTidakMencatat(t *testing.T) {
	p := pembatasLajuBaru(1, time.Minute)
	for i := 0; i < 5; i++ {
		if ok, _ := p.boleh("a"); !ok {
			t.Fatalf("periksa ke-%d seharusnya masih boleh", i+1)
		}
	}
	p.catat("a")
	if ok, _ := p.boleh("a"); ok {
		t.Fatal("sesudah satu kegagalan seharusnya terkunci")
	}
}

func TestLupakanMenolkanHitungan(t *testing.T) {
	p := pembatasLajuBaru(2, time.Minute)
	p.catat("a")
	p.catat("a")
	if ok, _ := p.boleh("a"); ok {
		t.Fatal("seharusnya terkunci")
	}
	p.lupakan("a")
	if ok, _ := p.boleh("a"); !ok {
		t.Fatal("sesudah berhasil sekali, hitungannya harus dinolkan")
	}
}

// Petanya tidak boleh tumbuh selamanya: membanjiri dari banyak alamat palsu
// akan menghabiskan memori, yaitu serangan yang justru mau dicegah.
func TestSapuMembuangKunciKedaluwarsa(t *testing.T) {
	p := pembatasLajuBaru(5, 30*time.Millisecond)
	for i := 0; i < 100; i++ {
		p.izinkan(string(rune('a'+i%26)) + string(rune('0'+i/26)))
	}
	if p.jumlahKunci() == 0 {
		t.Fatal("seharusnya ada catatan")
	}
	time.Sleep(40 * time.Millisecond)
	p.sapu()
	if n := p.jumlahKunci(); n != 0 {
		t.Fatalf("sesudah disapu seharusnya kosong, tersisa %d", n)
	}
}

/* ---------------- alamat pemanggil ---------------- */

func permintaanDengan(remote, xff, xreal string) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "/api/ppdb/cek", nil)
	r.RemoteAddr = remote
	if xff != "" {
		r.Header.Set("X-Forwarded-For", xff)
	}
	if xreal != "" {
		r.Header.Set("X-Real-IP", xreal)
	}
	return r
}

func TestAlamatPemanggilMengabaikanKepalaPalsu(t *testing.T) {
	// Pemanggil dari luar mengirim X-Forwarded-For karangan. Kepala itu WAJIB
	// diabaikan, sebab kalau dipercaya, setiap permintaan terhitung dari
	// alamat berbeda dan seluruh pembatas laju menjadi tidak berarti.
	r := permintaanDengan("203.0.113.9:51234", "1.2.3.4", "5.6.7.8")
	if got := alamatPemanggil(r); got != "203.0.113.9" {
		t.Fatalf("alamat dari luar harus dipakai apa adanya, dapat %q", got)
	}
}

func TestAlamatPemanggilMemakaiKepalaDariProksiTepercaya(t *testing.T) {
	// Di belakang proksi balik di mesin yang sama, RemoteAddr selalu
	// 127.0.0.1. Tanpa membaca kepalanya, seluruh pengunjung terhitung satu.
	r := permintaanDengan("127.0.0.1:41234", "203.0.113.9", "")
	if got := alamatPemanggil(r); got != "203.0.113.9" {
		t.Fatalf("seharusnya memakai alamat dari kepala, dapat %q", got)
	}
}

func TestAlamatPemanggilMengambilYangTerkananDiLuarJaringanTepercaya(t *testing.T) {
	// Pemanggil mengarang bagian kiri rantainya; proksi menambahkan alamat
	// sebenarnya di kanan. Yang benar diambil dari kanan.
	r := permintaanDengan("127.0.0.1:41234", "9.9.9.9, 203.0.113.9", "")
	if got := alamatPemanggil(r); got != "203.0.113.9" {
		t.Fatalf("seharusnya mengambil yang terkanan, dapat %q", got)
	}
}

func TestAlamatPemanggilMelewatiProksiBerlapis(t *testing.T) {
	r := permintaanDengan("127.0.0.1:41234", "203.0.113.9, 10.0.0.5, 192.168.1.2", "")
	if got := alamatPemanggil(r); got != "203.0.113.9" {
		t.Fatalf("alamat jaringan lokal harus dilewati, dapat %q", got)
	}
}

func TestAlamatPemanggilTanpaKepalaApaPun(t *testing.T) {
	r := permintaanDengan("127.0.0.1:41234", "", "")
	if got := alamatPemanggil(r); got != "127.0.0.1" {
		t.Fatalf("dapat %q", got)
	}
}

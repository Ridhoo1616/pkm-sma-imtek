package main

import (
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

/* ==================================================================
   Pembatas laju permintaan dari luar

   Yang dilindungi bukan hanya beban server. Tiga rute publik menyerahkan
   data pribadi pendaftar dengan kunci nomor registrasi ditambah tanggal
   lahir: cek status, bukti pendaftaran, dan kartu peserta. Nomor
   registrasinya berurutan dan tercetak pada bukti pendaftaran, sedangkan
   tanggal lahir anak seusia calon peserta didik SMA hanya sekitar seribu
   kemungkinan. Tanpa pembatas, seluruh kemungkinan itu dapat dicoba satu
   per satu sampai ketemu, dan bukti pendaftaran memuat data pribadi
   lengkap.

   Karena itu pembatasnya DUA LAPIS, dan lapis keduanya yang penting:

     1. Per alamat IP, longgar. Gunanya menahan banjir permintaan. Sengaja
        longgar karena satu sekolah, satu warnet, atau satu kampung bisa
        berbagi satu alamat IP publik, dan pembatas yang ketat di sini
        akan memblokir pendaftar yang tidak bersalah.

     2. Per nomor registrasi, dan HANYA KEGAGALAN yang dihitung. Inilah
        yang mematikan penebakan tanggal lahir: sepuluh kali salah untuk
        satu nomor, lalu nomor itu terkunci satu jam, tidak peduli dari
        berapa banyak alamat IP percobaannya datang. Pendaftar yang tahu
        tanggal lahirnya sendiri tidak pernah gagal sepuluh kali, dan
        hitungannya dinolkan begitu berhasil sekali.

   Catatan tentang X-Forwarded-For ada di alamatPemanggil, dan itu bagian
   yang membuat seluruh pembatas di sini ada artinya.
   ================================================================== */

// pembatasLaju menghitung permintaan pada jendela waktu yang bergeser.
//
// Penyimpanannya di memori, bukan di basis data maupun Redis, dan itu
// pilihan yang sadar: aplikasi ini berjalan sebagai satu proses pada satu
// server, jadi hitungan di memori sudah tepat. Bila kelak dijalankan
// berbilang proses, hitungannya menjadi per proses dan batasnya harus
// dibagi sebanyak prosesnya.
type pembatasLaju struct {
	batas   int
	jendela time.Duration

	mu    sync.Mutex
	jejak map[string][]time.Time
}

func pembatasLajuBaru(batas int, jendela time.Duration) *pembatasLaju {
	return &pembatasLaju{
		batas:   batas,
		jendela: jendela,
		jejak:   map[string][]time.Time{},
	}
}

// bersihkanTerkunci membuang catatan yang sudah melewati jendelanya.
// Pemanggilnya WAJIB sudah memegang kuncinya.
func (p *pembatasLaju) bersihkanTerkunci(kunci string, sekarang time.Time) []time.Time {
	awal := sekarang.Add(-p.jendela)
	jejak := p.jejak[kunci]
	tersisa := jejak[:0]
	for _, t := range jejak {
		if t.After(awal) {
			tersisa = append(tersisa, t)
		}
	}
	if len(tersisa) == 0 {
		delete(p.jejak, kunci)
		return nil
	}
	p.jejak[kunci] = tersisa
	return tersisa
}

// izinkan memeriksa sekaligus mencatat satu permintaan. Yang dikembalikan
// tunggu adalah lama menunggu sampai satu jatah terbebas, untuk kepala
// Retry-After.
func (p *pembatasLaju) izinkan(kunci string) (boleh bool, tunggu time.Duration) {
	sekarang := time.Now()
	p.mu.Lock()
	defer p.mu.Unlock()

	tersisa := p.bersihkanTerkunci(kunci, sekarang)
	if len(tersisa) >= p.batas {
		return false, p.jendela - sekarang.Sub(tersisa[0])
	}
	p.jejak[kunci] = append(tersisa, sekarang)
	return true, 0
}

// boleh memeriksa TANPA mencatat, untuk pembatas yang hanya menghitung
// kegagalan: yang dicatat nanti hasilnya, bukan percobaannya.
func (p *pembatasLaju) boleh(kunci string) (bool, time.Duration) {
	sekarang := time.Now()
	p.mu.Lock()
	defer p.mu.Unlock()

	tersisa := p.bersihkanTerkunci(kunci, sekarang)
	if len(tersisa) >= p.batas {
		return false, p.jendela - sekarang.Sub(tersisa[0])
	}
	return true, 0
}

func (p *pembatasLaju) catat(kunci string) {
	sekarang := time.Now()
	p.mu.Lock()
	defer p.mu.Unlock()
	p.jejak[kunci] = append(p.bersihkanTerkunci(kunci, sekarang), sekarang)
}

func (p *pembatasLaju) lupakan(kunci string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.jejak, kunci)
}

// sapu membuang seluruh kunci yang catatannya sudah kedaluwarsa.
//
// Tanpa ini petanya tumbuh selamanya: satu kunci per alamat IP yang pernah
// datang, dan tidak ada yang pernah membuangnya kembali. Membanjiri server
// dari banyak alamat IP palsu akan menghabiskan memorinya, yaitu justru
// serangan yang mau dicegah pembatas ini.
func (p *pembatasLaju) sapu() {
	sekarang := time.Now()
	p.mu.Lock()
	defer p.mu.Unlock()
	for kunci := range p.jejak {
		p.bersihkanTerkunci(kunci, sekarang)
	}
}

func (p *pembatasLaju) jumlahKunci() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.jejak)
}

/* ---------------- pembatas untuk rute publik ---------------- */

// Angkanya dipilih dari pemakaian yang wajar, bukan dikira-kira. Satu
// pendaftar membuka cek status beberapa kali sehari; satu keluarga
// mendaftarkan paling banyak dua tiga anak; satu pengunjung membuka
// belasan halaman dalam sekali kunjungan.
type pembatasPublik struct {
	// identitasIP menahan banjir pada rute yang menyerahkan data pribadi.
	identitasIP *pembatasLaju
	// identitasGagal mengunci per NOMOR REGISTRASI, menghitung kegagalan.
	identitasGagal *pembatasLaju
	daftarIP       *pembatasLaju
	pesanIP        *pembatasLaju
	kunjunganIP    *pembatasLaju
}

func pembatasPublikBaru() *pembatasPublik {
	return &pembatasPublik{
		identitasIP:    pembatasLajuBaru(60, 10*time.Minute),
		identitasGagal: pembatasLajuBaru(10, time.Hour),
		daftarIP:       pembatasLajuBaru(20, time.Hour),
		pesanIP:        pembatasLajuBaru(10, time.Hour),
		kunjunganIP:    pembatasLajuBaru(300, 10*time.Minute),
	}
}

func (p *pembatasPublik) semua() []*pembatasLaju {
	return []*pembatasLaju{
		p.identitasIP, p.identitasGagal, p.daftarIP, p.pesanIP, p.kunjunganIP,
	}
}

func (p *pembatasPublik) sapu() {
	for _, l := range p.semua() {
		l.sapu()
	}
}

// sapuPembatasBerkala membuang catatan kedaluwarsa setiap lima menit,
// selama proses hidup. Dijalankan sekali dari main.
func (a *Aplikasi) sapuPembatasBerkala() {
	jam := time.NewTicker(5 * time.Minute)
	go func() {
		for range jam.C {
			a.batas.sapu()
		}
	}()
}

/* ---------------- lapisan tengah ---------------- */

// tolakTerlaluSering menjawab 429 beserta kepala Retry-After.
func tolakTerlaluSering(w http.ResponseWriter, tunggu time.Duration, pesan string) {
	detik := int(tunggu.Seconds()) + 1
	if detik < 1 {
		detik = 1
	}
	w.Header().Set("Retry-After", strconv.Itoa(detik))
	kirimGalat(w, http.StatusTooManyRequests, pesan+" "+lamaMenunggu(tunggu))
}

// lamaMenunggu menuliskan lama menunggu dalam kalimat Indonesia yang wajar.
func lamaMenunggu(d time.Duration) string {
	menit := int(d.Minutes())
	if menit < 1 {
		return "Silakan coba lagi kurang dari satu menit."
	}
	if menit < 60 {
		return fmt.Sprintf("Silakan coba lagi dalam %d menit.", menit)
	}
	return fmt.Sprintf("Silakan coba lagi dalam %d jam %d menit.", menit/60, menit%60)
}

// batasiIP membungkus satu penangan dengan pembatas per alamat IP.
func (a *Aplikasi) batasiIP(p *pembatasLaju, pesan string, berikut http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if boleh, tunggu := p.izinkan(alamatPemanggil(r)); !boleh {
			tolakTerlaluSering(w, tunggu, pesan)
			return
		}
		berikut(w, r)
	}
}

/* ---------------- pembatas per nomor registrasi ---------------- */

func kunciRegistrasi(noReg string) string {
	return strings.ToUpper(strings.TrimSpace(noReg))
}

// izinkanCobaIdentitas dipanggil SEBELUM pencarian ke basis data. Bila
// nomornya sudah terlalu sering salah, permintaannya ditolak tanpa
// menyentuh basis data sama sekali.
func (a *Aplikasi) izinkanCobaIdentitas(w http.ResponseWriter, noReg string) bool {
	boleh, tunggu := a.batas.identitasGagal.boleh(kunciRegistrasi(noReg))
	if !boleh {
		tolakTerlaluSering(w, tunggu,
			"Terlalu banyak percobaan yang gagal untuk nomor registrasi ini.")
		return false
	}
	return true
}

// catatGagalIdentitas dipanggil ketika pasangan nomor registrasi dan
// tanggal lahirnya tidak ditemukan.
func (a *Aplikasi) catatGagalIdentitas(noReg string) {
	a.batas.identitasGagal.catat(kunciRegistrasi(noReg))
}

// bersihkanGagalIdentitas dipanggil ketika pasangannya cocok, supaya
// pendaftar yang sempat salah ketik tidak membawa beban hitungan itu.
func (a *Aplikasi) bersihkanGagalIdentitas(noReg string) {
	a.batas.identitasGagal.lupakan(kunciRegistrasi(noReg))
}

/* ---------------- alamat pemanggil ---------------- */

// jaringanTepercaya adalah alamat yang X-Forwarded-For dari sana boleh
// dipercaya. Bawaannya loopback beserta alamat jaringan lokal, yaitu
// tempat proksi balik (Caddy atau nginx) pada umumnya berada.
var jaringanTepercayaBawaan = []string{
	"127.0.0.0/8", "::1/128",
	"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7",
}

func bacaJaringan(daftar []string) []*net.IPNet {
	hasil := []*net.IPNet{}
	for _, t := range daftar {
		if t = strings.TrimSpace(t); t == "" {
			continue
		}
		if _, jaringan, err := net.ParseCIDR(t); err == nil {
			hasil = append(hasil, jaringan)
			continue
		}
		// Alamat tunggal tanpa panjang prefiks, misalnya "10.1.2.3".
		if ip := net.ParseIP(t); ip != nil {
			bit := 32
			if ip.To4() == nil {
				bit = 128
			}
			hasil = append(hasil, &net.IPNet{
				IP:   ip,
				Mask: net.CIDRMask(bit, bit),
			})
		}
	}
	return hasil
}

var jaringanTepercaya = bacaJaringan(jaringanTepercayaBawaan)

// setelProksiTepercaya mengganti daftar bawaan, dipanggil SEKALI dari main
// sebelum server menerima permintaan. Dipakai bila proksi baliknya berada di
// mesin lain, sehingga alamatnya bukan loopback maupun jaringan lokal.
func setelProksiTepercaya(daftar string) {
	if jaringan := bacaJaringan(strings.Split(daftar, ",")); len(jaringan) > 0 {
		jaringanTepercaya = jaringan
	}
}

func tepercaya(ip net.IP) bool {
	for _, j := range jaringanTepercaya {
		if j.Contains(ip) {
			return true
		}
	}
	return false
}

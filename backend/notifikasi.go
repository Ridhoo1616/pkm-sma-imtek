package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

/* ==================================================================
   Notifikasi WhatsApp

   Yang perlu diketahui sebelum membaca kode ini.

   Mengirim WhatsApp otomatis hanya sah lewat WhatsApp Business API resmi,
   yang berbayar dan memerlukan verifikasi badan usaha di Meta. Gateway tidak
   resmi yang banyak dijual memakai sambungan WhatsApp Web milik nomor
   sekolah, dan itu melanggar ketentuan layanan; risikonya nomor sekolah
   diblokir, justru pada masa PPDB ketika nomor itu paling dibutuhkan.

   Karena itu pengirimannya dipisah dari penyusunannya, dan disediakan dua
   jalur:

     1. Jalur bawaan, tanpa biaya dan tanpa risiko. Pesannya disusun sistem,
        panitia menekan satu tombol, dan WhatsApp terbuka dengan pesan yang
        sudah terisi lengkap. Panitia menekan kirim. Bedanya dengan otomatis
        penuh hanya satu ketukan, dan tidak ada nomor yang dipertaruhkan.

     2. Jalur gateway, otomatis penuh. Aktif bila WA_GATEWAY_URL disetel.
        Sistem mengirim permintaan HTTP ke alamat itu. Bentuk permintaannya
        mengikuti yang paling umum dipakai, dan dapat disesuaikan lewat
        variabel lingkungan tanpa mengubah kode.

   Apa pun jalurnya, setiap pesan dicatat di tabel notifikasi beserta isinya,
   supaya panitia dapat menunjukkan persis apa yang dikirim bila ada sengketa
   dengan orang tua.
   ================================================================== */

type Notifikasi struct {
	ID            int     `json:"id"`
	PendaftarID   *int    `json:"pendaftar_id"`
	NamaPendaftar string  `json:"nama_pendaftar,omitempty"`
	NoRegistrasi  string  `json:"no_registrasi,omitempty"`
	Kanal         string  `json:"kanal"`
	Tujuan        string  `json:"tujuan"`
	Jenis         string  `json:"jenis"`
	Pesan         string  `json:"pesan"`
	Status        string  `json:"status"`
	Galat         string  `json:"galat,omitempty"`
	DikirimPada   *string `json:"dikirim_pada"`
	Dibuat        string  `json:"dibuat"`
	// TautanWa adalah alamat wa.me berisi pesan yang sudah terisi, dipakai
	// tombol kirim pada panel bila gateway tidak disetel.
	TautanWa string `json:"tautan_wa,omitempty"`
}

// JenisNotifikasi memetakan jenis pesan ke kunci pengaturan naskahnya.
var JenisNotifikasi = map[string]string{
	"verifikasi":   "wa_notif_verifikasi",
	"ujian":        "wa_notif_ujian",
	"kelulusan":    "wa_notif_kelulusan",
	"daftar_ulang": "wa_notif_daftar_ulang",
}

// PerihalEmail memetakan jenis pesan ke kunci pengaturan baris perihalnya.
//
// Badan pesannya sama dengan yang dikirim lewat WhatsApp -- naskahnya sudah
// berupa kalimat utuh yang pantas dibaca di kedua kanal -- tetapi email
// menuntut baris perihal, dan perihal yang baik berbeda per jenis pesannya.
//
// Awalan wa_notif_ pada kunci badan pesan di atas dipertahankan meski
// sekarang dipakai kedua kanal. Menggantinya berarti memindahkan naskah yang
// sudah diisi sekolah, dan risiko kehilangan naskah itu lebih besar daripada
// untungnya nama yang lebih tepat.
var PerihalEmail = map[string]string{
	"verifikasi":   "email_subjek_verifikasi",
	"ujian":        "email_subjek_ujian",
	"kelulusan":    "email_subjek_kelulusan",
	"daftar_ulang": "email_subjek_daftar_ulang",
}

var polaPenanda = regexp.MustCompile(`\{([a-z_]+)\}`)

// polaBarisKosong menangkap tiga baris baru berurutan atau lebih, yaitu dua
// baris kosong atau lebih.
var polaBarisKosong = regexp.MustCompile(`\n{3,}`)

// susunPesan mengganti penanda dalam kurung kurawal pada naskah.
//
// Penanda yang tidak dikenal dibiarkan apa adanya, bukan dikosongkan, supaya
// salah tulis pada naskah langsung terlihat panitia saat meninjau pesannya,
// bukan diam-diam menghasilkan kalimat yang bolong.
func susunPesan(naskah string, nilai map[string]string) string {
	hasil := polaPenanda.ReplaceAllStringFunc(naskah, func(cocok string) string {
		kunci := cocok[1 : len(cocok)-1]
		if v, ada := nilai[kunci]; ada {
			return v
		}
		return cocok
	})
	// Penanda yang nilainya kosong meninggalkan spasi ganda, dan itu yang
	// dirapikan di sini. BARIS BARUNYA DIPERTAHANKAN.
	//
	// Semula seluruh spasi putih diratakan sekaligus dengan
	// strings.Fields, dan itu ikut melumat baris barunya: naskah daftar
	// ulang yang memuat jadwal, tempat, dan daftar berkas berbaris-baris
	// tiba sebagai satu paragraf rapat sepanjang lima ratus huruf. Terlihat
	// saat memeriksa email yang benar-benar diterima server, bukan dari
	// membaca kodenya.
	//
	// Jadi perapiannya PER BARIS: spasi berlebih di dalam satu baris
	// diratakan, sedangkan pemisah barisnya tetap. Dua baris kosong atau
	// lebih dirapatkan menjadi satu, sebab penanda yang nilainya kosong dan
	// berdiri sendiri pada satu baris meninggalkan baris kosong.
	baris := strings.Split(hasil, "\n")
	for i, b := range baris {
		baris[i] = strings.Join(strings.Fields(b), " ")
	}
	return strings.TrimSpace(polaBarisKosong.ReplaceAllString(strings.Join(baris, "\n"), "\n\n"))
}

// nomorWaKirim membersihkan nomor telepon menjadi bentuk yang diterima
// WhatsApp: hanya angka, berawalan kode negara.
func nomorWaKirim(nomor string) string {
	var b strings.Builder
	for _, r := range nomor {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	n := b.String()
	switch {
	case n == "":
		return ""
	case strings.HasPrefix(n, "62"):
		return n
	case strings.HasPrefix(n, "0"):
		return "62" + n[1:]
	default:
		return "62" + n
	}
}

// buatNotifikasi menyusun dan mencatat satu pesan untuk seorang pendaftar.
//
// Dipanggil saat panitia mengubah status pendaftar. Pesannya tidak langsung
// dikirim: yang tercatat berstatus "Menunggu", lalu panitia meninjaunya di
// menu Notifikasi. Alasannya, naskah otomatis kadang perlu diperbaiki lebih
// dulu, dan pesan yang salah tidak bisa ditarik kembali dari WhatsApp.
func (a *Aplikasi) buatNotifikasi(pendaftarID int, jenis string, tambahan map[string]string) error {
	kunciNaskah, ada := JenisNotifikasi[jenis]
	if !ada {
		return fmt.Errorf("jenis notifikasi tidak dikenal: %s", jenis)
	}
	naskah := strings.TrimSpace(a.atur(kunciNaskah))
	if naskah == "" || dalamKurungSiku(naskah) {
		// Naskahnya belum diisi sekolah. Bukan kesalahan: notifikasi memang
		// belum bisa disusun, dan pendaftarnya tetap tersimpan.
		return nil
	}

	var nama, noReg, noHpOrtu, noHp, email string
	err := a.db.QueryRow(
		`SELECT nama_lengkap, no_registrasi, COALESCE(no_hp_ortu, ''),
		        COALESCE(no_hp, ''), COALESCE(email, '')
		   FROM pendaftar WHERE id = $1`, pendaftarID).
		Scan(&nama, &noReg, &noHpOrtu, &noHp, &email)
	if err != nil {
		return err
	}

	// Nomor orang tua lebih dulu: yang mengurus daftar ulang dan pembayaran
	// pada umumnya orang tuanya, bukan calon peserta didiknya.
	nomor := nomorWaKirim(noHpOrtu)
	if nomor == "" {
		nomor = nomorWaKirim(noHp)
	}
	email = strings.TrimSpace(email)

	nilai := map[string]string{
		"nama":          nama,
		"no_registrasi": noReg,
		"sekolah":       a.atur("nama_sekolah", "SMA IMTEK"),
		"tahun_ajaran":  a.atur("ppdb_tahun"),
		"catatan":       "",
		"status":        "",
		"jadwal_ujian":  "",
	}
	// Rincian daftar ulang dibaca dari pengaturan, bukan dituliskan di dalam
	// naskah pesannya, supaya sekolah dapat mengubah jadwalnya tanpa
	// menyentuh susunan kalimatnya. Yang masih penanda dibiarkan kosong,
	// bukan diisi kalimat contoh.
	for _, k := range []string{"daftar_ulang_jadwal", "daftar_ulang_tempat", "daftar_ulang_syarat"} {
		v := strings.TrimSpace(a.atur(k))
		if dalamKurungSiku(v) {
			v = ""
		}
		nilai[k] = v
	}
	for k, v := range tambahan {
		nilai[k] = v
	}

	pesan := susunPesan(naskah, nilai)

	// Satu baris per kanal yang benar-benar punya tujuan. Pendaftar yang
	// mengisi keduanya menerima dua-duanya; yang hanya mengisi nomor tetap
	// menerima WhatsApp saja, dan sebaliknya.
	tujuan := []struct{ kanal, alamat string }{}
	if nomor != "" {
		tujuan = append(tujuan, struct{ kanal, alamat string }{"WhatsApp", nomor})
	}
	if email != "" {
		tujuan = append(tujuan, struct{ kanal, alamat string }{"Email", email})
	}
	if len(tujuan) == 0 {
		return nil // tidak ada yang bisa dihubungi
	}

	for _, t := range tujuan {
		if _, err := a.db.Exec(
			`INSERT INTO notifikasi (pendaftar_id, kanal, tujuan, jenis, pesan, status)
			 VALUES ($1, $2, $3, $4, $5, 'Menunggu')`,
			pendaftarID, t.kanal, t.alamat, jenis, pesan); err != nil {
			return err
		}
	}
	return nil
}

// perihalUntuk mengembalikan baris perihal email bagi sebuah jenis pesan.
// String kosong berarti sekolah belum mengisinya, dan pengirimannya ditolak
// dengan keterangan -- bukan dikirim tanpa perihal.
func (a *Aplikasi) perihalUntuk(jenis string) string {
	kunci, ada := PerihalEmail[jenis]
	if !ada {
		return ""
	}
	p := strings.TrimSpace(a.atur(kunci))
	if dalamKurungSiku(p) {
		return ""
	}
	return p
}

/* ---------- pengiriman ---------- */

// gatewayDisetel menjawab apakah pengiriman otomatis tersedia.
func (a *Aplikasi) gatewayDisetel() bool {
	return a.cfg.WaGatewayURL != ""
}

// kirimLewatGateway meneruskan pesan ke gateway WhatsApp resmi.
//
// Bentuk badan permintaannya disusun dari dua nama medan yang dapat disetel
// lewat variabel lingkungan, karena tiap penyedia memakai nama yang berbeda
// dan sistem ini tidak boleh terikat pada satu penyedia.
func (a *Aplikasi) kirimLewatGateway(ctx context.Context, tujuan, pesan string) error {
	badan := map[string]string{
		a.cfg.WaMedanTujuan: tujuan,
		a.cfg.WaMedanPesan:  pesan,
	}
	isi, err := json.Marshal(badan)
	if err != nil {
		return err
	}

	permintaan, err := http.NewRequestWithContext(ctx, http.MethodPost,
		a.cfg.WaGatewayURL, bytes.NewReader(isi))
	if err != nil {
		return err
	}
	permintaan.Header.Set("Content-Type", "application/json")
	if a.cfg.WaGatewayToken != "" {
		permintaan.Header.Set("Authorization", "Bearer "+a.cfg.WaGatewayToken)
	}

	klien := &http.Client{Timeout: 20 * time.Second}
	jawaban, err := klien.Do(permintaan)
	if err != nil {
		return err
	}
	defer jawaban.Body.Close()

	// Badan jawaban dibaca terbatas: pesan galat dari gateway berguna untuk
	// dicatat, tetapi tidak ada alasan menampung jawaban sebesar apa pun.
	cuplikan, _ := io.ReadAll(io.LimitReader(jawaban.Body, 2000))
	if jawaban.StatusCode < 200 || jawaban.StatusCode > 299 {
		return fmt.Errorf("gateway menjawab %d: %s",
			jawaban.StatusCode, strings.TrimSpace(string(cuplikan)))
	}
	return nil
}

// tandaiTerkirim mencatat bahwa satu notifikasi sudah dikirim.
func (a *Aplikasi) tandaiTerkirim(id, olehID int) error {
	_, err := a.db.Exec(
		`UPDATE notifikasi SET status = 'Terkirim', galat = '',
		        dikirim_pada = now(), dikirim_oleh = $1
		 WHERE id = $2 AND status <> 'Terkirim'`, olehID, id)
	return err
}

func (a *Aplikasi) tandaiGagal(id int, sebab string) error {
	_, err := a.db.Exec(
		"UPDATE notifikasi SET status = 'Gagal', galat = $1 WHERE id = $2",
		potong(sebab, 1000), id)
	return err
}

func potong(s string, maks int) string {
	if len(s) <= maks {
		return s
	}
	return s[:maks]
}

// ambilNotifikasi membaca satu notifikasi beserta identitas pendaftarnya.
func (a *Aplikasi) ambilNotifikasi(id int) (Notifikasi, error) {
	var n Notifikasi
	var dikirim sql.NullTime
	var nama, noReg sql.NullString
	err := a.db.QueryRow(
		`SELECT n.id, n.pendaftar_id, p.nama_lengkap, p.no_registrasi,
		        n.kanal, n.tujuan, n.jenis, n.pesan, n.status, n.galat,
		        n.dikirim_pada, n.created_at
		 FROM notifikasi n
		 LEFT JOIN pendaftar p ON p.id = n.pendaftar_id
		 WHERE n.id = $1`, id).
		Scan(&n.ID, &n.PendaftarID, &nama, &noReg, &n.Kanal, &n.Tujuan,
			&n.Jenis, &n.Pesan, &n.Status, &n.Galat, &dikirim, &n.Dibuat)
	if err != nil {
		return n, err
	}
	n.NamaPendaftar = nama.String
	n.NoRegistrasi = noReg.String
	if dikirim.Valid {
		t := dikirim.Time.Format(time.RFC3339)
		n.DikirimPada = &t
	}
	return n, nil
}

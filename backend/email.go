package main

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"
)

/*
Pengiriman email notifikasi.

Memakai net/smtp dari pustaka baku, tanpa pustaka luar. Yang dibutuhkan cuma
satu hal: menyambung ke satu server SMTP, masuk dengan sandi aplikasi, lalu
mengirim satu pesan teks. Pustaka email yang lengkap membawa lampiran, HTML
berlapis, dan templat — tidak satu pun dipakai di sini.

TIDAK MEMAKAI smtp.SendMail, meski itu satu baris. Alasannya tenggat waktu:
SendMail tidak menerima context dan tidak punya batas waktu sama sekali,
sehingga server SMTP yang menggantung akan menggantungkan penanganan HTTP di
panel panitia sampai entah kapan. Di sini penyambungannya dibuat sendiri
dengan DialTimeout, dan context pemanggilnya dihormati.

Bila SMTP belum disetel, seluruh fungsi di sini tidak dipakai: notifikasi
berkanal Email tetap dicatat tetapi tidak dapat dikirim, dan panel
menerangkan hal itu kepada panitia. Sengaja begitu — sekolah boleh memakai
sistem ini tanpa menyiapkan email lebih dulu.
*/

// emailDisetel melaporkan apakah pengiriman email dapat dijalankan. Keempat
// nilainya wajib: tanpa salah satu pun, penyambungannya pasti gagal, dan
// gagal di tengah pengiriman lebih buruk daripada menolak sejak awal.
func (a *Aplikasi) emailDisetel() bool {
	return a.cfg.SmtpHost != "" && a.cfg.SmtpPengguna != "" &&
		a.cfg.SmtpSandi != "" && a.cfg.SmtpDari != ""
}

// susunEmail membentuk satu pesan email lengkap beserta kepalanya.
//
// Perihalnya disandikan MIME karena judul berbahasa Indonesia dapat memuat
// huruf di luar ASCII, dan badan pesannya disandikan base64 — bukan
// quoted-printable — supaya baris panjang, tanda baca, maupun emoji tidak
// pernah merusak bentuk pesannya.
func susunEmail(dari, namaDari, ke, perihal, isi string) []byte {
	pengirim := dari
	if namaDari != "" {
		pengirim = (&mail.Address{Name: namaDari, Address: dari}).String()
	}

	var b strings.Builder
	b.WriteString("From: " + pengirim + "\r\n")
	b.WriteString("To: " + ke + "\r\n")
	b.WriteString("Subject: " + mime.QEncoding.Encode("utf-8", perihal) + "\r\n")
	b.WriteString("Date: " + time.Now().Format(time.RFC1123Z) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n")
	b.WriteString("\r\n")

	// Baris base64 dipotong 76 huruf mengikuti RFC 2045. Sebagian server
	// menolak baris yang lebih panjang.
	sandi := base64.StdEncoding.EncodeToString([]byte(isi))
	for i := 0; i < len(sandi); i += 76 {
		akhir := i + 76
		if akhir > len(sandi) {
			akhir = len(sandi)
		}
		b.WriteString(sandi[i:akhir] + "\r\n")
	}
	return []byte(b.String())
}

// pengirimEmail memilih alamat dan nama pengirim.
//
// Pengaturan di panel menang atas berkas .env, supaya sekolah dapat
// mengubahnya tanpa menyentuh server. Yang di panel HANYA alamat dan namanya;
// sandinya tetap di .env, sebab sandi yang disimpan di basis data akan ikut
// terbawa setiap kali basis datanya dicadangkan atau disalin, dan cadangan
// basis data beredar jauh lebih bebas daripada berkas .env.
//
// Alamat yang masih bertanda kurung siku dianggap belum diisi.
func (a *Aplikasi) pengirimEmail() (dari, nama string) {
	dari = strings.TrimSpace(a.atur("email_pengirim"))
	if dari == "" || dalamKurungSiku(dari) {
		dari = a.cfg.SmtpDari
	}
	nama = strings.TrimSpace(a.atur("email_pengirim_nama"))
	if nama == "" || dalamKurungSiku(nama) {
		nama = a.cfg.SmtpNama
	}
	return dari, nama
}

// kirimEmail mengirim satu pesan teks. Galat yang dikembalikan sudah berupa
// kalimat yang pantas dicatat pada kolom galat notifikasi.
func (a *Aplikasi) kirimEmail(ctx context.Context, ke, perihal, isi string) error {
	if !a.emailDisetel() {
		return fmt.Errorf("pengiriman email belum disetel di server")
	}
	if _, err := mail.ParseAddress(ke); err != nil {
		return fmt.Errorf("alamat email tujuan tidak sah: %s", ke)
	}
	if strings.TrimSpace(perihal) == "" {
		return fmt.Errorf("perihal email belum diisi di menu Pengaturan")
	}

	alamat := net.JoinHostPort(a.cfg.SmtpHost, a.cfg.SmtpPorta)
	dari, namaDari := a.pengirimEmail()
	sambung, err := (&net.Dialer{Timeout: 15 * time.Second}).DialContext(ctx, "tcp", alamat)
	if err != nil {
		return fmt.Errorf("tidak dapat menghubungi server email %s: %w", alamat, err)
	}
	// Penutupan ganda tidak berbahaya: Quit di jalur berhasil sudah menutup
	// sambungannya, dan Close atas sambungan yang sudah tertutup hanya
	// mengembalikan galat yang diabaikan di sini.
	defer sambung.Close()

	klien, err := smtp.NewClient(sambung, a.cfg.SmtpHost)
	if err != nil {
		return fmt.Errorf("gagal memulai percakapan SMTP: %w", err)
	}
	defer klien.Close()

	// STARTTLS wajib. Sandi aplikasi tidak boleh melintas tanpa enkripsi,
	// sekalipun servernya ada di jaringan yang sama.
	if ok, _ := klien.Extension("STARTTLS"); !ok {
		return fmt.Errorf("server email tidak mendukung STARTTLS, pengiriman dibatalkan")
	}
	if err := klien.StartTLS(&tls.Config{ServerName: a.cfg.SmtpHost}); err != nil {
		return fmt.Errorf("gagal mengamankan sambungan ke server email: %w", err)
	}
	if err := klien.Auth(smtp.PlainAuth("", a.cfg.SmtpPengguna, a.cfg.SmtpSandi, a.cfg.SmtpHost)); err != nil {
		return fmt.Errorf("server email menolak nama pengguna atau sandi aplikasinya: %w", err)
	}

	if err := klien.Mail(dari); err != nil {
		return fmt.Errorf("server email menolak alamat pengirim: %w", err)
	}
	if err := klien.Rcpt(ke); err != nil {
		return fmt.Errorf("server email menolak alamat tujuan: %w", err)
	}
	tulis, err := klien.Data()
	if err != nil {
		return fmt.Errorf("server email menolak isi pesan: %w", err)
	}
	if _, err := tulis.Write(susunEmail(dari, namaDari, ke, perihal, isi)); err != nil {
		return fmt.Errorf("gagal mengirim isi pesan: %w", err)
	}
	if err := tulis.Close(); err != nil {
		return fmt.Errorf("server email menolak pesan saat ditutup: %w", err)
	}
	return klien.Quit()
}

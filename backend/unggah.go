package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	TipeGambar       = []string{"jpg", "jpeg", "png"}
	TipeDokumen      = []string{"jpg", "jpeg", "png", "pdf"}
	GalatTanpaBerkas = errors.New("tidak ada berkas")
)

// tandaBerkas memetakan beberapa byte pertama sebuah berkas ke jenis isinya.
// Ekstensi nama berkas mudah dipalsukan, jadi isinya diperiksa juga — sama
// seperti versi PHP yang memanggil mime_content_type.
var tandaBerkas = []struct {
	awalan []byte
	jenis  string
}{
	{[]byte{0xFF, 0xD8, 0xFF}, "jpg"},
	{[]byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, "png"},
	{[]byte("%PDF-"), "pdf"},
}

func kenaliJenis(awal []byte) string {
	for _, t := range tandaBerkas {
		if bytes.HasPrefix(awal, t.awalan) {
			return t.jenis
		}
	}
	return ""
}

// simpanUnggahan menyalin satu berkas dari formulir ke folder unggahan dan
// mengembalikan nama berkas hasil simpan. Namanya diacak agar tidak bisa
// ditebak — berkas pendaftar memuat dokumen pribadi seperti Kartu Keluarga.
func (a *Aplikasi) simpanUnggahan(
	berkas multipart.File, kepala *multipart.FileHeader, subfolder string, tipeIzin []string,
) (string, error) {
	if kepala.Size > a.cfg.BatasUnggah {
		return "", fmt.Errorf("ukuran berkas melebihi %.1f MB",
			float64(a.cfg.BatasUnggah)/1048576)
	}

	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(kepala.Filename), "."))
	if !adaDalam(tipeIzin, ext) {
		return "", fmt.Errorf("tipe berkas tidak diizinkan, gunakan: %s",
			strings.Join(tipeIzin, ", "))
	}

	awal := make([]byte, 512)
	n, err := io.ReadFull(berkas, awal)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return "", errors.New("berkas tidak dapat dibaca")
	}
	jenis := kenaliJenis(awal[:n])
	if jenis == "" {
		return "", errors.New("isi berkas tidak dikenali sebagai gambar atau PDF")
	}
	// jpg dan jpeg adalah isi yang sama dengan dua nama ekstensi.
	if jenis != ext && !(jenis == "jpg" && ext == "jpeg") {
		return "", errors.New("isi berkas tidak sesuai dengan ekstensinya")
	}
	if _, err := berkas.Seek(0, io.SeekStart); err != nil {
		return "", errors.New("berkas tidak dapat dibaca ulang")
	}

	folder := filepath.Join(a.cfg.FolderUnggah, subfolder)
	if err := os.MkdirAll(folder, 0o755); err != nil {
		return "", errors.New("folder penyimpanan tidak dapat dibuat")
	}

	acak := make([]byte, 4)
	if _, err := rand.Read(acak); err != nil {
		return "", errors.New("nama berkas tidak dapat dibuat")
	}
	nama := fmt.Sprintf("%s-%s.%s", time.Now().Format("20060102-150405"), hex.EncodeToString(acak), ext)

	tujuan, err := os.OpenFile(filepath.Join(folder, nama), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return "", errors.New("berkas tidak dapat disimpan ke server")
	}
	defer tujuan.Close()

	if _, err := io.Copy(tujuan, io.LimitReader(berkas, a.cfg.BatasUnggah)); err != nil {
		os.Remove(filepath.Join(folder, nama))
		return "", errors.New("berkas gagal ditulis ke server")
	}
	return nama, nil
}

// ambilUnggahan membaca satu kolom berkas dari formulir. Kolom yang tidak
// dikirim bukan galat; pemanggilnya yang memutuskan apakah wajib.
func (a *Aplikasi) ambilUnggahan(
	r *multipart.Form, kolom, subfolder string, tipeIzin []string,
) (string, error) {
	daftar := r.File[kolom]
	if len(daftar) == 0 {
		return "", GalatTanpaBerkas
	}
	f, err := daftar[0].Open()
	if err != nil {
		return "", errors.New("berkas tidak dapat dibuka")
	}
	defer f.Close()
	return a.simpanUnggahan(f, daftar[0], subfolder, tipeIzin)
}

// hapusUnggahan membuang berkas yang sudah tersimpan. Dipakai untuk
// membereskan sisa unggahan ketika penyimpanan data batal karena galat.
func (a *Aplikasi) hapusUnggahan(subfolder, nama string) {
	if nama == "" {
		return
	}
	// filepath.Base menutup kemungkinan nama berisi "../".
	if err := os.Remove(filepath.Join(a.cfg.FolderUnggah, subfolder, filepath.Base(nama))); err != nil && !os.IsNotExist(err) {
		a.log.Printf("gagal menghapus berkas %s/%s: %v", subfolder, nama, err)
	}
}

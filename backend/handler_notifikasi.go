package main

import (
	"database/sql"
	"net/http"
	"net/url"
	"strings"
	"time"
)

/* ==================================================================
   Panel notifikasi

   Panitia melihat pesan yang sudah disusun sistem, memeriksanya, lalu
   mengirim. Bila gateway resmi disetel, tombolnya mengirim langsung. Bila
   tidak, tombolnya membuka WhatsApp dengan pesan yang sudah terisi.

   Pesan yang sudah terkirim tidak bisa diubah, hanya dibaca. Mengizinkan
   penyuntingan setelah terkirim akan membuat catatan ini tidak lagi bisa
   dipakai sebagai bukti apa yang diterima orang tua.
   ================================================================== */

func (a *Aplikasi) tanganiDaftarNotifikasi(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := strings.TrimSpace(q.Get("status"))
	halaman := bilanganKueri(q.Get("halaman"), 1, 1, 10000)
	perHalaman := bilanganKueri(q.Get("per_halaman"), 25, 5, 100)

	syarat := []string{"1 = 1"}
	nilai := []any{}
	p := &penomoran{}

	if status != "" {
		if !statusNotifikasiSah(status) {
			kirimGalat(w, http.StatusUnprocessableEntity, "Status notifikasi tidak dikenal.")
			return
		}
		syarat = append(syarat, "n.status = "+p.berikut())
		nilai = append(nilai, status)
	}
	where := strings.Join(syarat, " AND ")

	var total int
	if err := a.db.QueryRow(
		"SELECT COUNT(*) FROM notifikasi n WHERE "+where, nilai...).Scan(&total); err != nil {
		a.galatServer(w, "menghitung notifikasi", err)
		return
	}

	nilai = append(nilai, perHalaman, (halaman-1)*perHalaman)
	baris, err := a.db.Query(
		`SELECT n.id, n.pendaftar_id, COALESCE(p.nama_lengkap, ''), COALESCE(p.no_registrasi, ''),
		        n.kanal, n.tujuan, n.jenis, n.pesan, n.status, n.galat,
		        n.dikirim_pada, n.created_at
		 FROM notifikasi n
		 LEFT JOIN pendaftar p ON p.id = n.pendaftar_id
		 WHERE `+where+`
		 ORDER BY n.created_at DESC, n.id DESC
		 LIMIT `+p.berikut()+` OFFSET `+p.berikut(), nilai...)
	if err != nil {
		a.galatServer(w, "mengambil notifikasi", err)
		return
	}
	defer baris.Close()

	daftar := []Notifikasi{}
	for baris.Next() {
		var n Notifikasi
		var dikirim sql.NullTime
		if err := baris.Scan(&n.ID, &n.PendaftarID, &n.NamaPendaftar, &n.NoRegistrasi,
			&n.Kanal, &n.Tujuan, &n.Jenis, &n.Pesan, &n.Status, &n.Galat,
			&dikirim, &n.Dibuat); err != nil {
			a.galatServer(w, "membaca notifikasi", err)
			return
		}
		if dikirim.Valid {
			t := dikirim.Time.Format(time.RFC3339)
			n.DikirimPada = &t
		}
		n.TautanWa = tautanWa(n.Tujuan, n.Pesan)
		daftar = append(daftar, n)
	}
	if err := baris.Err(); err != nil {
		a.galatServer(w, "membaca notifikasi", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"data":        daftar,
		"total":       total,
		"halaman":     halaman,
		"per_halaman": perHalaman,
		// Frontend memakai ini untuk memilih kata pada tombolnya: "Kirim"
		// bila gateway aktif, "Buka WhatsApp" bila panitia mengirim sendiri.
		"gateway_aktif":  a.gatewayDisetel(),
		"pilihan_status": StatusNotifikasi,
	})
}

var StatusNotifikasi = []string{"Menunggu", "Terkirim", "Gagal", "Dibatalkan"}

func statusNotifikasiSah(s string) bool {
	for _, x := range StatusNotifikasi {
		if x == s {
			return true
		}
	}
	return false
}

// tautanWa menyusun alamat wa.me beserta pesan yang sudah terisi.
func tautanWa(tujuan, pesan string) string {
	if tujuan == "" {
		return ""
	}
	return "https://wa.me/" + tujuan + "?text=" + url.QueryEscape(pesan)
}

type permintaanKirimNotifikasi struct {
	// Pesan boleh diperbaiki panitia sebelum dikirim. Naskah otomatis tidak
	// selalu pas untuk keadaan tertentu.
	Pesan string `json:"pesan"`
}

// tanganiKirimNotifikasi mengirim satu notifikasi, atau menandainya terkirim
// bila panitia yang mengirim sendiri lewat WhatsApp.
func (a *Aplikasi) tanganiKirimNotifikasi(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanKirimNotifikasi
	if r.ContentLength > 0 && !bacaJSON(w, r, &p) {
		return
	}

	n, err := a.ambilNotifikasi(id)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Notifikasi tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil notifikasi", err)
		return
	}
	if n.Status == "Terkirim" {
		kirimGalat(w, http.StatusConflict, "Notifikasi ini sudah terkirim.")
		return
	}

	pesan := strings.TrimSpace(p.Pesan)
	if pesan == "" {
		pesan = n.Pesan
	}
	if len(pesan) > 4000 {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Pesan terlalu panjang. WhatsApp membatasi satu pesan sekitar 4.000 karakter.")
		return
	}
	if pesan != n.Pesan {
		if _, err := a.db.Exec("UPDATE notifikasi SET pesan = $1 WHERE id = $2", pesan, id); err != nil {
			a.galatServer(w, "menyimpan perubahan pesan", err)
			return
		}
	}

	saya := penggunaDari(r)

	// Tanpa gateway, server tidak mengirim apa pun. Yang dilakukan hanya
	// mencatat bahwa panitia sudah mengirimnya, dan mengembalikan tautannya.
	if !a.gatewayDisetel() {
		if err := a.tandaiTerkirim(id, saya.ID); err != nil {
			a.galatServer(w, "menandai notifikasi terkirim", err)
			return
		}
		kirimJSON(w, http.StatusOK, map[string]any{
			"pesan":      "Notifikasi ditandai sudah dikirim.",
			"tautan_wa":  tautanWa(n.Tujuan, pesan),
			"dikirim_ke": n.Tujuan,
		})
		return
	}

	if err := a.kirimLewatGateway(r.Context(), n.Tujuan, pesan); err != nil {
		if errTandai := a.tandaiGagal(id, err.Error()); errTandai != nil {
			a.log.Printf("gagal menandai notifikasi gagal: %v", errTandai)
		}
		a.log.Printf("gateway WhatsApp gagal untuk notifikasi %d: %v", id, err)
		kirimGalat(w, http.StatusBadGateway,
			"Gateway WhatsApp menolak pesan ini. Keterangannya tercatat pada daftar notifikasi.")
		return
	}
	if err := a.tandaiTerkirim(id, saya.ID); err != nil {
		a.galatServer(w, "menandai notifikasi terkirim", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"pesan":      "Notifikasi berhasil dikirim.",
		"dikirim_ke": n.Tujuan,
	})
}

func (a *Aplikasi) tanganiBatalkanNotifikasi(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	hasil, err := a.db.Exec(
		`UPDATE notifikasi SET status = 'Dibatalkan'
		 WHERE id = $1 AND status <> 'Terkirim'`, id)
	if err != nil {
		a.galatServer(w, "membatalkan notifikasi", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusConflict,
			"Notifikasi tidak ditemukan, atau sudah terkirim sehingga tidak dapat dibatalkan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Notifikasi dibatalkan."})
}

type permintaanNotifikasiBaru struct {
	PendaftarID int    `json:"pendaftar_id"`
	Jenis       string `json:"jenis"`
	Jadwal      string `json:"jadwal_ujian"`
	Catatan     string `json:"catatan"`
}

// tanganiBuatNotifikasi dipakai panitia untuk menyusun pesan di luar
// perubahan status, misalnya mengabarkan jadwal tes seleksi.
func (a *Aplikasi) tanganiBuatNotifikasi(w http.ResponseWriter, r *http.Request) {
	var p permintaanNotifikasiBaru
	if !bacaJSON(w, r, &p) {
		return
	}
	if _, ada := JenisNotifikasi[p.Jenis]; !ada {
		kirimGalat(w, http.StatusUnprocessableEntity, "Jenis notifikasi tidak dikenal.")
		return
	}

	var adaPendaftar int
	err := a.db.QueryRow("SELECT id FROM pendaftar WHERE id = $1", p.PendaftarID).Scan(&adaPendaftar)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Pendaftar tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil pendaftar", err)
		return
	}

	tambahan := map[string]string{
		"jadwal_ujian": strings.TrimSpace(p.Jadwal),
		"catatan":      strings.TrimSpace(p.Catatan),
	}
	if err := a.buatNotifikasi(p.PendaftarID, p.Jenis, tambahan); err != nil {
		a.galatServer(w, "menyusun notifikasi", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]string{
		"pesan": "Notifikasi disusun dan menunggu dikirim.",
	})
}

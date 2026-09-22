package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// Bentuk galat yang seragam untuk seluruh API, supaya frontend cukup
// menangani satu bentuk saja.
type Galat struct {
	Pesan  string            `json:"pesan"`
	Kolom  map[string]string `json:"kolom,omitempty"`
	Daftar []string          `json:"daftar,omitempty"`
}

func kirimJSON(w http.ResponseWriter, status int, isi any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if isi == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(isi); err != nil {
		log.Printf("gagal menulis respons JSON: %v", err)
	}
}

func kirimGalat(w http.ResponseWriter, status int, pesan string) {
	kirimJSON(w, status, Galat{Pesan: pesan})
}

// kirimGalatValidasi mengembalikan pesan per kolom sekaligus daftar ringkasnya,
// mengikuti cara versi PHP menampilkan galat formulir.
func kirimGalatValidasi(w http.ResponseWriter, v *Validasi) {
	kirimJSON(w, http.StatusUnprocessableEntity, Galat{
		Pesan:  "Data yang dikirim belum benar.",
		Kolom:  v.Kolom,
		Daftar: v.Daftar,
	})
}

func bacaJSON(w http.ResponseWriter, r *http.Request, tujuan any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(tujuan); err != nil {
		kirimGalat(w, http.StatusBadRequest, "Isi permintaan tidak dapat dibaca: "+err.Error())
		return false
	}
	return true
}

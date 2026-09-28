package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

/*
Pencocok pertanyaan berbantuan model bahasa.

BATASNYA DITENTUKAN DI SINI, BUKAN DI DALAM PERINTAHNYA. Model bahasa hanya
diminta MEMILIH satu nomor dari daftar pertanyaan yang sudah ditulis
sekolah. Ia tidak pernah menulis jawaban, tidak pernah melihat isi
jawabannya, dan jawabannya yang bukan angka dibuang. Apa pun yang
dikatakannya di luar itu tidak dapat sampai ke pengunjung, sebab yang
dikirim balik cuma nomor — teks jawabannya diambil frontend dari
pengetahuannya sendiri.

Itu yang membedakan rancangan ini dengan chatbot biasa: risiko terbesar
model bahasa pada ranah ini adalah mengarang tanggal penutupan atau biaya
dengan nada meyakinkan, dan di sini ia tidak punya jalan untuk itu.

Dijalankan HANYA sebagai cadangan, setelah pencocok setempat menyerah.
Akibatnya biayanya jatuh pada pertanyaan yang memang tidak tertangani saja,
bukan pada setiap pertanyaan.

Mati secara bawaan. Tanpa LLM_URL, rutenya menjawab 503 dan kotak tanya
kembali berperilaku seperti sebelumnya.
*/

// Sengaja mengikuti bentuk /v1/chat/completions yang dipakai bersama banyak
// penyedia, termasuk yang dapat dijalankan sendiri di komputer sekolah
// (Ollama, llama.cpp). Sekolah dengan anggaran nol tetap punya jalan, dan
// pertanyaan pengunjung tidak harus keluar ke mana pun.
type pesanLlm struct {
	Peran string `json:"role"`
	Isi   string `json:"content"`
}

type permintaanLlm struct {
	Model    string     `json:"model"`
	Pesan    []pesanLlm `json:"messages"`
	MaksTkn  int        `json:"max_tokens"`
	Suhu     float64    `json:"temperature"`
	Aliran   bool       `json:"stream"`
	Berhenti []string   `json:"stop,omitempty"`
}

type jawabanLlm struct {
	Pilihan []struct {
		Pesan struct {
			Isi string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

const perintahPencocok = `Anda adalah pencocok pertanyaan untuk situs PPDB sebuah SMA di Indonesia.

Di bawah ini daftar pertanyaan yang jawabannya SUDAH tersedia di situs itu, masing-masing bernomor. Anda menerima satu pertanyaan dari pengunjung, dan tugas Anda HANYA memilih satu nomor yang maksudnya paling sama.

Aturan:
- Jawab dengan SATU ANGKA saja, tanpa kata lain, tanpa tanda baca.
- Jawab 0 bila tidak ada satu pun yang maksudnya sama. Menjawab 0 jauh lebih baik daripada memaksakan nomor yang kurang tepat.
- Jangan menjawab pertanyaannya. Jangan menjelaskan. Jangan menambahkan apa pun.`

// batasPilihan menjaga perintahnya tetap pendek. Pengetahuan situs ini
// berkisar tiga puluhan butir; batas ini memberi ruang tumbuh tanpa
// membuat satu permintaan menjadi mahal.
const batasPilihan = 80

func (a *Aplikasi) pencocokAiAktif() bool { return a.cfg.LlmURL != "" }

func (a *Aplikasi) tanganiCocokkanTanya(w http.ResponseWriter, r *http.Request) {
	if !a.pencocokAiAktif() {
		kirimGalat(w, http.StatusServiceUnavailable, "Pencocok AI tidak aktif.")
		return
	}

	var badan struct {
		Pertanyaan string `json:"pertanyaan"`
		Pilihan    []struct {
			ID    string `json:"id"`
			Tanya string `json:"tanya"`
		} `json:"pilihan"`
	}
	if !bacaJSON(w, r, &badan) {
		return
	}

	tanya := strings.TrimSpace(badan.Pertanyaan)
	if tanya == "" || len(badan.Pilihan) == 0 {
		kirimGalat(w, http.StatusBadRequest, "Pertanyaan dan pilihan wajib diisi.")
		return
	}
	if len(tanya) > 300 {
		tanya = potongTeks(tanya, 300)
	}
	if len(badan.Pilihan) > batasPilihan {
		badan.Pilihan = badan.Pilihan[:batasPilihan]
	}

	var daftar strings.Builder
	for i, p := range badan.Pilihan {
		fmt.Fprintf(&daftar, "%d. %s\n", i+1, potongTeks(strings.TrimSpace(p.Tanya), 200))
	}

	isi, err := a.tanyaLlm(r.Context(),
		perintahPencocok+"\n\nDaftar pertanyaan:\n"+daftar.String(),
		"Pertanyaan pengunjung: "+tanya)
	if err != nil {
		a.log.Printf("galat saat mencocokkan lewat model bahasa: %v", err)
		// Bukan galat pengunjung, dan kotak tanya sudah punya perilaku
		// cadangannya sendiri. Dijawab 200 dengan hasil kosong.
		kirimJSON(w, http.StatusOK, map[string]any{"id": nil})
		return
	}

	// Hanya angka yang diterima. Apa pun selain itu dibuang — termasuk
	// kalimat, penjelasan, dan nomor di luar daftar.
	nomor, err := strconv.Atoi(strings.TrimSpace(isi))
	if err != nil || nomor < 1 || nomor > len(badan.Pilihan) {
		kirimJSON(w, http.StatusOK, map[string]any{"id": nil})
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"id": badan.Pilihan[nomor-1].ID})
}

func (a *Aplikasi) tanyaLlm(induk context.Context, perintah, pertanyaan string) (string, error) {
	ctx, batal := context.WithTimeout(induk, 10*time.Second)
	defer batal()

	badan, err := json.Marshal(permintaanLlm{
		Model: a.cfg.LlmModel,
		Pesan: []pesanLlm{
			{Peran: "system", Isi: perintah},
			{Peran: "user", Isi: pertanyaan},
		},
		// Cukup untuk beberapa angka. Batas sekecil ini sekaligus menjadi
		// penjaga biaya: jawaban panjang tidak mungkin terbit.
		MaksTkn: 8,
		Suhu:    0,
		Aliran:  false,
	})
	if err != nil {
		return "", err
	}

	permintaan, err := http.NewRequestWithContext(ctx, http.MethodPost, a.cfg.LlmURL, bytes.NewReader(badan))
	if err != nil {
		return "", err
	}
	permintaan.Header.Set("Content-Type", "application/json")
	if a.cfg.LlmKunci != "" {
		permintaan.Header.Set("Authorization", "Bearer "+a.cfg.LlmKunci)
	}

	klien := &http.Client{Timeout: 12 * time.Second}
	jawaban, err := klien.Do(permintaan)
	if err != nil {
		return "", err
	}
	defer jawaban.Body.Close()

	cuplikan, _ := io.ReadAll(io.LimitReader(jawaban.Body, 8000))
	if jawaban.StatusCode < 200 || jawaban.StatusCode > 299 {
		return "", fmt.Errorf("penyedia menjawab %d: %s", jawaban.StatusCode, strings.TrimSpace(string(cuplikan)))
	}

	var hasil jawabanLlm
	if err := json.Unmarshal(cuplikan, &hasil); err != nil {
		return "", err
	}
	if len(hasil.Pilihan) == 0 {
		return "", fmt.Errorf("jawaban penyedia tidak memuat pilihan")
	}
	return hasil.Pilihan[0].Pesan.Isi, nil
}

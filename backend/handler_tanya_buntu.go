package main

import (
	"net/http"
	"strconv"
	"strings"
	"unicode"
)

/*
Pertanyaan yang tidak terjawab kotak "Tanya cepat".

Kotak itu menjawab dari Tanya Jawab yang ditulis panitia dan dari data
sekolah. Bila tidak menemukan, ia mengaku tidak tahu — dan sampai sekarang
pengakuan itu hilang begitu saja.

Padahal di situlah keterangannya. Pertanyaan yang tidak terjawab adalah
daftar persis dari apa yang ingin diketahui orang tua tetapi belum
disediakan sekolah. Menebaknya dari kursi pengembang tidak pernah seakurat
membaca apa yang benar-benar diketik orang: perbaikan padanan kata yang
dikerjakan sejauh ini semuanya berasal dari menebak, dan setiap kali diukur
selalu ada bentuk yang tidak terpikir.

YANG DISIMPAN HANYA TEKS PERTANYAANNYA. Tidak ada alamat IP, tidak ada
pengenal peramban, tidak ada apa pun yang menunjuk orangnya. Pembatas laju
tetap memakai alamat IP seperti rute publik lain, tetapi alamat itu tidak
pernah ikut tersimpan.
*/

// batasTanyaBuntu menjaga tabelnya tidak dipenuhi kiriman sampah. Nilainya
// sama dengan panjang kolom pertanyaan pada tabel faq, sebab pertanyaan di
// sini memang calon isi tabel itu.
const batasTanyaBuntu = 300

// kunciTanya membakukan pertanyaan supaya yang sama tidak tercatat berkali-
// kali. Huruf dikecilkan, tanda baca dibuang, dan spasi berlebih dirapatkan,
// sehingga "Kapan dibuka?" dan "kapan  dibuka" terhitung satu.
func kunciTanya(teks string) string {
	var b strings.Builder
	spasi := false
	for _, r := range strings.ToLower(teks) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			if spasi && b.Len() > 0 {
				b.WriteRune(' ')
			}
			spasi = false
			b.WriteRune(r)
		default:
			spasi = true
		}
	}
	return b.String()
}

// tanganiCatatTanyaBuntu menerima satu pertanyaan yang tidak terjawab.
//
// Jawabannya selalu 204, bahkan saat kirimannya ditolak. Ini pencatatan di
// latar belakang, bukan perintah pengunjung: kotak tanya tidak boleh
// menampilkan galat gara-gara pencatatan gagal, sebab pengunjung tidak
// meminta apa pun dicatat dan tidak dapat berbuat apa-apa atas kegagalannya.
func (a *Aplikasi) tanganiCatatTanyaBuntu(w http.ResponseWriter, r *http.Request) {
	var badan struct {
		Pertanyaan string `json:"pertanyaan"`
	}
	if !bacaJSON(w, r, &badan) {
		return
	}

	teks := strings.TrimSpace(badan.Pertanyaan)
	if len(teks) > batasTanyaBuntu {
		teks = potongTeks(teks, batasTanyaBuntu)
	}
	kunci := kunciTanya(teks)

	// Pertanyaan sependek satu kata tidak menerangkan apa pun kepada
	// panitia, dan yang kosong jelas tidak. Keduanya dibuang diam-diam.
	if len([]rune(kunci)) < 4 || !strings.Contains(kunci, " ") {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	_, err := a.db.Exec(
		`INSERT INTO tanya_buntu (kunci, pertanyaan) VALUES ($1, $2)
		 ON CONFLICT (kunci) DO UPDATE
		   SET jumlah = tanya_buntu.jumlah + 1,
		       terakhir = now(),
		       ditangani = false`,
		kunci, teks)
	if err != nil {
		// Dicatat di log server, tidak dilaporkan ke pengunjung.
		a.log.Printf("galat saat mencatat pertanyaan tak terjawab: %v", err)
	}
	w.WriteHeader(http.StatusNoContent)
}

type TanyaBuntu struct {
	ID         int    `json:"id"`
	Pertanyaan string `json:"pertanyaan"`
	Jumlah     int    `json:"jumlah"`
	Ditangani  bool   `json:"ditangani"`
	Terakhir   string `json:"terakhir"`
}

func (a *Aplikasi) tanganiDaftarTanyaBuntu(w http.ResponseWriter, r *http.Request) {
	// Yang sudah ditangani tetap dapat dilihat, tetapi tidak lebih dulu:
	// gunanya sebagai catatan bahwa pertanyaan itu pernah masuk.
	tampilkanSemua := r.URL.Query().Get("semua") == "1"

	baris, err := a.db.Query(
		`SELECT id, pertanyaan, jumlah, ditangani, terakhir
		   FROM tanya_buntu
		  WHERE ($1 OR NOT ditangani)
		  ORDER BY ditangani, jumlah DESC, terakhir DESC
		  LIMIT 200`, tampilkanSemua)
	if err != nil {
		a.galatServer(w, "mengambil pertanyaan tak terjawab", err)
		return
	}
	defer baris.Close()

	daftar := []TanyaBuntu{}
	for baris.Next() {
		var t TanyaBuntu
		if err := baris.Scan(&t.ID, &t.Pertanyaan, &t.Jumlah, &t.Ditangani, &t.Terakhir); err != nil {
			a.galatServer(w, "membaca pertanyaan tak terjawab", err)
			return
		}
		daftar = append(daftar, t)
	}

	var belum int
	_ = a.db.QueryRow("SELECT count(*) FROM tanya_buntu WHERE NOT ditangani").Scan(&belum)

	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "belum_ditangani": belum})
}

// tanganiTandaiTanyaBuntu menandai satu pertanyaan sudah ditangani.
//
// Tidak menghapusnya. Pertanyaan yang sudah dijawab lewat Tanya Jawab tetap
// berguna sebagai catatan: bila kelak muncul lagi dengan jumlah bertambah,
// berarti jawabannya belum ketemu pengunjung, dan yang perlu diperbaiki
// letak jawabannya, bukan isinya. Karena itu kirimannya yang baru juga
// mengembalikan tandanya menjadi belum ditangani.
func (a *Aplikasi) tanganiTandaiTanyaBuntu(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		kirimGalat(w, http.StatusBadRequest, "Nomor pertanyaan tidak sah.")
		return
	}
	if _, err := a.db.Exec("UPDATE tanya_buntu SET ditangani = true WHERE id = $1", id); err != nil {
		a.galatServer(w, "menandai pertanyaan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"pesan": "Pertanyaan ditandai sudah ditangani."})
}

func (a *Aplikasi) tanganiHapusTanyaBuntu(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		kirimGalat(w, http.StatusBadRequest, "Nomor pertanyaan tidak sah.")
		return
	}
	if _, err := a.db.Exec("DELETE FROM tanya_buntu WHERE id = $1", id); err != nil {
		a.galatServer(w, "menghapus pertanyaan", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]any{"pesan": "Pertanyaan dihapus."})
}

package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"net/http"
	"sort"
	"strings"
)

/* ==================================================================
   Mata pelajaran baku dan komposisi soal per paket

   Mata pelajaran dulu diketik bebas, sehingga "Matematika", "MATEMATIKA",
   dan "mtk" menjadi tiga kelompok yang berbeda. Komposisi paket ("15 soal
   Matematika") tidak mungkin dihitung di atas nama yang tidak seragam,
   karena itu daftarnya kini tetap dan urutannya juga menjadi urutan bagian
   soal yang dilihat peserta.
   ================================================================== */

// DaftarMapel adalah mata pelajaran yang boleh dipakai di bank soal, sesuai
// urutan bagiannya pada lembar ujian.
var DaftarMapel = []string{
	"Matematika",
	"Bahasa Indonesia",
	"Bahasa Inggris",
	"IPA",
	"IPS",
	"Pendidikan Agama",
	"Pengetahuan Umum",
	"Tes Potensi Akademik",
}

// sebutanMapel memetakan tulisan yang lazim diketik panitia di Excel ke nama
// bakunya. Kuncinya sudah melalui kunciMapel.
var sebutanMapel = map[string]string{
	"mtk": "Matematika", "mat": "Matematika", "math": "Matematika",
	"b indonesia": "Bahasa Indonesia", "bindo": "Bahasa Indonesia",
	"b indo": "Bahasa Indonesia", "bhs indonesia": "Bahasa Indonesia",
	"b inggris": "Bahasa Inggris", "bing": "Bahasa Inggris",
	"bhs inggris": "Bahasa Inggris", "english": "Bahasa Inggris",
	"ilmu pengetahuan alam": "IPA", "sains": "IPA",
	"ilmu pengetahuan sosial": "IPS",
	"agama":                   "Pendidikan Agama", "pai": "Pendidikan Agama",
	"umum": "Pengetahuan Umum",
	"tpa":  "Tes Potensi Akademik",
}

func kunciMapel(s string) string {
	s = strings.ToLower(strings.ReplaceAll(s, ".", " "))
	return strings.Join(strings.Fields(s), " ")
}

// mapelBaku mengembalikan nama baku dari tulisan apa pun yang dikenali, atau
// "" bila tidak dikenali.
func mapelBaku(s string) string {
	k := kunciMapel(s)
	if k == "" {
		return ""
	}
	for _, m := range DaftarMapel {
		if kunciMapel(m) == k {
			return m
		}
	}
	return sebutanMapel[k]
}

func urutanMapel(m string) int {
	for i, n := range DaftarMapel {
		if n == m {
			return i
		}
	}
	return len(DaftarMapel)
}

// KomposisiMapel adalah jumlah soal satu mata pelajaran di dalam paket.
type KomposisiMapel struct {
	MataPelajaran string `json:"mata_pelajaran"`
	Jumlah        int    `json:"jumlah"`
}

type penanya interface {
	Query(string, ...any) (*sql.Rows, error)
}

// stokMapel menghitung soal aktif per mata pelajaran.
func stokMapel(q penanya) (map[string]int, error) {
	baris, err := q.Query(
		"SELECT mata_pelajaran, COUNT(*) FROM soal WHERE aktif = true GROUP BY 1")
	if err != nil {
		return nil, err
	}
	defer baris.Close()
	stok := map[string]int{}
	for baris.Next() {
		var m string
		var n int
		if err := baris.Scan(&m, &n); err != nil {
			return nil, err
		}
		stok[m] = n
	}
	return stok, baris.Err()
}

// komposisiPaket mengambil komposisi seluruh paket, dikelompokkan per paket
// dan diurutkan sesuai DaftarMapel. Paket tanpa komposisi tidak muncul.
func komposisiPaket(q penanya, paketID int) (map[int][]KomposisiMapel, error) {
	kueri := "SELECT paket_id, mata_pelajaran, jumlah FROM paket_komposisi"
	arg := []any{}
	if paketID > 0 {
		kueri += " WHERE paket_id = $1"
		arg = append(arg, paketID)
	}
	baris, err := q.Query(kueri, arg...)
	if err != nil {
		return nil, err
	}
	defer baris.Close()
	hasil := map[int][]KomposisiMapel{}
	for baris.Next() {
		var id int
		var k KomposisiMapel
		if err := baris.Scan(&id, &k.MataPelajaran, &k.Jumlah); err != nil {
			return nil, err
		}
		hasil[id] = append(hasil[id], k)
	}
	for id := range hasil {
		sort.Slice(hasil[id], func(i, j int) bool {
			return urutanMapel(hasil[id][i].MataPelajaran) < urutanMapel(hasil[id][j].MataPelajaran)
		})
	}
	return hasil, baris.Err()
}

// periksaKomposisi membakukan dan memeriksa komposisi, lalu mengembalikan
// jumlah soalnya. Baris berjumlah nol dibuang, sebab formulir mengirim semua
// mata pelajaran termasuk yang tidak dipakai.
func periksaKomposisi(v *Validasi, daftar []KomposisiMapel) ([]KomposisiMapel, int) {
	bersih := []KomposisiMapel{}
	sudah := map[string]bool{}
	total := 0
	for _, k := range daftar {
		if k.Jumlah == 0 {
			continue
		}
		m := mapelBaku(k.MataPelajaran)
		switch {
		case m == "":
			v.tambah("komposisi", fmt.Sprintf("Mata pelajaran %q tidak dikenal.", k.MataPelajaran))
			continue
		case sudah[m]:
			v.tambah("komposisi", fmt.Sprintf("%s tercantum dua kali.", m))
			continue
		case k.Jumlah < 0 || k.Jumlah > 200:
			v.tambah("komposisi", fmt.Sprintf("Jumlah soal %s harus antara 1 dan 200.", m))
			continue
		}
		sudah[m] = true
		total += k.Jumlah
		bersih = append(bersih, KomposisiMapel{m, k.Jumlah})
	}
	return bersih, total
}

// kekuranganStok menyusun pesan untuk setiap mata pelajaran yang soal aktifnya
// kurang dari yang diminta komposisi.
func kekuranganStok(komposisi []KomposisiMapel, stok map[string]int) []string {
	kurang := []string{}
	for _, k := range komposisi {
		if stok[k.MataPelajaran] < k.Jumlah {
			kurang = append(kurang, fmt.Sprintf("%s baru %d soal aktif, diminta %d",
				k.MataPelajaran, stok[k.MataPelajaran], k.Jumlah))
		}
	}
	return kurang
}

/* ---------------- impor soal dari Excel ---------------- */

type permintaanImporSoal struct {
	Csv   string `json:"csv"`
	Aktif bool   `json:"aktif"`
}

/*
tanganiImporSoal memasukkan banyak soal sekaligus dari tabel yang ditempel
atau diunggah dari Excel. Kolomnya:

	mata_pelajaran; pertanyaan; pilihan_a; pilihan_b; pilihan_c; pilihan_d;
	pilihan_e; jawaban; pembahasan

Berbeda dari impor sekolah, satu baris yang salah MENGGAGALKAN seluruh impor.
Soal yang separuh masuk sulit dibereskan: panitia harus mencari mana yang
sudah ada agar tidak tergandakan saat berkasnya diimpor ulang. Lebih mudah
membetulkan baris yang disebut lalu mengimpor ulang semuanya.
*/
func (a *Aplikasi) tanganiImporSoal(w http.ResponseWriter, r *http.Request) {
	var p permintaanImporSoal
	if !bacaJSON(w, r, &p) {
		return
	}
	isi := strings.TrimPrefix(strings.TrimSpace(p.Csv), "\xef\xbb\xbf")
	if isi == "" {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Tempelkan atau pilih dulu berkas soalnya.")
		return
	}
	if len(isi) > 4<<20 {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Berkas soal terlalu besar. Bagi menjadi beberapa kali impor.")
		return
	}

	barisPertama := isi
	if i := strings.IndexAny(isi, "\r\n"); i >= 0 {
		barisPertama = isi[:i]
	}
	pembaca := csv.NewReader(strings.NewReader(isi))
	pembaca.Comma = pemisahCsv(barisPertama)
	pembaca.FieldsPerRecord = -1
	pembaca.TrimLeadingSpace = true
	pembaca.LazyQuotes = true
	rekaman, err := pembaca.ReadAll()
	if err != nil {
		kirimGalat(w, http.StatusUnprocessableEntity,
			"Berkasnya tidak dapat dibaca sebagai tabel: "+err.Error())
		return
	}

	sah := []permintaanSoal{}
	masalah := []string{}
	for i, rek := range rekaman {
		ambil := func(k int) string {
			if k < len(rek) {
				return strings.TrimSpace(rek[k])
			}
			return ""
		}
		if strings.TrimSpace(strings.Join(rek, "")) == "" {
			continue
		}
		// Baris kepala tabel dari templat.
		if i == 0 && strings.HasPrefix(strings.ReplaceAll(kunciMapel(ambil(0)), "_", " "), "mata pelajaran") {
			continue
		}
		s := permintaanSoal{
			MataPelajaran: ambil(0), Pertanyaan: ambil(1),
			PilihanA: ambil(2), PilihanB: ambil(3), PilihanC: ambil(4),
			PilihanD: ambil(5), PilihanE: ambil(6), Jawaban: ambil(7),
			Pembahasan: ambil(8), Aktif: p.Aktif,
		}
		if v := s.periksa(); v.bermasalah() {
			masalah = append(masalah, fmt.Sprintf("Baris %d: %s", i+1, strings.Join(v.Daftar, " ")))
			continue
		}
		sah = append(sah, s)
	}

	if len(masalah) > 0 {
		if len(masalah) > 15 {
			lebih := len(masalah) - 15
			masalah = append(masalah[:15], fmt.Sprintf("... dan %d baris lain.", lebih))
		}
		kirimJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"pesan":  "Belum ada soal yang dimasukkan. Betulkan baris berikut, lalu impor ulang seluruhnya.",
			"daftar": masalah,
		})
		return
	}
	if len(sah) == 0 {
		kirimGalat(w, http.StatusUnprocessableEntity, "Tidak ada satu baris soal pun di dalam berkas.")
		return
	}

	tx, err := a.db.Begin()
	if err != nil {
		a.galatServer(w, "memulai impor soal", err)
		return
	}
	defer tx.Rollback()

	perMapel := map[string]int{}
	for _, s := range sah {
		if _, err := tx.Exec(
			`INSERT INTO soal (mata_pelajaran, pertanyaan, pilihan_a, pilihan_b,
			                   pilihan_c, pilihan_d, pilihan_e, jawaban, pembahasan, aktif)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			s.MataPelajaran, s.Pertanyaan, s.PilihanA, s.PilihanB, s.PilihanC,
			s.PilihanD, s.PilihanE, s.Jawaban, s.Pembahasan, s.Aktif); err != nil {
			a.galatServer(w, "menyimpan soal impor", err)
			return
		}
		perMapel[s.MataPelajaran]++
	}
	if err := tx.Commit(); err != nil {
		a.galatServer(w, "menyelesaikan impor soal", err)
		return
	}

	rincian := []string{}
	for _, m := range DaftarMapel {
		if n := perMapel[m]; n > 0 {
			rincian = append(rincian, fmt.Sprintf("%s %d", m, n))
		}
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"pesan": fmt.Sprintf("%d soal berhasil diimpor (%s).", len(sah), strings.Join(rincian, ", ")),
		"masuk": len(sah),
	})
}

// simpanKomposisi mengganti seluruh komposisi satu paket.
func simpanKomposisi(tx *sql.Tx, paketID int, komposisi []KomposisiMapel) error {
	if _, err := tx.Exec("DELETE FROM paket_komposisi WHERE paket_id = $1", paketID); err != nil {
		return err
	}
	for _, k := range komposisi {
		if _, err := tx.Exec(
			"INSERT INTO paket_komposisi (paket_id, mata_pelajaran, jumlah) VALUES ($1, $2, $3)",
			paketID, k.MataPelajaran, k.Jumlah); err != nil {
			return err
		}
	}
	return nil
}

// NilaiMapel adalah perolehan satu peserta pada satu mata pelajaran.
type NilaiMapel struct {
	MataPelajaran string  `json:"mata_pelajaran"`
	Benar         int     `json:"benar"`
	Soal          int     `json:"soal"`
	Skor          float64 `json:"skor"`
}

// nilaiPerMapel menghitung perolehan per mata pelajaran setiap sesi pada satu
// paket. Mata pelajarannya dibaca dari soal, sehingga paket lama tanpa
// komposisi pun tetap mendapat rinciannya.
func nilaiPerMapel(q penanya, paketID int) (map[int][]NilaiMapel, []string, error) {
	baris, err := q.Query(
		`SELECT ss.sesi_id, so.mata_pelajaran, COUNT(*),
		        COUNT(*) FILTER (WHERE ss.benar)
		 FROM sesi_soal ss
		 JOIN soal so ON so.id = ss.soal_id
		 JOIN sesi_ujian s ON s.id = ss.sesi_id
		 WHERE s.paket_id = $1
		 GROUP BY 1, 2`, paketID)
	if err != nil {
		return nil, nil, err
	}
	defer baris.Close()
	hasil := map[int][]NilaiMapel{}
	ada := map[string]bool{}
	for baris.Next() {
		var sesi int
		var n NilaiMapel
		if err := baris.Scan(&sesi, &n.MataPelajaran, &n.Soal, &n.Benar); err != nil {
			return nil, nil, err
		}
		if n.Soal > 0 {
			n.Skor = float64(n.Benar) / float64(n.Soal) * 100
		}
		hasil[sesi] = append(hasil[sesi], n)
		ada[n.MataPelajaran] = true
	}
	mapel := []string{}
	for m := range ada {
		mapel = append(mapel, m)
	}
	sort.Slice(mapel, func(i, j int) bool {
		if urutanMapel(mapel[i]) != urutanMapel(mapel[j]) {
			return urutanMapel(mapel[i]) < urutanMapel(mapel[j])
		}
		return mapel[i] < mapel[j]
	})
	for sesi := range hasil {
		sort.Slice(hasil[sesi], func(i, j int) bool {
			return urutanMapel(hasil[sesi][i].MataPelajaran) < urutanMapel(hasil[sesi][j].MataPelajaran)
		})
	}
	return hasil, mapel, baris.Err()
}

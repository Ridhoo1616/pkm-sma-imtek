package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

/* ==================================================================
   Surat keluar bernomor otomatis

   Yang ditulis sekolah sendiri: FORMAT nomornya, perihal, tujuan, dan
   naskahnya. Yang dikerjakan sistem: nomor urutnya. Setiap jenis surat
   punya urutan sendiri, dan urutan itu kembali ke 1 menurut pilihan
   sekolah — setiap tahun, setiap bulan, atau tidak pernah — dihitung dari
   TANGGAL SURAT yang diisi, bukan dari tanggal hari ini. Surat bertanggal
   Desember yang baru diketik Januari tetap mendapat nomor Desember.

   Format nomor memakai penanda dalam kurung kurawal:
     {urut}          nomor urut apa adanya: 7
     {urut:3}        nomor urut berisi nol di depan: 007 (lebar 1-6)
     {kode}          kode jenis surat, misalnya UND
     {bulan}         bulan dua angka: 09
     {bulan_romawi}  bulan angka Romawi: IX
     {tahun}         tahun empat angka: 2026
     {tahun_ajaran}  tahun ajaran PPDB dari pengaturan: 2027/2028
   Contoh: "{urut:3}/{kode}/SMA-IMTEK/{bulan_romawi}/{tahun}"
           menjadi "007/UND/SMA-IMTEK/IX/2026".

   Nomor yang sudah terbit tidak pernah berubah. Surat yang keliru
   DIBATALKAN, bukan dihapus, supaya buku agendanya tidak berlubang; hanya
   nomor paling akhir pada periodenya yang boleh dihapus, sebab menghapusnya
   tidak meninggalkan lubang.
   ================================================================== */

var AturUlangSurat = []string{"tahunan", "bulanan", "tidak"}

type JenisSurat struct {
	ID                   int    `json:"id"`
	Nama                 string `json:"nama"`
	Kode                 string `json:"kode"`
	FormatNomor          string `json:"format_nomor"`
	AturUlang            string `json:"atur_ulang"`
	UntukPendaftar       bool   `json:"untuk_pendaftar"`
	TampilDiCekStatus    bool   `json:"tampil_di_cek_status"`
	PerihalBawaan        string `json:"perihal_bawaan"`
	TujuanBawaan         string `json:"tujuan_bawaan"`
	IsiBawaan            string `json:"isi_bawaan"`
	PenandaTanganNama    string `json:"penanda_tangan_nama"`
	PenandaTanganJabatan string `json:"penanda_tangan_jabatan"`
	PenandaTanganNIP     string `json:"penanda_tangan_nip"`
	Aktif                bool   `json:"aktif"`
	Urutan               int    `json:"urutan"`
	JumlahSurat          int    `json:"jumlah_surat"`
}

type Surat struct {
	ID            int    `json:"id"`
	JenisID       int    `json:"jenis_id"`
	NamaJenis     string `json:"nama_jenis"`
	Periode       string `json:"periode"`
	NomorUrut     int    `json:"nomor_urut"`
	NomorSurat    string `json:"nomor_surat"`
	TanggalSurat  string `json:"tanggal_surat"`
	Perihal       string `json:"perihal"`
	Tujuan        string `json:"tujuan"`
	Lampiran      string `json:"lampiran"`
	Isi           string `json:"isi"`
	PendaftarID   *int   `json:"pendaftar_id"`
	NamaPendaftar string `json:"nama_pendaftar"`
	NoRegistrasi  string `json:"no_registrasi"`
	Dibatalkan    bool   `json:"dibatalkan"`
	AlasanBatal   string `json:"alasan_batal"`
	DibuatOleh    string `json:"dibuat_oleh"`
	Dibuat        string `json:"dibuat"`
}

/* ---------------- format nomor ---------------- */

var polaPenandaNomor = regexp.MustCompile(`\{([a-z_]+)(?::(\d+))?\}`)

var romawiBulan = [...]string{"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}

// periksaFormatNomor menolak format yang akan menghasilkan nomor kembar atau
// memuat penanda yang tidak dikenal. Pesannya menyebut apa yang kurang,
// sebab yang mengisinya panitia, bukan pemrogram.
func periksaFormatNomor(format, aturUlang string) string {
	if strings.TrimSpace(format) == "" {
		return "Format nomor wajib diisi."
	}
	ada := map[string]bool{}
	for _, m := range polaPenandaNomor.FindAllStringSubmatch(format, -1) {
		switch m[1] {
		case "urut":
			if m[2] != "" {
				if n, _ := strconv.Atoi(m[2]); n < 1 || n > 6 {
					return "Lebar {urut:N} harus antara 1 dan 6, misalnya {urut:3}."
				}
			}
		case "kode", "bulan", "bulan_romawi", "tahun", "tahun_ajaran":
		default:
			return "Penanda {" + m[1] + "} tidak dikenal. Yang tersedia: {urut}, {urut:3}, {kode}, {bulan}, {bulan_romawi}, {tahun}, {tahun_ajaran}."
		}
		ada[m[1]] = true
	}
	if !ada["urut"] {
		return "Format nomor wajib memuat {urut} atau {urut:3}; tanpa itu setiap surat bernomor sama."
	}
	// Urutan yang kembali ke 1 membuat nomor 001 muncul lagi tiap periode.
	// Tanpa penanda periodenya, nomor surat tahun ini dan tahun lalu kembar.
	if aturUlang == "tahunan" && !ada["tahun"] {
		return "Urutan kembali ke 1 setiap tahun, jadi format nomor wajib memuat {tahun}; tanpa itu nomor tahun ini sama dengan tahun lalu."
	}
	if aturUlang == "bulanan" && (!ada["tahun"] || !(ada["bulan"] || ada["bulan_romawi"])) {
		return "Urutan kembali ke 1 setiap bulan, jadi format nomor wajib memuat {tahun} dan {bulan} atau {bulan_romawi}."
	}
	return ""
}

// periodeSurat menentukan rentang tempat nomor urut berlaku.
func periodeSurat(aturUlang string, t time.Time) string {
	switch aturUlang {
	case "bulanan":
		return t.Format("2006-01")
	case "tidak":
		return "-"
	default:
		return t.Format("2006")
	}
}

// susunNomor mengisi format nomor dengan nilai sebenarnya.
func susunNomor(format string, urut int, kode string, t time.Time, tahunAjaran string) string {
	return polaPenandaNomor.ReplaceAllStringFunc(format, func(p string) string {
		m := polaPenandaNomor.FindStringSubmatch(p)
		switch m[1] {
		case "urut":
			if m[2] != "" {
				lebar, _ := strconv.Atoi(m[2])
				return fmt.Sprintf("%0*d", lebar, urut)
			}
			return strconv.Itoa(urut)
		case "kode":
			return kode
		case "bulan":
			return fmt.Sprintf("%02d", int(t.Month()))
		case "bulan_romawi":
			return romawiBulan[t.Month()-1]
		case "tahun":
			return strconv.Itoa(t.Year())
		case "tahun_ajaran":
			return tahunAjaran
		}
		return p
	})
}

/* ---------------- naskah berpenanda ---------------- */

// PenandaNaskah adalah penanda yang boleh dipakai pada perihal, tujuan, dan
// isi bawaan jenis surat. Diisi SEKALI saat surat dibuat, lalu naskahnya
// tersimpan apa adanya dan dapat disunting.
var PenandaNaskah = []string{
	"nomor_surat", "tanggal_surat", "nama_sekolah", "tahun_ajaran",
	"nama_lengkap", "no_registrasi", "nisn", "jalur", "peminatan", "sekolah_asal", "status",
}

var polaPenandaNaskah = regexp.MustCompile(`\{([a-z_]+)\}`)

func isiNaskah(teks string, nilai map[string]string) string {
	return polaPenandaNaskah.ReplaceAllStringFunc(teks, func(p string) string {
		if v, ada := nilai[p[1:len(p)-1]]; ada {
			return v
		}
		return p
	})
}

func periksaPenandaNaskah(teks string) string {
	for _, m := range polaPenandaNaskah.FindAllStringSubmatch(teks, -1) {
		dikenal := false
		for _, k := range PenandaNaskah {
			if m[1] == k {
				dikenal = true
				break
			}
		}
		if !dikenal {
			return "Penanda {" + m[1] + "} tidak dikenal. Yang tersedia: {" + strings.Join(PenandaNaskah, "}, {") + "}."
		}
	}
	return ""
}

/* ---------------- jenis surat ---------------- */

const kolomJenisSurat = `j.id, j.nama, j.kode, j.format_nomor, j.atur_ulang, j.untuk_pendaftar,
	j.tampil_di_cek_status, j.perihal_bawaan, j.tujuan_bawaan, j.isi_bawaan,
	j.penanda_tangan_nama, j.penanda_tangan_jabatan, j.penanda_tangan_nip, j.aktif, j.urutan`

func pindaiJenisSurat(s interface{ Scan(...any) error }, j *JenisSurat, tambahan ...any) error {
	return s.Scan(append([]any{&j.ID, &j.Nama, &j.Kode, &j.FormatNomor, &j.AturUlang, &j.UntukPendaftar,
		&j.TampilDiCekStatus, &j.PerihalBawaan, &j.TujuanBawaan, &j.IsiBawaan,
		&j.PenandaTanganNama, &j.PenandaTanganJabatan, &j.PenandaTanganNIP, &j.Aktif, &j.Urutan}, tambahan...)...)
}

func (a *Aplikasi) tanganiDaftarJenisSurat(w http.ResponseWriter, r *http.Request) {
	baris, err := a.db.Query(`SELECT ` + kolomJenisSurat + `,
	       (SELECT COUNT(*) FROM surat s WHERE s.jenis_id = j.id)
	  FROM jenis_surat j ORDER BY j.urutan, j.id`)
	if err != nil {
		a.galatServer(w, "mengambil jenis surat", err)
		return
	}
	defer baris.Close()
	daftar := []JenisSurat{}
	for baris.Next() {
		var j JenisSurat
		if err := pindaiJenisSurat(baris, &j, &j.JumlahSurat); err != nil {
			a.galatServer(w, "membaca jenis surat", err)
			return
		}
		daftar = append(daftar, j)
	}
	kirimJSON(w, http.StatusOK, map[string]any{
		"data": daftar, "atur_ulang": AturUlangSurat, "penanda_naskah": PenandaNaskah,
	})
}

type permintaanJenisSurat struct {
	Nama                 string `json:"nama"`
	Kode                 string `json:"kode"`
	FormatNomor          string `json:"format_nomor"`
	AturUlang            string `json:"atur_ulang"`
	UntukPendaftar       bool   `json:"untuk_pendaftar"`
	TampilDiCekStatus    bool   `json:"tampil_di_cek_status"`
	PerihalBawaan        string `json:"perihal_bawaan"`
	TujuanBawaan         string `json:"tujuan_bawaan"`
	IsiBawaan            string `json:"isi_bawaan"`
	PenandaTanganNama    string `json:"penanda_tangan_nama"`
	PenandaTanganJabatan string `json:"penanda_tangan_jabatan"`
	PenandaTanganNIP     string `json:"penanda_tangan_nip"`
	Aktif                bool   `json:"aktif"`
	Urutan               int    `json:"urutan"`
}

func (p *permintaanJenisSurat) periksa() *Validasi {
	v := validasiBaru()
	p.Nama = v.wajib("nama", "Nama jenis surat", p.Nama)
	p.Kode = strings.TrimSpace(p.Kode)
	p.FormatNomor = strings.TrimSpace(p.FormatNomor)
	v.panjangMaks("nama", "Nama jenis surat", p.Nama, 120)
	v.panjangMaks("kode", "Kode", p.Kode, 30)
	v.panjangMaks("format_nomor", "Format nomor", p.FormatNomor, 120)
	v.pilihan("atur_ulang", "Urutan kembali ke 1", p.AturUlang, AturUlangSurat)
	if pesan := periksaFormatNomor(p.FormatNomor, p.AturUlang); pesan != "" {
		v.tambah("format_nomor", pesan)
	}
	if strings.Contains(p.FormatNomor, "{kode}") && p.Kode == "" {
		v.tambah("kode", "Format nomor memakai {kode}, jadi kodenya wajib diisi.")
	}
	for kolom, teks := range map[string]string{
		"perihal_bawaan": p.PerihalBawaan, "tujuan_bawaan": p.TujuanBawaan, "isi_bawaan": p.IsiBawaan,
	} {
		if pesan := periksaPenandaNaskah(teks); pesan != "" {
			v.tambah(kolom, pesan)
		}
	}
	v.panjangMaks("perihal_bawaan", "Perihal", p.PerihalBawaan, 300)
	v.panjangMaks("tujuan_bawaan", "Tujuan", p.TujuanBawaan, 1000)
	v.panjangMaks("isi_bawaan", "Isi surat", p.IsiBawaan, 20000)
	v.panjangMaks("penanda_tangan_nama", "Nama penanda tangan", p.PenandaTanganNama, 120)
	v.panjangMaks("penanda_tangan_jabatan", "Jabatan penanda tangan", p.PenandaTanganJabatan, 120)
	v.panjangMaks("penanda_tangan_nip", "NIP penanda tangan", p.PenandaTanganNIP, 40)
	// Surat umum tidak punya pendaftar yang dapat mengunduhnya.
	if !p.UntukPendaftar {
		p.TampilDiCekStatus = false
	}
	return v
}

func (a *Aplikasi) tanganiSimpanJenisSurat(w http.ResponseWriter, r *http.Request) {
	var p permintaanJenisSurat
	if !bacaJSON(w, r, &p) {
		return
	}
	if v := p.periksa(); v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	var id int
	err := a.db.QueryRow(`INSERT INTO jenis_surat (nama, kode, format_nomor, atur_ulang, untuk_pendaftar,
	        tampil_di_cek_status, perihal_bawaan, tujuan_bawaan, isi_bawaan, penanda_tangan_nama,
	        penanda_tangan_jabatan, penanda_tangan_nip, aktif, urutan)
	     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
		p.Nama, p.Kode, p.FormatNomor, p.AturUlang, p.UntukPendaftar, p.TampilDiCekStatus,
		p.PerihalBawaan, p.TujuanBawaan, p.IsiBawaan, p.PenandaTanganNama, p.PenandaTanganJabatan,
		p.PenandaTanganNIP, p.Aktif, p.Urutan).Scan(&id)
	if err != nil {
		a.galatServer(w, "menyimpan jenis surat", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{"pesan": "Jenis surat berhasil ditambahkan.", "id": id})
}

func (a *Aplikasi) tanganiUbahJenisSurat(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanJenisSurat
	if !bacaJSON(w, r, &p) {
		return
	}
	v := p.periksa()

	// Aturan kembali-ke-1 tidak boleh berganti sesudah ada surat: periode
	// surat lama dihitung dengan aturan lama, dan urutan baru akan mulai
	// lagi dari 1 di tengah buku agenda yang sama.
	var aturLama string
	var jumlah int
	err := a.db.QueryRow(`SELECT atur_ulang, (SELECT COUNT(*) FROM surat WHERE jenis_id = $1)
	                        FROM jenis_surat WHERE id = $1`, id).Scan(&aturLama, &jumlah)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Jenis surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil jenis surat", err)
		return
	}
	if jumlah > 0 && aturLama != p.AturUlang {
		v.tambah("atur_ulang", fmt.Sprintf(
			"Sudah ada %d surat berjenis ini, jadi aturan kembali ke 1 tidak dapat diganti. Buat jenis surat baru bila aturannya harus berbeda.", jumlah))
	}
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	_, err = a.db.Exec(`UPDATE jenis_surat SET nama=$1, kode=$2, format_nomor=$3, atur_ulang=$4,
	        untuk_pendaftar=$5, tampil_di_cek_status=$6, perihal_bawaan=$7, tujuan_bawaan=$8,
	        isi_bawaan=$9, penanda_tangan_nama=$10, penanda_tangan_jabatan=$11,
	        penanda_tangan_nip=$12, aktif=$13, urutan=$14 WHERE id=$15`,
		p.Nama, p.Kode, p.FormatNomor, p.AturUlang, p.UntukPendaftar, p.TampilDiCekStatus,
		p.PerihalBawaan, p.TujuanBawaan, p.IsiBawaan, p.PenandaTanganNama, p.PenandaTanganJabatan,
		p.PenandaTanganNIP, p.Aktif, p.Urutan, id)
	if err != nil {
		a.galatServer(w, "mengubah jenis surat", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{
		"pesan": "Jenis surat berhasil disimpan. Format nomor yang baru berlaku untuk surat berikutnya; nomor yang sudah terbit tidak berubah.",
	})
}

func (a *Aplikasi) tanganiHapusJenisSurat(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var jumlah int
	if err := a.db.QueryRow(`SELECT COUNT(*) FROM surat WHERE jenis_id = $1`, id).Scan(&jumlah); err != nil {
		a.galatServer(w, "memeriksa jenis surat", err)
		return
	}
	if jumlah > 0 {
		kirimGalat(w, http.StatusConflict, fmt.Sprintf(
			"Jenis ini sudah dipakai %d surat, jadi tidak dapat dihapus. Nonaktifkan saja supaya tidak dapat dipilih lagi.", jumlah))
		return
	}
	hasil, err := a.db.Exec(`DELETE FROM jenis_surat WHERE id = $1`, id)
	if err != nil {
		a.galatServer(w, "menghapus jenis surat", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Jenis surat tidak ditemukan.")
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Jenis surat berhasil dihapus."})
}

/* ---------------- penomoran ---------------- */

var galatJenisTidakAda = errors.New("jenis surat tidak ditemukan")

type pemberiNomor struct {
	jenis     JenisSurat
	periode   string
	berikut   int
	tanggal   time.Time
	tahunAjar string
}

// ambilPemberiNomor MENGUNCI baris jenis surat di dalam transaksi, lalu
// menghitung nomor urut berikutnya. Kunci itulah yang membuat dua panitia
// yang menyimpan bersamaan mendapat nomor berurutan, bukan nomor yang sama:
// yang kedua menunggu sampai transaksi pertama selesai.
func (a *Aplikasi) ambilPemberiNomor(tx *sql.Tx, jenisID int, tanggal time.Time) (*pemberiNomor, error) {
	var j JenisSurat
	err := pindaiJenisSurat(tx.QueryRow(`SELECT `+kolomJenisSurat+` FROM jenis_surat j WHERE j.id = $1 FOR UPDATE`, jenisID), &j)
	if err == sql.ErrNoRows {
		return nil, galatJenisTidakAda
	}
	if err != nil {
		return nil, err
	}
	pn := &pemberiNomor{jenis: j, periode: periodeSurat(j.AturUlang, tanggal), tanggal: tanggal,
		tahunAjar: a.atur("ppdb_tahun")}
	if err := tx.QueryRow(`SELECT COALESCE(MAX(nomor_urut), 0) + 1 FROM surat WHERE jenis_id = $1 AND periode = $2`,
		jenisID, pn.periode).Scan(&pn.berikut); err != nil {
		return nil, err
	}
	return pn, nil
}

func (pn *pemberiNomor) ambil() (int, string) {
	urut := pn.berikut
	pn.berikut++
	return urut, susunNomor(pn.jenis.FormatNomor, urut, pn.jenis.Kode, pn.tanggal, pn.tahunAjar)
}

// tanganiPratinjauNomor menampilkan nomor yang AKAN didapat surat
// berikutnya, tanpa memesannya. Nomor sebenarnya baru ditetapkan saat
// disimpan, jadi bila panitia lain menyimpan lebih dulu, nomornya bergeser.
func (a *Aplikasi) tanganiPratinjauNomor(w http.ResponseWriter, r *http.Request) {
	jenisID, _ := strconv.Atoi(r.URL.Query().Get("jenis_id"))
	tanggal, err := time.Parse("2006-01-02", r.URL.Query().Get("tanggal"))
	if jenisID == 0 || err != nil {
		kirimGalat(w, http.StatusBadRequest, "Jenis surat dan tanggal wajib diisi.")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		a.galatServer(w, "membuka transaksi", err)
		return
	}
	defer tx.Rollback()
	pn, err := a.ambilPemberiNomor(tx, jenisID, tanggal)
	if errors.Is(err, galatJenisTidakAda) {
		kirimGalat(w, http.StatusNotFound, "Jenis surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghitung nomor surat", err)
		return
	}
	urut, nomor := pn.ambil()
	kirimJSON(w, http.StatusOK, map[string]any{"nomor_urut": urut, "nomor_surat": nomor, "periode": pn.periode})
}

/* ---------------- membuat surat ---------------- */

type dataPendaftarSurat struct {
	ID                                                int
	Nama, NoReg, NISN, Jalur, Peminatan, Asal, Status string
}

func (a *Aplikasi) nilaiNaskah(d *dataPendaftarSurat, nomor string, tanggal time.Time) map[string]string {
	n := map[string]string{
		"nomor_surat":   nomor,
		"tanggal_surat": tanggalIndonesia(tanggal.Format("2006-01-02")),
		"nama_sekolah":  a.atur("nama_sekolah", "SMA IMTEK"),
		"tahun_ajaran":  a.atur("ppdb_tahun"),
	}
	if d != nil {
		n["nama_lengkap"], n["no_registrasi"], n["nisn"] = d.Nama, d.NoReg, d.NISN
		n["jalur"], n["peminatan"], n["sekolah_asal"], n["status"] = d.Jalur, d.Peminatan, d.Asal, d.Status
	}
	return n
}

func (a *Aplikasi) ambilPendaftarSurat(q interface {
	QueryRow(string, ...any) *sql.Row
}, id int) (*dataPendaftarSurat, error) {
	d := &dataPendaftarSurat{}
	err := q.QueryRow(`SELECT p.id, p.nama_lengkap, p.no_registrasi, COALESCE(p.nisn, ''), p.jalur,
	        COALESCE(j.nama, ''), p.asal_sekolah, p.status
	   FROM pendaftar p LEFT JOIN jurusan j ON j.id = p.jurusan_id WHERE p.id = $1`, id).Scan(
		&d.ID, &d.Nama, &d.NoReg, &d.NISN, &d.Jalur, &d.Peminatan, &d.Asal, &d.Status)
	return d, err
}

type permintaanSurat struct {
	JenisID      int    `json:"jenis_id"`
	TanggalSurat string `json:"tanggal_surat"`
	Perihal      string `json:"perihal"`
	Tujuan       string `json:"tujuan"`
	Lampiran     string `json:"lampiran"`
	Isi          string `json:"isi"`
	PendaftarID  *int   `json:"pendaftar_id"`
}

func (p *permintaanSurat) periksa() (*Validasi, time.Time) {
	v := validasiBaru()
	if p.JenisID <= 0 {
		v.tambah("jenis_id", "Jenis surat wajib dipilih.")
	}
	tanggal, _ := v.tanggal("tanggal_surat", "Tanggal surat", strings.TrimSpace(p.TanggalSurat), true)
	p.Perihal, p.Tujuan = strings.TrimSpace(p.Perihal), strings.TrimSpace(p.Tujuan)
	p.Lampiran, p.Isi = strings.TrimSpace(p.Lampiran), strings.TrimSpace(p.Isi)
	v.panjangMaks("perihal", "Perihal", p.Perihal, 300)
	v.panjangMaks("tujuan", "Tujuan", p.Tujuan, 1000)
	v.panjangMaks("lampiran", "Lampiran", p.Lampiran, 120)
	v.panjangMaks("isi", "Isi surat", p.Isi, 20000)
	return v, tanggal
}

// tanganiBuatSurat menerbitkan satu surat. Perihal, tujuan, dan isi yang
// dikosongkan diambil dari bawaan jenisnya; penanda di dalamnya diisi
// sekarang, termasuk {nomor_surat} yang baru saja ditetapkan.
func (a *Aplikasi) tanganiBuatSurat(w http.ResponseWriter, r *http.Request) {
	var p permintaanSurat
	if !bacaJSON(w, r, &p) {
		return
	}
	v, tanggal := p.periksa()
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	tx, err := a.db.Begin()
	if err != nil {
		a.galatServer(w, "membuka transaksi", err)
		return
	}
	defer tx.Rollback()

	pn, err := a.ambilPemberiNomor(tx, p.JenisID, tanggal)
	if errors.Is(err, galatJenisTidakAda) {
		kirimGalat(w, http.StatusNotFound, "Jenis surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghitung nomor surat", err)
		return
	}
	if !pn.jenis.Aktif {
		kirimGalat(w, http.StatusConflict, "Jenis surat ini sedang dinonaktifkan.")
		return
	}

	var d *dataPendaftarSurat
	if p.PendaftarID != nil {
		d, err = a.ambilPendaftarSurat(tx, *p.PendaftarID)
		if err == sql.ErrNoRows {
			kirimGalat(w, http.StatusNotFound, "Pendaftar tidak ditemukan.")
			return
		}
		if err != nil {
			a.galatServer(w, "mengambil pendaftar", err)
			return
		}
	}

	urut, nomor := pn.ambil()
	id, err := a.simpanSurat(tx, pn, urut, nomor, p.Perihal, p.Tujuan, p.Lampiran, p.Isi, d, penggunaDari(r).ID)
	if err != nil {
		a.galatServer(w, "menyimpan surat", err)
		return
	}
	if err := tx.Commit(); err != nil {
		a.galatServer(w, "menyimpan surat", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan": "Surat " + nomor + " berhasil diterbitkan.", "id": id, "nomor_surat": nomor,
	})
}

func (a *Aplikasi) simpanSurat(tx *sql.Tx, pn *pemberiNomor, urut int, nomor, perihal, tujuan, lampiran, isi string,
	d *dataPendaftarSurat, oleh int) (int, error) {
	nilai := a.nilaiNaskah(d, nomor, pn.tanggal)
	if perihal == "" {
		perihal = pn.jenis.PerihalBawaan
	}
	if tujuan == "" {
		tujuan = pn.jenis.TujuanBawaan
	}
	if isi == "" {
		isi = pn.jenis.IsiBawaan
	}
	var pendaftarID any
	if d != nil {
		pendaftarID = d.ID
	}
	var olehID any
	if oleh > 0 {
		olehID = oleh
	}
	var id int
	err := tx.QueryRow(`INSERT INTO surat (jenis_id, periode, nomor_urut, nomor_surat, tanggal_surat,
	        perihal, tujuan, lampiran, isi, pendaftar_id, dibuat_oleh)
	     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		pn.jenis.ID, pn.periode, urut, nomor, pn.tanggal.Format("2006-01-02"),
		isiNaskah(perihal, nilai), isiNaskah(tujuan, nilai), lampiran, isiNaskah(isi, nilai),
		pendaftarID, olehID).Scan(&id)
	return id, err
}

// tanganiBuatSuratMassal menerbitkan surat yang sama untuk banyak pendaftar
// sekaligus, masing-masing dengan nomornya sendiri, dalam SATU transaksi:
// bila satu gagal, tidak ada yang terbit, jadi nomornya tidak berlubang.
// Urutan nomornya mengikuti nomor registrasi.
func (a *Aplikasi) tanganiBuatSuratMassal(w http.ResponseWriter, r *http.Request) {
	var p struct {
		JenisID       int    `json:"jenis_id"`
		TanggalSurat  string `json:"tanggal_surat"`
		Status        string `json:"status"`
		TahunAjaran   string `json:"tahun_ajaran"`
		PendaftarIDs  []int  `json:"pendaftar_ids"`
		LewatiYangAda bool   `json:"lewati_yang_sudah"`
		HanyaHitung   bool   `json:"hanya_hitung"`
	}
	if !bacaJSON(w, r, &p) {
		return
	}
	v := validasiBaru()
	if p.JenisID <= 0 {
		v.tambah("jenis_id", "Jenis surat wajib dipilih.")
	}
	tanggal, _ := v.tanggal("tanggal_surat", "Tanggal surat", strings.TrimSpace(p.TanggalSurat), true)
	if p.Status == "" && len(p.PendaftarIDs) == 0 {
		v.tambah("status", "Pilih status pendaftar yang akan menerima surat.")
	}
	if len(p.PendaftarIDs) > 2000 {
		v.tambah("pendaftar_ids", "Paling banyak 2000 pendaftar dalam sekali terbit.")
	}
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	if p.TahunAjaran == "" {
		p.TahunAjaran = a.atur("ppdb_tahun")
	}

	tx, err := a.db.Begin()
	if err != nil {
		a.galatServer(w, "membuka transaksi", err)
		return
	}
	defer tx.Rollback()

	pn, err := a.ambilPemberiNomor(tx, p.JenisID, tanggal)
	if errors.Is(err, galatJenisTidakAda) {
		kirimGalat(w, http.StatusNotFound, "Jenis surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "menghitung nomor surat", err)
		return
	}
	if !pn.jenis.UntukPendaftar {
		kirimGalat(w, http.StatusConflict, "Jenis surat ini bukan surat untuk pendaftar.")
		return
	}
	if !pn.jenis.Aktif {
		kirimGalat(w, http.StatusConflict, "Jenis surat ini sedang dinonaktifkan.")
		return
	}

	kueri := `SELECT p.id FROM pendaftar p WHERE `
	args := []any{}
	if len(p.PendaftarIDs) > 0 {
		kueri += `p.id = ANY($1::int[])`
		args = append(args, intArray(p.PendaftarIDs))
	} else {
		kueri += `p.status = $1 AND p.tahun_ajaran = $2`
		args = append(args, p.Status, p.TahunAjaran)
	}
	if p.LewatiYangAda {
		kueri += fmt.Sprintf(` AND NOT EXISTS (SELECT 1 FROM surat s WHERE s.pendaftar_id = p.id
		                       AND s.jenis_id = $%d AND NOT s.dibatalkan)`, len(args)+1)
		args = append(args, p.JenisID)
	}
	kueri += ` ORDER BY p.no_registrasi`

	baris, err := tx.Query(kueri, args...)
	if err != nil {
		a.galatServer(w, "memilih pendaftar", err)
		return
	}
	var ids []int
	for baris.Next() {
		var id int
		if err := baris.Scan(&id); err != nil {
			baris.Close()
			a.galatServer(w, "memilih pendaftar", err)
			return
		}
		ids = append(ids, id)
	}
	baris.Close()

	if p.HanyaHitung {
		kirimJSON(w, http.StatusOK, map[string]any{"jumlah": len(ids)})
		return
	}
	if len(ids) == 0 {
		kirimGalat(w, http.StatusUnprocessableEntity, "Tidak ada pendaftar yang cocok, atau semuanya sudah menerima surat berjenis ini.")
		return
	}

	pertama, terakhir := "", ""
	oleh := penggunaDari(r).ID
	for _, id := range ids {
		d, err := a.ambilPendaftarSurat(tx, id)
		if err != nil {
			a.galatServer(w, "mengambil pendaftar", err)
			return
		}
		urut, nomor := pn.ambil()
		if _, err := a.simpanSurat(tx, pn, urut, nomor, "", "", "", "", d, oleh); err != nil {
			a.galatServer(w, "menyimpan surat", err)
			return
		}
		if pertama == "" {
			pertama = nomor
		}
		terakhir = nomor
	}
	if err := tx.Commit(); err != nil {
		a.galatServer(w, "menyimpan surat", err)
		return
	}
	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan":  fmt.Sprintf("%d surat berhasil diterbitkan, nomor %s sampai %s.", len(ids), pertama, terakhir),
		"jumlah": len(ids),
	})
}

// intArray mengubah daftar bilangan menjadi larik PostgreSQL untuk ANY($1).
func intArray(n []int) string {
	s := make([]string, len(n))
	for i, x := range n {
		s[i] = strconv.Itoa(x)
	}
	return "{" + strings.Join(s, ",") + "}"
}

/* ---------------- daftar, ubah, batal, hapus ---------------- */

const kolomSurat = `s.id, s.jenis_id, j.nama, s.periode, s.nomor_urut, s.nomor_surat,
	to_char(s.tanggal_surat, 'YYYY-MM-DD'), s.perihal, s.tujuan, s.lampiran, s.isi, s.pendaftar_id,
	COALESCE(p.nama_lengkap, ''), COALESCE(p.no_registrasi, ''), s.dibatalkan, s.alasan_batal,
	COALESCE(u.nama, ''), to_char(s.dibuat, 'YYYY-MM-DD HH24:MI')`

const dariSurat = ` FROM surat s JOIN jenis_surat j ON j.id = s.jenis_id
	LEFT JOIN pendaftar p ON p.id = s.pendaftar_id LEFT JOIN users u ON u.id = s.dibuat_oleh `

func pindaiSurat(q interface{ Scan(...any) error }, s *Surat) error {
	var pid sql.NullInt64
	err := q.Scan(&s.ID, &s.JenisID, &s.NamaJenis, &s.Periode, &s.NomorUrut, &s.NomorSurat,
		&s.TanggalSurat, &s.Perihal, &s.Tujuan, &s.Lampiran, &s.Isi, &pid,
		&s.NamaPendaftar, &s.NoRegistrasi, &s.Dibatalkan, &s.AlasanBatal, &s.DibuatOleh, &s.Dibuat)
	if pid.Valid {
		v := int(pid.Int64)
		s.PendaftarID = &v
	}
	return err
}

func (a *Aplikasi) tanganiDaftarSurat(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	halaman, _ := strconv.Atoi(q.Get("halaman"))
	if halaman < 1 {
		halaman = 1
	}
	const per = 25
	syarat := []string{"TRUE"}
	args := []any{}
	if id, _ := strconv.Atoi(q.Get("jenis_id")); id > 0 {
		args = append(args, id)
		syarat = append(syarat, fmt.Sprintf("s.jenis_id = $%d", len(args)))
	}
	if cari := strings.TrimSpace(q.Get("cari")); cari != "" {
		args = append(args, "%"+cari+"%")
		n := len(args)
		syarat = append(syarat, fmt.Sprintf(
			"(s.nomor_surat ILIKE $%d OR s.perihal ILIKE $%d OR s.tujuan ILIKE $%d OR p.nama_lengkap ILIKE $%d OR p.no_registrasi ILIKE $%d)", n, n, n, n, n))
	}
	where := " WHERE " + strings.Join(syarat, " AND ")

	var total int
	if err := a.db.QueryRow(`SELECT COUNT(*)`+dariSurat+where, args...).Scan(&total); err != nil {
		a.galatServer(w, "menghitung surat", err)
		return
	}
	baris, err := a.db.Query(`SELECT `+kolomSurat+dariSurat+where+
		fmt.Sprintf(` ORDER BY s.tanggal_surat DESC, s.nomor_urut DESC LIMIT %d OFFSET %d`, per, (halaman-1)*per), args...)
	if err != nil {
		a.galatServer(w, "mengambil surat", err)
		return
	}
	defer baris.Close()
	daftar := []Surat{}
	for baris.Next() {
		var s Surat
		if err := pindaiSurat(baris, &s); err != nil {
			a.galatServer(w, "membaca surat", err)
			return
		}
		daftar = append(daftar, s)
	}
	kirimJSON(w, http.StatusOK, map[string]any{"data": daftar, "total": total, "halaman": halaman, "per_halaman": per})
}

func (a *Aplikasi) ambilSurat(id int) (Surat, error) {
	var s Surat
	err := pindaiSurat(a.db.QueryRow(`SELECT `+kolomSurat+dariSurat+` WHERE s.id = $1`, id), &s)
	return s, err
}

// tanganiUbahSurat menyunting perihal, tujuan, lampiran, isi, dan tanggal.
// Nomornya TIDAK berubah. Tanggal hanya boleh bergeser di dalam periode
// nomornya; surat yang harus pindah bulan atau tahun dibatalkan lalu dibuat
// ulang, supaya nomornya tetap sesuai tanggalnya.
func (a *Aplikasi) tanganiUbahSurat(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p permintaanSurat
	if !bacaJSON(w, r, &p) {
		return
	}
	lama, err := a.ambilSurat(id)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil surat", err)
		return
	}
	p.JenisID = lama.JenisID
	v, tanggal := p.periksa()
	var atur string
	if err := a.db.QueryRow(`SELECT atur_ulang FROM jenis_surat WHERE id = $1`, lama.JenisID).Scan(&atur); err != nil {
		a.galatServer(w, "mengambil jenis surat", err)
		return
	}
	if !v.bermasalah() && periodeSurat(atur, tanggal) != lama.Periode {
		v.tambah("tanggal_surat", "Tanggal baru berada di luar periode nomor surat ini ("+lama.Periode+
			"). Batalkan surat ini lalu buat surat baru supaya nomornya sesuai tanggalnya.")
	}
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	_, err = a.db.Exec(`UPDATE surat SET tanggal_surat=$1, perihal=$2, tujuan=$3, lampiran=$4, isi=$5, diubah=now()
	                    WHERE id=$6`, tanggal.Format("2006-01-02"), p.Perihal, p.Tujuan, p.Lampiran, p.Isi, id)
	if err != nil {
		a.galatServer(w, "mengubah surat", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Surat berhasil disimpan."})
}

func (a *Aplikasi) tanganiBatalSurat(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	var p struct {
		Batal  bool   `json:"batal"`
		Alasan string `json:"alasan"`
	}
	if !bacaJSON(w, r, &p) {
		return
	}
	p.Alasan = strings.TrimSpace(p.Alasan)
	if p.Batal && p.Alasan == "" {
		v := validasiBaru()
		v.tambah("alasan", "Tulis alasan pembatalannya; alasan itu tercatat di buku agenda.")
		kirimGalatValidasi(w, v)
		return
	}
	if !p.Batal {
		p.Alasan = ""
	}
	hasil, err := a.db.Exec(`UPDATE surat SET dibatalkan=$1, alasan_batal=$2, diubah=now() WHERE id=$3`, p.Batal, p.Alasan, id)
	if err != nil {
		a.galatServer(w, "membatalkan surat", err)
		return
	}
	if n, _ := hasil.RowsAffected(); n == 0 {
		kirimGalat(w, http.StatusNotFound, "Surat tidak ditemukan.")
		return
	}
	pesan := "Surat dibatalkan. Nomornya tetap tercatat, tidak dipakai ulang."
	if !p.Batal {
		pesan = "Pembatalan surat dicabut."
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": pesan})
}

// tanganiHapusSurat hanya menghapus nomor PALING AKHIR pada periodenya.
// Menghapus nomor di tengah meninggalkan lubang di buku agenda, dan nomor
// itu tidak pernah terpakai lagi; surat seperti itu dibatalkan saja.
func (a *Aplikasi) tanganiHapusSurat(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	s, err := a.ambilSurat(id)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil surat", err)
		return
	}
	var terakhir int
	if err := a.db.QueryRow(`SELECT MAX(nomor_urut) FROM surat WHERE jenis_id=$1 AND periode=$2`, s.JenisID, s.Periode).Scan(&terakhir); err != nil {
		a.galatServer(w, "memeriksa nomor surat", err)
		return
	}
	if s.NomorUrut != terakhir {
		kirimGalat(w, http.StatusConflict,
			"Hanya surat bernomor paling akhir yang dapat dihapus. Surat ini dibatalkan saja, supaya nomornya tetap tercatat.")
		return
	}
	if _, err := a.db.Exec(`DELETE FROM surat WHERE id=$1`, id); err != nil {
		a.galatServer(w, "menghapus surat", err)
		return
	}
	kirimJSON(w, http.StatusOK, map[string]string{"pesan": "Surat " + s.NomorSurat + " dihapus; nomornya akan dipakai surat berikutnya."})
}

/* ---------------- PDF ---------------- */

func (a *Aplikasi) tanganiPdfSuratAdmin(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	a.kirimPdfSurat(w, id)
}

// tanganiPdfSuratPendaftar: kunci yang sama dengan Cek Status, dan hanya
// surat berjenis tampil_di_cek_status yang belum dibatalkan.
func (a *Aplikasi) tanganiPdfSuratPendaftar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		NoRegistrasi string `json:"no_registrasi"`
		TanggalLahir string `json:"tanggal_lahir"`
		ID           int    `json:"id"`
	}
	if !bacaJSON(w, r, &p) {
		return
	}
	v := validasiBaru()
	p.NoRegistrasi = v.wajib("no_registrasi", "Nomor registrasi", p.NoRegistrasi)
	v.tanggal("tanggal_lahir", "Tanggal lahir", strings.TrimSpace(p.TanggalLahir), true)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}
	if !a.izinkanCobaIdentitas(w, p.NoRegistrasi) {
		return
	}
	var id int
	err := a.db.QueryRow(`SELECT s.id FROM surat s
	     JOIN jenis_surat j ON j.id = s.jenis_id
	     JOIN pendaftar p ON p.id = s.pendaftar_id
	    WHERE s.id = $1 AND p.no_registrasi = $2 AND p.tanggal_lahir = $3
	      AND j.tampil_di_cek_status AND NOT s.dibatalkan`,
		p.ID, strings.ToUpper(p.NoRegistrasi), strings.TrimSpace(p.TanggalLahir)).Scan(&id)
	if err == sql.ErrNoRows {
		a.catatGagalIdentitas(p.NoRegistrasi)
		kirimGalat(w, http.StatusNotFound, "Surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mencari surat", err)
		return
	}
	a.bersihkanGagalIdentitas(p.NoRegistrasi)
	a.kirimPdfSurat(w, id)
}

// suratPendaftar adalah daftar surat yang ikut dikirim halaman Cek Status.
func (a *Aplikasi) suratPendaftar(noReg string) []map[string]any {
	daftar := []map[string]any{}
	baris, err := a.db.Query(`SELECT s.id, s.nomor_surat, s.perihal, to_char(s.tanggal_surat, 'YYYY-MM-DD'), j.nama
	     FROM surat s JOIN jenis_surat j ON j.id = s.jenis_id JOIN pendaftar p ON p.id = s.pendaftar_id
	    WHERE p.no_registrasi = $1 AND j.tampil_di_cek_status AND NOT s.dibatalkan
	    ORDER BY s.tanggal_surat DESC, s.id DESC`, noReg)
	if err != nil {
		a.log.Printf("gagal mengambil surat pendaftar: %v", err)
		return daftar
	}
	defer baris.Close()
	for baris.Next() {
		var id int
		var nomor, perihal, tanggal, jenis string
		if baris.Scan(&id, &nomor, &perihal, &tanggal, &jenis) == nil {
			daftar = append(daftar, map[string]any{
				"id": id, "nomor_surat": nomor, "perihal": perihal, "tanggal_surat": tanggal, "jenis": jenis,
			})
		}
	}
	return daftar
}

func (a *Aplikasi) kirimPdfSurat(w http.ResponseWriter, id int) {
	s, err := a.ambilSurat(id)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Surat tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil surat", err)
		return
	}
	var j JenisSurat
	if err := pindaiJenisSurat(a.db.QueryRow(`SELECT `+kolomJenisSurat+` FROM jenis_surat j WHERE j.id = $1`, s.JenisID), &j); err != nil {
		a.galatServer(w, "mengambil jenis surat", err)
		return
	}
	isi, err := a.rakitPdfSurat(s, j)
	if err != nil {
		a.galatServer(w, "merakit surat", err)
		return
	}
	nama := "surat-" + regexp.MustCompile(`[^A-Za-z0-9]+`).ReplaceAllString(s.NomorSurat, "-") + ".pdf"
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="`+nama+`"`)
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(isi); err != nil {
		a.log.Printf("gagal mengirim surat: %v", err)
	}
}

func (a *Aplikasi) rakitPdfSurat(s Surat, j JenisSurat) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithLeftMargin(22).WithRightMargin(20).WithTopMargin(12).WithBottomMargin(15).
		WithTitle("Surat "+s.NomorSurat, true).
		WithCreator(a.atur("nama_sekolah", "Sekolah"), true).
		WithCreationDate(time.Now()).
		Build()
	m := maroto.New(cfg)
	m.AddRows(a.kopSekolah()...)

	biasa := props.Text{Size: 10.5}
	if s.Dibatalkan {
		m.AddRows(text.NewRow(9, "DIBATALKAN - "+s.AlasanBatal, props.Text{
			Size: 11, Style: fontstyle.Bold, Align: align.Center, Color: &props.Color{Red: 185, Green: 28, Blue: 28}, Top: 2,
		}))
	}

	// Tempat dan tanggal di kanan atas, seperti surat dinas pada umumnya.
	tempat := a.atur("kota")
	if dalamKurungSiku(tempat) {
		tempat = ""
	}
	tanggal := tanggalIndonesia(s.TanggalSurat)
	if tempat != "" {
		tanggal = tempat + ", " + tanggal
	}
	m.AddRows(row.New(4), text.NewRow(6, tanggal, props.Text{Size: 10.5, Align: align.Right}))

	baris := func(label, nilai string) core.Row {
		return row.New(5.5).Add(
			col.New(2).Add(text.New(label, biasa)),
			col.New(10).Add(text.New(": "+nilai, biasa)),
		)
	}
	lampiran := s.Lampiran
	if lampiran == "" {
		lampiran = "-"
	}
	m.AddRows(baris("Nomor", s.NomorSurat), baris("Lampiran", lampiran))
	if s.Perihal != "" {
		m.AddRow(5.5,
			col.New(2).Add(text.New("Perihal", biasa)),
			col.New(10).Add(text.New(": "+s.Perihal, props.Text{Size: 10.5, Style: fontstyle.Bold})),
		)
	}

	if s.Tujuan != "" {
		m.AddRows(row.New(5), text.NewRow(5.5, "Kepada Yth.", biasa))
		for _, t := range strings.Split(s.Tujuan, "\n") {
			if t = strings.TrimSpace(t); t != "" {
				m.AddRows(text.NewAutoRow(t, biasa))
			}
		}
	}

	m.AddRows(row.New(6))
	for _, par := range keParagrafSurat(s.Isi) {
		// Setiap baris di dalam paragraf berdiri sendiri, supaya daftar
		// bernomor yang diketik di isi surat tetap satu butir satu baris.
		// Rata kiri, bukan rata kanan-kiri: Maroto meratakan SEMUA baris,
		// termasuk baris terakhir paragraf, sehingga baris pendek di ujung
		// paragraf teregang sampai sekatanya berjauhan.
		for _, b := range par {
			m.AddRows(text.NewAutoRow(b, props.Text{Size: 10.5, Align: align.Left}))
		}
		m.AddRows(row.New(2.5))
	}

	// Blok tanda tangan di kanan. Ruang kosong untuk tanda tangan basah dan
	// cap sekolah; nama dan NIP hanya dicetak bila diisi pada jenisnya.
	m.AddRows(row.New(6))
	kanan := func(tinggi float64, t string, gaya fontstyle.Type) core.Row {
		return row.New(tinggi).Add(col.New(7), col.New(5).Add(text.New(t, props.Text{Size: 10.5, Style: gaya})))
	}
	if j.PenandaTanganJabatan != "" {
		m.AddRows(kanan(5.5, j.PenandaTanganJabatan+",", fontstyle.Normal))
	}
	m.AddRows(row.New(20))
	if j.PenandaTanganNama != "" {
		m.AddRows(kanan(5.5, j.PenandaTanganNama, fontstyle.Bold))
	} else {
		m.AddRows(kanan(5.5, "(.................................)", fontstyle.Normal))
	}
	if j.PenandaTanganNIP != "" {
		m.AddRows(kanan(5.5, "NIP "+j.PenandaTanganNIP, fontstyle.Normal))
	}

	dok, err := m.Generate()
	if err != nil {
		return nil, err
	}
	return dok.GetBytes(), nil
}

// keParagrafSurat memecah isi surat menjadi paragraf pada baris kosong, dan
// setiap paragraf menjadi baris-barisnya. Pemecahan baris dipertahankan
// karena isi surat sering memuat daftar bernomor atau rincian per baris
// (nama, tanggal, tempat) yang tidak boleh dilebur menjadi satu kalimat.
func keParagrafSurat(isi string) [][]string {
	var hasil [][]string
	for _, p := range regexp.MustCompile(`\n\s*\n`).Split(strings.ReplaceAll(isi, "\r\n", "\n"), -1) {
		var baris []string
		for _, b := range strings.Split(p, "\n") {
			if b = strings.TrimSpace(b); b != "" {
				baris = append(baris, b)
			}
		}
		if len(baris) > 0 {
			hasil = append(hasil, baris)
		}
	}
	return hasil
}

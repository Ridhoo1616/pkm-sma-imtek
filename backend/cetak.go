package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/code"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/line"
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
   Bukti pendaftaran dalam bentuk PDF

   Versi PHP dulu punya halaman cetak bukti pendaftaran. Bagian ini
   menggantikannya, dan berkasnya dirakit di sisi server memakai Maroto
   supaya hasilnya sama di semua peramban dan tetap bisa dibuka dari
   telepon. Halaman cetak versi peramban selalu bergantung pengaturan
   cetak masing-masing pengunjung.

   Ada dua jalan masuk:
   - Pendaftar: POST /api/ppdb/bukti dengan nomor registrasi dan
     tanggal lahir, kunci yang sama dengan halaman Cek Status.
   - Petugas: GET /api/admin/pendaftar/{id}/bukti dengan token.
   ================================================================== */

var (
	warnaBiru  = &props.Color{Red: 18, Green: 80, Blue: 143}
	warnaSamar = &props.Color{Red: 107, Green: 114, Blue: 128}
	warnaGaris = &props.Color{Red: 210, Green: 216, Blue: 224}
)

// dataBukti memuat isi yang dicetak. Bentuknya dipisah dari Pendaftar
// karena tidak semua kolom ikut dicetak: dokumen dan jejak IP tidak.
type dataBukti struct {
	NoRegistrasi  string
	TahunAjaran   string
	Jalur         string
	NamaJurusan   string
	Status        string
	Dibuat        string
	NamaLengkap   string
	NISN          string
	NIK           string
	JenisKelamin  string
	TempatLahir   string
	TanggalLahir  string
	Agama         string
	Alamat        string
	NoHP          string
	Email         string
	AsalSekolah   string
	NilaiRata2    sql.NullFloat64
	NamaAyah      string
	NamaIbu       string
	NoHPOrtu      string
	SumberInfo    string
	BerkasLengkap []string
	BerkasKurang  []string
}

func (a *Aplikasi) ambilDataBukti(kolom string, nilai ...any) (dataBukti, error) {
	var d dataBukti
	var berkas [6]string

	err := a.db.QueryRow(`
		SELECT p.no_registrasi, p.tahun_ajaran, p.jalur, COALESCE(j.nama, ''), p.status,
		       to_char(p.created_at, 'YYYY-MM-DD HH24:MI'),
		       p.nama_lengkap, COALESCE(p.nisn, ''), COALESCE(p.nik, ''), p.jenis_kelamin,
		       p.tempat_lahir, to_char(p.tanggal_lahir, 'YYYY-MM-DD'), p.agama,
		       p.alamat, p.no_hp, COALESCE(p.email, ''),
		       p.asal_sekolah, p.nilai_rata2,
		       p.nama_ayah, p.nama_ibu, COALESCE(p.no_hp_ortu, ''),
		       COALESCE(p.sumber_informasi, ''),
		       COALESCE(p.file_foto, ''), COALESCE(p.file_ijazah, ''), COALESCE(p.file_kk, ''),
		       COALESCE(p.file_akta, ''), COALESCE(p.file_raport, ''), COALESCE(p.file_prestasi, '')
		  FROM pendaftar p
		  LEFT JOIN jurusan j ON j.id = p.jurusan_id
		 WHERE `+kolom, nilai...).Scan(
		&d.NoRegistrasi, &d.TahunAjaran, &d.Jalur, &d.NamaJurusan, &d.Status, &d.Dibuat,
		&d.NamaLengkap, &d.NISN, &d.NIK, &d.JenisKelamin,
		&d.TempatLahir, &d.TanggalLahir, &d.Agama,
		&d.Alamat, &d.NoHP, &d.Email,
		&d.AsalSekolah, &d.NilaiRata2,
		&d.NamaAyah, &d.NamaIbu, &d.NoHPOrtu, &d.SumberInfo,
		&berkas[0], &berkas[1], &berkas[2], &berkas[3], &berkas[4], &berkas[5])
	if err != nil {
		return d, err
	}

	label := []string{"Foto 3x4", "Ijazah / SKL", "Kartu Keluarga",
		"Akta Kelahiran", "Rapor", "Sertifikat Prestasi"}
	for i, nama := range berkas {
		if nama != "" {
			d.BerkasLengkap = append(d.BerkasLengkap, label[i])
		} else {
			d.BerkasKurang = append(d.BerkasKurang, label[i])
		}
	}
	return d, nil
}

/* ---------------- penangan ---------------- */

func (a *Aplikasi) tanganiBuktiPendaftar(w http.ResponseWriter, r *http.Request) {
	var p struct {
		NoRegistrasi string `json:"no_registrasi"`
		TanggalLahir string `json:"tanggal_lahir"`
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

	// Nomor registrasi saja tidak cukup, sama seperti halaman Cek Status.
	// Tanpa pasangan tanggal lahir, bukti pendaftaran orang lain bisa
	// diunduh hanya dengan menebak nomornya.
	d, err := a.ambilDataBukti("p.no_registrasi = $1 AND p.tanggal_lahir = $2",
		strings.ToUpper(p.NoRegistrasi), strings.TrimSpace(p.TanggalLahir))
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound,
			"Data tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil data bukti pendaftaran", err)
		return
	}
	a.kirimPdfBukti(w, d)
}

func (a *Aplikasi) tanganiBuktiAdmin(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	d, err := a.ambilDataBukti("p.id = $1", id)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Data pendaftar tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil data bukti pendaftaran", err)
		return
	}
	a.kirimPdfBukti(w, d)
}

func (a *Aplikasi) kirimPdfBukti(w http.ResponseWriter, d dataBukti) {
	isi, err := a.rakitPdfBukti(d)
	if err != nil {
		a.galatServer(w, "merakit bukti pendaftaran", err)
		return
	}

	nama := fmt.Sprintf("bukti-pendaftaran-%s.pdf", d.NoRegistrasi)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="`+nama+`"`)
	// Bukti memuat data pribadi, jadi tidak boleh disimpan cache bersama.
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(isi); err != nil {
		a.log.Printf("gagal mengirim bukti pendaftaran: %v", err)
	}
}

/* ---------------- perakitan PDF ---------------- */

func (a *Aplikasi) rakitPdfBukti(d dataBukti) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithLeftMargin(15).
		WithRightMargin(15).
		WithTopMargin(12).
		WithBottomMargin(12).
		WithTitle("Bukti Pendaftaran "+d.NoRegistrasi, true).
		WithSubject("Bukti pendaftaran peserta didik baru", true).
		WithCreator(a.atur("nama_sekolah", "Sekolah"), true).
		WithCreationDate(time.Now()).
		Build()

	m := maroto.New(cfg)
	m.AddRows(a.kopSekolah()...)
	m.AddRows(a.judulBukti(d)...)
	m.AddRows(a.bagianBukti("A. Data Pendaftaran", [][2]string{
		{"Nomor registrasi", d.NoRegistrasi},
		{"Tahun ajaran", d.TahunAjaran},
		{"Jalur pendaftaran", d.Jalur},
		{"Peminatan dipilih", d.NamaJurusan},
		{"Waktu pendaftaran", tanggalIndonesiaJam(d.Dibuat)},
		{"Status terakhir", d.Status},
	})...)
	m.AddRows(a.bagianBukti("B. Data Calon Peserta Didik", [][2]string{
		{"Nama lengkap", d.NamaLengkap},
		{"NISN", d.NISN},
		{"NIK", d.NIK},
		{"Jenis kelamin", jenisKelaminPanjang(d.JenisKelamin)},
		{"Tempat dan tanggal lahir", gabungTempatTanggal(d.TempatLahir, d.TanggalLahir)},
		{"Agama", d.Agama},
		{"Alamat", d.Alamat},
		{"Nomor HP", d.NoHP},
		{"Surel", d.Email},
	})...)
	m.AddRows(a.bagianBukti("C. Asal Sekolah dan Orang Tua", [][2]string{
		{"Asal sekolah", d.AsalSekolah},
		{"Nilai rata-rata rapor", nilaiRapor(d.NilaiRata2)},
		{"Nama ayah", d.NamaAyah},
		{"Nama ibu", d.NamaIbu},
		{"Nomor HP orang tua", d.NoHPOrtu},
	})...)
	m.AddRows(a.bagianBerkas(d)...)
	m.AddRows(a.catatanBukti(d)...)

	dok, err := m.Generate()
	if err != nil {
		return nil, err
	}
	return dok.GetBytes(), nil
}

func (a *Aplikasi) kopSekolah() []core.Row {
	namaSekolah := strings.ToUpper(a.atur("nama_sekolah", "SEKOLAH"))
	baris := []core.Row{
		text.NewRow(7, namaSekolah, props.Text{
			Size: 15, Style: fontstyle.Bold, Align: align.Center, Color: warnaBiru,
		}),
	}

	// Baris keterangan sekolah disusun dari pengaturan yang memang terisi,
	// supaya tidak muncul tanda kurung siku atau pemisah yang menggantung.
	var keterangan []string
	if v := a.atur("npsn"); !dalamKurungSiku(v) && v != "" {
		keterangan = append(keterangan, "NPSN "+v)
	}
	if v := a.atur("status_sekolah"); !dalamKurungSiku(v) && v != "" {
		keterangan = append(keterangan, v)
	}
	if v := a.atur("akreditasi"); !dalamKurungSiku(v) && v != "" {
		keterangan = append(keterangan, "Akreditasi "+v)
	}
	if len(keterangan) > 0 {
		baris = append(baris, text.NewRow(4, strings.Join(keterangan, "  |  "), props.Text{
			Size: 8, Align: align.Center, Color: warnaSamar,
		}))
	}
	if v := a.atur("alamat"); !dalamKurungSiku(v) && v != "" {
		baris = append(baris, text.NewRow(6, v, props.Text{
			Size: 8, Align: align.Center, Color: warnaSamar,
		}))
	}

	var kontak []string
	if v := a.atur("telepon"); !dalamKurungSiku(v) && v != "" {
		kontak = append(kontak, "Telepon "+v)
	}
	if v := a.atur("email"); !dalamKurungSiku(v) && v != "" {
		kontak = append(kontak, v)
	}
	if len(kontak) > 0 {
		baris = append(baris, text.NewRow(4, strings.Join(kontak, "  |  "), props.Text{
			Size: 8, Align: align.Center, Color: warnaSamar,
		}))
	}

	baris = append(baris, row.New(3).Add(
		col.New(12).Add(line.New(props.Line{Color: warnaBiru, Thickness: 0.6})),
	))
	return baris
}

func (a *Aplikasi) judulBukti(d dataBukti) []core.Row {
	return []core.Row{
		row.New(4),
		row.New(16).Add(
			col.New(9).Add(
				text.New("BUKTI PENDAFTARAN PESERTA DIDIK BARU", props.Text{
					Size: 11, Style: fontstyle.Bold, Color: warnaBiru,
				}),
				text.New("Tahun Ajaran "+d.TahunAjaran, props.Text{
					Top: 6, Size: 9, Color: warnaSamar,
				}),
			),
			// Kode QR memuat nomor registrasi, supaya panitia dapat
			// mencocokkan lembar cetak dengan data di panel tanpa mengetik.
			code.NewQrCol(3, d.NoRegistrasi, props.Rect{Center: true, Percent: 95}),
		),
		row.New(2),
	}
}

func (a *Aplikasi) bagianBukti(judul string, butir [][2]string) []core.Row {
	baris := []core.Row{
		row.New(7).Add(
			col.New(12).Add(text.New(judul, props.Text{
				Size: 9, Style: fontstyle.Bold, Top: 1.5, Color: warnaBiru,
			})),
		),
	}
	for _, b := range butir {
		nilai := strings.TrimSpace(b[1])
		if nilai == "" || dalamKurungSiku(nilai) {
			continue
		}
		baris = append(baris, row.New(6).Add(
			text.NewCol(4, b[0], props.Text{Size: 8.5, Top: 1.2, Color: warnaSamar}),
			text.NewCol(8, nilai, props.Text{Size: 8.5, Top: 1.2}),
		))
	}
	baris = append(baris, row.New(2).Add(
		col.New(12).Add(line.New(props.Line{Color: warnaGaris, Thickness: 0.2})),
	))
	return baris
}

func (a *Aplikasi) bagianBerkas(d dataBukti) []core.Row {
	baris := []core.Row{
		row.New(7).Add(
			col.New(12).Add(text.New("D. Dokumen yang Diunggah", props.Text{
				Size: 9, Style: fontstyle.Bold, Top: 1.5, Color: warnaBiru,
			})),
		),
	}
	if len(d.BerkasLengkap) > 0 {
		baris = append(baris, row.New(6).Add(
			text.NewCol(4, "Sudah diunggah", props.Text{Size: 8.5, Top: 1.2, Color: warnaSamar}),
			text.NewCol(8, strings.Join(d.BerkasLengkap, ", "), props.Text{Size: 8.5, Top: 1.2}),
		))
	}
	if len(d.BerkasKurang) > 0 {
		baris = append(baris, row.New(6).Add(
			text.NewCol(4, "Belum diunggah", props.Text{Size: 8.5, Top: 1.2, Color: warnaSamar}),
			text.NewCol(8, strings.Join(d.BerkasKurang, ", "), props.Text{Size: 8.5, Top: 1.2}),
		))
	}
	if d.SumberInfo != "" {
		label := LabelSumberInformasi[d.SumberInfo]
		if label == "" {
			label = d.SumberInfo
		}
		baris = append(baris, row.New(6).Add(
			text.NewCol(4, "Mengetahui sekolah dari", props.Text{Size: 8.5, Top: 1.2, Color: warnaSamar}),
			text.NewCol(8, label, props.Text{Size: 8.5, Top: 1.2}),
		))
	}
	baris = append(baris, row.New(2).Add(
		col.New(12).Add(line.New(props.Line{Color: warnaGaris, Thickness: 0.2})),
	))
	return baris
}

func (a *Aplikasi) catatanBukti(d dataBukti) []core.Row {
	catatan := "Lembar ini adalah bukti bahwa pendaftaran sudah diterima sistem. " +
		"Simpan nomor registrasi di atas. Nomor tersebut beserta tanggal lahir " +
		"diperlukan untuk memantau hasil verifikasi berkas lewat menu Cek Status " +
		"pada situs sekolah."
	if p := a.atur("ppdb_pengumuman"); !dalamKurungSiku(p) && p != "" {
		catatan += " Pengumuman hasil seleksi dijadwalkan pada " +
			tanggalIndonesia(p) + "."
	}

	return []core.Row{
		row.New(4),
		row.New(20).Add(
			col.New(12).Add(text.New(catatan, props.Text{Size: 8, Color: warnaSamar})),
		),
		row.New(6).Add(
			col.New(12).Add(text.New(
				"Dicetak pada "+tanggalIndonesiaJam(waktuCetak())+
					". Lembar ini dihasilkan sistem dan tidak memerlukan tanda tangan.",
				props.Text{Size: 7, Align: align.Center, Color: warnaSamar})),
		),
	}
}

/* ---------------- pembantu ---------------- */

func waktuCetak() string { return time.Now().Format("2006-01-02 15:04") }

// dalamKurungSiku menandai nilai pengaturan yang masih menunggu data dari
// sekolah. Nilai seperti itu tidak ikut dicetak.
func dalamKurungSiku(v string) bool {
	v = strings.TrimSpace(v)
	return strings.HasPrefix(v, "[") && strings.HasSuffix(v, "]")
}

func jenisKelaminPanjang(k string) string {
	switch k {
	case "L":
		return "Laki-laki"
	case "P":
		return "Perempuan"
	default:
		return ""
	}
}

func nilaiRapor(n sql.NullFloat64) string {
	if !n.Valid {
		return ""
	}
	return strings.Replace(fmt.Sprintf("%.2f", n.Float64), ".", ",", 1)
}

func gabungTempatTanggal(tempat, tanggal string) string {
	if tempat == "" {
		return tanggalIndonesia(tanggal)
	}
	return tempat + ", " + tanggalIndonesia(tanggal)
}

var bulanIndonesia = [...]string{
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
}

func tanggalIndonesia(teks string) string {
	t, err := time.Parse("2006-01-02", strings.TrimSpace(teks))
	if err != nil {
		return teks
	}
	return fmt.Sprintf("%d %s %d", t.Day(), bulanIndonesia[t.Month()-1], t.Year())
}

func tanggalIndonesiaJam(teks string) string {
	t, err := time.Parse("2006-01-02 15:04", strings.TrimSpace(teks))
	if err != nil {
		return teks
	}
	return fmt.Sprintf("%d %s %d, %02d.%02d",
		t.Day(), bulanIndonesia[t.Month()-1], t.Year(), t.Hour(), t.Minute())
}

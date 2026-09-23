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
   Kartu peserta tes seleksi

   Dicetak dalam bentuk PDF supaya hasilnya sama di semua peramban, sama
   seperti bukti pendaftaran.

   Dua penanda dicetak sekaligus, dan keduanya memuat nomor registrasi:

   - Barcode Code 128, untuk dipindai pemindai garis yang biasa dipakai
     panitia saat presensi ruang ujian. Alat semacam itu tidak membaca QR.
   - Kode QR, untuk dipindai dengan telepon bila pemindai garis tidak ada.

   Kartunya dicetak setengah halaman A4 agar dapat digunting dan dibawa,
   sedangkan sisanya memuat tata tertib.
   ================================================================== */

type dataKartu struct {
	NoRegistrasi string
	NamaLengkap  string
	TempatLahir  string
	TanggalLahir string
	AsalSekolah  string
	Jalur        string
	NamaJurusan  string
	RuangUjian   string
	KursiUjian   string

	NamaSekolah string
	AlamatSek   string
	TahunAjaran string
	NamaPaket   string
	JadwalUjian string
	DurasiMenit int
	JumlahSoal  int
	TataTertib  string
}

func (a *Aplikasi) ambilDataKartu(kolom string, nilai ...any) (dataKartu, error) {
	var d dataKartu
	var jurusan, ruang, kursi sql.NullString

	err := a.db.QueryRow(`
		SELECT p.no_registrasi, p.nama_lengkap, p.tempat_lahir,
		       to_char(p.tanggal_lahir, 'YYYY-MM-DD'), p.asal_sekolah, p.jalur,
		       j.nama, p.ruang_ujian, p.kursi_ujian, p.tahun_ajaran
		FROM pendaftar p
		LEFT JOIN jurusan j ON j.id = p.jurusan_id
		WHERE `+kolom, nilai...).
		Scan(&d.NoRegistrasi, &d.NamaLengkap, &d.TempatLahir, &d.TanggalLahir,
			&d.AsalSekolah, &d.Jalur, &jurusan, &ruang, &kursi, &d.TahunAjaran)
	if err != nil {
		return d, err
	}
	d.NamaJurusan = jurusan.String
	d.RuangUjian = ruang.String
	d.KursiUjian = kursi.String

	d.NamaSekolah = a.atur("nama_sekolah", "SMA IMTEK")
	d.AlamatSek = a.atur("alamat")
	d.TataTertib = a.atur("ujian_info")

	// Jadwal diambil dari paket yang sedang aktif. Bila belum ada, kartunya
	// tetap dicetak dengan jadwal kosong: panitia sering mencetak kartu lebih
	// dulu, baru menetapkan jadwalnya.
	if p, err := a.paketBerlaku(); err == nil {
		d.NamaPaket = p.Nama
		d.DurasiMenit = p.DurasiMenit
		d.JumlahSoal = p.JumlahSoal
		if p.Mulai != nil {
			if t, err := time.Parse(time.RFC3339, *p.Mulai); err == nil {
				d.JadwalUjian = fmt.Sprintf("%d %s %d, pukul %02d.%02d WIB",
					t.Day(), bulanIndonesia[t.Month()-1], t.Year(), t.Hour(), t.Minute())
			}
		}
	}
	return d, nil
}

type permintaanKartu struct {
	NoRegistrasi string `json:"no_registrasi"`
	TanggalLahir string `json:"tanggal_lahir"`
}

// tanganiKartuPendaftar melayani peserta. Kuncinya sama dengan cek status:
// nomor registrasi beserta tanggal lahir.
func (a *Aplikasi) tanganiKartuPendaftar(w http.ResponseWriter, r *http.Request) {
	var p permintaanKartu
	if !bacaJSON(w, r, &p) {
		return
	}
	noReg := strings.TrimSpace(p.NoRegistrasi)
	tgl := strings.TrimSpace(p.TanggalLahir)

	v := validasiBaru()
	v.wajib("no_registrasi", "Nomor registrasi", noReg)
	v.wajib("tanggal_lahir", "Tanggal lahir", tgl)
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	d, err := a.ambilDataKartu("upper(p.no_registrasi) = upper($1) AND p.tanggal_lahir = $2",
		noReg, tgl)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound,
			"Data tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil data kartu peserta", err)
		return
	}
	a.kirimPdfKartu(w, d)
}

func (a *Aplikasi) tanganiKartuAdmin(w http.ResponseWriter, r *http.Request) {
	id, ok := idJalur(w, r)
	if !ok {
		return
	}
	d, err := a.ambilDataKartu("p.id = $1", id)
	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound, "Pendaftar tidak ditemukan.")
		return
	}
	if err != nil {
		a.galatServer(w, "mengambil data kartu peserta", err)
		return
	}
	a.kirimPdfKartu(w, d)
}

func (a *Aplikasi) kirimPdfKartu(w http.ResponseWriter, d dataKartu) {
	dokumen, err := rakitPdfKartu(d)
	if err != nil {
		a.galatServer(w, "merakit kartu peserta", err)
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition",
		fmt.Sprintf(`attachment; filename="kartu-peserta-%s.pdf"`, d.NoRegistrasi))
	// Kartu memuat data pribadi, jadi tidak boleh tersimpan di cache bersama.
	w.Header().Set("Cache-Control", "private, no-store")
	if _, err := w.Write(dokumen.GetBytes()); err != nil {
		a.log.Printf("gagal mengirim kartu peserta: %v", err)
	}
}

func rakitPdfKartu(d dataKartu) (core.Document, error) {
	m := maroto.New(config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithLeftMargin(14).WithRightMargin(14).WithTopMargin(14).
		Build())

	judul := func(t string, ukuran float64, gaya fontstyle.Type, warna *props.Color) core.Row {
		return row.New(ukuran + 2).Add(text.NewCol(12, t, props.Text{
			Size: ukuran, Style: gaya, Align: align.Center, Color: warna,
		}))
	}

	m.AddRows(
		judul("KARTU PESERTA TES SELEKSI", 14, fontstyle.Bold, warnaBiru),
		judul(d.NamaSekolah, 11, fontstyle.Bold, nil),
		judul("Penerimaan Peserta Didik Baru Tahun Ajaran "+d.TahunAjaran, 8, fontstyle.Normal, warnaSamar),
	)
	if d.AlamatSek != "" && !dalamKurungSiku(d.AlamatSek) {
		m.AddRows(judul(d.AlamatSek, 7, fontstyle.Normal, warnaSamar))
	}
	m.AddRows(row.New(4), garisKartu())

	// Nomor peserta dibuat besar karena inilah yang dicari panitia saat
	// memeriksa kartu di pintu ruang ujian.
	m.AddRows(
		row.New(5),
		row.New(7).Add(text.NewCol(12, "NOMOR PESERTA", props.Text{
			Size: 7, Style: fontstyle.Bold, Align: align.Center, Color: warnaSamar,
		})),
		row.New(11).Add(text.NewCol(12, d.NoRegistrasi, props.Text{
			Size: 20, Style: fontstyle.Bold, Align: align.Center, Color: warnaBiru,
		})),
		row.New(3),
	)

	// Dua penanda berdampingan: barcode untuk pemindai garis, QR untuk telepon.
	m.AddRows(
		row.New(22).Add(
			code.NewBarCol(8, d.NoRegistrasi, props.Barcode{Center: true, Percent: 100}),
			code.NewQrCol(4, d.NoRegistrasi, props.Rect{Center: true, Percent: 95}),
		),
		row.New(5).Add(
			text.NewCol(8, "Pindai dengan pemindai garis", props.Text{
				Size: 6, Align: align.Center, Color: warnaSamar,
			}),
			text.NewCol(4, "Atau pindai kode QR", props.Text{
				Size: 6, Align: align.Center, Color: warnaSamar,
			}),
		),
		row.New(4), garisKartu(), row.New(4),
	)

	m.AddRows(barisKartu("Nama lengkap", d.NamaLengkap))
	m.AddRows(barisKartu("Tempat, tanggal lahir",
		gabungTempatTanggal(d.TempatLahir, d.TanggalLahir)))
	m.AddRows(barisKartu("Asal sekolah", d.AsalSekolah))
	m.AddRows(barisKartu("Jalur pendaftaran", d.Jalur))
	if d.NamaJurusan != "" {
		m.AddRows(barisKartu("Peminatan dipilih", d.NamaJurusan))
	}
	m.AddRows(barisKartu("Ruang ujian", atauBelumDitentukan(d.RuangUjian)))
	m.AddRows(barisKartu("Nomor kursi", atauBelumDitentukan(d.KursiUjian)))

	if d.NamaPaket != "" {
		m.AddRows(row.New(3), garisKartu(), row.New(3))
		m.AddRows(barisKartu("Nama tes", d.NamaPaket))
		m.AddRows(barisKartu("Jadwal", atauBelumDitentukan(d.JadwalUjian)))
		m.AddRows(barisKartu("Lama pengerjaan", fmt.Sprintf("%d menit", d.DurasiMenit)))
		m.AddRows(barisKartu("Jumlah soal", fmt.Sprintf("%d butir", d.JumlahSoal)))
	}

	m.AddRows(row.New(6), garisKartu(), row.New(4))
	m.AddRows(judul("TATA TERTIB", 9, fontstyle.Bold, warnaBiru), row.New(2))

	tertib := strings.TrimSpace(d.TataTertib)
	if tertib == "" || dalamKurungSiku(tertib) {
		// Tata tertib yang belum diisi sekolah tidak dikarang di sini.
		// Yang dicetak adalah keterangan bahwa bagian ini menunggu sekolah.
		m.AddRows(row.New(6).Add(text.NewCol(12,
			"Tata tertib tes seleksi belum ditetapkan sekolah. Panitia akan "+
				"menyampaikannya sebelum tes dimulai.",
			props.Text{Size: 8, Align: align.Center, Color: warnaSamar})))
	} else {
		for _, baris := range strings.Split(tertib, "\n") {
			baris = strings.TrimSpace(baris)
			if baris == "" {
				continue
			}
			m.AddRows(row.New(5).Add(text.NewCol(12, "•  "+baris,
				props.Text{Size: 8, Color: warnaSamar})))
		}
	}

	m.AddRows(
		row.New(8),
		row.New(5).Add(text.NewCol(12,
			"Kartu ini wajib dibawa saat tes seleksi. Kehilangan kartu dapat "+
				"dilaporkan kepada panitia untuk dicetak ulang.",
			props.Text{Size: 7, Align: align.Center, Color: warnaSamar})),
		row.New(4).Add(text.NewCol(12,
			"Dicetak "+tanggalCetakSekarang()+" dari sistem PPDB "+d.NamaSekolah,
			props.Text{Size: 6, Align: align.Center, Color: warnaSamar})),
	)

	return m.Generate()
}

func garisKartu() core.Row {
	return row.New(1).Add(col.New(12).Add(line.New(props.Line{Color: warnaGaris, Thickness: 0.3})))
}

func barisKartu(label, nilai string) core.Row {
	if nilai == "" {
		nilai = "-"
	}
	return row.New(6).Add(
		text.NewCol(4, label, props.Text{Size: 8, Color: warnaSamar}),
		text.NewCol(8, nilai, props.Text{Size: 9, Style: fontstyle.Bold}),
	)
}

func atauBelumDitentukan(v string) string {
	if strings.TrimSpace(v) == "" {
		return "Belum ditentukan"
	}
	return v
}

func tanggalCetakSekarang() string {
	t := time.Now().In(zonaJakarta())
	return fmt.Sprintf("%d %s %d", t.Day(), bulanIndonesia[t.Month()-1], t.Year())
}

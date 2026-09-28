package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
)

/* ==================================================================
   Pemeriksaan dan penyimpanan isian pendaftar

   Dipakai DUA jalur masuk:

     1. Formulir publik (tanganiDaftar), yang mengirim multipart beserta
        berkas unggahan, dan hanya berjalan selama PPDB dibuka.
     2. Penambahan manual dari panel (tanganiTambahPendaftar), yang mengirim
        JSON tanpa berkas, dan TETAP berjalan meski PPDB sudah ditutup.

   Disatukan di sini dengan satu alasan yang konkret: dua jalur yang
   memeriksa isian yang sama dengan kode yang berbeda pasti akan menyimpang
   satu sama lain. Contohnya sudah terjadi di proyek ini pada daftar dokumen
   di halaman Info PPDB, yang menyebut dua dokumen bersifat opsional
   padahal formulirnya menolak kiriman tanpa keduanya.
   ================================================================== */

// opsiIsian membedakan perilaku kedua jalur masuk. Yang berbeda hanya dua
// hal; sisanya identik, dan memang harus identik.
type opsiIsian struct {
	// WajibPernyataan menuntut centang pernyataan kebenaran data. Hanya
	// formulir publik: yang menandatangani pernyataan itu pendaftarnya
	// sendiri, dan panitia tidak dapat menandatanganinya atas nama orang
	// lain. Pertanggungjawabannya pindah ke kolom dibuat_oleh.
	WajibPernyataan bool

	// SekolahKetat menolak sekolah asal yang tidak ada dalam daftar rujukan.
	// Dimatikan untuk panel: petugas memasukkan data dengan ijazahnya di
	// tangan, jadi ia tahu lebih banyak daripada daftar rujukannya.
	SekolahKetat bool
}

// isianPendaftar memuat isian yang sudah diperiksa. Kolom yang diteruskan
// apa adanya tidak disalin ke sini, melainkan dibaca ulang lewat `ambil`
// saat menyimpan: menyalin empat puluh kolom satu per satu hanya menambah
// tempat baru untuk salah tulis.
type isianPendaftar struct {
	ambil func(string) string

	NamaLengkap  string
	JenisKelamin string
	TempatLahir  string
	TanggalLahir string
	Agama        string
	Alamat       string
	NoHP         string
	AsalSekolah  string
	NamaAyah     string
	NamaIbu      string
	Jalur        string

	NISN      string
	NIK       string
	Kelurahan string
	Kecamatan string
	Kota      string
	Provinsi  string
	KodePos   string

	NPSNSekolah   string
	AlamatSekolah string
	TahunLulus    string
	Email         string

	NilaiRata2 any
	JurusanID  any
	SumberInfo string

	SekolahTerdaftar bool
}

/*
periksaIsianPendaftar memeriksa seluruh isian pendaftar.

Galat isian dikumpulkan pada v, bukan dikembalikan: pemanggilnya mengirim
seluruhnya sekaligus supaya pendaftar tidak membetulkan satu per satu. Yang
dikembalikan sebagai error hanya kegagalan basis data, yang memang bukan
kesalahan pengisi.
*/
func (a *Aplikasi) periksaIsianPendaftar(
	v *Validasi, isi func(string) string, opsi opsiIsian,
) (isianPendaftar, error) {
	d := isianPendaftar{ambil: isi}

	/* ---- isian wajib ---- */
	d.NamaLengkap = v.wajib("nama_lengkap", "Nama lengkap", isi("nama_lengkap"))
	d.JenisKelamin = v.wajib("jenis_kelamin", "Jenis kelamin", isi("jenis_kelamin"))
	d.TempatLahir = v.wajib("tempat_lahir", "Tempat lahir", isi("tempat_lahir"))
	d.TanggalLahir = isi("tanggal_lahir")
	d.Agama = v.wajib("agama", "Agama", isi("agama"))
	d.Alamat = v.wajib("alamat", "Alamat tempat tinggal", isi("alamat"))
	d.NoHP = isi("no_hp")
	d.AsalSekolah = v.wajib("asal_sekolah", "Asal sekolah", isi("asal_sekolah"))
	d.NamaAyah = v.wajib("nama_ayah", "Nama ayah", isi("nama_ayah"))
	d.NamaIbu = v.wajib("nama_ibu", "Nama ibu", isi("nama_ibu"))
	d.Jalur = v.wajib("jalur", "Jalur pendaftaran", isi("jalur"))

	v.pilihan("jenis_kelamin", "Jenis kelamin", d.JenisKelamin, JenisKelamin)
	v.pilihan("agama", "Agama", d.Agama, Agama)
	v.pilihan("jalur", "Jalur pendaftaran", d.Jalur, JalurPendaftaran)
	v.panjangMaks("nama_lengkap", "Nama lengkap", d.NamaLengkap, 100)
	v.panjangMaks("alamat", "Alamat", d.Alamat, 1000)

	// Isian asal-asalan — "aaaa", "123", "....." — ditahan di sini. Nama
	// orang tidak pernah berangka, sedangkan alamat hampir selalu berangka,
	// jadi keduanya dibedakan lewat parameter terakhir.
	v.teksWajar("nama_lengkap", "Nama lengkap", d.NamaLengkap, false)
	v.teksWajar("nama_ayah", "Nama ayah", d.NamaAyah, false)
	v.teksWajar("nama_ibu", "Nama ibu", d.NamaIbu, false)
	v.teksWajar("tempat_lahir", "Tempat lahir", d.TempatLahir, false)
	v.teksWajar("alamat", "Alamat tempat tinggal", d.Alamat, true)
	v.teksWajar("asal_sekolah", "Asal sekolah", d.AsalSekolah, true)

	if lahir, ok := v.tanggal("tanggal_lahir", "Tanggal lahir", d.TanggalLahir, true); ok {
		v.usiaWajar("tanggal_lahir", lahir)
	}

	/* ---- identitas dan alamat: wajib ----

	   Tanpa NISN dan NIK, tidak ada yang bisa dicocokkan ke data Dapodik
	   maupun dokumen kependudukan; tanpa kelurahan sampai kode pos, jalur
	   zonasi tidak dapat dinilai dan surat panggilan tidak dapat dikirim. */
	d.NISN = isi("nisn")
	d.NIK = v.wajib("nik", "NIK", isi("nik"))
	d.Kelurahan = v.wajib("kelurahan", "Kelurahan/Desa", isi("kelurahan"))
	d.Kecamatan = v.wajib("kecamatan", "Kecamatan", isi("kecamatan"))
	d.Kota = v.wajib("kota", "Kota/Kabupaten", isi("kota"))
	d.Provinsi = v.wajib("provinsi", "Provinsi", isi("provinsi"))
	d.KodePos = v.wajib("kode_pos", "Kode pos", isi("kode_pos"))

	/* ---- sekolah asal: wajib ---- */
	d.NPSNSekolah = v.wajib("npsn_sekolah", "NPSN sekolah asal", isi("npsn_sekolah"))
	d.AlamatSekolah = v.wajib("alamat_sekolah", "Alamat sekolah asal", isi("alamat_sekolah"))
	d.TahunLulus = v.wajib("tahun_lulus", "Tahun lulus", isi("tahun_lulus"))

	/* ---- isian opsional ---- */
	d.Email = isi("email")
	// NISN dan NIK diperiksa strukturnya, lalu dicocokkan dengan isian lain
	// pada formulir yang sama. Lihat validasi_identitas.go.
	v.periksaNisn(d.NISN, d.NIK, d.TanggalLahir)
	v.periksaNik(d.NIK, d.TanggalLahir, d.JenisKelamin)
	v.telepon("no_hp", "Nomor HP/WhatsApp", d.NoHP, true)
	v.telepon("no_hp_ortu", "Nomor HP orang tua", isi("no_hp_ortu"), false)
	v.email("email", d.Email)

	// Kode pos Indonesia selalu lima angka. Diperiksa di sini, bukan di
	// v.wajib(), karena v.wajib() hanya memastikan isinya tidak kosong.
	if d.KodePos != "" && !polaKodePos.MatchString(d.KodePos) {
		v.tambah("kode_pos", "Kode pos harus lima angka.")
	}
	npsnBentuknyaBenar := polaNpsn.MatchString(d.NPSNSekolah)
	if d.NPSNSekolah != "" && !npsnBentuknyaBenar {
		v.tambah("npsn_sekolah", "NPSN sekolah asal harus delapan angka. Nomor ini tercantum pada ijazah atau dapat dicari di laman Referensi Kemendikbud.")
	}

	// Sekolah asalnya dicocokkan ke daftar rujukan yang diimpor panitia.
	// Selama daftarnya kosong, pemeriksaan ini tidak menolak apa pun.
	// Keterangannya di sekolah.go.
	if npsnBentuknyaBenar {
		diakui := isi("sekolah_tidak_terdaftar") == "1" || !opsi.SekolahKetat
		d.SekolahTerdaftar = a.periksaAsalSekolah(v, d.AsalSekolah, d.NPSNSekolah, diakui)
	}

	d.NilaiRata2 = v.desimalRentang("nilai_rata2", "Nilai rata-rata", isi("nilai_rata2"), 0, 100)

	// Tiga kolom di bawah bertipe teks di basis data, mengikuti bentuk isian
	// Dapodik yang kadang ditulis bebas. Pemeriksa rentang tetap dijalankan
	// untuk pesan galatnya, tetapi yang disimpan tetap teksnya.
	v.bulatRentang("anak_ke", "Anak ke-", isi("anak_ke"), 1, 20)
	v.bulatRentang("jumlah_saudara", "Jumlah saudara", isi("jumlah_saudara"), 0, 20)
	v.bulatRentang("tahun_lulus", "Tahun lulus", d.TahunLulus, 2000, 2100)

	d.SumberInfo = isi("sumber_informasi")
	if d.SumberInfo != "" && !sumberSah(d.SumberInfo) {
		v.tambah("sumber_informasi", "Pilihan sumber informasi tidak valid.")
	}

	if opsi.WajibPernyataan && isi("pernyataan") == "" {
		v.tambah("pernyataan", "Anda harus menyetujui pernyataan kebenaran data.")
	}

	/* ---- peminatan ---- */
	// Peminatan hanya diwajibkan bila sekolah memang membuka pilihannya.
	daftarJurusan, err := a.ambilJurusan(true)
	if err != nil {
		return d, fmt.Errorf("mengambil jurusan: %w", err)
	}
	if len(daftarJurusan) > 0 {
		pilihan := isi("jurusan_id")
		sah := false
		for _, j := range daftarJurusan {
			if pilihan == fmt.Sprint(j.ID) {
				sah = true
				d.JurusanID = j.ID
				break
			}
		}
		if !sah {
			v.tambah("jurusan_id", "Peminatan wajib dipilih.")
		}
	}

	/* ---- cegah pendaftaran ganda ---- */
	tahunAjaran := a.atur("ppdb_tahun")
	if d.NamaLengkap != "" && d.TanggalLahir != "" {
		var noLama string
		err := a.db.QueryRow(
			`SELECT no_registrasi FROM pendaftar
			  WHERE nama_lengkap = $1 AND tanggal_lahir = $2 AND tahun_ajaran = $3`,
			d.NamaLengkap, d.TanggalLahir, tahunAjaran).Scan(&noLama)
		switch {
		case err == nil:
			v.tambahUmum("Data dengan nama dan tanggal lahir yang sama sudah terdaftar dengan nomor registrasi " +
				noLama + ". Gunakan menu Cek Status untuk memantau pendaftaran tersebut.")
		case err != sql.ErrNoRows:
			return d, fmt.Errorf("memeriksa pendaftaran ganda: %w", err)
		}
	}

	/* ---- satu NISN untuk satu pendaftar ----

	   Nomor registrasinya sengaja TIDAK disebutkan, berbeda dengan
	   pemeriksaan nama dan tanggal lahir di atas. Nama beserta tanggal lahir
	   hanya diketahui orang yang memang mengenal pendaftarnya, sedangkan
	   NISN satu nomor tunggal: kalau nomor registrasi ikut dikembalikan,
	   formulir ini berubah menjadi alat penelusuran. */
	if d.NISN != "" {
		var ada bool
		err := a.db.QueryRow(
			`SELECT EXISTS (SELECT 1 FROM pendaftar
			                 WHERE nisn = $1 AND tahun_ajaran = $2)`,
			d.NISN, tahunAjaran).Scan(&ada)
		if err != nil {
			return d, fmt.Errorf("memeriksa NISN ganda: %w", err)
		}
		if ada {
			v.tambah("nisn", "NISN ini sudah dipakai pendaftaran lain pada tahun ajaran ini. Satu NISN hanya untuk satu orang. Bila Anda merasa belum pernah mendaftar, hubungi panitia lewat halaman Kontak.")
		}
	}

	return d, nil
}

/*
simpanPendaftar menyimpan satu pendaftar beserta nomor registrasinya.

berkas boleh kosong: penambahan dari panel tidak mengunggah apa pun, sebab
petugas menerima dokumennya dalam bentuk kertas di meja pendaftaran.

dibuatOleh nol berarti pendaftar mengisi formulir publik sendiri.
*/
func (a *Aplikasi) simpanPendaftar(
	tx *sql.Tx, d isianPendaftar, berkas map[string]string,
	dibuatOleh int, ip string,
) (string, error) {
	tahunAjaran := a.atur("ppdb_tahun")
	noReg, err := buatNoRegistrasi(tx, tahunAjaran)
	if err != nil {
		return "", fmt.Errorf("membuat nomor registrasi: %w", err)
	}

	var oleh any
	if dibuatOleh > 0 {
		oleh = dibuatOleh
	}
	isi := d.ambil

	_, err = tx.Exec(`INSERT INTO pendaftar (
		no_registrasi, tahun_ajaran, jalur, jurusan_id,
		nama_lengkap, nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
		anak_ke, jumlah_saudara, alamat, kelurahan, kecamatan, kota, provinsi, kode_pos,
		no_hp, email, asal_sekolah, npsn_sekolah, alamat_sekolah, tahun_lulus, nilai_rata2,
		nama_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, pekerjaan_ibu, pendidikan_ibu,
		penghasilan, no_hp_ortu, nama_wali,
		file_foto, file_ijazah, file_kk, file_akta, file_raport, file_prestasi,
		sumber_informasi, catatan_sumber, ip_pendaftar, asal_sekolah_terdaftar,
		dibuat_oleh
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
	          $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46)`,
		noReg, tahunAjaran, d.Jalur, d.JurusanID,
		d.NamaLengkap, kosongJadiNil(d.NISN), kosongJadiNil(d.NIK), d.JenisKelamin,
		d.TempatLahir, d.TanggalLahir, d.Agama,
		kosongJadiNil(isi("anak_ke")), kosongJadiNil(isi("jumlah_saudara")), d.Alamat,
		d.Kelurahan, d.Kecamatan, d.Kota, d.Provinsi, d.KodePos,
		d.NoHP, kosongJadiNil(d.Email),
		d.AsalSekolah, d.NPSNSekolah, d.AlamatSekolah,
		d.TahunLulus, d.NilaiRata2,
		d.NamaAyah, kosongJadiNil(isi("pekerjaan_ayah")), kosongJadiNil(isi("pendidikan_ayah")),
		d.NamaIbu, kosongJadiNil(isi("pekerjaan_ibu")), kosongJadiNil(isi("pendidikan_ibu")),
		kosongJadiNil(isi("penghasilan")), kosongJadiNil(isi("no_hp_ortu")), kosongJadiNil(isi("nama_wali")),
		nilBerkas(berkas, "file_foto"), nilBerkas(berkas, "file_ijazah"),
		nilBerkas(berkas, "file_kk"), nilBerkas(berkas, "file_akta"),
		nilBerkas(berkas, "file_raport"), nilBerkas(berkas, "file_prestasi"),
		kosongJadiNil(d.SumberInfo), kosongJadiNil(isi("catatan_sumber")),
		kosongJadiNil(ip), d.SekolahTerdaftar, oleh)
	if err != nil {
		return "", err
	}
	return noReg, nil
}

/* ---------------- penambahan dari panel ---------------- */

/*
tanganiTambahPendaftar memasukkan satu pendaftar dari panel.

SENGAJA TIDAK MEMERIKSA apakah PPDB sedang dibuka, dan itu seluruh gunanya.
Keadaan yang ditangani: ada calon yang datang langsung ke sekolah sesudah
pendaftaran ditutup, lalu kepala sekolah memutuskan menerimanya. Sebelum ini
satu-satunya jalan adalah membuka kembali PPDB untuk semua orang, memasukkan
satu data, lalu menutupnya lagi; selama jendela itu terbuka, siapa pun di
internet dapat mendaftar.

Tiga hal yang berbeda dari formulir publik, dan masing-masing ada sebabnya:

  - Tanpa unggahan berkas. Dokumennya diterima petugas dalam bentuk kertas
    di meja pendaftaran, dan memaksa lima unggahan di situ membuat fiturnya
    tidak terpakai. Akibatnya diterima dengan sadar: pendaftar ini tidak
    dapat diverifikasi dari berkas yang tersimpan di sistem, dan panitia
    mencocokkannya dari kertas yang ada di tangannya.
  - Tanpa centang pernyataan kebenaran data. Yang menandatangani pernyataan
    itu pendaftarnya sendiri, dan petugas tidak dapat menandatanganinya atas
    nama orang lain. Pertanggungjawabannya pindah ke kolom dibuat_oleh.
  - Sekolah asal di luar daftar rujukan tidak ditolak. Petugas memasukkan
    data dengan ijazahnya di tangan, jadi ia tahu lebih banyak daripada
    daftar rujukannya.

Pemeriksaan lain SELURUHNYA sama dengan formulir publik, termasuk NISN, NIK,
kewajaran tulisan, dan kedua penjaga pendaftaran ganda. Data yang masuk lewat
pintu ini tidak boleh lebih rendah mutunya.
*/
func (a *Aplikasi) tanganiTambahPendaftar(w http.ResponseWriter, r *http.Request) {
	var badan map[string]string
	if !bacaJSON(w, r, &badan) {
		return
	}
	isi := func(k string) string { return strings.TrimSpace(badan[k]) }

	v := validasiBaru()
	d, err := a.periksaIsianPendaftar(v, isi, opsiIsian{
		WajibPernyataan: false,
		SekolahKetat:    false,
	})
	if err != nil {
		a.galatServer(w, "memeriksa isian pendaftar", err)
		return
	}
	if v.bermasalah() {
		kirimGalatValidasi(w, v)
		return
	}

	saya := penggunaDari(r)
	tx, err := a.db.Begin()
	if err != nil {
		a.galatServer(w, "memulai transaksi", err)
		return
	}
	defer tx.Rollback()

	noReg, err := a.simpanPendaftar(tx, d, nil, saya.ID, "")
	if err != nil {
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict,
				"Data ini sudah terdaftar pada tahun ajaran ini: nama dengan "+
					"tanggal lahir yang sama, atau NISN yang sama, sudah dipakai "+
					"pendaftaran lain.")
			return
		}
		a.galatServer(w, "menyimpan pendaftar", err)
		return
	}
	if err := tx.Commit(); err != nil {
		a.galatServer(w, "menyelesaikan penyimpanan", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan": "Pendaftar ditambahkan dengan nomor registrasi " + noReg +
			". Dokumennya belum ada di sistem; cocokkan dari berkas kertas saat memverifikasi.",
		"no_registrasi": noReg,
		"tahun_ajaran":  a.atur("ppdb_tahun"),
	})
}

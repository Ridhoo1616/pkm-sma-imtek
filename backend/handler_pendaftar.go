package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// berkasPendaftar mendaftar kolom unggahan formulir PPDB beserta labelnya,
// apakah wajib, dan tipe berkas yang diizinkan.
var berkasPendaftar = []struct {
	Kolom string
	Label string
	Wajib bool
	Tipe  []string
}{
	{"file_foto", "Foto 3x4", true, TipeGambar},
	{"file_ijazah", "Ijazah / SKL", true, TipeDokumen},
	{"file_kk", "Kartu Keluarga", true, TipeDokumen},
	{"file_akta", "Akta Kelahiran", false, TipeDokumen},
	{"file_raport", "Rapor", false, TipeDokumen},
	{"file_prestasi", "Sertifikat Prestasi", false, TipeDokumen},
}

func (a *Aplikasi) tanganiDaftar(w http.ResponseWriter, r *http.Request) {
	if !a.ppdbDibuka() {
		kirimGalat(w, http.StatusConflict,
			"Pendaftaran peserta didik baru sedang tidak dibuka.")
		return
	}

	// Batas keseluruhan: enam berkas ditambah isian teks. Memori yang dipakai
	// dibatasi 10 MB; sisanya ditulis ke berkas sementara oleh pustaka standar.
	batasTotal := a.cfg.BatasUnggah*int64(len(berkasPendaftar)) + (1 << 20)
	r.Body = http.MaxBytesReader(w, r.Body, batasTotal)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		kirimGalat(w, http.StatusBadRequest,
			"Data formulir tidak dapat dibaca. Pastikan ukuran seluruh berkas tidak berlebihan.")
		return
	}
	defer r.MultipartForm.RemoveAll()

	// Perangkap spam, sama seperti versi PHP.
	if strings.TrimSpace(r.FormValue("website")) != "" {
		kirimGalat(w, http.StatusBadRequest, "Permintaan ditolak.")
		return
	}

	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()

	/* ---- isian wajib ---- */
	namaLengkap := v.wajib("nama_lengkap", "Nama lengkap", isi("nama_lengkap"))
	jenisKelamin := v.wajib("jenis_kelamin", "Jenis kelamin", isi("jenis_kelamin"))
	tempatLahir := v.wajib("tempat_lahir", "Tempat lahir", isi("tempat_lahir"))
	tanggalLahir := isi("tanggal_lahir")
	agama := v.wajib("agama", "Agama", isi("agama"))
	alamat := v.wajib("alamat", "Alamat tempat tinggal", isi("alamat"))
	noHP := isi("no_hp")
	asalSekolah := v.wajib("asal_sekolah", "Asal sekolah", isi("asal_sekolah"))
	namaAyah := v.wajib("nama_ayah", "Nama ayah", isi("nama_ayah"))
	namaIbu := v.wajib("nama_ibu", "Nama ibu", isi("nama_ibu"))
	jalur := v.wajib("jalur", "Jalur pendaftaran", isi("jalur"))

	v.pilihan("jenis_kelamin", "Jenis kelamin", jenisKelamin, JenisKelamin)
	v.pilihan("agama", "Agama", agama, Agama)
	v.pilihan("jalur", "Jalur pendaftaran", jalur, JalurPendaftaran)
	v.panjangMaks("nama_lengkap", "Nama lengkap", namaLengkap, 100)
	v.panjangMaks("alamat", "Alamat", alamat, 1000)

	if lahir, ok := v.tanggal("tanggal_lahir", "Tanggal lahir", tanggalLahir, true); ok {
		v.usiaWajar("tanggal_lahir", lahir)
	}

	/* ---- isian opsional ---- */
	nisn := isi("nisn")
	nik := isi("nik")
	email := isi("email")
	v.digitTepat("nisn", "NISN", nisn, 10)
	v.digitTepat("nik", "NIK", nik, 16)
	v.telepon("no_hp", "Nomor HP/WhatsApp", noHP, true)
	v.telepon("no_hp_ortu", "Nomor HP orang tua", isi("no_hp_ortu"), false)
	v.email("email", email)

	nilaiRata2 := v.desimalRentang("nilai_rata2", "Nilai rata-rata", isi("nilai_rata2"), 0, 100)
	anakKe := v.bulatRentang("anak_ke", "Anak ke-", isi("anak_ke"), 1, 20)
	jumlahSaudara := v.bulatRentang("jumlah_saudara", "Jumlah saudara", isi("jumlah_saudara"), 0, 20)
	tahunLulus := v.bulatRentang("tahun_lulus", "Tahun lulus", isi("tahun_lulus"), 2000, 2100)

	sumberInfo := isi("sumber_informasi")
	if sumberInfo != "" && !sumberSah(sumberInfo) {
		v.tambah("sumber_informasi", "Pilihan sumber informasi tidak valid.")
	}

	if isi("pernyataan") == "" {
		v.tambah("pernyataan", "Anda harus menyetujui pernyataan kebenaran data.")
	}

	/* ---- peminatan ---- */
	// Peminatan hanya diwajibkan bila sekolah memang membuka pilihannya.
	// Sekolah yang tidak menjuruskan sejak pendaftaran cukup menonaktifkan
	// seluruh peminatan, dan kolom ini otomatis tidak diperiksa.
	daftarJurusan, err := a.ambilJurusan(true)
	if err != nil {
		a.galatServer(w, "mengambil jurusan", err)
		return
	}
	var jurusanID any
	if len(daftarJurusan) > 0 {
		pilihan := isi("jurusan_id")
		sah := false
		for _, j := range daftarJurusan {
			if pilihan == fmt.Sprint(j.ID) {
				sah = true
				jurusanID = j.ID
				break
			}
		}
		if !sah {
			v.tambah("jurusan_id", "Peminatan wajib dipilih.")
		}
	}

	/* ---- cegah pendaftaran ganda ---- */
	if namaLengkap != "" && tanggalLahir != "" {
		var noLama string
		err := a.db.QueryRow(
			`SELECT no_registrasi FROM pendaftar
			  WHERE nama_lengkap = ? AND tanggal_lahir = ? AND tahun_ajaran = ?`,
			namaLengkap, tanggalLahir, a.atur("ppdb_tahun")).Scan(&noLama)
		switch {
		case err == nil:
			v.tambahUmum("Data dengan nama dan tanggal lahir yang sama sudah terdaftar dengan nomor registrasi " +
				noLama + ". Gunakan menu Cek Status untuk memantau pendaftaran tersebut.")
		case err != sql.ErrNoRows:
			a.galatServer(w, "memeriksa pendaftaran ganda", err)
			return
		}
	}

	/* ---- unggahan ---- */
	// Berkas disimpan lebih dulu supaya galatnya bisa dilaporkan sekaligus
	// dengan galat isian. Bila akhirnya ada galat, seluruh berkas dihapus.
	tersimpan := map[string]string{}
	bereskan := func() {
		for _, nama := range tersimpan {
			a.hapusUnggahan("pendaftar", nama)
		}
	}

	for _, b := range berkasPendaftar {
		nama, err := a.ambilUnggahan(r.MultipartForm, b.Kolom, "pendaftar", b.Tipe)
		if errors.Is(err, GalatTanpaBerkas) {
			if b.Wajib {
				v.tambah(b.Kolom, b.Label+" wajib diunggah.")
			}
			continue
		}
		if err != nil {
			v.tambah(b.Kolom, b.Label+": "+err.Error()+".")
			continue
		}
		tersimpan[b.Kolom] = nama
	}

	if jalur == "Prestasi" && tersimpan["file_prestasi"] == "" {
		v.tambah("file_prestasi", "Jalur Prestasi mewajibkan unggahan sertifikat prestasi.")
	}

	if v.bermasalah() {
		bereskan()
		kirimGalatValidasi(w, v)
		return
	}

	/* ---- simpan ---- */
	tahunAjaran := a.atur("ppdb_tahun")
	transaksi, err := a.db.Begin()
	if err != nil {
		bereskan()
		a.galatServer(w, "memulai transaksi", err)
		return
	}
	// Rollback pada jalur galat; setelah Commit berhasil, panggilan ini
	// tidak berpengaruh apa-apa.
	defer transaksi.Rollback()

	noReg, err := buatNoRegistrasi(transaksi, tahunAjaran)
	if err != nil {
		bereskan()
		a.galatServer(w, "membuat nomor registrasi", err)
		return
	}

	_, err = transaksi.Exec(`INSERT INTO pendaftar (
		no_registrasi, tahun_ajaran, jalur, jurusan_id,
		nama_lengkap, nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
		anak_ke, jumlah_saudara, alamat, kelurahan, kecamatan, kota, provinsi, kode_pos,
		no_hp, email, asal_sekolah, npsn_sekolah, alamat_sekolah, tahun_lulus, nilai_rata2,
		nama_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, pekerjaan_ibu, pendidikan_ibu,
		penghasilan, no_hp_ortu, nama_wali,
		file_foto, file_ijazah, file_kk, file_akta, file_raport, file_prestasi,
		sumber_informasi, catatan_sumber, ip_pendaftar
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
	          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		noReg, tahunAjaran, jalur, jurusanID,
		namaLengkap, kosongJadiNil(nisn), kosongJadiNil(nik), jenisKelamin,
		tempatLahir, tanggalLahir, agama,
		anakKe, jumlahSaudara, alamat,
		kosongJadiNil(isi("kelurahan")), kosongJadiNil(isi("kecamatan")),
		kosongJadiNil(isi("kota")), kosongJadiNil(isi("provinsi")), kosongJadiNil(isi("kode_pos")),
		noHP, kosongJadiNil(email),
		asalSekolah, kosongJadiNil(isi("npsn_sekolah")), kosongJadiNil(isi("alamat_sekolah")),
		tahunLulus, nilaiRata2,
		namaAyah, kosongJadiNil(isi("pekerjaan_ayah")), kosongJadiNil(isi("pendidikan_ayah")),
		namaIbu, kosongJadiNil(isi("pekerjaan_ibu")), kosongJadiNil(isi("pendidikan_ibu")),
		kosongJadiNil(isi("penghasilan")), kosongJadiNil(isi("no_hp_ortu")), kosongJadiNil(isi("nama_wali")),
		nilBerkas(tersimpan, "file_foto"), nilBerkas(tersimpan, "file_ijazah"),
		nilBerkas(tersimpan, "file_kk"), nilBerkas(tersimpan, "file_akta"),
		nilBerkas(tersimpan, "file_raport"), nilBerkas(tersimpan, "file_prestasi"),
		kosongJadiNil(sumberInfo), kosongJadiNil(isi("catatan_sumber")), alamatPemanggil(r))
	if err != nil {
		bereskan()
		a.galatServer(w, "menyimpan pendaftaran", err)
		return
	}

	if err := transaksi.Commit(); err != nil {
		bereskan()
		a.galatServer(w, "menyelesaikan penyimpanan", err)
		return
	}

	kirimJSON(w, http.StatusCreated, map[string]any{
		"pesan":         "Pendaftaran berhasil dikirim.",
		"no_registrasi": noReg,
		"tahun_ajaran":  tahunAjaran,
	})
}

func nilBerkas(m map[string]string, k string) any {
	if m[k] == "" {
		return nil
	}
	return m[k]
}

// buatNoRegistrasi menghasilkan nomor urut per tahun ajaran dalam bentuk
// PPDB-2728-0001. Dijalankan di dalam transaksi yang sama dengan penyimpanan
// data agar dua pendaftaran bersamaan tidak memperoleh nomor yang sama.
func buatNoRegistrasi(t *sql.Tx, tahunAjaran string) (string, error) {
	// 2027/2028 -> 20272028 -> "2728"
	var angka strings.Builder
	for _, c := range tahunAjaran {
		if c >= '0' && c <= '9' {
			angka.WriteRune(c)
		}
	}
	kode := angka.String()
	if len(kode) >= 8 {
		kode = kode[2:4] + kode[6:8]
	}

	var urut int
	if err := t.QueryRow(
		"SELECT COUNT(*) FROM pendaftar WHERE tahun_ajaran = ? FOR UPDATE", tahunAjaran,
	).Scan(&urut); err != nil {
		return "", err
	}

	// Pencacah bisa tidak sinkron bila ada data yang pernah dihapus, jadi
	// nomor dinaikkan sampai menemukan yang benar-benar belum terpakai.
	for i := 0; i < 1000; i++ {
		urut++
		no := fmt.Sprintf("PPDB-%s-%04d", kode, urut)
		var ada int
		err := t.QueryRow("SELECT id FROM pendaftar WHERE no_registrasi = ?", no).Scan(&ada)
		if err == sql.ErrNoRows {
			return no, nil
		}
		if err != nil {
			return "", err
		}
	}
	return "", errors.New("nomor registrasi tidak dapat dibuat")
}

/* ---------------- cek status ---------------- */

// tanganiCekStatus dipakai calon peserta didik untuk memantau pendaftarannya.
// Nomor registrasi saja tidak cukup: tanggal lahir diminta sebagai pasangan
// kunci agar data pribadi orang lain tidak bisa dibuka dengan menebak nomor.
func (a *Aplikasi) tanganiCekStatus(w http.ResponseWriter, r *http.Request) {
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

	var (
		noReg, nama, jalur, status, tahun string
		namaJurusan, catatan              string
		dibuat                            string
	)
	err := a.db.QueryRow(`
		SELECT p.no_registrasi, p.nama_lengkap, p.jalur, p.status, p.tahun_ajaran,
		       COALESCE(j.nama, ''), COALESCE(p.catatan_admin, ''),
		       DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i')
		  FROM pendaftar p
		  LEFT JOIN jurusan j ON j.id = p.jurusan_id
		 WHERE p.no_registrasi = ? AND p.tanggal_lahir = ?`,
		strings.ToUpper(p.NoRegistrasi), strings.TrimSpace(p.TanggalLahir),
	).Scan(&noReg, &nama, &jalur, &status, &tahun, &namaJurusan, &catatan, &dibuat)

	if err == sql.ErrNoRows {
		kirimGalat(w, http.StatusNotFound,
			"Data tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir.")
		return
	}
	if err != nil {
		a.galatServer(w, "mencari status pendaftar", err)
		return
	}

	kirimJSON(w, http.StatusOK, map[string]any{
		"no_registrasi": noReg,
		"nama_lengkap":  nama,
		"jalur":         jalur,
		"nama_jurusan":  namaJurusan,
		"status":        status,
		"tahun_ajaran":  tahun,
		"catatan_admin": catatan,
		"dibuat":        dibuat,
		"pengumuman":    a.atur("ppdb_pengumuman"),
	})
}

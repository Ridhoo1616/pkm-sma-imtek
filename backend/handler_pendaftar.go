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

	// Tiga kolom di bawah bertipe teks di basis data, mengikuti bentuk isian
	// Dapodik yang kadang ditulis bebas. Pemeriksa rentang tetap dijalankan
	// untuk pesan galatnya, tetapi yang disimpan tetap teksnya, karena
	// PostgreSQL tidak mengubah angka menjadi teks dengan sendirinya.
	v.bulatRentang("anak_ke", "Anak ke-", isi("anak_ke"), 1, 20)
	v.bulatRentang("jumlah_saudara", "Jumlah saudara", isi("jumlah_saudara"), 0, 20)
	v.bulatRentang("tahun_lulus", "Tahun lulus", isi("tahun_lulus"), 2000, 2100)

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
			  WHERE nama_lengkap = $1 AND tanggal_lahir = $2 AND tahun_ajaran = $3`,
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
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
	          $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44)`,
		noReg, tahunAjaran, jalur, jurusanID,
		namaLengkap, kosongJadiNil(nisn), kosongJadiNil(nik), jenisKelamin,
		tempatLahir, tanggalLahir, agama,
		kosongJadiNil(isi("anak_ke")), kosongJadiNil(isi("jumlah_saudara")), alamat,
		kosongJadiNil(isi("kelurahan")), kosongJadiNil(isi("kecamatan")),
		kosongJadiNil(isi("kota")), kosongJadiNil(isi("provinsi")), kosongJadiNil(isi("kode_pos")),
		noHP, kosongJadiNil(email),
		asalSekolah, kosongJadiNil(isi("npsn_sekolah")), kosongJadiNil(isi("alamat_sekolah")),
		kosongJadiNil(isi("tahun_lulus")), nilaiRata2,
		namaAyah, kosongJadiNil(isi("pekerjaan_ayah")), kosongJadiNil(isi("pendidikan_ayah")),
		namaIbu, kosongJadiNil(isi("pekerjaan_ibu")), kosongJadiNil(isi("pendidikan_ibu")),
		kosongJadiNil(isi("penghasilan")), kosongJadiNil(isi("no_hp_ortu")), kosongJadiNil(isi("nama_wali")),
		nilBerkas(tersimpan, "file_foto"), nilBerkas(tersimpan, "file_ijazah"),
		nilBerkas(tersimpan, "file_kk"), nilBerkas(tersimpan, "file_akta"),
		nilBerkas(tersimpan, "file_raport"), nilBerkas(tersimpan, "file_prestasi"),
		kosongJadiNil(sumberInfo), kosongJadiNil(isi("catatan_sumber")), alamatPemanggil(r))
	if err != nil {
		bereskan()
		// Basis data punya batasan unik nama dengan tanggal lahir dan tahun
		// ajaran. Batasan itu menjaring pendaftaran ganda yang lolos dari
		// pemeriksaan di atas, misalnya dua kiriman yang tepat bersamaan.
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict,
				"Data dengan nama dan tanggal lahir yang sama sudah terdaftar "+
					"pada tahun ajaran ini. Gunakan menu Cek Status untuk memantaunya.")
			return
		}
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

	// Nomor urut dihitung dari data yang sudah ada, jadi dua pendaftaran
	// yang masuk bersamaan bisa memperoleh nomor yang sama. PostgreSQL tidak
	// mengizinkan FOR UPDATE pada kueri beragregat, jadi yang dipakai adalah
	// kunci penasihat bertingkat transaksi. Kunci itu dilepas sendiri saat
	// transaksinya selesai, baik berhasil maupun dibatalkan.
	if _, err := t.Exec("SELECT pg_advisory_xact_lock(hashtext($1))", tahunAjaran); err != nil {
		return "", err
	}

	var urut int
	if err := t.QueryRow(
		"SELECT COUNT(*) FROM pendaftar WHERE tahun_ajaran = $1", tahunAjaran,
	).Scan(&urut); err != nil {
		return "", err
	}

	// Pencacah bisa tidak sinkron bila ada data yang pernah dihapus, jadi
	// nomor dinaikkan sampai menemukan yang benar-benar belum terpakai.
	for i := 0; i < 1000; i++ {
		urut++
		no := fmt.Sprintf("PPDB-%s-%04d", kode, urut)
		var ada int
		err := t.QueryRow("SELECT id FROM pendaftar WHERE no_registrasi = $1", no).Scan(&ada)
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
		       to_char(p.created_at, 'YYYY-MM-DD HH24:MI')
		  FROM pendaftar p
		  LEFT JOIN jurusan j ON j.id = p.jurusan_id
		 WHERE p.no_registrasi = $1 AND p.tanggal_lahir = $2`,
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

	jawab := map[string]any{
		"no_registrasi": noReg,
		"nama_lengkap":  nama,
		"jalur":         jalur,
		"nama_jurusan":  namaJurusan,
		"status":        status,
		"tahun_ajaran":  tahun,
		"catatan_admin": catatan,
		"dibuat":        dibuat,
		"pengumuman":    a.atur("ppdb_pengumuman"),
	}

	// Keadaan tes seleksi ikut dikirim di sini, supaya halaman Cek Status
	// menjadi satu-satunya tempat yang perlu dibuka pendaftar: memantau
	// verifikasi, mengunduh kartu peserta, mengerjakan tes, lalu melihat
	// nilainya. Menyebarnya ke beberapa halaman hanya menambah bingung.
	jawab["ujian"] = a.keadaanUjianPendaftar(noReg, status)

	kirimJSON(w, http.StatusOK, jawab)
}

// keadaanUjianPendaftar merangkum apa yang boleh dilakukan pendaftar terhadap
// tes seleksi saat ini.
func (a *Aplikasi) keadaanUjianPendaftar(noReg, status string) map[string]any {
	keadaan := map[string]any{
		"dibuka":     false,
		"boleh_ikut": false,
		"sudah_ikut": false,
		"kartu_siap": status != "Menunggu Verifikasi" && status != "Ditolak",
		"hasil":      nil,
		"alasan":     "",
	}

	paket, err := a.paketBerlaku()
	dibuka := a.atur("ujian_aktif") == "1" && err == nil
	keadaan["dibuka"] = dibuka
	if dibuka {
		keadaan["nama_paket"] = paket.Nama
		keadaan["durasi_menit"] = paket.DurasiMenit
		keadaan["jumlah_soal"] = paket.JumlahSoal
	}

	switch status {
	case "Menunggu Verifikasi":
		keadaan["alasan"] = "Berkas Anda masih menunggu verifikasi panitia."
	case "Ditolak":
		keadaan["alasan"] = "Pendaftaran Anda tidak dilanjutkan ke tahap tes seleksi."
	default:
		keadaan["boleh_ikut"] = dibuka
	}

	if err != nil {
		return keadaan
	}

	// Sesi yang sudah ada dilaporkan apa adanya, termasuk nilainya, sehingga
	// pendaftar dapat memantau hasilnya tanpa menunggu pengumuman terpisah.
	var s SesiUjian
	errSesi := a.db.QueryRow(
		`SELECT s.id, s.pendaftar_id, s.paket_id, s.batas_pada, s.jumlah_soal,
		        s.jumlah_benar, s.skor, s.status, s.selesai_pada
		 FROM sesi_ujian s JOIN pendaftar p ON p.id = s.pendaftar_id
		 WHERE upper(p.no_registrasi) = upper($1) AND s.paket_id = $2`,
		noReg, paket.ID).
		Scan(&s.ID, &s.PendaftarID, &s.PaketID, &s.BatasPada, &s.JumlahSoal,
			&s.JumlahBenar, &s.Skor, &s.Status, &s.SelesaiPada)
	if errSesi != nil {
		return keadaan
	}

	keadaan["sudah_ikut"] = true
	if s.Status != "Berjalan" {
		keadaan["hasil"] = a.ringkasanSesi(s, paket)
		keadaan["boleh_ikut"] = false
	}
	return keadaan
}

package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// TipePDF dipakai ijazah: sekolah meminta ijazah dalam bentuk PDF saja.
var TipePDF = []string{"pdf"}

// berkasPendaftar mendaftar kolom unggahan formulir PPDB beserta labelnya,
// apakah wajib, dan tipe berkas yang diizinkan. Urutannya juga urutan di
// formulir, bukti pendaftaran, dan detail pendaftar.
//
// Daftar ini mengikuti revisi sekolah (Oktober 2026). Rapor dan sertifikat
// prestasi dilepas dari formulir; kolomnya tetap ada di basis data supaya
// berkas pendaftar lama tidak hilang.
var berkasPendaftar = []struct {
	Kolom string
	Label string
	Wajib bool
	Tipe  []string
}{
	{"file_foto", "Foto 3x4", true, TipeGambar},
	{"file_foto_2x3", "Foto 2x3", true, TipeGambar},
	{"file_skl", "Surat Keterangan Lulus (SKL)", true, TipeDokumen},
	{"file_ijazah", "Ijazah (PDF)", true, TipePDF},
	{"file_akta", "Akta Kelahiran", true, TipeDokumen},
	{"file_kk", "Kartu Keluarga", true, TipeDokumen},
	{"file_ktp_ortu", "KTP Orang Tua", true, TipeDokumen},
}

func (a *Aplikasi) tanganiDaftar(w http.ResponseWriter, r *http.Request) {
	if !a.ppdbDibuka() {
		kirimGalat(w, http.StatusConflict,
			"Pendaftaran peserta didik baru sedang tidak dibuka.")
		return
	}

	// Batas keseluruhan: tujuh berkas ditambah isian teks. Memori yang dipakai
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

	// Isian diperiksa oleh fungsi yang SAMA dengan penambahan dari panel,
	// supaya keduanya tidak menyimpang. Lihat pendaftar_isian.go.
	isi := func(k string) string { return strings.TrimSpace(r.FormValue(k)) }
	v := validasiBaru()
	d, err := a.periksaIsianPendaftar(v, isi, opsiIsian{
		WajibPernyataan: true,
		SekolahKetat:    true,
	})
	if err != nil {
		a.galatServer(w, "memeriksa isian pendaftar", err)
		return
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

	if v.bermasalah() {
		bereskan()
		kirimGalatValidasi(w, v)
		return
	}

	/* ---- simpan ---- */
	// Penyimpanannya juga satu fungsi dengan penambahan dari panel; yang
	// berbeda hanya berkas unggahan dan pencatat pembuatnya.
	transaksi, err := a.db.Begin()
	if err != nil {
		bereskan()
		a.galatServer(w, "memulai transaksi", err)
		return
	}
	// Rollback pada jalur galat; setelah Commit berhasil, panggilan ini
	// tidak berpengaruh apa-apa.
	defer transaksi.Rollback()

	noReg, err := a.simpanPendaftar(transaksi, d, tersimpan, 0, alamatPemanggil(r))
	if err != nil {
		bereskan()
		// Basis data punya DUA batasan unik untuk tahun ajaran yang sama:
		// nama dengan tanggal lahir, dan NISN. Keduanya menjaring pendaftaran
		// ganda yang lolos dari pemeriksaan di atas, misalnya dua kiriman yang
		// tepat bersamaan. Pesannya menyebut keduanya karena di sini yang
		// tersedia hanya kode SQLSTATE, bukan nama batasan yang dilanggar.
		if kodeGanda(err) {
			kirimGalat(w, http.StatusConflict,
				"Data ini sudah terdaftar pada tahun ajaran ini: nama dengan "+
					"tanggal lahir yang sama, atau NISN yang sama, sudah dipakai "+
					"pendaftaran lain. Gunakan menu Cek Status untuk memantaunya.")
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
		"tahun_ajaran":  a.atur("ppdb_tahun"),
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
	// Penebakan tanggal lahir dikunci per nomor registrasi. Keterangannya di
	// pembatas.go.
	if !a.izinkanCobaIdentitas(w, p.NoRegistrasi) {
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
		a.catatGagalIdentitas(p.NoRegistrasi)
		kirimGalat(w, http.StatusNotFound,
			"Data tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir.")
		return
	}
	if err != nil {
		a.galatServer(w, "mencari status pendaftar", err)
		return
	}
	a.bersihkanGagalIdentitas(p.NoRegistrasi)

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

	// Langkah daftar ulang hanya dikirim kepada yang diterima. Nilainya apa
	// adanya dari pengaturan; halaman yang menandai naskah yang belum diisi.
	if status == "Diterima" {
		jawab["daftar_ulang"] = map[string]string{
			"jadwal": a.atur("daftar_ulang_jadwal"),
			"tempat": a.atur("daftar_ulang_tempat"),
			"syarat": a.atur("daftar_ulang_syarat"),
		}
	}

	kirimJSON(w, http.StatusOK, jawab)
}

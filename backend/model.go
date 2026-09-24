package main

import "time"

type Pengguna struct {
	ID         int        `json:"id"`
	Nama       string     `json:"nama"`
	Username   string     `json:"username"`
	Role       string     `json:"role"`
	MasukAkhir *time.Time `json:"masuk_akhir"`
	Dibuat     time.Time  `json:"dibuat"` // kolom created_at
}

type Jurusan struct {
	ID        int    `json:"id"`
	Kode      string `json:"kode"`
	Nama      string `json:"nama"`
	Deskripsi string `json:"deskripsi"`
	Kuota     int    `json:"kuota"`
	Ikon      string `json:"ikon"` // kolom icon
	Aktif     bool   `json:"aktif"`
	Urutan    int    `json:"urutan"`
	Pendaftar int    `json:"pendaftar"` // dihitung, bukan kolom
}

type Fasilitas struct {
	ID        int    `json:"id"`
	Nama      string `json:"nama"`
	Deskripsi string `json:"deskripsi"`
	Gambar    string `json:"gambar"`
	Ikon      string `json:"ikon"` // kolom icon
	Urutan    int    `json:"urutan"`
}

type Berita struct {
	ID        int       `json:"id"`
	Judul     string    `json:"judul"`
	Slug      string    `json:"slug"`
	Kategori  string    `json:"kategori"`
	Ringkasan string    `json:"ringkasan"`
	Isi       string    `json:"isi"`
	Gambar    string    `json:"gambar"`
	Penulis   string    `json:"penulis"`
	Dibaca    int       `json:"dibaca"`
	Publish   bool      `json:"publish"`
	Dibuat    time.Time `json:"dibuat"`
	Diubah    time.Time `json:"diubah"`
}

type Galeri struct {
	ID         int       `json:"id"`
	Judul      string    `json:"judul"`
	Kategori   string    `json:"kategori"`
	Gambar     string    `json:"gambar"`
	Keterangan string    `json:"keterangan"`
	Dibuat     time.Time `json:"dibuat"`
}

type Pesan struct {
	ID     int       `json:"id"`
	Nama   string    `json:"nama"`
	Email  string    `json:"email"`
	NoHP   string    `json:"no_hp"`
	Subjek string    `json:"subjek"`
	Isi    string    `json:"isi"`
	Dibaca bool      `json:"dibaca"`
	Dibuat time.Time `json:"dibuat"`
}

// Pendaftar memuat seluruh kolom formulir PPDB. Nama kolom JSON mengikuti
// nama kolom basis data supaya mudah dilacak antara frontend dan backend.
type Pendaftar struct {
	ID               int      `json:"id"`
	NoRegistrasi     string   `json:"no_registrasi"`
	TahunAjaran      string   `json:"tahun_ajaran"`
	Jalur            string   `json:"jalur"`
	JurusanID        *int     `json:"jurusan_id"`
	NamaJurusan      string   `json:"nama_jurusan"`
	NamaLengkap      string   `json:"nama_lengkap"`
	NISN             string   `json:"nisn"`
	NIK              string   `json:"nik"`
	JenisKelamin     string   `json:"jenis_kelamin"`
	TempatLahir      string   `json:"tempat_lahir"`
	TanggalLahir     string   `json:"tanggal_lahir"`
	Agama            string   `json:"agama"`
	AnakKe           string   `json:"anak_ke"`
	JumlahSaudara    string   `json:"jumlah_saudara"`
	Alamat           string   `json:"alamat"`
	Kelurahan        string   `json:"kelurahan"`
	Kecamatan        string   `json:"kecamatan"`
	Kota             string   `json:"kota"`
	Provinsi         string   `json:"provinsi"`
	KodePos          string   `json:"kode_pos"`
	NoHP             string   `json:"no_hp"`
	Email            string   `json:"email"`
	AsalSekolah      string   `json:"asal_sekolah"`
	NPSNSekolah      string   `json:"npsn_sekolah"`
	AlamatSekolah    string   `json:"alamat_sekolah"`
	TahunLulus       string   `json:"tahun_lulus"`
	NilaiRata2       *float64 `json:"nilai_rata2"`
	NamaAyah         string   `json:"nama_ayah"`
	PekerjaanAyah    string   `json:"pekerjaan_ayah"`
	PendidikanAyah   string   `json:"pendidikan_ayah"`
	NamaIbu          string   `json:"nama_ibu"`
	PekerjaanIbu     string   `json:"pekerjaan_ibu"`
	PendidikanIbu    string   `json:"pendidikan_ibu"`
	Penghasilan      string   `json:"penghasilan"`
	NoHPOrtu         string   `json:"no_hp_ortu"`
	NamaWali         string   `json:"nama_wali"`
	FileFoto         string   `json:"file_foto"`
	FileIjazah       string   `json:"file_ijazah"`
	FileKK           string   `json:"file_kk"`
	FileAkta         string   `json:"file_akta"`
	FileRaport       string   `json:"file_raport"`
	FilePrestasi     string   `json:"file_prestasi"`
	SumberInfo       string   `json:"sumber_informasi"`
	CatatanSumber    string   `json:"catatan_sumber"`
	Status           string   `json:"status"`
	CatatanAdmin     string   `json:"catatan_admin"`
	DiverifikasiOleh *int     `json:"diverifikasi_oleh"`
	NamaVerifikator  string   `json:"nama_verifikator"`
	IPPendaftar      string   `json:"ip_pendaftar,omitempty"`
	Dibuat           string   `json:"dibuat"` // created_at, sudah diformat
	Diubah           string   `json:"diubah"` // updated_at, sudah diformat
}

var StatusPendaftar = []string{
	"Menunggu Verifikasi", "Terverifikasi", "Diterima", "Cadangan", "Ditolak",
}

var JalurPendaftaran = []string{
	"Reguler", "Prestasi", "Afirmasi", "Perpindahan Tugas Orang Tua",
}

var KategoriBerita = []string{"Berita", "Pengumuman", "Prestasi", "Kegiatan"}

func statusSah(s string) bool   { return adaDalam(StatusPendaftar, s) }
func jalurSah(s string) bool    { return adaDalam(JalurPendaftaran, s) }
func kategoriSah(s string) bool { return adaDalam(KategoriBerita, s) }

// adaDalam menjawab apakah sebuah nilai termasuk dalam daftar yang diizinkan.
func adaDalam(daftar []string, nilai string) bool {
	for _, x := range daftar {
		if x == nilai {
			return true
		}
	}
	return false
}

// SumberInformasi mencatat dari mana calon peserta didik mengetahui sekolah.
// Kolom inilah yang menjawab tujuan PkM: menilai efektivitas promosi. Urutan
// dipertahankan karena dipakai sebagai urutan pilihan pada formulir.
var SumberInformasi = []string{
	"Website Sekolah", "Instagram", "Facebook", "TikTok", "WhatsApp", "Google",
	"Brosur/Spanduk", "Sosialisasi Sekolah", "Teman/Keluarga", "Alumni",
	"Guru SMP", "Lainnya",
}

// LabelSumberInformasi memberi keterangan yang lebih jelas untuk ditampilkan
// pada formulir dan laporan.
var LabelSumberInformasi = map[string]string{
	"Website Sekolah":     "Website resmi sekolah",
	"Instagram":           "Instagram",
	"Facebook":            "Facebook",
	"TikTok":              "TikTok",
	"WhatsApp":            "Pesan/Grup WhatsApp",
	"Google":              "Pencarian Google",
	"Brosur/Spanduk":      "Brosur atau spanduk",
	"Sosialisasi Sekolah": "Sosialisasi ke SMP/MTs",
	"Teman/Keluarga":      "Teman atau keluarga",
	"Alumni":              "Alumni sekolah",
	"Guru SMP":            "Guru/BK di SMP",
	"Lainnya":             "Lainnya",
}

var JenisKelamin = []string{"L", "P"}

var Agama = []string{"Islam", "Kristen Protestan", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"}

func sumberSah(s string) bool { return adaDalam(SumberInformasi, s) }

/* ---------------- profil, akademik, dan kesiswaan ---------------- */

// Halaman adalah satu halaman bernaskah panjang: Kurikulum, OSIS,
// Pendidikan Karakter, dan halaman lain yang ditambahkan sekolah kemudian.
type Halaman struct {
	ID        int    `json:"id"`
	Slug      string `json:"slug"`
	Judul     string `json:"judul"`
	Ringkasan string `json:"ringkasan"`
	Isi       string `json:"isi"`
	// Visi dan misi milik halaman ini sendiri — misalnya visi misi OSIS,
	// yang bukan visi misi sekolah. Kosong berarti bagiannya tidak tampil.
	// Misi ditulis satu baris satu poin, seperti pengaturan misi sekolah.
	Visi string `json:"visi"`
	Misi string `json:"misi"`
	// Nama kategori pada tabel galeri yang fotonya ditampilkan halaman ini.
	// Kosong berarti halaman itu tidak menampilkan galeri sama sekali.
	GaleriKategori string    `json:"galeri_kategori"`
	Gambar         string    `json:"gambar"`
	Kelompok       string    `json:"kelompok"`
	Urutan         int       `json:"urutan"`
	Aktif          bool      `json:"aktif"`
	Diubah         time.Time `json:"diubah"`
}

type Tenaga struct {
	ID            int    `json:"id"`
	Nama          string `json:"nama"`
	NIP           string `json:"nip"`
	Jabatan       string `json:"jabatan"`
	MataPelajaran string `json:"mata_pelajaran"`
	// Nama kelas yang diampu sebagai wali kelas, misalnya "X-1". Kosong
	// berarti bukan wali kelas — wajar bagi pimpinan dan tenaga kependidikan.
	WaliKelas string `json:"wali_kelas"`
	Kategori  string `json:"kategori"`
	Foto      string `json:"foto"`
	Urutan    int    `json:"urutan"`
	Aktif     bool   `json:"aktif"`
}

type Agenda struct {
	ID         int    `json:"id"`
	Judul      string `json:"judul"`
	Mulai      string `json:"mulai"`
	Selesai    string `json:"selesai"`
	Kategori   string `json:"kategori"`
	Keterangan string `json:"keterangan"`
	Aktif      bool   `json:"aktif"`
}

type KegiatanSiswa struct {
	ID        int    `json:"id"`
	Nama      string `json:"nama"`
	Jenis     string `json:"jenis"`
	Deskripsi string `json:"deskripsi"`
	Pembina   string `json:"pembina"`
	Jadwal    string `json:"jadwal"`
	Gambar    string `json:"gambar"`
	Urutan    int    `json:"urutan"`
	Aktif     bool   `json:"aktif"`
}

type Pustaka struct {
	ID         int    `json:"id"`
	Judul      string `json:"judul"`
	Penulis    string `json:"penulis"`
	Kategori   string `json:"kategori"`
	Tahun      *int   `json:"tahun"`
	Keterangan string `json:"keterangan"`
	Tautan     string `json:"tautan"`
	Berkas     string `json:"berkas"`
	Urutan     int    `json:"urutan"`
	Aktif      bool   `json:"aktif"`
}

// Pilihan yang dipakai formulir panel admin sekaligus menjadi acuan CHECK
// pada migrasi 004. Keduanya harus tetap sama.
var (
	KelompokHalaman = []string{"Profil", "Akademik", "Kesiswaan"}
	KategoriTenaga  = []string{"Pimpinan", "Pendidik", "Kependidikan"}
	KategoriAgenda  = []string{"Kegiatan", "Ujian", "Libur", "PPDB", "Rapat", "Lainnya"}
	JenisKegiatan   = []string{"Ekstrakurikuler", "OSIS", "Pembinaan"}
)

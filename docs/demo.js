/* ==================================================================
   Demo Profil Sekolah & PPDB SMA IMTEK
   ------------------------------------------------------------------
   Seluruh tampilan pada berkas ini adalah HTML yang benar-benar
   dirender aplikasi Next.js, ditangkap apa adanya beserta kelas
   Tailwind-nya. Yang ditulis ulang hanya lapisan datanya: di
   aplikasi sebenarnya data berasal dari API Go dan basis data
   PostgreSQL, sedangkan di demo ini data disimpan pada penyimpanan
   peramban pengunjung masing-masing.
   ================================================================== */

const KUNCI = "demo_pkm_v4";

/* ---------- keadaan ---------- */

const bawaan = {
  pendaftar: DATA.pendaftar.map((p) => ({ ...p })),
  detail: { ...DATA.detail },
  berita: DATA.berita.map((b) => ({ ...b })),
  galeri: DATA.galeri.map((g) => ({ ...g })),
  fasilitas: DATA.fasilitas.map((f) => ({ ...f })),
  jurusan: DATA.jurusan.map((j) => ({ ...j })),
  pesan: DATA.pesan.map((p) => ({ ...p })),
  pengguna: DATA.pengguna.map((u) => ({ ...u })),
  pengaturan: { ...DATA.pengaturan },
  // ----- fitur yang ditambahkan kemudian -----
  biaya: DATA.biaya.map((b) => ({ ...b })),
  soal: DATA.soal.map((s) => ({ ...s })),
  paketUjian: DATA.paketUjian.map((p) => ({ ...p })),
  notifikasi: DATA.notifikasi.map((n) => ({ ...n })),
  faq: DATA.faq.map((f) => ({ ...f })),
  kategoriFaq: [...DATA.kategoriFaq],
  // Sesi ujian dimulai kosong: pada demo, setiap pengunjung mengerjakan
  // tesnya sendiri, dan hasil peserta contoh sudah ada di hasilUjian.
  sesiUjian: [],
  urutBerikut: DATA.pendaftar.length + 1,
};

/** Menyalin agar data bawaan tidak ikut berubah saat demo dipakai. */
function salin(o) {
  return JSON.parse(JSON.stringify(o));
}

function muat() {
  try {
    const teks = localStorage.getItem(KUNCI);
    if (teks) {
      const tersimpan = JSON.parse(teks);
      // Gabungkan agar penambahan bidang baru tidak mematahkan data lama.
      return { ...salin(bawaan), ...tersimpan };
    }
  } catch {
    /* penyimpanan bisa diblokir; demo tetap jalan dengan data bawaan */
  }
  return salin(bawaan);
}

/* Keadaan dibaca setelah seluruh pembantunya siap; menaruh baris ini di
   atas definisi salin() membuat pembacaannya gagal karena const belum
   terinisialisasi. */
let K = muat();

function simpan() {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(K));
  } catch {
    /* diabaikan: demo tetap berjalan sampai halaman dimuat ulang */
  }
}

function ulangDariAwal() {
  try {
    localStorage.removeItem(KUNCI);
  } catch {
    /* diabaikan */
  }
  K = salin(bawaan);
  sesi = null;
  location.hash = "#/";
  location.reload();
}

/* Sesi petugas hanya bertahan selama halaman terbuka, seperti aslinya
   yang memakai token dengan masa berlaku. */
let sesi = null;

/* ---------- pembantu penyajian ---------- */

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

function tanggalPanjang(teks) {
  if (!teks) return "-";
  const t = new Date(String(teks).replace(" ", "T"));
  if (Number.isNaN(t.getTime())) return teks;
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

function tanggalJam(teks) {
  if (!teks) return "-";
  const t = new Date(String(teks).replace(" ", "T"));
  if (Number.isNaN(t.getTime())) return teks;
  const jj = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${tanggalPanjang(teks)}, ${jj}.${mm}`;
}

function namaBulan(teks) {
  const [tahun, bulan] = String(teks).split("-");
  const i = Number(bulan) - 1;
  return BULAN[i] ? `${BULAN[i]} ${tahun}` : teks;
}

const angka = (n) => Number(n || 0).toLocaleString("id-ID");

function nilaiRapor(n) {
  if (n === null || n === undefined || n === "") return "-";
  return Number(n).toLocaleString("id-ID", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

const persen = (bagian, total) => (total ? Math.round((bagian / total) * 100) : 0);

const jenisKelaminPanjang = (k) =>
  k === "P" ? "Perempuan" : k === "L" ? "Laki-laki" : "-";

function warnaStatus(status) {
  switch (status) {
    case "Diterima":      return "bg-green-100 text-green-800 border-green-200";
    case "Terverifikasi": return "bg-blue-100 text-blue-800 border-blue-200";
    case "Cadangan":      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Ditolak":       return "bg-red-100 text-red-800 border-red-200";
    default:              return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

/** Meloloskan teks agar aman dimasukkan ke dalam HTML. */
function e(teks) {
  return String(teks ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const hariIni = () => new Date().toISOString().slice(0, 10);

function waktuSekarang() {
  const t = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ` +
         `${p(t.getHours())}:${p(t.getMinutes())}`;
}

/* PPDB dianggap dibuka bila statusnya "buka" dan hari ini berada di dalam
   rentang tanggalnya, sama seperti pemeriksaan di backend. */
function ppdbDibuka() {
  if ((K.pengaturan.ppdb_status || "tutup") !== "buka") return false;
  const h = hariIni();
  if (K.pengaturan.ppdb_mulai && h < K.pengaturan.ppdb_mulai) return false;
  if (K.pengaturan.ppdb_selesai && h > K.pengaturan.ppdb_selesai) return false;
  return true;
}

const tahunAjaran = () => K.pengaturan.ppdb_tahun || "";

/** Pendaftar pada tahun ajaran aktif. */
const pendaftarAktif = () =>
  K.pendaftar.filter((p) => p.tahun_ajaran === tahunAjaran());

function nomorRegistrasiBaru() {
  const kode = String(tahunAjaran()).replace(/\D/g, "");
  const singkat = kode.length >= 8 ? kode.slice(2, 4) + kode.slice(6, 8) : "0000";
  let urut = K.urutBerikut;
  let no;
  do {
    no = `PPDB-${singkat}-${String(urut).padStart(4, "0")}`;
    urut++;
  } while (K.pendaftar.some((p) => p.no_registrasi === no));
  K.urutBerikut = urut;
  return no;
}

/* ==================================================================
   Susunan menu bertingkat

   Ditaruh di berkas pertama karena tandaiMenuAktif() pada 02-rute.js
   memerlukannya sejak halaman pertama dimuat, sedangkan perilaku menunya
   dipasang di 08-navigasi.js yang dievaluasi lebih akhir.
   ================================================================== */

const MENU_BERTINGKAT = [
  {
    label: "Profil Sekolah",
    jalur: "/profil",
    anak: [
      ["/profil/sejarah", "Sejarah Sekolah"],
      ["/profil/data-sekolah", "Data Sekolah"],
      ["/profil/visi-misi", "Visi & Misi"],
      ["/fasilitas", "Sarana dan Prasarana"],
      ["/profil/struktur-organisasi", "Struktur Organisasi"],
      ["/profil/tenaga-pendidik", "Tenaga Pendidik dan Kependidikan"],
    ],
  },
  {
    label: "Akademik",
    jalur: "/akademik",
    anak: [
      ["/akademik/elearning", "E-Learning / LMS"],
      ["/akademik/jadwal", "Jadwal Pelajaran"],
      ["/akademik/kalender", "Kalender Akademik"],
      ["/halaman/kurikulum", "Kurikulum"],
      ["/akademik/perpustakaan", "Perpustakaan Digital"],
    ],
  },
  {
    label: "Kesiswaan",
    jalur: "/kesiswaan",
    anak: [
      ["/kesiswaan/ekstrakurikuler", "Ekstrakurikuler"],
      ["/halaman/osis", "OSIS"],
      ["/kesiswaan/prestasi", "Prestasi Siswa"],
      ["/halaman/pendidikan-karakter", "Pendidikan Karakter"],
    ],
  },
  {
    label: "PPDB",
    jalur: "/ppdb",
    anak: [
      ["/ppdb", "Ketentuan & Jadwal"],
      ["/ppdb/daftar", "Formulir Pendaftaran"],
      ["/ppdb/cek", "Cek Status & Hasil"],
      ["/ppdb/ujian", "Tes Seleksi"],
      ["/faq", "Tanya Jawab"],
    ],
  },
];

/* ==================================================================
   Perutean
   Alamat memakai tanda pagar supaya seluruh demo dapat dilayani
   sebagai satu berkas statis oleh GitHub Pages.
   ================================================================== */

const situs = document.getElementById("situs");
const panel = document.getElementById("panel");
const isiPublik = document.getElementById("isi-publik");
const isiPanel = document.getElementById("isi-panel");

const RUTE = [
  [/^\/$/,                      () => bukaPublik("beranda")],
  [/^\/profil$/,                () => bukaPublik("profil")],
  [/^\/profil\/sejarah$/,       () => bukaPublik("profilSejarah")],
  [/^\/profil\/data-sekolah$/,  () => bukaPublik("profilData")],
  [/^\/profil\/visi-misi$/,     () => bukaPublik("profilVisiMisi")],
  [/^\/profil\/struktur-organisasi$/, () => bukaPublik("profilStruktur")],
  [/^\/profil\/tenaga-pendidik$/,     () => bukaPublik("profilTenaga")],
  [/^\/akademik$/,              () => bukaPublik("akademik")],
  [/^\/akademik\/elearning$/,   () => bukaPublik("akademikElearning")],
  [/^\/akademik\/jadwal$/,      () => bukaPublik("akademikJadwal")],
  [/^\/akademik\/kalender$/,    () => bukaPublik("akademikKalender")],
  [/^\/akademik\/perpustakaan$/, () => bukaPublik("akademikPerpustakaan")],
  [/^\/kesiswaan$/,             () => bukaPublik("kesiswaan")],
  [/^\/kesiswaan\/ekstrakurikuler$/, () => bukaPublik("kesiswaanEkstra")],
  [/^\/kesiswaan\/prestasi$/,   () => bukaPublik("kesiswaanPrestasi")],
  [/^\/halaman\/kurikulum$/,    () => bukaPublik("halamanKurikulum")],
  [/^\/halaman\/osis$/,         () => bukaPublik("halamanOsis")],
  [/^\/halaman\/pendidikan-karakter$/, () => bukaPublik("halamanKarakter")],
  [/^\/fasilitas$/,             () => bukaPublik("fasilitas")],
  [/^\/berita$/,                () => bukaBerita()],
  [/^\/berita\/(.+)$/,          (m) => bukaBeritaDetail(m[1])],
  [/^\/galeri$/,                () => bukaGaleri()],
  [/^\/kontak$/,                () => bukaKontak()],
  [/^\/faq$/,                  () => bukaFaq()],
  [/^\/ppdb$/,                  () => bukaPpdb()],
  [/^\/ppdb\/daftar$/,          () => bukaFormulir()],
  [/^\/ppdb\/cek$/,             () => bukaCekStatus()],
  [/^\/ppdb\/ujian$/,           () => bukaUjian()],
  [/^\/admin\/masuk$/,          () => bukaMasuk()],
  [/^\/admin$/,                 () => bukaPanel("dasbor")],
  [/^\/admin\/pendaftar$/,      () => bukaPanel("pendaftar")],
  [/^\/admin\/pendaftar\/(\d+)$/, (m) => bukaPanel("pendaftarDetail", m[1])],
  [/^\/admin\/laporan$/,        () => bukaPanel("laporan")],
  [/^\/admin\/jurusan$/,        () => bukaPanel("jurusan")],
  [/^\/admin\/berita$/,         () => bukaPanel("beritaAdmin")],
  [/^\/admin\/galeri$/,         () => bukaPanel("galeriAdmin")],
  [/^\/admin\/fasilitas$/,      () => bukaPanel("fasilitasAdmin")],
  [/^\/admin\/pesan$/,          () => bukaPanel("pesan")],
  [/^\/admin\/biaya$/,          () => bukaPanel("biayaAdmin")],
  [/^\/admin\/soal$/,           () => bukaPanel("soalAdmin")],
  [/^\/admin\/ujian$/,          () => bukaPanel("ujianAdmin")],
  [/^\/admin\/notifikasi$/,     () => bukaPanel("notifikasiAdmin")],
  [/^\/admin\/halaman$/,        () => bukaPanel("halamanAdmin")],
  [/^\/admin\/tenaga$/,         () => bukaPanel("tenagaAdmin")],
  [/^\/admin\/kalender$/,       () => bukaPanel("kalenderAdmin")],
  [/^\/admin\/kegiatan$/,       () => bukaPanel("kegiatanAdmin")],
  [/^\/admin\/pustaka$/,        () => bukaPanel("pustakaAdmin")],
  [/^\/admin\/pengaturan$/,     () => bukaPanel("pengaturan")],
  [/^\/admin\/pengguna$/,       () => bukaPanel("pengguna")],
  [/^\/admin\/sandi$/,          () => bukaPanel("sandi")],
];

function jalurSekarang() {
  const h = location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h.split("?")[0] : "/";
}

function kueriSekarang() {
  const h = location.hash.replace(/^#/, "");
  const i = h.indexOf("?");
  return new URLSearchParams(i >= 0 ? h.slice(i + 1) : "");
}

function pergi(jalur) {
  if (location.hash === `#${jalur}`) rute();
  else location.hash = jalur;
}

function rute() {
  tutupJendela();
  const jalur = jalurSekarang();

  for (const [pola, tangani] of RUTE) {
    const m = jalur.match(pola);
    if (m) {
      tangani(m);
      tandaiMenuAktif(jalur);
      // Penanda pada tombol bantuan bergantung halaman yang sedang dibuka,
      // jadi dipasang ulang setiap perpindahan.
      pasangBantuan();
      // Menu bertingkat ditutup, seperti pada aplikasinya. Tanpa ini panel
      // turunannya menggantung di atas halaman baru.
      if (window.tutupMenuBertingkat) window.tutupMenuBertingkat();
      if (window.tutupMenuRingkas) window.tutupMenuRingkas();
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
  }
  // Alamat yang tidak dikenal dikembalikan ke beranda, bukan halaman kosong.
  pergi("/");
}

/** Menampilkan halaman publik dari HTML yang sudah ditangkap. */
function bukaPublik(nama) {
  situs.hidden = false;
  panel.hidden = true;
  wadahMasuk.hidden = true;
  isiPanel.innerHTML = "";
  isiPublik.innerHTML = HALAMAN[nama];
  if (nama === "beranda") segarkanBeranda();
  if (nama === "fasilitas") segarkanFasilitas();
}

/** Menampilkan halaman panel; menolak bila belum masuk, seperti aslinya. */
function bukaPanel(nama, argumen) {
  if (!sesi) {
    pergi("/admin/masuk");
    return;
  }
  situs.hidden = true;
  panel.hidden = false;
  wadahMasuk.hidden = true;
  isiPublik.innerHTML = "";

  const hidrasi = {
    dasbor: hidrasiDasbor,
    pendaftar: hidrasiPendaftar,
    pendaftarDetail: () => hidrasiPendaftarDetail(argumen),
    laporan: hidrasiLaporan,
    jurusan: hidrasiJurusan,
    beritaAdmin: hidrasiBeritaAdmin,
    galeriAdmin: hidrasiGaleriAdmin,
    fasilitasAdmin: hidrasiFasilitasAdmin,
    pesan: hidrasiPesan,
    pengaturan: hidrasiPengaturan,
    pengguna: hidrasiPengguna,
    sandi: hidrasiSandi,
  }[nama];

  isiPanel.innerHTML = HALAMAN[nama];
  if (hidrasi) hidrasi();
}

function bukaMasuk() {
  situs.hidden = true;
  panel.hidden = true;
  // Isi halaman lain dibersihkan supaya tidak ada formulir tersembunyi yang
  // masih tertinggal di DOM dan ikut tertangkap pencarian elemen.
  isiPublik.innerHTML = "";
  isiPanel.innerHTML = "";
  wadahMasuk.hidden = false;
  wadahMasuk.innerHTML = HALAMAN.masuk;
  siapkanMasuk();
}

/** Menandai menu yang sedang dibuka, baik pada navigasi publik maupun panel. */
function tandaiMenuAktif(jalur) {
  const aktifPublik = "bg-biru-muda text-biru";
  const takAktifPublik = "text-teks hover:bg-biru-muda hover:text-biru";
  // Hanya butir menu, bukan tautan nama sekolah yang juga menunjuk ke "/".
  situs.querySelectorAll("nav ul a[href]").forEach((a) => {
    const t = a.getAttribute("href");
    if (!t || !t.startsWith("/")) return;
    const cocok = t === "/" ? jalur === "/" : jalur.startsWith(t);
    a.className = a.className
      .replace(aktifPublik, "").replace(takAktifPublik, "").trim() +
      " " + (cocok ? aktifPublik : takAktifPublik);
  });

  // Kelompok bertingkat dibuka oleh <button>, bukan <a>, jadi penandanya
  // ditentukan dari jalur anak-anaknya yang tercatat di MENU_BERTINGKAT.
  situs.querySelectorAll("nav > div > ul > li > button[aria-expanded]").forEach((b) => {
    const kelompok = MENU_BERTINGKAT.find((k) => b.textContent.trim().startsWith(k.label));
    if (!kelompok) return;
    const cocok = [kelompok.jalur, ...kelompok.anak.map((a) => a[0])].some((t) =>
      t === "/" ? jalur === "/" : jalur.startsWith(t));
    b.className = b.className
      .replace(aktifPublik, "").replace(takAktifPublik, "").trim() +
      " " + (cocok ? aktifPublik : takAktifPublik);
  });

  const aktifPanel = "bg-biru text-white";
  const takAktifPanel = "text-white/75 hover:bg-white/10 hover:text-white";
  panel.querySelectorAll("nav a[href]").forEach((a) => {
    const t = a.getAttribute("href");
    if (!t || !t.startsWith("/admin")) return;
    const cocok = t === "/admin" ? jalur === "/admin" : jalur.startsWith(t);
    a.className = a.className
      .replace(aktifPanel, "").replace(takAktifPanel, "").trim() +
      " " + (cocok ? aktifPanel : takAktifPanel);
  });
}

/* Seluruh tautan di dalam HTML tangkapan masih memakai alamat aslinya,
   jadi kliknya ditangkap di satu tempat dan dialihkan ke perutean demo. */
document.addEventListener("click", (ev) => {
  const a = ev.target.closest("a[href]");
  if (!a) return;
  const tujuan = a.getAttribute("href");
  if (!tujuan) return;

  if (tujuan.startsWith("/")) {
    ev.preventDefault();
    pergi(tujuan);
    return;
  }
  // Tautan luar seperti wa.me, mailto, dan tel dibiarkan apa adanya.
});

window.addEventListener("hashchange", rute);

/* ---------- ikon fasilitas dan peminatan ----------
   Jalur SVG-nya disalin dari src/komponen/Ikon.tsx pada aplikasi, supaya
   gambarnya persis sama dengan yang dilihat pengunjung di aplikasi. */
const PETA_IKON = {
  "bi-pc-display": '<rect x="2.5" y="4" width="19" height="12.5" rx="2" /> <path d="M8.5 20.5h7M12 16.5v4" />',
  "bi-eyedropper": '<path d="M9.5 12.5 4 18v2.5h2.5l5.5-5.5" /> <path d="m12.8 9.2 2 2M14.5 4.9l4.6 4.6a2 2 0 0 1 0 2.8l-1.4 1.4-7.4-7.4 1.4-1.4a2 2 0 0 1 2.8 0Z" />',
  "bi-book": '<path d="M4 4.5h5.5a2.5 2.5 0 0 1 2.5 2.5v13a2 2 0 0 0-2-2H4Z" /> <path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v13a2 2 0 0 1 2-2h6Z" />',
  "bi-dribbble": '<circle cx="12" cy="12" r="9.2" /> <path d="M4.2 8.4c5 .5 9.6-.6 13-3.3M3.4 14.6c4.6-1.8 9.6-1 13 2.4M8.6 3.4c3 3.6 5 8.3 5.4 13.6" />',
  "bi-moon-stars": '<path d="M20.5 15.2A8.2 8.2 0 0 1 9.4 4.2a8.5 8.5 0 1 0 11.1 11Z" /> <path d="m17.5 3.2.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" />',
  "bi-easel": '<rect x="3" y="3.5" width="18" height="10.5" rx="1.6" /> <path d="M12 14v6.5M12 17.5l-4 3M12 17.5l4 3" />',
  "bi-heart-pulse": '<path d="M20.3 6.2a4.6 4.6 0 0 0-6.6 0L12 7.9l-1.7-1.7a4.6 4.6 0 1 0-6.6 6.5l8.3 8.4 8.3-8.4a4.6 4.6 0 0 0 0-6.5Z" /> <path d="M4.5 12.5h3l1.5-2.5 2 5 1.7-3.5 1.3 1h3.5" />',
  "bi-shop": '<path d="M3.5 9.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z" /> <path d="M2.8 9.5 4.5 4h15l1.7 5.5a2.6 2.6 0 0 1-4.6 1.4 2.6 2.6 0 0 1-4.6 0 2.6 2.6 0 0 1-4.6 0 2.6 2.6 0 0 1-4.6-1.4Z" />',
  "bi-calculator": '<rect x="4.5" y="2.8" width="15" height="18.4" rx="2" /> <path d="M7.8 6.5h8.4v3H7.8zM8.2 13.2h.01M12 13.2h.01M15.8 13.2h.01M8.2 17h.01M12 17h.01M15.8 17h.01" />',
  "bi-globe-americas": '<circle cx="12" cy="12" r="9.2" /> <path d="M2.9 12h18.2" /> <path d="M12 2.8a14 14 0 0 1 0 18.4 14 14 0 0 1 0-18.4Z" />',
  "bi-translate": '<path d="M3.2 5.5h8.4M7.4 3.4v2.1M9.6 5.5c-.5 4-2.9 7.2-6.4 8.6M5.2 9.2c1 2.2 2.9 3.9 5.2 4.6" /> <path d="m12.8 20.6 4-10 4 10M14.4 17.2h4.8" />',
  "gedung": '<path d="M3.2 20.5h17.6M4.8 20.5V9.8L12 5.5l7.2 4.3v10.7" /> <path d="M10 20.5v-4.6h4v4.6M9.4 11.8h1.4M13.2 11.8h1.4" />',
};

function ikonFasilitas(nama, ukuran = 18) {
  const isi = PETA_IKON[(nama || "").trim().toLowerCase()] || PETA_IKON["gedung"];
  return `<svg viewBox="0 0 24 24" width="${ukuran}" height="${ukuran}" aria-hidden="true" focusable="false"
    fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${isi}</svg>`;
}

/* ==================================================================
   Halaman publik
   Bagian yang dapat berubah karena tindakan pengunjung atau admin
   dirender ulang dari data, memakai kelas yang sama dengan komponen
   aslinya. Bagian yang tetap dipakai apa adanya dari tangkapan.
   ================================================================== */

/* Foto sekolah belum tersedia, jadi demo memakai gambar pengganti yang
   dibentuk dari nama berkasnya supaya tiap foto tampil berbeda. */
function gambarPengganti(nama, label) {
  let h = 0;
  for (const c of String(nama)) h = (h * 31 + c.charCodeAt(0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${(h + 200) % 360} 42% 76%)"/>
<stop offset="1" stop-color="hsl(${(h + 230) % 360} 38% 58%)"/>
</linearGradient></defs>
<rect width="640" height="480" fill="url(#g)"/>
<g fill="#ffffff" opacity="0.72">
<rect x="228" y="196" width="184" height="118" rx="10" fill="none" stroke="#fff" stroke-width="7"/>
<circle cx="320" cy="252" r="30" fill="none" stroke="#fff" stroke-width="7"/>
<rect x="286" y="176" width="68" height="18" rx="6"/></g>
<text x="320" y="374" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif"
 font-size="26" fill="#ffffff" opacity="0.9">${(label || "Foto sekolah").slice(0, 34)}</text>
<text x="320" y="408" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif"
 font-size="19" fill="#ffffff" opacity="0.65">gambar pengganti untuk demo</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const lencana = (teks, warna = "bg-biru-muda text-biru border-biru/15") =>
  `<span class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${warna}">${e(teks)}</span>`;

const gambarKosong = (label, tinggi = "h-48") =>
  `<div class="${tinggi} grid w-full place-items-center bg-biru-muda text-center">
     <span class="px-4 text-xs font-semibold text-biru/60">${e(label)}</span></div>`;

function gambarBerita(b, tinggi = "h-48") {
  if (!b.gambar) return gambarKosong(b.kategori, tinggi);
  return `<img src="${gambarPengganti(b.gambar, b.judul)}" alt="${e(b.judul)}"
            class="${tinggi} w-full object-cover" loading="lazy">`;
}

/* ---------- beranda ---------- */

function segarkanBeranda() {
  const total = pendaftarAktif().length;
  const kuota = Number(K.pengaturan.ppdb_kuota || 0);
  const sisa = Math.max(kuota - total, 0);

  // Tiga angka pada kartu keadaan PPDB.
  const kartu = isiPublik.querySelectorAll("dl.grid.grid-cols-3 > div");
  const nilai = [angka(kuota), angka(total), angka(sisa)];
  kartu.forEach((d, i) => {
    const dd = d.querySelector("dd");
    if (dd && nilai[i] !== undefined) dd.textContent = nilai[i];
  });

  // Bilah kuota terisi.
  const bilah = isiPublik.querySelector(".h-2\\.5.overflow-hidden > div");
  if (bilah) bilah.style.width = `${Math.min(persen(total, kuota), 100)}%`;
  isiPublik.querySelectorAll("span.tabular-nums").forEach((s) => {
    if (/^\d+%$/.test(s.textContent.trim())) s.textContent = `${persen(total, kuota)}%`;
  });

  // Keadaan dibuka atau belum.
  const lencanaKeadaan = [...isiPublik.querySelectorAll("span")].find((s) =>
    ["Dibuka", "Belum dibuka"].includes(s.textContent.trim()));
  if (lencanaKeadaan) {
    const buka = ppdbDibuka();
    lencanaKeadaan.textContent = buka ? "Dibuka" : "Belum dibuka";
    lencanaKeadaan.className =
      "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
      (buka ? "border-green-200 bg-green-100 text-green-800"
            : "border-slate-200 bg-slate-100 text-slate-700");
  }

  segarkanJurusanBeranda();
  segarkanBeritaBeranda();
}

function segarkanJurusanBeranda() {
  // Petaknya dirender ulang seluruhnya, bukan hanya angkanya, supaya
  // peminatan yang ditambahkan atau dinonaktifkan dari panel ikut terlihat.
  const petak = isiPublik.querySelector(".grid.gap-6.md\\:grid-cols-2");
  if (!petak) return;
  const aktif = K.jurusan.filter((j) => j.aktif).sort((a, b) => a.urutan - b.urutan || a.id - b.id);

  const seksi = petak.closest("section");
  if (aktif.length === 0) {
    if (seksi) seksi.hidden = true;
    return;
  }
  if (seksi) seksi.hidden = false;

  petak.innerHTML = aktif.map((j) => {
    const jml = pendaftarAktif().filter((p) => p.jurusan_id === j.id).length;
    const sisa = Math.max(j.kuota - jml, 0);
    return `
    <div><div class="kartu flex h-full flex-col p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <span class="flex items-center gap-2 rounded-lg bg-biru-muda px-2.5 py-1 text-xs font-bold tracking-wider text-biru">${ikonFasilitas(j.ikon, 15)}${e(j.kode)}</span>
        <span class="text-xs font-semibold text-samar tabular-nums">Kuota ${angka(j.kuota)}</span>
      </div>
      <h3 class="text-lg">${e(j.nama)}</h3>
      ${j.deskripsi ? `<p class="mt-2 flex-1 text-sm leading-relaxed text-samar">${e(j.deskripsi)}</p>` : ""}
      <div class="mt-5 border-t border-garis pt-4">
        <div class="mb-1.5 flex justify-between text-xs font-semibold text-samar">
          <span>${angka(jml)} pendaftar</span>
          <span class="tabular-nums">sisa ${angka(sisa)}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-biru-muda">
          <div class="h-full rounded-full bg-biru" style="width:${Math.min(persen(jml, j.kuota), 100)}%"></div>
        </div>
      </div>
    </div></div>`;
  }).join("");
}

function segarkanBeritaBeranda() {
  const terbit = K.berita
    .filter((b) => b.publish)
    .sort((a, b) => (a.dibuat < b.dibuat ? 1 : -1))
    .slice(0, 3);

  const petak = [...isiPublik.querySelectorAll(".grid.gap-6.md\\:grid-cols-3")].pop();
  if (!petak) return;
  petak.innerHTML = terbit.map((b) => `
    <div><div class="kartu h-full overflow-hidden">
      <a href="/berita/${e(b.slug)}" class="block h-full">
        ${gambarBerita(b)}
        <div class="p-5">
          <div class="mb-2.5 flex items-center gap-2">
            ${lencana(b.kategori)}
            <span class="text-xs text-samar">${tanggalPanjang(b.dibuat)}</span>
          </div>
          <h3 class="text-base leading-snug text-balance">${e(b.judul)}</h3>
          ${b.ringkasan ? `<p class="mt-2 line-clamp-3 text-sm leading-relaxed text-samar">${e(b.ringkasan)}</p>` : ""}
        </div>
      </a>
    </div></div>`).join("");
}

/* ---------- daftar berita ---------- */

const PER_HALAMAN_BERITA = 9;

function bukaBerita() {
  bukaPublik("berita");
  const q = kueriSekarang();
  const kategori = q.get("kategori") || "";
  const cari = (q.get("cari") || "").toLowerCase();
  const halaman = Math.max(Number(q.get("halaman")) || 1, 1);

  let daftar = K.berita.filter((b) => b.publish);
  if (kategori) daftar = daftar.filter((b) => b.kategori === kategori);
  if (cari) {
    daftar = daftar.filter((b) =>
      (b.judul + " " + b.ringkasan + " " + b.isi).toLowerCase().includes(cari));
  }
  daftar.sort((a, b) => (a.dibuat < b.dibuat ? 1 : -1));

  const total = daftar.length;
  const jumlahHalaman = Math.max(Math.ceil(total / PER_HALAMAN_BERITA), 1);
  const tampil = daftar.slice((halaman - 1) * PER_HALAMAN_BERITA,
                              halaman * PER_HALAMAN_BERITA);

  // Penyaring kategori dan kolom pencarian.
  const kategoriAda = [...new Set(K.berita.filter((b) => b.publish).map((b) => b.kategori))];
  const tautan = (ubah) => {
    const u = new URLSearchParams();
    const gabung = { kategori, cari: q.get("cari") || "", halaman: "1", ...ubah };
    for (const [k, v] of Object.entries(gabung)) if (v && v !== "1") u.set(k, v);
    const s = u.toString();
    return s ? `/berita?${s}` : "/berita";
  };

  const kepala = isiPublik.querySelector(".border-b.border-garis .mt-6");
  if (kepala) {
    kepala.innerHTML = `
      <div class="flex flex-col gap-4">
        <form id="cari-berita" class="flex max-w-md gap-2">
          <input type="search" name="cari" value="${e(q.get("cari") || "")}"
            placeholder="Cari judul atau isi berita..." aria-label="Cari berita"
            class="w-full rounded-lg border border-garis bg-white px-3.5 py-2.5 text-sm focus:border-biru focus:ring-2 focus:ring-biru/20">
          <button type="submit" class="shrink-0 rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white hover:bg-biru-tua">Cari</button>
        </form>
        <div class="flex flex-wrap gap-2">
          <a href="${tautan({ kategori: "" })}" class="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
            !kategori ? "border-biru bg-biru text-white"
                      : "border-garis bg-white text-teks hover:border-biru hover:text-biru"}">Semua</a>
          ${kategoriAda.map((k) => `
            <a href="${tautan({ kategori: k })}" class="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              kategori === k ? "border-biru bg-biru text-white"
                             : "border-garis bg-white text-teks hover:border-biru hover:text-biru"}">${e(k)}</a>`).join("")}
        </div>
      </div>`;
    kepala.querySelector("#cari-berita").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const v = new FormData(ev.target).get("cari") || "";
      pergi(tautan({ cari: String(v) }));
    });
  }

  const badan = isiPublik.querySelector(".wadah.py-14");
  if (!badan) return;

  if (tampil.length === 0) {
    badan.innerHTML = tanpaData(
      cari ? `Tidak ada berita yang cocok dengan "${e(q.get("cari"))}"` : "Belum ada berita",
      cari ? "Coba kata kunci lain, atau lihat seluruh berita."
           : "Berita akan muncul di sini setelah ditambahkan lewat panel admin.");
    return;
  }

  badan.innerHTML = `
    <p class="mb-6 text-sm text-samar">Menampilkan ${tampil.length} dari ${total} berita${
      kategori ? ` pada kategori ${e(kategori)}` : ""}${
      cari ? ` untuk pencarian "${e(q.get("cari"))}"` : ""}.</p>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      ${tampil.map((b) => `
        <div><div class="kartu h-full overflow-hidden">
          <a href="/berita/${e(b.slug)}" class="flex h-full flex-col">
            ${gambarBerita(b)}
            <div class="flex flex-1 flex-col p-5">
              <div class="mb-2.5 flex flex-wrap items-center gap-2">
                ${lencana(b.kategori)}
                <span class="text-xs text-samar">${tanggalPanjang(b.dibuat)}</span>
              </div>
              <h2 class="text-base leading-snug text-balance">${e(b.judul)}</h2>
              ${b.ringkasan ? `<p class="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-samar">${e(b.ringkasan)}</p>` : ""}
              <span class="mt-4 text-sm font-semibold text-biru">Baca selengkapnya &rarr;</span>
            </div>
          </a>
        </div></div>`).join("")}
    </div>
    ${jumlahHalaman > 1 ? `
      <nav aria-label="Halaman berita" class="mt-12 flex flex-wrap items-center justify-center gap-2">
        ${halaman > 1 ? `<a href="${tautan({ halaman: String(halaman - 1), cari: q.get("cari") || "" })}"
          class="rounded-lg border border-garis bg-white px-4 py-2 text-sm font-semibold hover:border-biru hover:text-biru">Sebelumnya</a>` : ""}
        ${Array.from({ length: jumlahHalaman }, (_, i) => i + 1).map((n) => `
          <a href="${tautan({ halaman: String(n), cari: q.get("cari") || "" })}"
             ${n === halaman ? 'aria-current="page"' : ""}
             class="min-w-10 rounded-lg border px-3.5 py-2 text-center text-sm font-semibold tabular-nums ${
               n === halaman ? "border-biru bg-biru text-white"
                             : "border-garis bg-white hover:border-biru hover:text-biru"}">${n}</a>`).join("")}
        ${halaman < jumlahHalaman ? `<a href="${tautan({ halaman: String(halaman + 1), cari: q.get("cari") || "" })}"
          class="rounded-lg border border-garis bg-white px-4 py-2 text-sm font-semibold hover:border-biru hover:text-biru">Berikutnya</a>` : ""}
      </nav>` : ""}`;
}

const tanpaData = (judul, keterangan) => `
  <div class="kartu px-6 py-14 text-center">
    <p class="text-lg font-semibold text-biru-tua">${judul}</p>
    ${keterangan ? `<p class="mt-2 text-sm text-samar">${keterangan}</p>` : ""}
  </div>`;

/* ---------- detail berita ---------- */

function bukaBeritaDetail(slug) {
  const b = K.berita.find((x) => x.slug === slug && x.publish);
  situs.hidden = false;
  panel.hidden = true;

  if (!b) {
    isiPublik.innerHTML = `<div class="wadah py-20">${tanpaData(
      "Berita tidak ditemukan",
      "Tautannya mungkin sudah berubah, atau beritanya berstatus draf.")}
      <p class="mt-6 text-center"><a href="/berita" class="text-sm font-semibold text-biru hover:underline">&larr; Kembali ke daftar berita</a></p></div>`;
    return;
  }

  // Pencacah dibaca ikut naik, seperti pada aplikasi aslinya.
  b.dibaca = (b.dibaca || 0) + 1;
  simpan();

  const paragraf = String(b.isi).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const terkait = K.berita
    .filter((x) => x.publish && x.kategori === b.kategori && x.id !== b.id)
    .sort((x, y) => (x.dibuat < y.dibuat ? 1 : -1))
    .slice(0, 3);

  isiPublik.innerHTML = `
  <article class="wadah py-12 md:py-16">
    <nav aria-label="Jejak halaman" class="mb-6 text-sm text-samar">
      <a href="/" class="hover:text-biru">Beranda</a><span class="mx-2">/</span>
      <a href="/berita" class="hover:text-biru">Berita</a><span class="mx-2">/</span>
      <a href="/berita?kategori=${encodeURIComponent(b.kategori)}" class="hover:text-biru">${e(b.kategori)}</a>
    </nav>
    <header class="mx-auto max-w-3xl">
      ${lencana(b.kategori)}
      <h1 class="mt-3 text-3xl leading-tight text-balance md:text-4xl">${e(b.judul)}</h1>
      <p class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-samar">
        <span>${tanggalPanjang(b.dibuat)}</span>
        ${b.penulis ? `<span>Oleh ${e(b.penulis)}</span>` : ""}
        <span>${angka(b.dibaca)} kali dibaca</span>
      </p>
    </header>
    <div class="mx-auto mt-8 max-w-4xl overflow-hidden rounded-kartu">
      ${b.gambar
        ? `<img src="${gambarPengganti(b.gambar, b.judul)}" alt="${e(b.judul)}" class="w-full object-cover">`
        : gambarKosong(b.kategori, "h-64")}
    </div>
    <div class="mx-auto mt-10 max-w-3xl">
      ${b.ringkasan ? `<p class="mb-8 border-l-4 border-emas bg-biru-muda/50 px-5 py-4 text-[17px] leading-relaxed font-medium text-biru-tua">${e(b.ringkasan)}</p>` : ""}
      <div class="naskah text-[16.5px] text-teks">
        ${paragraf.map((p) => `<p class="whitespace-pre-line">${e(p)}</p>`).join("")}
      </div>
      <div class="mt-10 flex flex-wrap gap-3 border-t border-garis pt-8">
        <a href="/berita" class="rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru">&larr; Semua berita</a>
        <a href="/ppdb/daftar" class="rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua">Daftar PPDB</a>
      </div>
    </div>
    ${terkait.length ? `
      <section class="mt-16 border-t border-garis pt-12">
        <h2 class="mb-6 text-xl">Baca juga</h2>
        <div class="grid gap-6 md:grid-cols-3">
          ${terkait.map((t) => `
            <div><div class="kartu h-full overflow-hidden">
              <a href="/berita/${e(t.slug)}" class="block">
                ${gambarBerita(t, "h-40")}
                <div class="p-5">
                  <span class="text-xs text-samar">${tanggalPanjang(t.dibuat)}</span>
                  <h3 class="mt-1.5 text-base leading-snug text-balance">${e(t.judul)}</h3>
                </div>
              </a>
            </div></div>`).join("")}
        </div>
      </section>` : ""}
  </article>`;
}

/* ---------- galeri ---------- */

let kategoriGaleri = "";

function bukaGaleri() {
  bukaPublik("galeri");
  renderGaleri();
}

function renderGaleri() {
  const badan = isiPublik.querySelector(".wadah.py-14");
  if (!badan) return;

  const semua = K.galeri.slice().sort((a, b) => (a.dibuat < b.dibuat ? 1 : -1));
  if (semua.length === 0) {
    badan.innerHTML = tanpaData("Belum ada foto di galeri",
      "Foto dapat ditambahkan lewat menu Galeri di panel admin.");
    return;
  }

  const kategori = [...new Set(semua.map((g) => g.kategori).filter(Boolean))].sort();
  const tampil = kategoriGaleri ? semua.filter((g) => g.kategori === kategoriGaleri) : semua;

  badan.innerHTML = `
    ${kategori.length ? `
      <div class="mb-8 flex flex-wrap gap-2">
        <button type="button" data-kategori="" class="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
          !kategoriGaleri ? "border-biru bg-biru text-white"
                          : "border-garis bg-white text-teks hover:border-biru hover:text-biru"}">Semua (${semua.length})</button>
        ${kategori.map((k) => {
          const n = semua.filter((g) => g.kategori === k).length;
          return `<button type="button" data-kategori="${e(k)}" class="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
            kategoriGaleri === k ? "border-biru bg-biru text-white"
                                 : "border-garis bg-white text-teks hover:border-biru hover:text-biru"}">${e(k)} (${n})</button>`;
        }).join("")}
      </div>` : ""}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      ${tampil.map((g) => `
        <div><button type="button" data-foto="${g.id}"
          class="group block w-full overflow-hidden rounded-kartu border border-garis bg-white text-left shadow-lembut transition hover:shadow-kuat">
          <span class="block aspect-4/3 overflow-hidden bg-biru-muda">
            <img src="${gambarPengganti(g.gambar, g.judul)}" alt="${e(g.judul)}" loading="lazy"
                 class="h-full w-full object-cover transition duration-500 group-hover:scale-105">
          </span>
          <span class="block p-4">
            <span class="block text-sm font-semibold text-biru-tua">${e(g.judul)}</span>
            ${g.kategori ? `<span class="mt-0.5 block text-xs text-samar">${e(g.kategori)}</span>` : ""}
          </span>
        </button></div>`).join("")}
    </div>`;

  badan.querySelectorAll("[data-kategori]").forEach((b) => {
    b.addEventListener("click", () => {
      kategoriGaleri = b.dataset.kategori;
      renderGaleri();
    });
  });
  badan.querySelectorAll("[data-foto]").forEach((b) => {
    b.addEventListener("click", () => bukaFotoBesar(Number(b.dataset.foto)));
  });
}

function bukaFotoBesar(id) {
  const g = K.galeri.find((x) => x.id === id);
  if (!g) return;
  tampilkanJendela(`
    <div role="dialog" aria-modal="true" aria-label="${e(g.judul)}"
         class="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4" data-tutup-latar>
      <figure class="max-h-full w-full max-w-4xl overflow-auto rounded-kartu bg-white">
        <img src="${gambarPengganti(g.gambar, g.judul)}" alt="${e(g.judul)}"
             class="max-h-[70vh] w-full bg-black object-contain">
        <figcaption class="flex items-start justify-between gap-4 p-5">
          <div>
            <p class="font-semibold text-biru-tua">${e(g.judul)}</p>
            ${g.keterangan ? `<p class="mt-1 text-sm leading-relaxed text-samar">${e(g.keterangan)}</p>` : ""}
            <p class="mt-2 text-xs text-samar">${g.kategori ? e(g.kategori) + " &middot; " : ""}${tanggalPanjang(g.dibuat)}</p>
          </div>
          <button type="button" data-tutup
            class="shrink-0 rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold hover:bg-biru-muda">Tutup</button>
        </figcaption>
      </figure>
    </div>`);
}

/* ---------- fasilitas ---------- */

function segarkanFasilitas() {
  const badan = isiPublik.querySelector(".wadah.py-14");
  if (!badan) return;
  const daftar = K.fasilitas.slice().sort((a, b) => a.urutan - b.urutan || a.id - b.id);

  if (daftar.length === 0) {
    badan.innerHTML = tanpaData("Data fasilitas belum tersedia",
      "Daftar fasilitas dapat ditambahkan lewat menu Fasilitas di panel admin.");
    return;
  }
  badan.innerHTML = `
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      ${daftar.map((f) => `
        <div><div class="kartu h-full overflow-hidden">
          ${f.gambar
            ? `<img src="${gambarPengganti(f.gambar, f.nama)}" alt="${e(f.nama)}" class="h-48 w-full object-cover" loading="lazy">`
            : gambarKosong(f.nama)}
          <div class="p-5">
            <h2 class="flex items-center gap-2 text-base">
              <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-biru-muda text-biru">${ikonFasilitas(f.ikon)}</span>
              ${e(f.nama)}
            </h2>
            ${f.deskripsi ? `<p class="mt-2 text-sm leading-relaxed text-samar">${e(f.deskripsi)}</p>` : ""}
          </div>
        </div></div>`).join("")}
    </div>`;
}

/* ---------- kontak ---------- */

function bukaKontak() {
  bukaPublik("kontak");
  siapkanFormulirKontak();
}

function siapkanFormulirKontak() {
  const form = isiPublik.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const ambil = (id) => (form.querySelector("#" + id)?.value || "").trim();
    const isi = {
      nama: ambil("nama"), email: ambil("email"),
      no_hp: ambil("no_hp"), subjek: ambil("subjek"), isi: ambil("isi"),
    };

    const galat = {};
    if (!isi.nama) galat.nama = "Nama wajib diisi.";
    if (!isi.subjek) galat.subjek = "Subjek wajib diisi.";
    if (!isi.isi) galat.isi = "Isi pesan wajib diisi.";
    if (isi.email && !emailSah(isi.email)) galat.email = "Format email tidak valid.";
    if (isi.no_hp && !teleponSah(isi.no_hp)) galat.no_hp = "Nomor HP tidak valid (gunakan 9-15 angka).";
    if (!isi.email && !isi.no_hp) galat.email = "Isi email atau nomor HP agar sekolah dapat membalas.";

    pasangGalatFormulir(form, galat);
    if (Object.keys(galat).length) return;

    K.pesan.unshift({
      id: Math.max(0, ...K.pesan.map((p) => p.id)) + 1,
      nama: isi.nama, email: isi.email, no_hp: isi.no_hp,
      subjek: isi.subjek, isi: isi.isi, dibaca: false, dibuat: waktuSekarang(),
    });
    simpan();

    const kartu = form.closest(".kartu");
    kartu.innerHTML = `
      <div class="space-y-4">
        <div role="status" class="rounded-kartu border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          Terima kasih, pesan Anda sudah terkirim. Sekolah akan menghubungi Anda kembali.
        </div>
        <p class="text-sm text-samar">Pesan ini langsung muncul pada menu <strong>Pesan Masuk</strong> di panel panitia.</p>
        <button type="button" data-kirim-lagi
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-garis bg-white px-4 py-2.5 text-sm font-semibold text-teks transition hover:bg-biru-muda hover:text-biru">Kirim pesan lain</button>
      </div>`;
    kartu.querySelector("[data-kirim-lagi]").addEventListener("click", () => bukaKontak());
  });
}

/* ---------- informasi PPDB ---------- */

function bukaPpdb() {
  bukaPublik("ppdb");

  const total = pendaftarAktif().length;
  const kuota = Number(K.pengaturan.ppdb_kuota || 0);
  const sisa = Math.max(kuota - total, 0);
  const nilai = [angka(kuota), angka(total), angka(sisa), `${persen(total, kuota)}%`];

  isiPublik.querySelectorAll(".kartu.px-5.py-6.text-center").forEach((k, i) => {
    const p = k.querySelector("p");
    if (p && nilai[i] !== undefined) p.textContent = nilai[i];
  });

  // Kuota per peminatan.
  const baris = [...isiPublik.querySelectorAll("li.px-6.py-4")];
  const aktif = K.jurusan.filter((j) => j.aktif);
  baris.slice(-aktif.length).forEach((li, i) => {
    const j = aktif[i];
    if (!j) return;
    const jml = pendaftarAktif().filter((p) => p.jurusan_id === j.id).length;
    const teks = li.querySelector("p.text-sm.text-samar");
    if (teks) teks.textContent = `${angka(jml)} / ${angka(j.kuota)}`;
    const b = li.querySelector(".h-2 > div");
    if (b) b.style.width = `${Math.min(persen(jml, j.kuota), 100)}%`;
  });

  // Lencana dan tombol mengikuti keadaan pendaftaran.
  const buka = ppdbDibuka();
  const lb = [...isiPublik.querySelectorAll("span")].find((s) =>
    ["Pendaftaran dibuka", "Pendaftaran belum dibuka"].includes(s.textContent.trim()));
  if (lb) {
    lb.textContent = buka ? "Pendaftaran dibuka" : "Pendaftaran belum dibuka";
    lb.className = "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
      (buka ? "border-green-200 bg-green-100 text-green-800"
            : "border-slate-200 bg-slate-100 text-slate-700");
  }
  const tombolIsi = [...isiPublik.querySelectorAll("a")].find((a) =>
    a.textContent.trim() === "Isi Formulir Pendaftaran");
  if (tombolIsi && !buka) tombolIsi.remove();
  pasangPenunjukAlur("ketentuan");
}

/* ==================================================================
   Pembantu formulir dan jendela
   Aturan pemeriksaan isian di sini disalin dari validasi.go, supaya
   pesan yang dilihat pengunjung demo sama dengan aplikasi aslinya.
   ================================================================== */

const emailSah = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const teleponSah = (v) => /^[0-9+\-\s()]{9,25}$/.test(v);
const digitTepat = (v, n) => new RegExp(`^\\d{${n}}$`).test(v);

function usiaTahun(lahir) {
  const t = new Date(lahir);
  const kini = new Date();
  let umur = kini.getFullYear() - t.getFullYear();
  const belumUlangTahun =
    kini.getMonth() < t.getMonth() ||
    (kini.getMonth() === t.getMonth() && kini.getDate() < t.getDate());
  if (belumUlangTahun) umur--;
  return umur;
}

/** Menempelkan pesan galat di bawah kolomnya, seperti komponen Medan. */
function pasangGalatFormulir(akar, galat) {
  akar.querySelectorAll("[data-galat-demo]").forEach((el) => el.remove());
  akar.querySelectorAll("input, select, textarea").forEach((el) => {
    el.classList.remove("border-red-400", "bg-red-50/40");
    if (!el.classList.contains("border-garis") && el.type !== "file" && el.type !== "checkbox") {
      el.classList.add("border-garis");
    }
    el.removeAttribute("aria-invalid");
  });

  for (const [kolom, pesan] of Object.entries(galat)) {
    if (!pesan) continue;
    const el = akar.querySelector("#" + kolom);
    if (!el) continue;
    el.classList.remove("border-garis");
    el.classList.add("border-red-400", "bg-red-50/40");
    el.setAttribute("aria-invalid", "true");
    const p = document.createElement("p");
    p.dataset.galatDemo = "1";
    p.id = `${kolom}-galat`;
    p.className = "mt-1 text-xs font-medium text-red-700";
    p.textContent = pesan;
    // Keterangan bantuan disembunyikan agar tidak bertumpuk dengan galat.
    const pembungkus = el.closest("div");
    const bantuan = pembungkus?.querySelector("p.text-samar");
    if (bantuan) bantuan.style.display = "none";
    (pembungkus || el.parentElement).appendChild(p);
  }
}

function ringkasanGalat(daftar) {
  if (!daftar.length) return "";
  return `
    <div role="alert" class="rounded-kartu border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
      <p class="font-semibold">Ada ${daftar.length} hal yang perlu diperbaiki:</p>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        ${daftar.map((g) => `<li>${g}</li>`).join("")}
      </ul>
    </div>`;
}

/* ---------- jendela ---------- */

const wadahJendela = document.getElementById("wadah-jendela");

function tampilkanJendela(html) {
  wadahJendela.innerHTML = html;
  document.body.style.overflow = "hidden";
  wadahJendela.querySelectorAll("[data-tutup]").forEach((b) =>
    b.addEventListener("click", tutupJendela));
  const latar = wadahJendela.querySelector("[data-tutup-latar]");
  if (latar) {
    latar.addEventListener("click", (ev) => {
      if (ev.target === latar) tutupJendela();
    });
  }
}

function tutupJendela() {
  wadahJendela.innerHTML = "";
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && wadahJendela.innerHTML) tutupJendela();
});

/* ---------- pemberitahuan ---------- */

function beriTahu(pesan, jenis = "berhasil") {
  const wadah = document.getElementById("pemberitahuan");
  const warna = jenis === "berhasil"
    ? "border-green-200 bg-green-50 text-green-800"
    : "border-red-200 bg-red-50 text-red-800";
  const el = document.createElement("div");
  el.className = `rounded-kartu border px-5 py-4 text-sm shadow-kuat ${warna}`;
  el.setAttribute("role", jenis === "berhasil" ? "status" : "alert");
  el.textContent = pesan;
  wadah.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

/* ==================================================================
   Formulir pendaftaran dan cek status
   ================================================================== */

const LANGKAH_KOLOM = [
  ["jalur","jurusan_id","nama_lengkap","jenis_kelamin","nisn","nik",
   "tempat_lahir","tanggal_lahir","agama","anak_ke","jumlah_saudara"],
  ["alamat","kelurahan","kecamatan","kota","provinsi","kode_pos","no_hp","email"],
  ["asal_sekolah","npsn_sekolah","alamat_sekolah","tahun_lulus","nilai_rata2",
   "nama_ayah","pekerjaan_ayah","pendidikan_ayah","nama_ibu","pekerjaan_ibu",
   "pendidikan_ibu","penghasilan","no_hp_ortu","nama_wali"],
  ["file_foto","file_ijazah","file_kk","file_akta","file_raport","file_prestasi"],
  ["sumber_informasi","catatan_sumber","pernyataan"],
];

let langkahSekarang = 0;
let isian = {};
let berkasTerpilih = {};

function bukaFormulir() {
  situs.hidden = false;
  panel.hidden = true;

  if (!ppdbDibuka()) {
    isiPublik.innerHTML = halamanPendaftaranTertutup();
    return;
  }

  langkahSekarang = 0;
  isian = { jalur: "Reguler" };
  berkasTerpilih = {};
  isiPublik.innerHTML = HALAMAN.daftarKerangka;
  renderLangkah([]);
  pasangPenunjukAlur("daftar");
}

function halamanPendaftaranTertutup() {
  const p = K.pengaturan;
  return `
  <div class="border-b border-garis bg-biru-muda/60">
    <div class="wadah py-12 md:py-16">
      <h1 class="text-3xl font-bold text-balance md:text-4xl">Pendaftaran Belum Dibuka</h1>
      <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-samar">
        Formulir pendaftaran hanya dapat diisi selama masa pendaftaran berlangsung.</p>
    </div>
  </div>
  <div class="wadah py-14">
    <div class="kartu mx-auto max-w-2xl p-7 text-center">
      <p class="text-[15px] leading-relaxed text-teks">
        ${p.ppdb_mulai
          ? `Pendaftaran peserta didik baru Tahun Ajaran <strong>${e(p.ppdb_tahun)}</strong>
             dibuka mulai <strong>${tanggalPanjang(p.ppdb_mulai)}</strong>${
               p.ppdb_selesai ? ` sampai <strong>${tanggalPanjang(p.ppdb_selesai)}</strong>` : ""}.`
          : "Jadwal pendaftaran akan diumumkan sekolah melalui halaman berita."}
      </p>
      <p class="mt-4 rounded-lg bg-biru-muda px-5 py-4 text-sm text-biru-tua">
        Pada demo ini, keadaan pendaftaran dapat dibuka kembali dari panel panitia
        lewat menu <strong>Pengaturan</strong>, kolom <em>Status pendaftaran</em>.
      </p>
      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <a href="/ppdb" class="rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua">Baca Informasi PPDB</a>
        <a href="/ppdb/cek" class="rounded-lg border border-garis px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru">Cek Status Pendaftaran</a>
      </div>
    </div>
  </div>`;
}

/** Menempatkan panel langkah yang sesuai dan menyalakan kembali penanganannya. */
function renderLangkah(daftarGalat, galatKolom = {}) {
  const kartu = isiPublik.querySelector("form .kartu");
  if (!kartu) return;

  const judul = kartu.querySelector("h2");
  judul.textContent = HALAMAN.panel[langkahSekarang].judul;

  let panelLama = judul.nextElementSibling;
  while (panelLama && panelLama.tagName !== "DIV") panelLama = panelLama.nextElementSibling;
  const baru = document.createElement("div");
  baru.innerHTML = HALAMAN.panel[langkahSekarang].html;
  panelLama.replaceWith(baru.firstElementChild);

  // Penanda langkah.
  const penanda = isiPublik.querySelectorAll('ol[aria-label="Tahap pengisian"] li');
  penanda.forEach((li, i) => {
    const adaGalat = LANGKAH_KOLOM[i].some((k) => galatKolom[k]);
    const garis = li.querySelector("button > span:first-child");
    const teks = li.querySelector("button > span:last-child");
    if (garis) {
      garis.className = "block h-1.5 rounded-full transition " +
        (adaGalat ? "bg-red-500" : i <= langkahSekarang ? "bg-biru" : "bg-garis");
    }
    if (teks) {
      teks.className = "mt-2 block text-[11px] font-semibold sm:text-xs " +
        (adaGalat ? "text-red-600" : i === langkahSekarang ? "text-biru" : "text-samar");
    }
  });

  // Ringkasan galat di atas formulir.
  const form = isiPublik.querySelector("form");
  form.querySelectorAll("[data-ringkasan-demo]").forEach((el) => el.remove());
  if (daftarGalat.length) {
    const d = document.createElement("div");
    d.dataset.ringkasanDemo = "1";
    d.className = "mb-6";
    d.innerHTML = ringkasanGalat(daftarGalat);
    form.prepend(d);
  }

  kembalikanIsian();
  pasangGalatFormulir(form, galatKolom);
  aturTombolLangkah();
  penandaLangkahDapatDiklik();
}

function kembalikanIsian() {
  const form = isiPublik.querySelector("form");
  for (const [k, v] of Object.entries(isian)) {
    const el = form.querySelector("#" + k);
    if (el && el.type !== "file") el.value = v;
  }
  const c = form.querySelector("#pernyataan");
  if (c) c.checked = !!isian.pernyataan;

  // Nama berkas yang sudah dipilih ditampilkan kembali.
  for (const [k, nama] of Object.entries(berkasTerpilih)) {
    const el = form.querySelector("#" + k);
    if (!el) continue;
    const p = document.createElement("p");
    p.className = "mt-1 text-xs font-medium text-biru";
    p.textContent = `Terpilih: ${nama}`;
    el.closest("div")?.appendChild(p);
  }

  // Keterangan sertifikat menyesuaikan jalur yang dipilih.
  if (langkahSekarang === 3) {
    const bantuan = [...form.querySelectorAll("p.text-xs.text-samar")].find((p) =>
      p.textContent.includes("sertifikat prestasi"));
    if (bantuan) {
      bantuan.textContent = isian.jalur === "Prestasi"
        ? "Wajib karena Anda memilih jalur Prestasi."
        : "Isi bila memiliki sertifikat prestasi.";
    }
  }
}

function simpanIsianTampil() {
  const form = isiPublik.querySelector("form");
  form.querySelectorAll("input, select, textarea").forEach((el) => {
    if (!el.id) return;
    if (el.type === "file") {
      if (el.files && el.files[0]) berkasTerpilih[el.id] = el.files[0].name;
    } else if (el.type === "checkbox") {
      isian[el.id] = el.checked;
    } else {
      isian[el.id] = el.value;
    }
  });
}

function aturTombolLangkah() {
  const form = isiPublik.querySelector("form");
  const baris = form.querySelector(".border-t.border-garis.pt-6") ||
                [...form.querySelectorAll("div")].reverse().find((d) => d.querySelector("button"));
  const tombol = [...baris.querySelectorAll("button")];

  // Tangkapan hanya memuat satu tombol maju, karena aplikasinya merender
  // tombol Kirim hanya pada langkah terakhir. Tombolnya ditandai sekali di
  // sini, lalu labelnya ditulis ulang setiap perpindahan langkah. Kalau
  // hanya mengandalkan teksnya, label "Kirim Pendaftaran" akan tertinggal
  // saat pengguna kembali ke langkah sebelumnya.
  if (!baris.dataset.siap) {
    tombol[0]?.setAttribute("data-nav", "sebelum");
    tombol[tombol.length - 1]?.setAttribute("data-nav", "maju");
    baris.dataset.siap = "1";
  }

  const sebelum = baris.querySelector('[data-nav="sebelum"]');
  const maju = baris.querySelector('[data-nav="maju"]');
  const nomor = baris.querySelector("span.tabular-nums") || baris.querySelector("span");
  const terakhir = langkahSekarang === LANGKAH_KOLOM.length - 1;

  if (nomor) {
    nomor.textContent = `Langkah ${langkahSekarang + 1} dari ${LANGKAH_KOLOM.length}`;
  }
  if (sebelum) {
    sebelum.disabled = langkahSekarang === 0;
    sebelum.onclick = (ev) => {
      ev.preventDefault();
      simpanIsianTampil();
      langkahSekarang--;
      renderLangkah([]);
      gulirKeFormulir();
    };
  }
  if (maju) {
    maju.textContent = terakhir ? "Kirim Pendaftaran" : "Selanjutnya \u2192";
    maju.className = terakhir
      ? "inline-flex items-center justify-center gap-2 rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua"
      : "inline-flex items-center justify-center gap-2 rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua";
    maju.onclick = (ev) => {
      ev.preventDefault();
      if (terakhir) {
        kirimPendaftaran();
        return;
      }
      simpanIsianTampil();
      langkahSekarang++;
      renderLangkah([]);
      gulirKeFormulir();
    };
  }
  form.onsubmit = (ev) => {
    ev.preventDefault();
    if (terakhir) kirimPendaftaran();
  };
}

function penandaLangkahDapatDiklik() {
  isiPublik.querySelectorAll('ol[aria-label="Tahap pengisian"] button').forEach((b, i) => {
    b.onclick = () => {
      simpanIsianTampil();
      langkahSekarang = i;
      renderLangkah([]);
      gulirKeFormulir();
    };
  });
}

const gulirKeFormulir = () => {
  const t = isiPublik.querySelector('ol[aria-label="Tahap pengisian"]');
  if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ---------- pemeriksaan isian ---------- */

function periksaPendaftaran() {
  const g = {};
  const daftar = [];
  const tambah = (kolom, pesan) => {
    if (!g[kolom]) { g[kolom] = pesan; daftar.push(pesan); }
  };
  const v = (k) => String(isian[k] ?? "").trim();

  const wajib = {
    nama_lengkap: "Nama lengkap", jenis_kelamin: "Jenis kelamin",
    tempat_lahir: "Tempat lahir", tanggal_lahir: "Tanggal lahir",
    agama: "Agama", alamat: "Alamat tempat tinggal",
    no_hp: "Nomor HP/WhatsApp", asal_sekolah: "Asal sekolah",
    nama_ayah: "Nama ayah", nama_ibu: "Nama ibu", jalur: "Jalur pendaftaran",
  };
  for (const [k, label] of Object.entries(wajib)) {
    if (!v(k)) tambah(k, `${label} wajib diisi.`);
  }

  if (K.jurusan.some((j) => j.aktif) && !v("jurusan_id")) {
    tambah("jurusan_id", "Peminatan wajib dipilih.");
  }

  if (v("tanggal_lahir")) {
    const umur = usiaTahun(v("tanggal_lahir"));
    if (umur < 11 || umur > 25) {
      tambah("tanggal_lahir",
        `Tanggal lahir tidak wajar untuk calon peserta didik SMA (usia terhitung ${umur} tahun).`);
    }
  }
  if (v("nisn") && !digitTepat(v("nisn"), 10)) tambah("nisn", "NISN harus berupa 10 angka.");
  if (v("nik") && !digitTepat(v("nik"), 16)) tambah("nik", "NIK harus berupa 16 angka.");
  if (v("no_hp") && !teleponSah(v("no_hp"))) {
    tambah("no_hp", "Nomor HP/WhatsApp tidak valid (gunakan 9-15 angka).");
  }
  if (v("no_hp_ortu") && !teleponSah(v("no_hp_ortu"))) {
    tambah("no_hp_ortu", "Nomor HP orang tua tidak valid (gunakan 9-15 angka).");
  }
  if (v("email") && !emailSah(v("email"))) tambah("email", "Format email tidak valid.");

  const rentang = (k, label, min, maks) => {
    if (!v(k)) return;
    const n = Number(String(v(k)).replace(",", "."));
    if (Number.isNaN(n) || n < min || n > maks) {
      tambah(k, `${label} harus berupa angka ${min} sampai ${maks}.`);
    }
  };
  rentang("nilai_rata2", "Nilai rata-rata", 0, 100);
  rentang("anak_ke", "Anak ke-", 1, 20);
  rentang("jumlah_saudara", "Jumlah saudara", 0, 20);
  rentang("tahun_lulus", "Tahun lulus", 2000, 2100);

  if (!isian.pernyataan) {
    tambah("pernyataan", "Anda harus menyetujui pernyataan kebenaran data.");
  }

  const berkasWajib = {
    file_foto: "Foto 3x4", file_ijazah: "Ijazah / SKL", file_kk: "Kartu Keluarga",
  };
  for (const [k, label] of Object.entries(berkasWajib)) {
    if (!berkasTerpilih[k]) tambah(k, `${label} wajib diunggah.`);
  }
  if (v("jalur") === "Prestasi" && !berkasTerpilih.file_prestasi) {
    tambah("file_prestasi", "Jalur Prestasi mewajibkan unggahan sertifikat prestasi.");
  }

  // Pendaftaran ganda pada tahun ajaran yang sama.
  if (v("nama_lengkap") && v("tanggal_lahir")) {
    const lama = pendaftarAktif().find((p) =>
      p.nama_lengkap.toLowerCase() === v("nama_lengkap").toLowerCase() &&
      p.tanggal_lahir === v("tanggal_lahir"));
    if (lama) {
      daftar.push(`Data dengan nama dan tanggal lahir yang sama sudah terdaftar dengan nomor registrasi ${
        e(lama.no_registrasi)}. Gunakan menu Cek Status untuk memantau pendaftaran tersebut.`);
    }
  }

  return { galat: g, daftar };
}

function kirimPendaftaran() {
  simpanIsianTampil();
  const { galat, daftar } = periksaPendaftaran();

  if (daftar.length) {
    // Lompat ke langkah pertama yang memuat kolom bermasalah.
    const kunci = Object.keys(galat);
    const tujuan = LANGKAH_KOLOM.findIndex((kolom) => kolom.some((k) => kunci.includes(k)));
    langkahSekarang = tujuan >= 0 ? tujuan : LANGKAH_KOLOM.length - 1;
    renderLangkah(daftar, galat);
    gulirKeFormulir();
    return;
  }

  const no = nomorRegistrasiBaru();
  const jur = K.jurusan.find((j) => String(j.id) === String(isian.jurusan_id));
  const id = Math.max(0, ...K.pendaftar.map((p) => p.id)) + 1;
  const ambil = (k) => String(isian[k] ?? "").trim();

  const ringkas = {
    id, no_registrasi: no, tahun_ajaran: tahunAjaran(),
    jalur: ambil("jalur"), jurusan_id: jur ? jur.id : null,
    nama_jurusan: jur ? jur.nama : "",
    nama_lengkap: ambil("nama_lengkap"), nisn: ambil("nisn"),
    jenis_kelamin: ambil("jenis_kelamin"), tanggal_lahir: ambil("tanggal_lahir"),
    asal_sekolah: ambil("asal_sekolah"), no_hp: ambil("no_hp"), email: ambil("email"),
    nilai_rata2: ambil("nilai_rata2") ? Number(ambil("nilai_rata2")) : null,
    sumber_informasi: ambil("sumber_informasi"),
    status: "Menunggu Verifikasi", dibuat: waktuSekarang(),
  };
  K.pendaftar.unshift(ringkas);

  K.detail[String(id)] = {
    ...ringkas,
    nik: ambil("nik"), tempat_lahir: ambil("tempat_lahir"), agama: ambil("agama"),
    anak_ke: ambil("anak_ke"), jumlah_saudara: ambil("jumlah_saudara"),
    alamat: ambil("alamat"), kelurahan: ambil("kelurahan"), kecamatan: ambil("kecamatan"),
    kota: ambil("kota"), provinsi: ambil("provinsi"), kode_pos: ambil("kode_pos"),
    npsn_sekolah: ambil("npsn_sekolah"), alamat_sekolah: ambil("alamat_sekolah"),
    tahun_lulus: ambil("tahun_lulus"),
    nama_ayah: ambil("nama_ayah"), pekerjaan_ayah: ambil("pekerjaan_ayah"),
    pendidikan_ayah: ambil("pendidikan_ayah"), nama_ibu: ambil("nama_ibu"),
    pekerjaan_ibu: ambil("pekerjaan_ibu"), pendidikan_ibu: ambil("pendidikan_ibu"),
    penghasilan: ambil("penghasilan"), no_hp_ortu: ambil("no_hp_ortu"),
    nama_wali: ambil("nama_wali"),
    file_foto: berkasTerpilih.file_foto || "", file_ijazah: berkasTerpilih.file_ijazah || "",
    file_kk: berkasTerpilih.file_kk || "", file_akta: berkasTerpilih.file_akta || "",
    file_raport: berkasTerpilih.file_raport || "",
    file_prestasi: berkasTerpilih.file_prestasi || "",
    catatan_sumber: ambil("catatan_sumber"), catatan_admin: "",
    nama_verifikator: "", diverifikasi_oleh: null,
    ip_pendaftar: "(tidak dicatat pada demo)", diubah: waktuSekarang(),
  };
  simpan();

  isiPublik.innerHTML = halamanBerhasil(no, tahunAjaran());
}

function halamanBerhasil(no, tahun) {
  return `
  <div class="wadah py-12">
    <div class="mx-auto max-w-4xl">
      <div class="kartu overflow-hidden">
        <div class="bg-green-600 px-7 py-8 text-center text-white">
          <p class="text-sm font-semibold tracking-wide uppercase opacity-90">Pendaftaran Terkirim</p>
          <p class="mt-2 text-3xl font-bold text-white">${e(no)}</p>
          <p class="mt-1 text-sm opacity-90">Tahun Ajaran ${e(tahun)}</p>
        </div>
        <div class="space-y-5 px-7 py-8">
          <p class="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <strong>Simpan nomor registrasi di atas.</strong> Nomor itu beserta tanggal lahir
            adalah kunci untuk memantau hasil verifikasi berkas Anda. Nomor ini tidak dikirim
            otomatis lewat pesan, jadi catat atau tangkap layar sekarang.
          </p>
          <div>
            <h3 class="text-base">Langkah selanjutnya</h3>
            <ol class="mt-3 space-y-2 text-sm leading-relaxed text-teks">
              <li>1. Panitia memeriksa kelengkapan dan kesesuaian berkas Anda.</li>
              <li>2. Pantau hasilnya lewat menu Cek Status memakai nomor registrasi dan tanggal lahir.</li>
              <li>3. Bila ada berkas yang perlu diperbaiki, panitia menghubungi nomor yang Anda cantumkan.</li>
            </ol>
          </div>
          <p class="rounded-lg bg-biru-muda px-5 py-4 text-sm leading-relaxed text-biru-tua">
            Pada demo ini, pendaftaran Anda langsung muncul di panel panitia. Masuk dengan
            <strong>admin</strong> / <strong>admin123</strong>, buka menu Pendaftar, lalu ubah
            statusnya. Hasil perubahan itu akan terlihat di halaman Cek Status.
          </p>
          <div class="flex flex-wrap gap-3 border-t border-garis pt-6">
            <button class="rounded-lg bg-biru px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua">Unduh Bukti Pendaftaran (PDF)</button>
            <a href="/ppdb/cek?no=${encodeURIComponent(no)}"
               class="rounded-lg border border-garis px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru">Cek Status Pendaftaran</a>
            <a href="/admin/masuk"
               class="rounded-lg border border-garis px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru">Masuk sebagai Panitia</a>
            <a href="/" class="rounded-lg border border-garis px-5 py-2.5 text-sm font-semibold text-teks transition hover:border-biru hover:text-biru">Kembali ke Beranda</a>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- cek status ---------- */

const ARTI_STATUS = {
  "Menunggu Verifikasi":
    "Berkas Anda sudah kami terima dan sedang menunggu pemeriksaan panitia. Belum ada tindakan yang perlu Anda lakukan.",
  "Terverifikasi":
    "Berkas Anda sudah diperiksa dan dinyatakan lengkap. Menunggu penetapan hasil seleksi.",
  "Diterima":
    "Selamat, Anda dinyatakan diterima. Lanjutkan dengan daftar ulang sesuai ketentuan sekolah.",
  "Cadangan":
    "Anda masuk daftar cadangan. Bila ada peserta diterima yang tidak melakukan daftar ulang, panitia akan menghubungi Anda.",
  "Ditolak":
    "Pendaftaran Anda belum dapat diterima. Keterangan dari panitia dapat dibaca di bawah, bila ada.",
};

function bukaCekStatus() {
  bukaPublik("cek");
  const nomorAwal = kueriSekarang().get("no") || "";
  const form = isiPublik.querySelector("form");
  if (!form) return;

  const elNo = form.querySelector("#no_registrasi");
  if (elNo) elNo.value = nomorAwal;

  form.onsubmit = (ev) => {
    ev.preventDefault();
    const no = (form.querySelector("#no_registrasi")?.value || "").trim();
    const tgl = (form.querySelector("#tanggal_lahir")?.value || "").trim();

    const galat = {};
    if (!no) galat.no_registrasi = "Nomor registrasi wajib diisi.";
    if (!tgl) galat.tanggal_lahir = "Tanggal lahir wajib diisi.";
    pasangGalatFormulir(form, galat);

    isiPublik.querySelectorAll("[data-hasil-cek]").forEach((el) => el.remove());
    form.querySelectorAll("[data-ringkasan-demo]").forEach((el) => el.remove());

    if (Object.keys(galat).length) {
      const d = document.createElement("div");
      d.dataset.ringkasanDemo = "1";
      d.innerHTML = ringkasanGalat(Object.values(galat));
      form.querySelector(".space-y-5").prepend(d);
      return;
    }

    const p = K.pendaftar.find(
      (x) => x.no_registrasi.toUpperCase() === no.toUpperCase() && x.tanggal_lahir === tgl);

    if (!p) {
      const d = document.createElement("div");
      d.dataset.ringkasanDemo = "1";
      d.innerHTML = ringkasanGalat([
        "Data tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir.",
      ]);
      form.querySelector(".space-y-5").prepend(d);
      return;
    }
    tampilkanHasilCek(p);
  };
  pasangPenunjukAlur("pantau");
}

function tampilkanHasilCek(p) {
  const detail = K.detail[String(p.id)] || {};
  const catatan = detail.catatan_admin || "";
  const wadah = isiPublik.querySelector(".space-y-8") || isiPublik.querySelector(".mx-auto.max-w-3xl");

  const el = document.createElement("div");
  el.dataset.hasilCek = "1";
  el.innerHTML = `
    <div class="kartu overflow-hidden">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-garis bg-biru-muda px-6 py-5">
        <div>
          <p class="text-xs font-semibold tracking-wide text-samar uppercase">Nomor registrasi</p>
          <p class="mt-0.5 text-2xl font-bold text-biru-tua">${e(p.no_registrasi)}</p>
        </div>
        ${lencana(p.status, warnaStatus(p.status))}
      </div>
      <dl class="divide-y divide-garis text-sm">
        ${[
          ["Nama lengkap", p.nama_lengkap],
          ["Tahun ajaran", p.tahun_ajaran],
          ["Jalur pendaftaran", p.jalur],
          ["Peminatan", p.nama_jurusan],
          ["Waktu mendaftar", tanggalJam(p.dibuat)],
        ].filter(([, v]) => v).map(([k, v]) => `
          <div class="flex flex-col gap-0.5 px-6 py-3.5 sm:flex-row sm:justify-between sm:gap-4">
            <dt class="text-samar">${k}</dt>
            <dd class="font-semibold text-teks sm:text-right">${e(v)}</dd>
          </div>`).join("")}
      </dl>
      <div class="space-y-4 border-t border-garis px-6 py-5">
        <p class="text-sm leading-relaxed text-teks">${ARTI_STATUS[p.status] || ""}</p>
        ${catatan ? `
          <div class="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4">
            <p class="text-xs font-semibold tracking-wide text-biru uppercase">Catatan panitia</p>
            <p class="mt-1 text-sm leading-relaxed whitespace-pre-line text-teks">${e(catatan)}</p>
          </div>` : ""}
        ${K.pengaturan.ppdb_pengumuman ? `
          <p class="text-sm text-samar">Pengumuman hasil seleksi dijadwalkan pada
            <strong class="text-biru-tua">${tanggalPanjang(K.pengaturan.ppdb_pengumuman)}</strong>.</p>` : ""}
        ${(() => {
          const paket = (K.paketUjian || []).find((x) => x.aktif);
          const sesi = (K.sesiUjian || []).find((x) => x.pendaftar_id === p.id);
          const bolehIkut = K.pengaturan.ujian_aktif === "1" && paket &&
            p.status !== "Menunggu Verifikasi" && p.status !== "Ditolak";
          if (!paket || (!bolehIkut && !sesi)) return "";
          if (sesi && sesi.status !== "Berjalan") {
            const lulus = sesi.status === "Selesai" && sesi.skor >= paket.nilai_minimum;
            return `
              <div class="tanpa-cetak space-y-3 border-t border-garis pt-4">
                <p class="text-xs font-semibold tracking-wide text-samar uppercase">Tes seleksi</p>
                <div class="rounded-lg border border-biru/20 bg-biru-muda px-5 py-4">
                  <p class="text-sm text-samar">${e(paket.nama)}</p>
                  <p class="mt-1 text-2xl font-bold text-biru-tua tabular-nums">Nilai ${sesi.skor}
                    <span class="ml-2 text-sm font-semibold text-samar">(${sesi.jumlah_benar} dari ${sesi.soal.length} benar)</span>
                  </p>
                  <p class="mt-1.5 text-sm leading-relaxed text-teks">${
                    lulus
                      ? `Nilai Anda memenuhi batas minimum ${paket.nilai_minimum}. Keputusan penerimaan tetap diumumkan panitia.`
                      : `Nilai Anda belum memenuhi batas minimum ${paket.nilai_minimum}. Keputusan penerimaan tetap diumumkan panitia.`
                  }</p>
                </div>
              </div>`;
          }
          return `
            <div class="tanpa-cetak space-y-3 border-t border-garis pt-4">
              <p class="text-xs font-semibold tracking-wide text-samar uppercase">Tes seleksi</p>
              <p class="text-sm leading-relaxed text-teks">Tes seleksi sedang dibuka: ${paket.jumlah_soal} soal dalam ${paket.durasi_menit} menit. Waktu mulai berjalan begitu Anda membukanya.</p>
              <a href="/ppdb/ujian" class="inline-flex items-center justify-center gap-2 rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua">Kerjakan Tes Seleksi</a>
            </div>`;
        })()}
        <div class="tanpa-cetak space-y-3 border-t border-garis pt-4">
          <div class="flex flex-wrap gap-2">
            <button class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 bg-biru text-white hover:bg-biru-tua">Unduh Bukti Pendaftaran (PDF)</button>
            <button class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border border-garis bg-white text-teks hover:bg-biru-muda hover:text-biru">Kartu Peserta Ujian (PDF)</button>
            <button data-cetak-halaman class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 border border-garis bg-white text-teks hover:bg-biru-muda hover:text-biru">Cetak halaman ini</button>
          </div>
          <p class="text-xs leading-relaxed text-samar">Bukti pendaftaran dirakit di server, jadi bentuknya sama di semua peramban. Berkasnya memuat data pribadi, simpan di tempat yang aman.</p>
        </div>
      </div>
    </div>`;
  wadah.appendChild(el);
  el.querySelector("[data-cetak-halaman]").addEventListener("click", () => window.print());
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ==================================================================
   Panel panitia: masuk, dasbor, data pendaftar, verifikasi, laporan
   ================================================================== */

const wadahMasuk = document.getElementById("wadah-masuk");

function siapkanMasuk() {
  const form = wadahMasuk.querySelector("form");
  if (!form) return;
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const u = (form.querySelector("#username")?.value || "").trim().toLowerCase();
    const s = form.querySelector("#sandi")?.value || "";

    form.querySelectorAll("[data-galat-masuk]").forEach((el) => el.remove());
    const akun = K.pengguna.find((p) => p.username === u && p.sandi === s);

    if (!akun) {
      const d = document.createElement("div");
      d.dataset.galatMasuk = "1";
      d.setAttribute("role", "alert");
      d.className = "rounded-kartu border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800";
      d.textContent = "Nama pengguna atau kata sandi salah.";
      form.prepend(d);
      return;
    }
    sesi = { nama: akun.nama, username: akun.username, role: akun.role };
    wadahMasuk.hidden = true;
    pergi("/admin");
  };
}

function keluarPanel() {
  sesi = null;
  pergi("/admin/masuk");
}

/** Menyesuaikan kepala panel dan sidebar dengan peran yang sedang masuk. */
function sesuaikanKerangkaPanel() {
  const nama = panel.querySelector("header strong");
  if (nama) nama.textContent = sesi.nama;
  const peran = panel.querySelector("header .rounded-full");
  if (peran) peran.textContent = sesi.role === "admin" ? "Admin" : "Operator";

  const khususAdmin = ["/admin/jurusan", "/admin/pengaturan", "/admin/pengguna"];
  panel.querySelectorAll("nav a[href]").forEach((a) => {
    if (khususAdmin.includes(a.getAttribute("href"))) {
      a.closest("li").hidden = sesi.role !== "admin";
    }
  });

  const tombolKeluar = [...panel.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Keluar");
  if (tombolKeluar) tombolKeluar.onclick = keluarPanel;
}

/** Mencari bagian panel berdasarkan judulnya. */
function bagianJudul(teks) {
  const h = [...isiPanel.querySelectorAll("h1, h2")].find(
    (x) => x.textContent.trim() === teks);
  return h ? h.closest("section") || h.parentElement : null;
}

function kartuAngka(label) {
  const p = [...isiPanel.querySelectorAll("p.uppercase")].find(
    (x) => x.textContent.trim().toLowerCase() === label.toLowerCase());
  return p ? p.parentElement : null;
}

function setKartuAngka(label, nilai, keterangan) {
  const k = kartuAngka(label);
  if (!k) return;
  const p = k.querySelectorAll("p");
  if (p[1]) p[1].textContent = nilai;
  if (keterangan !== undefined) {
    if (p[2]) p[2].textContent = keterangan;
    else if (keterangan) {
      const t = document.createElement("p");
      t.className = "mt-1 text-xs text-samar";
      t.textContent = keterangan;
      k.appendChild(t);
    }
  }
}

const barisBilah = (label, jumlah, maks, keterangan, warna = "var(--color-biru)") => {
  const lebar = maks > 0 ? Math.min(Math.round((jumlah / maks) * 100), 100) : 0;
  return `
  <div>
    <div class="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
      <span class="min-w-0 truncate font-medium text-teks">${e(label)}</span>
      <span class="shrink-0 font-semibold text-biru-tua tabular-nums">${angka(jumlah)}${
        keterangan ? `<span class="ml-1 font-normal text-samar">${e(keterangan)}</span>` : ""}</span>
    </div>
    <div class="h-2.5 overflow-hidden rounded-full bg-biru-muda">
      <div class="h-full rounded-full transition-[width] duration-700" style="width:${lebar}%;background:${warna}"></div>
    </div>
  </div>`;
};

/* ---------- ringkasan angka ---------- */

function hitungRingkasan() {
  const aktif = pendaftarAktif();
  const perStatus = {};
  for (const s of DATA.statusPendaftar) perStatus[s] = 0;
  for (const p of aktif) perStatus[p.status] = (perStatus[p.status] || 0) + 1;

  const cacah = (ambil) => {
    const m = {};
    for (const p of aktif) {
      const k = ambil(p) || "Tidak diisi";
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m)
      .map(([label, jumlah]) => ({ label, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  };

  const perTanggal = {};
  for (const p of K.pendaftar) {
    const t = String(p.dibuat).slice(0, 10);
    perTanggal[t] = (perTanggal[t] || 0) + 1;
  }

  return {
    total: aktif.length,
    kuota: Number(K.pengaturan.ppdb_kuota || 0),
    hariIni: K.pendaftar.filter((p) => String(p.dibuat).slice(0, 10) === hariIni()).length,
    pesanBelum: K.pesan.filter((p) => !p.dibaca).length,
    perStatus: DATA.statusPendaftar.map((s) => ({ label: s, jumlah: perStatus[s] })),
    perSumber: cacah((p) => p.sumber_informasi),
    perJalur: cacah((p) => p.jalur),
    perJk: cacah((p) => jenisKelaminPanjang(p.jenis_kelamin)),
    perSekolah: cacah((p) => p.asal_sekolah),
    perBulan: Object.entries(
      aktif.reduce((m, p) => {
        const b = String(p.dibuat).slice(0, 7);
        m[b] = (m[b] || 0) + 1;
        return m;
      }, {})).map(([label, jumlah]) => ({ label, jumlah })).sort((a, b) => (a.label < b.label ? -1 : 1)),
    perJurusan: K.jurusan.map((j) => ({
      label: j.nama, kuota: j.kuota, aktif: j.aktif,
      jumlah: aktif.filter((p) => p.jurusan_id === j.id).length,
    })),
    tren: Object.entries(perTanggal)
      .map(([label, jumlah]) => ({ label, jumlah }))
      .sort((a, b) => (a.label < b.label ? -1 : 1))
      .slice(-30),
  };
}

/* ---------- dasbor ---------- */

function hidrasiDasbor() {
  sesuaikanKerangkaPanel();
  const r = hitungRingkasan();

  setKartuAngka("Total pendaftar", angka(r.total),
    r.kuota ? `${persen(r.total, r.kuota)}% dari kuota ${angka(r.kuota)}` : "");
  setKartuAngka("Masuk hari ini", angka(r.hariIni));
  setKartuAngka("Tujuh hari terakhir", angka(r.hariIni));
  setKartuAngka("Pesan belum dibaca", angka(r.pesanBelum));

  // Kartu status.
  isiPanel.querySelectorAll('a[href^="/admin/pendaftar?status="]').forEach((a) => {
    const label = a.querySelectorAll("p")[1]?.textContent.trim();
    const c = r.perStatus.find((s) => s.label === label);
    const nilai = a.querySelector("p");
    if (c && nilai) nilai.textContent = angka(c.jumlah);
  });

  const isiBagian = (judul, html) => {
    const b = bagianJudul(judul);
    if (!b) return;
    const kotak = b.querySelector(".space-y-4");
    if (kotak) kotak.innerHTML = html;
    else {
      const p = b.querySelector("p.py-6");
      if (p) {
        const d = document.createElement("div");
        d.className = "space-y-4";
        d.innerHTML = html;
        p.replaceWith(d);
      }
    }
  };

  const maksSumber = Math.max(...r.perSumber.map((s) => s.jumlah), 1);
  isiBagian("Kanal Promosi Teratas", r.perSumber.slice(0, 8).map((s) =>
    barisBilah(s.label, s.jumlah, maksSumber, `(${persen(s.jumlah, r.total)}%)`)).join(""));

  const maksJalur = Math.max(...r.perJalur.map((s) => s.jumlah), 1);
  isiBagian("Jalur Pendaftaran", r.perJalur.map((s) =>
    barisBilah(s.label, s.jumlah, maksJalur, `(${persen(s.jumlah, r.total)}%)`)).join(""));

  isiBagian("Keterisian Peminatan", r.perJurusan.filter((j) => j.aktif).map((j) =>
    barisBilah(j.label, j.jumlah, j.kuota || 1, `/ ${angka(j.kuota)}`,
      j.kuota && j.jumlah >= j.kuota ? "var(--color-emas)" : "var(--color-biru)")).join(""));

  // Grafik tren harian.
  const bTren = bagianJudul("Pendaftaran 30 Hari Terakhir");
  if (bTren) {
    const kotak = bTren.querySelector(".flex.h-40") || bTren.querySelector("p.py-6");
    const maks = Math.max(...r.tren.map((t) => t.jumlah), 1);
    const html = r.tren.map((t) => `
      <div class="group flex h-full min-w-4 flex-1 flex-col items-center justify-end gap-1"
           title="${tanggalPanjang(t.label)}: ${t.jumlah} pendaftar">
        <span class="text-[10px] font-semibold text-samar tabular-nums opacity-0 transition group-hover:opacity-100">${t.jumlah}</span>
        <span class="w-full max-w-8 rounded-t bg-biru transition group-hover:bg-biru-tua"
              style="height:${Math.max((t.jumlah / maks) * 100, 6)}%"></span>
        <span class="text-[9px] text-samar tabular-nums">${String(t.label).slice(8)}</span>
      </div>`).join("");
    if (kotak) {
      const d = document.createElement("div");
      d.className = "flex h-40 items-end gap-1 overflow-x-auto";
      d.innerHTML = html;
      kotak.replaceWith(d);
    }
  }

  // Tabel pendaftar terbaru.
  const tbody = isiPanel.querySelector("tbody");
  if (tbody) {
    const terbaru = K.pendaftar.slice(0, 5);
    tbody.innerHTML = terbaru.map((p) => `
      <tr class="hover:bg-slate-50">
        <td class="px-4 py-3 font-semibold whitespace-nowrap">
          <a href="/admin/pendaftar/${p.id}" class="text-biru hover:underline">${e(p.no_registrasi)}</a></td>
        <td class="px-4 py-3">${e(p.nama_lengkap)}</td>
        <td class="px-4 py-3 text-samar">${e(p.nama_jurusan || "-")}</td>
        <td class="px-4 py-3 text-samar">${e(p.asal_sekolah)}</td>
        <td class="px-4 py-3">${lencana(p.status, warnaStatus(p.status))}</td>
        <td class="px-4 py-3 whitespace-nowrap text-samar">${tanggalJam(p.dibuat)}</td>
      </tr>`).join("");
  }

  // Lencana keadaan pendaftaran.
  const lk = [...isiPanel.querySelectorAll("span")].find((s) =>
    ["Pendaftaran dibuka", "Pendaftaran ditutup"].includes(s.textContent.trim()));
  if (lk) {
    const buka = ppdbDibuka();
    lk.textContent = buka ? "Pendaftaran dibuka" : "Pendaftaran ditutup";
    lk.className = "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
      (buka ? "border-green-200 bg-green-100 text-green-800"
            : "border-slate-200 bg-slate-100 text-slate-700");
  }
}

/* ---------- data pendaftar ---------- */

const saringPendaftar = { status: "", jalur: "", sumber: "", cari: "", urut: "terbaru" };

function hidrasiPendaftar() {
  sesuaikanKerangkaPanel();

  const q = kueriSekarang();
  if (q.get("status")) saringPendaftar.status = q.get("status");

  const isiKolom = (id, nilai) => {
    const el = isiPanel.querySelector("#" + id);
    if (el) el.value = nilai;
  };
  isiKolom("cari", saringPendaftar.cari);
  isiKolom("status", saringPendaftar.status);
  isiKolom("jalur", saringPendaftar.jalur);
  isiKolom("sumber", saringPendaftar.sumber);
  isiKolom("urut", saringPendaftar.urut);

  ["cari", "status", "jalur", "sumber", "urut", "tahun_ajaran"].forEach((id) => {
    const el = isiPanel.querySelector("#" + id);
    if (!el) return;
    el.oninput = el.onchange = () => {
      if (id in saringPendaftar) saringPendaftar[id] = el.value;
      renderTabelPendaftar();
    };
  });

  const unduh = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Unduh CSV"));
  if (unduh) unduh.onclick = unduhCsvDemo;

  renderTabelPendaftar();
}

function pendaftarTersaring() {
  let d = pendaftarAktif();
  const s = saringPendaftar;
  if (s.status) d = d.filter((p) => p.status === s.status);
  if (s.jalur) d = d.filter((p) => p.jalur === s.jalur);
  if (s.sumber) d = d.filter((p) => p.sumber_informasi === s.sumber);
  if (s.cari.trim()) {
    const c = s.cari.trim().toLowerCase();
    d = d.filter((p) =>
      [p.nama_lengkap, p.no_registrasi, p.nisn, p.asal_sekolah]
        .join(" ").toLowerCase().includes(c));
  }
  const urut = {
    terbaru: (a, b) => (a.dibuat < b.dibuat ? 1 : -1),
    terlama: (a, b) => (a.dibuat > b.dibuat ? 1 : -1),
    nama: (a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap, "id"),
    nilai: (a, b) => (b.nilai_rata2 ?? -1) - (a.nilai_rata2 ?? -1),
    no_registrasi: (a, b) => a.no_registrasi.localeCompare(b.no_registrasi),
  }[s.urut] || ((a, b) => (a.dibuat < b.dibuat ? 1 : -1));

  return d.slice().sort(urut);
}

function renderTabelPendaftar() {
  const d = pendaftarTersaring();
  const kartuTabel = isiPanel.querySelector(".kartu.overflow-hidden");
  const keterangan = isiPanel.querySelector("p.mb-4.text-sm.text-samar");

  if (d.length === 0) {
    if (keterangan) keterangan.textContent = "";
    if (kartuTabel) {
      kartuTabel.outerHTML = tanpaData("Tidak ada pendaftar yang cocok",
        "Ubah atau bersihkan penyaring di atas untuk melihat data lain.");
    }
    return;
  }

  // Tabel bisa sudah tergantikan oleh keterangan kosong; pasang ulang bila perlu.
  if (!isiPanel.querySelector("tbody")) {
    const kosong = isiPanel.querySelector(".kartu.px-6.py-14");
    if (kosong) {
      const d2 = document.createElement("div");
      d2.innerHTML = HALAMAN.pendaftar;
      const tabelBaru = d2.querySelector(".kartu.overflow-hidden");
      kosong.replaceWith(tabelBaru);
    }
  }

  if (keterangan) {
    keterangan.textContent =
      `Menampilkan ${d.length} dari ${angka(d.length)} pendaftar tahun ajaran ${tahunAjaran()}.`;
  }

  const tbody = isiPanel.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = d.map((p) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 font-semibold whitespace-nowrap">
        <a href="/admin/pendaftar/${p.id}" class="text-biru hover:underline">${e(p.no_registrasi)}</a></td>
      <td class="px-4 py-3">${e(p.nama_lengkap)}</td>
      <td class="px-4 py-3 text-samar">${e(p.jenis_kelamin)}</td>
      <td class="px-4 py-3 text-samar">${e(p.nama_jurusan || "-")}</td>
      <td class="px-4 py-3 text-samar">${e(p.jalur)}</td>
      <td class="px-4 py-3 text-samar">${e(p.asal_sekolah)}</td>
      <td class="px-4 py-3 text-right tabular-nums">${nilaiRapor(p.nilai_rata2)}</td>
      <td class="px-4 py-3 text-samar">${e(p.sumber_informasi || "-")}</td>
      <td class="px-4 py-3">${lencana(p.status, warnaStatus(p.status))}</td>
      <td class="px-4 py-3 whitespace-nowrap text-samar">${tanggalJam(p.dibuat)}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <a href="/admin/pendaftar/${p.id}"
           class="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15">Verifikasi</a></td>
    </tr>`).join("");

  // Penomoran halaman tidak dipakai pada demo karena datanya sedikit.
  isiPanel.querySelector('nav[aria-label="Halaman data pendaftar"]')?.remove();
}

function unduhCsvDemo() {
  const d = pendaftarTersaring();
  const kepala = ["No. Registrasi","Tahun Ajaran","Jalur","Peminatan","Nama Lengkap","NISN",
    "Jenis Kelamin","Tanggal Lahir","Asal Sekolah","No. HP","Email","Nilai Rata-rata",
    "Sumber Informasi","Status","Waktu Mendaftar"];
  const sel = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const baris = d.map((p) => [
    p.no_registrasi, p.tahun_ajaran, p.jalur, p.nama_jurusan, p.nama_lengkap, p.nisn,
    jenisKelaminPanjang(p.jenis_kelamin), p.tanggal_lahir, p.asal_sekolah, p.no_hp,
    p.email, p.nilai_rata2 ?? "", p.sumber_informasi, p.status, p.dibuat,
  ].map(sel).join(","));

  const isi = "﻿" + [kepala.map(sel).join(","), ...baris].join("\r\n");
  const blob = new Blob([isi], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pendaftar-${tahunAjaran().replace("/", "-")}-demo.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  beriTahu(`Berkas CSV berisi ${d.length} pendaftar diunduh.`);
}

/* ---------- verifikasi pendaftar ---------- */

function hidrasiPendaftarDetail(id) {
  sesuaikanKerangkaPanel();
  const p = K.detail[String(id)];
  const ringkas = K.pendaftar.find((x) => String(x.id) === String(id));

  if (!p || !ringkas) {
    isiPanel.innerHTML = `<div class="max-w-2xl">${tanpaData("Data pendaftar tidak ditemukan",
      "Mungkin sudah dihapus pada sesi demo ini.")}
      <p class="mt-6"><a href="/admin/pendaftar" class="text-sm font-semibold text-biru hover:underline">&larr; Kembali ke daftar pendaftar</a></p></div>`;
    return;
  }

  const gabung = { ...p, ...ringkas, catatan_admin: p.catatan_admin || "" };

  // Kepala halaman.
  const h1 = isiPanel.querySelector("h1");
  if (h1) h1.textContent = gabung.nama_lengkap;
  const ket = h1?.nextElementSibling;
  if (ket) {
    ket.textContent =
      `${gabung.no_registrasi} · Tahun Ajaran ${gabung.tahun_ajaran} · Jalur ${gabung.jalur}`;
  }
  const lst = [...isiPanel.querySelectorAll("span")].find((s) =>
    DATA.statusPendaftar.includes(s.textContent.trim()));
  if (lst) {
    lst.textContent = gabung.status;
    lst.className = "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
      warnaStatus(gabung.status);
  }

  // Blok data.
  const blok = {
    "Data Pribadi": [
      ["Nama lengkap", gabung.nama_lengkap],
      ["Jenis kelamin", jenisKelaminPanjang(gabung.jenis_kelamin)],
      ["NISN", gabung.nisn], ["NIK", gabung.nik],
      ["Tempat lahir", gabung.tempat_lahir],
      ["Tanggal lahir", tanggalPanjang(gabung.tanggal_lahir)],
      ["Agama", gabung.agama], ["Anak ke-", gabung.anak_ke],
      ["Jumlah saudara", gabung.jumlah_saudara],
    ],
    "Alamat & Kontak": [
      ["Alamat", gabung.alamat], ["Kelurahan/Desa", gabung.kelurahan],
      ["Kecamatan", gabung.kecamatan], ["Kabupaten/Kota", gabung.kota],
      ["Provinsi", gabung.provinsi], ["Kode pos", gabung.kode_pos],
      ["No. HP/WhatsApp", gabung.no_hp], ["Email", gabung.email],
    ],
    "Sekolah Asal": [
      ["Nama sekolah", gabung.asal_sekolah], ["NPSN", gabung.npsn_sekolah],
      ["Alamat sekolah", gabung.alamat_sekolah], ["Tahun lulus", gabung.tahun_lulus],
      ["Nilai rata-rata rapor", nilaiRapor(gabung.nilai_rata2)],
    ],
    "Orang Tua / Wali": [
      ["Nama ayah", gabung.nama_ayah], ["Pekerjaan ayah", gabung.pekerjaan_ayah],
      ["Pendidikan ayah", gabung.pendidikan_ayah], ["Nama ibu", gabung.nama_ibu],
      ["Pekerjaan ibu", gabung.pekerjaan_ibu], ["Pendidikan ibu", gabung.pendidikan_ibu],
      ["Penghasilan orang tua", gabung.penghasilan], ["No. HP orang tua", gabung.no_hp_ortu],
      ["Nama wali", gabung.nama_wali],
    ],
    "Sumber Informasi & Jejak Pendaftaran": [
      ["Mengetahui sekolah dari",
        DATA.labelSumber[gabung.sumber_informasi] || gabung.sumber_informasi],
      ["Keterangan tambahan", gabung.catatan_sumber],
      ["Peminatan dipilih", gabung.nama_jurusan],
      ["Waktu mendaftar", tanggalJam(gabung.dibuat)],
      ["Terakhir diubah", tanggalJam(gabung.diubah)],
      ["Alamat IP pendaftar", gabung.ip_pendaftar],
    ],
  };

  isiPanel.querySelectorAll("section.kartu").forEach((sec) => {
    const judul = sec.querySelector("h2")?.textContent.trim();
    const butir = blok[judul];
    if (!butir) return;
    const dl = sec.querySelector("dl");
    if (!dl) return;
    const terisi = butir.filter(([, v]) => v && v !== "-");
    dl.innerHTML = terisi.map(([k, v]) => `
      <div class="flex flex-col gap-0.5 px-6 py-3 sm:flex-row sm:gap-4">
        <dt class="text-samar sm:w-56 sm:shrink-0">${e(k)}</dt>
        <dd class="min-w-0 break-words text-teks">${e(v)}</dd>
      </div>`).join("");
  });

  // Dokumen.
  const secDok = [...isiPanel.querySelectorAll("section.kartu")].find((s) =>
    s.querySelector("h2")?.textContent.trim() === "Dokumen Terunggah");
  if (secDok) {
    const kotak = secDok.querySelector(".space-y-3");
    const dok = [
      ["Foto 3x4", gabung.file_foto], ["Ijazah / SKL", gabung.file_ijazah],
      ["Kartu Keluarga", gabung.file_kk], ["Akta Kelahiran", gabung.file_akta],
      ["Rapor", gabung.file_raport], ["Sertifikat Prestasi", gabung.file_prestasi],
    ];
    kotak.innerHTML = `
      <p class="text-xs leading-relaxed text-samar">
        Dokumen ini memuat data pribadi. Pada aplikasi sebenarnya berkasnya hanya
        dapat dibuka selama Anda masuk sebagai petugas. Pada demo ini berkasnya
        tidak ikut diunggah ke mana pun, jadi yang ditampilkan hanya namanya.
      </p>
      ${dok.map(([label, nama]) => nama ? `
        <div class="rounded-lg border border-garis px-4 py-3">
          <p class="text-sm font-semibold text-teks">${e(label)}</p>
          <p class="mt-0.5 text-xs text-samar">${e(nama)}</p>
        </div>` : `
        <div class="rounded-lg border border-dashed border-garis px-4 py-3">
          <p class="text-sm font-semibold text-samar">${e(label)}</p>
          <p class="text-xs text-samar">Tidak diunggah</p>
        </div>`).join("")}`;
  }

  // Formulir verifikasi.
  const elStatus = isiPanel.querySelector("#status");
  const elCatatan = isiPanel.querySelector("#catatan_admin");
  if (elStatus) elStatus.value = gabung.status;
  if (elCatatan) elCatatan.value = gabung.catatan_admin;

  const simpanBtn = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Simpan Verifikasi"));
  if (simpanBtn) {
    simpanBtn.onclick = () => {
      const statusBaru = elStatus.value;
      if (!DATA.statusPendaftar.includes(statusBaru)) {
        beriTahu("Status yang dipilih tidak valid.", "galat");
        return;
      }
      ringkas.status = statusBaru;
      K.detail[String(id)].status = statusBaru;
      K.detail[String(id)].catatan_admin = elCatatan.value;
      K.detail[String(id)].nama_verifikator = sesi.nama;
      K.detail[String(id)].diubah = waktuSekarang();
      simpan();
      beriTahu("Status pendaftar berhasil diperbarui.");
      bukaPanel("pendaftarDetail", id);
    };
  }

  // Tangkapan berasal dari pendaftar yang belum diverifikasi, sehingga
  // keterangan verifikator belum ada di dalamnya dan perlu dibuat sendiri.
  let verif = [...isiPanel.querySelectorAll("p")].find((x) =>
    x.textContent.includes("Terakhir diverifikasi oleh"));
  if (gabung.nama_verifikator) {
    if (!verif) {
      verif = document.createElement("p");
      verif.className = "border-t border-garis pt-4 text-xs text-samar";
      simpanBtn?.parentElement?.appendChild(verif);
    }
    verif.innerHTML =
      `Terakhir diverifikasi oleh <strong class="text-biru-tua">${e(gabung.nama_verifikator)}</strong>.`;
  } else if (verif) {
    verif.remove();
  }

  // Penghapusan hanya untuk admin penuh.
  const secHapus = [...isiPanel.querySelectorAll("section")].find((s) =>
    s.querySelector("h2")?.textContent.includes("Hapus Data Pendaftar"));
  if (secHapus) {
    if (sesi.role !== "admin") secHapus.remove();
    else {
      const b = secHapus.querySelector("button");
      if (b) b.onclick = () => konfirmasiHapusPendaftar(id, gabung);
    }
  }
}

function konfirmasiHapusPendaftar(id, p) {
  tampilkanJendela(jendelaKonfirmasi({
    judul: "Hapus data pendaftar?",
    labelYa: "Ya, hapus permanen",
    pesan: `
      <p>Data <strong>${e(p.nama_lengkap)}</strong> (${e(p.no_registrasi)}) akan dihapus
         dari basis data.</p>
      <p>Seluruh dokumen yang diunggah juga akan dihapus dari server dan tidak dapat
         dipulihkan.</p>
      <p class="font-semibold">Bila hanya ingin menolak pendaftaran, ubah statusnya menjadi
         "Ditolak" saja agar riwayatnya tetap ada.</p>`,
  }));
  wadahJendela.querySelector("[data-ya]").onclick = () => {
    K.pendaftar = K.pendaftar.filter((x) => String(x.id) !== String(id));
    delete K.detail[String(id)];
    simpan();
    tutupJendela();
    beriTahu("Data pendaftar berhasil dihapus.");
    pergi("/admin/pendaftar");
  };
}

/* ---------- laporan ---------- */

function hidrasiLaporan() {
  sesuaikanKerangkaPanel();
  const r = hitungRingkasan();
  const teratas = r.perSumber.filter((s) => s.label !== "Tidak diisi")[0];
  const tidakDiisi = r.perSumber.find((s) => s.label === "Tidak diisi")?.jumlah ?? 0;
  const diterima = r.perStatus.find((s) => s.label === "Diterima")?.jumlah ?? 0;

  setKartuAngka("Total pendaftar", angka(r.total), `Tahun ajaran ${tahunAjaran()}`);
  setKartuAngka("Kanal paling efektif", teratas ? angka(teratas.jumlah) : "-",
    teratas ? `${DATA.labelSumber[teratas.label] || teratas.label} · ${
      persen(teratas.jumlah, r.total)}% pendaftar`
            : "Belum ada yang mengisi sumber informasi");
  setKartuAngka("Diterima", angka(diterima), `${persen(diterima, r.total)}% dari pendaftar`);
  setKartuAngka("Sumber tidak diisi", angka(tidakDiisi),
    tidakDiisi > 0 ? `${persen(tidakDiisi, r.total)}% data promosi hilang`
                   : "Seluruh pendaftar mengisi");

  // Tabel kanal promosi.
  const tbodyKanal = isiPanel.querySelector("tbody");
  if (tbodyKanal) {
    tbodyKanal.innerHTML = r.perSumber.map((s) => `
      <tr class="hover:bg-slate-50">
        <td class="px-4 py-3 font-medium">${e(DATA.labelSumber[s.label] || s.label)}</td>
        <td class="px-4 py-3 text-right font-semibold tabular-nums">${angka(s.jumlah)}</td>
        <td class="px-4 py-3 text-right text-samar tabular-nums">${persen(s.jumlah, r.total)}%</td>
        <td class="w-64 px-4 py-3">
          <div class="h-2.5 overflow-hidden rounded-full bg-biru-muda">
            <div class="h-full rounded-full bg-biru" style="width:${persen(s.jumlah, r.total)}%"></div>
          </div></td>
      </tr>`).join("");
  }

  const isiBagian = (judul, html) => {
    const b = bagianJudul(judul);
    if (!b) return;
    const kotak = b.querySelector(".space-y-4");
    if (kotak) kotak.innerHTML = html;
  };
  const maks = (arr) => Math.max(...arr.map((x) => x.jumlah), 1);

  isiBagian("Jalur Pendaftaran", r.perJalur.map((s) =>
    barisBilah(s.label, s.jumlah, maks(r.perJalur), `(${persen(s.jumlah, r.total)}%)`)).join(""));
  isiBagian("Status Verifikasi", r.perStatus.filter((s) => s.jumlah > 0).map((s) =>
    barisBilah(s.label, s.jumlah, maks(r.perStatus), `(${persen(s.jumlah, r.total)}%)`)).join(""));
  isiBagian("Keterisian Peminatan", r.perJurusan.map((j) =>
    barisBilah(j.label, j.jumlah, j.kuota || maks(r.perJurusan),
      j.kuota ? `/ ${angka(j.kuota)}` : "· kuota belum diisi")).join(""));
  isiBagian("Jenis Kelamin", r.perJk.map((s) =>
    barisBilah(s.label, s.jumlah, maks(r.perJk), `(${persen(s.jumlah, r.total)}%)`)).join(""));

  // Tabel asal sekolah.
  const tabelSekolah = [...isiPanel.querySelectorAll("section")].find((s) =>
    s.querySelector("h2")?.textContent.includes("Asal Sekolah Terbanyak"));
  if (tabelSekolah) {
    const tb = tabelSekolah.querySelector("tbody");
    if (tb) {
      tb.innerHTML = r.perSekolah.slice(0, 12).map((s) => `
        <tr class="hover:bg-slate-50">
          <td class="px-4 py-3 font-medium">${e(s.label)}</td>
          <td class="px-4 py-3 text-right font-semibold tabular-nums">${angka(s.jumlah)}</td>
          <td class="px-4 py-3 text-right text-samar tabular-nums">${persen(s.jumlah, r.total)}%</td>
        </tr>`).join("");
    }
  }

  // Sebaran bulanan.
  const secBulan = [...isiPanel.querySelectorAll("section")].find((s) =>
    s.querySelector("h2")?.textContent.includes("Sebaran Pendaftaran per Bulan"));
  if (secBulan) {
    const kotak = secBulan.querySelector(".flex.h-48");
    const m = maks(r.perBulan);
    if (kotak) {
      kotak.innerHTML = r.perBulan.map((b) => `
        <div class="flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-2">
          <span class="text-sm font-semibold text-biru-tua tabular-nums">${angka(b.jumlah)}</span>
          <span class="w-full max-w-20 rounded-t-lg bg-biru" style="height:${Math.max((b.jumlah / m) * 100, 5)}%"></span>
          <span class="text-center text-xs leading-tight text-samar">${namaBulan(b.label)}</span>
        </div>`).join("");
    }
  }
}

/* ---------- ganti sandi ---------- */

function hidrasiSandi() {
  sesuaikanKerangkaPanel();
  const ket = isiPanel.querySelector("h1")?.nextElementSibling;
  if (ket) {
    ket.textContent = `Mengubah kata sandi akun ${sesi.username}. ` +
      "Pada demo ini kata sandi baru hanya berlaku selama halaman belum dimuat ulang.";
  }
  const form = isiPanel.querySelector("form");
  if (!form) return;
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const lama = form.querySelector("#sandi_lama").value;
    const baru = form.querySelector("#sandi_baru").value;
    const ulang = form.querySelector("#sandi_ulang").value;
    const akun = K.pengguna.find((p) => p.username === sesi.username);

    const galat = {};
    if (akun.sandi !== lama) galat.sandi_lama = "Kata sandi lama tidak sesuai.";
    if (baru.length < 8) galat.sandi_baru = "Kata sandi baru minimal 8 karakter.";
    if (baru !== ulang) galat.sandi_ulang = "Ulangan kata sandi tidak sama.";
    pasangGalatFormulir(form, galat);
    if (Object.keys(galat).length) return;

    akun.sandi = baru;
    simpan();
    beriTahu("Kata sandi berhasil diperbarui.");
    form.reset();
  };
}

/* ==================================================================
   Menu pengelolaan isi situs: peminatan, berita, galeri, fasilitas,
   pesan masuk, pengaturan, dan pengguna
   ================================================================== */

function jendelaKonfirmasi({ judul, pesan, labelYa = "Ya, lanjutkan" }) {
  return `
  <div class="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10" data-tutup-latar>
    <div role="dialog" aria-modal="true" aria-label="${e(judul)}"
         class="w-full max-w-lg rounded-kartu bg-white shadow-kuat">
      <div class="flex items-center justify-between gap-4 border-b border-garis px-6 py-4">
        <h2 class="text-lg">${e(judul)}</h2>
        <button type="button" data-tutup aria-label="Tutup"
          class="grid h-8 w-8 place-items-center rounded-lg text-samar hover:bg-slate-100 hover:text-teks">&times;</button>
      </div>
      <div class="px-6 py-6">
        <div class="space-y-6">
          <div class="space-y-3 text-sm leading-relaxed text-teks">${pesan}</div>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" data-tutup
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-garis bg-white px-4 py-2.5 text-sm font-semibold text-teks transition hover:bg-biru-muda hover:text-biru">Batal</button>
            <button type="button" data-ya
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">${e(labelYa)}</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/** Membuka jendela isian dari tangkapan, lalu memasang penanganannya. */
function bukaJendelaIsian(namaTangkapan, { judul, isiAwal = {}, saatSimpan }) {
  tampilkanJendela(`<div class="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10" data-tutup-latar>${HALAMAN[namaTangkapan]}</div>`);
  const jd = wadahJendela.querySelector('[role="dialog"]');
  const h2 = jd.querySelector("h2");
  if (h2 && judul) h2.textContent = judul;

  for (const [k, v] of Object.entries(isiAwal)) {
    const el = jd.querySelector("#" + k);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!v;
    else if (el.type !== "file") el.value = v ?? "";
  }

  // Berkas tidak dikirim ke mana pun pada demo, jadi keterangannya diganti.
  jd.querySelectorAll('input[type="file"]').forEach((el) => {
    const bantuan = el.closest("div")?.querySelector("p.text-samar");
    if (bantuan) {
      bantuan.textContent =
        "Pada demo ini gambar tidak benar-benar diunggah; yang tersimpan hanya namanya.";
    }
  });

  const form = jd.querySelector("form");
  const batal = [...jd.querySelectorAll("button")].find((b) => b.textContent.trim() === "Batal");
  if (batal) batal.onclick = tutupJendela;

  form.onsubmit = (ev) => {
    ev.preventDefault();
    const ambil = (id) => {
      const el = jd.querySelector("#" + id);
      if (!el) return "";
      if (el.type === "checkbox") return el.checked;
      if (el.type === "file") return el.files?.[0]?.name || "";
      return el.value.trim();
    };
    const galat = saatSimpan(ambil, jd);
    if (galat && Object.keys(galat).length) {
      pasangGalatFormulir(jd, galat);
      const d = jd.querySelector("[data-ringkasan-demo]") || document.createElement("div");
      d.dataset.ringkasanDemo = "1";
      d.innerHTML = ringkasanGalat(Object.values(galat));
      form.prepend(d);
    }
  };
}

const idBaru = (arr) => Math.max(0, ...arr.map((x) => x.id)) + 1;

function buatSlug(judul) {
  let s = String(judul).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!s) s = "berita";
  if (s.length > 190) s = s.slice(0, 190).replace(/-+$/, "");
  let calon = s, i = 2;
  while (K.berita.some((b) => b.slug === calon)) calon = `${s}-${i++}`;
  return calon;
}

/* ---------- peminatan ---------- */

function hidrasiJurusan() {
  sesuaikanKerangkaPanel();
  const tambah = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.trim() === "Tambah Peminatan");
  if (tambah) tambah.onclick = () => formJurusan(null);

  const tbody = isiPanel.querySelector("tbody");
  if (!tbody) return;
  const daftar = K.jurusan.slice().sort((a, b) => a.urutan - b.urutan || a.id - b.id);

  tbody.innerHTML = daftar.map((j) => {
    const jml = pendaftarAktif().filter((p) => p.jurusan_id === j.id).length;
    return `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-samar tabular-nums">${j.urutan}</td>
      <td class="px-4 py-3 font-semibold">${e(j.kode)}</td>
      <td class="px-4 py-3">
        <p class="font-medium">${e(j.nama)}</p>
        ${j.deskripsi ? `<p class="mt-0.5 max-w-md text-xs text-samar">${e(j.deskripsi)}</p>` : ""}
      </td>
      <td class="px-4 py-3 text-right tabular-nums">${angka(j.kuota)}</td>
      <td class="px-4 py-3 text-right tabular-nums">${angka(jml)}</td>
      <td class="w-40 px-4 py-3">
        <div class="h-2 overflow-hidden rounded-full bg-biru-muda">
          <div class="h-full rounded-full bg-biru" style="width:${Math.min(persen(jml, j.kuota), 100)}%"></div>
        </div>
        <p class="mt-1 text-xs text-samar tabular-nums">${persen(jml, j.kuota)}%</p>
      </td>
      <td class="px-4 py-3">${lencana(j.aktif ? "Aktif" : "Nonaktif",
        j.aktif ? "border-green-200 bg-green-100 text-green-800"
                : "border-slate-200 bg-slate-100 text-slate-600")}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2 whitespace-nowrap">
          <button type="button" data-ubah="${j.id}"
            class="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15">Ubah</button>
          <button type="button" data-hapus="${j.id}"
            class="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-ubah]").forEach((b) =>
    b.onclick = () => formJurusan(K.jurusan.find((j) => j.id === Number(b.dataset.ubah))));
  tbody.querySelectorAll("[data-hapus]").forEach((b) =>
    b.onclick = () => hapusJurusan(Number(b.dataset.hapus)));
}

function formJurusan(j) {
  bukaJendelaIsian("jendelaJurusan", {
    judul: j ? "Ubah Peminatan" : "Tambah Peminatan",
    isiAwal: j ? { kode: j.kode, nama: j.nama, deskripsi: j.deskripsi, kuota: j.kuota,
                   ikon: j.ikon, urutan: j.urutan, aktif: j.aktif }
               : { kuota: 0, urutan: K.jurusan.length + 1, aktif: true },
    saatSimpan: (ambil) => {
      const kode = String(ambil("kode")).toUpperCase();
      const nama = ambil("nama");
      const kuota = Number(ambil("kuota") || 0);
      const galat = {};
      if (!kode) galat.kode = "Kode peminatan wajib diisi.";
      if (!nama) galat.nama = "Nama peminatan wajib diisi.";
      if (kuota < 0 || kuota > 10000) galat.kuota = "Kuota harus berupa angka 0 sampai 10000.";
      if (K.jurusan.some((x) => x.kode === kode && (!j || x.id !== j.id))) {
        galat.kode = `Kode peminatan ${kode} sudah dipakai.`;
      }
      if (Object.keys(galat).length) return galat;

      const nilai = {
        kode, nama, deskripsi: ambil("deskripsi"), kuota,
        ikon: ambil("ikon"), urutan: Number(ambil("urutan") || 0), aktif: !!ambil("aktif"),
      };
      if (j) Object.assign(j, nilai);
      else K.jurusan.push({ id: idBaru(K.jurusan), pendaftar: 0, ...nilai });
      simpan();
      tutupJendela();
      beriTahu(j ? "Peminatan berhasil diperbarui." : "Peminatan berhasil ditambahkan.");
      bukaPanel("jurusan");
    },
  });
}

function hapusJurusan(id) {
  const j = K.jurusan.find((x) => x.id === id);
  const dipakai = pendaftarAktif().filter((p) => p.jurusan_id === id).length;
  tampilkanJendela(jendelaKonfirmasi({
    judul: "Hapus peminatan?", labelYa: "Ya, hapus",
    pesan: `<p>Peminatan <strong>${e(j.nama)}</strong> akan dihapus.</p>${
      dipakai ? `<p class="rounded-lg bg-amber-50 px-4 py-3 text-amber-900">
        Peminatan ini sudah dipilih ${angka(dipakai)} pendaftar sehingga tidak dapat dihapus.
        Nonaktifkan saja agar tidak muncul lagi di formulir.</p>` : ""}`,
  }));
  wadahJendela.querySelector("[data-ya]").onclick = () => {
    if (dipakai) {
      beriTahu(`Peminatan ini sudah dipilih ${dipakai} pendaftar sehingga tidak dapat dihapus.`, "galat");
      tutupJendela();
      return;
    }
    K.jurusan = K.jurusan.filter((x) => x.id !== id);
    simpan();
    tutupJendela();
    beriTahu("Peminatan berhasil dihapus.");
    bukaPanel("jurusan");
  };
}

/* ---------- berita ---------- */

const saringBerita = { cari: "", kategori: "", publish: "" };

function hidrasiBeritaAdmin() {
  sesuaikanKerangkaPanel();
  const tulis = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.trim() === "Tulis Berita");
  if (tulis) tulis.onclick = () => formBerita(null);

  ["cari-berita", "kat-berita", "pub-berita"].forEach((id) => {
    const el = isiPanel.querySelector("#" + id);
    if (!el) return;
    const kunci = { "cari-berita": "cari", "kat-berita": "kategori", "pub-berita": "publish" }[id];
    el.value = saringBerita[kunci];
    el.oninput = el.onchange = () => {
      saringBerita[kunci] = el.value;
      renderTabelBerita();
    };
  });
  renderTabelBerita();
}

function renderTabelBerita() {
  let d = K.berita.slice();
  if (saringBerita.kategori) d = d.filter((b) => b.kategori === saringBerita.kategori);
  if (saringBerita.publish === "1") d = d.filter((b) => b.publish);
  if (saringBerita.publish === "0") d = d.filter((b) => !b.publish);
  if (saringBerita.cari.trim()) {
    const c = saringBerita.cari.trim().toLowerCase();
    d = d.filter((b) => (b.judul + " " + b.ringkasan).toLowerCase().includes(c));
  }
  d.sort((a, b) => (a.dibuat < b.dibuat ? 1 : -1));

  const kartuTabel = isiPanel.querySelector(".kartu.overflow-hidden");
  if (d.length === 0) {
    if (kartuTabel) {
      kartuTabel.outerHTML = tanpaData("Belum ada berita yang cocok",
        "Tulis berita baru, atau ubah penyaring di atas.");
    }
    return;
  }
  if (!isiPanel.querySelector("tbody")) {
    const kosong = isiPanel.querySelector(".kartu.px-6.py-14");
    if (kosong) {
      const w = document.createElement("div");
      w.innerHTML = HALAMAN.beritaAdmin;
      kosong.replaceWith(w.querySelector(".kartu.overflow-hidden"));
    }
  }

  const tbody = isiPanel.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = d.map((b) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3">${b.gambar
        ? `<img src="${gambarPengganti(b.gambar, b.judul)}" alt="" class="h-12 w-20 rounded object-cover">`
        : `<span class="grid h-12 w-20 place-items-center rounded bg-biru-muda text-[10px] text-biru/60">tanpa gambar</span>`}</td>
      <td class="px-4 py-3">
        <p class="max-w-md font-medium">${e(b.judul)}</p>
        <p class="mt-0.5 text-xs text-samar">/${e(b.slug)}</p></td>
      <td class="px-4 py-3">${lencana(b.kategori)}</td>
      <td class="px-4 py-3">${lencana(b.publish ? "Terbit" : "Draf",
        b.publish ? "border-green-200 bg-green-100 text-green-800"
                  : "border-amber-200 bg-amber-100 text-amber-800")}</td>
      <td class="px-4 py-3 text-right tabular-nums">${angka(b.dibaca)}</td>
      <td class="px-4 py-3 whitespace-nowrap text-samar">${tanggalJam(b.diubah || b.dibuat)}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2 whitespace-nowrap">
          <button type="button" data-ubah="${b.id}"
            class="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15">Ubah</button>
          <a href="/berita/${e(b.slug)}"
            class="rounded-lg border border-garis px-3 py-1.5 text-xs font-semibold text-teks hover:border-biru hover:text-biru">Lihat</a>
          <button type="button" data-hapus="${b.id}"
            class="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Hapus</button>
        </div>
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("[data-ubah]").forEach((btn) =>
    btn.onclick = () => formBerita(K.berita.find((b) => b.id === Number(btn.dataset.ubah))));
  tbody.querySelectorAll("[data-hapus]").forEach((btn) =>
    btn.onclick = () => hapusBerita(Number(btn.dataset.hapus)));
}

function formBerita(b) {
  bukaJendelaIsian("jendelaBerita", {
    judul: b ? "Ubah Berita" : "Tulis Berita",
    isiAwal: b ? { judul: b.judul, kategori: b.kategori, ringkasan: b.ringkasan,
                   isi: b.isi, penulis: b.penulis, publish: b.publish }
               : { kategori: "Berita", publish: true },
    saatSimpan: (ambil) => {
      const judul = ambil("judul");
      const isi = ambil("isi");
      const galat = {};
      if (!judul) galat.judul = "Judul wajib diisi.";
      if (!isi) galat.isi = "Isi berita wajib diisi.";
      if (Object.keys(galat).length) return galat;

      const gambarBaru = ambil("gambar");
      const nilai = {
        judul, kategori: ambil("kategori") || "Berita",
        ringkasan: ambil("ringkasan"), isi,
        penulis: ambil("penulis") || sesi.nama,
        publish: !!ambil("publish"), diubah: waktuSekarang(),
      };
      if (b) {
        if (judul !== b.judul) nilai.slug = buatSlug(judul);
        if (gambarBaru) nilai.gambar = gambarBaru;
        else if (ambil("hapus_gambar")) nilai.gambar = "";
        Object.assign(b, nilai);
      } else {
        K.berita.unshift({
          id: idBaru(K.berita), slug: buatSlug(judul), dibaca: 0,
          gambar: gambarBaru || "", dibuat: waktuSekarang(), ...nilai,
        });
      }
      simpan();
      tutupJendela();
      beriTahu(b ? "Berita berhasil diperbarui." : "Berita berhasil disimpan.");
      bukaPanel("beritaAdmin");
    },
  });
}

function hapusBerita(id) {
  const b = K.berita.find((x) => x.id === id);
  tampilkanJendela(jendelaKonfirmasi({
    judul: "Hapus berita?", labelYa: "Ya, hapus",
    pesan: `<p>Berita <strong>${e(b.judul)}</strong> beserta gambarnya akan dihapus
              dan tidak dapat dipulihkan.</p>
            <p>Bila hanya ingin menyembunyikannya dari pengunjung, ubah saja menjadi draf.</p>`,
  }));
  wadahJendela.querySelector("[data-ya]").onclick = () => {
    K.berita = K.berita.filter((x) => x.id !== id);
    simpan();
    tutupJendela();
    beriTahu("Berita berhasil dihapus.");
    bukaPanel("beritaAdmin");
  };
}

/* ---------- galeri ---------- */

function hidrasiGaleriAdmin() {
  sesuaikanKerangkaPanel();
  const unggah = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.trim() === "Unggah Foto");
  if (unggah) unggah.onclick = () => formGaleri(null);

  const petak = isiPanel.querySelector(".grid.gap-5");
  const ket = isiPanel.querySelector("p.mb-4.text-sm.text-samar");
  const daftar = K.galeri.slice().sort((a, b) => (a.dibuat < b.dibuat ? 1 : -1));
  const kategori = [...new Set(daftar.map((g) => g.kategori).filter(Boolean))];

  if (ket) {
    ket.textContent = `${daftar.length} foto` +
      (kategori.length ? ` dalam ${kategori.length} kategori: ${kategori.join(", ")}` : "") + ".";
  }
  if (!petak) return;

  petak.innerHTML = daftar.map((g) => `
    <div class="kartu overflow-hidden">
      <img src="${gambarPengganti(g.gambar, g.judul)}" alt="${e(g.judul)}"
           class="aspect-4/3 w-full bg-biru-muda object-cover" loading="lazy">
      <div class="p-4">
        <p class="text-sm font-semibold text-biru-tua">${e(g.judul)}</p>
        <p class="mt-0.5 text-xs text-samar">${e(g.kategori || "Tanpa kategori")} &middot; ${tanggalPanjang(g.dibuat)}</p>
        ${g.keterangan ? `<p class="mt-2 line-clamp-2 text-xs text-samar">${e(g.keterangan)}</p>` : ""}
        <div class="mt-3 flex gap-2">
          <button type="button" data-ubah="${g.id}"
            class="flex-1 rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15">Ubah</button>
          <button type="button" data-hapus="${g.id}"
            class="flex-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Hapus</button>
        </div>
      </div>
    </div>`).join("");

  petak.querySelectorAll("[data-ubah]").forEach((b) =>
    b.onclick = () => formGaleri(K.galeri.find((g) => g.id === Number(b.dataset.ubah))));
  petak.querySelectorAll("[data-hapus]").forEach((b) =>
    b.onclick = () => hapusGaleri(Number(b.dataset.hapus)));
}

function formGaleri(g) {
  bukaJendelaIsian("jendelaGaleri", {
    judul: g ? "Ubah Foto" : "Unggah Foto",
    isiAwal: g ? { judul: g.judul, kategori: g.kategori, keterangan: g.keterangan } : {},
    saatSimpan: (ambil) => {
      const judul = ambil("judul");
      const gambar = ambil("gambar");
      const galat = {};
      if (!judul) galat.judul = "Judul foto wajib diisi.";
      if (!g && !gambar) galat.gambar = "Foto wajib diunggah.";
      if (Object.keys(galat).length) return galat;

      const nilai = { judul, kategori: ambil("kategori"), keterangan: ambil("keterangan") };
      if (g) {
        Object.assign(g, nilai);
        if (gambar) g.gambar = gambar;
      } else {
        K.galeri.unshift({ id: idBaru(K.galeri), gambar, dibuat: waktuSekarang(), ...nilai });
      }
      simpan();
      tutupJendela();
      beriTahu(g ? "Foto berhasil diperbarui." : "Foto berhasil ditambahkan.");
      bukaPanel("galeriAdmin");
    },
  });
}

function hapusGaleri(id) {
  const g = K.galeri.find((x) => x.id === id);
  tampilkanJendela(jendelaKonfirmasi({
    judul: "Hapus foto?", labelYa: "Ya, hapus",
    pesan: `<p>Foto <strong>${e(g.judul)}</strong> akan dihapus dari galeri dan dari server.
              Tindakan ini tidak dapat dibatalkan.</p>`,
  }));
  wadahJendela.querySelector("[data-ya]").onclick = () => {
    K.galeri = K.galeri.filter((x) => x.id !== id);
    simpan();
    tutupJendela();
    beriTahu("Foto berhasil dihapus.");
    bukaPanel("galeriAdmin");
  };
}

/* ---------- fasilitas ---------- */

function hidrasiFasilitasAdmin() {
  sesuaikanKerangkaPanel();
  const tambah = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.trim() === "Tambah Fasilitas");
  if (tambah) tambah.onclick = () => formFasilitas(null);

  const tbody = isiPanel.querySelector("tbody");
  if (!tbody) return;
  const daftar = K.fasilitas.slice().sort((a, b) => a.urutan - b.urutan || a.id - b.id);

  tbody.innerHTML = daftar.map((f) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-samar tabular-nums">${f.urutan}</td>
      <td class="px-4 py-3">${f.gambar
        ? `<img src="${gambarPengganti(f.gambar, f.nama)}" alt="" class="h-12 w-20 rounded object-cover">`
        : `<span class="grid h-12 w-20 place-items-center rounded bg-biru-muda text-[10px] text-biru/60">tanpa gambar</span>`}</td>
      <td class="px-4 py-3 font-medium">${e(f.nama)}</td>
      <td class="max-w-md px-4 py-3 text-samar">${e(f.deskripsi || "-")}</td>
      <td class="px-4 py-3 text-xs text-samar">${e(f.ikon || "-")}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2 whitespace-nowrap">
          <button type="button" data-ubah="${f.id}"
            class="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15">Ubah</button>
          <button type="button" data-hapus="${f.id}"
            class="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Hapus</button>
        </div>
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("[data-ubah]").forEach((b) =>
    b.onclick = () => formFasilitas(K.fasilitas.find((f) => f.id === Number(b.dataset.ubah))));
  tbody.querySelectorAll("[data-hapus]").forEach((b) =>
    b.onclick = () => hapusFasilitas(Number(b.dataset.hapus)));
}

function formFasilitas(f) {
  bukaJendelaIsian("jendelaFasilitas", {
    judul: f ? "Ubah Fasilitas" : "Tambah Fasilitas",
    isiAwal: f ? { nama: f.nama, deskripsi: f.deskripsi, ikon: f.ikon, urutan: f.urutan }
               : { urutan: K.fasilitas.length + 1 },
    saatSimpan: (ambil) => {
      const nama = ambil("nama");
      if (!nama) return { nama: "Nama fasilitas wajib diisi." };

      const gambar = ambil("gambar");
      const nilai = {
        nama, deskripsi: ambil("deskripsi"), ikon: ambil("ikon"),
        urutan: Number(ambil("urutan") || 0),
      };
      if (f) {
        Object.assign(f, nilai);
        if (gambar) f.gambar = gambar;
        else if (ambil("hapus_gambar")) f.gambar = "";
      } else {
        K.fasilitas.push({ id: idBaru(K.fasilitas), gambar, ...nilai });
      }
      simpan();
      tutupJendela();
      beriTahu(f ? "Fasilitas berhasil diperbarui." : "Fasilitas berhasil ditambahkan.");
      bukaPanel("fasilitasAdmin");
    },
  });
}

function hapusFasilitas(id) {
  const f = K.fasilitas.find((x) => x.id === id);
  tampilkanJendela(jendelaKonfirmasi({
    judul: "Hapus fasilitas?", labelYa: "Ya, hapus",
    pesan: `<p>Fasilitas <strong>${e(f.nama)}</strong> beserta gambarnya akan dihapus
              dan tidak dapat dipulihkan.</p>`,
  }));
  wadahJendela.querySelector("[data-ya]").onclick = () => {
    K.fasilitas = K.fasilitas.filter((x) => x.id !== id);
    simpan();
    tutupJendela();
    beriTahu("Fasilitas berhasil dihapus.");
    bukaPanel("fasilitasAdmin");
  };
}

/* ---------- pesan masuk ---------- */

const saringPesan = { dibaca: "", cari: "" };

function hidrasiPesan() {
  sesuaikanKerangkaPanel();
  ["cari-pesan", "saring-dibaca"].forEach((id) => {
    const el = isiPanel.querySelector("#" + id);
    if (!el) return;
    const kunci = id === "cari-pesan" ? "cari" : "dibaca";
    el.value = saringPesan[kunci];
    el.oninput = el.onchange = () => {
      saringPesan[kunci] = el.value;
      renderPesan();
    };
  });
  renderPesan();
}

function renderPesan() {
  const total = K.pesan.length;
  const belum = K.pesan.filter((p) => !p.dibaca).length;
  setKartuAngka("Total pesan", angka(total));
  setKartuAngka("Belum dibaca", angka(belum));

  let d = K.pesan.slice();
  if (saringPesan.dibaca === "0") d = d.filter((p) => !p.dibaca);
  if (saringPesan.dibaca === "1") d = d.filter((p) => p.dibaca);
  if (saringPesan.cari.trim()) {
    const c = saringPesan.cari.trim().toLowerCase();
    d = d.filter((p) => (p.nama + " " + p.subjek + " " + p.isi).toLowerCase().includes(c));
  }

  const wadah = isiPanel.querySelector(".space-y-4") || isiPanel.querySelector(".kartu.px-6.py-14");
  if (!wadah) return;
  const baru = document.createElement("div");

  if (d.length === 0) {
    baru.innerHTML = tanpaData("Tidak ada pesan yang cocok",
      "Pesan dari halaman Kontak akan muncul di sini.");
  } else {
    baru.className = "space-y-4";
    baru.innerHTML = d.map((p) => {
      const wa = String(p.no_hp || "").replace(/\D/g, "");
      const noWa = wa ? (wa.startsWith("62") ? wa : wa.startsWith("0") ? "62" + wa.slice(1) : wa) : "";
      return `
      <article class="kartu p-6 ${p.dibaca ? "" : "border-l-4 border-l-amber-400"}">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base">${e(p.subjek || "(tanpa subjek)")}</h2>
              ${p.dibaca ? "" : lencana("Belum dibaca", "border-amber-200 bg-amber-100 text-amber-800")}
            </div>
            <p class="mt-1 text-sm text-samar">Dari <strong class="text-teks">${e(p.nama)}</strong> &middot; ${tanggalJam(p.dibuat)}</p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <button type="button" data-tandai="${p.id}"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-garis bg-white px-4 py-2.5 text-sm font-semibold text-teks transition hover:bg-biru-muda hover:text-biru">${
                p.dibaca ? "Tandai belum dibaca" : "Tandai sudah dibaca"}</button>
            <button type="button" data-hapus-pesan="${p.id}"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">Hapus</button>
          </div>
        </div>
        <p class="mt-4 border-t border-garis pt-4 text-[15px] leading-relaxed whitespace-pre-line text-teks">${e(p.isi)}</p>
        <div class="mt-4 flex flex-wrap gap-2 border-t border-garis pt-4">
          ${p.email ? `<a href="mailto:${e(p.email)}"
            class="rounded-lg bg-biru-muda px-3.5 py-2 text-sm font-semibold text-biru hover:bg-biru/15">Balas lewat email (${e(p.email)})</a>` : ""}
          ${noWa ? `<a href="https://wa.me/${noWa}" target="_blank" rel="noopener noreferrer"
            class="rounded-lg bg-green-50 px-3.5 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">Balas lewat WhatsApp (${e(p.no_hp)})</a>` : ""}
          ${!p.email && !noWa ? `<p class="text-sm text-samar">Pengirim tidak mencantumkan email maupun nomor HP.</p>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  wadah.replaceWith(baru);
  baru.querySelectorAll("[data-tandai]").forEach((b) =>
    b.onclick = () => {
      const p = K.pesan.find((x) => x.id === Number(b.dataset.tandai));
      p.dibaca = !p.dibaca;
      simpan();
      renderPesan();
    });
  baru.querySelectorAll("[data-hapus-pesan]").forEach((b) =>
    b.onclick = () => {
      const p = K.pesan.find((x) => x.id === Number(b.dataset.hapusPesan));
      tampilkanJendela(jendelaKonfirmasi({
        judul: "Hapus pesan?", labelYa: "Ya, hapus",
        pesan: `<p>Pesan dari <strong>${e(p.nama)}</strong> akan dihapus permanen.
                  Pastikan sudah ditindaklanjuti sebelum menghapusnya.</p>`,
      }));
      wadahJendela.querySelector("[data-ya]").onclick = () => {
        K.pesan = K.pesan.filter((x) => x.id !== p.id);
        simpan();
        tutupJendela();
        beriTahu("Pesan berhasil dihapus.");
        renderPesan();
      };
    });
}

/* ---------- pengaturan ---------- */

function hidrasiPengaturan() {
  sesuaikanKerangkaPanel();
  const suntingan = {};

  isiPanel.querySelectorAll('[id^="set-"]').forEach((el) => {
    const kunci = el.id.slice(4);
    el.value = K.pengaturan[kunci] ?? "";
    el.oninput = el.onchange = () => {
      suntingan[kunci] = el.value;
      tandaiPerubahan();
    };
  });

  const tombolSimpan = [...isiPanel.querySelectorAll("button")].filter((b) =>
    b.textContent.includes("Simpan Perubahan"));
  const tombolBatal = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Batalkan perubahan"));

  function jumlahBerubah() {
    return Object.keys(suntingan).filter((k) => suntingan[k] !== (K.pengaturan[k] ?? "")).length;
  }

  function tandaiPerubahan() {
    const n = jumlahBerubah();
    tombolSimpan.forEach((b) => (b.disabled = n === 0));
    const lencanaUbah = [...isiPanel.querySelectorAll("span")].find((s) =>
      s.textContent.includes("perubahan belum disimpan"));
    if (lencanaUbah) {
      lencanaUbah.textContent = `${n} perubahan belum disimpan`;
      lencanaUbah.hidden = n === 0;
    }
    const ket = [...isiPanel.querySelectorAll("p.text-sm.text-samar")].find((p) =>
      p.textContent.includes("perubahan") || p.textContent.includes("Belum ada perubahan"));
    if (ket) {
      ket.textContent = n === 0 ? "Belum ada perubahan." : `${n} pengaturan akan diperbarui.`;
    }
  }

  tombolSimpan.forEach((b) => (b.onclick = (ev) => {
    ev.preventDefault();
    const n = jumlahBerubah();
    if (!n) return;
    for (const [k, v] of Object.entries(suntingan)) K.pengaturan[k] = v;
    simpan();
    beriTahu(`Pengaturan berhasil disimpan (${n} pengaturan diperbarui).`);
    bukaPanel("pengaturan");
  }));
  if (tombolBatal) tombolBatal.onclick = () => bukaPanel("pengaturan");

  const form = isiPanel.querySelector("form");
  if (form) form.onsubmit = (ev) => ev.preventDefault();

  tandaiPerubahan();
}

/* ---------- pengguna ---------- */

function hidrasiPengguna() {
  sesuaikanKerangkaPanel();
  const tambah = [...isiPanel.querySelectorAll("button")].find((b) =>
    b.textContent.trim() === "Tambah Pengguna");
  if (tambah) tambah.onclick = () => formPengguna(null);

  const tbody = isiPanel.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = K.pengguna.map((p) => {
    const iniSaya = p.username === sesi.username;
    return `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 font-medium">${e(p.nama)}${
        iniSaya ? ` <span class="ml-2 text-xs text-samar">(Anda)</span>` : ""}</td>
      <td class="px-4 py-3 text-samar">${e(p.username)}</td>
      <td class="px-4 py-3">${lencana(p.role === "admin" ? "Admin" : "Operator",
        p.role === "admin" ? "border-biru/20 bg-biru-muda text-biru"
                           : "border-slate-200 bg-slate-100 text-slate-700")}</td>
      <td class="px-4 py-3 whitespace-nowrap text-samar">${
        p.masuk_akhir ? tanggalJam(p.masuk_akhir) : "Belum pernah"}</td>
      <td class="px-4 py-3 whitespace-nowrap text-samar">${tanggalJam(p.dibuat)}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2 whitespace-nowrap">
          <button type="button" data-ubah="${p.id}"
            class="rounded-lg bg-biru-muda px-3 py-1.5 text-xs font-semibold text-biru hover:bg-biru/15">Ubah</button>
          ${iniSaya ? "" : `<button type="button" data-hapus="${p.id}"
            class="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Hapus</button>`}
        </div>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-ubah]").forEach((b) =>
    b.onclick = () => formPengguna(K.pengguna.find((p) => p.id === Number(b.dataset.ubah))));
  tbody.querySelectorAll("[data-hapus]").forEach((b) =>
    b.onclick = () => hapusPengguna(Number(b.dataset.hapus)));
}

function formPengguna(u) {
  bukaJendelaIsian("jendelaPengguna", {
    judul: u ? "Ubah Pengguna" : "Tambah Pengguna",
    isiAwal: u ? { nama: u.nama, username: u.username, role: u.role, sandi: "" }
               : { role: "operator" },
    saatSimpan: (ambil) => {
      const nama = ambil("nama");
      const username = String(ambil("username")).toLowerCase();
      const sandi = ambil("sandi");
      const role = ambil("role") || "operator";
      const galat = {};

      if (!nama) galat.nama = "Nama wajib diisi.";
      if (!username) galat.username = "Nama pengguna wajib diisi.";
      else if (!/^[a-z0-9._]{3,50}$/.test(username)) {
        galat.username =
          "Nama pengguna hanya boleh huruf kecil, angka, titik, dan garis bawah (3-50 karakter).";
      } else if (K.pengguna.some((p) => p.username === username && (!u || p.id !== u.id))) {
        galat.username = `Nama pengguna ${username} sudah dipakai.`;
      }
      if ((!u || sandi) && sandi.length < 8) galat.sandi = "Kata sandi minimal 8 karakter.";
      if (u && u.username === sesi.username && role !== "admin") {
        galat.role = "Anda tidak dapat menurunkan peran akun Anda sendiri.";
      }
      if (Object.keys(galat).length) return galat;

      if (u) {
        u.nama = nama; u.username = username; u.role = role;
        if (sandi) u.sandi = sandi;
      } else {
        K.pengguna.push({
          id: idBaru(K.pengguna), nama, username, sandi, role,
          masuk_akhir: null, dibuat: waktuSekarang(),
        });
      }
      simpan();
      tutupJendela();
      beriTahu(u ? "Pengguna berhasil diperbarui." : "Pengguna berhasil ditambahkan.");
      bukaPanel("pengguna");
    },
  });
}

function hapusPengguna(id) {
  const u = K.pengguna.find((x) => x.id === id);
  const jumlahAdmin = K.pengguna.filter((x) => x.role === "admin").length;
  tampilkanJendela(jendelaKonfirmasi({
    judul: "Hapus pengguna?", labelYa: "Ya, hapus",
    pesan: `<p>Akun <strong>${e(u.nama)}</strong> (${e(u.username)}) tidak akan bisa masuk lagi.</p>
            <p>Catatan verifikasi yang pernah dikerjakannya tetap tersimpan pada data pendaftar.</p>
            ${u.role === "admin" && jumlahAdmin <= 1
              ? `<p class="rounded-lg bg-red-50 px-4 py-3 text-red-800">Ini satu-satunya akun admin.
                   Tambahkan admin lain terlebih dahulu.</p>` : ""}`,
  }));
  wadahJendela.querySelector("[data-ya]").onclick = () => {
    if (u.role === "admin" && jumlahAdmin <= 1) {
      beriTahu("Ini satu-satunya akun admin. Tambahkan admin lain terlebih dahulu.", "galat");
      tutupJendela();
      return;
    }
    K.pengguna = K.pengguna.filter((x) => x.id !== id);
    simpan();
    tutupJendela();
    beriTahu("Pengguna berhasil dihapus.");
    bukaPanel("pengguna");
  };
}

/* ---------- penyalaan ---------- */

document.getElementById("ulang-demo").onclick = () => {
  tampilkanJendela(jendelaKonfirmasi({
    judul: "Kembalikan demo ke keadaan awal?",
    labelYa: "Ya, kembalikan",
    pesan: `<p>Seluruh pendaftaran, berita, foto, dan pengaturan yang Anda ubah selama
              mencoba demo ini akan dihapus dari peramban Anda.</p>
            <p>Data contoh akan dimuat kembali seperti saat pertama kali dibuka.</p>`,
  }));
  wadahJendela.querySelector("[data-ya]").onclick = ulangDariAwal;
};

rute();

/* ==================================================================
   Navigasi: menu bertingkat, menu layar kecil, dan menu panel

   Pada aplikasi aslinya seluruhnya dikendalikan keadaan React. Di demo
   markupnya sudah ditangkap apa adanya, jadi yang ditulis di sini hanya
   perilakunya: membuka, menutup, dan menandai.

   Panel turunan pada layar lebar TIDAK ada di markup tangkapan, karena
   aplikasinya hanya memasangnya ketika menunya terbuka. Panel itu
   ditangkap terpisah dan disimpan pada HALAMAN.menuTurunan.
   ================================================================== */


/* ---------- menu bertingkat, layar lebar ----------
   Susunan MENU_BERTINGKAT berada di 01-keadaan.js, bukan di sini: berkas
   demo digabung menjadi satu, dan tandaiMenuAktif() sudah memerlukannya
   ketika rute() dipanggil pada akhir 07-konten.js. Bila tetapannya ditulis
   di berkas ini, rujukannya jatuh ke temporal dead zone, pengecualiannya
   menghentikan SISA berkas gabungan, dan seluruh pemasangan perilaku
   sesudahnya tidak pernah berjalan. */

function siapkanMenuBertingkat() {
  const tombol = [...situs.querySelectorAll("nav > div > ul > li > button[aria-expanded]")];
  if (tombol.length === 0) return;

  const tutupSemua = () => {
    tombol.forEach((b) => {
      b.setAttribute("aria-expanded", "false");
      const panah = b.querySelector("span[aria-hidden]");
      if (panah) panah.className = panah.className.replace(" rotate-180", "");
      const panel = b.parentElement.querySelector('div[id^="menu-"]');
      if (panel) panel.remove();
    });
  };

  tombol.forEach((b) => {
    const kelompok = MENU_BERTINGKAT.find((k) => b.textContent.trim().startsWith(k.label));
    if (!kelompok) return;
    const li = b.parentElement;

    const buka = () => {
      if (li.querySelector('div[id^="menu-"]')) return;
      tutupSemua();
      const isi = (HALAMAN.menuTurunan || {})[kelompok.jalur];
      if (!isi) return;
      li.insertAdjacentHTML("beforeend", isi);
      b.setAttribute("aria-expanded", "true");
      const panah = b.querySelector("span[aria-hidden]");
      if (panah && !panah.className.includes("rotate-180")) {
        panah.className += " rotate-180";
      }
    };

    li.addEventListener("mouseenter", buka);
    li.addEventListener("mouseleave", tutupSemua);
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (li.querySelector('div[id^="menu-"]')) tutupSemua();
      else buka();
    });
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") tutupSemua();
  });
  document.addEventListener("mousedown", (ev) => {
    if (!ev.target.closest("nav > div > ul > li")) tutupSemua();
  });

  // Dipanggil perutean setiap perpindahan halaman, supaya panelnya tidak
  // menggantung di atas halaman baru seperti pada aplikasinya.
  window.tutupMenuBertingkat = tutupSemua;
}

/* ---------- menu layar kecil ---------- */

/** Membuka atau menutup wadah yang tingginya dianimasikan grid-template-rows. */
function setelLipatan(el, terbuka) {
  el.className = el.className
    .replace("grid-rows-[1fr]", "").replace("grid-rows-[0fr]", "")
    .replace("opacity-100", "").replace("opacity-0", "")
    .replace(/\s+/g, " ").trim() +
    (terbuka ? " grid-rows-[1fr] opacity-100" : " grid-rows-[0fr] opacity-0");
  if (terbuka) el.removeAttribute("inert");
  else el.setAttribute("inert", "");
}

function siapkanMenuRingkas() {
  const tombol = situs.querySelector('header button[aria-controls="menu-ringkas"]');
  const wadah = situs.querySelector("#menu-ringkas");
  if (!tombol || !wadah) return;

  const lipatan = [...wadah.querySelectorAll("button[aria-expanded]")];

  const tutupLipatan = () => lipatan.forEach((b) => {
    b.setAttribute("aria-expanded", "false");
    const panah = b.querySelector("span[aria-hidden]");
    if (panah) panah.className = panah.className.replace(" rotate-180", "");
    const daftar = b.closest("li").querySelector("ul");
    if (daftar) setelLipatan(daftar, false);
  });

  const tutup = () => {
    setelLipatan(wadah, false);
    tombol.setAttribute("aria-expanded", "false");
    tutupLipatan();
  };

  tombol.onclick = () => {
    const terbuka = wadah.getAttribute("inert") === null;
    if (terbuka) tutup();
    else {
      setelLipatan(wadah, true);
      tombol.setAttribute("aria-expanded", "true");
    }
  };

  lipatan.forEach((b) => {
    b.onclick = () => {
      const daftar = b.closest("li").querySelector("ul");
      if (!daftar) return;
      const sudahTerbuka = daftar.getAttribute("inert") === null;
      tutupLipatan();
      if (!sudahTerbuka) {
        setelLipatan(daftar, true);
        b.setAttribute("aria-expanded", "true");
        const panah = b.querySelector("span[aria-hidden]");
        if (panah) panah.className += " rotate-180";
      }
    };
  });

  wadah.querySelectorAll("a").forEach((a) => a.addEventListener("click", tutup));
  window.tutupMenuRingkas = tutup;
  tutup();
}

function siapkanMenuPanel() {
  const tombol = panel.querySelector("header button[aria-label]");
  const sidebar = panel.querySelector("aside");
  if (!tombol || !sidebar) return;

  const salinan = document.createElement("div");
  salinan.hidden = true;
  salinan.className = "overflow-hidden bg-biru-tua xl:hidden lg:hidden";
  salinan.innerHTML = `<div class="px-3 py-4">${sidebar.querySelector("nav").outerHTML}</div>`;
  panel.querySelector("header").appendChild(salinan);

  tombol.onclick = () => {
    salinan.hidden = !salinan.hidden;
    tombol.setAttribute("aria-expanded", String(!salinan.hidden));
  };
  salinan.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => (salinan.hidden = true)));
}

siapkanMenuBertingkat();
siapkanMenuRingkas();
siapkanMenuPanel();

/* ---------- tombol bukti pendaftaran PDF ----------
   Pada aplikasi sebenarnya, bukti pendaftaran dirakit oleh backend Go dengan
   pustaka Maroto lalu dikirim sebagai berkas PDF. GitHub Pages tidak dapat
   menjalankan program di sisi server, jadi di demo tombolnya tetap ada supaya
   tampilannya sama, tetapi menjelaskan keadaannya ketika ditekan. */

const TOMBOL_BUKTI = [
  "Unduh Bukti Pendaftaran (PDF)",
  "Bukti Pendaftaran (PDF)",
  "Kartu Peserta Ujian (PDF)",
  "Kartu Peserta (PDF)",
];

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;

  // Unggah gambar pengaturan memerlukan penyimpanan di server, yang tidak
  // ada pada demo. Tombolnya tetap ditampilkan supaya bentuk halamannya sama.
  const kotakGambar = b.closest("div.rounded-lg");
  if (kotakGambar && kotakGambar.querySelector('input[id^="gambar-"]')) {
    const teksTombol = b.textContent.trim();
    if (teksTombol.startsWith("Unggah") || teksTombol === "Hapus") {
      ev.preventDefault();
      ev.stopPropagation();
      beriTahu(
        "Gambar sekolah diunggah ke server pada aplikasi sebenarnya, lalu " +
          "nama berkasnya dicatat pada pengaturan. Demo ini berjalan " +
          "sepenuhnya di peramban, jadi berkasnya tidak dapat disimpan di sini.",
        "galat",
      );
      return;
    }
  }

  const teks = b.textContent.trim();
  if (!TOMBOL_BUKTI.some((t) => teks.startsWith(t))) return;
  ev.preventDefault();
  ev.stopPropagation();
  const apa = teks.includes("Kartu") ? "Kartu peserta" : "Bukti pendaftaran";
  beriTahu(
    apa + " berbentuk PDF dibuat oleh server pada aplikasi sebenarnya, " +
      "lengkap dengan barcode dan kode QR. Demo ini berjalan sepenuhnya di " +
      "peramban, jadi berkasnya tidak dapat dibuat di sini.",
    "galat",
  );
}, true);

/* ==================================================================
   Tes seleksi pada demo

   Aplikasi sebenarnya menjalankan tes di server: batas waktunya disimpan
   sebagai waktu mutlak, susunan soalnya dibekukan, dan kunci jawabannya
   tidak pernah sampai ke peramban. Demo ini tidak punya server, jadi
   ketiganya dikerjakan di peramban pengunjung dengan localStorage.

   Konsekuensinya jujur disebut di halaman: pada demo, kunci jawaban memang
   ada di peramban, dan waktunya dapat dimanipulasi siapa pun yang membuka
   alat pengembang. Pada aplikasi sebenarnya keduanya tidak mungkin.

   Yang tetap sama persis dengan aplikasinya: tampilannya, aturan siapa yang
   boleh ikut, cara jawaban tersimpan satu per satu, penghitung mundur,
   penilaiannya, dan bagaimana nilainya muncul di halaman Cek Status.
   ================================================================== */

let jamUjian = null;

function paketDemo() {
  return (K.paketUjian || []).find((p) => p.aktif) || null;
}

function ujianDibuka() {
  return K.pengaturan.ujian_aktif === "1" && paketDemo() !== null;
}

/** Sesi ujian milik seorang pendaftar, disimpan bersama data demo lainnya. */
function sesiUjian(pendaftarId) {
  return (K.sesiUjian || []).find((s) => s.pendaftar_id === pendaftarId) || null;
}

function bukaUjian() {
  situs.hidden = false;
  panel.hidden = true;
  wadahMasuk.hidden = true;
  tandaiMenuAktif("/ppdb");

  const paket = paketDemo();
  isiPublik.innerHTML = HALAMAN.ujian;
  pasangPenunjukAlur("tes");

  if (!ujianDibuka()) {
    // Tangkapan halamannya sudah memuat keadaan "belum dibuka", jadi tidak
    // ada yang perlu dirakit ulang.
    return;
  }
  siapkanMasukUjian(paket);
}

function siapkanMasukUjian(paket) {
  const form = isiPublik.querySelector("form");
  if (!form) return;

  form.onsubmit = (ev) => {
    ev.preventDefault();
    const no = (isiPublik.querySelector("#no_registrasi")?.value || "").trim();
    const tgl = (isiPublik.querySelector("#tanggal_lahir")?.value || "").trim();

    isiPublik.querySelectorAll("[data-galat-demo]").forEach((el) => el.remove());
    const galat = [];
    if (!no) galat.push("Nomor registrasi wajib diisi.");
    if (!tgl) galat.push("Tanggal lahir wajib diisi.");

    const p = K.pendaftar.find(
      (x) => x.no_registrasi.toUpperCase() === no.toUpperCase() && x.tanggal_lahir === tgl,
    );
    if (!galat.length && !p) {
      galat.push("Data tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir.");
    }
    if (!galat.length && p.status === "Menunggu Verifikasi") {
      galat.push("Berkas Anda masih menunggu verifikasi panitia, jadi tes seleksi belum dapat dimulai.");
    }
    if (!galat.length && p.status === "Ditolak") {
      galat.push("Pendaftaran Anda tidak dapat dilanjutkan ke tes seleksi. Silakan hubungi panitia.");
    }
    if (galat.length) {
      const d = document.createElement("div");
      d.dataset.galatDemo = "1";
      d.innerHTML = ringkasanGalat(galat);
      form.prepend(d);
      return;
    }

    const lama = sesiUjian(p.id);
    if (lama && lama.status !== "Berjalan") {
      tampilkanHasilUjian(lama, paket);
      return;
    }
    mulaiUjianDemo(p, paket);
  };
}

function mulaiUjianDemo(p, paket) {
  let sesi = sesiUjian(p.id);
  if (!sesi) {
    const aktif = K.soal.filter((s) => s.aktif);
    const acak = paket.acak_soal ? aktif.slice().sort(() => Math.random() - 0.5) : aktif;
    sesi = {
      id: (K.sesiUjian || []).length + 1,
      pendaftar_id: p.id,
      no_registrasi: p.no_registrasi,
      nama: p.nama_lengkap,
      batas_pada: Date.now() + paket.durasi_menit * 60000,
      soal: acak.slice(0, paket.jumlah_soal).map((s) => ({ soal_id: s.id, jawaban: "" })),
      status: "Berjalan",
      jumlah_benar: 0,
      skor: 0,
    };
    K.sesiUjian = (K.sesiUjian || []).concat(sesi);
    simpan();
  }
  kerjakanUjian(sesi, paket);
}

function kerjakanUjian(sesi, paket) {
  isiPublik.innerHTML = HALAMAN.ujianKerjakan;
  let nomor = 0;

  const elWaktu = isiPublik.querySelector("[class*='text-2xl'][class*='tabular-nums']");
  const wadahNomor = isiPublik.querySelectorAll(".kartu")[1];

  function jamMundur(ms) {
    const d = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(d / 60);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
  }

  function perbaruiWaktu() {
    const sisa = sesi.batas_pada - Date.now();
    if (elWaktu) {
      elWaktu.textContent = jamMundur(sisa);
      elWaktu.classList.toggle("text-red-600", sisa <= 300000);
      elWaktu.classList.toggle("text-biru-tua", sisa > 300000);
    }
    if (sisa <= 0) {
      clearInterval(jamUjian);
      selesaikanUjianDemo(sesi, paket, "Kedaluwarsa");
    }
  }

  clearInterval(jamUjian);
  jamUjian = setInterval(perbaruiWaktu, 1000);

  function gambar() {
    const terjawab = sesi.soal.filter((s) => s.jawaban).length;

    // Kepala: nama peserta dan kemajuan.
    const kepala = isiPublik.querySelector(".sticky");
    if (kepala) {
      const teks = kepala.querySelectorAll("p");
      if (teks[0]) teks[0].textContent = paket.nama;
      if (teks[1]) teks[1].textContent = `${sesi.nama} · ${sesi.no_registrasi}`;
      const bilah = kepala.querySelector("[class*='bg-biru'][class*='rounded-full']");
      if (bilah) bilah.style.width = `${(terjawab / sesi.soal.length) * 100}%`;
      const hitung = kepala.querySelector("p[class*='text-xs'][class*='tabular-nums']");
      if (hitung) hitung.textContent = `${terjawab}/${sesi.soal.length} terjawab`;
    }

    // Petak nomor soal.
    if (wadahNomor) {
      wadahNomor.innerHTML = `<div class="flex flex-wrap gap-2">${sesi.soal
        .map((s, i) => {
          const gaya =
            i === nomor
              ? "bg-biru-tua text-white"
              : s.jawaban
                ? "bg-biru-muda text-biru"
                : "border border-garis text-samar hover:border-biru hover:text-biru";
          return `<button type="button" data-nomor="${i}" class="h-9 w-9 rounded-lg text-sm font-semibold transition ${gaya}">${i + 1}</button>`;
        })
        .join("")}</div>`;
      wadahNomor.querySelectorAll("[data-nomor]").forEach((b) =>
        b.addEventListener("click", () => {
          nomor = Number(b.dataset.nomor);
          gambar();
        }),
      );
    }

    // Kartu soal.
    const kartuSoal = isiPublik.querySelectorAll(".kartu")[2];
    if (!kartuSoal) return;
    const isiSesi = sesi.soal[nomor];
    const soal = K.soal.find((s) => s.id === isiSesi.soal_id);
    const pilihan = [
      ["A", soal.pilihan_a],
      ["B", soal.pilihan_b],
      ["C", soal.pilihan_c],
      ["D", soal.pilihan_d],
      ["E", soal.pilihan_e],
    ].filter(([, t]) => t);

    kartuSoal.innerHTML = `
      <div class="border-b border-garis bg-biru-muda px-6 py-3">
        <p class="text-xs font-semibold tracking-wide text-samar uppercase">
          Soal ${nomor + 1} dari ${sesi.soal.length} · ${e(soal.mata_pelajaran)}
        </p>
      </div>
      <div class="space-y-5 px-6 py-6">
        <p class="text-[15px] leading-relaxed whitespace-pre-line text-teks">${e(soal.pertanyaan)}</p>
        <fieldset class="space-y-2.5">
          <legend class="sr-only">Pilihan jawaban</legend>
          ${pilihan
            .map(
              ([huruf, teks]) => `
            <label class="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-[15px] transition ${
              isiSesi.jawaban === huruf
                ? "border-biru bg-biru-muda text-biru-tua"
                : "border-garis hover:border-biru hover:bg-biru-muda/40"
            }">
              <input type="radio" name="soal-${soal.id}" value="${huruf}" ${
                isiSesi.jawaban === huruf ? "checked" : ""
              } class="mt-1">
              <span><strong class="mr-1.5">${huruf}.</strong>${e(teks)}</span>
            </label>`,
            )
            .join("")}
        </fieldset>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-garis px-6 py-4">
        <button type="button" data-nav="sebelum" ${nomor === 0 ? "disabled" : ""}
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-garis bg-white px-4 py-2.5 text-sm font-semibold text-teks transition hover:bg-biru-muda hover:text-biru disabled:cursor-not-allowed disabled:opacity-60">← Sebelumnya</button>
        <button type="button" data-nav="maju"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-biru px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-biru-tua">${
            nomor < sesi.soal.length - 1 ? "Selanjutnya →" : "Selesaikan Ujian"
          }</button>
      </div>`;

    kartuSoal.querySelectorAll("input[type=radio]").forEach((r) =>
      r.addEventListener("change", () => {
        isiSesi.jawaban = r.value;
        simpan();
        gambar();
      }),
    );
    kartuSoal.querySelector("[data-nav=sebelum]").addEventListener("click", () => {
      if (nomor > 0) { nomor--; gambar(); }
    });
    kartuSoal.querySelector("[data-nav=maju]").addEventListener("click", () => {
      if (nomor < sesi.soal.length - 1) { nomor++; gambar(); return; }
      const belum = sesi.soal.length - sesi.soal.filter((s) => s.jawaban).length;
      const pesan = belum > 0
        ? `Masih ada ${belum} soal yang belum dijawab. Selesaikan ujian sekarang?`
        : "Selesaikan ujian sekarang? Jawaban tidak dapat diubah lagi.";
      if (confirm(pesan)) selesaikanUjianDemo(sesi, paket, "Selesai");
    });
  }

  perbaruiWaktu();
  gambar();
}

function selesaikanUjianDemo(sesi, paket, statusAkhir) {
  clearInterval(jamUjian);
  let benar = 0;
  for (const s of sesi.soal) {
    const soal = K.soal.find((x) => x.id === s.soal_id);
    if (soal && s.jawaban && s.jawaban === soal.jawaban) benar++;
  }
  sesi.jumlah_benar = benar;
  sesi.skor = Math.round((benar / sesi.soal.length) * 100);
  sesi.status = statusAkhir;
  simpan();
  tampilkanHasilUjian(sesi, paket);
}

function tampilkanHasilUjian(sesi, paket) {
  const lulus = sesi.status === "Selesai" && sesi.skor >= paket.nilai_minimum;
  isiPublik.innerHTML = `
    <div class="wadah max-w-3xl py-12">
      <div class="kartu overflow-hidden">
        <div class="border-b border-garis bg-biru-muda px-6 py-5">
          <p class="text-xs font-semibold tracking-wide text-samar uppercase">Hasil tes seleksi</p>
          <p class="mt-0.5 text-lg font-bold text-biru-tua">${e(paket.nama)}</p>
        </div>
        <div class="space-y-5 px-6 py-6">
          <div class="flex flex-wrap items-end gap-6">
            <div><p class="text-xs text-samar">Nilai</p>
              <p class="text-4xl font-bold text-biru-tua tabular-nums">${sesi.skor}</p></div>
            <div><p class="text-xs text-samar">Jawaban benar</p>
              <p class="text-xl font-semibold text-teks tabular-nums">${sesi.jumlah_benar} dari ${sesi.soal.length}</p></div>
            <div><p class="text-xs text-samar">Nilai minimum</p>
              <p class="text-xl font-semibold text-teks tabular-nums">${paket.nilai_minimum}</p></div>
          </div>
          <p class="rounded-lg px-5 py-4 text-sm leading-relaxed ${
            lulus ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
          }">
            ${sesi.status === "Kedaluwarsa" ? "Waktu pengerjaan habis, dan jawaban yang sudah terisi tetap dinilai. " : ""}
            ${
              lulus
                ? "Nilai Anda memenuhi batas minimum tes seleksi. Hasil akhir penerimaan tetap diumumkan panitia, karena nilai tes bukan satu-satunya pertimbangan."
                : "Nilai Anda belum memenuhi batas minimum. Keputusan penerimaan tetap di tangan panitia, dan akan diumumkan lewat halaman Cek Status."
            }
          </p>
          <p class="text-xs leading-relaxed text-samar">
            Nilai ini juga dapat dilihat kapan saja di halaman Cek Status memakai
            nomor registrasi dan tanggal lahir Anda.
          </p>
        </div>
      </div>
    </div>`;
}

/* ==================================================================
   Tombol bantuan melayang, penunjuk alur, dan tanya jawab pada demo

   Markupnya seluruhnya berasal dari tangkapan aplikasi, jadi tampilannya
   sama persis. Yang ditulis di sini hanya perilakunya: membuka dan menutup
   panel, menandai posisi pengunjung pada alur, serta menyaring tanya jawab.
   ================================================================== */

/* ---------- tombol bantuan melayang ---------- */

/** Mencocokkan jalur demo dengan langkah pada alur, sama seperti aplikasi. */
function langkahAlurDari(jalur) {
  if (jalur.startsWith("/ppdb/daftar")) return 2;
  if (jalur.startsWith("/ppdb/ujian")) return 4;
  if (jalur.startsWith("/ppdb/cek")) return 3;
  if (jalur.startsWith("/ppdb")) return 1;
  if (jalur === "/profil" || jalur.startsWith("/fasilitas")) return 0;
  return -1;
}

// var, bukan let: berkas ini digabung paling akhir, sedangkan rute() pada
// 02-rute.js sudah memanggil pasangBantuan() saat halaman pertama dimuat.
// Dengan let, peubahnya masih berada di temporal dead zone pada saat itu.
var bantuanTerbuka = false;

function pasangBantuan() {
  const wadah = document.getElementById("bantuan-melayang");
  if (!wadah) return;
  wadah.innerHTML = bantuanTerbuka ? HALAMAN.bantuanBuka : HALAMAN.bantuanTutup;

  if (bantuanTerbuka) {
    // Penanda "Anda di sini" dan "Langkah berikutnya" dipasang ulang menurut
    // halaman yang sedang dibuka, karena tangkapannya hanya memuat keadaan
    // satu halaman saja.
    perbaruiPenandaBantuan(wadah);
  }

  const tombol = wadah.querySelector("button");
  if (tombol) {
    tombol.addEventListener("click", () => {
      bantuanTerbuka = !bantuanTerbuka;
      pasangBantuan();
    });
  }
  wadah.querySelectorAll("a[href^='/']").forEach((a) =>
    a.addEventListener("click", () => {
      bantuanTerbuka = false;
    }),
  );
}

function perbaruiPenandaBantuan(wadah) {
  const butir = [...wadah.querySelectorAll("ol li")];
  if (!butir.length) return;
  const kini = langkahAlurDari(jalurSekarang());
  const dibuka = K.pengaturan.ppdb_status === "buka";
  const berikut = !dibuka && kini < 1 ? 1 : Math.min(kini + 1, butir.length - 1);

  butir.forEach((li, i) => {
    const tautan = li.querySelector("a");
    const nomor = li.querySelector("a > span:first-child");
    // Penanda dari tangkapan dibuang lebih dulu.
    li.querySelectorAll("[data-penanda]").forEach((el) => el.remove());
    li.querySelectorAll("span").forEach((el) => {
      const t = el.textContent.trim();
      if (t === "Anda di sini" || t === "Langkah berikutnya") el.remove();
    });

    const sekarang = i === kini;
    const disarankan = i === berikut && !sekarang;

    if (tautan) {
      tautan.className =
        "flex gap-3 px-5 py-3.5 transition " +
        (disarankan ? "bg-emas/15 hover:bg-emas/25" : "hover:bg-biru-muda/50");
    }
    if (nomor) {
      nomor.className =
        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums " +
        (sekarang
          ? "bg-biru-tua text-white"
          : disarankan
            ? "bg-emas text-biru-tua"
            : "bg-biru-muda text-biru");
    }
    if (sekarang || disarankan) {
      const baris = li.querySelector("a > span:last-child > span:first-child");
      if (baris) {
        const tanda = document.createElement("span");
        tanda.dataset.penanda = "1";
        tanda.className = sekarang
          ? "rounded bg-biru-muda px-1.5 py-0.5 text-[11px] font-semibold text-biru"
          : "rounded bg-emas px-1.5 py-0.5 text-[11px] font-bold text-biru-tua";
        tanda.textContent = sekarang ? "Anda di sini" : "Langkah berikutnya";
        baris.appendChild(tanda);
      }
    }
  });
}

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && bantuanTerbuka) {
    bantuanTerbuka = false;
    pasangBantuan();
  }
});

/* ---------- penunjuk alur ---------- */

/** Menempelkan bilah penunjuk alur di atas isi halaman PPDB. */
function pasangPenunjukAlur(tahap) {
  const isi = HALAMAN[`alur_${tahap}`];
  if (!isi) return;
  // Satu halaman kadang digambar ulang, misalnya sesudah data berubah.
  // Tanpa pemeriksaan ini, bilahnya menumpuk setiap penggambaran.
  if (isiPublik.querySelector('[aria-label="Alur pendaftaran"]')) return;
  const el = document.createElement("div");
  el.innerHTML = isi;
  const bilah = el.firstElementChild;
  if (!bilah) return;
  // Tautannya dijadikan tautan demo, dan tahap aktif tidak diklik.
  bilah.querySelectorAll("a[href^='/']").forEach((a) => {
    const tujuan = a.getAttribute("href");
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      pergi(tujuan);
    });
  });
  isiPublik.prepend(bilah);
}

/* ---------- tanya jawab ---------- */

function bukaFaq() {
  situs.hidden = false;
  panel.hidden = true;
  wadahMasuk.hidden = true;
  isiPanel.innerHTML = "";
  tandaiMenuAktif("/faq");
  isiPublik.innerHTML = HALAMAN.faq;
  siapkanFaq();
}

function siapkanFaq() {
  const kotakCari = isiPublik.querySelector("#cari-faq");
  const tombolKategori = [...isiPublik.querySelectorAll("button")].filter((b) =>
    ["Semua", ...(K.kategoriFaq || [])].includes(b.textContent.trim()),
  );
  let kategori = "";
  let cari = "";

  function gambar() {
    const kata = cari.trim().toLowerCase();
    const cocok = (K.faq || []).filter((f) => {
      if (!f.aktif) return false;
      if (kategori && f.kategori !== kategori) return false;
      if (!kata) return true;
      return (
        f.pertanyaan.toLowerCase().includes(kata) ||
        f.jawaban.toLowerCase().includes(kata)
      );
    });

    const butir = (f, sorot) => `
      <details class="kartu group overflow-hidden ${sorot ? "border-emas/50" : ""}">
        <summary class="flex cursor-pointer list-none items-start gap-3 px-5 py-4 transition hover:bg-biru-muda/40">
          <span aria-hidden="true" class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-biru-muda text-sm font-bold text-biru transition group-open:rotate-45">+</span>
          <span class="min-w-0 flex-1">
            <span class="block text-[15px] font-semibold text-teks">${e(f.pertanyaan)}</span>
            <span class="mt-1 block text-xs text-samar">${e(f.kategori)}</span>
          </span>
        </summary>
        <div class="border-t border-garis px-5 py-4 pl-14">
          <p class="text-[15px] leading-relaxed whitespace-pre-line text-teks">${e(f.jawaban)}</p>
        </div>
      </details>`;

    const disorot = cocok.filter((f) => f.sorot);
    const lainnya = cocok.filter((f) => !f.sorot);

    const wadah = isiPublik.querySelector("[data-daftar-faq]");
    if (!wadah) return;

    if (!cocok.length) {
      wadah.innerHTML = `
        <div class="kartu p-8 text-center">
          <p class="font-semibold text-teks">Tidak ada pertanyaan yang cocok</p>
          <p class="mt-1.5 text-sm leading-relaxed text-samar">
            Coba kata lain, atau tanyakan langsung lewat tombol WhatsApp di pojok kanan bawah.
          </p>
        </div>`;
      return;
    }

    wadah.innerHTML = `
      ${
        disorot.length
          ? `<section>
               <h2 class="mb-3 flex items-center gap-2 text-base">
                 <span class="rounded bg-emas px-2 py-0.5 text-xs font-bold text-biru-tua">Sering ditanyakan</span>
               </h2>
               <div class="space-y-3">${disorot.map((f) => butir(f, true)).join("")}</div>
             </section>`
          : ""
      }
      ${
        lainnya.length
          ? `<section class="${disorot.length ? "mt-8" : ""}">
               ${disorot.length ? '<h2 class="mb-3 text-base text-samar">Pertanyaan lainnya</h2>' : ""}
               <div class="space-y-3">${lainnya.map((f) => butir(f, false)).join("")}</div>
             </section>`
          : ""
      }`;
  }

  // Wadah daftar ditandai sekali, supaya penggambaran ulang tidak menimpa
  // kotak pencarian dan tombol kategorinya.
  const kartuPertama = isiPublik.querySelector(".kartu");
  if (kartuPertama && !isiPublik.querySelector("[data-daftar-faq]")) {
    const wadah = document.createElement("div");
    wadah.dataset.daftarFaq = "1";
    kartuPertama.after(wadah);
    // Daftar dari tangkapan dibuang; yang dipakai hasil penggambaran ulang.
    [...isiPublik.querySelectorAll("section")]
      .filter((s) => s.querySelector("details"))
      .forEach((s) => s.remove());
  }

  if (kotakCari) {
    kotakCari.addEventListener("input", () => {
      cari = kotakCari.value;
      gambar();
    });
  }
  tombolKategori.forEach((b) =>
    b.addEventListener("click", () => {
      const t = b.textContent.trim();
      kategori = t === "Semua" ? "" : t;
      tombolKategori.forEach((x) => {
        const aktif = x === b;
        x.className = aktif
          ? "rounded-lg px-3.5 py-2 text-sm font-semibold transition bg-biru text-white"
          : "rounded-lg px-3.5 py-2 text-sm font-semibold transition border border-garis text-teks hover:border-biru hover:text-biru";
        x.setAttribute("aria-pressed", String(aktif));
      });
      gambar();
    }),
  );

  gambar();
}

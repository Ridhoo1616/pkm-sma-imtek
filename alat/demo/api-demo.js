/* ==================================================================
   Tiruan backend untuk demo GitHub Pages
   ------------------------------------------------------------------
   Halaman demo adalah HTML yang benar-benar dirender aplikasinya (lihat
   tangkap.mjs). Yang tidak ada di GitHub Pages hanya backend Go dan
   PostgreSQL, jadi berkas ini menjawab setiap panggilan /api/* di dalam
   peramban: fetch dan XMLHttpRequest ditangkap, lalu dijawab dari data yang
   disimpan di localStorage pengunjung masing-masing.

   Keadaan awalnya adalah rekaman backend demo (demo/data.json). Bentuk
   setiap jawaban mengikuti backend yang sebenarnya, sebab komponen React
   aplikasinya dipakai apa adanya.

   Dimuat sebagai skrip biasa di awal <head>, sebelum skrip aplikasi.
   ================================================================== */
(() => {
  "use strict";
  const DASAR = globalThis.__DASAR_DEMO || "";
  const KUNCI = "demo_pkm_v9";
  const KUNCI_GAMBAR = "demo_pkm_v9_gambar";

  // GitHub Pages menyajikan /admin/masuk sebagai /admin/masuk/ (folder berisi
  // index.html). Aplikasinya dirender untuk jalur tanpa garis miring akhir,
  // dan panel admin membandingkan jalurnya persis ("/admin/masuk"); tanpa
  // penyesuaian ini panel terus mengalihkan ke halaman masuk. Garis miringnya
  // dibuang sebelum skrip aplikasi berjalan.
  if (location.pathname.length > DASAR.length + 1 && location.pathname.endsWith("/")) {
    history.replaceState(history.state, "", location.pathname.replace(/\/+$/, "") + location.search + location.hash);
  }

  /* ---------- keadaan ---------- */

  let D = null; // rekaman, hanya dibaca
  let S = null; // keadaan yang dapat diubah pengunjung
  let gambarDemo = {};

  const salin = (x) => JSON.parse(JSON.stringify(x));

  function keadaanAwal() {
    const a = D.admin;
    const koleksi = {
      jurusan: a["/api/admin/jurusan"].data,
      berita: a["/api/admin/berita"].data,
      galeri: D.publik["/api/galeri"].data,
      fasilitas: D.publik["/api/fasilitas"].data,
      halaman: a["/api/admin/halaman"].data,
      "tenaga-pendidik": a["/api/admin/tenaga-pendidik"].data,
      agenda: a["/api/admin/agenda"].data,
      "kegiatan-siswa": a["/api/admin/kegiatan-siswa"].data,
      pustaka: a["/api/admin/pustaka"].data,
      biaya: a["/api/admin/biaya"].data,
      faq: a["/api/admin/faq"].data,
      pengguna: a["/api/admin/pengguna"].data.map((u) => ({
        ...u,
        sandi: u.username === "admin" ? "admin123" : u.username === "panitia" ? "panitia123" : "",
      })),
      pesan: a["/api/admin/pesan"].data,
      notifikasi: a["/api/admin/notifikasi"].data,
      "tanya-buntu": a["/api/admin/tanya-buntu"].data,
      sekolah: a["/api/admin/sekolah"].data,
      "bkk-mitra": (a["/api/admin/bkk/mitra"] || { data: [] }).data,
      "bkk-lowongan": (a["/api/admin/bkk/lowongan"] || { data: [] }).data,
      "bkk-lamaran": (a["/api/admin/bkk/lamaran"] || { data: [] }).data,
    };
    const pendaftar = {};
    for (const [id, r] of Object.entries(D.detail.pendaftar)) pendaftar[id] = r.data;
    return {
      koleksi: salin(koleksi),
      pendaftar: salin(pendaftar),
      pengaturan: salin(a["/api/admin/pengaturan"].data),
      diubah: {}, // id pendaftar yang berkas PDF rekamannya tidak lagi sesuai
    };
  }

  function simpan() {
    try {
      localStorage.setItem(KUNCI, JSON.stringify(S));
    } catch {
      /* penyimpanan penuh atau diblokir: demo tetap berjalan tanpa diingat */
    }
  }
  function simpanGambar() {
    try {
      localStorage.setItem(KUNCI_GAMBAR, JSON.stringify(gambarDemo));
    } catch {
      /* diabaikan */
    }
  }

  const siap = fetch(`${DASAR}/demo/data.json`)
    .then((j) => j.json())
    .then((data) => {
      D = data;
      try {
        const tersimpan = JSON.parse(localStorage.getItem(KUNCI) || "null");
        if (tersimpan && tersimpan.koleksi) S = tersimpan;
        gambarDemo = JSON.parse(localStorage.getItem(KUNCI_GAMBAR) || "{}");
      } catch {
        /* diabaikan */
      }
      if (!S) S = keadaanAwal();
    });

  /* ---------- alat bantu ---------- */

  const kol = (n) => S.koleksi[n];
  const atur = (k) => (S.pengaturan.find((b) => b.nama_setting === k) || {}).nilai || "";
  const sekarang = () => new Date().toISOString();
  const hariIni = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  };
  // Bentuk "2026-09-29 20:08" dalam waktu setempat, seperti jawaban backend.
  const waktuSetempat = (iso) => {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return String(iso);
    const d = (n) => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${d(t.getMonth() + 1)}-${d(t.getDate())} ${d(t.getHours())}:${d(t.getMinutes())}`;
  };
  const idBaru = (daftar) => Math.max(0, ...daftar.map((x) => Number(x.id) || 0)) + 1;

  class Galat extends Error {
    constructor(status, isi) {
      super(isi.pesan);
      this.status = status;
      this.isi = isi;
    }
  }
  const galat = (status, pesan, kolom) => {
    const isi = { pesan };
    if (kolom) {
      isi.kolom = kolom;
      isi.daftar = Object.values(kolom);
    }
    throw new Galat(status, isi);
  };
  const tidakAda = (apa = "Data") => galat(404, `${apa} tidak ditemukan.`);

  function halamanan(daftar, q, bawaan) {
    const per = Math.max(1, Math.min(200, Number(q.get("per_halaman")) || bawaan));
    const halaman = Math.max(1, Number(q.get("halaman")) || 1);
    return {
      data: daftar.slice((halaman - 1) * per, halaman * per),
      total: daftar.length,
      halaman,
      per_halaman: per,
    };
  }

  function cocokCari(butir, cari, medan) {
    if (!cari) return true;
    const c = cari.toLowerCase();
    return medan.some((m) => String(butir[m] ?? "").toLowerCase().includes(c));
  }

  // Nilai dari formulir berupa teks; tipe aslinya diambil dari butir lain di
  // koleksi yang sama, atau ditebak dari namanya bila koleksinya kosong.
  function ubahTipe(nilai, contoh, nama) {
    if (typeof contoh === "number" || /^(id|urutan|kuota|jumlah|jurusan_id|tahun)$/.test(nama)) {
      const n = Number(nilai);
      return nilai === "" || Number.isNaN(n) ? nilai : n;
    }
    if (typeof contoh === "boolean" || /^(aktif|publish|sorot|wajib|dibaca)$/.test(nama)) {
      return nilai === true || nilai === "true" || nilai === "1" || nilai === "on";
    }
    return nilai;
  }

  function slugDari(teks) {
    return (
      String(teks)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "tanpa-judul"
    );
  }

  /* ---------- gambar unggahan ---------- */

  // Gambar yang diunggah pengunjung diperkecil lalu disimpan sebagai data URL.
  // Komponen aplikasinya tetap menulis /unggahan/<folder>/<nama>; alamat itu
  // ditukar dengan data URL-nya oleh pengamat di bagian bawah berkas ini.
  async function simpanBerkas(berkas, folder) {
    if (!(berkas instanceof File) || berkas.size === 0) return "";
    const ext = (berkas.name.split(".").pop() || "bin").toLowerCase();
    const nama = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${berkas.type.startsWith("image/") ? "jpg" : ext}`;
    if (berkas.type.startsWith("image/")) {
      try {
        gambarDemo[`${folder}/${nama}`] = await perkecil(berkas);
        simpanGambar();
      } catch {
        /* gambar tidak dapat dibaca: namanya tetap tercatat */
      }
    }
    return nama;
  }

  function perkecil(berkas) {
    return new Promise((selesai, gagal) => {
      const url = URL.createObjectURL(berkas);
      const img = new Image();
      img.onload = () => {
        const skala = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * skala);
        c.height = Math.round(img.height * skala);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        selesai(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = gagal;
      img.src = url;
    });
  }

  /* ---------- PDF ---------- */

  // PDF data awal dibuat server Go (Maroto) dan ikut direkam. Untuk data yang
  // dibuat atau diubah pengunjung demo, PDF sederhana disusun di sini.
  function buatPdf(baris) {
    const aman = (t) =>
      String(t)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\x20-\x7e]/g, "?")
        .replace(/([\\()])/g, "\\$1");
    const potong = (t, lebar) => {
      const hasil = [];
      for (const para of String(t).split("\n")) {
        let b = "";
        for (const kata of para.split(" ")) {
          if ((b + " " + kata).trim().length > lebar) {
            hasil.push(b);
            b = kata;
          } else b = (b + " " + kata).trim();
        }
        hasil.push(b);
      }
      return hasil;
    };
    const halaman = [[]];
    let y = 800;
    for (const [teks, gaya = {}] of baris) {
      const ukuran = gaya.ukuran || 11;
      for (const t of potong(teks, Math.floor(1000 / ukuran))) {
        if (y < 60) {
          halaman.push([]);
          y = 800;
        }
        const x = gaya.tengah ? Math.max(50, 297 - t.length * ukuran * 0.26) : 60;
        halaman[halaman.length - 1].push(`BT /${gaya.tebal ? "F2" : "F1"} ${ukuran} Tf ${x.toFixed(0)} ${y} Td (${aman(t)}) Tj ET`);
        y -= ukuran * 1.45;
      }
      if (gaya.garis) {
        halaman[halaman.length - 1].push(`60 ${y + 6} m 535 ${y + 6} l S`);
        y -= 8;
      }
      y -= gaya.jarak || 0;
    }
    const obj = [];
    const tambah = (s) => obj.push(s) && obj.length;
    const katalog = tambah("");
    const induk = tambah("");
    const f1 = tambah("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const f2 = tambah("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const anak = [];
    for (const h of halaman) {
      const isi = h.join("\n");
      const s = tambah(`<< /Length ${isi.length} >>\nstream\n${isi}\nendstream`);
      anak.push(tambah(`<< /Type /Page /Parent ${induk} 0 R /MediaBox [0 0 595 842] /Contents ${s} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> >>`));
    }
    obj[katalog - 1] = `<< /Type /Catalog /Pages ${induk} 0 R >>`;
    obj[induk - 1] = `<< /Type /Pages /Kids [${anak.map((a) => `${a} 0 R`).join(" ")}] /Count ${anak.length} >>`;
    let keluar = "%PDF-1.4\n";
    const letak = [];
    obj.forEach((o, i) => {
      letak.push(keluar.length);
      keluar += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = keluar.length;
    keluar += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n`;
    for (const l of letak) keluar += `${String(l).padStart(10, "0")} 00000 n \n`;
    keluar += `trailer\n<< /Size ${obj.length + 1} /Root ${katalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([keluar], { type: "application/pdf" });
  }

  function kop() {
    return [
      [atur("nama_sekolah") || "SMA IMTEK", { ukuran: 15, tebal: true, tengah: true }],
      [atur("alamat"), { ukuran: 9, tengah: true }],
      [[atur("telepon"), atur("email")].filter(Boolean).join("  |  "), { ukuran: 9, tengah: true, garis: true, jarak: 10 }],
    ];
  }
  const catatanDemo = [
    "Dokumen ini disusun peramban untuk demo. Pada aplikasi sebenarnya PDF dibuat server lengkap dengan kop, logo, dan kode QR.",
    { ukuran: 8, jarak: 0 },
  ];

  function pdfPendaftar(p) {
    const judul = "BUKTI PENDAFTARAN PESERTA DIDIK BARU";
    return buatPdf([
      ...kop(),
      [judul, { ukuran: 13, tebal: true, tengah: true }],
      [`Tahun Ajaran ${p.tahun_ajaran}`, { tengah: true, jarak: 14 }],
      [`Nomor Registrasi : ${p.no_registrasi}`, { tebal: true }],
      [`Nama Lengkap     : ${p.nama_lengkap}`],
      [`NISN             : ${p.nisn}`],
      [`Tanggal Lahir    : ${p.tempat_lahir || ""}, ${p.tanggal_lahir}`],
      [`Jalur            : ${p.jalur}`],
      [`Peminatan        : ${p.nama_jurusan}`],
      [`Asal Sekolah     : ${p.asal_sekolah}`],
      [`Status           : ${p.status}`],
      ["", { jarak: 20 }],
      catatanDemo,
    ]);
  }

  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function tanggalPanjang(iso) {
    const [t, b, h] = String(iso).slice(0, 10).split("-").map(Number);
    return `${h} ${BULAN[b - 1]} ${t}`;
  }

  async function pdfRekaman(nama) {
    const j = await asli(`${DASAR}/demo/pdf/${nama}`);
    if (!j.ok) return null;
    return j.blob();
  }

  /* ---------- sesi masuk ---------- */

  function pengguna(kepala, wajibAdmin) {
    const token = (kepala.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const m = /^demo\.(\d+)$/.exec(token);
    const u = m && kol("pengguna").find((x) => x.id === Number(m[1]));
    if (!u) galat(401, "Sesi Anda sudah berakhir. Silakan masuk kembali.");
    if (wajibAdmin && u.role !== "admin") galat(403, "Hanya admin yang dapat melakukan tindakan ini.");
    return u;
  }
  const tanpaSandi = ({ sandi, ...u }) => u;

  /* ---------- pendaftar ---------- */

  const semuaPendaftar = () => Object.values(S.pendaftar).sort((a, b) => b.id - a.id);

  function cariPendaftar(no, tgl) {
    const p = semuaPendaftar().find(
      (x) => x.no_registrasi.toUpperCase() === String(no || "").trim().toUpperCase() && String(x.tanggal_lahir).slice(0, 10) === tgl,
    );
    if (!p) galat(404, "Data pendaftaran tidak ditemukan. Periksa kembali nomor registrasi dan tanggal lahir Anda.");
    return p;
  }

  function jurusanDari(id) {
    return kol("jurusan").find((j) => j.id === Number(id));
  }

  const WAJIB_DAFTAR = {
    nama_lengkap: "Nama lengkap", nisn: "NISN", jenis_kelamin: "Jenis kelamin", tempat_lahir: "Tempat lahir",
    tanggal_lahir: "Tanggal lahir", jalur: "Jalur pendaftaran", jurusan_id: "Peminatan", no_hp: "Nomor HP",
    asal_sekolah: "Asal sekolah", nama_ayah: "Nama ayah", nama_ibu: "Nama ibu", alamat: "Alamat",
  };

  async function buatPendaftar(isi, berkas, olehPanitia) {
    const kolom = {};
    for (const [k, label] of Object.entries(WAJIB_DAFTAR)) {
      if (!String(isi[k] ?? "").trim()) kolom[k] = `${label} wajib diisi.`;
    }
    if (isi.nisn && !/^\d{10}$/.test(isi.nisn)) kolom.nisn = "NISN terdiri dari 10 angka.";
    if (!olehPanitia) {
      for (const [k, label] of [["file_foto", "Foto 3x4"], ["file_ijazah", "Ijazah / SKL"], ["file_kk", "Kartu Keluarga"], ["file_akta", "Akta Kelahiran"], ["file_raport", "Rapor semester akhir"]]) {
        if (!(berkas[k] instanceof File) || berkas[k].size === 0) kolom[k] = `${label} wajib diunggah.`;
      }
      if (isi.jalur === "Prestasi" && !(berkas.file_prestasi instanceof File && berkas.file_prestasi.size)) {
        kolom.file_prestasi = "Jalur Prestasi mewajibkan unggahan sertifikat prestasi.";
      }
    }
    if (Object.keys(kolom).length) galat(400, "Data yang dikirim belum benar.", kolom);
    const tahun = atur("ppdb_tahun");
    if (semuaPendaftar().some((p) => p.tahun_ajaran === tahun && p.nisn === isi.nisn)) {
      galat(409, "Data ini sudah terdaftar pada tahun ajaran ini: nama dengan tanggal lahir yang sama, atau NISN yang sama, sudah dipakai pendaftaran lain. Gunakan menu Cek Status untuk memantaunya.");
    }
    const contoh = semuaPendaftar()[0] || {};
    const id = idBaru(semuaPendaftar());
    const kode = tahun.replace(/^\d\d(\d\d)\/\d\d(\d\d)$/, "$1$2");
    // Dihitung dari jumlah, lalu dinaikkan sampai nomornya belum terpakai,
    // seperti backend: pendaftar yang dihapus membuat jumlahnya tertinggal.
    let urut = semuaPendaftar().filter((p) => p.tahun_ajaran === tahun).length + 1;
    while (semuaPendaftar().some((p) => p.no_registrasi === `PPDB-${kode}-${String(urut).padStart(4, "0")}`)) urut++;
    const p = {};
    for (const k of Object.keys(contoh)) p[k] = typeof contoh[k] === "number" ? 0 : typeof contoh[k] === "boolean" ? false : contoh[k] === null ? null : "";
    for (const [k, v] of Object.entries(isi)) if (k in p || !(k in berkas)) p[k] = ubahTipe(v, contoh[k], k);
    for (const [k, f] of Object.entries(berkas)) p[k] = await simpanBerkas(f, "pendaftar");
    const j = jurusanDari(isi.jurusan_id);
    Object.assign(p, {
      id, no_registrasi: `PPDB-${kode}-${String(urut).padStart(4, "0")}`, tahun_ajaran: tahun,
      jurusan_id: Number(isi.jurusan_id), nama_jurusan: j ? j.nama : "", nilai_rata2: Number(isi.nilai_rata2) || 0,
      status: "Menunggu Verifikasi", catatan_admin: "", diverifikasi_oleh: null, nama_verifikator: "",
      dibuat: sekarang(), diubah: sekarang(), sumber_informasi: isi.sumber_informasi || (olehPanitia ? "Datang Langsung" : ""),
    });
    S.pendaftar[id] = p;
    S.diubah[id] = true;
    return p;
  }

  function hitung(daftar, kunci) {
    const m = new Map();
    for (const x of daftar) {
      const k = typeof kunci === "function" ? kunci(x) : x[kunci];
      if (k === undefined || k === null || k === "") continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m].map(([label, jumlah]) => ({ label, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
  }

  // Cacah pada rekaman dipakai sebagai urutan label, supaya label yang
  // jumlahnya nol tetap tampil seperti di aplikasi.
  function cacahSerupa(rekaman, daftar, kunci) {
    const baru = hitung(daftar, kunci);
    if (!Array.isArray(rekaman) || !rekaman.length) return baru;
    const medan = Object.keys(rekaman[0]);
    const kLabel = medan.find((m) => typeof rekaman[0][m] === "string") || "label";
    const kJumlah = medan.find((m) => typeof rekaman[0][m] === "number") || "jumlah";
    const peta = new Map(baru.map((c) => [c.label, c.jumlah]));
    const hasil = rekaman.map((r) => ({ ...r, [kJumlah]: peta.get(r[kLabel]) || 0 }));
    for (const c of baru) if (!rekaman.some((r) => r[kLabel] === c.label)) hasil.push({ [kLabel]: c.label, [kJumlah]: c.jumlah });
    return hasil;
  }

  /* ---------- koleksi umum ---------- */

  // Koleksi dengan tambah/ubah/hapus yang seragam. `formulir`: dikirim sebagai
  // FormData dengan berkas; `admin`: perubahan hanya untuk admin; `folder`:
  // subfolder unggahan untuk medan berkasnya.
  const UMUM = {
    jurusan: { admin: true },
    berita: { formulir: true, folder: "berita" },
    galeri: { formulir: true, folder: "galeri" },
    fasilitas: { formulir: true, folder: "fasilitas" },
    halaman: { formulir: true, folder: "profil" },
    "tenaga-pendidik": { formulir: true, folder: "profil" },
    agenda: {},
    "kegiatan-siswa": { formulir: true, folder: "profil" },
    pustaka: { formulir: true, folder: "profil" },
    biaya: { admin: true },
    faq: {},
    pengguna: { admin: true },
  };
  const PESAN_TAMBAH = {
    jurusan: "Peminatan", berita: "Berita", galeri: "Foto", fasilitas: "Fasilitas", halaman: "Halaman",
    "tenaga-pendidik": "Data tenaga pendidik", agenda: "Agenda", "kegiatan-siswa": "Kegiatan", pustaka: "Koleksi pustaka",
    biaya: "Rincian biaya", faq: "Pertanyaan", pengguna: "Pengguna",
  };

  async function isiDariBadan(badan, daftar, cfg, lama) {
    const contoh = lama || daftar[0] || {};
    const isi = {};
    if (badan instanceof FormData) {
      for (const [k, v] of badan.entries()) {
        if (v instanceof File) {
          if (v.size) isi[k] = await simpanBerkas(v, cfg.folder || "profil");
        } else if (k === "hapus_gambar") {
          if (v === "1" || v === "true") isi.gambar = "";
        } else isi[k] = ubahTipe(v, contoh[k], k);
      }
    } else if (badan && typeof badan === "object") {
      for (const [k, v] of Object.entries(badan)) isi[k] = ubahTipe(v, contoh[k], k);
    }
    return isi;
  }

  async function tambahUmum(nama, badan, u) {
    const cfg = UMUM[nama];
    const daftar = kol(nama);
    const isi = await isiDariBadan(badan, daftar, cfg);
    if (nama === "pengguna") {
      if (daftar.some((x) => x.username === isi.username)) galat(409, "Nama pengguna sudah dipakai.");
      if (!isi.sandi || String(isi.sandi).length < 8) galat(400, "Data yang dikirim belum benar.", { sandi: "Kata sandi minimal 8 karakter." });
    }
    const judul = isi.judul || isi.nama || isi.pertanyaan;
    if (!judul) galat(400, "Data yang dikirim belum benar.", { [isi.judul !== undefined ? "judul" : "nama"]: "Wajib diisi." });
    const butir = { id: idBaru(daftar), ...isi, dibuat: sekarang(), diubah: sekarang() };
    if (nama === "berita") Object.assign(butir, { slug: isi.slug || slugDari(isi.judul), dibaca: 0, penulis: isi.penulis || u.nama });
    if (nama === "halaman" && !isi.slug) butir.slug = slugDari(isi.judul);
    if (nama === "pengguna") butir.masuk_akhir = null;
    daftar.push(butir);
    return { pesan: `${PESAN_TAMBAH[nama]} berhasil ditambahkan.`, id: butir.id, slug: butir.slug };
  }

  async function ubahUmum(nama, id, badan) {
    const cfg = UMUM[nama];
    const daftar = kol(nama);
    const butir = daftar.find((x) => x.id === id) || tidakAda(PESAN_TAMBAH[nama]);
    const isi = await isiDariBadan(badan, daftar, cfg, butir);
    if (nama === "pengguna" && !isi.sandi) delete isi.sandi;
    Object.assign(butir, isi, { diubah: sekarang() });
    return { pesan: `${PESAN_TAMBAH[nama]} berhasil diperbarui.` };
  }

  function hapusUmum(nama, id, u) {
    const daftar = kol(nama);
    const i = daftar.findIndex((x) => x.id === id);
    if (i < 0) tidakAda(PESAN_TAMBAH[nama]);
    if (nama === "pengguna" && id === u.id) galat(400, "Anda tidak dapat menghapus akun yang sedang dipakai.");
    if (nama === "jurusan" && semuaPendaftar().some((p) => p.jurusan_id === id)) {
      galat(409, "Peminatan ini sudah dipilih pendaftar, jadi tidak dapat dihapus. Nonaktifkan saja.");
    }
    daftar.splice(i, 1);
    return { pesan: `${PESAN_TAMBAH[nama]} berhasil dihapus.` };
  }

  function tambahan(jalurRekaman) {
    const r = D.admin[jalurRekaman] || D.publik[jalurRekaman] || {};
    const { data, ...sisa } = r;
    return salin(sisa);
  }

  const urutkan = (daftar) => [...daftar].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0) || a.id - b.id);

  function daftarUmum(nama, q, publik) {
    let daftar = kol(nama);
    if (publik && daftar.length && "aktif" in daftar[0]) daftar = daftar.filter((x) => x.aktif);
    switch (nama) {
      case "jurusan":
        return { ...tambahan("/api/admin/jurusan"), data: urutkan(daftar).map((j) => ({ ...j, pendaftar: semuaPendaftar().filter((p) => p.jurusan_id === j.id).length })) };
      case "berita": {
        let d = [...daftar].sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));
        if (publik) d = d.filter((b) => b.publish);
        const kat = q.get("kategori");
        if (kat) d = d.filter((b) => b.kategori === kat);
        const pub = q.get("publish");
        if (pub === "1" || pub === "true") d = d.filter((b) => b.publish);
        if (pub === "0" || pub === "false") d = d.filter((b) => !b.publish);
        d = d.filter((b) => cocokCari(b, q.get("cari"), ["judul", "ringkasan", "isi"]));
        return { kategori: tambahan("/api/admin/berita").kategori, ...halamanan(d, q, publik ? 9 : 20) };
      }
      case "galeri": {
        const kat = q.get("kategori");
        const d = [...daftar].sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat))).filter((g) => !kat || g.kategori === kat);
        return { kategori: tambahan("/api/galeri").kategori, data: d };
      }
      case "halaman": {
        const kel = q.get("kelompok");
        return { ...tambahan("/api/admin/halaman"), data: urutkan(daftar).filter((h) => !kel || h.kelompok === kel) };
      }
      case "agenda": {
        const th = q.get("tahun");
        return { ...tambahan("/api/admin/agenda"), data: [...daftar].sort((a, b) => String(a.mulai).localeCompare(String(b.mulai))).filter((x) => !th || String(x.mulai).startsWith(th)) };
      }
      case "pengguna":
        return { ...tambahan("/api/admin/pengguna"), data: daftar.map(tanpaSandi) };
      case "biaya": {
        const r = { ...tambahan(publik ? "/api/biaya" : "/api/admin/biaya"), data: urutkan(daftar) };
        if (publik) {
          r.total_tahap = r.tahapan.map((tahap) => ({ tahap, total: daftar.filter((b) => b.tahap === tahap).reduce((n, b) => n + (Number(b.jumlah) || 0), 0) })).filter((t) => t.total > 0);
        }
        return r;
      }
      case "faq":
        return { ...tambahan(publik ? "/api/faq" : "/api/admin/faq"), data: urutkan(daftar) };
      default:
        return { ...tambahan(`/api/admin/${nama}`), ...tambahan(`/api/${nama}`), data: urutkan(daftar) };
    }
  }

  /* ---------- rute ---------- */

  const rute = [];
  const di = (metode, pola, fn) => {
    const nama = [];
    const re = new RegExp("^" + pola.replace(/\{(\w+)\}/g, (_, n) => (nama.push(n), "([^/]+)")) + "$");
    rute.push({ metode, re, nama, fn });
  };

  // --- autentikasi ---
  di("POST", "/api/masuk", ({ badan }) => {
    const u = kol("pengguna").find((x) => x.username === String(badan.username || "").trim());
    if (!u || u.sandi !== badan.sandi) galat(401, "Nama pengguna atau kata sandi salah.");
    u.masuk_akhir = sekarang();
    return { token: `demo.${u.id}`, pengguna: tanpaSandi(u) };
  });
  di("GET", "/api/saya", ({ kepala }) => tanpaSandi(pengguna(kepala)));
  di("POST", "/api/saya/sandi", ({ kepala, badan }) => {
    const u = pengguna(kepala);
    if (u.sandi !== badan.sandi_lama) galat(400, "Data yang dikirim belum benar.", { sandi_lama: "Kata sandi lama tidak cocok." });
    if (String(badan.sandi_baru || "").length < 8) galat(400, "Data yang dikirim belum benar.", { sandi_baru: "Kata sandi baru minimal 8 karakter." });
    u.sandi = badan.sandi_baru;
    return { pesan: "Kata sandi berhasil diganti." };
  });

  // --- publik ---
  di("GET", "/api/sehat", () => ({ status: "baik" }));
  di("POST", "/api/kunjungan", () => null);
  di("POST", "/api/segarkan", () => null);
  di("GET", "/api/profil", () => {
    const r = salin(D.publik["/api/profil"]);
    for (const k of Object.keys(r.pengaturan)) r.pengaturan[k] = atur(k);
    return r;
  });
  for (const n of ["jurusan", "fasilitas", "galeri", "biaya", "faq", "halaman", "tenaga-pendidik", "agenda", "kegiatan-siswa", "pustaka"]) {
    di("GET", `/api/${n}`, ({ q }) => daftarUmum(n, q, true));
  }
  di("GET", "/api/berita", ({ q }) => daftarUmum("berita", q, true));
  di("GET", "/api/berita/{slug}", ({ p }) => {
    const b = kol("berita").find((x) => x.slug === decodeURIComponent(p.slug) && x.publish) || tidakAda("Berita");
    const terkait = kol("berita").filter((x) => x.publish && x.id !== b.id).slice(0, 3);
    return { data: b, terkait };
  });
  di("GET", "/api/halaman/{slug}", ({ p }) => ({
    data: kol("halaman").find((x) => x.slug === decodeURIComponent(p.slug) && x.aktif) || tidakAda("Halaman"),
  }));
  di("GET", "/api/sekolah", ({ q }) => {
    const c = String(q.get("cari") || "").toLowerCase();
    return { data: c.length < 3 ? [] : kol("sekolah").filter((s) => (s.nama + s.npsn).toLowerCase().includes(c)).slice(0, 10), aktif: kol("sekolah").length > 0 };
  });
  di("POST", "/api/pesan", ({ badan }) => {
    const kolom = {};
    for (const [k, l] of [["nama", "Nama"], ["subjek", "Subjek"], ["isi", "Pesan"]]) if (!String(badan[k] || "").trim()) kolom[k] = `${l} wajib diisi.`;
    if (!badan.email && !badan.no_hp) kolom.email = "Isi email atau nomor HP supaya panitia dapat membalas.";
    if (Object.keys(kolom).length) galat(400, "Data yang dikirim belum benar.", kolom);
    kol("pesan").push({
      id: idBaru(kol("pesan")), nama: badan.nama, email: badan.email || "", no_hp: badan.no_hp || "", subjek: badan.subjek,
      isi: badan.isi, dibaca: false, dibuat: sekarang(), dibalas_pada: null,
    });
    return { pesan: "Pesan Anda sudah kami terima. Panitia akan membalas secepatnya." };
  });
  di("POST", "/api/tanya-cocok", ({ badan }) => {
    // Pencocok sederhana berdasarkan kata yang sama; di aplikasi sebenarnya
    // pencocokan ini dapat memakai model bahasa bila disetel.
    const kata = (t) => new Set(String(t).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
    const tanya = kata(badan.pertanyaan);
    let terbaik = null;
    let skor = 0;
    for (const pil of badan.pilihan || []) {
      const k = kata(pil.tanya);
      const sama = [...tanya].filter((x) => k.has(x)).length / Math.max(1, Math.min(tanya.size, k.size));
      if (sama > skor) [terbaik, skor] = [pil.id, sama];
    }
    return { id: skor >= 0.5 ? terbaik : null };
  });
  di("POST", "/api/tanya-buntu", ({ badan }) => {
    const t = String(badan.pertanyaan || "").trim();
    if (!t) return null;
    const ada = kol("tanya-buntu").find((x) => x.pertanyaan.toLowerCase() === t.toLowerCase());
    if (ada) Object.assign(ada, { jumlah: ada.jumlah + 1, terakhir: sekarang(), ditangani: false });
    else kol("tanya-buntu").push({ id: idBaru(kol("tanya-buntu")), pertanyaan: t, jumlah: 1, ditangani: false, terakhir: sekarang() });
    return null;
  });

  // --- PPDB ---
  di("POST", "/api/ppdb/daftar", async ({ badan }) => {
    if (!(badan instanceof FormData)) galat(400, "Data formulir tidak dapat dibaca.");
    const isi = {};
    const berkas = {};
    for (const [k, v] of badan.entries()) (v instanceof File ? berkas : isi)[k] = v instanceof File ? v : String(v).trim();
    if (isi.website) galat(400, "Permintaan ditolak.");
    const p = await buatPendaftar(isi, berkas, false);
    return [201, { pesan: "Pendaftaran berhasil dikirim.", no_registrasi: p.no_registrasi, tahun_ajaran: p.tahun_ajaran }];
  });
  di("POST", "/api/ppdb/cek", ({ badan }) => {
    const p = cariPendaftar(badan.no_registrasi, badan.tanggal_lahir);
    return {
      no_registrasi: p.no_registrasi, nama_lengkap: p.nama_lengkap, jalur: p.jalur, nama_jurusan: p.nama_jurusan,
      status: p.status, tahun_ajaran: p.tahun_ajaran, catatan_admin: p.catatan_admin || "",
      dibuat: waktuSetempat(p.dibuat), pengumuman: atur("ppdb_pengumuman"),
      ...(p.status === "Diterima" && {
        daftar_ulang: { jadwal: atur("daftar_ulang_jadwal"), tempat: atur("daftar_ulang_tempat"), syarat: atur("daftar_ulang_syarat") },
      }),
    };
  });
  di("POST", "/api/ppdb/bukti", async ({ badan }) => {
    const p = cariPendaftar(badan.no_registrasi, badan.tanggal_lahir);
    return (!S.diubah[p.id] && (await pdfRekaman(`bukti-${p.id}.pdf`))) || pdfPendaftar(p);
  });
  // --- dasbor & laporan ---
  di("GET", "/api/admin/dasbor", ({ kepala }) => {
    pengguna(kepala);
    const r = salin(D.admin["/api/admin/dasbor"]);
    const semua = semuaPendaftar().filter((p) => p.tahun_ajaran === r.tahun_ajaran);
    const awalHari = new Date(new Date().toDateString()).getTime();
    Object.assign(r, {
      total: semua.length,
      kuota: kol("jurusan").filter((j) => j.aktif).reduce((n, j) => n + (Number(j.kuota) || 0), 0),
      hari_ini: semua.filter((p) => Date.parse(p.dibuat) >= awalHari).length,
      minggu_ini: semua.filter((p) => Date.parse(p.dibuat) >= Date.now() - 7 * 864e5).length,
      pesan_belum: kol("pesan").filter((p) => !p.dibaca).length,
      per_status: cacahSerupa(r.per_status, semua, "status"),
      per_jurusan: cacahSerupa(r.per_jurusan, semua, "nama_jurusan"),
      per_jalur: cacahSerupa(r.per_jalur, semua, "jalur"),
      per_sumber: cacahSerupa(r.per_sumber, semua, "sumber_informasi"),
      terbaru: semua.slice(0, (r.terbaru || []).length || 5),
    });
    const tambahTren = (daftar, potong) => {
      if (!Array.isArray(daftar)) return daftar;
      return daftar.map((c) => {
        const kl = Object.keys(c).find((k) => typeof c[k] === "string");
        const kj = Object.keys(c).find((k) => typeof c[k] === "number");
        return { ...c, [kj]: semua.filter((p) => String(p.dibuat).slice(0, potong) === String(c[kl]).slice(0, potong)).length };
      });
    };
    r.tren_bulan = tambahTren(r.tren_bulan, 7);
    r.tren_tahun = tambahTren(r.tren_tahun, 4);
    return r;
  });
  di("GET", "/api/admin/kunjungan", ({ kepala }) => (pengguna(kepala), D.admin["/api/admin/kunjungan"]));
  di("GET", "/api/admin/laporan", ({ kepala }) => {
    pengguna(kepala);
    const r = salin(D.admin["/api/admin/laporan"]);
    const semua = semuaPendaftar().filter((p) => p.tahun_ajaran === r.tahun_ajaran);
    r.total = semua.length;
    for (const [k, m] of [["per_status", "status"], ["per_jurusan", "nama_jurusan"], ["per_jalur", "jalur"], ["per_sumber", "sumber_informasi"], ["per_jenis_kelamin", "jenis_kelamin"], ["per_asal_sekolah", "asal_sekolah"]]) {
      if (k in r) r[k] = cacahSerupa(r[k], semua, m);
    }
    return r;
  });

  // --- pendaftar ---
  di("GET", "/api/admin/pendaftar", ({ kepala, q }) => {
    pengguna(kepala);
    const r = tambahan("/api/admin/pendaftar");
    const tahun = q.get("tahun_ajaran") || r.tahun_ajaran;
    let d = semuaPendaftar().filter((p) => p.tahun_ajaran === tahun);
    for (const k of ["status", "jalur", "jurusan_id"]) {
      const v = q.get(k);
      if (v) d = d.filter((p) => String(p[k]) === v);
    }
    const sumber = q.get("sumber");
    if (sumber) d = d.filter((p) => p.sumber_informasi === sumber);
    d = d.filter((p) => cocokCari(p, q.get("cari"), ["nama_lengkap", "no_registrasi", "nisn", "asal_sekolah"]));
    const urut = q.get("urut");
    if (urut === "nama") d.sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap));
    else if (urut === "lama") d.sort((a, b) => a.id - b.id);
    else if (urut === "nilai") d.sort((a, b) => (b.nilai_rata2 || 0) - (a.nilai_rata2 || 0));
    return { ...r, ...halamanan(d, q, 25), tahun_ajaran: tahun };
  });
  di("POST", "/api/admin/pendaftar", async ({ kepala, badan }) => {
    pengguna(kepala);
    const p = await buatPendaftar(badan, {}, true);
    return [201, { pesan: "Pendaftar berhasil ditambahkan.", no_registrasi: p.no_registrasi, tahun_ajaran: p.tahun_ajaran }];
  });
  di("GET", "/api/admin/pendaftar/ekspor", ({ kepala }) => {
    pengguna(kepala);
    const medan = ["no_registrasi", "nama_lengkap", "nisn", "jenis_kelamin", "tanggal_lahir", "jalur", "nama_jurusan", "asal_sekolah", "no_hp", "email", "nilai_rata2", "status"];
    const sel = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [medan.join(","), ...semuaPendaftar().map((p) => medan.map((m) => sel(p[m])).join(","))].join("\r\n");
    return new Response("﻿" + csv, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="pendaftar-${hariIni()}.csv"` },
    });
  });
  const ambilPendaftar = (id) => S.pendaftar[id] || tidakAda("Pendaftar");
  di("GET", "/api/admin/pendaftar/{id}", ({ kepala, p }) => {
    pengguna(kepala);
    const r = D.detail.pendaftar[Object.keys(D.detail.pendaftar)[0]];
    return { data: ambilPendaftar(p.id), pilihan_status: r.pilihan_status, label_sumber: r.label_sumber };
  });
  di("PATCH", "/api/admin/pendaftar/{id}/status", ({ kepala, p, badan }) => {
    const u = pengguna(kepala);
    const x = ambilPendaftar(p.id);
    Object.assign(x, { status: badan.status, catatan_admin: badan.catatan_admin || "", diverifikasi_oleh: u.id, nama_verifikator: u.nama, diubah: sekarang() });
    S.diubah[x.id] = true;
    return { pesan: `Status ${x.nama_lengkap} diubah menjadi ${badan.status}.` };
  });
  di("DELETE", "/api/admin/pendaftar/{id}", ({ kepala, p }) => {
    pengguna(kepala, true);
    ambilPendaftar(p.id);
    delete S.pendaftar[p.id];
    return { pesan: "Data pendaftar berhasil dihapus." };
  });
  di("GET", "/api/admin/pendaftar/{id}/bukti", async ({ kepala, p }) => {
    pengguna(kepala);
    const x = ambilPendaftar(p.id);
    return (!S.diubah[x.id] && (await pdfRekaman(`bukti-${x.id}.pdf`))) || pdfPendaftar(x);
  });

  // --- pesan masuk ---
  di("GET", "/api/admin/pesan", ({ kepala, q }) => {
    pengguna(kepala);
    let d = [...kol("pesan")].sort((a, b) => b.id - a.id);
    const dib = q.get("dibaca");
    if (dib === "0" || dib === "false") d = d.filter((x) => !x.dibaca);
    if (dib === "1" || dib === "true") d = d.filter((x) => x.dibaca);
    d = d.filter((x) => cocokCari(x, q.get("cari"), ["nama", "subjek", "isi", "email"]));
    return { ...tambahan("/api/admin/pesan"), ...halamanan(d, q, 20), belum_dibaca: kol("pesan").filter((x) => !x.dibaca).length };
  });
  const ambilPesan = (id) => kol("pesan").find((x) => x.id === Number(id)) || tidakAda("Pesan");
  di("PATCH", "/api/admin/pesan/{id}", ({ kepala, p, badan }) => {
    pengguna(kepala);
    ambilPesan(p.id).dibaca = !!badan.dibaca;
    return { pesan: badan.dibaca ? "Pesan ditandai sudah dibaca." : "Pesan ditandai belum dibaca." };
  });
  di("POST", "/api/admin/pesan/{id}/balas", ({ kepala, p, badan }) => {
    pengguna(kepala);
    const x = ambilPesan(p.id);
    if (badan.kanal === "Email") galat(503, "Pengiriman email belum disetel di server (SMTP). Balas lewat WhatsApp, atau minta pengelola menyetel SMTP.");
    const no = String(badan.tujuan || "").replace(/\D/g, "").replace(/^0/, "62");
    Object.assign(x, { dibaca: true, dibalas_pada: sekarang() });
    return { pesan: "Tautan WhatsApp siap. Kirim pesannya dari aplikasi WhatsApp.", tautan_wa: `https://wa.me/${no}?text=${encodeURIComponent(badan.isi || "")}`, dikirim_ke: badan.tujuan };
  });
  di("DELETE", "/api/admin/pesan/{id}", ({ kepala, p }) => {
    pengguna(kepala);
    kol("pesan").splice(kol("pesan").indexOf(ambilPesan(p.id)), 1);
    return { pesan: "Pesan berhasil dihapus." };
  });

  // --- notifikasi ---
  di("GET", "/api/admin/notifikasi", ({ kepala, q }) => {
    pengguna(kepala);
    let d = [...kol("notifikasi")].sort((a, b) => b.id - a.id);
    const st = q.get("status");
    if (st) d = d.filter((x) => x.status === st);
    return { ...tambahan("/api/admin/notifikasi"), ...halamanan(d, q, 25) };
  });
  di("POST", "/api/admin/notifikasi", ({ kepala, badan }) => {
    pengguna(kepala);
    const p = badan.pendaftar_id ? S.pendaftar[badan.pendaftar_id] : null;
    const pesan = String(badan.pesan || "").trim();
    if (!pesan) galat(400, "Data yang dikirim belum benar.", { pesan: "Isi pesan wajib diisi." });
    kol("notifikasi").push({
      id: idBaru(kol("notifikasi")), pendaftar_id: p ? p.id : null, nama_pendaftar: p ? p.nama_lengkap : "", no_registrasi: p ? p.no_registrasi : "",
      kanal: badan.kanal || "WhatsApp", tujuan: badan.tujuan || (p ? p.no_hp : ""), jenis: badan.jenis || "Manual", perihal: badan.perihal || "",
      pesan, status: "Menunggu", galat: "", dikirim_pada: null, dibuat: sekarang(),
    });
    return [201, { pesan: "Notifikasi masuk antrean." }];
  });
  const ambilNotif = (id) => kol("notifikasi").find((x) => x.id === Number(id)) || tidakAda("Notifikasi");
  di("POST", "/api/admin/notifikasi/{id}/kirim", ({ kepala, p, badan }) => {
    pengguna(kepala);
    const n = ambilNotif(p.id);
    if (badan && badan.pesan) n.pesan = badan.pesan;
    const no = String(n.tujuan).replace(/\D/g, "").replace(/^0/, "62");
    Object.assign(n, { status: "Terkirim", dikirim_pada: sekarang() });
    return { pesan: "Tautan WhatsApp siap dibuka.", tautan_wa: `https://wa.me/${no}?text=${encodeURIComponent(n.pesan)}`, dikirim_ke: n.tujuan };
  });
  di("PATCH", "/api/admin/notifikasi/{id}/batal", ({ kepala, p }) => {
    pengguna(kepala);
    ambilNotif(p.id).status = "Dibatalkan";
    return { pesan: "Notifikasi dibatalkan." };
  });

  // --- tanya jawab yang tidak terjawab ---
  di("GET", "/api/admin/tanya-buntu", ({ kepala, q }) => {
    pengguna(kepala);
    let d = [...kol("tanya-buntu")].sort((a, b) => String(b.terakhir).localeCompare(String(a.terakhir)));
    const st = q.get("status");
    if (st === "belum") d = d.filter((x) => !x.ditangani);
    if (st === "sudah") d = d.filter((x) => x.ditangani);
    return { data: d, belum_ditangani: kol("tanya-buntu").filter((x) => !x.ditangani).length };
  });
  di("PATCH", "/api/admin/tanya-buntu/{id}", ({ kepala, p }) => {
    pengguna(kepala);
    const x = kol("tanya-buntu").find((y) => y.id === Number(p.id)) || tidakAda("Pertanyaan");
    x.ditangani = !x.ditangani;
    return { pesan: x.ditangani ? "Pertanyaan ditandai sudah ditangani." : "Pertanyaan ditandai belum ditangani." };
  });
  di("DELETE", "/api/admin/tanya-buntu/{id}", ({ kepala, p }) => {
    pengguna(kepala);
    const i = kol("tanya-buntu").findIndex((y) => y.id === Number(p.id));
    if (i < 0) tidakAda("Pertanyaan");
    kol("tanya-buntu").splice(i, 1);
    return { pesan: "Pertanyaan dihapus." };
  });

  // --- daftar rujukan sekolah ---
  di("GET", "/api/admin/sekolah", ({ kepala, q }) => {
    pengguna(kepala);
    const d = kol("sekolah").filter((s) => cocokCari(s, q.get("cari"), ["nama", "npsn", "kecamatan", "kabupaten"]));
    return { ...halamanan(d, q, 25), semua: kol("sekolah").length };
  });
  di("POST", "/api/admin/sekolah/impor", ({ kepala, badan }) => {
    pengguna(kepala, true);
    const baris = String(badan.csv || "").split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
    if (!baris.length) galat(400, "Tempelkan dulu daftar sekolahnya. Bentuknya: NPSN, nama sekolah, lalu kolom lain yang opsional.");
    const pemisah = [";", "\t", ","].find((p) => baris[0].includes(p)) || ",";
    if (badan.ganti) S.koleksi.sekolah = [];
    const dilewati = [];
    let masuk = 0;
    for (const b of baris) {
      const [npsn, nama, bentuk = "", status = "", kecamatan = "", kabupaten = "", provinsi = ""] = b.split(pemisah).map((x) => x.trim().replace(/^"|"$/g, ""));
      if (!/^\d{8}$/.test(npsn || "")) {
        if (!/npsn/i.test(npsn || "")) dilewati.push(b);
        continue;
      }
      const ada = kol("sekolah").find((s) => s.npsn === npsn);
      const s = { npsn, nama, bentuk, status, kecamatan, kabupaten, provinsi };
      if (ada) Object.assign(ada, s);
      else kol("sekolah").push(s);
      masuk++;
    }
    return { pesan: `${masuk} sekolah masuk ke daftar rujukan.`, masuk, semua: kol("sekolah").length, dilewati };
  });
  di("DELETE", "/api/admin/sekolah/{npsn}", ({ kepala, p }) => {
    pengguna(kepala, true);
    S.koleksi.sekolah = kol("sekolah").filter((s) => s.npsn !== p.npsn);
    return { pesan: "Sekolah dihapus dari daftar rujukan." };
  });

  // --- pengaturan ---
  di("GET", "/api/admin/pengaturan", ({ kepala }) => (pengguna(kepala, true), { data: S.pengaturan }));
  di("PUT", "/api/admin/pengaturan", ({ kepala, badan }) => {
    pengguna(kepala, true);
    for (const [k, v] of Object.entries(badan.pengaturan || {})) {
      const b = S.pengaturan.find((x) => x.nama_setting === k);
      if (b) b.nilai = String(v);
      else S.pengaturan.push({ nama_setting: k, nilai: String(v), keterangan: "" });
    }
    return { pesan: "Pengaturan berhasil disimpan." };
  });
  di("POST", "/api/admin/pengaturan/gambar", async ({ kepala, badan }) => {
    pengguna(kepala, true);
    const kunci = String(badan.get("kunci"));
    const nama = await simpanBerkas(badan.get("gambar"), "profil");
    if (!nama) galat(400, "Pilih gambarnya dulu.");
    const b = S.pengaturan.find((x) => x.nama_setting === kunci);
    if (b) b.nilai = nama;
    else S.pengaturan.push({ nama_setting: kunci, nilai: nama, keterangan: "" });
    return { pesan: "Gambar berhasil diunggah.", nama };
  });
  di("DELETE", "/api/admin/pengaturan/gambar/{kunci}", ({ kepala, p }) => {
    pengguna(kepala, true);
    const b = S.pengaturan.find((x) => x.nama_setting === decodeURIComponent(p.kunci));
    if (b) b.nilai = "";
    return { pesan: "Gambar dihapus." };
  });

  // --- koleksi umum: daftar, tambah, ubah, hapus ---
  for (const [nama, cfg] of Object.entries(UMUM)) {
    if (!["galeri", "fasilitas"].includes(nama)) di("GET", `/api/admin/${nama}`, ({ kepala, q }) => (pengguna(kepala, nama === "pengguna"), daftarUmum(nama, q, false)));
    di("POST", `/api/admin/${nama}`, async ({ kepala, badan }) => [201, await tambahUmum(nama, badan, pengguna(kepala, cfg.admin))]);
    di("PUT", `/api/admin/${nama}/{id}`, async ({ kepala, p, badan }) => (pengguna(kepala, cfg.admin), ubahUmum(nama, Number(p.id), badan)));
    di("DELETE", `/api/admin/${nama}/{id}`, ({ kepala, p }) => hapusUmum(nama, Number(p.id), pengguna(kepala, cfg.admin)));
  }

  /* ---------- Bursa Kerja Khusus, sama dengan backend/bkk.go ---------- */

  const STATUS_LAMARAN = ["Diajukan", "Diteruskan", "Wawancara", "Diterima", "Ditolak"];
  const JENIS_LOWONGAN = ["Penuh Waktu", "Kontrak", "Paruh Waktu", "Magang"];
  const mitraDari = (id) => kol("bkk-mitra").find((m) => m.id === id);
  const lowonganDibuka = (l) => {
    const m = mitraDari(l.mitra_id);
    return l.status === "buka" && !!m && m.aktif && (!l.batas_lamar || l.batas_lamar >= hariIni());
  };
  function lowonganLengkap(l) {
    const m = mitraDari(l.mitra_id) || {};
    const lamaran = kol("bkk-lamaran").filter((s) => s.lowongan_id === l.id);
    return {
      ...l, nama_mitra: m.nama || "", logo_mitra: m.logo || "", bidang_mitra: m.bidang || "",
      dibuka: lowonganDibuka(l), jumlah_pelamar: lamaran.length, diterima: lamaran.filter((s) => s.status === "Diterima").length,
    };
  }
  function mitraLengkap(m) {
    const lowongan = kol("bkk-lowongan").filter((l) => l.mitra_id === m.id);
    const ids = new Set(lowongan.map((l) => l.id));
    return {
      ...m, lowongan_dibuka: lowongan.filter(lowonganDibuka).length, jumlah_lowongan: lowongan.length,
      tersalurkan: kol("bkk-lamaran").filter((s) => ids.has(s.lowongan_id) && s.status === "Diterima").length,
    };
  }
  const urutLowongan = (d) =>
    [...d].sort((a, b) => Number(b.dibuka) - Number(a.dibuka) || String(a.batas_lamar || "9999").localeCompare(String(b.batas_lamar || "9999")) || b.id - a.id);
  function isianTeks(badan) {
    const isi = {};
    if (badan instanceof FormData) {
      for (const [k, v] of badan.entries()) if (!(v instanceof File)) isi[k] = String(v).trim();
    } else for (const [k, v] of Object.entries(badan || {})) isi[k] = typeof v === "string" ? v.trim() : v;
    return isi;
  }
  function periksaLamaran(isi) {
    const k = {};
    if (!(Number(isi.lowongan_id) > 0)) k.lowongan_id = "Pilih lowongan yang dilamar.";
    if (!isi.nama) k.nama = "Nama lengkap wajib diisi.";
    if (!isi.tanggal_lahir) k.tanggal_lahir = "Tanggal lahir wajib diisi.";
    if (!isi.nisn) k.nisn = "NISN wajib diisi.";
    else if (!/^\d{10}$/.test(isi.nisn)) k.nisn = `NISN harus 10 angka, yang Anda tulis ${isi.nisn.length} angka.`;
    else if (isi.tanggal_lahir && isi.nisn.slice(0, 3) !== isi.tanggal_lahir.slice(1, 4)) {
      k.nisn = `Tiga angka pertama NISN harus sama dengan tiga angka terakhir tahun lahir, yaitu ${isi.tanggal_lahir.slice(1, 4)}.`;
    }
    if (!["L", "P"].includes(String(isi.jenis_kelamin || "").toUpperCase())) k.jenis_kelamin = "Jenis kelamin wajib dipilih.";
    const th = Number(isi.tahun_lulus);
    if (!isi.tahun_lulus) k.tahun_lulus = "Tahun lulus wajib diisi.";
    else if (!(th >= 1990 && th <= new Date().getFullYear() + 1)) k.tahun_lulus = `Tahun lulus harus berupa angka 1990 sampai ${new Date().getFullYear() + 1}.`;
    if (!isi.telepon) k.telepon = "Nomor HP/WhatsApp wajib diisi.";
    else if (!/^[0-9+\-\s()]{9,25}$/.test(isi.telepon)) k.telepon = "Nomor HP/WhatsApp tidak valid (gunakan 9-15 angka).";
    return k;
  }
  function catatLamaran(isi, cv, sumber) {
    const daftar = kol("bkk-lamaran");
    if (daftar.some((s) => s.lowongan_id === Number(isi.lowongan_id) && s.nisn === isi.nisn)) {
      galat(409, "NISN ini sudah tercatat melamar lowongan yang sama. Pantau lamarannya di halaman Cek Lamaran.");
    }
    const l = kol("bkk-lowongan").find((x) => x.id === Number(isi.lowongan_id)) || tidakAda("Lowongan");
    const id = idBaru(daftar);
    const kode = `BKK-${String(new Date().getFullYear()).slice(2)}-${String(id).padStart(4, "0")}`;
    const w = waktuSetempat(sekarang());
    daftar.push({
      id, kode, lowongan_id: l.id, posisi: l.posisi, nama_mitra: (mitraDari(l.mitra_id) || {}).nama || "",
      nama: isi.nama, nisn: isi.nisn, tanggal_lahir: isi.tanggal_lahir, jenis_kelamin: String(isi.jenis_kelamin).toUpperCase(),
      tahun_lulus: Number(isi.tahun_lulus), telepon: isi.telepon, email: isi.email || "", alamat: isi.alamat || "",
      ringkasan: isi.ringkasan || "", cv, status: "Diajukan", catatan: "", sumber, dibuat: w, diubah: w,
    });
    return kode;
  }

  // --- publik ---
  di("GET", "/api/bkk/lowongan", () => {
    const d = urutLowongan(kol("bkk-lowongan").filter(lowonganDibuka)).map((l) => ({ ...lowonganLengkap(l), jumlah_pelamar: 0, diterima: 0 }));
    return {
      data: d,
      angka: { mitra: kol("bkk-mitra").filter((m) => m.aktif).length, lowongan_dibuka: d.length, tersalurkan: kol("bkk-lamaran").filter((s) => s.status === "Diterima").length },
    };
  });
  di("GET", "/api/bkk/lowongan/{id}", ({ p }) => {
    const l = kol("bkk-lowongan").find((x) => x.id === Number(p.id));
    if (!l || l.status === "draf") tidakAda("Lowongan");
    return { ...lowonganLengkap(l), jumlah_pelamar: 0, diterima: 0 };
  });
  di("GET", "/api/bkk/mitra", () => ({
    data: kol("bkk-mitra").filter((m) => m.aktif).map(mitraLengkap)
      .map(({ kontak_nama, kontak_telepon, kontak_email, ...m }) => ({ ...m, jumlah_lowongan: 0 })),
  }));
  di("POST", "/api/bkk/lamar", async ({ badan }) => {
    const isi = isianTeks(badan);
    const k = periksaLamaran(isi);
    if (isi.setuju !== "1") k.setuju = "Centang pernyataan bahwa data yang diisi benar dan boleh diteruskan ke perusahaan.";
    const l = kol("bkk-lowongan").find((x) => x.id === Number(isi.lowongan_id));
    if (l && !lowonganDibuka(l)) galat(409, "Lowongan ini sudah tidak menerima lamaran.");
    if (Object.keys(k).length) galat(422, "Data yang dikirim belum benar.", k);
    const berkas = badan instanceof FormData ? badan.get("cv") : null;
    const cv = berkas instanceof File && berkas.size ? await simpanBerkas(berkas, "bkk-cv") : "";
    const kode = catatLamaran(isi, cv, "daring");
    return [201, { pesan: "Lamaran terkirim. Petugas BKK akan memeriksanya sebelum diteruskan ke perusahaan.", kode }];
  });
  di("POST", "/api/bkk/cek", ({ badan }) => {
    const nisn = String(badan.nisn || "").replace(/\s/g, "");
    const k = {};
    if (!nisn) k.nisn = "NISN wajib diisi.";
    if (!badan.tanggal_lahir) k.tanggal_lahir = "Tanggal lahir wajib diisi.";
    if (Object.keys(k).length) galat(422, "Data yang dikirim belum benar.", k);
    const d = kol("bkk-lamaran").filter((s) => s.nisn === nisn && String(s.tanggal_lahir).slice(0, 10) === badan.tanggal_lahir);
    if (!d.length) galat(404, "Lamaran tidak ditemukan. Periksa kembali NISN dan tanggal lahir yang Anda pakai saat melamar.");
    return {
      data: [...d].sort((a, b) => b.id - a.id).map((s) => ({
        kode: s.kode, nama: s.nama, posisi: s.posisi, nama_mitra: s.nama_mitra, status: s.status, catatan: s.catatan,
        dibuat: String(s.dibuat).slice(0, 10), diubah: String(s.diubah).slice(0, 10),
      })),
    };
  });

  // --- panel ---
  di("GET", "/api/admin/bkk/mitra", ({ kepala }) => (pengguna(kepala), { data: kol("bkk-mitra").map(mitraLengkap) }));
  const simpanMitra = async (badan, lama) => {
    const isi = isianTeks(badan);
    const k = {};
    if (!isi.nama) k.nama = "Nama perusahaan wajib diisi.";
    if (isi.situs && !/^https?:\/\//.test(isi.situs)) k.situs = "Situs perusahaan harus dimulai dengan http:// atau https://.";
    if (Object.keys(k).length) galat(422, "Data yang dikirim belum benar.", k);
    const berkas = badan instanceof FormData ? badan.get("logo") : null;
    let logo = lama ? lama.logo : "";
    if (berkas instanceof File && berkas.size) logo = await simpanBerkas(berkas, "bkk-mitra");
    else if (isi.hapus_logo === "1") logo = "";
    return {
      nama: isi.nama, bidang: isi.bidang || "", alamat: isi.alamat || "", kontak_nama: isi.kontak_nama || "",
      kontak_telepon: isi.kontak_telepon || "", kontak_email: isi.kontak_email || "", situs: isi.situs || "", logo, aktif: isi.aktif === "1",
    };
  };
  di("POST", "/api/admin/bkk/mitra", async ({ kepala, badan }) => {
    pengguna(kepala);
    const m = { id: idBaru(kol("bkk-mitra")), ...(await simpanMitra(badan)) };
    kol("bkk-mitra").push(m);
    return [201, { pesan: "Mitra berhasil ditambahkan.", id: m.id }];
  });
  di("PUT", "/api/admin/bkk/mitra/{id}", async ({ kepala, p, badan }) => {
    pengguna(kepala);
    const m = kol("bkk-mitra").find((x) => x.id === Number(p.id)) || tidakAda("Mitra");
    Object.assign(m, await simpanMitra(badan, m));
    return { pesan: "Mitra berhasil diperbarui." };
  });
  di("DELETE", "/api/admin/bkk/mitra/{id}", ({ kepala, p }) => {
    pengguna(kepala, true);
    const i = kol("bkk-mitra").findIndex((x) => x.id === Number(p.id));
    if (i < 0) tidakAda("Mitra");
    if (kol("bkk-lowongan").some((l) => l.mitra_id === Number(p.id))) {
      galat(409, "Mitra ini sudah pernah membuka lowongan, jadi tidak dapat dihapus tanpa menghapus riwayat penyalurannya. Nonaktifkan saja mitranya.");
    }
    kol("bkk-mitra").splice(i, 1);
    return { pesan: "Mitra berhasil dihapus." };
  });

  di("GET", "/api/admin/bkk/lowongan", ({ kepala }) => (
    pengguna(kepala), { data: urutLowongan(kol("bkk-lowongan")).map(lowonganLengkap), jenis: JENIS_LOWONGAN, status: ["draf", "buka", "tutup"] }
  ));
  const periksaLowongan = (isi) => {
    const k = {};
    if (!mitraDari(Number(isi.mitra_id))) k.mitra_id = "Pilih perusahaan mitra yang membuka lowongan ini.";
    if (!isi.posisi) k.posisi = "Posisi wajib diisi.";
    if (isi.jenis && !JENIS_LOWONGAN.includes(isi.jenis)) k.jenis = "Jenis pekerjaan tidak valid.";
    if (isi.kuota !== "" && isi.kuota != null && !(Number(isi.kuota) >= 1 && Number(isi.kuota) <= 10000)) k.kuota = "Jumlah yang dibutuhkan harus berupa angka 1 sampai 10000.";
    if (Object.keys(k).length) galat(422, "Data yang dikirim belum benar.", k);
    return {
      mitra_id: Number(isi.mitra_id), posisi: isi.posisi, jenis: isi.jenis || "Penuh Waktu", lokasi: isi.lokasi || "",
      deskripsi: isi.deskripsi || "", kualifikasi: isi.kualifikasi || "", gaji: isi.gaji || "",
      kuota: isi.kuota ? Number(isi.kuota) : null, batas_lamar: isi.batas_lamar || null, status: isi.status || "draf",
    };
  };
  di("POST", "/api/admin/bkk/lowongan", ({ kepala, badan }) => {
    pengguna(kepala);
    const l = { id: idBaru(kol("bkk-lowongan")), ...periksaLowongan(isianTeks(badan)), dibuat: hariIni() };
    kol("bkk-lowongan").push(l);
    return [201, { pesan: "Lowongan berhasil disimpan.", id: l.id }];
  });
  di("PUT", "/api/admin/bkk/lowongan/{id}", ({ kepala, p, badan }) => {
    pengguna(kepala);
    const l = kol("bkk-lowongan").find((x) => x.id === Number(p.id)) || tidakAda("Lowongan");
    Object.assign(l, periksaLowongan(isianTeks(badan)));
    const m = mitraDari(l.mitra_id) || {};
    for (const s of kol("bkk-lamaran")) if (s.lowongan_id === l.id) Object.assign(s, { posisi: l.posisi, nama_mitra: m.nama || "" });
    return { pesan: "Lowongan berhasil diperbarui." };
  });
  di("DELETE", "/api/admin/bkk/lowongan/{id}", ({ kepala, p }) => {
    pengguna(kepala, true);
    const i = kol("bkk-lowongan").findIndex((x) => x.id === Number(p.id));
    if (i < 0) tidakAda("Lowongan");
    if (kol("bkk-lamaran").some((s) => s.lowongan_id === Number(p.id))) {
      galat(409, "Lowongan ini sudah punya pelamar, jadi tidak dapat dihapus tanpa menghapus riwayat penyalurannya. Ubah statusnya menjadi Ditutup.");
    }
    kol("bkk-lowongan").splice(i, 1);
    return { pesan: "Lowongan berhasil dihapus." };
  });

  di("GET", "/api/admin/bkk/lamaran", ({ kepala, q }) => {
    pengguna(kepala);
    const semua = kol("bkk-lamaran");
    const low = Number(q.get("lowongan")) || 0;
    const st = q.get("status");
    const d = [...semua]
      .filter((s) => (!low || s.lowongan_id === low) && (!st || s.status === st) && cocokCari(s, q.get("cari"), ["nama", "nisn", "kode"]))
      .sort((a, b) => b.id - a.id);
    const ringkasan = Object.fromEntries(STATUS_LAMARAN.map((x) => [x, semua.filter((s) => s.status === x).length]));
    const tahun = [...new Set(semua.map((s) => s.tahun_lulus))].sort((a, b) => b - a);
    const per_tahun = tahun.map((t) => {
      const di_tahun = semua.filter((s) => s.tahun_lulus === t);
      return {
        tahun_lulus: t, pelamar: new Set(di_tahun.map((s) => s.nisn)).size,
        tersalurkan: new Set(di_tahun.filter((s) => s.status === "Diterima").map((s) => s.nisn)).size,
      };
    });
    return { data: d, status: STATUS_LAMARAN, ringkasan, per_tahun };
  });
  di("POST", "/api/admin/bkk/lamaran", ({ kepala, badan }) => {
    pengguna(kepala);
    const isi = isianTeks(badan);
    const k = periksaLamaran(isi);
    if (Object.keys(k).length) galat(422, "Data yang dikirim belum benar.", k);
    const kode = catatLamaran(isi, "", "manual");
    return [201, { pesan: `Lamaran ${kode} tercatat.`, kode }];
  });
  di("PATCH", "/api/admin/bkk/lamaran/{id}", ({ kepala, p, badan }) => {
    pengguna(kepala);
    const s = kol("bkk-lamaran").find((x) => x.id === Number(p.id)) || tidakAda("Lamaran");
    if (!STATUS_LAMARAN.includes(badan.status)) galat(422, "Data yang dikirim belum benar.", { status: "Status tidak valid." });
    Object.assign(s, { status: badan.status, catatan: String(badan.catatan || "").trim(), diubah: waktuSetempat(sekarang()) });
    return { pesan: `Lamaran diperbarui menjadi ${badan.status}.` };
  });
  di("DELETE", "/api/admin/bkk/lamaran/{id}", ({ kepala, p }) => {
    pengguna(kepala, true);
    const i = kol("bkk-lamaran").findIndex((x) => x.id === Number(p.id));
    if (i < 0) tidakAda("Lamaran");
    kol("bkk-lamaran").splice(i, 1);
    return { pesan: "Lamaran berhasil dihapus." };
  });

  /* ---------- penjawab ---------- */

  async function jawab(metode, url, kepala, badanMentah) {
    await siap;
    let jalur = url.pathname;
    if (DASAR && jalur.startsWith(DASAR + "/")) jalur = jalur.slice(DASAR.length);
    let badan = badanMentah;
    if (typeof badan === "string") {
      try {
        badan = JSON.parse(badan);
      } catch {
        /* bukan JSON */
      }
    }
    if (badan == null) badan = {};
    for (const r of rute) {
      if (r.metode !== metode) continue;
      const m = r.re.exec(jalur);
      if (!m) continue;
      const p = {};
      r.nama.forEach((n, i) => (p[n] = decodeURIComponent(m[i + 1])));
      try {
        let hasil = await r.fn({ p, q: url.searchParams, kepala, badan });
        simpan();
        if (hasil instanceof Response) return hasil;
        if (hasil instanceof Blob) return new Response(hasil, { headers: { "content-type": "application/pdf" } });
        let status = 200;
        if (Array.isArray(hasil) && hasil.length === 2 && typeof hasil[0] === "number") [status, hasil] = hasil;
        if (hasil === null || hasil === undefined) return new Response(null, { status: 204 });
        return Response.json(hasil, { status });
      } catch (e) {
        if (e instanceof Galat) return Response.json(e.isi, { status: e.status });
        console.error("[demo]", metode, jalur, e);
        return Response.json({ pesan: "Terjadi galat pada demo. Muat ulang halaman, atau setel ulang data demo." }, { status: 500 });
      }
    }
    return Response.json({ pesan: "Fitur ini tidak tersedia pada demo." }, { status: 404 });
  }

  function milikApi(url) {
    if (url.origin !== location.origin) return false;
    const j = DASAR && url.pathname.startsWith(DASAR + "/") ? url.pathname.slice(DASAR.length) : url.pathname;
    return j.startsWith("/api/");
  }

  const asli = window.fetch.bind(window);
  window.fetch = async (masukan, init = {}) => {
    const req = masukan instanceof Request ? masukan : null;
    const url = new URL(req ? req.url : String(masukan), location.href);
    if (!milikApi(url)) return asli(masukan, init);
    const metode = String(init.method || (req && req.method) || "GET").toUpperCase();
    const kepala = new Headers(init.headers || (req && req.headers) || {});
    let badan = init.body;
    if (badan === undefined && req && !["GET", "HEAD"].includes(metode)) badan = await req.clone().text();
    return jawab(metode, url, kepala, badan);
  };

  // XMLHttpRequest dipakai formulir pendaftaran supaya kemajuan unggahan
  // terlihat. Nilai jawabannya dipasang langsung pada objeknya.
  const bukaAsli = XMLHttpRequest.prototype.open;
  const kirimAsli = XMLHttpRequest.prototype.send;
  const kepalaAsli = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (metode, alamat, ...sisa) {
    const url = new URL(String(alamat), location.href);
    this.__demo = milikApi(url) ? { metode: String(metode).toUpperCase(), url, kepala: new Headers() } : null;
    if (!this.__demo) return bukaAsli.call(this, metode, alamat, ...sisa);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this.__demo) return this.__demo.kepala.set(k, v);
    return kepalaAsli.call(this, k, v);
  };
  XMLHttpRequest.prototype.send = function (badan) {
    const d = this.__demo;
    if (!d) return kirimAsli.call(this, badan);
    const xhr = this;
    const pasang = (k, v) => Object.defineProperty(xhr, k, { value: v, configurable: true });
    const total = badan instanceof FormData ? [...badan.values()].reduce((n, v) => n + (v instanceof File ? v.size : String(v).length), 0) : 0;
    const kabar = (loaded) => xhr.upload.onprogress && xhr.upload.onprogress(new ProgressEvent("progress", { lengthComputable: true, loaded, total }));
    setTimeout(() => kabar(Math.round(total / 2)), 150);
    setTimeout(async () => {
      kabar(total);
      if (xhr.upload.onload) xhr.upload.onload(new ProgressEvent("load"));
      const j = await jawab(d.metode, d.url, d.kepala, badan);
      const teks = await j.text();
      pasang("readyState", 4);
      pasang("status", j.status);
      pasang("responseText", teks);
      pasang("response", teks);
      pasang("getResponseHeader", (k) => j.headers.get(k));
      if (xhr.onload) xhr.onload(new ProgressEvent("load"));
      xhr.dispatchEvent(new ProgressEvent("load"));
    }, 400);
  };

  /* ---------- gambar unggahan pengunjung ---------- */

  function tukarGambar(el) {
    const src = el.getAttribute("src") || "";
    const m = /\/unggahan\/([^/]+)\/([^/?#]+)/.exec(src);
    if (!m) return;
    const data = gambarDemo[`${m[1]}/${decodeURIComponent(m[2])}`];
    if (data) el.setAttribute("src", data);
  }
  new MutationObserver((catatan) => {
    for (const c of catatan) {
      if (c.type === "attributes") tukarGambar(c.target);
      else for (const n of c.addedNodes) if (n.nodeType === 1) (n.tagName === "IMG" ? [n] : n.querySelectorAll("img")).forEach(tukarGambar);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });

  // Gambar pengaturan (foto kepala sekolah, foto depan, logo, ...) di halaman
  // publik demo adalah tangkapan yang menyebut berkas lama, misalnya
  // /gambar/profil/<nama>-640.webp. Bila panel demo sudah menggantinya, gambar
  // itu ditukar dengan unggahan baru, yang tersimpan di peramban.
  async function tukarGambarPengaturan() {
    await siap;
    if (location.pathname.startsWith(DASAR + "/admin")) return;
    const asli = Object.fromEntries(D.admin["/api/admin/pengaturan"].data.map((x) => [x.nama_setting, x.nilai]));
    for (const x of S.pengaturan) {
      const lama = asli[x.nama_setting];
      if (!lama || lama === x.nilai || !/\.(png|jpe?g|webp|gif|svg)$/i.test(lama)) continue;
      const baru = x.nilai ? gambarDemo[`profil/${x.nilai}`] || `${DASAR}/unggahan/profil/${encodeURIComponent(x.nilai)}` : "";
      for (const img of document.querySelectorAll("img")) {
        if (!`${img.getAttribute("src") || ""} ${img.getAttribute("srcset") || ""}`.includes(lama)) continue;
        if (baru) {
          img.removeAttribute("srcset");
          img.setAttribute("src", baru);
        } else img.style.visibility = "hidden"; // gambarnya dihapus di panel
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tukarGambarPengaturan);
  else tukarGambarPengaturan();

  /* ---------- tautan yang lupa awalan ---------- */

  // Tautan <a href="/..."> dari komponen yang tidak memakai next/link akan
  // menuju akar github.io. Ditambahkan awalannya saat diklik.
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target instanceof Element && e.target.closest("a[href]");
      if (!a || !DASAR || e.defaultPrevented) return;
      const href = a.getAttribute("href");
      if (href && href.startsWith("/") && !href.startsWith("//") && href !== DASAR && !href.startsWith(DASAR + "/")) {
        a.setAttribute("href", DASAR + href);
      }
    },
    true,
  );

  /* ---------- penanda demo ---------- */

  function pasangPenanda() {
    if (document.getElementById("penanda-demo")) return;
    const el = document.createElement("div");
    el.id = "penanda-demo";
    const diAdmin = location.pathname.startsWith(DASAR + "/admin");
    // Di ponsel tombol WhatsApp menempati pojok bawah; penandanya naik di atasnya.
    const sempit = innerWidth < 640;
    el.setAttribute("role", "note");
    el.style.cssText =
      `position:fixed;${diAdmin ? "right" : "left"}:12px;${sempit ? "bottom:84px" : "bottom:12px"};` +
      "z-index:2147483000;display:flex;gap:8px;align-items:center;" +
      "padding:6px 10px;border-radius:999px;background:rgba(15,23,42,.88);color:#fff;font:12px/1.3 system-ui,sans-serif;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.25);max-width:calc(100vw - 24px)";
    el.innerHTML =
      `<span>${sempit ? "Demo" : "Demo · data tersimpan di peramban ini"}${diAdmin ? " · masuk <b>admin</b>/<b>admin123</b>" : ""}</span>` +
      `<button type="button" style="all:unset;cursor:pointer;text-decoration:underline">Setel ulang</button>` +
      `<button type="button" aria-label="Tutup penanda demo" style="all:unset;cursor:pointer;padding:0 2px">✕</button>`;
    const [setel, tutup] = el.querySelectorAll("button");
    setel.onclick = () => {
      try {
        localStorage.removeItem(KUNCI);
        localStorage.removeItem(KUNCI_GAMBAR);
        localStorage.removeItem("pkm_token");
      } catch {
        /* diabaikan */
      }
      location.reload();
    };
    tutup.onclick = () => el.remove();
    document.body.appendChild(el);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasangPenanda);
  else pasangPenanda();

  /* ---------- penyaring daftar berita ---------- */

  // Di aplikasi, ?kategori= dan ?cari= disaring server Astro. Demo hanya
  // berisi tangkapan halaman tanpa penyaring, jadi tombol kategori dulu hanya
  // mengganti alamat sementara ketujuh berita tetap tampil. Penyaringnya
  // diulang di sini atas kartu yang sudah ada di halaman.
  function saringBerita() {
    if (location.pathname.replace(/\/+$/, "") !== DASAR + "/berita") return;
    const q = new URLSearchParams(location.search);
    const kat = q.get("kategori") || "";
    const cari = (q.get("cari") || "").trim().toLowerCase();
    if (!kat && !cari) return;
    const kartu = [...document.querySelectorAll('main a[href*="/berita/"]')].filter((a) => a.querySelector("h2"));
    if (!kartu.length) return;
    let tampil = 0;
    for (const a of kartu) {
      // textContent, bukan innerText: label kategori ditampilkan huruf besar lewat CSS.
      const label = (a.querySelector("span.absolute")?.textContent || "").trim();
      const cocok = (!kat || label === kat) && (!cari || a.textContent.toLowerCase().includes(cari));
      a.style.display = cocok ? "" : "none";
      if (cocok) tampil++;
    }
    // Tombol kategori: kelas tombol aktif dipindah ke yang dipilih.
    const pil = [...document.querySelectorAll("a[data-magnet]")].filter((a) => /\/berita(\?|$)/.test(a.getAttribute("href") || ""));
    const aktif = pil.find((a) => a.className.includes("bg-emas"));
    const pasif = pil.find((a) => !a.className.includes("bg-emas"));
    if (aktif && pasif) {
      const [kAktif, kPasif] = [aktif.className, pasif.className];
      for (const a of pil) {
        const k = new URL(a.href).searchParams.get("kategori") || "";
        const dipilih = k === kat;
        a.className = dipilih ? kAktif : kPasif;
        if (dipilih) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
        // Pencarian yang sedang berjalan ikut dibawa saat ganti kategori.
        const u = new URL(a.href);
        if (cari) u.searchParams.set("cari", q.get("cari"));
        a.href = u.pathname + u.search;
      }
    }
    const kotak = document.querySelector('form[role="search"]');
    if (kotak) {
      const isian = kotak.querySelector('input[name="cari"]');
      if (isian) isian.value = q.get("cari") || "";
      if (kat && !kotak.querySelector('input[name="kategori"]')) {
        kotak.insertAdjacentHTML("afterbegin", `<input type="hidden" name="kategori">`);
        kotak.querySelector('input[name="kategori"]').value = kat;
      }
    }
    const ringkas = [...document.querySelectorAll("main p")].find((p) => p.textContent.trim().startsWith("Menampilkan"));
    if (ringkas) {
      ringkas.textContent = tampil
        ? `Menampilkan ${tampil} dari ${tampil} berita${kat ? ` pada kategori ${kat}` : ""}${cari ? ` untuk pencarian "${q.get("cari")}"` : ""}.`
        : `Tidak ada berita${kat ? ` pada kategori ${kat}` : ""}${cari ? ` yang cocok dengan "${q.get("cari")}"` : ""}.`;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", saringBerita);
  else saringBerita();
})();

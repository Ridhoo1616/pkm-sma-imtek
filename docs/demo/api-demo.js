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
  const KUNCI = "demo_pkm_v6";
  const KUNCI_GAMBAR = "demo_pkm_v6_gambar";

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
      soal: a["/api/admin/soal"].data,
      "paket-ujian": a["/api/admin/paket-ujian"].data,
      pengguna: a["/api/admin/pengguna"].data.map((u) => ({
        ...u,
        sandi: u.username === "admin" ? "admin123" : u.username === "panitia" ? "panitia123" : "",
      })),
      "jenis-surat": a["/api/admin/jenis-surat"].data,
      surat: a["/api/admin/surat"].data,
      pesan: a["/api/admin/pesan"].data,
      notifikasi: a["/api/admin/notifikasi"].data,
      "tanya-buntu": a["/api/admin/tanya-buntu"].data,
      sekolah: a["/api/admin/sekolah"].data,
    };
    const pendaftar = {};
    for (const [id, r] of Object.entries(D.detail.pendaftar)) pendaftar[id] = r.data;
    // Sesi tes yang sudah ada di rekaman: hasilnya saja yang diperlukan.
    const sesi = [];
    for (const [paketId, h] of Object.entries(D.detail.hasil)) {
      for (const r of h.data) {
        sesi.push({
          id: r.sesi_id, pendaftar_id: r.pendaftar_id, paket_id: Number(paketId),
          soal: [], jawaban: {}, mulai_pada: r.mulai_pada, batas_pada: r.selesai_pada,
          selesai_pada: r.selesai_pada, status: r.status, jumlah_benar: r.jumlah_benar,
          jumlah_soal: r.jumlah_soal, skor: r.skor, per_mapel: r.per_mapel || null,
        });
      }
    }
    return {
      koleksi: salin(koleksi),
      pendaftar: salin(pendaftar),
      pengaturan: salin(a["/api/admin/pengaturan"].data),
      sesi,
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
    if (typeof contoh === "number" || /^(id|urutan|kuota|jumlah|durasi_menit|jumlah_soal|nilai_minimum|jurusan_id|tahun)$/.test(nama)) {
      const n = Number(nilai);
      return nilai === "" || Number.isNaN(n) ? nilai : n;
    }
    if (typeof contoh === "boolean" || /^(aktif|publish|sorot|wajib|acak_soal|dibaca)$/.test(nama)) {
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

  function pdfPendaftar(p, jenis) {
    const judul = jenis === "kartu" ? "KARTU PESERTA TES SELEKSI" : "BUKTI PENDAFTARAN PESERTA DIDIK BARU";
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
      ...(jenis === "kartu"
        ? [[`Ruang / Kursi    : ${p.ruang_ujian || "-"} / ${p.kursi_ujian || "-"}`]]
        : [[`Status           : ${p.status}`]]),
      ["", { jarak: 20 }],
      catatanDemo,
    ]);
  }

  function pdfSurat(s) {
    const j = kol("jenis-surat").find((x) => x.id === s.jenis_id) || {};
    return buatPdf([
      ...kop(),
      [`Nomor    : ${s.nomor_surat}`],
      [`Lampiran : ${s.lampiran || "-"}`],
      [`Perihal  : ${s.perihal}`, { jarak: 10 }],
      ...(s.tujuan ? [["Kepada Yth."], [s.tujuan, { jarak: 10 }]] : []),
      [s.isi, { jarak: 20 }],
      [`${atur("kota") || ""}, ${tanggalPanjang(s.tanggal_surat)}`],
      [j.penanda_tangan_jabatan || "Kepala Sekolah", { jarak: 40 }],
      [j.penanda_tangan_nama || "", { tebal: true }],
      ...(j.penanda_tangan_nip ? [[`NIP. ${j.penanda_tangan_nip}`]] : []),
      ["", { jarak: 20 }],
      ...(s.dibatalkan ? [["SURAT INI DIBATALKAN: " + s.alasan_batal, { tebal: true }]] : []),
      catatanDemo,
    ]);
  }

  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
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

  /* ---------- mata pelajaran baku, sama dengan backend/mapel.go ---------- */

  const DAFTAR_MAPEL = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "IPA", "IPS", "Pendidikan Agama", "Pengetahuan Umum", "Tes Potensi Akademik"];
  const SEBUTAN_MAPEL = {
    mtk: "Matematika", mat: "Matematika", math: "Matematika",
    "b indonesia": "Bahasa Indonesia", bindo: "Bahasa Indonesia", "b indo": "Bahasa Indonesia", "bhs indonesia": "Bahasa Indonesia",
    "b inggris": "Bahasa Inggris", bing: "Bahasa Inggris", "bhs inggris": "Bahasa Inggris", english: "Bahasa Inggris",
    "ilmu pengetahuan alam": "IPA", sains: "IPA", "ilmu pengetahuan sosial": "IPS",
    agama: "Pendidikan Agama", pai: "Pendidikan Agama", umum: "Pengetahuan Umum", tpa: "Tes Potensi Akademik",
  };
  const kunciMapel = (s) => String(s ?? "").replace(/\./g, " ").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  function mapelBaku(s) {
    const k = kunciMapel(s);
    if (!k) return "";
    return DAFTAR_MAPEL.find((m) => kunciMapel(m) === k) || SEBUTAN_MAPEL[k] || "";
  }
  const urutanMapel = (m) => (DAFTAR_MAPEL.indexOf(m) < 0 ? DAFTAR_MAPEL.length : DAFTAR_MAPEL.indexOf(m));

  function stokMapel() {
    const stok = {};
    for (const s of kol("soal")) if (s.aktif) stok[s.mata_pelajaran] = (stok[s.mata_pelajaran] || 0) + 1;
    return stok;
  }

  // Mengembalikan galat per kolom; isi soal dibakukan di tempat.
  function periksaSoal(s) {
    const kolom = {};
    for (const k of ["mata_pelajaran", "pertanyaan", "pilihan_a", "pilihan_b", "pilihan_c", "pilihan_d", "pilihan_e", "jawaban", "pembahasan"]) {
      s[k] = String(s[k] ?? "").trim();
    }
    s.jawaban = s.jawaban.toUpperCase();
    if (!s.mata_pelajaran) kolom.mata_pelajaran = "Mata pelajaran wajib diisi.";
    else if (mapelBaku(s.mata_pelajaran)) s.mata_pelajaran = mapelBaku(s.mata_pelajaran);
    else kolom.mata_pelajaran = `Mata pelajaran "${s.mata_pelajaran.slice(0, 40)}" tidak dikenal. Pilih salah satu: ${DAFTAR_MAPEL.join(", ")}.`;
    if (!s.pertanyaan) kolom.pertanyaan = "Pertanyaan wajib diisi.";
    if (!s.pilihan_a) kolom.pilihan_a = "Pilihan A wajib diisi.";
    if (!s.pilihan_b) kolom.pilihan_b = "Pilihan B wajib diisi.";
    if (!/^[A-E]$/.test(s.jawaban)) kolom.jawaban = "Kunci jawaban harus salah satu dari A sampai E.";
    else if (!s[`pilihan_${s.jawaban.toLowerCase()}`]) kolom.jawaban = `Kunci jawaban ${s.jawaban} menunjuk pilihan yang masih kosong.`;
    return kolom;
  }

  // Membakukan komposisi kiriman formulir; baris berjumlah nol dibuang.
  function periksaKomposisi(daftar, kolom) {
    const bersih = [];
    for (const k of Array.isArray(daftar) ? daftar : []) {
      const n = Number(k.jumlah) || 0;
      if (n === 0) continue;
      const m = mapelBaku(k.mata_pelajaran);
      if (!m) kolom.komposisi = `Mata pelajaran "${k.mata_pelajaran}" tidak dikenal.`;
      else if (bersih.some((x) => x.mata_pelajaran === m)) kolom.komposisi = `${m} tercantum dua kali.`;
      else if (n < 0 || n > 200) kolom.komposisi = `Jumlah soal ${m} harus antara 1 dan 200.`;
      else bersih.push({ mata_pelajaran: m, jumlah: n });
    }
    return bersih.sort((a, b) => urutanMapel(a.mata_pelajaran) - urutanMapel(b.mata_pelajaran));
  }
  const kekuranganStok = (komposisi, stok) =>
    komposisi.filter((k) => (stok[k.mata_pelajaran] || 0) < k.jumlah)
      .map((k) => `${k.mata_pelajaran} baru ${stok[k.mata_pelajaran] || 0} soal aktif, diminta ${k.jumlah}`);

  // Pembaca CSV kecil: tanda kutip ganda, pemisah ; tab atau koma (ditebak
  // dari baris pertama, seperti pemisahCsv di backend).
  function bacaCsv(teks) {
    const pertama = teks.split(/\r?\n/, 1)[0];
    const hitung = (c) => pertama.split(c).length - 1;
    const pemisah = [";", "\t", ","].reduce((a, c) => (hitung(c) > hitung(a) ? c : a), ",");
    const baris = [];
    let sel = "", rek = [], kutip = false;
    for (let i = 0; i < teks.length; i++) {
      const c = teks[i];
      if (kutip) {
        if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
        else if (c === '"') kutip = false;
        else sel += c;
      } else if (c === '"' && sel.trim() === "") { kutip = true; sel = ""; }
      else if (c === pemisah) { rek.push(sel); sel = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && teks[i + 1] === "\n") i++;
        rek.push(sel); baris.push(rek); rek = []; sel = "";
      } else sel += c;
    }
    if (sel !== "" || rek.length) { rek.push(sel); baris.push(rek); }
    return baris;
  }

  function paketBerlaku() {
    const t = Date.now();
    return kol("paket-ujian").find(
      (p) => p.aktif && (!p.mulai || Date.parse(p.mulai) <= t) && (!p.selesai || Date.parse(p.selesai) >= t),
    );
  }

  function ringkasSesi(s, paket) {
    return {
      jumlah_benar: s.jumlah_benar, jumlah_soal: s.jumlah_soal, lulus: s.skor >= paket.nilai_minimum,
      nama_paket: paket.nama, nilai_minimum: paket.nilai_minimum, skor: s.skor, status: s.status,
    };
  }

  function keadaanUjian(p) {
    const k = {
      dibuka: false, boleh_ikut: false, sudah_ikut: false,
      kartu_siap: p.status !== "Menunggu Verifikasi" && p.status !== "Ditolak", hasil: null, alasan: "",
    };
    const paket = paketBerlaku();
    const dibuka = atur("ujian_aktif") === "1" && !!paket;
    k.dibuka = dibuka;
    if (dibuka) Object.assign(k, { nama_paket: paket.nama, durasi_menit: paket.durasi_menit, jumlah_soal: paket.jumlah_soal });
    if (p.status === "Menunggu Verifikasi") k.alasan = "Berkas Anda masih menunggu verifikasi panitia.";
    else if (p.status === "Ditolak") k.alasan = "Pendaftaran Anda tidak dilanjutkan ke tahap tes seleksi.";
    else k.boleh_ikut = dibuka;
    if (!paket) return k;
    const s = S.sesi.find((x) => x.pendaftar_id === p.id && x.paket_id === paket.id);
    if (!s) return k;
    k.sudah_ikut = true;
    if (s.status !== "Berjalan") {
      k.hasil = ringkasSesi(s, paket);
      k.boleh_ikut = false;
    }
    return k;
  }

  function suratUntuk(p) {
    return kol("surat")
      .filter((s) => s.pendaftar_id === p.id && !s.dibatalkan)
      .filter((s) => (kol("jenis-surat").find((j) => j.id === s.jenis_id) || {}).tampil_di_cek_status)
      .map((s) => ({ id: s.id, jenis: s.nama_jenis, nomor_surat: s.nomor_surat, perihal: s.perihal, tanggal_surat: s.tanggal_surat }));
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

  /* ---------- surat ---------- */

  function periodeSurat(atur_ulang, tgl) {
    if (atur_ulang === "bulanan") return tgl.slice(0, 7);
    if (atur_ulang === "tahunan") return tgl.slice(0, 4);
    return "-";
  }

  function susunNomor(format, urut, kode, tgl, tahunAjaran) {
    const [t, b] = tgl.split("-");
    return format.replace(/\{([a-z_]+)(?::(\d))?\}/g, (m, nama, lebar) => {
      switch (nama) {
        case "urut": return String(urut).padStart(Number(lebar) || 0, "0");
        case "kode": return kode;
        case "tahun": return t;
        case "bulan": return b;
        case "bulan_romawi": return ROMAWI[Number(b) - 1];
        case "tahun_ajaran": return tahunAjaran;
        default: return m;
      }
    });
  }

  function nomorBerikut(jenis, tgl) {
    const periode = periodeSurat(jenis.atur_ulang, tgl);
    const urut = Math.max(0, ...kol("surat").filter((s) => s.jenis_id === jenis.id && s.periode === periode).map((s) => s.nomor_urut)) + 1;
    return { periode, nomor_urut: urut, nomor_surat: susunNomor(jenis.format_nomor, urut, jenis.kode, tgl, atur("ppdb_tahun")) };
  }

  function isiNaskah(teks, nilai) {
    return String(teks || "").replace(/\{([a-z_]+)\}/g, (m, k) => (k in nilai ? nilai[k] : m));
  }

  function nilaiNaskah(nomor, tgl, p) {
    const n = {
      nomor_surat: nomor, tanggal_surat: tanggalPanjang(tgl), nama_sekolah: atur("nama_sekolah"), tahun_ajaran: atur("ppdb_tahun"),
    };
    if (p) Object.assign(n, {
      nama_lengkap: p.nama_lengkap, no_registrasi: p.no_registrasi, nisn: p.nisn, jalur: p.jalur,
      peminatan: p.nama_jurusan, sekolah_asal: p.asal_sekolah, status: p.status,
    });
    return n;
  }

  function terbitkanSurat(jenis, isi, u, p) {
    const tgl = String(isi.tanggal_surat || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) galat(400, "Data yang dikirim belum benar.", { tanggal_surat: "Tanggal surat wajib diisi." });
    const n = nomorBerikut(jenis, tgl);
    const nilai = nilaiNaskah(n.nomor_surat, tgl, p);
    const s = {
      id: idBaru(kol("surat")), jenis_id: jenis.id, nama_jenis: jenis.nama, ...n, tanggal_surat: tgl,
      perihal: isiNaskah(isi.perihal ?? jenis.perihal_bawaan, nilai), tujuan: isiNaskah(isi.tujuan ?? jenis.tujuan_bawaan, nilai),
      lampiran: isi.lampiran || "", isi: isiNaskah(isi.isi ?? jenis.isi_bawaan, nilai),
      pendaftar_id: p ? p.id : null, nama_pendaftar: p ? p.nama_lengkap : "", no_registrasi: p ? p.no_registrasi : "",
      dibatalkan: false, alasan_batal: "", dibuat_oleh: u.nama, dibuat: sekarang(), baru: true,
    };
    kol("surat").push(s);
    return s;
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
    soal: {},
    "paket-ujian": { admin: true },
    pengguna: { admin: true },
    "jenis-surat": { admin: true },
  };
  const PESAN_TAMBAH = {
    jurusan: "Peminatan", berita: "Berita", galeri: "Foto", fasilitas: "Fasilitas", halaman: "Halaman",
    "tenaga-pendidik": "Data tenaga pendidik", agenda: "Agenda", "kegiatan-siswa": "Kegiatan", pustaka: "Koleksi pustaka",
    biaya: "Rincian biaya", faq: "Pertanyaan", soal: "Soal", "paket-ujian": "Paket ujian", pengguna: "Pengguna", "jenis-surat": "Jenis surat",
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

  // Soal dan paket ujian diperiksa dengan aturan yang sama dengan backend.
  function periksaKhusus(nama, isi) {
    if (nama === "soal") {
      const kolom = periksaSoal(isi);
      if (Object.keys(kolom).length) galat(422, "Data yang dikirim belum benar.", kolom);
    }
    if (nama === "paket-ujian") {
      const kolom = {};
      isi.komposisi = periksaKomposisi(isi.komposisi, kolom);
      if (isi.komposisi.length) isi.jumlah_soal = isi.komposisi.reduce((n, k) => n + k.jumlah, 0);
      if (isi.aktif && !kolom.komposisi) {
        if (isi.komposisi.length) {
          const kurang = kekuranganStok(isi.komposisi, stokMapel());
          if (kurang.length) kolom.komposisi = `Bank soal belum cukup: ${kurang.join("; ")}. Tambah soal dulu, atau kurangi jumlahnya.`;
        } else {
          const tersedia = kol("soal").filter((x) => x.aktif).length;
          if (tersedia < isi.jumlah_soal) {
            kolom.jumlah_soal = `Bank soal aktif baru berisi ${tersedia} soal, sedangkan paket ini meminta ${isi.jumlah_soal}. Tambah soal atau kurangi jumlahnya.`;
          }
        }
      }
      if (Object.keys(kolom).length) galat(422, "Data yang dikirim belum benar.", kolom);
    }
  }

  async function tambahUmum(nama, badan, u) {
    const cfg = UMUM[nama];
    const daftar = kol(nama);
    const isi = await isiDariBadan(badan, daftar, cfg);
    periksaKhusus(nama, isi);
    if (nama === "pengguna") {
      if (daftar.some((x) => x.username === isi.username)) galat(409, "Nama pengguna sudah dipakai.");
      if (!isi.sandi || String(isi.sandi).length < 8) galat(400, "Data yang dikirim belum benar.", { sandi: "Kata sandi minimal 8 karakter." });
    }
    const judul = isi.judul || isi.nama || isi.pertanyaan;
    if (!judul && nama !== "soal") galat(400, "Data yang dikirim belum benar.", { [isi.judul !== undefined ? "judul" : "nama"]: "Wajib diisi." });
    const butir = { id: idBaru(daftar), ...isi, dibuat: sekarang(), diubah: sekarang() };
    if (nama === "berita") Object.assign(butir, { slug: isi.slug || slugDari(isi.judul), dibaca: 0, penulis: isi.penulis || u.nama });
    if (nama === "halaman" && !isi.slug) butir.slug = slugDari(isi.judul);
    if (nama === "jenis-surat") butir.jumlah_surat = 0;
    if (nama === "paket-ujian") Object.assign(butir, { jumlah_peserta: 0, jumlah_selesai: 0 });
    if (nama === "pengguna") butir.masuk_akhir = null;
    daftar.push(butir);
    return { pesan: `${PESAN_TAMBAH[nama]} berhasil ditambahkan.`, id: butir.id, slug: butir.slug };
  }

  async function ubahUmum(nama, id, badan) {
    const cfg = UMUM[nama];
    const daftar = kol(nama);
    const butir = daftar.find((x) => x.id === id) || tidakAda(PESAN_TAMBAH[nama]);
    const isi = await isiDariBadan(badan, daftar, cfg, butir);
    if (nama === "soal" || nama === "paket-ujian") {
      // Diperiksa dalam keadaan gabungan, lalu nilai yang dibakukan (nama
      // mapel, komposisi, jumlah soal) disalin balik.
      const gabung = { ...butir, ...isi };
      periksaKhusus(nama, gabung);
      Object.assign(isi, gabung);
    }
    if (nama === "pengguna" && !isi.sandi) delete isi.sandi;
    Object.assign(butir, isi, { diubah: sekarang() });
    if (nama === "jenis-surat") for (const s of kol("surat")) if (s.jenis_id === id) s.nama_jenis = butir.nama;
    return { pesan: `${PESAN_TAMBAH[nama]} berhasil diperbarui.` };
  }

  function hapusUmum(nama, id, u) {
    const daftar = kol(nama);
    const i = daftar.findIndex((x) => x.id === id);
    if (i < 0) tidakAda(PESAN_TAMBAH[nama]);
    if (nama === "pengguna" && id === u.id) galat(400, "Anda tidak dapat menghapus akun yang sedang dipakai.");
    if (nama === "jenis-surat" && kol("surat").some((s) => s.jenis_id === id)) {
      galat(409, "Jenis surat ini sudah dipakai surat yang terbit, jadi tidak dapat dihapus. Nonaktifkan saja.");
    }
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
      case "soal": {
        const mp = q.get("mata_pelajaran");
        const d = daftar.filter((s) => (!mp || s.mata_pelajaran === mp) && cocokCari(s, q.get("cari"), ["pertanyaan"]));
        const mapel = [...new Set(kol("soal").map((s) => s.mata_pelajaran))].sort();
        return { data: d, mata_pelajaran: mapel.length ? mapel : null, mapel_baku: DAFTAR_MAPEL, stok: stokMapel(), jumlah_aktif: kol("soal").filter((s) => s.aktif).length };
      }
      case "paket-ujian":
        return {
          data: daftar.map((p) => ({
            ...p,
            komposisi: p.komposisi || [],
            jumlah_peserta: S.sesi.filter((s) => s.paket_id === p.id).length,
            jumlah_selesai: S.sesi.filter((s) => s.paket_id === p.id && s.status !== "Berjalan").length,
          })),
          jumlah_aktif: kol("soal").filter((s) => s.aktif).length,
          mapel_baku: DAFTAR_MAPEL,
          stok: stokMapel(),
        };
      case "pengguna":
        return { ...tambahan("/api/admin/pengguna"), data: daftar.map(tanpaSandi) };
      case "jenis-surat":
        return {
          ...tambahan("/api/admin/jenis-surat"),
          data: urutkan(daftar).map((j) => ({ ...j, jumlah_surat: kol("surat").filter((s) => s.jenis_id === j.id).length })),
        };
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
      ujian: keadaanUjian(p), surat: suratUntuk(p),
    };
  });
  const pdfPendaftarPublik = (jenis) => async ({ badan }) => {
    const p = cariPendaftar(badan.no_registrasi, badan.tanggal_lahir);
    if (jenis === "kartu" && !keadaanUjian(p).kartu_siap) galat(409, "Kartu peserta tersedia setelah berkas Anda diverifikasi panitia.");
    return (!S.diubah[p.id] && (await pdfRekaman(`${jenis}-${p.id}.pdf`))) || pdfPendaftar(p, jenis);
  };
  di("POST", "/api/ppdb/bukti", pdfPendaftarPublik("bukti"));
  di("POST", "/api/ppdb/kartu", pdfPendaftarPublik("kartu"));
  di("POST", "/api/ppdb/surat", async ({ badan }) => {
    const p = cariPendaftar(badan.no_registrasi, badan.tanggal_lahir);
    const s = suratUntuk(p).find((x) => x.id === Number(badan.id)) || tidakAda("Surat");
    return pdfUntukSurat(kol("surat").find((x) => x.id === s.id));
  });
  async function pdfUntukSurat(s) {
    return (!s.baru && !s.disunting && !s.dibatalkan && (await pdfRekaman(`surat-${s.id}.pdf`))) || pdfSurat(s);
  }

  // --- tes seleksi ---
  di("GET", "/api/ppdb/ujian", () => {
    const paket = paketBerlaku();
    const dibuka = atur("ujian_aktif") === "1" && !!paket;
    return {
      dibuka, info: atur("ujian_info"),
      paket: dibuka ? { nama: paket.nama, durasi_menit: paket.durasi_menit, jumlah_soal: paket.jumlah_soal, mulai: paket.mulai, selesai: paket.selesai, keterangan: paket.keterangan, nilai_minimum: paket.nilai_minimum } : null,
    };
  });
  function sesiDariToken(kepala) {
    const m = /^sesi\.(\d+)$/.exec((kepala.get("authorization") || "").replace(/^Bearer\s+/i, ""));
    const s = m && S.sesi.find((x) => x.id === Number(m[1]));
    if (!s) galat(401, "Sesi tes tidak ditemukan. Masuk kembali dari halaman Tes Seleksi.");
    const paket = kol("paket-ujian").find((p) => p.id === s.paket_id);
    if (s.status === "Berjalan" && Date.parse(s.batas_pada) <= Date.now()) nilaiSesi(s, paket, "Waktu Habis");
    return { s, paket };
  }
  function nilaiSesi(s, paket, status = "Selesai") {
    const benar = s.soal.filter((id) => (kol("soal").find((x) => x.id === id) || {}).jawaban === s.jawaban[id]).length;
    Object.assign(s, { status, selesai_pada: sekarang(), jumlah_benar: benar, skor: Math.round((benar / Math.max(1, s.jumlah_soal)) * 10000) / 100 });
  }
  const sisaDetik = (s) => Math.max(0, Math.round((Date.parse(s.batas_pada) - Date.now()) / 1000));
  di("POST", "/api/ppdb/ujian/mulai", ({ badan }) => {
    const p = cariPendaftar(badan.no_registrasi, badan.tanggal_lahir);
    const k = keadaanUjian(p);
    const paket = paketBerlaku();
    if (!k.dibuka) galat(409, "Tes seleksi sedang tidak dibuka.");
    let s = S.sesi.find((x) => x.pendaftar_id === p.id && x.paket_id === paket.id);
    if (s && s.status !== "Berjalan") return { sudah_selesai: true, hasil: ringkasSesi(s, paket) };
    if (!s) {
      if (!k.boleh_ikut) galat(403, k.alasan || "Anda belum dapat mengikuti tes seleksi.");
      const acak = (d) => (paket.acak_soal ? d.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]) : d);
      const aktif = kol("soal").filter((x) => x.aktif);
      const komposisi = paket.komposisi || [];
      let soal;
      if (komposisi.length) {
        // Dikelompokkan per mapel sesuai urutan DaftarMapel, diacak di dalam
        // kelompoknya, seperti mulaiAtauLanjutkanSesi di backend.
        if (kekuranganStok(komposisi, stokMapel()).length) galat(409, "Bank soal belum mencukupi untuk paket ini. Silakan hubungi panitia.");
        soal = komposisi.flatMap((k) => acak(aktif.filter((x) => x.mata_pelajaran === k.mata_pelajaran).map((x) => x.id)).slice(0, k.jumlah));
      } else {
        if (aktif.length < paket.jumlah_soal) galat(409, "Bank soal belum mencukupi untuk paket ini. Silakan hubungi panitia.");
        soal = acak(aktif.map((x) => x.id)).slice(0, paket.jumlah_soal);
      }
      s = {
        id: Math.max(0, ...S.sesi.map((x) => x.id)) + 1, pendaftar_id: p.id, paket_id: paket.id, soal, jawaban: {},
        mulai_pada: sekarang(), batas_pada: new Date(Date.now() + paket.durasi_menit * 60000).toISOString(),
        selesai_pada: null, status: "Berjalan", jumlah_benar: 0, jumlah_soal: soal.length, skor: 0,
      };
      S.sesi.push(s);
    }
    return {
      sudah_selesai: false, token: `sesi.${s.id}`,
      sesi: { id: s.id, batas_pada: s.batas_pada, sisa_detik: sisaDetik(s), jumlah_soal: s.jumlah_soal, nama_paket: paket.nama, nama_peserta: p.nama_lengkap, no_registrasi: p.no_registrasi },
    };
  });
  di("GET", "/api/ppdb/ujian/soal", ({ kepala }) => {
    const { s, paket } = sesiDariToken(kepala);
    if (s.status !== "Berjalan") return { selesai: true, hasil: ringkasSesi(s, paket) };
    return {
      selesai: false, batas_pada: s.batas_pada, sisa_detik: sisaDetik(s), jumlah_soal: s.jumlah_soal, nama_paket: paket.nama,
      terjawab: Object.keys(s.jawaban).length,
      soal: s.soal.map((id, i) => {
        const x = kol("soal").find((y) => y.id === id) || {};
        return {
          soal_id: id, urutan: i + 1, mata_pelajaran: x.mata_pelajaran, pertanyaan: x.pertanyaan, jawaban: s.jawaban[id] || "",
          pilihan: ["a", "b", "c", "d", "e"].filter((h) => x[`pilihan_${h}`]).map((h) => ({ huruf: h.toUpperCase(), teks: x[`pilihan_${h}`] })),
        };
      }),
    };
  });
  di("PATCH", "/api/ppdb/ujian/jawab", ({ kepala, badan }) => {
    const { s } = sesiDariToken(kepala);
    if (s.status !== "Berjalan") galat(409, "Waktu tes sudah habis. Jawaban tidak dapat diubah lagi.");
    if (!s.soal.includes(Number(badan.soal_id))) galat(400, "Soal ini bukan bagian dari tes Anda.");
    s.jawaban[Number(badan.soal_id)] = badan.jawaban;
    return { pesan: "Jawaban tersimpan.", terjawab: Object.keys(s.jawaban).length, sisa_detik: sisaDetik(s) };
  });
  di("POST", "/api/ppdb/ujian/selesai", ({ kepala }) => {
    const { s, paket } = sesiDariToken(kepala);
    if (s.status === "Berjalan") nilaiSesi(s, paket);
    return { pesan: "Ujian selesai. Hasilnya dapat dilihat di halaman Cek Status.", hasil: ringkasSesi(s, paket) };
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
  di("PATCH", "/api/admin/pendaftar/{id}/ruang", ({ kepala, p, badan }) => {
    pengguna(kepala);
    const x = ambilPendaftar(p.id);
    Object.assign(x, { ruang_ujian: badan.ruang_ujian || "", kursi_ujian: badan.kursi_ujian || "" });
    S.diubah[x.id] = true;
    return { pesan: "Ruang dan nomor kursi tersimpan." };
  });
  di("DELETE", "/api/admin/pendaftar/{id}", ({ kepala, p }) => {
    pengguna(kepala, true);
    ambilPendaftar(p.id);
    delete S.pendaftar[p.id];
    return { pesan: "Data pendaftar berhasil dihapus." };
  });
  for (const jenis of ["bukti", "kartu"]) {
    di("GET", `/api/admin/pendaftar/{id}/${jenis}`, async ({ kepala, p }) => {
      pengguna(kepala);
      const x = ambilPendaftar(p.id);
      return (!S.diubah[x.id] && (await pdfRekaman(`${jenis}-${x.id}.pdf`))) || pdfPendaftar(x, jenis);
    });
  }

  // --- surat ---
  di("GET", "/api/admin/surat", ({ kepala, q }) => {
    pengguna(kepala);
    let d = [...kol("surat")].sort((a, b) => String(b.tanggal_surat).localeCompare(String(a.tanggal_surat)) || b.id - a.id);
    const jenis = q.get("jenis_id");
    if (jenis) d = d.filter((s) => String(s.jenis_id) === jenis);
    const pd = q.get("pendaftar_id");
    if (pd) d = d.filter((s) => String(s.pendaftar_id) === pd);
    const th = q.get("tahun");
    if (th) d = d.filter((s) => s.tanggal_surat.startsWith(th));
    d = d.filter((s) => cocokCari(s, q.get("cari"), ["nomor_surat", "perihal", "tujuan", "nama_pendaftar", "no_registrasi"]));
    return halamanan(d, q, 25);
  });
  const ambilJenis = (id) => kol("jenis-surat").find((j) => j.id === Number(id)) || galat(400, "Data yang dikirim belum benar.", { jenis_id: "Jenis surat wajib dipilih." });
  di("GET", "/api/admin/surat/pratinjau-nomor", ({ kepala, q }) => {
    pengguna(kepala);
    const j = ambilJenis(q.get("jenis_id"));
    return nomorBerikut(j, String(q.get("tanggal") || hariIni()).slice(0, 10));
  });
  di("POST", "/api/admin/surat", ({ kepala, badan }) => {
    const u = pengguna(kepala);
    const j = ambilJenis(badan.jenis_id);
    const p = badan.pendaftar_id ? ambilPendaftar(badan.pendaftar_id) : null;
    if (j.untuk_pendaftar && !p) galat(400, "Data yang dikirim belum benar.", { pendaftar_id: "Jenis surat ini untuk pendaftar; pilih pendaftarnya." });
    const s = terbitkanSurat(j, badan, u, p);
    return [201, { pesan: `Surat ${s.nomor_surat} berhasil diterbitkan.`, id: s.id, nomor_surat: s.nomor_surat }];
  });
  di("POST", "/api/admin/surat/massal", ({ kepala, badan }) => {
    const u = pengguna(kepala);
    const j = ambilJenis(badan.jenis_id);
    const tahun = badan.tahun_ajaran || atur("ppdb_tahun");
    let d = semuaPendaftar().filter((p) => p.tahun_ajaran === tahun);
    if (badan.pendaftar_ids && badan.pendaftar_ids.length) d = d.filter((p) => badan.pendaftar_ids.includes(p.id));
    else d = d.filter((p) => p.status === badan.status);
    if (badan.lewati_yang_sudah) d = d.filter((p) => !kol("surat").some((s) => s.jenis_id === j.id && s.pendaftar_id === p.id && !s.dibatalkan));
    d.sort((a, b) => a.no_registrasi.localeCompare(b.no_registrasi));
    if (badan.hanya_hitung) return { jumlah: d.length };
    if (!d.length) galat(400, "Tidak ada pendaftar yang cocok dengan pilihan ini.");
    const terbit = d.map((p) => terbitkanSurat(j, { tanggal_surat: badan.tanggal_surat }, u, p));
    return [201, { jumlah: terbit.length, pesan: `${terbit.length} surat berhasil diterbitkan, nomor ${terbit[0].nomor_surat} sampai ${terbit[terbit.length - 1].nomor_surat}.` }];
  });
  const ambilSurat = (id) => kol("surat").find((s) => s.id === Number(id)) || tidakAda("Surat");
  di("PUT", "/api/admin/surat/{id}", ({ kepala, p, badan }) => {
    pengguna(kepala);
    const s = ambilSurat(p.id);
    if (s.dibatalkan) galat(409, "Surat yang dibatalkan tidak dapat disunting.");
    const tgl = String(badan.tanggal_surat || s.tanggal_surat).slice(0, 10);
    const j = kol("jenis-surat").find((x) => x.id === s.jenis_id);
    if (periodeSurat(j.atur_ulang, tgl) !== s.periode) {
      galat(400, "Data yang dikirim belum benar.", { tanggal_surat: "Tanggal baru berada di periode penomoran lain. Batalkan surat ini lalu terbitkan yang baru." });
    }
    Object.assign(s, { tanggal_surat: tgl, perihal: badan.perihal ?? s.perihal, tujuan: badan.tujuan ?? s.tujuan, lampiran: badan.lampiran ?? s.lampiran, isi: badan.isi ?? s.isi, disunting: true });
    return { pesan: "Surat berhasil diperbarui." };
  });
  di("PATCH", "/api/admin/surat/{id}/batal", ({ kepala, p, badan }) => {
    pengguna(kepala);
    const s = ambilSurat(p.id);
    if (badan.batal && !String(badan.alasan || "").trim()) galat(400, "Data yang dikirim belum benar.", { alasan: "Tuliskan alasan pembatalan." });
    Object.assign(s, { dibatalkan: !!badan.batal, alasan_batal: badan.batal ? badan.alasan : "" });
    return { pesan: badan.batal ? `Surat ${s.nomor_surat} dibatalkan. Nomornya tetap tercatat.` : `Pembatalan surat ${s.nomor_surat} dicabut.` };
  });
  di("DELETE", "/api/admin/surat/{id}", ({ kepala, p }) => {
    pengguna(kepala, true);
    const s = ambilSurat(p.id);
    const terakhir = Math.max(...kol("surat").filter((x) => x.jenis_id === s.jenis_id && x.periode === s.periode).map((x) => x.nomor_urut));
    if (s.nomor_urut !== terakhir) galat(409, "Hanya surat bernomor terakhir yang dapat dihapus, supaya nomor surat tidak berlubang. Batalkan saja surat ini.");
    kol("surat").splice(kol("surat").indexOf(s), 1);
    return { pesan: `Surat ${s.nomor_surat} dihapus.` };
  });
  di("GET", "/api/admin/surat/{id}/pdf", async ({ kepala, p }) => (pengguna(kepala), pdfUntukSurat(ambilSurat(p.id))));

  // --- impor bank soal dari Excel (backend/mapel.go tanganiImporSoal) ---
  di("POST", "/api/admin/soal/impor", ({ kepala, badan }) => {
    pengguna(kepala);
    const isi = String(badan?.csv ?? "").replace(/^﻿/, "").trim();
    if (!isi) galat(422, "Tempelkan atau pilih dulu berkas soalnya.");
    if (isi.length > 4 << 20) galat(422, "Berkas soal terlalu besar. Bagi menjadi beberapa kali impor.");
    const sah = [];
    const masalah = [];
    bacaCsv(isi).forEach((rek, i) => {
      if (!rek.join("").trim()) return;
      if (i === 0 && kunciMapel(rek[0]).replace(/_/g, " ").startsWith("mata pelajaran")) return;
      const medan = ["mata_pelajaran", "pertanyaan", "pilihan_a", "pilihan_b", "pilihan_c", "pilihan_d", "pilihan_e", "jawaban", "pembahasan"];
      const s = Object.fromEntries(medan.map((m, k) => [m, rek[k] ?? ""]));
      const kolom = periksaSoal(s);
      if (Object.keys(kolom).length) masalah.push(`Baris ${i + 1}: ${Object.values(kolom).join(" ")}`);
      else sah.push({ ...s, aktif: !!badan.aktif });
    });
    if (masalah.length) {
      const daftar = masalah.length > 15 ? [...masalah.slice(0, 15), `... dan ${masalah.length - 15} baris lain.`] : masalah;
      throw new Galat(422, { pesan: "Belum ada soal yang dimasukkan. Betulkan baris berikut, lalu impor ulang seluruhnya.", daftar });
    }
    if (!sah.length) galat(422, "Tidak ada satu baris soal pun di dalam berkas.");
    const daftarSoal = kol("soal");
    const perMapel = {};
    for (const s of sah) {
      daftarSoal.push({ id: idBaru(daftarSoal), ...s, dibuat: sekarang(), diubah: sekarang() });
      perMapel[s.mata_pelajaran] = (perMapel[s.mata_pelajaran] || 0) + 1;
    }
    const rincian = DAFTAR_MAPEL.filter((m) => perMapel[m]).map((m) => `${m} ${perMapel[m]}`).join(", ");
    return { pesan: `${sah.length} soal berhasil diimpor (${rincian}).`, masuk: sah.length };
  });

  // Perolehan satu sesi per mata pelajaran, dibaca dari soalnya.
  function nilaiPerMapel(s) {
    if (!(s.soal || []).length) return s.per_mapel || null; // sesi dari rekaman
    const per = {};
    for (const id of s.soal || []) {
      const x = kol("soal").find((y) => y.id === id);
      if (!x) continue;
      const n = (per[x.mata_pelajaran] ||= { mata_pelajaran: x.mata_pelajaran, benar: 0, soal: 0, skor: 0 });
      n.soal++;
      if ((s.jawaban || {})[id] === x.jawaban) n.benar++;
    }
    const hasil = Object.values(per).map((n) => ({ ...n, skor: (n.benar / n.soal) * 100 }));
    return hasil.length ? hasil.sort((a, b) => urutanMapel(a.mata_pelajaran) - urutanMapel(b.mata_pelajaran)) : null;
  }

  // --- hasil tes ---
  di("GET", "/api/admin/paket-ujian/{id}/hasil", ({ kepala, p }) => {
    pengguna(kepala);
    const paket = kol("paket-ujian").find((x) => x.id === Number(p.id)) || tidakAda("Paket ujian");
    const data = S.sesi.filter((s) => s.paket_id === paket.id && S.pendaftar[s.pendaftar_id]).map((s) => {
      const x = S.pendaftar[s.pendaftar_id];
      return {
        sesi_id: s.id, pendaftar_id: x.id, no_registrasi: x.no_registrasi, nama_lengkap: x.nama_lengkap, nama_jurusan: x.nama_jurusan,
        status: s.status, jumlah_benar: s.jumlah_benar, jumlah_soal: s.jumlah_soal, skor: s.skor, lulus: s.skor >= paket.nilai_minimum,
        mulai_pada: s.mulai_pada, selesai_pada: s.selesai_pada, per_mapel: nilaiPerMapel(s),
      };
    });
    const mapel = [...new Set(data.flatMap((x) => (x.per_mapel || []).map((n) => n.mata_pelajaran)))]
      .sort((a, b) => urutanMapel(a) - urutanMapel(b) || a.localeCompare(b));
    return { data, nilai_minimum: paket.nilai_minimum, jumlah_lulus: data.filter((x) => x.lulus && x.status !== "Berjalan").length, mapel };
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

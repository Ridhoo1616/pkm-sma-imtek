// Perakit "Dokumentasi Alur Sistem SMA IMTEK": HTML dengan flowchart SVG,
// lalu dicetak ke PDF A4 lewat Chrome (lihat cetak.mjs).
import { writeFileSync } from "node:fs";

const BIRU = "#0f2a4a";
const GARIS = "#3b4453";
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------------- flowchart ---------------- */

const RH = 76; // jarak antarbaris
const ATAS = 20;
const KOLOM = { u: 220, c: 450, k: 605 }; // utama, cabang, ujung kanan
const LEBAR = { u: 230, c: 170, k: 80 };

function ukuran(n) {
  const baris = n.teks.length;
  const terpanjang = Math.max(...n.teks.map((t) => t.length));
  // Lebar kotak mengikuti baris terpanjang supaya teks tidak pernah keluar garis.
  const lebarTeks = (dasar) => Math.min(n.k === "c" ? 180 : 250, Math.max(dasar, Math.ceil(terpanjang * 6.3 + 24)));
  switch (n.j) {
    case "t": return { w: n.k === "k" ? 80 : 118, h: 34 };
    // Belah ketupat: separuh lebarnya pada tinggi teks harus memuat baris terpanjang.
    case "d": return { w: n.w ?? Math.max(150, Math.ceil(terpanjang * 10.6 + 20)), h: 56 };
    case "doc": return { w: n.w ?? lebarTeks(LEBAR[n.k ?? "u"]), h: 16 * baris + 26 };
    case "db": return { w: n.w ?? lebarTeks(190), h: 16 * baris + 36 };
    default: return { w: n.w ?? lebarTeks(LEBAR[n.k ?? "u"]), h: 16 * baris + 20 };
  }
}

function flowchart(nodes, edges, opsi = {}) {
  const rh = opsi.rh ?? RH;
  const peta = {};
  for (const n of nodes) {
    const u = ukuran(n);
    const x = n.x ?? KOLOM[n.k ?? "u"];
    const y = ATAS + (n.r ?? 0) * rh + 20;
    peta[n.id] = { ...n, ...u, x, y };
  }
  const tinggi = ATAS + Math.max(...nodes.map((n) => n.r)) * rh + 20 + 40;
  const port = (n, s) =>
    s === "t" ? [n.x, n.y - n.h / 2] : s === "b" ? [n.x, n.y + n.h / 2] : s === "l" ? [n.x - n.w / 2, n.y] : [n.x + n.w / 2, n.y];

  let svg = "";
  // garis dulu, supaya kotak menutup ujungnya dengan rapi
  for (const e of edges) {
    const a = peta[e.dari], b = peta[e.ke];
    const [fs, ts] = e.sisi ?? ["b", "t"];
    const [x1, y1] = port(a, fs);
    const [x2, y2] = port(b, ts);
    let d;
    if (e.lewat && e.lewat.length === 1 && e.lewat[0][1] === 0) d = `M${x1} ${y1}H${e.lewat[0][0]}V${y2}H${x2}`;
    else if (e.lewat) d = `M${x1} ${y1}` + e.lewat.map(([x, y]) => `L${x} ${y}`).join("") + `L${x2} ${y2}`;
    else if (fs === "b" && ts === "t") d = Math.abs(x1 - x2) < 1 ? `M${x1} ${y1}V${y2}` : `M${x1} ${y1}V${(y1 + y2) / 2}H${x2}V${y2}`;
    else if ("lr".includes(fs) && "lr".includes(ts) && fs !== ts) d = Math.abs(y1 - y2) < 1 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${(x1 + x2) / 2}V${y2}H${x2}`;
    else if ("lr".includes(fs) && fs === ts) d = `M${x1} ${y1}H${e.saluran}V${y2}H${x2}`;
    else if ("lr".includes(fs) && "tb".includes(ts)) d = `M${x1} ${y1}H${x2}V${y2}`;
    else if ("tb".includes(fs) && "lr".includes(ts)) d = `M${x1} ${y1}V${y2}H${x2}`;
    else if (fs === "t" && ts === "b") d = `M${x1} ${y1}V${y2}`;
    svg += `<path d="${d}" fill="none" stroke="${GARIS}" stroke-width="1.2" marker-end="url(#panah)"/>`;
    if (e.label) {
      let lx, ly, anchor = "start";
      if (fs === "b") [lx, ly, anchor] = e.kiri ? [x1 - 7, y1 + 13, "end"] : [x1 + 7, y1 + 13, "start"];
      else if (fs === "r") [lx, ly] = [x1 + 6, y1 - 6];
      else if (fs === "l") [lx, ly, anchor] = e.saluran !== undefined ? [e.saluran + 4, y1 - 5, "start"] : [x1 - 6, y1 - 6, "end"];
      else [lx, ly] = [x1 + 7, y1 - 8];
      svg += `<text x="${lx}" y="${ly}" font-size="11" font-style="italic" fill="#4a5568" text-anchor="${anchor}">${esc(e.label)}</text>`;
    }
  }
  for (const n of Object.values(peta)) {
    const { x, y, w, h } = n;
    const x0 = x - w / 2, y0 = y - h / 2;
    const warnaTeks = "#2b2850";
    if (n.j === "t") {
      svg += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="#c9ec9f" stroke="#8cc152" stroke-width="1.2"/>`;
    } else if (n.j === "d") {
      svg += `<polygon points="${x},${y0} ${x + w / 2},${y} ${x},${y0 + h} ${x0},${y}" fill="#f5a9c2" stroke="#d9658c" stroke-width="1.2"/>`;
    } else if (n.j === "doc") {
      const yb = y0 + h - 8;
      svg += `<path d="M${x0} ${y0}H${x0 + w}V${yb}C${x0 + w * 0.75} ${yb - 10} ${x0 + w * 0.6} ${yb + 12} ${x0 + w / 2} ${yb + 2}C${x0 + w * 0.35} ${yb - 8} ${x0 + w * 0.2} ${yb + 10} ${x0} ${yb}Z" fill="#ffe3a8" stroke="#e0a93b" stroke-width="1.2"/>`;
    } else if (n.j === "db") {
      const ry = 7;
      svg += `<path d="M${x0} ${y0 + ry}V${y0 + h - ry}A${w / 2} ${ry} 0 0 0 ${x0 + w} ${y0 + h - ry}V${y0 + ry}" fill="#bfe6ee" stroke="#5fb4c6" stroke-width="1.2"/><ellipse cx="${x}" cy="${y0 + ry}" rx="${w / 2}" ry="${ry}" fill="#bfe6ee" stroke="#5fb4c6" stroke-width="1.2"/>`;
    } else {
      svg += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#c9c7f2" stroke="#8b87dc" stroke-width="1.2"/>`;
    }
    const geser = n.j === "doc" ? -4 : n.j === "db" ? 5 : 0;
    const awal = y - ((n.teks.length - 1) * 15) / 2 + 4 + geser;
    n.teks.forEach((t, i) => {
      svg += `<text x="${x}" y="${awal + i * 15}" font-size="11.5" text-anchor="middle" fill="${warnaTeks}"${n.j === "t" ? ' font-weight="600"' : ""}>${esc(t)}</text>`;
    });
  }
  const W = opsi.lebar ?? 660;
  return `<svg viewBox="0 0 ${W} ${tinggi}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"><defs><marker id="panah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${GARIS}"/></marker></defs>${svg}</svg>`;
}

/* ---------------- flowchart per alur ---------------- */

const T = (id, r, teks = "Mulai", k = "u") => ({ id, r, j: "t", teks: [teks], k });
const P = (id, r, teks, k = "u") => ({ id, r, j: "p", teks, k });
const D = (id, r, teks, k = "u") => ({ id, r, j: "d", teks, k });
const DOC = (id, r, teks, k = "u") => ({ id, r, j: "doc", teks, k });
const E = (dari, ke, sisi, label, lain = {}) => ({ dari, ke, sisi, label, ...lain });

/* ---------------- flowchart sistem (besar, berkisi) ---------------- */

const KOL = { A: 130, B: 308, C: 486, D: 664 };
const SAL = { kiri: 14, AB: 219, BC: 397, CD: 575 };
const G = (id, kol, r, j, teks) => ({ id, r, j, teks: Array.isArray(teks) ? teks : [teks], x: KOL[kol], w: j === "p" || j === "doc" || j === "db" ? 146 : j === "t" ? 104 : undefined });

const sistemPublik = flowchart(
  [
    G("s", "A", 0, "t", "Mulai"),
    G("buka", "A", 1, "p", ["Membuka situs", "SMA IMTEK"]),
    G("qd", "A", 2, "d", ["Mendaftar", "PPDB?"]),
    G("qb", "A", 3, "d", ["PPDB sedang", "dibuka?"]),
    G("form", "A", 4, "p", ["Mengisi formulir 5", "tahap dan berkas"]),
    G("ql", "A", 5, "d", ["Isian dan", "berkas lengkap?"]),
    G("qn", "A", 6, "d", ["NISN sudah", "terdaftar?"]),
    G("simpan", "A", 7, "p", ["Sistem membuat", "nomor registrasi"]),
    G("bukti", "A", 8, "doc", ["Bukti pendaftaran", "(PDF)"]),
    G("tunggu", "A", 9, "p", ["Menunggu", "verifikasi panitia"]),
    G("qc", "B", 2, "d", ["Cek status", "pendaftaran?"]),
    G("isi", "B", 3, "p", ["Mengisi nomor reg.", "dan tanggal lahir"]),
    G("qk", "B", 4, "d", ["Data cocok?"]),
    G("lihat", "B", 5, "p", ["Melihat status,", "catatan, nilai tes"]),
    G("qt", "B", 6, "d", ["Boleh ikut", "tes?"]),
    G("unduh", "B", 7, "p", ["Mengunduh bukti,", "kartu, dan surat"]),
    G("x2", "B", 8, "t", "Selesai"),
    G("qq", "C", 2, "d", ["Ada", "pertanyaan?"]),
    G("tanya", "C", 3, "p", ["Bertanya lewat", "\"Butuh bantuan?\""]),
    G("qj", "C", 4, "d", ["Jawaban", "ditemukan?"]),
    G("baca", "C", 5, "p", ["Membaca jawaban"]),
    G("tes", "C", 6, "p", ["Mengerjakan", "tes seleksi"]),
    G("qw", "C", 7, "d", ["Selesai atau", "waktu habis?"]),
    G("nilai", "C", 8, "p", ["Sistem menghitung", "nilai otomatis"]),
    G("info", "D", 2, "p", ["Membaca profil,", "berita, galeri"]),
    G("x1", "D", 3, "t", "Selesai"),
    G("pesan", "D", 4, "p", ["Mengirim pesan", "lewat Kontak"]),
    G("x3", "D", 5, "t", "Selesai"),
  ],
  [
    E("s", "buka"), E("buka", "qd"),
    E("qd", "qc", ["r", "l"], "Tidak"), E("qd", "qb", ["b", "t"], "Ya"),
    E("qc", "qq", ["r", "l"], "Tidak"), E("qc", "isi", ["b", "t"], "Ya"),
    E("qq", "info", ["r", "l"], "Tidak"), E("qq", "tanya", ["b", "t"], "Ya"), E("info", "x1"),
    E("qb", "buka", ["l", "l"], "Tidak", { saluran: SAL.kiri }), E("qb", "form", ["b", "t"], "Ya"),
    E("form", "ql"), E("ql", "form", ["l", "l"], "Tidak", { saluran: SAL.kiri }), E("ql", "qn", ["b", "t"], "Ya"),
    E("qn", "isi", ["r", "l"], "Ya", { lewat: [[SAL.AB, 0]] }), E("qn", "simpan", ["b", "t"], "Tidak"),
    E("simpan", "bukti"), E("bukti", "tunggu"), E("tunggu", "isi", ["r", "l"], null, { lewat: [[SAL.AB, 0]] }),
    E("isi", "qk"), E("qk", "isi", ["r", "r"], "Tidak", { saluran: SAL.BC }), E("qk", "lihat", ["b", "t"], "Ya"),
    E("lihat", "qt"), E("qt", "tes", ["r", "l"], "Ya"), E("qt", "unduh", ["b", "t"], "Tidak"), E("unduh", "x2"),
    E("tes", "qw"), E("qw", "tes", ["r", "r"], "Tidak", { saluran: SAL.CD }), E("qw", "nilai", ["b", "t"], "Ya"),
    E("nilai", "unduh", ["l", "r"], null, { lewat: [[SAL.BC, 0]] }),
    E("tanya", "qj"), E("qj", "pesan", ["r", "l"], "Tidak"), E("qj", "baca", ["b", "t"], "Ya"),
    E("pesan", "x3"), E("baca", "x3", ["r", "l"]),
  ],
  { lebar: 752, rh: 74 },
);

const sistemAdmin = flowchart(
  [
    G("s", "A", 0, "t", "Mulai"),
    G("hal", "A", 1, "p", ["Membuka halaman", "Masuk Petugas"]),
    G("isi", "A", 2, "p", ["Mengisi nama", "pengguna dan sandi"]),
    G("q5", "A", 3, "d", ["Gagal 5 kali", "dalam 10 menit?"]),
    G("qs", "A", 4, "d", ["Sandi", "cocok?"]),
    G("dasbor", "A", 5, "p", ["Dasbor panel"]),
    G("qv", "A", 6, "d", ["Verifikasi", "pendaftar?"]),
    G("rinci", "A", 7, "p", ["Membuka rincian,", "memeriksa berkas"]),
    G("qbk", "A", 8, "d", ["Berkas", "lengkap?"]),
    G("verif", "A", 9, "p", ["Terverifikasi,", "pendaftar ikut tes"]),
    G("status", "A", 10, "p", ["Menetapkan status", "akhir pendaftar"]),
    G("notif", "A", 11, "p", ["Sistem menyusun", "notifikasi"]),
    G("kirim", "A", 12, "p", ["Meninjau dan", "mengirim WhatsApp"]),
    G("xa", "A", 13, "t", "Selesai"),
    G("tolak", "B", 3, "p", ["Ditolak sementara,", "coba 10 menit lagi"]),
    G("qsr", "B", 6, "d", ["Menerbitkan", "surat?"]),
    G("jenis", "B", 7, "p", ["Memilih jenis", "surat dan tanggal"]),
    G("qm", "B", 8, "d", ["Banyak", "pendaftar?"]),
    G("naskah", "B", 9, "p", ["Menulis perihal,", "tujuan, dan isi"]),
    G("nomor", "B", 10, "p", ["Sistem memberi", "nomor urut"]),
    G("pdf", "B", 11, "doc", ["Surat PDF", "berkop sekolah"]),
    G("xb", "B", 12, "t", "Selesai"),
    G("x0", "C", 3, "t", "Selesai"),
    G("qk", "C", 6, "d", ["Mengelola", "konten?"]),
    G("ubah", "C", 7, "p", ["Mengubah berita,", "galeri, halaman"]),
    G("qvl", "C", 8, "d", ["Isian dan", "foto valid?"]),
    G("db", "C", 9.3, "db", ["Disimpan ke", "basis data"]),
    G("tampil", "C", 10.3, "p", ["Tampil di", "situs publik"]),
    G("xc", "C", 11.3, "t", "Selesai"),
    G("atur", "D", 5, "p", ["Mengatur PPDB, tes,", "identitas (admin)"]),
    G("qa", "D", 6, "d", ["Mengubah", "pengaturan?"]),
    G("keluar", "D", 7, "p", ["Keluar dari panel"]),
    G("xd", "D", 8, "t", "Selesai"),
  ],
  [
    E("s", "hal"), E("hal", "isi"), E("isi", "q5"),
    E("q5", "tolak", ["r", "l"], "Ya"), E("tolak", "x0", ["r", "l"]), E("q5", "qs", ["b", "t"], "Tidak"),
    E("qs", "isi", ["l", "l"], "Tidak", { saluran: SAL.kiri }), E("qs", "dasbor", ["b", "t"], "Ya"),
    E("dasbor", "qv"),
    E("qv", "qsr", ["r", "l"], "Tidak"), E("qv", "rinci", ["b", "t"], "Ya"),
    E("qsr", "qk", ["r", "l"], "Tidak"), E("qsr", "jenis", ["b", "t"], "Ya"),
    E("qk", "qa", ["r", "l"], "Tidak"), E("qk", "ubah", ["b", "t"], "Ya"),
    E("qa", "atur", ["t", "b"], "Ya"), E("qa", "keluar", ["b", "t"], "Tidak"), E("keluar", "xd"),
    E("atur", "dasbor", ["l", "r"]),
    E("rinci", "qbk"), E("qbk", "status", ["l", "l"], "Tidak", { saluran: SAL.kiri }), E("qbk", "verif", ["b", "t"], "Ya"),
    E("verif", "status"), E("status", "notif"), E("notif", "kirim"), E("kirim", "xa"),
    E("jenis", "qm"), E("qm", "nomor", ["r", "r"], "Ya", { saluran: SAL.BC }), E("qm", "naskah", ["b", "t"], "Tidak"),
    E("naskah", "nomor"), E("nomor", "pdf"), E("pdf", "xb"),
    E("ubah", "qvl"), E("qvl", "ubah", ["r", "r"], "Tidak", { saluran: SAL.CD }), E("qvl", "db", ["b", "t"], "Ya"),
    E("db", "tampil"), E("tampil", "xc"),
  ],
  { lebar: 752, rh: 70 },
);

const umum = flowchart(
  [
    T("u0", 0),
    P("u1", 1, ["Pengunjung membuka situs sekolah"]),
    D("u2", 2, ["Ingin mendaftar", "PPDB?"]),
    P("u2t", 2, ["Membaca profil, berita,", "galeri, dan tanya jawab"], "c"),
    T("u2s", 2, "Selesai", "k"),
    P("u3", 3, ["Mengisi formulir pendaftaran", "(Bagian 6)"]),
    P("u4", 4, ["Panitia memverifikasi berkas", "(Bagian 9)"]),
    D("u5", 5, ["Lolos", "verifikasi?"]),
    P("u5t", 5, ["Status Ditolak"], "c"),
    P("u6", 6, ["Mengikuti tes seleksi online", "(Bagian 12)"]),
    P("u7", 7, ["Panitia menetapkan hasil:", "Diterima, Cadangan, Ditolak"]),
    P("u8", 8, ["Surat dan notifikasi dikirim", "(Bagian 10 dan 13)"]),
    P("u9", 9, ["Pendaftar melihat hasil di", "Cek Status (Bagian 7)"]),
    T("u10", 10, "Selesai"),
  ],
  [
    E("u0", "u1"), E("u1", "u2"),
    E("u2", "u2t", ["r", "l"], "Tidak"), E("u2t", "u2s", ["r", "l"]),
    E("u2", "u3", ["b", "t"], "Ya"), E("u3", "u4"), E("u4", "u5"),
    E("u5", "u5t", ["r", "l"], "Tidak"), E("u5", "u6", ["b", "t"], "Ya"),
    E("u6", "u7"), E("u7", "u8"), E("u8", "u9"), E("u9", "u10"),
    E("u5t", "u9", ["r", "r"], null, { saluran: 600 }),
  ],
);

const masuk = flowchart(
  [
    T("m0", 0),
    P("m1", 1, ["Petugas membuka halaman", "Masuk Petugas"]),
    P("m2", 2, ["Petugas mengisi nama", "pengguna dan kata sandi"]),
    D("m3", 3, ["Gagal 5 kali dalam", "10 menit terakhir?"]),
    P("m3y", 3, ["Sistem menolak sementara;", "coba lagi 10 menit"], "c"),
    T("m3s", 3, "Selesai", "k"),
    D("m4", 4.25, ["Nama pengguna dan", "sandi cocok?"]),
    P("m5", 5.25, ["Sistem membuat token sesi"]),
    D("m6", 6.25, ["Peran akun?"]),
    P("m6t", 6.25, ["Menu tanpa pengaturan,", "pengguna, dan data master"], "c"),
    P("m7", 7.25, ["Seluruh menu panel terbuka"]),
    P("m8", 8.25, ["Dasbor ditampilkan"]),
    T("m9", 9.25, "Selesai"),
  ],
  [
    E("m0", "m1"), E("m1", "m2"), E("m2", "m3"),
    E("m3", "m3y", ["r", "l"], "Ya"), E("m3y", "m3s", ["r", "l"]),
    E("m3", "m4", ["b", "t"], "Tidak"),
    E("m4", "m2", ["l", "l"], "Tidak", { saluran: 50 }),
    E("m4", "m5", ["b", "t"], "Ya"), E("m5", "m6"),
    E("m6", "m6t", ["r", "l"], "Panitia"), E("m6", "m7", ["b", "t"], "Admin"),
    E("m7", "m8"), E("m6t", "m8", ["b", "r"]), E("m8", "m9"),
  ],
);

const pengaturan = flowchart(
  [
    T("p0", 0),
    P("p1", 1, ["Admin membuka", "Pengaturan Sekolah"]),
    P("p2", 2, ["Admin mengisi tahun ajaran,", "tanggal mulai dan selesai"]),
    P("p3", 3, ["Admin mengatur saklar", "PPDB: buka atau tutup"]),
    P("p4", 4, ["Pengunjung membuka", "halaman PPDB"]),
    D("p5", 5, ["Hari ini lewat", "tanggal selesai?"]),
    P("p5y", 5, ["Keadaan: sudah ditutup"], "c"),
    D("p6", 6.25, ["Hari ini sebelum", "tanggal mulai?"]),
    P("p6y", 6.25, ["Keadaan: belum dimulai"], "c"),
    D("p7", 7.5, ["Saklar PPDB", "posisi buka?"]),
    P("p7t", 7.5, ["Keadaan: ditutup"], "c"),
    P("p8", 8.5, ["Keadaan: dibuka; formulir", "menerima pendaftaran"]),
    P("p9", 9.5, ["Kalimat keadaan tampil di", "Beranda dan halaman PPDB"]),
    T("p10", 10.5, "Selesai"),
  ],
  [
    E("p0", "p1"), E("p1", "p2"), E("p2", "p3"), E("p3", "p4"), E("p4", "p5"),
    E("p5", "p5y", ["r", "l"], "Ya"), E("p5", "p6", ["b", "t"], "Tidak"),
    E("p6", "p6y", ["r", "l"], "Ya"), E("p6", "p7", ["b", "t"], "Tidak"),
    E("p7", "p7t", ["r", "l"], "Tidak"), E("p7", "p8", ["b", "t"], "Ya"),
    E("p8", "p9"), E("p9", "p10"),
    E("p5y", "p9", ["r", "r"], null, { saluran: 600 }),
    E("p6y", "p9", ["r", "r"], null, { saluran: 600 }),
    E("p7t", "p9", ["r", "r"], null, { saluran: 600 }),
  ],
);

const pendaftaran = flowchart(
  [
    T("a0", 0),
    P("a1", 1, ["Pendaftar membuka", "halaman Daftar PPDB"]),
    D("a2", 2, ["PPDB sedang", "dibuka?"]),
    P("a2t", 2, ["Sistem menampilkan", "keadaan dan jadwal"], "c"),
    T("a2s", 2, "Selesai", "k"),
    P("a3", 3, ["Tahap 1: Jalur dan data diri"]),
    P("a4", 4, ["Tahap 2: Alamat dan kontak"]),
    P("a5", 5, ["Tahap 3: Sekolah asal dan orang tua"]),
    P("a6", 6, ["Tahap 4: Unggah 5 dokumen"]),
    P("a7", 7, ["Tahap 5: Sumber informasi,", "pernyataan, lalu kirim"]),
    D("a8", 8, ["Isian dan berkas", "lengkap?"]),
    P("a8t", 8, ["Sistem membuka tahap", "yang belum benar"], "c"),
    D("a9", 9.25, ["Sudah terdaftar", "(NISN sama)?"]),
    P("a9y", 9.25, ["Sistem menolak dan", "mengarahkan ke Cek Status"], "c"),
    T("a9s", 9.25, "Selesai", "k"),
    P("a10", 10.45, ["Sistem menyimpan data dan", "membuat nomor registrasi"]),
    DOC("a11", 11.45, ["Bukti pendaftaran (PDF)"]),
    T("a12", 12.45, "Selesai"),
  ],
  [
    E("a0", "a1"), E("a1", "a2"),
    E("a2", "a2t", ["r", "l"], "Tidak"), E("a2t", "a2s", ["r", "l"]),
    E("a2", "a3", ["b", "t"], "Ya"), E("a3", "a4"), E("a4", "a5"), E("a5", "a6"), E("a6", "a7"), E("a7", "a8"),
    E("a8", "a8t", ["r", "l"], "Tidak"), E("a8t", "a3", ["t", "r"]),
    E("a8", "a9", ["b", "t"], "Ya"),
    E("a9", "a9y", ["r", "l"], "Ya"), E("a9y", "a9s", ["r", "l"]),
    E("a9", "a10", ["b", "t"], "Tidak"), E("a10", "a11"), E("a11", "a12"),
  ],
  { rh: 66 },
);

const cek = flowchart(
  [
    T("k0", 0),
    P("k1", 1, ["Pendaftar membuka Cek Status"]),
    P("k2", 2, ["Mengisi nomor registrasi", "dan tanggal lahir"]),
    D("k3", 3, ["Data cocok?"]),
    P("k3t", 3, ["Sistem menampilkan", "data tidak ditemukan"], "c"),
    P("k4", 4, ["Sistem menampilkan status, catatan", "panitia, nilai tes, dan pengumuman"]),
    DOC("k5", 5, ["Bukti pendaftaran (PDF)"]),
    D("k6", 6, ["Berkas sudah", "diverifikasi?"]),
    DOC("k6y", 6, ["Kartu peserta tes (PDF)"], "c"),
    D("k7", 7.4, ["Ada surat untuk", "pendaftar?"]),
    DOC("k7y", 7.4, ["Surat dari sekolah (PDF)"], "c"),
    T("k8", 8.6, "Selesai"),
  ],
  [
    E("k0", "k1"), E("k1", "k2"), E("k2", "k3"),
    E("k3", "k3t", ["r", "l"], "Tidak"), E("k3t", "k2", ["t", "r"]),
    E("k3", "k4", ["b", "t"], "Ya"), E("k4", "k5"), E("k5", "k6"),
    E("k6", "k6y", ["r", "l"], "Ya"), E("k6", "k7", ["b", "t"], "Tidak"), E("k6y", "k7", ["b", "t"]),
    E("k7", "k7y", ["r", "l"], "Ya"), E("k7", "k8", ["b", "t"], "Tidak"), E("k7y", "k8", ["b", "r"]),
  ],
);

const kelola = flowchart(
  [
    T("l0", 0),
    P("l1", 1, ["Panitia membuka menu Pendaftar"]),
    P("l2", 2, ["Menyaring menurut status, jalur,", "sumber, tahun ajaran, atau nama"]),
    D("l3", 3, ["Ekspor data?"]),
    DOC("l3y", 3, ["Berkas CSV pendaftar"], "c"),
    T("l3s", 3, "Selesai", "k"),
    D("l4", 4.25, ["Pendaftar datang", "langsung ke sekolah?"]),
    P("l4y", 4.25, ["Panitia mengisi formulir", "Tambah Pendaftar"], "c"),
    P("l5y", 5.25, ["Sistem membuat", "nomor registrasi"], "c"),
    P("l5", 5.25, ["Panitia membuka rincian pendaftar"]),
    P("l6", 6.25, ["Memeriksa berkas unggahan"]),
    P("l7", 7.25, ["Mengatur ruang dan kursi tes"]),
    P("l8", 8.25, ["Mengubah status dan", "catatan pendaftar"]),
    T("l9", 9.25, "Selesai"),
  ],
  [
    E("l0", "l1"), E("l1", "l2"), E("l2", "l3"),
    E("l3", "l3y", ["r", "l"], "Ya"), E("l3y", "l3s", ["r", "l"]),
    E("l3", "l4", ["b", "t"], "Tidak"),
    E("l4", "l4y", ["r", "l"], "Ya"), E("l4y", "l5y"), E("l5y", "l9", ["b", "r"]),
    E("l4", "l5", ["b", "t"], "Tidak"), E("l5", "l6"), E("l6", "l7"), E("l7", "l8"), E("l8", "l9"),
  ],
);

const verifikasi = flowchart(
  [
    T("b0", 0),
    P("b1", 1, ["Panitia membuka rincian pendaftar", "dan memeriksa data serta berkas"]),
    D("b3", 2, ["Berkas lengkap", "dan sesuai?"]),
    P("b3t", 2, ["Status Ditolak,", "catatan untuk pendaftar"], "c"),
    P("b4", 3, ["Status Terverifikasi"]),
    P("b5", 4, ["Pendaftar mengikuti", "tes seleksi online"]),
    D("b6", 5, ["Nilai mencapai", "batas minimum?"]),
    P("b6t", 5, ["Status Ditolak"], "c"),
    D("b7", 6.25, ["Kuota peminatan", "masih tersedia?"]),
    P("b7t", 6.25, ["Status Cadangan"], "c"),
    P("b8", 7.25, ["Status Diterima"]),
    P("b9", 8.25, ["Panitia menerbitkan surat", "keterangan diterima"]),
    P("b10", 9.25, ["Sistem menyusun notifikasi", "untuk ditinjau panitia"]),
    P("b11", 10.25, ["Pendaftar melihat hasil", "di Cek Status"]),
    T("b12", 11.25, "Selesai"),
  ],
  [
    E("b0", "b1"), E("b1", "b3"),
    E("b3", "b3t", ["r", "l"], "Tidak"), E("b3", "b4", ["b", "t"], "Ya"),
    E("b4", "b5"), E("b5", "b6"),
    E("b6", "b6t", ["r", "l"], "Tidak"), E("b6", "b7", ["b", "t"], "Ya"),
    E("b7", "b7t", ["r", "l"], "Tidak"), E("b7", "b8", ["b", "t"], "Ya"),
    E("b8", "b9"), E("b9", "b10"), E("b10", "b11"), E("b11", "b12"),
    E("b3t", "b10", ["r", "r"], null, { saluran: 600 }),
    E("b6t", "b10", ["r", "r"], null, { saluran: 600 }),
    E("b7t", "b10", ["r", "r"], null, { saluran: 600 }),
  ],
  { rh: 72 },
);

const notifikasi = flowchart(
  [
    T("n0", 0),
    D("n1", 1, ["Asal pesan?"]),
    P("n1m", 1, ["Panitia menulis", "notifikasi baru"], "c"),
    P("n2", 2, ["Sistem menyusun pesan dari", "naskah di Pengaturan"]),
    P("n3", 3, ["Pesan tercatat berstatus", "Menunggu di menu Notifikasi"]),
    P("n4", 4, ["Panitia meninjau isi pesan"]),
    D("n5", 5, ["Perlu diubah?"]),
    P("n5y", 5, ["Panitia menyunting pesan"], "c"),
    D("n6", 6.3, ["Gateway WhatsApp", "sudah disetel?"]),
    P("n6t", 6.3, ["WhatsApp terbuka dengan", "pesan terisi; panitia kirim"], "c"),
    P("n7", 7.3, ["Sistem mengirim otomatis"]),
    P("n8", 8.3, ["Status Terkirim dan", "waktu kirim tercatat"]),
    T("n9", 9.3, "Selesai"),
  ],
  [
    E("n0", "n1"),
    E("n1", "n1m", ["r", "l"], "Manual"), E("n1m", "n3", ["b", "r"]),
    E("n1", "n2", ["b", "t"], "Status diubah"), E("n2", "n3"), E("n3", "n4"), E("n4", "n5"),
    E("n5", "n5y", ["r", "l"], "Ya"), E("n5y", "n6", ["b", "t"]),
    E("n5", "n6", ["b", "t"], "Tidak"),
    E("n6", "n6t", ["r", "l"], "Tidak"), E("n6", "n7", ["b", "t"], "Ya"),
    E("n7", "n8"), E("n6t", "n8", ["b", "r"]), E("n8", "n9"),
  ],
);

const persiapanTes = flowchart(
  [
    T("s0", 0),
    P("s1", 1, ["Panitia menulis soal di Bank Soal:", "pilihan A-E, kunci, pembahasan"]),
    D("s2", 2, ["Jumlah soal aktif", "sudah cukup?"]),
    P("s3", 3, ["Admin membuat paket tes: durasi,", "jumlah soal, nilai minimum"]),
    P("s4", 4, ["Admin menentukan jendela", "waktu mulai dan selesai"]),
    P("s5", 5, ["Admin menyalakan tes di Pengaturan", "dan menulis keterangan tes"]),
    D("s6", 6, ["Hari ini dalam", "jendela waktu paket?"]),
    P("s6t", 6, ["Tes belum dibuka", "bagi pendaftar"], "c"),
    T("s6s", 6, "Selesai", "k"),
    P("s7", 7, ["Halaman Tes Seleksi terbuka", "bagi pendaftar terverifikasi"]),
    T("s8", 8, "Selesai"),
  ],
  [
    E("s0", "s1"), E("s1", "s2"),
    E("s2", "s1", ["l", "l"], "Tidak", { saluran: 50 }),
    E("s2", "s3", ["b", "t"], "Ya"), E("s3", "s4"), E("s4", "s5"), E("s5", "s6"),
    E("s6", "s6t", ["r", "l"], "Tidak"), E("s6t", "s6s", ["r", "l"]),
    E("s6", "s7", ["b", "t"], "Ya"), E("s7", "s8"),
  ],
);

const tes = flowchart(
  [
    T("c0", 0),
    P("c1", 1, ["Pendaftar masuk dengan nomor", "registrasi dan tanggal lahir"]),
    D("c2", 2, ["Data cocok?"]),
    P("c2t", 2, ["Sistem menampilkan", "data tidak ditemukan"], "c"),
    D("c3", 3, ["Tes dibuka dan", "sudah diverifikasi?"]),
    P("c3t", 3, ["Sistem menampilkan", "alasannya"], "c"),
    T("c3s", 3, "Selesai", "k"),
    D("c4", 4, ["Sudah pernah", "menyelesaikan tes?"]),
    P("c4y", 4, ["Sistem menampilkan", "nilai sebelumnya"], "c"),
    T("c4s", 4, "Selesai", "k"),
    P("c5", 5, ["Sistem membuat sesi dan", "mulai menghitung waktu"]),
    P("c6", 6, ["Pendaftar menjawab soal;", "jawaban tersimpan tiap dipilih"]),
    D("c7", 7, ["Selesai ditekan atau", "waktu habis?"]),
    P("c8", 8, ["Sistem menghitung nilai dan", "menentukan lulus atau tidak"]),
    P("c10", 9, ["Nilai tampil di Cek Status", "dan di menu Tes Seleksi"]),
    T("c11", 10, "Selesai"),
  ],
  [
    E("c0", "c1"), E("c1", "c2"),
    E("c2", "c2t", ["r", "l"], "Tidak"), E("c2t", "c1", ["t", "r"]),
    E("c2", "c3", ["b", "t"], "Ya"),
    E("c3", "c3t", ["r", "l"], "Tidak"), E("c3t", "c3s", ["r", "l"]),
    E("c3", "c4", ["b", "t"], "Ya"),
    E("c4", "c4y", ["r", "l"], "Ya"), E("c4y", "c4s", ["r", "l"]),
    E("c4", "c5", ["b", "t"], "Tidak"), E("c5", "c6"), E("c6", "c7"),
    E("c7", "c6", ["l", "l"], "Tidak", { saluran: 60 }),
    E("c7", "c8", ["b", "t"], "Ya"), E("c8", "c10"), E("c10", "c11"),
  ],
);

const surat = flowchart(
  [
    T("d0", 0),
    D("d1", 1, ["Jenis surat", "sudah ada?"]),
    P("d1t", 1, ["Admin membuat jenis surat", "dan format nomornya"], "c"),
    D("d2", 2, ["Untuk satu surat atau", "banyak pendaftar?"]),
    P("d3", 3, ["Panitia mengisi tanggal,", "perihal, tujuan, dan isi"]),
    P("d3b", 3, ["Panitia memilih status", "pendaftar penerima"], "c"),
    P("d4", 4, ["Sistem menampilkan", "pratinjau nomor"]),
    P("d4b", 4, ["Sistem menghitung jumlah", "surat yang akan terbit"], "c"),
    P("d5", 5, ["Panitia menyimpan surat"]),
    P("d5b", 5, ["Panitia mengonfirmasi"], "c"),
    P("d6", 6, ["Sistem mengunci penomoran dan", "memberi nomor urut berikutnya"]),
    DOC("d7", 7, ["Surat PDF berkop sekolah"]),
    D("d8", 8, ["Ditampilkan di", "Cek Status?"]),
    P("d8t", 8, ["Surat tersimpan di", "Buku Agenda Surat"], "c"),
    P("d9", 9, ["Pendaftar mengunduh surat", "dari halaman Cek Status"]),
    T("d10", 10, "Selesai"),
  ],
  [
    E("d0", "d1"),
    E("d1", "d1t", ["r", "l"], "Tidak"), E("d1t", "d2", ["b", "t"]),
    E("d1", "d2", ["b", "t"], "Ya", { kiri: true }),
    E("d2", "d3", ["b", "t"], "Satu"), E("d2", "d3b", ["r", "t"], "Banyak"),
    E("d3", "d4"), E("d4", "d5"), E("d3b", "d4b"), E("d4b", "d5b"),
    E("d5", "d6"), E("d5b", "d6", ["b", "r"]),
    E("d6", "d7"), E("d7", "d8"),
    E("d8", "d8t", ["r", "l"], "Tidak"), E("d8", "d9", ["b", "t"], "Ya"),
    E("d9", "d10"), E("d8t", "d10", ["b", "r"]),
  ],
);

const konten = flowchart(
  [
    T("e0", 0),
    P("e1", 1, ["Petugas masuk ke panel admin"]),
    P("e2", 2, ["Petugas memilih menu, misalnya", "Berita, Galeri, atau Halaman"]),
    D("e3", 3, ["Akun berhak atas", "menu ini?"]),
    P("e3t", 3, ["Menu tidak tersedia", "(khusus admin)"], "c"),
    T("e3s", 3, "Selesai", "k"),
    P("e4", 4, ["Petugas menambah, mengubah,", "atau menghapus isi"]),
    D("e5", 5, ["Isian dan foto", "valid?"]),
    P("e5t", 5, ["Sistem menampilkan", "kesalahan"], "c"),
    { id: "e6", r: 6, j: "db", teks: ["Sistem menyimpan ke basis", "data dan folder unggahan"], w: 230 },
    P("e7", 7, ["Situs publik menampilkan", "perubahan (paling lama ±15 detik)"]),
    T("e8", 8, "Selesai"),
  ],
  [
    E("e0", "e1"), E("e1", "e2"), E("e2", "e3"),
    E("e3", "e3t", ["r", "l"], "Tidak"), E("e3t", "e3s", ["r", "l"]),
    E("e3", "e4", ["b", "t"], "Ya"), E("e4", "e5"),
    E("e5", "e5t", ["r", "l"], "Tidak"), E("e5t", "e4", ["t", "r"]),
    E("e5", "e6", ["b", "t"], "Ya"), E("e6", "e7"), E("e7", "e8"),
  ],
);

const tanya = flowchart(
  [
    T("f0", 0),
    P("f1", 1, ["Pengunjung bertanya lewat", "tombol \"Butuh bantuan?\""]),
    P("f2", 2, ["Sistem mencocokkan dengan", "daftar Tanya Jawab"]),
    D("f3", 3, ["Jawaban", "ditemukan?"]),
    P("f3t", 3, ["Pertanyaan dicatat di", "menu Belum Terjawab"], "c"),
    P("f4t", 4, ["Panitia menambahkan", "jawabannya ke Tanya Jawab"], "c"),
    P("f4", 4, ["Sistem menampilkan jawaban"]),
    T("f5", 5, "Selesai"),
  ],
  [
    E("f0", "f1"), E("f1", "f2"), E("f2", "f3"),
    E("f3", "f3t", ["r", "l"], "Tidak"), E("f3t", "f4t"),
    E("f3", "f4", ["b", "t"], "Ya"), E("f4", "f5"), E("f4t", "f5", ["b", "r"]),
  ],
);

const kontak = flowchart(
  [
    T("g0", 0),
    P("g1", 1, ["Pengunjung mengisi", "formulir Kontak"]),
    P("g2", 2, ["Pesan masuk ke Pesan Masuk", "bertanda belum dibaca"]),
    P("g3", 3, ["Panitia membaca pesan"]),
    D("g4", 4, ["Dibalas lewat?"]),
    P("g5", 5, ["Sistem menyiapkan tautan", "WhatsApp berisi balasan"]),
    P("g5e", 5, ["Sistem mengirim email", "(bila SMTP disetel)"], "c"),
    P("g6", 6, ["Pesan tercatat sudah dibalas"]),
    T("g7", 7, "Selesai"),
  ],
  [
    E("g0", "g1"), E("g1", "g2"), E("g2", "g3"), E("g3", "g4"),
    E("g4", "g5", ["b", "t"], "WhatsApp"), E("g4", "g5e", ["r", "t"], "Email"),
    E("g5", "g6"), E("g5e", "g6", ["b", "r"]), E("g6", "g7"),
  ],
);


/* ---------------- diagram arsitektur ---------------- */

function arsitektur() {
  const kotak = (x, y, w, h, judul, ket, tebal) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tebal ? "#f5a9c2" : "#c9c7f2"}" stroke="${tebal ? "#d9658c" : "#8b87dc"}" stroke-width="1.2"/>` +
    `<text x="${x + w / 2}" y="${y + 22}" font-size="12.5" font-weight="600" text-anchor="middle" fill="#1a202c">${esc(judul)}</text>` +
    ket.map((t, i) => `<text x="${x + w / 2}" y="${y + 40 + i * 15}" font-size="11" text-anchor="middle" fill="#4a5568">${esc(t)}</text>`).join("");
  const garis = (d, label, lx, ly, anchor = "start") =>
    `<path d="${d}" fill="none" stroke="${GARIS}" stroke-width="1.2" marker-end="url(#panah2)"/>` +
    (label ? `<text x="${lx}" y="${ly}" font-size="11" font-style="italic" fill="#4a5568" text-anchor="${anchor}">${esc(label)}</text>` : "");
  const tabung = (x, y, w, h, judul, ket) =>
    `<path d="M${x} ${y + 8}V${y + h - 8}A${w / 2} 8 0 0 0 ${x + w} ${y + h - 8}V${y + 8}" fill="#bfe6ee" stroke="#5fb4c6" stroke-width="1.2"/><ellipse cx="${x + w / 2}" cy="${y + 8}" rx="${w / 2}" ry="8" fill="#bfe6ee" stroke="#5fb4c6" stroke-width="1.2"/>` +
    `<text x="${x + w / 2}" y="${y + 34}" font-size="12.5" font-weight="600" text-anchor="middle" fill="#1a202c">${esc(judul)}</text>` +
    `<text x="${x + w / 2}" y="${y + 51}" font-size="11" text-anchor="middle" fill="#4a5568">${esc(ket)}</text>`;
  return `<svg viewBox="0 0 660 470" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"><defs><marker id="panah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${GARIS}"/></marker></defs>` +
    garis("M170 64V116", "", 0, 0) +
    garis("M490 64V116", "lewat localhost:3000/admin", 500, 94) +
    garis("M300 150H358", "/admin", 329, 142, "middle") +
    garis("M170 186V276H228", "/api dan /unggahan", 180, 232) +
    garis("M490 186V276H432", "panggilan API", 500, 232) +
    garis("M280 314V346H130V380", "", 0, 0) +
    garis("M330 314V380", "", 0, 0) +
    garis("M380 314V346H530V380", "", 0, 0) +
    kotak(40, 12, 260, 52, "Pengunjung dan pendaftar", ["peramban komputer atau ponsel"]) +
    kotak(360, 12, 260, 52, "Panitia dan admin", ["peramban, masuk dengan akun panel"]) +
    kotak(40, 118, 260, 68, "Situs publik (Astro)", ["porta 3000", "profil, berita, PPDB, Cek Status, tes"]) +
    kotak(360, 118, 260, 68, "Panel admin (Next.js)", ["porta 3001", "verifikasi, surat, konten, pengaturan"]) +
    kotak(230, 244, 200, 70, "Backend (Go)", ["porta 8090", "API, aturan PPDB, nomor surat, PDF"], true) +
    tabung(40, 382, 180, 70, "PostgreSQL", "seluruh data sekolah") +
    kotak(240, 382, 180, 70, "Folder unggahan", ["foto dan berkas", "pendaftar"]) +
    kotak(440, 382, 180, 70, "Pembuat PDF", ["bukti, kartu peserta,", "surat berkop"]) +
    `</svg>`;
}

function legenda() {
  const y = 22;
  return `<svg viewBox="0 0 660 56" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">
  <rect x="10" y="${y - 12}" width="64" height="24" rx="12" fill="#c9ec9f" stroke="#8cc152" stroke-width="1.2"/><text x="84" y="${y + 4}" font-size="11" fill="#1a202c">Mulai / Selesai</text>
  <rect x="180" y="${y - 12}" width="54" height="24" fill="#c9c7f2" stroke="#8b87dc" stroke-width="1.2"/><text x="244" y="${y + 4}" font-size="11" fill="#1a202c">Proses</text>
  <polygon points="320,${y - 14} 348,${y} 320,${y + 14} 292,${y}" fill="#f5a9c2" stroke="#d9658c" stroke-width="1.2"/><text x="358" y="${y + 4}" font-size="11" fill="#1a202c">Keputusan</text>
  <path d="M440 ${y - 12}H494V${y + 6}C480 ${y} 472 ${y + 14} 467 ${y + 8}C460 ${y + 2} 452 ${y + 13} 440 ${y + 6}Z" fill="#ffe3a8" stroke="#e0a93b" stroke-width="1.2"/><text x="504" y="${y + 4}" font-size="11" fill="#1a202c">Dokumen</text>
  <path d="M572 ${y - 8}V${y + 8}A14 5 0 0 0 600 ${y + 8}V${y - 8}" fill="#bfe6ee" stroke="#5fb4c6" stroke-width="1.2"/><ellipse cx="586" cy="${y - 8}" rx="14" ry="5" fill="#bfe6ee" stroke="#5fb4c6" stroke-width="1.2"/><text x="608" y="${y + 4}" font-size="11" fill="#1a202c">Data</text>
  </svg>`;
}

/* ---------------- halaman ---------------- */

let nomorGambar = 0;
const gambar = (svg, judul, kelas = "") => `<figure class="${kelas}">${svg}<figcaption>Gambar ${++nomorGambar}. ${esc(judul)}</figcaption></figure>`;

const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Dokumentasi Alur Sistem SMA IMTEK</title>
<style>
@page { size: A4; margin: 20mm 20mm 18mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1a202c; margin: 0; }
h1 { font-size: 21pt; line-height: 1.2; margin: 0 0 4pt; color: ${BIRU}; }
.sub { color: #4a5568; margin: 0 0 14pt; font-size: 10.5pt; }
.identitas { border-collapse: collapse; margin: 0 0 18pt; font-size: 9.5pt; }
.identitas td { padding: 2pt 14pt 2pt 0; vertical-align: top; }
.identitas td:first-child { color: #4a5568; }
h2 { font-size: 13.5pt; color: ${BIRU}; margin: 0 0 6pt; padding-bottom: 4pt; border-bottom: 1.2pt solid ${BIRU}; }
section { break-before: page; }
section.lanjut { break-before: auto; margin-top: 18pt; }
p { margin: 0 0 8pt; }
figure { margin: 8pt 0 0; break-inside: avoid; }
figure svg { display: block; max-height: 212mm; margin: 0 auto; }
figcaption { text-align: center; font-size: 9pt; color: #4a5568; margin-top: 4pt; }
table.data { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 4pt 0 8pt; break-inside: avoid; }
table.data th { background: #eef2f7; text-align: left; font-weight: 600; }
table.data th, table.data td { border: 0.6pt solid #b8c2cf; padding: 4pt 6pt; vertical-align: top; }
.legenda { margin: 6pt 0 14pt; }
code { font-family: Menlo, monospace; font-size: 9pt; background: #f1f4f8; padding: 0 2pt; }
ul { margin: 0 0 8pt; padding-left: 16pt; }
li { margin: 0 0 2pt; }
</style></head><body>

<h1>Dokumentasi Alur Sistem SMA IMTEK</h1>
<p class="sub">Sistem Profil Sekolah dan Penerimaan Peserta Didik Baru (PPDB) Online</p>
<table class="identitas">
<tr><td>Sekolah</td><td>SMA IMTEK, Pagedangan, Kabupaten Tangerang</td></tr>
<tr><td>Kegiatan</td><td>Pengabdian kepada Masyarakat, Universitas Pamulang</td></tr>
<tr><td>Tanggal</td><td>29 September 2026</td></tr>
<tr><td>Demo</td><td>ridhoo1616.github.io/pkm-sma-imtek</td></tr>
</table>

<h2>1. Gambaran Sistem</h2>
<p>Sistem terdiri atas situs publik dan panel admin yang memakai satu backend dan satu basis data. Aturan penting seperti kuota, penomoran surat, dan hak akses dijaga di backend, sehingga tidak dapat dilewati dari tampilan.</p>
${gambar(arsitektur(), "Arsitektur sistem")}
<p style="margin-top:10pt">Pengunjung dan petugas sama-sama membuka alamat <code>localhost:3000</code>. Situs publik meneruskan alamat <code>/admin</code> ke panel admin, dan hanya backend yang menulis ke basis data.</p>

<section>
<h2>2. Peran Pengguna</h2>
<table class="data">
<tr><th style="width:18%">Peran</th><th style="width:40%">Dapat melakukan</th><th>Tidak dapat</th></tr>
<tr><td>Pengunjung</td><td>Membaca profil, berita, galeri, fasilitas, dan tanya jawab; mengirim pesan</td><td>Melihat data pendaftar</td></tr>
<tr><td>Pendaftar</td><td>Mendaftar, Cek Status, tes seleksi, mengunduh bukti, kartu peserta, dan surat</td><td>Melihat data pendaftar lain</td></tr>
<tr><td>Panitia</td><td>Verifikasi, mengubah status, menerbitkan surat, mengelola konten, soal, pesan</td><td>Pengaturan, akun, peminatan, biaya, paket tes, jenis surat, menghapus data</td></tr>
<tr><td>Admin</td><td>Semua tugas panitia ditambah seluruh isi kolom di sebelah kanan</td><td>-</td></tr>
</table>
<p style="margin-top:12pt"><b>Simbol flowchart</b> yang dipakai pada dokumen ini:</p>
<div class="legenda">${legenda()}</div>
</section>


<section class="lebar">
<h2>3. Flowchart Sistem: Pengunjung dan Pendaftar</h2>
<p>Seluruh jalur yang dapat ditempuh pengunjung situs, dari membuka situs sampai selesai.</p>
${gambar(sistemPublik, "Flowchart sistem sisi pengunjung dan pendaftar")}
</section>

<section class="lebar">
<h2>4. Flowchart Sistem: Panel Admin</h2>
<p>Seluruh jalur kerja panitia dan admin di panel, dari masuk sampai keluar.</p>
${gambar(sistemAdmin, "Flowchart sistem sisi panel admin")}
</section>



<section>
<h2>4. Alur Masuk Panel Admin</h2>
<p>Panitia dan admin masuk dengan akun masing-masing. Menu yang terbuka mengikuti peran akunnya.</p>
${gambar(masuk, "Flowchart masuk panel admin")}
</section>

<section>
<h2>5. Alur Pembukaan PPDB</h2>
<p>Admin cukup mengisi tanggal dan saklar PPDB. Keadaan pendaftaran dihitung ulang setiap kali halaman dibuka.</p>
${gambar(pengaturan, "Flowchart penentuan keadaan PPDB")}
</section>

<section>
<h2>6. Alur Pendaftaran PPDB</h2>
<p>Formulir terdiri atas lima tahap. Sistem memeriksa kelengkapan dan pendaftaran ganda sebelum membuat nomor registrasi.</p>
${gambar(pendaftaran, "Flowchart pendaftaran PPDB")}
</section>

<section>
<h2>7. Alur Cek Status dan Unduh Dokumen</h2>
<p>Pendaftar memakai nomor registrasi dan tanggal lahir. Dokumen yang dapat diunduh bertambah sesuai tahap pendaftarannya.</p>
${gambar(cek, "Flowchart cek status dan unduh dokumen")}
</section>

<section>
<h2>8. Alur Pengelolaan Data Pendaftar</h2>
<p>Panitia mencari pendaftar, mengekspor data, atau menambah pendaftar yang datang langsung ke sekolah.</p>
${gambar(kelola, "Flowchart pengelolaan data pendaftar")}
</section>

<section>
<h2>9. Alur Verifikasi dan Penetapan Hasil</h2>
<p>Panitia memeriksa berkas, lalu menetapkan status akhir berdasarkan nilai tes dan kuota peminatan. Setiap perubahan status menyusun notifikasi untuk pendaftar.</p>
${gambar(verifikasi, "Flowchart verifikasi dan penetapan hasil")}
</section>

<section>
<h2>10. Alur Notifikasi WhatsApp</h2>
<p>Pesan tidak langsung terkirim. Panitia meninjaunya lebih dulu, karena pesan WhatsApp yang salah tidak dapat ditarik kembali.</p>
${gambar(notifikasi, "Flowchart notifikasi WhatsApp")}
</section>

<section>
<h2>11. Alur Persiapan Tes Seleksi</h2>
<p>Soal disiapkan panitia, sedangkan paket tes dan jadwalnya diatur admin.</p>
${gambar(persiapanTes, "Flowchart persiapan tes seleksi")}
</section>

<section>
<h2>12. Alur Tes Seleksi Online</h2>
<p>Tes dikerjakan dari perangkat pendaftar dan dinilai otomatis. Setiap pendaftar hanya mendapat satu sesi untuk setiap paket tes.</p>
${gambar(tes, "Flowchart tes seleksi online")}
</section>

<section>
<h2>13. Alur Surat Keluar</h2>
<p>Sekolah menentukan format nomor, misalnya <code>{urut:3}/{kode}/SMA-IMTEK/{bulan_romawi}/{tahun}</code>, dan sistem membagikan nomor urutnya. Surat yang dibatalkan tetap tercatat supaya nomor tidak berlubang.</p>
${gambar(surat, "Flowchart penerbitan surat keluar")}
</section>

<section>
<h2>14. Alur Pengelolaan Konten</h2>
<p>Seluruh isi situs publik diubah dari panel admin tanpa menyentuh kode: Berita, Galeri, Sarana dan Prasarana, Halaman Profil, Tenaga Pendidik, Kalender, Kegiatan Siswa, Perpustakaan, Peminatan, Rincian Biaya, dan Pengaturan Sekolah.</p>
${gambar(konten, "Flowchart pengelolaan konten situs")}
</section>

<section>
<h2>15. Alur Tanya Jawab</h2>
<p>Pertanyaan yang belum terjawab dicatat, sehingga panitia tahu jawaban apa yang perlu ditambahkan.</p>
${gambar(tanya, "Flowchart asisten tanya jawab")}
</section>

<section>
<h2>16. Alur Pesan Kontak</h2>
<p>Pesan dari halaman Kontak dibalas panitia lewat WhatsApp atau email.</p>
${gambar(kontak, "Flowchart pesan dari halaman Kontak")}
</section>

<section>
<h2>17. Keamanan</h2>
<table class="data">
<tr><th style="width:36%">Ancaman</th><th>Penjagaan</th></tr>
<tr><td>Spam formulir pendaftaran</td><td>Paling banyak 20 kiriman per jam per alamat IP, ditambah kolom jebakan untuk robot</td></tr>
<tr><td>Menebak data di Cek Status</td><td>60 percobaan per 10 menit per alamat IP</td></tr>
<tr><td>Spam pesan Kontak</td><td>10 pesan per jam per alamat IP</td></tr>
<tr><td>Menebak sandi panel</td><td>Ditolak sementara setelah lima kali gagal dalam 10 menit</td></tr>
<tr><td>Petugas melampaui wewenang</td><td>Hak admin dan panitia diperiksa di backend</td></tr>
<tr><td>Berkas unggahan berbahaya</td><td>Jenis dan ukuran diperiksa, paling besar 3 MB per berkas</td></tr>
</table>
<p style="margin-top:12pt"><b>Yang masih perlu dilakukan sekolah:</b> mengganti sandi bawaan akun admin, dan mengunggah foto berita serta galeri yang asli.</p>
</section>
</body></html>`;

// Nomor bagian diurutkan ulang di sini, supaya menambah atau membuang
// bagian tidak perlu menomori ulang semuanya dengan tangan.
let nomorBagian = 0;
const htmlAkhir = html.replace(/<h2>\d+\. /g, () => `<h2>${++nomorBagian}. `);
writeFileSync(new URL("./dokumentasi.html", import.meta.url), htmlAkhir);
console.log("ok");

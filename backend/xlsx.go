package main

import (
	"archive/zip"
	"fmt"
	"io"
	"strings"
	"unicode/utf8"
)

/* ==================================================================
   Penulis berkas Excel (.xlsx) satu lembar.

   Sengaja ditulis sendiri, tanpa pustaka: kebutuhannya hanya satu tabel
   dengan kepala tebal, lebar kolom, baris judul yang membeku, dan saringan.
   Seluruh sel ditulis sebagai TEKS (inlineStr), dan itu bukan kebetulan:

     - NISN, NIK, dan nomor HP tetap berawalan nol dan tidak berubah menjadi
       8,12E+11, tanpa trik ="0812..." yang dulu dipakai pada CSV;
     - isian yang diawali = + - @ tidak pernah dibaca sebagai rumus, jadi
       nama seperti "=HYPERLINK(...)" tidak berbahaya.

   Baris ditulis mengalir ke penerima, bukan dikumpulkan dulu, sehingga
   ribuan pendaftar tidak menumpuk di memori.
   ================================================================== */

// kolomXlsx satu kolom lembar: judul dan lebarnya dalam satuan karakter.
type kolomXlsx struct {
	Judul string
	Lebar float64
}

const tipeIsiXlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// namaKolomXlsx mengubah nomor kolom berbasis nol menjadi huruf Excel:
// 0 -> A, 25 -> Z, 26 -> AA.
func namaKolomXlsx(n int) string {
	huruf := ""
	for n++; n > 0; n = (n - 1) / 26 {
		huruf = string(rune('A'+(n-1)%26)) + huruf
	}
	return huruf
}

// bersihkanXml membuang karakter yang dilarang XML 1.0 (kendali selain tab,
// LF, CR) dan melepaskan karakter khusus. Berkas dengan satu karakter
// terlarang ditolak Excel sebagai rusak, dan isian pendaftar datang dari luar.
func bersihkanXml(teks string) string {
	var b strings.Builder
	b.Grow(len(teks))
	for _, r := range teks {
		switch {
		case r == '\t' || r == '\n' || r == '\r':
			b.WriteRune(r)
		case r < 0x20 || r == 0xFFFE || r == 0xFFFF || (r >= 0xD800 && r <= 0xDFFF):
			// dibuang
		case r == utf8.RuneError:
			// urutan byte yang bukan UTF-8 sah
		case r == '&':
			b.WriteString("&amp;")
		case r == '<':
			b.WriteString("&lt;")
		case r == '>':
			b.WriteString("&gt;")
		case r == '"':
			b.WriteString("&quot;")
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

// tulisXlsx menulis satu lembar ke w. ambil dipanggil berulang dan
// mengembalikan satu baris tiap panggilan; nil menandakan baris habis.
func tulisXlsx(
	w io.Writer, namaLembar string, kolom []kolomXlsx,
	bekukanKolom int, ambil func() ([]string, error),
) error {
	zw := zip.NewWriter(w)

	tulisBagian := func(nama, isi string) error {
		f, err := zw.Create(nama)
		if err != nil {
			return err
		}
		_, err = io.WriteString(f, isi)
		return err
	}

	const xmlKepala = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` + "\n"

	bagianTetap := []struct{ nama, isi string }{
		{"[Content_Types].xml", xmlKepala +
			`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
			`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
			`<Default Extension="xml" ContentType="application/xml"/>` +
			`<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
			`<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
			`<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
			`</Types>`},
		{"_rels/.rels", xmlKepala +
			`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
			`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
			`</Relationships>`},
		{"xl/workbook.xml", xmlKepala +
			`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
			`xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
			`<sheets><sheet name="` + bersihkanXml(namaLembar) + `" sheetId="1" r:id="rId1"/></sheets></workbook>`},
		{"xl/_rels/workbook.xml.rels", xmlKepala +
			`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
			`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
			`<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
			`</Relationships>`},
		// Gaya 0 = biasa, 1 = kepala (tebal, putih di atas biru tua, rata tengah).
		{"xl/styles.xml", xmlKepala +
			`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>` +
			`<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>` +
			`<fills count="3"><fill><patternFill patternType="none"/></fill>` +
			`<fill><patternFill patternType="gray125"/></fill>` +
			`<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill></fills>` +
			`<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
			`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
			`<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
			`<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">` +
			`<alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>` +
			`<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
			`</styleSheet>`},
	}
	for _, b := range bagianTetap {
		if err := tulisBagian(b.nama, b.isi); err != nil {
			return err
		}
	}

	f, err := zw.Create("xl/worksheets/sheet1.xml")
	if err != nil {
		return err
	}

	akhirKolom := namaKolomXlsx(len(kolom) - 1)
	var kepala strings.Builder
	kepala.WriteString(xmlKepala)
	kepala.WriteString(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`)
	// Baris judul dan kolom pengenal pertama membeku saat digulir.
	kepala.WriteString(`<sheetViews><sheetView workbookViewId="0">`)
	if bekukanKolom > 0 {
		fmt.Fprintf(&kepala, `<pane xSplit="%d" ySplit="1" topLeftCell="%s2" activePane="bottomRight" state="frozen"/>`,
			bekukanKolom, namaKolomXlsx(bekukanKolom))
	} else {
		kepala.WriteString(`<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>`)
	}
	kepala.WriteString(`</sheetView></sheetViews>`)
	kepala.WriteString(`<sheetFormatPr defaultRowHeight="15"/>`)
	kepala.WriteString(`<cols>`)
	for i, k := range kolom {
		fmt.Fprintf(&kepala, `<col min="%d" max="%d" width="%.1f" customWidth="1"/>`, i+1, i+1, k.Lebar)
	}
	kepala.WriteString(`</cols><sheetData>`)
	kepala.WriteString(`<row r="1" ht="32" customHeight="1">`)
	for i, k := range kolom {
		fmt.Fprintf(&kepala, `<c r="%s1" s="1" t="inlineStr"><is><t>%s</t></is></c>`,
			namaKolomXlsx(i), bersihkanXml(k.Judul))
	}
	kepala.WriteString(`</row>`)
	if _, err := io.WriteString(f, kepala.String()); err != nil {
		return err
	}

	no := 1
	for {
		isi, err := ambil()
		if err != nil {
			return err
		}
		if isi == nil {
			break
		}
		no++
		var b strings.Builder
		fmt.Fprintf(&b, `<row r="%d">`, no)
		for i, sel := range isi {
			if sel == "" {
				continue
			}
			fmt.Fprintf(&b, `<c r="%s%d" t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>`,
				namaKolomXlsx(i), no, bersihkanXml(sel))
		}
		b.WriteString(`</row>`)
		if _, err := io.WriteString(f, b.String()); err != nil {
			return err
		}
	}

	ekor := `</sheetData>`
	if no > 1 {
		ekor += fmt.Sprintf(`<autoFilter ref="A1:%s%d"/>`, akhirKolom, no)
	}
	ekor += `<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>` +
		`<pageSetup orientation="landscape"/></worksheet>`
	if _, err := io.WriteString(f, ekor); err != nil {
		return err
	}
	return zw.Close()
}

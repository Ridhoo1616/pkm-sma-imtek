package main

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"io"
	"strings"
	"testing"
)

func TestNamaKolomXlsx(t *testing.T) {
	for n, mau := range map[int]string{0: "A", 25: "Z", 26: "AA", 51: "AZ", 52: "BA", 701: "ZZ", 702: "AAA"} {
		if got := namaKolomXlsx(n); got != mau {
			t.Errorf("namaKolomXlsx(%d) = %q, mau %q", n, got, mau)
		}
	}
}

// bacaLembar membongkar hasil tulisXlsx dan mengembalikan teks tiap sel
// menurut alamatnya. Sekaligus memastikan semua bagian XML dapat diurai.
func bacaLembar(t *testing.T, data []byte) map[string]string {
	t.Helper()
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatalf("bukan zip yang sah: %v", err)
	}
	sel := map[string]string{}
	ada := map[string]bool{}
	for _, f := range zr.File {
		ada[f.Name] = true
		rc, err := f.Open()
		if err != nil {
			t.Fatal(err)
		}
		isi, _ := io.ReadAll(rc)
		rc.Close()
		// Setiap bagian harus berupa XML yang dapat diurai sampai habis.
		d := xml.NewDecoder(bytes.NewReader(isi))
		var alamat string
		var dalamT bool
		for {
			tok, err := d.Token()
			if err == io.EOF {
				break
			}
			if err != nil {
				t.Fatalf("%s bukan XML sah: %v", f.Name, err)
			}
			if f.Name != "xl/worksheets/sheet1.xml" {
				continue
			}
			switch e := tok.(type) {
			case xml.StartElement:
				if e.Name.Local == "c" {
					for _, at := range e.Attr {
						if at.Name.Local == "r" {
							alamat = at.Value
						}
					}
				}
				dalamT = e.Name.Local == "t"
			case xml.CharData:
				if dalamT {
					sel[alamat] += string(e)
				}
			case xml.EndElement:
				if e.Name.Local == "t" {
					dalamT = false
				}
			}
		}
	}
	for _, wajib := range []string{"[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
		"xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"} {
		if !ada[wajib] {
			t.Errorf("bagian %s tidak ada", wajib)
		}
	}
	return sel
}

func TestTulisXlsxIsiTetapTeks(t *testing.T) {
	baris := [][]string{
		{"1", "Budi & <Ani>", "0812345678901", "=HYPERLINK(\"http://x\")"},
		{"2", "Siti\x00\x1f", "", "tab\there"},
	}
	i := 0
	var buf bytes.Buffer
	err := tulisXlsx(&buf, "Pendaftar",
		[]kolomXlsx{{"No.", 6}, {"Nama", 20}, {"No. HP", 16}, {"Catatan", 20}}, 2,
		func() ([]string, error) {
			if i >= len(baris) {
				return nil, nil
			}
			i++
			return baris[i-1], nil
		})
	if err != nil {
		t.Fatal(err)
	}
	sel := bacaLembar(t, buf.Bytes())

	mau := map[string]string{
		"A1": "No.", "D1": "Catatan",
		"B2": "Budi & <Ani>",
		"C2": "0812345678901", // nol di depan harus bertahan
		"D2": `=HYPERLINK("http://x")`,
		"B3": "Siti", // karakter kendali terbuang
		"D3": "tab\there",
	}
	for alamat, isi := range mau {
		if sel[alamat] != isi {
			t.Errorf("sel %s = %q, mau %q", alamat, sel[alamat], isi)
		}
	}
	if _, ada := sel["C3"]; ada {
		t.Error("sel kosong tidak boleh ditulis")
	}
}

func TestTulisXlsxTanpaBarisTetapSah(t *testing.T) {
	var buf bytes.Buffer
	err := tulisXlsx(&buf, "Pendaftar", []kolomXlsx{{"A", 5}}, 0,
		func() ([]string, error) { return nil, nil })
	if err != nil {
		t.Fatal(err)
	}
	sel := bacaLembar(t, buf.Bytes())
	if sel["A1"] != "A" {
		t.Errorf("judul tidak ada: %v", sel)
	}
	if strings.Contains(buf.String(), "autoFilter") {
		t.Error("saringan tidak boleh dipasang pada lembar tanpa baris")
	}
}

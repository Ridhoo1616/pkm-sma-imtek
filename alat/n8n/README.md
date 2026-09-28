# Gateway WhatsApp lewat n8n

Backend sistem ini dapat mengirim notifikasi WhatsApp sendiri bila
`WA_GATEWAY_URL` disetel. Folder ini berisi alur n8n yang menjadi gateway itu.

Sifatnya **pilihan, bukan keharusan**. Tanpa gateway, sistemnya tetap bekerja
seperti sekarang: pesannya disusun sistem, panitia menekan satu tombol, dan
WhatsApp terbuka dengan pesan yang sudah terisi penuh. Cara itu tidak berbiaya
dan tidak menuntut perizinan apa pun.

---

## Yang perlu dipahami sebelum memasang

### 1. n8n bukan WhatsApp

n8n hanya pipanya. Yang benar-benar mengirim adalah node di ujung alur, dan di
situlah keputusan yang sebenarnya.

| Node | Jalur | Dipakai di sini? |
| --- | --- | --- |
| **WhatsApp Business Cloud** (`n8n-nodes-base`) | API resmi Meta | **Ya** |
| Baileys, whatsapp-web, "WhatsApp via QR" | menumpang nomor WhatsApp biasa | **Tidak** |

Node jenis kedua menjanjikan "tanpa Meta Business Account, tanpa persetujuan
template, tanpa verifikasi nomor". Yang tidak dituliskannya: cara itu melanggar
ketentuan layanan WhatsApp, dan nomor yang dipakai berisiko diblokir. Risikonya
paling besar justru saat pengiriman sedang ramai — yaitu masa PPDB, ketika
nomor sekolah paling dibutuhkan. Jangan dipakai.

### 2. Notifikasi PPDB menuntut template yang disetujui Meta

Pesan sekolah kepada orang tua adalah pesan yang **dimulai sekolah**, di luar
jendela 24 jam sesudah orang tua menghubungi lebih dulu. Untuk itu Meta
mewajibkan **template yang diajukan dan disetujui lebih dulu**; teks bebas
tidak akan terkirim.

Akibatnya langsung ke rancangan panel: sekarang panitia dapat **menyunting**
isi pesan sebelum mengirim. Dengan template, yang dapat diubah hanya isian
variabelnya, bukan kalimatnya. Bila jalan ini ditempuh, kotak sunting itu perlu
berubah menjadi isian variabel per template, dan tiap jenis notifikasi
(diterima, ditolak, daftar ulang) memerlukan templatenya sendiri.

Alur di folder ini memakai operasi `send` (teks bebas) supaya dapat diuji ujung
ke ujung tanpa menunggu persetujuan Meta. **Untuk dipakai sungguhan, operasinya
diganti menjadi `Send Template`.**

### 3. Prasyarat dari pihak Meta

Tidak ada satu pun yang dapat dilewati n8n:

- akun Meta Business beserta verifikasi bisnisnya
- satu nomor telepon yang **belum** terdaftar di WhatsApp biasa
- template yang disetujui, per jenis notifikasi
- biaya per pesan menurut tarif Meta yang berlaku; periksa sendiri tarif
  terbarunya, sebab Meta beberapa kali mengubahnya

---

## Cara kerjanya

```
panitia menekan "Kirim Sekarang" di panel
        │
        ▼
backend Go  ──POST {to, message}──▶  n8n Webhook /webhook/ppdb-wa
        │                                    │  Header Auth memeriksa token
        │                                    ▼
        │                            Periksa isian (Code)
        │                                    │
        │                            Isian sah? ──tidak──▶ Jawab 400
        │                                    │ ya
        │                                    ▼
        │                            WhatsApp Business Cloud
        │                              │ berhasil    │ gagal
        │                              ▼             ▼
        └────────────────────────  Jawab 200     Jawab 502
```

Backend menganggap **2xx berarti terkirim** dan selain itu gagal; badan
jawabannya dicatat sebagai keterangan galat dan tampil di menu Notifikasi.
Karena itu ketiga jawabannya dibedakan:

| Kode | Artinya bagi panitia |
| --- | --- |
| 200 | terkirim |
| 400 | kiriman backend yang salah, misalnya nomor kosong |
| 502 | pihak Meta menolak atau tidak dapat dihubungi |

---

## Memasang di laptop sendiri

n8n menuntut Node.js 24 atau lebih baru.

```bash
npm install -g n8n
./alat/n8n/jalankan.sh
```

Panelnya di <http://localhost:5678>. Saat pertama kali dijalankan, n8n meminta
pembuatan akun pemilik — akun itu setempat, tidak terhubung ke mana-mana.

**Dijalankan lewat skrip itu, bukan `n8n start` langsung.** Skripnya menyetel
dua hal yang harus dipakai bersama:

- `N8N_LISTEN_ADDRESS=127.0.0.1` — bawaan n8n mendengarkan di `0.0.0.0`,
  sehingga panelnya terbuka bagi siapa pun di jaringan yang sama. Selama akun
  pemiliknya belum dibuat, orang itu dapat membuatnya duluan dan mengambil
  alih; sesudah dibuat pun, panel n8n memuat kredensial.
- `N8N_SECURE_COOKIE=false` — Safari tidak memperlakukan `http://localhost`
  sebagai konteks aman, jadi cookie bertanda `Secure` ditolak dan panelnya
  berhenti di layar *"Your n8n server is configured to use a secure cookie"*.
  Chrome memaafkan localhost, Safari tidak.

n8n menyebut setelan kedua "not recommended", dan peringatan itu benar untuk
n8n yang dijangkau lewat jaringan. Di sini tidak: setelan pertama membuatnya
tidak dapat dihubungi dari luar mesin ini sama sekali, sehingga cookienya
tidak pernah melewati jaringan mana pun. Keduanya hanya aman bersama-sama.

### Memasukkan alurnya

```bash
cd pkm-sma-imtek
n8n import:workflow --input=alat/n8n/alur-wa-ppdb.json
```

Lalu di panel n8n:

1. Buka alur **PPDB SMA IMTEK - Gateway WhatsApp**.
2. Pada node **Terima dari backend**, buat kredensial *Header Auth* baru:
   - Name: `Authorization`
   - Value: `Bearer <isi WA_GATEWAY_TOKEN>`
3. Aktifkan alurnya dengan sakelar di kanan atas.

Kredensialnya dibuat lewat panel, bukan lewat berkas, supaya tokennya tidak
pernah tertulis di dalam repositori yang bersifat publik ini.

### Menyambungkan backend

Pada `backend/.env`:

```ini
WA_GATEWAY_URL=http://localhost:5678/webhook/ppdb-wa
WA_GATEWAY_TOKEN=<nilai acak yang sama dengan kredensial di atas>
```

`http` diterima **hanya** karena menunjuk ke localhost — lalu lintasnya tidak
pernah meninggalkan mesin ini. Bila n8n dijalankan di mesin lain, alamatnya
wajib `https`; `config.go` menolak selain itu, sebab pesan notifikasi memuat
nama dan nomor telepon orang tua.

Nyalakan ulang backend sesudah mengubah `.env`. Menu Notifikasi akan berganti
menjadi "Gateway resmi aktif".

---

## Menguji tanpa kredensial Meta

Node WhatsApp di dalam alur ini **dimatikan** saat diimpor. n8n meneruskan
begitu saja node yang dimatikan, jadi seluruh jalur dapat diuji lebih dulu:
webhook, pemeriksaan token, pemeriksaan isian, dan ketiga jawabannya.

```bash
# harus 200
curl -s -i -X POST http://localhost:5678/webhook/ppdb-wa \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"to":"628123456789","message":"Uji coba dari terminal."}'

# harus 403: token salah
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5678/webhook/ppdb-wa \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer salah' \
  -d '{"to":"628123456789","message":"Uji."}'

# harus 400: isian tidak lengkap
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5678/webhook/ppdb-wa \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <token>' \
  -d '{"to":"","message":""}'
```

Menguji dari backend sungguhan **jangan** dilakukan pada basis data yang
dipakai: pakai basis data sekali pakai, sebab mengirim notifikasi mengubah
statusnya menjadi Terkirim dan itu tidak dapat dibatalkan.

## Bila kredensial Meta sudah ada

1. Buat kredensial *WhatsApp API* di n8n (Access Token + Business Account ID).
2. Pada node **Kirim lewat WhatsApp Cloud**: isi `phoneNumberId`, nyalakan
   kembali nodenya, lalu ganti operasinya menjadi **Send Template** beserta
   nama template yang sudah disetujui.
3. Sesuaikan panel: kotak sunting pesan tidak lagi bermakna untuk template,
   jadi diganti menjadi isian variabel.

Langkah ketiga belum dikerjakan, dan memang tidak ada gunanya dikerjakan
sebelum templatenya disetujui — bentuk variabelnya baru pasti setelah itu.

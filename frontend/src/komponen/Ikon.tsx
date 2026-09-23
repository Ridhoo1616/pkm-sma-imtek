/**
 * Kumpulan ikon, ditulis langsung sebagai SVG.
 *
 * Tidak memakai pustaka ikon karena pustaka semacam itu membawa ribuan ikon
 * yang tidak dipakai, atau satu berkas font berukuran ratusan kilobita. Di
 * sini hanya ada yang benar-benar terpakai, dan seluruhnya ikut ke dalam HTML
 * tanpa permintaan jaringan tambahan.
 *
 * Ikon di sini selalu berupa hiasan di samping teks yang sudah menjelaskan
 * maksudnya, jadi diberi aria-hidden supaya pembaca layar tidak membacanya
 * dua kali. Bila sebuah ikon dipakai sendirian tanpa teks, elemen
 * pembungkusnya yang harus diberi aria-label.
 */

interface Props {
  /** Ukuran sisi dalam piksel. */
  ukuran?: number;
  className?: string;
}

function Bungkus({
  ukuran = 16,
  className,
  isi,
  garis = true,
}: Props & { isi: React.ReactNode; garis?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ukuran}
      height={ukuran}
      aria-hidden="true"
      focusable="false"
      className={className}
      fill={garis ? "none" : "currentColor"}
      stroke={garis ? "currentColor" : "none"}
      strokeWidth={garis ? 1.8 : undefined}
      strokeLinecap={garis ? "round" : undefined}
      strokeLinejoin={garis ? "round" : undefined}
    >
      {isi}
    </svg>
  );
}

export function IkonTelepon(p: Props) {
  return (
    <Bungkus
      {...p}
      isi={
        <path d="M6.6 2.5h-2A2.1 2.1 0 0 0 2.5 4.7c0 9.3 7.5 16.8 16.8 16.8a2.1 2.1 0 0 0 2.2-2.1v-2a1.4 1.4 0 0 0-1.1-1.4l-3.3-.7a1.4 1.4 0 0 0-1.4.5l-1 1.3a13 13 0 0 1-6.3-6.3l1.3-1a1.4 1.4 0 0 0 .5-1.4l-.7-3.3a1.4 1.4 0 0 0-1.4-1.1Z" />
      }
    />
  );
}

export function IkonCentang(p: Props) {
  return <Bungkus {...p} isi={<path d="M4.5 12.6l5 5L19.5 6.5" />} />;
}

export function IkonSurel(p: Props) {
  return (
    <Bungkus
      {...p}
      isi={
        <>
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.2" />
          <path d="m3.4 6.2 7.5 5.4a2 2 0 0 0 2.2 0l7.5-5.4" />
        </>
      }
    />
  );
}

export function IkonWhatsapp(p: Props) {
  // Lambang WhatsApp memakai bidang penuh, bukan garis, agar bentuk gagang
  // teleponnya tetap terbaca pada ukuran kecil.
  return (
    <Bungkus
      {...p}
      garis={false}
      isi={
        <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1 0 12 2Zm0 1.8a8.1 8.1 0 1 1-4.1 15.1l-.3-.2-3 .8.8-2.9-.2-.3A8.1 8.1 0 0 1 12 3.8Zm-3.7 4c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2.1.8 2.5.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.2.1-1.3l-.6-.3-1.6-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-2-1.2 7.4 7.4 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.5.3-.5v-.5l-.8-1.8c-.2-.4-.4-.4-.6-.4h-.4Z" />
      }
    />
  );
}

export function IkonLokasi(p: Props) {
  return (
    <Bungkus
      {...p}
      isi={
        <>
          <path d="M12 21.5s7-5.9 7-11.1a7 7 0 1 0-14 0c0 5.2 7 11.1 7 11.1Z" />
          <circle cx="12" cy="10.2" r="2.6" />
        </>
      }
    />
  );
}

export function IkonJam(p: Props) {
  return (
    <Bungkus
      {...p}
      isi={
        <>
          <circle cx="12" cy="12" r="9.2" />
          <path d="M12 6.8V12l3.4 2" />
        </>
      }
    />
  );
}

export function IkonInstagram(p: Props) {
  return (
    <Bungkus
      {...p}
      isi={
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.1" />
          <circle cx="17.2" cy="6.8" r="1.05" fill="currentColor" stroke="none" />
        </>
      }
    />
  );
}

export function IkonFacebook(p: Props) {
  return (
    <Bungkus
      {...p}
      garis={false}
      isi={
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22C18.34 21.24 22 17.08 22 12.06Z" />
      }
    />
  );
}

export function IkonYoutube(p: Props) {
  return (
    <Bungkus
      {...p}
      garis={false}
      isi={
        <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1Z" />
      }
    />
  );
}

export function IkonTiktok(p: Props) {
  return (
    <Bungkus
      {...p}
      garis={false}
      isi={
        <path d="M16.1 2h-2.9v13.3a2.5 2.5 0 1 1-2.1-2.47V9.9a5.6 5.6 0 1 0 5.06 5.57V8.9a6.5 6.5 0 0 0 3.84 1.25V7.24A3.75 3.75 0 0 1 16.1 3.6Z" />
      }
    />
  );
}

/** Memilih ikon media sosial dari nama layanannya. */
export function IkonSosial({ nama, ...p }: Props & { nama: string }) {
  switch (nama.toLowerCase()) {
    case "instagram":
      return <IkonInstagram {...p} />;
    case "facebook":
      return <IkonFacebook {...p} />;
    case "youtube":
      return <IkonYoutube {...p} />;
    case "tiktok":
      return <IkonTiktok {...p} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ *
 *  Ikon fasilitas dan peminatan
 *
 *  Basis data menyimpan nama ikon bergaya Bootstrap Icons, misalnya
 *  "bi-book". Nama itu peninggalan versi PHP yang memang memuat pustaka
 *  Bootstrap Icons. Versi ini tidak memuatnya, karena satu berkas font ikon
 *  berukuran ratusan kilobita hanya untuk sepuluh gambar kecil.
 *
 *  Nama yang tersimpan tetap dihormati dan dipetakan ke gambar di bawah ini,
 *  sehingga data lama tidak perlu diubah dan panitia tetap bisa memilih ikon
 *  dari panel. Nama yang tidak dikenal memakai gambar gedung sekolah.
 * ------------------------------------------------------------------ */

const PETA_IKON: Record<string, React.ReactNode> = {
  // Komputer dan laboratorium
  "bi-pc-display": (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </>
  ),
  "bi-eyedropper": (
    <>
      <path d="M9.5 12.5 4 18v2.5h2.5l5.5-5.5" />
      <path d="m12.8 9.2 2 2M14.5 4.9l4.6 4.6a2 2 0 0 1 0 2.8l-1.4 1.4-7.4-7.4 1.4-1.4a2 2 0 0 1 2.8 0Z" />
    </>
  ),
  // Perpustakaan
  "bi-book": (
    <>
      <path d="M4 4.5h5.5a2.5 2.5 0 0 1 2.5 2.5v13a2 2 0 0 0-2-2H4Z" />
      <path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v13a2 2 0 0 1 2-2h6Z" />
    </>
  ),
  // Olahraga
  "bi-dribbble": (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M4.2 8.4c5 .5 9.6-.6 13-3.3M3.4 14.6c4.6-1.8 9.6-1 13 2.4M8.6 3.4c3 3.6 5 8.3 5.4 13.6" />
    </>
  ),
  // Musala
  "bi-moon-stars": (
    <>
      <path d="M20.5 15.2A8.2 8.2 0 0 1 9.4 4.2a8.5 8.5 0 1 0 11.1 11Z" />
      <path d="m17.5 3.2.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" />
    </>
  ),
  // Ruang kelas
  "bi-easel": (
    <>
      <rect x="3" y="3.5" width="18" height="10.5" rx="1.6" />
      <path d="M12 14v6.5M12 17.5l-4 3M12 17.5l4 3" />
    </>
  ),
  // UKS
  "bi-heart-pulse": (
    <>
      <path d="M20.3 6.2a4.6 4.6 0 0 0-6.6 0L12 7.9l-1.7-1.7a4.6 4.6 0 1 0-6.6 6.5l8.3 8.4 8.3-8.4a4.6 4.6 0 0 0 0-6.5Z" />
      <path d="M4.5 12.5h3l1.5-2.5 2 5 1.7-3.5 1.3 1h3.5" />
    </>
  ),
  // Kantin
  "bi-shop": (
    <>
      <path d="M3.5 9.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M2.8 9.5 4.5 4h15l1.7 5.5a2.6 2.6 0 0 1-4.6 1.4 2.6 2.6 0 0 1-4.6 0 2.6 2.6 0 0 1-4.6 0 2.6 2.6 0 0 1-4.6-1.4Z" />
    </>
  ),
  // Peminatan MIPA
  "bi-calculator": (
    <>
      <rect x="4.5" y="2.8" width="15" height="18.4" rx="2" />
      <path d="M7.8 6.5h8.4v3H7.8zM8.2 13.2h.01M12 13.2h.01M15.8 13.2h.01M8.2 17h.01M12 17h.01M15.8 17h.01" />
    </>
  ),
  // Peminatan IPS
  "bi-globe-americas": (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M2.9 12h18.2" />
      <path d="M12 2.8a14 14 0 0 1 0 18.4 14 14 0 0 1 0-18.4Z" />
    </>
  ),
  // Peminatan Bahasa
  "bi-translate": (
    <>
      <path d="M3.2 5.5h8.4M7.4 3.4v2.1M9.6 5.5c-.5 4-2.9 7.2-6.4 8.6M5.2 9.2c1 2.2 2.9 3.9 5.2 4.6" />
      <path d="m12.8 20.6 4-10 4 10M14.4 17.2h4.8" />
    </>
  ),
  // Cadangan: gedung sekolah
  gedung: (
    <>
      <path d="M3.2 20.5h17.6M4.8 20.5V9.8L12 5.5l7.2 4.3v10.7" />
      <path d="M10 20.5v-4.6h4v4.6M9.4 11.8h1.4M13.2 11.8h1.4" />
    </>
  ),
};

/**
 * Menggambar ikon fasilitas atau peminatan dari nama yang tersimpan di basis
 * data. Nama kosong atau tak dikenal menghasilkan ikon gedung sekolah, supaya
 * kartunya tetap rapi dan tidak berlubang.
 */
export function IkonFasilitas({ nama, ukuran = 22, className }: Props & { nama?: string }) {
  const kunci = (nama ?? "").trim().toLowerCase();
  const isi = PETA_IKON[kunci] ?? PETA_IKON.gedung;
  return <Bungkus ukuran={ukuran} className={className} isi={isi} />;
}

/**
 * Pilihan ikon untuk panel panitia. Sebelumnya kolom ini berupa ketikan
 * bebas dengan contoh "bi-flask", padahal nama itu tidak pernah digambar
 * oleh apa pun. Sekarang berupa daftar pilihan, jadi yang dipilih pasti
 * muncul di situs.
 */
export const PILIHAN_IKON: { nilai: string; label: string }[] = [
  { nilai: "bi-pc-display", label: "Komputer / lab komputer" },
  { nilai: "bi-eyedropper", label: "Laboratorium IPA" },
  { nilai: "bi-book", label: "Perpustakaan / buku" },
  { nilai: "bi-dribbble", label: "Olahraga" },
  { nilai: "bi-moon-stars", label: "Musala / keagamaan" },
  { nilai: "bi-easel", label: "Ruang kelas" },
  { nilai: "bi-heart-pulse", label: "UKS / kesehatan" },
  { nilai: "bi-shop", label: "Kantin" },
  { nilai: "bi-calculator", label: "Peminatan MIPA" },
  { nilai: "bi-globe-americas", label: "Peminatan IPS" },
  { nilai: "bi-translate", label: "Peminatan Bahasa" },
];

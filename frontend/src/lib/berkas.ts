"use client";

/**
 * Membuka atau menyimpan berkas yang diterima dari API.
 *
 * Berkasnya diminta lewat fetch, bukan lewat tautan biasa, karena dua
 * alasan: alamat bukti pendaftaran menerima kiriman POST, dan alamat
 * dokumen pendaftar memerlukan token petugas yang tidak bisa disertakan
 * pada tautan.
 */
export function bukaBlob(nama: string, blob: Blob, unduh = false) {
  const alamat = URL.createObjectURL(blob);
  if (unduh) {
    const a = document.createElement("a");
    a.href = alamat;
    a.download = nama;
    a.click();
  } else {
    window.open(alamat, "_blank", "noopener");
  }
  // Alamat objek dibebaskan setelah peramban selesai memakainya. Tanpa
  // jeda, tab yang baru dibuka bisa kehilangan berkasnya.
  setTimeout(() => URL.revokeObjectURL(alamat), 60_000);
}

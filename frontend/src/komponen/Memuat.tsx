/** Penanda tunggu dan keadaan kosong yang dipakai berulang di banyak halaman. */

export function Memuat({ pesan = "Memuat data..." }: { pesan?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-samar">
      <span
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-garis border-t-biru"
        aria-hidden
      />
      <span>{pesan}</span>
    </div>
  );
}

export function TanpaData({
  judul,
  keterangan,
}: {
  judul: string;
  keterangan?: string;
}) {
  return (
    <div className="kartu px-6 py-14 text-center">
      <p className="text-lg font-semibold text-biru-tua">{judul}</p>
      {keterangan && <p className="mt-2 text-sm text-samar">{keterangan}</p>}
    </div>
  );
}

/** Pesan galat yang bisa dicoba ulang. */
export function PesanGalat({
  pesan,
  ulangi,
}: {
  pesan: string;
  ulangi?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-kartu border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
    >
      <p>{pesan}</p>
      {ulangi && (
        <button
          type="button"
          onClick={ulangi}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-800 hover:bg-red-100"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function PesanBerhasil({ pesan }: { pesan: string }) {
  return (
    <div
      role="status"
      className="rounded-kartu border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800"
    >
      {pesan}
    </div>
  );
}

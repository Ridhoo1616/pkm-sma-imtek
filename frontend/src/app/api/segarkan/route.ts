import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ALAMAT_API } from "@/lib/api";

/**
 * Menyegarkan cache halaman publik atas permintaan.
 *
 * Halaman publik menyimpan hasil API selama beberapa puluh detik agar tidak
 * membebani server saat banyak pengunjung. Tanpa alamat ini, admin yang baru
 * menerbitkan berita akan melihat halaman publiknya belum berubah dan
 * mengira penyimpanannya gagal.
 *
 * Tokennya diperiksa ke backend lebih dulu supaya alamat ini tidak dapat
 * dipakai orang luar untuk terus-menerus mengosongkan cache.
 */
export async function POST(permintaan: Request) {
  const kepala = permintaan.headers.get("authorization") ?? "";
  if (!kepala.startsWith("Bearer ")) {
    return NextResponse.json(
      { pesan: "Penyegaran hanya untuk petugas yang sudah masuk." },
      { status: 401 },
    );
  }

  try {
    const jawaban = await fetch(`${ALAMAT_API}/api/saya`, {
      headers: { Authorization: kepala },
      cache: "no-store",
    });
    if (!jawaban.ok) {
      return NextResponse.json(
        { pesan: "Sesi Anda tidak lagi sah." },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { pesan: "Server API tidak dapat dihubungi." },
      { status: 503 },
    );
  }

  // Seluruh halaman publik dibangun dari data yang sama, jadi disegarkan
  // sekalian daripada memetakan setiap menu ke jalurnya masing-masing.
  revalidatePath("/", "layout");

  return NextResponse.json({ pesan: "Halaman publik disegarkan." });
}

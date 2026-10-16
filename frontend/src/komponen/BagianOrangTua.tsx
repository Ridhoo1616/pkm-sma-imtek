"use client";

import { Pilihan, Teks } from "@/komponen/Medan";
import { PENDIDIKAN } from "@/lib/pilihan";

/**
 * Satu orang tua: status dulu, lalu nama, pekerjaan, dan pendidikan terakhir.
 * Ketiga isian itu hanya muncul bila statusnya bukan "Tidak ada" — orang tua
 * yang tidak diketahui memang tidak punya data untuk diisi. Aturannya sama
 * dengan periksaOrangTua di backend/pendaftar_isian.go.
 *
 * Dipakai formulir publik dan form tambah pendaftar di panel, supaya kedua
 * pintu masuk menampilkan dan mewajibkan hal yang sama.
 */
export function BagianOrangTua({
  peran,
  opsiStatus,
  isi,
  ubah,
  galat,
}: {
  peran: "ayah" | "ibu";
  opsiStatus: { nilai: string; label: string }[];
  isi: Record<string, string>;
  ubah: (k: string) => (v: string) => void;
  galat: Record<string, string>;
}) {
  const status = isi[`status_${peran}`];
  const ada = status !== "" && status !== "Tidak ada";
  return (
    <fieldset className="space-y-4 rounded-lg border border-garis p-4 sm:p-5">
      <legend className="px-2 text-sm font-semibold text-biru-tua">
        {peran === "ayah" ? "Ayah" : "Ibu"}
      </legend>
      <div className="grid gap-5 sm:grid-cols-3">
        <Pilihan
          nama={`status_${peran}`}
          label={`Status ${peran}`}
          wajib
          nilai={status}
          ubah={ubah(`status_${peran}`)}
          opsi={opsiStatus}
          galat={galat[`status_${peran}`]}
        />
      </div>
      {ada && (
        <div className="grid gap-5 sm:grid-cols-3">
          <Teks
            nama={`nama_${peran}`}
            label={`Nama ${peran}`}
            wajib
            maks={120}
            nilai={isi[`nama_${peran}`]}
            ubah={ubah(`nama_${peran}`)}
            galat={galat[`nama_${peran}`]}
          />
          <Teks
            nama={`pekerjaan_${peran}`}
            label={`Pekerjaan ${peran}`}
            wajib
            maks={80}
            nilai={isi[`pekerjaan_${peran}`]}
            ubah={ubah(`pekerjaan_${peran}`)}
            galat={galat[`pekerjaan_${peran}`]}
          />
          <Pilihan
            nama={`pendidikan_${peran}`}
            label={`Pendidikan terakhir ${peran}`}
            wajib
            nilai={isi[`pendidikan_${peran}`]}
            ubah={ubah(`pendidikan_${peran}`)}
            opsi={PENDIDIKAN}
            galat={galat[`pendidikan_${peran}`]}
          />
        </div>
      )}
    </fieldset>
  );
}

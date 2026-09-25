import type { Metadata } from "next";
import "./globals.css";
import { muatProfil } from "@/lib/profil";
import { belumTerisi } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { profil } = await muatProfil();
  const p = profil.pengaturan;
  const nama = p.nama_sekolah || "SMA IMTEK";

  return {
    title: {
      default: `${nama} · Profil Sekolah & PPDB Online`,
      template: `%s · ${nama}`,
    },
    description:
      (belumTerisi(p.tagline ?? "") ? "" : p.tagline) ||
      `Profil ${nama} dan pendaftaran peserta didik baru secara online` +
      (p.kota ? ` di ${p.kota}` : "") +
      ".",
    // Tanpa nama domain yang sudah pasti, kata kunci dan judul saja yang
    // bisa dipastikan benar; alamat kanonis ditambahkan setelah domain
    // sekolah ditentukan.
    keywords: [
      nama,
      "PPDB online",
      "pendaftaran peserta didik baru",
      p.kota,
      "SMA swasta",
    ].filter(Boolean) as string[],
    openGraph: {
      title: `${nama} · Profil Sekolah & PPDB Online`,
      description:
        (belumTerisi(p.tagline ?? "") ? "" : p.tagline) ||
        `Pendaftaran peserta didik baru ${nama}.`,
      type: "website",
      locale: "id_ID",
    },
  };
}

import { ClickSpark } from "@/komponen/ClickSpark";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ClickSpark 
          sparkColor="#F59E0B" 
          sparkSize={12} 
          sparkRadius={20} 
          sparkCount={8} 
          duration={500} 
        />
        {children}
      </body>
    </html>
  );
}

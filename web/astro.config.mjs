// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * Frontend Astro untuk halaman publik.
 *
 * Kode bersama TIDAK disalin dari frontend Next: `@/lib` dan `@/komponen`
 * menunjuk langsung ke frontend/src. Aturan data yang sudah diuji — penanda
 * [kurung siku], kalimat keadaan PPDB, tautan WhatsApp — tetap satu sumber,
 * sehingga kedua frontend tidak dapat saling menyimpang selama masa pindah.
 *
 * Komponen React lama memakai next/link dan next/navigation. Keduanya
 * diganti pengganti kecil di src/shim, jadi komponennya dapat dirender Astro
 * tanpa diubah satu baris pun.
 */
/** @param {string} jalur */
const src = (jalur) => fileURLToPath(new URL(jalur, import.meta.url));

/**
 * Alamat API di PERAMBAN dikosongkan, sehingga permintaan dari komponen
 * interaktif menuju asal yang sama (/api/...) lalu diteruskan server Astro ke
 * backend. Sebabnya CORS: backend hanya mengizinkan asal yang tertulis di
 * CORS_ORIGINS, dan asal situs Astro belum tentu ada di sana. Di sisi server,
 * `process.env.NEXT_PUBLIC_API_URL` tetap dibaca seperti biasa.
 */
/** @returns {import("vite").Plugin} */
function alamatApiPeramban() {
  return {
    name: "alamat-api-peramban",
    enforce: "pre",
    transform(kode, id, pilihan) {
      if (!id.includes("/frontend/src/lib/api.ts")) return;
      const diServer = this.environment
        ? this.environment.name !== "client"
        : pilihan?.ssr;
      // Alamat gambar unggahan dibuat relatif DI KEDUA SISI. Bila server
      // menulis alamat backend penuh sedangkan peramban menulis alamat
      // relatif, React melaporkan ketidakcocokan hidrasi pada setiap
      // komponen interaktif yang memuat gambar (misalnya daftar guru).
      // /unggahan/* diteruskan ke backend oleh src/pages/[...jalur].ts.
      let hasil = kode.replace("`${ALAMAT_API}/unggahan/", "`/unggahan/");
      if (!diServer) {
        hasil = hasil.replace("process.env.NEXT_PUBLIC_API_URL", '""');
      }
      return hasil;
    },
  };
}

export default defineConfig({
  output: "server",
  // Bilah alat Astro menutupi tengah bawah layar saat dev; tampilannya
  // dibuat sama dengan versi produksi.
  devToolbar: { enabled: false },
  adapter: node({
    mode: "standalone",
    // Batas badan permintaan. Bawaannya 1 GB, dan rute penerus membaca
    // seluruh badannya ke memori sebelum meneruskan ke backend, jadi satu
    // kiriman raksasa cukup untuk menghabiskan memori server. Formulir PPDB
    // yang paling besar: enam berkas x 3 MB ditambah isiannya, di bawah 20 MB.
    bodySizeLimit: 25 * 1024 * 1024,
  }),
  integrations: [react()],
  // Font, ilustrasi, dan ikon situs dipakai bersama dengan frontend Next.
  publicDir: "../frontend/public",
  server: { port: 4321, host: "localhost" },
  vite: {
    plugins: [tailwindcss(), alamatApiPeramban()],
    resolve: {
      alias: [
        { find: /^next\/link$/, replacement: src("./src/shim/next-link.tsx") },
        {
          find: /^next\/navigation$/,
          replacement: src("./src/shim/next-navigation.ts"),
        },
        { find: /^@\/lib\//, replacement: src("../frontend/src/lib/") },
        {
          find: /^@\/komponen\//,
          replacement: src("../frontend/src/komponen/"),
        },
      ],
      // Komponen di frontend/src akan memakai react dari
      // frontend/node_modules bila dibiarkan. Dua salinan React dalam satu
      // halaman membuat setiap hook gagal, jadi semuanya dipaksa memakai
      // salinan milik folder ini.
      dedupe: ["react", "react-dom", "lenis"],
    },
    server: { fs: { allow: [src("..")] } },
  },
});

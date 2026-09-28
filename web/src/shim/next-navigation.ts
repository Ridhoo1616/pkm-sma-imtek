/**
 * Pengganti next/navigation untuk komponen React lama yang dirender Astro.
 *
 * Tanpa router di sisi klien, jalur halaman dibaca dari `location`. Saat
 * dirender di server belum ada `location`, jadi jalurnya diambil dari
 * `globalThis.__jalurAstro` yang dipasang tata letak Astro sebelum
 * merender — tanpa itu menu aktif di server dan di peramban akan berbeda.
 */
declare global {
  var __jalurAstro: string | undefined;
}

export function usePathname(): string {
  if (typeof window !== "undefined") return window.location.pathname;
  return globalThis.__jalurAstro ?? "/";
}

export function useSearchParams(): URLSearchParams {
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search);
  }
  return new URLSearchParams();
}

export function useRouter() {
  return {
    push: (url: string) => window.location.assign(url),
    replace: (url: string) => window.location.replace(url),
    back: () => window.history.back(),
    refresh: () => window.location.reload(),
    prefetch: () => undefined,
  };
}

export function notFound(): never {
  throw new Error("NEXT_NOT_FOUND");
}

export function redirect(url: string): never {
  throw new Error(`NEXT_REDIRECT:${url}`);
}

import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Pengganti next/link untuk komponen React lama yang dirender Astro.
 *
 * Astro tidak punya router di sisi klien, jadi setiap tautan cukup menjadi
 * <a> biasa. Properti khusus Next dibuang supaya tidak ikut menjadi atribut
 * HTML yang tidak dikenal.
 */
type Properti = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string; query?: Record<string, string> };
  children?: ReactNode;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
};

export default function Link({
  href,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  passHref: _passHref,
  legacyBehavior: _legacy,
  ...sisa
}: Properti) {
  const alamat =
    typeof href === "string"
      ? href
      : (href.pathname ?? "") +
        (href.query ? "?" + new URLSearchParams(href.query).toString() : "");
  return <a href={alamat} {...sisa} />;
}

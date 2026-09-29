import type { APIRoute } from "astro";
import { asalSitus } from "../lib/situs";

/** Panel, API, dan ruang tes tidak untuk mesin pencari. */
export const GET: APIRoute = ({ url }) =>
  new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /api/",
      "Disallow: /unggahan/",
      "Disallow: /ppdb/ujian",
      "",
      `Sitemap: ${asalSitus(url)}/sitemap.xml`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );

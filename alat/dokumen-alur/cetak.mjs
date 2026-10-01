import { buka } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const c = await buka();
await c.pergi("file://" + process.cwd() + "/dokumentasi.html", 1500);
const kaki = `<div style="font-family:Helvetica Neue,Helvetica,Arial;font-size:8pt;color:#6b7280;width:100%;padding:0 20mm;display:flex;justify-content:space-between"><span>Dokumentasi Alur Sistem SMA IMTEK</span><span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span></div>`;
const h = await c.k("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: kaki });
writeFileSync(process.argv[2], Buffer.from(h.result.data, "base64"));
await c.tutup(); process.exit(0);

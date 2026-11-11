// Renders compact/BLADUS-backend-compact.md to HTML and PDF (does not touch dist/).
// Documentation tooling only. Same temp tools as build_dist.mjs (marked, puppeteer-core, local Chrome).
// Run from docs/backend:  python _tools/build_compact.py && node _tools/build_compact.mjs
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = process.env.BLADUS_TOOLS || path.join(os.tmpdir(), "bladus-tools");
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const { Marked } = createRequire(path.join(TOOLS, "dist-build", "package.json"))("marked");
const puppeteer = createRequire(path.join(TOOLS, "package.json"))("puppeteer-core");

const dir = path.join(ROOT, "compact");
const md = fs.readFileSync(path.join(dir, "BLADUS-backend-compact.md"), "utf8");
const DATE = new Date().toISOString().slice(0, 10);

let n = 0;
const slug = (t) => "s" + ++n + "-" + t.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const toc = [];
const marked = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = slug(text);
      if (depth === 2) toc.push({ id, text });
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
    image({ href, text }) {
      return `<figure><img src="${href}" alt="${text}"></figure>`;
    },
  },
});
let body = marked.parse(md);
// keep each diagram with its title on the same page
body = body.replace(/(<h3[^>]*>[^]*?<\/h3>)\s*<p>(<figure>[^]*?<\/figure>)<\/p>/g, '<div class="keep">$1$2</div>');
// title block -> cover
const firstH2 = body.indexOf("<h2");
const intro = body.slice(0, firstH2);
body = body.slice(firstH2);

const CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#334155;font-size:10.5px;line-height:1.5}
h1,h2,h3,h4{color:#152C52;line-height:1.25}
h2{font-size:17px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #0B57D0;page-break-after:avoid}
h3{font-size:12.5px;margin:16px 0 6px;page-break-after:avoid}
h4{font-size:11px;margin:12px 0 4px;page-break-after:avoid}
p{margin:5px 0}
table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:9.3px}
th,td{border:1px solid #D3DCE8;padding:3px 5px;text-align:left;vertical-align:top}
th{background:#F1F5FB;color:#152C52}
tr{page-break-inside:avoid}
code{font-family:Consolas,monospace;font-size:.92em;background:#F1F5FB;padding:0 2px;border-radius:3px}
pre{background:#F5F8FC;border:1px solid #D3DCE8;border-radius:5px;padding:7px 9px;font-size:8px;line-height:1.35;white-space:pre-wrap;word-break:break-word}
pre code{background:none;padding:0}
.keep{page-break-inside:avoid}
figure{margin:8px 0;text-align:center;page-break-inside:avoid}
figure img{max-width:100%;max-height:205mm}
.sql pre{font-size:6.3px;line-height:1.25;column-count:2;column-gap:14px;border:0;background:none;padding:0}
.cover{height:297mm;page-break-after:always;display:flex;flex-direction:column;justify-content:center;padding:0 16mm;background:linear-gradient(135deg,#0E1F3B,#0B57D0);color:#fff}
.cover h1{color:#fff;font-size:34px;margin:6px 0 10px}
.cover p{font-size:13px;margin:4px 0;color:#E2EAF5}
.cover code{background:none;color:#fff}
.toc{page-break-after:always}
.toc h2{page-break-before:avoid}
.toc ol{font-size:12px;line-height:2}
.toc a{color:#152C52;text-decoration:none}
@page{size:A4;margin:15mm 13mm 16mm}
@page:first{margin:0}
`;
const cover = `<div class="cover"><p>BLADUS</p>${intro.replace(/<h1[^>]*>/, "<h1>")}<p style="margin-top:28px;font-size:10px">Legal and tax points are research, to confirm with a professional.</p></div>`;
const tocHtml = `<div class="toc"><h2>Contents</h2><ol>${toc.map((t) => `<li><a href="#${t.id}">${t.text.replace(/^\d+\.\s*/, "")}</a></li>`).join("")}</ol></div>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BLADUS backend: compact blueprint</title><style>${CSS}</style></head><body>${cover}${tocHtml}${body}</body></html>`;
const htmlFile = path.join(dir, "BLADUS-backend-compact.html");
fs.writeFileSync(htmlFile, html);

const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "networkidle0", timeout: 180000 });
const out = path.join(dir, "BLADUS-backend-compact.pdf");
await page.pdf({
  path: out, format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font-size:7px;width:100%;padding:0 13mm;color:#64748B;display:flex;justify-content:space-between"><span>BLADUS backend, compact blueprint, ${DATE}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
await browser.close();
console.log("pdf", (fs.statSync(out).size / 1048576).toFixed(1), "MB");

// Builds the BLADUS backend blueprint package:
//   dist/site/            browsable HTML (one page per document, sidebar navigation)
//   dist/BLADUS-backend-blueprint.html   everything in one page (print source)
//   dist/BLADUS-backend-blueprint.pdf    everything in one PDF (cover, contents, page numbers)
//
// Documentation tooling only. Node packages live OUTSIDE the repo:
//   %TEMP%/bladus-tools/dist-build/node_modules   marked, marked-gfm-heading-id, js-yaml
//   %TEMP%/bladus-tools/node_modules              @mermaid-js/mermaid-cli (brings puppeteer-core)
// Setup once:
//   cd %TEMP%/bladus-tools/dist-build && npm init -y && npm i marked marked-gfm-heading-id js-yaml
//   cd %TEMP%/bladus-tools && npm i @mermaid-js/mermaid-cli   (PUPPETEER_SKIP_DOWNLOAD=1, uses local Chrome)
// Run from docs/backend:  node _tools/build_dist.mjs

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const TOOLS = process.env.BLADUS_TOOLS || path.join(os.tmpdir(), "bladus-tools");
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const reqBuild = createRequire(path.join(TOOLS, "dist-build", "package.json"));
const reqTools = createRequire(path.join(TOOLS, "package.json"));
const { Marked } = reqBuild("marked");
const { gfmHeadingId } = reqBuild("marked-gfm-heading-id");
const yaml = reqBuild("js-yaml");

const DIST = path.join(ROOT, "dist");
const SITE = path.join(DIST, "site");
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ document order
const PARTS = [
  { title: "Start here", docs: ["00-START-HERE.md", "explain-like-im-new.md", "glossary.md"] },
  { title: "Phase 1 and 2: discovery and research", docs: ["01-system-inventory.md", "02-research.md"] },
  { title: "Phase 3: requirements and rules", docs: ["03-requirements.md", "04-business-rules.md"] },
  { title: "Phase 4: diagrams", docs: ["diagrams/README.md", "@diagram-gallery"] },
  { title: "Phase 5: database", docs: ["05-database-schema.md", "05b-data-dictionary.md"] },
  { title: "Phase 6: API", docs: ["06-api-design.md", "@api-reference"] },
  { title: "Phase 7: architecture and operations", docs: ["07-architecture.md", "08-security-privacy.md", "09-devops-hosting.md", "10-testing-quality.md"] },
  { title: "Phase 8: plan and decisions", docs: ["11-roadmap.md", "12-risks.md", "13-decisions-needed.md", "14-open-questions.md", "traceability.md", "15-readiness-and-first-build-prompt.md"] },
  { title: "Appendices (raw working notes)", docs: ["_work/frontend-inventory.md", "_work/admin-inventory.md", "_work/spec-vs-code.md", "_work/click-through.md", "_work/research-platforms-django.md", "_work/research-algeria-security.md", "CHANGELOG.md"] },
];

const slugOf = (rel) => rel.replace(/^@/, "").replace(/\.md$/, "").replace(/[\\/]/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
const exists = (rel) => rel.startsWith("@") || fs.existsSync(path.join(ROOT, rel));

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function titleOf(md, fallback) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/[`*]/g, "").trim() : fallback;
}

let mermaidCount = 0;
function renderMermaid(code, outDir) {
  const mmdc = path.join(TOOLS, "node_modules", ".bin", process.platform === "win32" ? "mmdc.cmd" : "mmdc");
  const name = `mermaid-${++mermaidCount}.svg`;
  const tmp = path.join(TOOLS, `__m${mermaidCount}.mmd`);
  fs.writeFileSync(tmp, code);
  const pcfg = path.join(TOOLS, "puppeteer.json");
  if (!fs.existsSync(pcfg)) fs.writeFileSync(pcfg, JSON.stringify({ executablePath: CHROME, args: ["--no-sandbox"] }));
  fs.mkdirSync(outDir, { recursive: true });
  try {
    execFileSync(mmdc, ["-i", tmp, "-o", path.join(outDir, name), "-p", pcfg, "-b", "white", "-q"], { stdio: "pipe", shell: true });
    return name;
  } catch (e) {
    console.warn("mermaid failed:", String(e.stderr || e).slice(0, 200));
    return null;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** Markdown -> HTML. `mode` = "site" (multi-page) or "book" (single page). */
function mdToHtml(md, rel, mode) {
  const docDir = path.posix.dirname(rel.replace(/\\/g, "/"));
  const slug = slugOf(rel);
  const renderer = {};
  const assetsDir = mode === "site" ? path.join(SITE, "assets") : path.join(DIST, "assets");

  renderer.code = ({ text, lang }) => {
    if (lang === "mermaid") {
      const file = renderMermaid(text, assetsDir);
      if (file) return `<figure class="mermaid"><img src="assets/${file}" alt="Diagram"></figure>`;
    }
    return `<pre><code class="lang-${esc(lang || "")}">${esc(text)}</code></pre>`;
  };

  const resolve = (href) => {
    if (!href || /^(https?:|mailto:)/.test(href)) return href;
    const [p, hash] = href.split("#");
    if (!p) return mode === "book" ? `#${slug}--${hash}` : href; // same-document anchor
    const target = path.posix.normalize(path.posix.join(docDir === "." ? "" : docDir, p));
    if (target.endsWith(".md")) {
      const tslug = slugOf(target);
      if (mode === "book") return hash ? `#${tslug}--${hash}` : `#${tslug}`;
      return `${tslug}.html${hash ? "#" + hash : ""}`;
    }
    if (/\.(svg|png)$/.test(target)) return target; // images/diagrams copied with same relative path
    return `files/${path.posix.basename(target)}`; // csv, yaml, dbml, sql, mmd
  };

  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const h = resolve(href);
    return `<a href="${esc(h)}"${title ? ` title="${esc(title)}"` : ""}>${text}</a>`;
  };
  renderer.image = ({ href, text }) => `<img src="${esc(resolve(href))}" alt="${esc(text)}">`;

  const local = new Marked({ gfm: true, renderer });
  local.use(gfmHeadingId({ prefix: mode === "book" ? `${slug}--` : "" }));
  let html = local.parse(md);
  // In-plain-words boxes get their own style
  html = html.replace(/<blockquote>\s*<p><strong>In plain words<\/strong>/g, '<blockquote class="plain"><p><strong>In plain words</strong>');
  // keep the box's line breaks (one idea per line)
  html = html.replace(/<blockquote class="plain">([\s\S]*?)<\/blockquote>/g, (m, inner) =>
    `<blockquote class="plain">${inner.replace(/<p>([\s\S]*?)<\/p>/g, (pm, txt) => `<p>${txt.trim().replace(/\n/g, "<br>")}</p>`)}</blockquote>`);
  return html;
}

function apiReferenceMd() {
  const f = path.join(ROOT, "openapi.yaml");
  if (!fs.existsSync(f)) return "# API reference\n\n`openapi.yaml` is not available yet.\n";
  const spec = yaml.load(fs.readFileSync(f, "utf8"));
  const rows = [];
  for (const [p, item] of Object.entries(spec.paths || {})) {
    for (const [m, op] of Object.entries(item)) {
      if (!["get", "post", "put", "patch", "delete"].includes(m)) continue;
      rows.push({
        tag: (op.tags || ["other"])[0],
        line: `| ${m.toUpperCase()} | \`${p}\` | ${String(op.summary || "").replace(/\|/g, "/")} | ${(op["x-requirements"] || []).join(", ")}${op["x-dormant"] ? " (dormant)" : ""} |`,
      });
    }
  }
  const byTag = {};
  for (const r of rows) (byTag[r.tag] ||= []).push(r.line);
  let out = `# API reference (generated from openapi.yaml)\n\n> **In plain words**\n> Every API address the backend will offer, grouped by area, with the requirements each one serves.\n> It is generated from [openapi.yaml](openapi.yaml), the machine-readable contract. ${rows.length} operations.\n\n`;
  out += `Title: ${spec.info?.title || ""}, version ${spec.info?.version || ""}.\n\n`;
  for (const [tag, lines] of Object.entries(byTag)) {
    out += `## ${tag}\n\n| Method | Path | What it does | Requirements |\n|---|---|---|---|\n${lines.join("\n")}\n\n`;
  }
  return out;
}

function galleryMd() {
  const readme = fs.readFileSync(path.join(ROOT, "diagrams", "README.md"), "utf8");
  let out = `# Diagram gallery

> **In plain words**
> Every diagram of the blueprint, embedded as a picture with its caption.
> How to read each kind of diagram is explained in the legend on the previous page.

`;
  for (const m of readme.matchAll(/^\| \[([^\]]+)\]\(rendered\/([^)]+)\) \| (.+) \|$/gm)) {
    out += `## ${m[1]}

![${m[1]}](diagrams/rendered/${m[2]})

${m[3]}

`;
  }
  return out;
}

function readDoc(rel) {
  if (rel === "@api-reference") return { md: apiReferenceMd(), title: "API reference" };
  if (rel === "@diagram-gallery") return { md: galleryMd(), title: "Diagram gallery" };
  const md = fs.readFileSync(path.join(ROOT, rel), "utf8");
  return { md, title: titleOf(md, rel) };
}

// ------------------------------------------------------------------ styles
const CSS = `
:root{--ink:#152C52;--ink2:#334155;--muted:#475569;--blue:#0B57D0;--line:#D3DCE8;--band:#F5F8FC;--plain:#EFF5FF}
*{box-sizing:border-box}
body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:var(--ink2);line-height:1.55;font-size:15px;background:#fff}
h1,h2,h3,h4{color:var(--ink);line-height:1.25}
h1{font-size:2rem;margin:0 0 .6em}
h2{font-size:1.35rem;margin-top:2em;padding-top:.4em;border-top:1px solid var(--line)}
h3{font-size:1.1rem;margin-top:1.6em}
a{color:var(--blue)}
code{font-family:Consolas,monospace;font-size:.88em;background:var(--band);padding:.1em .3em;border-radius:4px}
pre{background:#0E1F3B;color:#E2EAF5;padding:12px 14px;border-radius:8px;overflow:auto;font-size:12.5px;line-height:1.45}
pre code{background:none;color:inherit;padding:0}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:13px;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:6px 8px;text-align:start;vertical-align:top}
th{background:var(--band);color:var(--ink)}
tr:nth-child(even) td{background:#FBFCFE}
blockquote{margin:1em 0;padding:.6em 1em;border-inline-start:4px solid var(--line);color:var(--muted)}
blockquote.plain{background:var(--plain);border-inline-start-color:var(--blue);color:var(--ink);border-radius:0 8px 8px 0}
img{max-width:100%}
figure.mermaid{margin:1em 0;text-align:center}
ul.contains-task-list{list-style:none;padding-inline-start:1em}
.layout{display:flex;min-height:100vh}
nav.side{width:290px;flex:none;background:var(--band);border-inline-end:1px solid var(--line);padding:18px 16px;position:sticky;top:0;height:100vh;overflow:auto;font-size:13.5px}
nav.side .brand{font-weight:700;color:var(--ink);font-size:16px;margin-bottom:4px}
nav.side .part{margin:14px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700}
nav.side a{display:block;padding:3px 6px;border-radius:6px;text-decoration:none;color:var(--ink2)}
nav.side a.on{background:#fff;color:var(--blue);font-weight:600;box-shadow:0 0 0 1px var(--line)}
main{flex:1;min-width:0;max-width:1050px;padding:32px 40px 80px}
.meta{color:var(--muted);font-size:12px;margin-bottom:16px}
.pager{display:flex;justify-content:space-between;margin-top:3em;padding-top:1em;border-top:1px solid var(--line)}
/* book */
.book main{max-width:none;padding:0}
.cover{height:100vh;display:flex;flex-direction:column;justify-content:center;padding:0 12%;background:linear-gradient(135deg,#0E1F3B,#0B57D0);color:#fff}
.cover h1{color:#fff;font-size:44px;margin:.2em 0}
.cover p{font-size:18px;opacity:.9}
.toc ol{line-height:1.9}
section.doc{page-break-before:always;padding:0}
@media print{
  body{font-size:11.5px}
  table{display:table;font-size:10px}
  pre{white-space:pre-wrap;word-break:break-word;font-size:9.5px}
  h2{page-break-after:avoid}
  tr,figure,img{page-break-inside:avoid}
  a{color:var(--ink);text-decoration:none}
}
@page{size:A4;margin:16mm 14mm 18mm}
`;

// ------------------------------------------------------------------ build
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, "files"), { recursive: true });
fs.mkdirSync(path.join(DIST, "files"), { recursive: true });

// copy rendered diagrams + raw files
const copyDir = (from, to) => fs.existsSync(from) && fs.cpSync(from, to, { recursive: true });
copyDir(path.join(ROOT, "diagrams", "rendered"), path.join(SITE, "diagrams", "rendered"));
copyDir(path.join(ROOT, "diagrams", "rendered"), path.join(DIST, "diagrams", "rendered"));
for (const f of ["requirements.csv", "traceability.csv", "openapi.yaml", "schema.dbml", "schema.sql"]) {
  if (fs.existsSync(path.join(ROOT, f))) {
    fs.copyFileSync(path.join(ROOT, f), path.join(SITE, "files", f));
    fs.copyFileSync(path.join(ROOT, f), path.join(DIST, "files", f));
  }
}

const docs = PARTS.flatMap((p) => p.docs.filter(exists).map((d) => ({ part: p.title, rel: d, slug: slugOf(d) })));
const missing = PARTS.flatMap((p) => p.docs.filter((d) => !exists(d)));
for (const d of docs) Object.assign(d, readDoc(d.rel));

// site pages
const nav = (current) =>
  `<nav class="side"><div class="brand">BLADUS backend blueprint</div><div class="meta">Built ${BUILD_DATE} · <a href="../BLADUS-backend-blueprint.pdf">PDF</a></div>` +
  PARTS.map((p) => {
    const items = docs.filter((d) => d.part === p.title);
    if (!items.length) return "";
    return `<div class="part">${esc(p.title)}</div>` + items.map((d) => `<a class="${d.slug === current ? "on" : ""}" href="${d.slug === slugOf("00-START-HERE.md") ? "index" : d.slug}.html">${esc(d.title)}</a>`).join("");
  }).join("") + `<div class="part">Files</div>` +
  ["openapi.yaml", "schema.dbml", "schema.sql", "requirements.csv", "traceability.csv"].filter((f) => fs.existsSync(path.join(ROOT, f))).map((f) => `<a href="files/${f}">${f}</a>`).join("") +
  `</nav>`;

docs.forEach((d, i) => {
  const body = mdToHtml(d.md, d.rel.startsWith("@") ? "x.md" : d.rel, "site");
  const prev = docs[i - 1], next = docs[i + 1];
  const link = (x) => (x.slug === slugOf("00-START-HERE.md") ? "index" : x.slug) + ".html";
  const pager = `<div class="pager"><span>${prev ? `<a href="${link(prev)}">&larr; ${esc(prev.title)}</a>` : ""}</span><span>${next ? `<a href="${link(next)}">${esc(next.title)} &rarr;</a>` : ""}</span></div>`;
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.title)} · BLADUS backend blueprint</title><style>${CSS}</style></head><body><div class="layout">${nav(d.slug)}<main><div class="meta">${esc(d.part)}</div>${body}${pager}</main></div></body></html>`;
  fs.writeFileSync(path.join(SITE, `${link(d)}`), page);
});

// single-page book
const toc = `<section class="doc toc"><h1>Contents</h1>` + PARTS.map((p) => {
  const items = docs.filter((d) => d.part === p.title);
  if (!items.length) return "";
  return `<h3>${esc(p.title)}</h3><ol>${items.map((d) => `<li><a href="#${d.slug}">${esc(d.title)}</a></li>`).join("")}</ol>`;
}).join("") + `</section>`;
const sections = docs.map((d) => `<section class="doc" id="${d.slug}">${mdToHtml(d.md, d.rel.startsWith("@") ? "x.md" : d.rel, "book")}</section>`).join("\n");
const cover = `<div class="cover"><p>BLADUS (formerly DARNA)</p><h1>Backend Discovery &amp; Blueprint</h1><p>Django · PostgreSQL + PostGIS · Algeria</p><p style="margin-top:3em;font-size:14px">Analysis and documentation only. Build date ${BUILD_DATE}.<br>Legal, tax and financial points are research, not advice: VERIFY WITH A PROFESSIONAL.</p></div>`;
const book = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BLADUS backend blueprint</title><style>${CSS}</style></head><body class="book">${cover}${toc}<main>${sections}</main></body></html>`;
const bookFile = path.join(DIST, "BLADUS-backend-blueprint.html");
fs.writeFileSync(bookFile, book);

// PDF with page numbers (puppeteer-core from the mermaid-cli install)
const puppeteer = reqTools("puppeteer-core");
const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(pathToFileURL(bookFile).href, { waitUntil: "load", timeout: 120000 });
await page.pdf({
  path: path.join(DIST, "BLADUS-backend-blueprint.pdf"),
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:8px;width:100%;padding:0 14mm;color:#64748B">BLADUS backend blueprint</div>`,
  footerTemplate: `<div style="font-size:8px;width:100%;padding:0 14mm;color:#64748B;display:flex;justify-content:space-between"><span>Build ${BUILD_DATE}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
});
await browser.close();

fs.writeFileSync(path.join(DIST, "README.txt"),
  `BLADUS backend blueprint, build ${BUILD_DATE}\n\n` +
  `site/index.html                    browsable version (open in a browser)\n` +
  `BLADUS-backend-blueprint.pdf       everything in one PDF\n` +
  `BLADUS-backend-blueprint.html      everything in one page (print source)\n` +
  `files/                             openapi.yaml, schema.dbml, schema.sql, requirements.csv, traceability.csv\n\n` +
  `Rebuild: node docs/backend/_tools/build_dist.mjs\n`);

console.log(`docs: ${docs.length}, mermaid diagrams rendered: ${mermaidCount}, missing (skipped): ${missing.join(", ") || "none"}`);

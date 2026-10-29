// Checks that every locale has the same namespace files and the same keys,
// that every namespace file is listed in messages/namespaces.ts, and that
// ICU placeholders ({name}) match between locales.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = path.join(rootDir, "messages");
const locales = ["en", "fr", "ar"];

const listed = [
  ...fs.readFileSync(path.join(messagesDir, "namespaces.ts"), "utf-8").matchAll(/"([^"]+)"/g),
].map((m) => m[1]);

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

// Argument names only ("{city}", "{count, plural, ...}"), not plural branch bodies like "{1 guest}".
const placeholders = (s) =>
  [...new Set([...s.matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)].map((m) => m[1]))].sort().join(",");

const errors = [];
const byLocale = {};

for (const loc of locales) {
  const dir = path.join(messagesDir, loc);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  for (const f of files) if (!listed.includes(f)) errors.push(`[${loc}] ${f}.json is not listed in messages/namespaces.ts`);
  for (const ns of listed) if (!files.includes(ns)) errors.push(`[${loc}] missing messages/${loc}/${ns}.json`);
  const all = {};
  for (const ns of files) {
    try {
      flatten(JSON.parse(fs.readFileSync(path.join(dir, `${ns}.json`), "utf-8")), ns, all);
    } catch (e) {
      errors.push(`[${loc}] invalid JSON in ${ns}.json: ${e.message}`);
    }
  }
  byLocale[loc] = all;
}

const base = byLocale.en;
for (const loc of ["fr", "ar"]) {
  const cur = byLocale[loc];
  for (const k of Object.keys(base)) {
    if (!(k in cur)) errors.push(`[${loc}] missing key ${k}`);
    else if (placeholders(base[k]) !== placeholders(cur[k])) errors.push(`[${loc}] placeholder mismatch in ${k}`);
  }
  for (const k of Object.keys(cur)) if (!(k in base)) errors.push(`[${loc}] extra key ${k}`);
}

if (errors.length) {
  console.error(`i18n check failed (${errors.length}):\n` + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`i18n check passed: ${Object.keys(base).length} keys in ${listed.length} namespaces, locales ${locales.join("/")}.`);

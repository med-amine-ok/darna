import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const messagesDir = path.join(rootDir, "messages");

const locales = ["en", "fr", "ar"];

console.log("🔍 Checking i18n translation parity across locales:", locales.join(", "));

function flattenKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const localeKeys = {};
let hasError = false;

for (const loc of locales) {
  const filePath = path.join(messagesDir, `${loc}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing locale translation file: ${filePath}`);
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);
    localeKeys[loc] = new Set(flattenKeys(json));
    console.log(`  ✓ ${loc}: ${localeKeys[loc].size} keys parsed`);
  } catch (err) {
    console.error(`❌ Failed parsing JSON in ${filePath}:`, err.message);
    process.exit(1);
  }
}

// Compare base (en) with others
const baseKeys = localeKeys["en"];

for (const loc of ["fr", "ar"]) {
  const currentKeys = localeKeys[loc];

  // Missing keys in current locale that exist in en
  const missing = [...baseKeys].filter((k) => !currentKeys.has(k));
  // Extra keys in current locale that don't exist in en
  const extra = [...currentKeys].filter((k) => !baseKeys.has(k));

  if (missing.length > 0) {
    console.error(`\n❌ [${loc}] Missing ${missing.length} keys defined in [en]:`);
    missing.forEach((k) => console.error(`    - ${k}`));
    hasError = true;
  }

  if (extra.length > 0) {
    console.error(`\n❌ [${loc}] Found ${extra.length} orphan keys not in [en]:`);
    extra.forEach((k) => console.error(`    + ${k}`));
    hasError = true;
  }
}

if (hasError) {
  console.error("\n❌ i18n parity check FAILED. Please sync keys across en, fr, and ar.");
  process.exit(1);
} else {
  console.log("\n✅ i18n parity check PASSED! 100% key synchronization across en, fr, ar.");
  process.exit(0);
}

/**
 * Shared CSV serialisation (RFC 4180) with spreadsheet formula-injection
 * protection. Client- and server-safe.
 *
 *  - every cell is wrapped in double quotes and inner quotes are doubled;
 *  - a cell whose text starts with = + - @ TAB or CR is prefixed with a single
 *    quote so Excel / Sheets / LibreOffice treat it as text, not a formula
 *    (OWASP "CSV injection"). Numbers are left untouched.
 */

export type CsvValue = string | number | boolean | null | undefined | Date;

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "number") {
    return Number.isFinite(value) ? `"${value}"` : '""';
  }
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_TRIGGER.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Serialises a header row plus data rows. Lines end with CRLF. */
export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<CsvValue>>): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}

/** Result shape returned by the export server actions. */
export interface CsvExport {
  filename: string;
  csv: string;
  rowCount: number;
}

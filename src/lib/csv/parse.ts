import Papa from "papaparse";
import { LIMITS } from "./schema";

export interface ParsedCsv {
  headers: string[];            // de-duplicated: second "category" becomes "category__2"
  duplicateHeaders: string[];   // original names that appeared more than once
  rows: Record<string, string>[];
  rowNumbers: number[];         // 1-based data-record number (header is record 0)
  parseErrors: { row: number; message: string }[];
}

export class CsvError extends Error {
  constructor(public code: "TOO_LARGE" | "BAD_ENCODING" | "EMPTY" | "TOO_MANY_ROWS" | "NO_HEADER" | "PARSE", message: string) {
    super(message);
  }
}

/** Decode bytes as strict UTF-8 (BOM tolerated). Rejects invalid sequences instead of silently corrupting Bengali text. */
export function decodeUtf8(bytes: Uint8Array): string {
  if (bytes.byteLength > LIMITS.maxFileBytes) {
    throw new CsvError("TOO_LARGE", `File is ${bytes.byteLength} bytes; limit is ${LIMITS.maxFileBytes}.`);
  }
  try {
    // ignoreBOM:false -> decoder strips a leading BOM
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    throw new CsvError("BAD_ENCODING", "File is not valid UTF-8. Re-save it as 'CSV UTF-8' and try again.");
  }
}

export function parseCsvText(text: string): ParsedCsv {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!text.trim()) throw new CsvError("EMPTY", "File is empty.");

  // header:false so duplicate header names are never silently overwritten.
  const res = Papa.parse<string[]>(text, { header: false, skipEmptyLines: "greedy" });
  const parseErrors = res.errors.map((e) => ({ row: (e.row ?? 0), message: e.message }));
  const [rawHeader, ...body] = res.data;
  if (!rawHeader || rawHeader.every((h) => !h.trim())) throw new CsvError("NO_HEADER", "No header row found.");
  if (body.length > LIMITS.maxRows) throw new CsvError("TOO_MANY_ROWS", `${body.length} rows exceeds the limit of ${LIMITS.maxRows}.`);

  const seen = new Map<string, number>();
  const dupes = new Set<string>();
  const headers = rawHeader.map((h, i) => {
    const base = h.trim() || `column_${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    if (n > 1) dupes.add(base);
    return n === 1 ? base : `${base}__${n}`;
  });

  const rows: Record<string, string>[] = [];
  const rowNumbers: number[] = [];
  body.forEach((cells, idx) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => (rec[h] = cells[i] ?? ""));
    if (cells.length > headers.length) {
      parseErrors.push({ row: idx + 1, message: `Row has ${cells.length} cells but header has ${headers.length}.` });
    }
    rows.push(rec);
    rowNumbers.push(idx + 1);
  });
  return { headers, duplicateHeaders: [...dupes], rows, rowNumbers, parseErrors };
}

export function parseCsvBytes(bytes: Uint8Array): ParsedCsv {
  return parseCsvText(decodeUtf8(bytes));
}

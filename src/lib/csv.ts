// Minimal CSV utilities — no dependencies.
// Handles quoted fields, embedded commas, quotes, and newlines.

export function toCSV(rows: Record<string, any>[], columns?: string[]): string {
  if (!rows || rows.length === 0) {
    return columns ? columns.join(',') + '\n' : '';
  }
  const cols = columns || Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const escape = (val: any): string => {
    if (val === null || val === undefined) return '';
    let s: string;
    if (typeof val === 'object') {
      try { s = JSON.stringify(val); } catch { s = String(val); }
    } else {
      s = String(val);
    }
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row?.[c])).join(','));
  }
  return lines.join('\n') + '\n';
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// RFC-4180-ish parser. Returns array of row objects keyed by header.
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { cur.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') {
      cur.push(field); rows.push(cur); cur = []; field = ''; i++; continue;
    }
    field += ch; i++;
  }
  // Tail
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  // Drop trailing empty row
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = rows[r][idx] ?? ''; });
    out.push(obj);
  }
  return { headers, rows: out };
}

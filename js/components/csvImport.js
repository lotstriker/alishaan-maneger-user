/* ============================================================
   ALISHAN · CSV IMPORT HELPER
   Minimal CSV parser. Handles quoted fields and escaped quotes.
   ============================================================ */

const CSVImport = (() => {

  function parse(text) {
    const lines = splitLines(text);
    if (!lines.length) return { headers: [], rows: [] };

    const headers = parseRow(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cells = parseRow(line);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h.trim().toLowerCase()] = (cells[idx] ?? '').trim();
      });
      rows.push(obj);
    }
    return { headers, rows };
  }

  function splitLines(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') inQuotes = !inQuotes;
      if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (current.trim()) lines.push(current);
        current = '';
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else {
        current += ch;
      }
    }
    if (current.trim()) lines.push(current);
    return lines;
  }

  function parseRow(line) {
    const cells = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cell);
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell);
    return cells;
  }

  return { parse };
})();

window.CSVImport = CSVImport;
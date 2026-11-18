export const PERSONNEL_HEADERS = [
  'Cedula',
  'Codigo trabajador',
  'Apellidos',
  'Nombres',
  'Email',
  'Telefono',
  'Fecha nacimiento',
  'Provincia de nacimiento',
  'Ciudad de nacimiento',
  'Parroquia de nacimiento',
  'Direccion',
  'Direccion domiciliaria',
  'Direccion de residencia',
  'Fecha ingreso',
  'Fecha de salida',
  'Salario',
  'Departamento',
  'Cargo',
  'Tipo de contrato',
  'Empresa contratista',
  'Bloque contratista',
  'Genero',
  'Estado civil',
  'Etnia',
  'Jornada de trabajo',
  'Horario de trabajo',
  'Tipo de sangre',
  'Nivel de educacion',
  'Discapacidad',
  'Codigo IESS',
  'Nombre contacto',
  'Parentesco',
  'Telefono contacto',
  'Estado'
];

export async function buildPersonnelTemplate(): Promise<Blob> {
  const imported: any = await import('jszip');
  const JSZip = imported.default || imported;
  const zip = new JSZip();
  const headerCells = PERSONNEL_HEADERS.map((header, index) => {
    const ref = `${columnName(index)}1`;
    return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(header)}</t></is></c>`;
  }).join('');
  const widths = PERSONNEL_HEADERS.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="22" customWidth="1"/>`).join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Personal" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);
  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${widths}</cols>
  <sheetData><row r="1">${headerCells}</row></sheetData>
</worksheet>`);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

export async function parsePersonnelWorkbook(file: File): Promise<Array<Record<string, string>>> {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    return parseDelimited(text);
  }
  const imported: any = await import('jszip');
  const JSZip = imported.default || imported;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sheetFile = zip.file('xl/worksheets/sheet1.xml');
  if (!sheetFile) {
    throw new Error('El archivo no tiene una hoja de cálculo válida.');
  }
  const sheetXml = await sheetFile.async('string');
  const sharedXml = zip.file('xl/sharedStrings.xml') ? await zip.file('xl/sharedStrings.xml')!.async('string') : '';
  const shared = readSharedStrings(sharedXml);
  return readSheetRows(sheetXml, shared);
}

function parseDelimited(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim().length > 0);
  if (!lines.length) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] || '').trim();
    });
    return row;
  }).filter(row => Object.values(row).some(value => value));
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function readSharedStrings(xml: string): string[] {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('si')).map(node =>
    Array.from(node.getElementsByTagName('t')).map(item => item.textContent || '').join('')
  );
}

function readSheetRows(xml: string, shared: string[]): Array<Record<string, string>> {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const rows = Array.from(doc.getElementsByTagName('row'));
  if (!rows.length) return [];
  const matrix = rows.map(row => {
    const cells: string[] = [];
    Array.from(row.getElementsByTagName('c')).forEach(cell => {
      const ref = cell.getAttribute('r') || 'A1';
      const index = columnIndex(ref.replace(/\d+/g, ''));
      cells[index] = readCell(cell, shared);
    });
    return cells;
  });
  const headers = (matrix[0] || []).map(value => normalizeHeader(value || ''));
  return matrix.slice(1).map(cells => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const raw = cells[index] || '';
      row[header] = header.includes('fecha') ? excelDateToIso(raw) : raw.trim();
    });
    return row;
  }).filter(row => Object.values(row).some(value => value));
}

function readCell(cell: Element, shared: string[]): string {
  const type = cell.getAttribute('t') || '';
  if (type === 'inlineStr') {
    return Array.from(cell.getElementsByTagName('t')).map(item => item.textContent || '').join('').trim();
  }
  const value = cell.getElementsByTagName('v')[0]?.textContent || '';
  if (type === 's') {
    const index = Number(value);
    return (shared[index] || '').trim();
  }
  return value.trim();
}

function excelDateToIso(value: string): string {
  const text = (value || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const slash = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 80000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return text;
}

export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function columnName(index: number): string {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function columnIndex(letters: string): number {
  return letters.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convierte yyyy-MM-dd (API) a dd/MM/yyyy para mostrar. */
export function formatDateDmy(value?: string | null): string {
  if (!value) return '';
  const raw = String(value).trim().split(/[T\s]/)[0];
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (dmy) {
    return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  }
  return raw;
}

/** Parsea dd/MM/yyyy o yyyy-MM-dd a yyyy-MM-dd. null si inválida. */
export function parseDateDmy(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return isValidYmd(+iso[1], +iso[2], +iso[3]) ? s : null;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!dmy) return null;
  const dd = +dmy[1];
  const mm = +dmy[2];
  const yyyy = +dmy[3];
  if (!isValidYmd(yyyy, mm, dd)) return null;
  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
}

/** Máscara de escritura: solo dígitos → dd/mm/aaaa */
export function maskDateDmy(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

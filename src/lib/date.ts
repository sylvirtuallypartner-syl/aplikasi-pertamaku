const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateStr(s: string | null | undefined): s is string {
  return !!s && DATE_RE.test(s);
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const match = DATE_RE.exec(s);
  if (!match) throw new Error(`Tanggal tidak valid: ${s}`);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function isWeekendDate(dateStr: string): boolean {
  const day = parseDateStr(dateStr).getDay();
  return day === 0 || day === 6;
}

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function dayNameLabel(dateStr: string): string {
  return DAY_NAMES[parseDateStr(dateStr).getDay()];
}

export function fullDateLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${dayNameLabel(dateStr)}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// Label pendek untuk dropdown tanggal, mis. "Kam, 30 Jul".
export function shortDateLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${DAY_NAMES_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// Senin dari minggu yang berisi dateStr.
export function mondayOf(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(dateStr, diff);
}

export function weekRange(dateStr: string): { start: string; end: string } {
  const start = mondayOf(dateStr);
  return { start, end: addDays(start, 6) };
}

// Senin-Minggu dari monday, dipakai untuk breakdown 7 hari.
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Untuk dropdown navigasi tanggal: hari ini + N hari ke belakang, terbaru dulu.
export function lastNDays(n: number): string[] {
  const today = todayStr();
  return Array.from({ length: n }, (_, i) => addDays(today, -i));
}

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

export function dayNameLabel(dateStr: string): string {
  return DAY_NAMES[parseDateStr(dateStr).getDay()];
}

export function fullDateLabel(dateStr: string): string {
  const names = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const d = parseDateStr(dateStr);
  return `${dayNameLabel(dateStr)}, ${d.getDate()} ${names[d.getMonth()]} ${d.getFullYear()}`;
}

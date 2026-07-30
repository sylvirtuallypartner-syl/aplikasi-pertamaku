import {
  ChildDef,
  applicableTasks,
  dailyMaxPoints,
  dailyTotalPoints,
  rewardHarian,
  bonusMingguan,
  BonusTier,
} from "./tasks";
import { addDays, isWeekendDate, todayStr, WEEKDAY_LABELS } from "./date";

export interface EntryRow {
  task_id: string;
  entry_date: string;
  value: number;
}

export type ValuesByDate = Record<string, Record<string, number>>;

export function upsertLocalRow(
  rows: EntryRow[],
  taskId: string,
  date: string,
  value: number
): EntryRow[] {
  const idx = rows.findIndex((r) => r.task_id === taskId && r.entry_date === date);
  if (idx === -1) return [...rows, { task_id: taskId, entry_date: date, value }];
  const copy = [...rows];
  copy[idx] = { ...copy[idx], value };
  return copy;
}

export function removeLocalRowsForDate(rows: EntryRow[], date: string): EntryRow[] {
  return rows.filter((r) => r.entry_date !== date);
}

export function rowsToValuesByDate(rows: EntryRow[]): ValuesByDate {
  const out: ValuesByDate = {};
  for (const r of rows) {
    out[r.entry_date] = out[r.entry_date] ?? {};
    out[r.entry_date][r.task_id] = r.value;
  }
  return out;
}

export interface DaySummary {
  date: string;
  weekend: boolean;
  total: number;
  max: number;
  pct: number;
  reward: number;
}

export function summarizeDay(child: ChildDef, dateStr: string, values: Record<string, number>): DaySummary {
  const weekend = isWeekendDate(dateStr);
  const max = dailyMaxPoints(child, weekend);
  const total = dailyTotalPoints(child, weekend, values);
  const pct = max ? total / max : 0;
  return { date: dateStr, weekend, total, max, pct, reward: rewardHarian(child, pct) };
}

export interface WeekSummary {
  start: string;
  end: string;
  days: Array<DaySummary & { label: string; isToday: boolean; isFuture: boolean }>;
  total: number;
  max: number;
  pct: number;
  streak: number;
  bonus: BonusTier;
}

export function summarizeWeek(
  child: ChildDef,
  mondayStr: string,
  valuesByDate: ValuesByDate,
  today: string = todayStr()
): WeekSummary {
  const days: WeekSummary["days"] = [];
  let total = 0;
  let max = 0;
  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(mondayStr, i);
    const isFuture = dateStr > today;
    const values = valuesByDate[dateStr] ?? {};
    const summary = summarizeDay(child, dateStr, isFuture ? {} : values);
    if (!isFuture) {
      total += summary.total;
      max += summary.max;
    }
    days.push({
      ...summary,
      total: isFuture ? 0 : summary.total,
      pct: isFuture ? 0 : summary.pct,
      label: WEEKDAY_LABELS[i],
      isToday: dateStr === today,
      isFuture,
    });
  }

  let streak = 0;
  let broken = false;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].isFuture) continue;
    if (!broken && days[i].pct >= 0.7) {
      streak++;
    } else {
      broken = true;
    }
  }

  const pct = max ? total / max : 0;
  return { start: mondayStr, end: addDays(mondayStr, 6), days, total, max, pct, streak, bonus: bonusMingguan(pct) };
}

export interface MonthSummary {
  year: number;
  month: number;
  days: DaySummary[];
  total: number;
  max: number;
  pct: number;
  avgReward: number;
  totalReward: number;
}

export function summarizeMonth(
  child: ChildDef,
  year: number,
  month: number,
  startStr: string,
  endStr: string,
  valuesByDate: ValuesByDate,
  today: string = todayStr()
): MonthSummary {
  const days: DaySummary[] = [];
  let cursor = startStr;
  let total = 0;
  let max = 0;
  let totalReward = 0;
  let countedDays = 0;
  while (cursor <= endStr) {
    if (cursor <= today) {
      const summary = summarizeDay(child, cursor, valuesByDate[cursor] ?? {});
      days.push(summary);
      total += summary.total;
      max += summary.max;
      totalReward += summary.reward;
      countedDays++;
    }
    cursor = addDays(cursor, 1);
  }
  const pct = max ? total / max : 0;
  const avgReward = countedDays ? Math.round(totalReward / countedDays) : 0;
  return { year, month, days, total, max, pct, avgReward, totalReward };
}

export { applicableTasks };

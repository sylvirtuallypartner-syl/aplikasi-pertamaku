export type ChildKey = "k11" | "k6";
export type ChildMode = "binary" | "tri";

export interface TaskDef {
  id: string;
  label: string;
  weekdayOnly?: boolean;
  weekendOnly?: boolean;
}

export interface RewardTier {
  min: number;
  amount: number;
}

export interface BonusTier {
  min: number;
  label: string;
  text: string;
}

export interface ChildDef {
  id: ChildKey;
  name: string;
  age: number;
  emoji: string;
  mode: ChildMode;
  tasks: TaskDef[];
  dailyRewardTiers: RewardTier[];
}

export const TASKS_11: TaskDef[] = [
  { id: "b1", label: "Bangun pagi tanpa dibangunkan (weekday 05.00-05.30 / weekend 08.00-09.00)" },
  { id: "b2", label: "Doa pagi" },
  { id: "b3", label: "Minum air putih (pagi)" },
  { id: "b4", label: "Beres kasur sendiri" },
  { id: "b5", label: "Mandi + sikat gigi sendiri" },
  { id: "b6", label: "Siapkan baju sendiri + sisiran" },
  { id: "b7", label: "Sarapan habis + minum vitamin" },
  { id: "b8", label: "Smartick (belajar mandiri, tanpa diingatkan)" },
  { id: "b9", label: "Makan siang / bekal habis" },
  { id: "b10", label: "Beres sepatu & sandal setelah dipakai" },
  { id: "b11", label: "Beres tas sekolah/les & siapkan buku besok", weekdayOnly: true },
  { id: "b12", label: "Les catur / siap-siap sekolah minggu", weekendOnly: true },
  { id: "b13", label: "Minum air cukup (target weekday 1-1,5L / weekend 2L)" },
  { id: "b14", label: "Olahraga: pull up, skipping, jumping jack (15-30 menit)" },
  { id: "b15", label: "Main/latihan piano (15-30 menit)" },
  { id: "b16", label: "Beres mainan setelah main" },
  { id: "b17", label: "Atur waktu main gadget sendiri" },
  { id: "b18", label: "Rapikan barang setelah dipakai" },
  { id: "b19", label: "Baca buku/belajar mandiri (15-30 menit)" },
  { id: "b20", label: "Renungan dan doa sebelum tidur" },
  { id: "b21", label: "Sikat gigi malam" },
  { id: "b22", label: "Tidur jam 7-8 tanpa disuruh" },
];

export const TASKS_6: TaskDef[] = [
  { id: "a1", label: "Bangun pagi" },
  { id: "a2", label: "Doa pagi" },
  { id: "a3", label: "Mandi sendiri" },
  { id: "a4", label: "Sikat gigi pagi" },
  { id: "a5", label: "Siapkan & pakai baju sendiri" },
  { id: "a6", label: "Bekal habis", weekdayOnly: true },
  { id: "a7", label: "Botol minum habis", weekdayOnly: true },
  { id: "a8", label: "Makan malam sampai habis" },
  { id: "a9", label: "Minum air cukup" },
  { id: "a10", label: "Beres mainan setelah main" },
  { id: "a11", label: "Sabar, tidak paksa-paksa" },
  { id: "a12", label: "Olahraga: pull up, skipping, jumping jack (15 menit)" },
  { id: "a13", label: "Beres sepatu & sandal (kalau habis pergi)" },
  { id: "a14", label: "Doa malam" },
  { id: "a15", label: "Sikat gigi malam" },
  { id: "a16", label: "Tidur sendiri tanpa ditemani (Mandiri) / tanpa disuruh tapi tidak di kamar sendiri (Diingatkan)" },
  { id: "a17", label: "Jaga barang, tidak dirusak" },
];

export const BONUS_MINGGUAN: BonusTier[] = [
  { min: 0.9, label: "Bonus Besar!", text: "Makan favorit (KFC/McD/Yoshinoya)." },
  { min: 0.5, label: "Bonus Kecil", text: "Nonton bioskop / movie night pilihan sendiri." },
  { min: 0, label: "Apresiasi Kecil", text: "Download 1 game." },
];

export const CHILDREN: Record<ChildKey, ChildDef> = {
  k11: {
    id: "k11",
    name: "Sean",
    age: 11,
    emoji: "🦸",
    mode: "binary",
    tasks: TASKS_11,
    dailyRewardTiers: [
      { min: 0.9, amount: 25000 },
      { min: 0.7, amount: 15000 },
      { min: 0.5, amount: 10000 },
      { min: 0, amount: 5000 },
    ],
  },
  k6: {
    id: "k6",
    name: "Gavril",
    age: 6,
    emoji: "🚀",
    mode: "tri",
    tasks: TASKS_6,
    dailyRewardTiers: [
      { min: 0.9, amount: 10000 },
      { min: 0.7, amount: 7000 },
      { min: 0.5, amount: 5000 },
      { min: 0, amount: 2000 },
    ],
  },
};

export const CHILD_ORDER: ChildKey[] = ["k11", "k6"];

export function isChildKey(v: string | null | undefined): v is ChildKey {
  return v === "k11" || v === "k6";
}

export function applicable(task: TaskDef, weekend: boolean): boolean {
  if (task.weekdayOnly && weekend) return false;
  if (task.weekendOnly && !weekend) return false;
  return true;
}

export function applicableTasks(child: ChildDef, weekend: boolean): TaskDef[] {
  return child.tasks.filter((t) => applicable(t, weekend));
}

export function dailyMaxPoints(child: ChildDef, weekend: boolean): number {
  const count = applicableTasks(child, weekend).length;
  return child.mode === "tri" ? count * 2 : count;
}

export function dailyTotalPoints(
  child: ChildDef,
  weekend: boolean,
  valuesByTaskId: Record<string, number>
): number {
  return applicableTasks(child, weekend).reduce(
    (sum, t) => sum + (valuesByTaskId[t.id] ?? 0),
    0
  );
}

export function rewardHarian(child: ChildDef, pct: number): number {
  const tier = child.dailyRewardTiers.find((t) => pct >= t.min);
  return tier ? tier.amount : 0;
}

export function bonusMingguan(pct: number): BonusTier {
  return BONUS_MINGGUAN.find((t) => pct >= t.min) ?? BONUS_MINGGUAN[BONUS_MINGGUAN.length - 1];
}

export function maxValueForChild(child: ChildDef): number {
  return child.mode === "tri" ? 2 : 1;
}

export function fmtRp(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

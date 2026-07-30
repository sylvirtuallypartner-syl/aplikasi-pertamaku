export type ChildId = "sean" | "gavril";

export interface TaskDef {
  id: string;
  label: string;
  weekdayOnly?: boolean;
  weekendOnly?: boolean;
}

export interface ChildDef {
  id: ChildId;
  name: string;
  age: number;
  emoji: string;
  color: string;
  tasks: TaskDef[];
}

// Daftar tugas tiap anak. Untuk mengubah/menambah tugas, edit array di bawah
// lalu deploy ulang (push ke branch ini) — tidak ada layar pengaturan di app.
export const CHILDREN: Record<ChildId, ChildDef> = {
  sean: {
    id: "sean",
    name: "Sean",
    age: 11,
    emoji: "🦸",
    color: "#2f7bff",
    tasks: [
      { id: "s1", label: "Rapikan kasur" },
      { id: "s2", label: "Mandi & sikat gigi pagi" },
      { id: "s3", label: "Sarapan habis" },
      { id: "s4", label: "Bekal / makan siang habis" },
      { id: "s5", label: "Beres tas & buku besok", weekdayOnly: true },
      { id: "s6", label: "Belajar mandiri 15-30 menit" },
      { id: "s7", label: "Olahraga 15 menit" },
      { id: "s8", label: "Main piano 15-30 menit" },
      { id: "s9", label: "Beres mainan setelah main" },
      { id: "s10", label: "Les catur", weekendOnly: true },
      { id: "s11", label: "Sikat gigi malam" },
      { id: "s12", label: "Tidur tepat waktu" },
    ],
  },
  gavril: {
    id: "gavril",
    name: "Gavril",
    age: 6,
    emoji: "🚀",
    color: "#22b573",
    tasks: [
      { id: "g1", label: "Bangun pagi" },
      { id: "g2", label: "Mandi sendiri" },
      { id: "g3", label: "Sikat gigi pagi" },
      { id: "g4", label: "Pakai baju sendiri" },
      { id: "g5", label: "Bekal habis", weekdayOnly: true },
      { id: "g6", label: "Botol minum habis", weekdayOnly: true },
      { id: "g7", label: "Makan malam habis" },
      { id: "g8", label: "Beres mainan setelah main" },
      { id: "g9", label: "Olahraga 15 menit" },
      { id: "g10", label: "Sikat gigi malam" },
      { id: "g11", label: "Tidur sendiri" },
    ],
  },
};

export const CHILD_ORDER: ChildId[] = ["sean", "gavril"];

export function isChildId(v: string | null | undefined): v is ChildId {
  return v === "sean" || v === "gavril";
}

export function tasksForToday(child: ChildDef, weekend: boolean): TaskDef[] {
  return child.tasks.filter((t) => {
    if (t.weekdayOnly && weekend) return false;
    if (t.weekendOnly && !weekend) return false;
    return true;
  });
}

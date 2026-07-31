export interface StatusEntry {
  done: boolean;
  approved: boolean;
}

export const EMPTY_ENTRY: StatusEntry = { done: false, approved: false };

// ⬜ belum -> ✅ dilaporkan anak -> ✅✅ disetujui Ibu.
export function statusIcon(entry: StatusEntry): string {
  if (!entry.done) return "⬜";
  return entry.approved ? "✅✅" : "✅";
}

export function statusRowClass(entry: StatusEntry): string {
  if (!entry.done) return "";
  return entry.approved ? "approved" : "reported";
}

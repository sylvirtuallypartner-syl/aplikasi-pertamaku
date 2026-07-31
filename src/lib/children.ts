export type ChildId = "sean" | "gavril";

export interface ChildMeta {
  id: ChildId;
  name: string;
  age: number;
  emoji: string;
  color: string;
}

export const CHILDREN: Record<ChildId, ChildMeta> = {
  sean: { id: "sean", name: "Sean", age: 11, emoji: "🦸", color: "#2f7bff" },
  gavril: { id: "gavril", name: "Gavril", age: 6, emoji: "🚀", color: "#22b573" },
};

export const CHILD_ORDER: ChildId[] = ["sean", "gavril"];

export function isChildId(v: string | null | undefined): v is ChildId {
  return v === "sean" || v === "gavril";
}

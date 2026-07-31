import { ChildId } from "./children";

export interface TaskDef {
  id: number;
  childId: ChildId;
  label: string;
  weekdayOnly: boolean;
  weekendOnly: boolean;
}

export function tasksForToday(tasks: TaskDef[], childId: ChildId, weekend: boolean): TaskDef[] {
  return tasks.filter((t) => {
    if (t.childId !== childId) return false;
    if (t.weekdayOnly && weekend) return false;
    if (t.weekendOnly && !weekend) return false;
    return true;
  });
}

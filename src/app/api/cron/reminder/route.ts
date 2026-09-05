import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { CHILD_ORDER } from "@/lib/children";
import { isWeekendDate, todayStr } from "@/lib/date";
import { tasksForToday, TaskDef } from "@/lib/tasks";
import {
  deletePushSubscription,
  getAllPushSubscriptions,
  getAllTasks,
  getCompletionsForDate,
} from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID key belum diset" }, { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@kidstracker.local",
    vapidPublicKey,
    vapidPrivateKey
  );

  const date = todayStr();
  const weekend = isWeekendDate(date);
  const [rawTasks, completions, subscriptions] = await Promise.all([
    getAllTasks(),
    getCompletionsForDate(date),
    getAllPushSubscriptions(),
  ]);

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, incomplete: 0, message: "Tidak ada langganan aktif" });
  }

  const approvedKeys = new Set(
    completions.filter((c) => c.approved).map((c) => `${c.child_id}:${c.task_id}`)
  );
  const allTaskDefs: TaskDef[] = rawTasks.map((t) => ({
    id: t.id,
    childId: t.child_id,
    label: t.label,
    weekdayOnly: t.weekday_only,
    weekendOnly: t.weekend_only,
  }));

  let incomplete = 0;
  for (const childId of CHILD_ORDER) {
    const today = tasksForToday(allTaskDefs, childId, weekend);
    incomplete += today.filter((t) => !approvedKeys.has(`${childId}:${t.id}`)).length;
  }

  if (incomplete === 0) {
    return NextResponse.json({ sent: 0, incomplete: 0, message: "Semua tugas sudah selesai" });
  }

  const payload = JSON.stringify({
    title: "Kids Tracker",
    body: `Masih ada ${incomplete} tugas yang belum dicentang hari ini.`,
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscription(sub.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ sent, incomplete });
}

import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, sql, gte, lte, and } from "drizzle-orm";

const router: IRouter = Router();

function todayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

router.get("/stats/today", async (_req, res) => {
  const date = todayIso();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.date, date));

  const totalTasks = rows.length;
  const completedTasks = rows.filter((r) => r.completed).length;
  const targetUnits = rows.reduce((s, r) => s + r.targetCount, 0);
  const progressUnits = rows.reduce((s, r) => s + r.progressCount, 0);
  const completionPct =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  res.json({
    date,
    totalTasks,
    completedTasks,
    targetUnits,
    progressUnits,
    completionPct,
  });
});

router.get("/stats/streak", async (_req, res) => {
  // A day "counts" if it has at least one task and all tasks are completed.
  const rows = await db
    .select({
      date: tasksTable.date,
      total: sql<number>`count(*)::int`,
      done: sql<number>`sum(case when ${tasksTable.completed} then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .groupBy(tasksTable.date);

  const fullyDoneDates = new Set(
    rows.filter((r) => r.total > 0 && r.done === r.total).map((r) => r.date),
  );

  // Compute longest streak across all dates
  const sorted = Array.from(fullyDoneDates).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of sorted) {
    const cur = new Date(ds + "T00:00:00Z");
    if (prev && (cur.getTime() - prev.getTime()) / 86400000 === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = cur;
  }

  // Current streak: walk back from today (or yesterday if today not done yet)
  const today = new Date();
  let cursor = new Date(today);
  let currentStreak = 0;
  if (!fullyDoneDates.has(todayIso(cursor))) {
    cursor = addDays(cursor, -1);
  }
  while (fullyDoneDates.has(todayIso(cursor))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const lastCompletedDate = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  res.json({
    currentStreak,
    longestStreak,
    lastCompletedDate,
  });
});

router.get("/stats/weekly", async (_req, res) => {
  const today = new Date();
  const days: { date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push({ date: todayIso(addDays(today, -i)) });
  }
  const startDate = days[0]!.date;
  const endDate = days[days.length - 1]!.date;

  const rows = await db
    .select({
      date: tasksTable.date,
      total: sql<number>`count(*)::int`,
      done: sql<number>`sum(case when ${tasksTable.completed} then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .where(and(gte(tasksTable.date, startDate), lte(tasksTable.date, endDate)))
    .groupBy(tasksTable.date);

  const map = new Map(rows.map((r) => [r.date, r]));
  const out = days.map((d) => {
    const r = map.get(d.date);
    return {
      date: d.date,
      completedTasks: r?.done ?? 0,
      totalTasks: r?.total ?? 0,
    };
  });
  res.json(out);
});

router.get("/stats/categories", async (_req, res) => {
  const rows = await db
    .select({
      category: tasksTable.category,
      completedCount: sql<number>`sum(case when ${tasksTable.completed} then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .groupBy(tasksTable.category);

  res.json(
    rows.map((r) => ({
      category: r.category,
      completedCount: r.completedCount ?? 0,
    })),
  );
});

export default router;

import { Router, type IRouter } from "express";
import { db, tasksTable, profileTable, type TaskRow } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import { ensureProfile, PROFILE_ID, adjustPoints } from "./profile";
import { serializeTask } from "./tasks";

const router: IRouter = Router();

function todayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function previousDayIso(today: string): string {
  const [y, m, d] = today.split("-").map((s) => parseInt(s, 10));
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

router.post("/rollover", async (_req, res) => {
  const today = todayIso();
  const profile = await ensureProfile();

  if (profile.lastRolloverDate === today) {
    res.json({
      rolledOver: false,
      processedDate: today,
      deductedTasks: 0,
      createdTasks: [],
      pointsDelta: 0,
      newPoints: profile.points,
    });
    return;
  }

  let pointsDelta = 0;
  let deductedTasks = 0;

  const incompletePastTasks = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        lt(tasksTable.date, today),
        eq(tasksTable.completed, false),
        eq(tasksTable.pointsDeducted, false),
      ),
    );

  for (const t of incompletePastTasks) {
    await db
      .update(tasksTable)
      .set({ pointsDeducted: true })
      .where(eq(tasksTable.id, t.id));
    pointsDelta -= 1;
    deductedTasks += 1;
  }

  const yesterday = previousDayIso(today);
  const yesterdayTasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.date, yesterday));

  const createdTasks: TaskRow[] = [];

  for (const t of yesterdayTasks) {
    if (t.recurring) {
      const [row] = await db
        .insert(tasksTable)
        .values({
          title: t.title,
          category: t.category,
          targetCount: t.targetCount,
          progressCount: 0,
          notes: t.notes,
          date: today,
          completed: false,
          linkedPlatform: t.linkedPlatform,
          recurring: true,
          carryOverIncomplete: t.carryOverIncomplete,
        })
        .returning();
      if (row) createdTasks.push(row);
      continue;
    }

    if (t.carryOverIncomplete && !t.completed) {
      const remaining = Math.max(1, t.targetCount - t.progressCount);
      const [row] = await db
        .insert(tasksTable)
        .values({
          title: `${t.title} (carry-over)`,
          category: t.category,
          targetCount: remaining,
          progressCount: 0,
          notes: t.notes,
          date: today,
          completed: false,
          linkedPlatform: t.linkedPlatform,
          recurring: false,
          carryOverIncomplete: true,
        })
        .returning();
      if (row) createdTasks.push(row);
    }
  }

  const newPoints =
    pointsDelta !== 0 ? await adjustPoints(pointsDelta) : profile.points;

  await db
    .update(profileTable)
    .set({ lastRolloverDate: today, updatedAt: new Date() })
    .where(eq(profileTable.id, PROFILE_ID));

  res.json({
    rolledOver: true,
    processedDate: today,
    deductedTasks,
    createdTasks: createdTasks.map(serializeTask),
    pointsDelta,
    newPoints,
  });
});

export default router;

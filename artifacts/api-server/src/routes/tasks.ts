import { Router, type IRouter } from "express";
import { db, tasksTable, type TaskRow } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
  IncrementTaskProgressParams,
} from "@workspace/api-zod";
import { adjustPoints } from "./profile";

const router: IRouter = Router();

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function serializeTask(t: TaskRow) {
  return {
    id: t.id,
    title: t.title,
    category: t.category,
    targetCount: t.targetCount,
    progressCount: t.progressCount,
    notes: t.notes,
    date: t.date,
    completed: t.completed,
    linkedPlatform: t.linkedPlatform,
    recurring: t.recurring,
    carryOverIncomplete: t.carryOverIncomplete,
    pointsDeducted: t.pointsDeducted,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  };
}

export async function applyCompletionPoints(
  prevCompleted: boolean,
  newCompleted: boolean,
): Promise<void> {
  if (prevCompleted === newCompleted) return;
  await adjustPoints(newCompleted ? 1 : -1);
}

router.get("/tasks", async (req, res) => {
  const params = ListTasksQueryParams.parse(req.query);
  const date = params.date ?? todayIso();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.date, date))
    .orderBy(tasksTable.completed, tasksTable.id);
  res.json(rows.map(serializeTask));
});

router.post("/tasks", async (req, res) => {
  const body = CreateTaskBody.parse(req.body);
  const date = body.date ?? todayIso();
  const targetCount = body.targetCount ?? 1;
  const [row] = await db
    .insert(tasksTable)
    .values({
      title: body.title,
      category: body.category,
      targetCount,
      progressCount: 0,
      notes: body.notes ?? null,
      date,
      completed: false,
      linkedPlatform: body.linkedPlatform ?? null,
      recurring: body.recurring ?? false,
      carryOverIncomplete: body.carryOverIncomplete ?? false,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to create task" });
    return;
  }
  res.status(201).json(serializeTask(row));
});

router.patch("/tasks/:id", async (req, res) => {
  const { id } = UpdateTaskParams.parse(req.params);
  const body = UpdateTaskBody.parse(req.body);

  const existingRows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const updates: Partial<TaskRow> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.category !== undefined) updates.category = body.category;
  if (body.targetCount !== undefined) updates.targetCount = body.targetCount;
  if (body.progressCount !== undefined)
    updates.progressCount = body.progressCount;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.linkedPlatform !== undefined)
    updates.linkedPlatform = body.linkedPlatform;
  if (body.recurring !== undefined) updates.recurring = body.recurring;
  if (body.carryOverIncomplete !== undefined)
    updates.carryOverIncomplete = body.carryOverIncomplete;

  if (body.completed !== undefined) {
    updates.completed = body.completed;
    if (body.completed) {
      updates.completedAt = new Date();
      const target = existing.targetCount;
      const progress = body.progressCount ?? existing.progressCount;
      if (progress < target) updates.progressCount = target;
    } else {
      updates.completedAt = null;
    }
  }

  const [row] = await db
    .update(tasksTable)
    .set(updates)
    .where(eq(tasksTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (body.completed !== undefined) {
    await applyCompletionPoints(existing.completed, body.completed);
  }

  res.json(serializeTask(row));
});

router.delete("/tasks/:id", async (req, res) => {
  const { id } = DeleteTaskParams.parse(req.params);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).send();
});

router.post("/tasks/:id/increment", async (req, res) => {
  const { id } = IncrementTaskProgressParams.parse(req.params);
  const existing = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);
  const cur = existing[0];
  if (!cur) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const newProgress = Math.min(cur.progressCount + 1, cur.targetCount);
  const completed = newProgress >= cur.targetCount;
  const [row] = await db
    .update(tasksTable)
    .set({
      progressCount: newProgress,
      completed,
      completedAt: completed ? (cur.completedAt ?? new Date()) : null,
    })
    .where(eq(tasksTable.id, id))
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to increment" });
    return;
  }

  await applyCompletionPoints(cur.completed, completed);

  res.json(serializeTask(row));
});

export default router;

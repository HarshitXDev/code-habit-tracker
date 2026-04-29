import { Router, type IRouter } from "express";
import { db, profileTable, type ProfileRow } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

export const PROFILE_ID = 1;

export function serializeProfile(p: ProfileRow | undefined) {
  return {
    leetcodeHandle: p?.leetcodeHandle ?? null,
    codeforcesHandle: p?.codeforcesHandle ?? null,
    lastSyncedAt: p?.lastSyncedAt ? p.lastSyncedAt.toISOString() : null,
    points: p?.points ?? 0,
    lastRolloverDate: p?.lastRolloverDate ?? null,
  };
}

export async function getProfile(): Promise<ProfileRow | undefined> {
  const rows = await db
    .select()
    .from(profileTable)
    .where(eq(profileTable.id, PROFILE_ID))
    .limit(1);
  return rows[0];
}

export async function ensureProfile(): Promise<ProfileRow> {
  const existing = await getProfile();
  if (existing) return existing;
  const [row] = await db
    .insert(profileTable)
    .values({ id: PROFILE_ID })
    .returning();
  if (!row) throw new Error("Failed to create profile");
  return row;
}

export async function adjustPoints(delta: number): Promise<number> {
  if (delta === 0) {
    const p = await ensureProfile();
    return p.points;
  }
  const existing = await ensureProfile();
  const newPoints = existing.points + delta;
  const [row] = await db
    .update(profileTable)
    .set({ points: newPoints, updatedAt: new Date() })
    .where(eq(profileTable.id, PROFILE_ID))
    .returning();
  return row?.points ?? newPoints;
}

router.get("/profile", async (_req, res) => {
  const row = await getProfile();
  res.json(serializeProfile(row));
});

router.put("/profile", async (req, res) => {
  const body = UpdateProfileBody.parse(req.body);
  const existing = await getProfile();
  if (existing) {
    const [row] = await db
      .update(profileTable)
      .set({
        leetcodeHandle:
          body.leetcodeHandle === undefined
            ? existing.leetcodeHandle
            : (body.leetcodeHandle ?? null),
        codeforcesHandle:
          body.codeforcesHandle === undefined
            ? existing.codeforcesHandle
            : (body.codeforcesHandle ?? null),
        updatedAt: new Date(),
      })
      .where(eq(profileTable.id, PROFILE_ID))
      .returning();
    res.json(serializeProfile(row));
    return;
  }
  const [row] = await db
    .insert(profileTable)
    .values({
      id: PROFILE_ID,
      leetcodeHandle: body.leetcodeHandle ?? null,
      codeforcesHandle: body.codeforcesHandle ?? null,
    })
    .returning();
  res.json(serializeProfile(row));
});

export default router;

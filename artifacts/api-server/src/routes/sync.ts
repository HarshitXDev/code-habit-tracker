import { Router, type IRouter } from "express";
import { db, tasksTable, profileTable, type TaskRow } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getProfile, PROFILE_ID } from "./profile";
import { applyCompletionPoints, serializeTask } from "./tasks";

const router: IRouter = Router();

function todayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isToday(epochSeconds: number): boolean {
  const d = new Date(epochSeconds * 1000);
  return todayIso(d) === todayIso();
}

type PlatformResult = {
  platform: "leetcode" | "codeforces";
  handle: string | null;
  connected: boolean;
  ok: boolean;
  solvedToday: number;
  recentTitles: string[];
  error: string | null;
};

async function fetchCodeforces(handle: string | null): Promise<PlatformResult> {
  const base: PlatformResult = {
    platform: "codeforces",
    handle,
    connected: !!handle,
    ok: false,
    solvedToday: 0,
    recentTitles: [],
    error: null,
  };
  if (!handle) return base;
  try {
    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(
      handle,
    )}&from=1&count=200`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DevDeck/1.0" },
    });
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      return base;
    }
    const data = (await res.json()) as {
      status: string;
      comment?: string;
      result?: Array<{
        verdict?: string;
        creationTimeSeconds: number;
        problem: { contestId?: number; index: string; name: string };
      }>;
    };
    if (data.status !== "OK") {
      base.error = data.comment ?? "Codeforces returned an error";
      return base;
    }
    const seen = new Set<string>();
    const titles: string[] = [];
    for (const sub of data.result ?? []) {
      if (sub.verdict !== "OK") continue;
      if (!isToday(sub.creationTimeSeconds)) continue;
      const key = `${sub.problem.contestId ?? "x"}-${sub.problem.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(`${sub.problem.index}. ${sub.problem.name}`);
    }
    base.ok = true;
    base.solvedToday = seen.size;
    base.recentTitles = titles.slice(0, 10);
    return base;
  } catch (err) {
    base.error = err instanceof Error ? err.message : "Unknown error";
    return base;
  }
}

async function fetchLeetcode(handle: string | null): Promise<PlatformResult> {
  const base: PlatformResult = {
    platform: "leetcode",
    handle,
    connected: !!handle,
    ok: false,
    solvedToday: 0,
    recentTitles: [],
    error: null,
  };
  if (!handle) return base;
  try {
    const query = `query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }`;
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; DevDeck/1.0; +https://replit.com)",
        Referer: `https://leetcode.com/${handle}/`,
      },
      body: JSON.stringify({
        query,
        variables: { username: handle, limit: 50 },
      }),
    });
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      return base;
    }
    const data = (await res.json()) as {
      data?: {
        recentAcSubmissionList?: Array<{
          title: string;
          titleSlug: string;
          timestamp: string | number;
        }> | null;
      };
      errors?: Array<{ message: string }>;
    };
    if (data.errors && data.errors.length > 0) {
      base.error = data.errors[0]?.message ?? "LeetCode error";
      return base;
    }
    const list = data.data?.recentAcSubmissionList ?? null;
    if (list === null) {
      base.error = "User not found or profile is private";
      return base;
    }
    const seen = new Set<string>();
    const titles: string[] = [];
    for (const sub of list) {
      const ts =
        typeof sub.timestamp === "string"
          ? parseInt(sub.timestamp, 10)
          : sub.timestamp;
      if (!Number.isFinite(ts) || !isToday(ts)) continue;
      if (seen.has(sub.titleSlug)) continue;
      seen.add(sub.titleSlug);
      titles.push(sub.title);
    }
    base.ok = true;
    base.solvedToday = seen.size;
    base.recentTitles = titles.slice(0, 10);
    return base;
  } catch (err) {
    base.error = err instanceof Error ? err.message : "Unknown error";
    return base;
  }
}

router.post("/sync", async (_req, res) => {
  const profile = await getProfile();
  const [lc, cf] = await Promise.all([
    fetchLeetcode(profile?.leetcodeHandle ?? null),
    fetchCodeforces(profile?.codeforcesHandle ?? null),
  ]);

  const date = todayIso();
  const todayTasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.date, date));

  const updatedTasks: TaskRow[] = [];
  const counts: Record<string, number> = {
    leetcode: lc.ok ? lc.solvedToday : 0,
    codeforces: cf.ok ? cf.solvedToday : 0,
  };

  for (const t of todayTasks) {
    if (!t.linkedPlatform) continue;
    const c = counts[t.linkedPlatform];
    if (c === undefined) continue;
    const newProgress = Math.min(c, t.targetCount);
    if (newProgress <= t.progressCount && newProgress < t.targetCount) continue;
    const completed = newProgress >= t.targetCount;
    const [row] = await db
      .update(tasksTable)
      .set({
        progressCount: Math.max(newProgress, t.progressCount),
        completed,
        completedAt: completed ? (t.completedAt ?? new Date()) : null,
      })
      .where(eq(tasksTable.id, t.id))
      .returning();
    if (row) {
      updatedTasks.push(row);
      await applyCompletionPoints(t.completed, completed);
    }
  }

  const now = new Date();
  if (profile) {
    await db
      .update(profileTable)
      .set({ lastSyncedAt: now })
      .where(eq(profileTable.id, PROFILE_ID));
  }

  res.json({
    syncedAt: now.toISOString(),
    platforms: [lc, cf],
    updatedTasks: updatedTasks.map(serializeTask),
  });
});

export default router;

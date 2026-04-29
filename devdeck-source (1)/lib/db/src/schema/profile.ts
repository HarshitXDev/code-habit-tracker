import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const profileTable = pgTable("profile", {
  id: integer("id").primaryKey(),
  leetcodeHandle: text("leetcode_handle"),
  codeforcesHandle: text("codeforces_handle"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  points: integer("points").notNull().default(0),
  lastRolloverDate: text("last_rollover_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProfileRow = typeof profileTable.$inferSelect;

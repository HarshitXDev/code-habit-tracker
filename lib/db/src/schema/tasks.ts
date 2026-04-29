import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const tasksTable = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    targetCount: integer("target_count").notNull().default(1),
    progressCount: integer("progress_count").notNull().default(0),
    notes: text("notes"),
    date: text("date").notNull(),
    completed: boolean("completed").notNull().default(false),
    linkedPlatform: text("linked_platform"),
    recurring: boolean("recurring").notNull().default(false),
    carryOverIncomplete: boolean("carry_over_incomplete").notNull().default(false),
    pointsDeducted: boolean("points_deducted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    dateIdx: index("tasks_date_idx").on(t.date),
    categoryIdx: index("tasks_category_idx").on(t.category),
  }),
);

export type TaskRow = typeof tasksTable.$inferSelect;
export type InsertTaskRow = typeof tasksTable.$inferInsert;

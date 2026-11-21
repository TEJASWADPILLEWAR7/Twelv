import type { SQLiteDatabase } from "expo-sqlite";
import {
  CategoryScore,
  DateString,
  Habit,
  HabitLog,
  HabitSchedule,
  Task,
} from "../types";
import { getNowIsoLocal } from "../utils/date";
import { buildCategoryScore } from "../utils/scoring";

export const GOAL_PALETTE = [
  { label: "Cyan", hex: "#38BDF8" },
  { label: "Emerald", hex: "#34D399" },
  { label: "Amber", hex: "#FBBF24" },
  { label: "Violet", hex: "#A78BFA" },
  { label: "Rose", hex: "#FB7185" },
] as const;

export interface CycleGoal {
  id: number;
  challengeId: number;
  title: string;
  color: string;
  sortOrder: number;
}

export interface NewCycleGoalInput {
  title: string;
  color: string;
}

export interface WeeklyReview {
  id: number;
  challengeId: number;
  weekNumber: number;
  winNote: string;
  adjustmentNote: string;
  updatedAt: string;
}

export interface GoalExecutionBreakdown {
  goal: CycleGoal;
  tasks: CategoryScore;
  habits: CategoryScore;
  overallPercentage: number;
}

interface TableInfoRow {
  name: string;
}

interface CycleGoalRow {
  id: number;
  challenge_id: number;
  title: string;
  color: string;
  sort_order: number;
}

interface WeeklyReviewRow {
  id: number;
  challenge_id: number;
  week_number: number;
  win_note: string;
  adjustment_note: string;
  updated_at: string;
}

interface IdGoalRow {
  id: number;
  goal_id: number | null;
}

async function columnExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const cols = await db.getAllAsync<TableInfoRow>(
    `PRAGMA table_info(${tableName});`,
  );
  return cols.some((c) => c.name === columnName);
}

export async function runExtensionMigrations(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cycle_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#38BDF8',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cycle_goals_challenge
      ON cycle_goals(challenge_id, sort_order);

    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      win_note TEXT NOT NULL DEFAULT '',
      adjustment_note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(challenge_id, week_number),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
    );
  `);

  const hasTaskGoalId = await columnExists(db, "tasks", "goal_id");
  if (!hasTaskGoalId) {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN goal_id INTEGER NULL;`);
  }

  const hasHabitGoalId = await columnExists(db, "habits", "goal_id");
  if (!hasHabitGoalId) {
    await db.execAsync(`ALTER TABLE habits ADD COLUMN goal_id INTEGER NULL;`);
  }
}

export async function fetchGoalsForChallenge(
  db: SQLiteDatabase,
  challengeId: number,
): Promise<CycleGoal[]> {
  const rows = await db.getAllAsync<CycleGoalRow>(
    `SELECT id, challenge_id, title, color, sort_order
     FROM cycle_goals
     WHERE challenge_id = ?
     ORDER BY sort_order ASC, id ASC;`,
    [challengeId],
  );

  return rows.map((r) => ({
    id: r.id,
    challengeId: r.challenge_id,
    title: r.title,
    color: r.color,
    sortOrder: r.sort_order,
  }));
}

export async function replaceGoalsForChallenge(
  db: SQLiteDatabase,
  challengeId: number,
  goals: NewCycleGoalInput[],
): Promise<void> {
  const cleaned = goals
    .map((g) => ({
      title: g.title.trim(),
      color: g.color || "#38BDF8",
    }))
    .filter((g) => g.title.length > 0)
    .slice(0, 3);

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM cycle_goals WHERE challenge_id = ?;`, [
      challengeId,
    ]);
    for (let idx = 0; idx < cleaned.length; idx += 1) {
      await db.runAsync(
        `INSERT INTO cycle_goals (challenge_id, title, color, sort_order)
         VALUES (?, ?, ?, ?);`,
        [challengeId, cleaned[idx].title, cleaned[idx].color, idx],
      );
    }
  });
}

export async function fetchTaskGoalMap(
  db: SQLiteDatabase,
  challengeId: number,
): Promise<Record<number, number | null>> {
  const rows = await db.getAllAsync<IdGoalRow>(
    `SELECT id, goal_id FROM tasks WHERE challenge_id = ?;`,
    [challengeId],
  );
  const map: Record<number, number | null> = {};
  for (const row of rows) {
    map[row.id] = row.goal_id ?? null;
  }
  return map;
}

export async function fetchHabitGoalMap(
  db: SQLiteDatabase,
  challengeId: number,
): Promise<Record<number, number | null>> {
  const rows = await db.getAllAsync<IdGoalRow>(
    `SELECT id, goal_id FROM habits WHERE challenge_id = ?;`,
    [challengeId],
  );
  const map: Record<number, number | null> = {};
  for (const row of rows) {
    map[row.id] = row.goal_id ?? null;
  }
  return map;
}

export async function updateTaskGoalRecord(
  db: SQLiteDatabase,
  taskId: number,
  goalId: number | null,
): Promise<void> {
  await db.runAsync(
    `UPDATE tasks SET goal_id = ?, updated_at = ? WHERE id = ?;`,
    [goalId, getNowIsoLocal(), taskId],
  );
}

export async function updateHabitGoalRecord(
  db: SQLiteDatabase,
  habitId: number,
  goalId: number | null,
): Promise<void> {
  await db.runAsync(`UPDATE habits SET goal_id = ? WHERE id = ?;`, [
    goalId,
    habitId,
  ]);
}

export async function assignLatestMatchingTaskGoal(
  db: SQLiteDatabase,
  challengeId: number,
  title: string,
  scheduledDate: DateString,
  goalId: number | null,
): Promise<void> {
  const latest = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM tasks
     WHERE challenge_id = ? AND title = ? AND scheduled_date = ?
     ORDER BY id DESC LIMIT 1;`,
    [challengeId, title, scheduledDate],
  );
  if (latest) {
    await updateTaskGoalRecord(db, latest.id, goalId);
  }
}

export async function rolloverTasksToDateRecord(
  db: SQLiteDatabase,
  taskIds: number[],
  targetDate: DateString,
): Promise<void> {
  if (taskIds.length === 0) {
    return;
  }
  const nowIso = getNowIsoLocal();
  await db.withTransactionAsync(async () => {
    for (const id of taskIds) {
      await db.runAsync(
        `UPDATE tasks
         SET scheduled_date = ?, updated_at = ?
         WHERE id = ? AND completed = 0;`,
        [targetDate, nowIso, id],
      );
    }
  });
}

export async function fetchWeeklyReviewsForChallenge(
  db: SQLiteDatabase,
  challengeId: number,
): Promise<WeeklyReview[]> {
  const rows = await db.getAllAsync<WeeklyReviewRow>(
    `SELECT id, challenge_id, week_number, win_note, adjustment_note, updated_at
     FROM weekly_reviews
     WHERE challenge_id = ?
     ORDER BY week_number ASC;`,
    [challengeId],
  );

  return rows.map((r) => ({
    id: r.id,
    challengeId: r.challenge_id,
    weekNumber: r.week_number,
    winNote: r.win_note,
    adjustmentNote: r.adjustment_note,
    updatedAt: r.updated_at,
  }));
}

export async function upsertWeeklyReviewRecord(
  db: SQLiteDatabase,
  challengeId: number,
  weekNumber: number,
  winNote: string,
  adjustmentNote: string,
): Promise<void> {
  const nowIso = getNowIsoLocal();
  await db.runAsync(
    `INSERT INTO weekly_reviews (challenge_id, week_number, win_note, adjustment_note, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(challenge_id, week_number)
     DO UPDATE SET
       win_note = excluded.win_note,
       adjustment_note = excluded.adjustment_note,
       updated_at = excluded.updated_at;`,
    [challengeId, weekNumber, winNote.trim(), adjustmentNote.trim(), nowIso],
  );
}

export function computeGoalBreakdowns(params: {
  goals: CycleGoal[];
  tasks: Task[];
  taskGoalMap: Record<number, number | null>;
  habits: Habit[];
  habitGoalMap: Record<number, number | null>;
  schedules: HabitSchedule[];
  logs: HabitLog[];
  startDate: DateString;
  endDate: DateString;
}): GoalExecutionBreakdown[] {
  const {
    goals,
    tasks,
    taskGoalMap,
    habits,
    habitGoalMap,
    schedules,
    logs,
    startDate,
    endDate,
  } = params;

  const logSet = new Set(logs.map((l) => `${l.habitId}:${l.logDate}`));

  const dates: DateString[] = [];
  const startParts = startDate.split("-").map(Number);
  const endParts = endDate.split("-").map(Number);
  if (startParts.length === 3 && endParts.length === 3) {
    const cursor = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const stop = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    while (cursor <= stop) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}` as DateString);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return goals.map((goal) => {
    const matchingTasks = tasks.filter(
      (t) =>
        taskGoalMap[t.id] === goal.id &&
        t.scheduledDate >= startDate &&
        t.scheduledDate <= endDate,
    );
    const completedTasks = matchingTasks.filter((t) => t.completed).length;
    const taskScore = buildCategoryScore(completedTasks, matchingTasks.length);

    const matchingHabits = habits.filter((h) => {
      const rec = h as unknown as Record<string, unknown>;
      const isActive =
        typeof rec.active === "boolean"
          ? rec.active
          : typeof rec.isActive === "boolean"
            ? rec.isActive
            : true;
      return isActive && habitGoalMap[h.id] === goal.id;
    });

    let totalHabitSlots = 0;
    let completedHabitSlots = 0;

    for (const dateStr of dates) {
      const [yy, mm, dd] = dateStr.split("-").map(Number);
      const weekday = new Date(yy, mm - 1, dd).getDay();
      for (const habit of matchingHabits) {
        const scheduled = schedules.some((s) => {
          if (s.habitId !== habit.id) {
            return false;
          }
          const rec = s as unknown as Record<string, unknown>;
          const dayVal =
            typeof rec.dayOfWeek === "number"
              ? rec.dayOfWeek
              : typeof rec.weekday === "number"
                ? rec.weekday
                : rec.day_of_week;
          return dayVal === weekday;
        });
        if (scheduled) {
          totalHabitSlots += 1;
          if (logSet.has(`${habit.id}:${dateStr}`)) {
            completedHabitSlots += 1;
          }
        }
      }
    }

    const habitScore = buildCategoryScore(completedHabitSlots, totalHabitSlots);
    const combinedCompleted = taskScore.completed + habitScore.completed;
    const combinedTotal = taskScore.total + habitScore.total;
    const overallPercentage =
      combinedTotal > 0
        ? Math.round((combinedCompleted / combinedTotal) * 100)
        : 0;

    return {
      goal,
      tasks: taskScore,
      habits: habitScore,
      overallPercentage,
    };
  });
}

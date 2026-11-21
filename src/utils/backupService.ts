import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";
import { getNowIsoLocal, getTodayDateString } from "./date";

export interface TwelvBackupPayload {
  app: "Twelv";
  version: 1;
  exportedAt: string;
  challenge: {
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
  } | null;
  goals: Array<{
    old_id: number;
    title: string;
    color: string;
    sort_order: number;
  }>;
  tasks: Array<{
    old_goal_id: number | null;
    title: string;
    description: string | null;
    scheduled_date: string;
    completed: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  habits: Array<{
    old_id: number;
    old_goal_id: number | null;
    title: string;
    active: number;
    created_at: string;
  }>;
  schedules: Array<{
    old_habit_id: number;
    weekday: number;
  }>;
  logs: Array<{
    old_habit_id: number;
    log_date: string;
    created_at: string;
  }>;
  weekly_reviews: Array<{
    week_number: number;
    win_note: string;
    adjustment_note: string;
    updated_at: string;
  }>;
}

export async function buildBackupJson(db: SQLiteDatabase): Promise<string> {
  const challenge = await db.getFirstAsync<{
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
  }>(
    `SELECT id, name, start_date, end_date, created_at FROM challenges LIMIT 1;`,
  );

  if (!challenge) {
    const emptyPayload: TwelvBackupPayload = {
      app: "Twelv",
      version: 1,
      exportedAt: getNowIsoLocal(),
      challenge: null,
      goals: [],
      tasks: [],
      habits: [],
      schedules: [],
      logs: [],
      weekly_reviews: [],
    };
    return JSON.stringify(emptyPayload, null, 2);
  }

  const goals = await db.getAllAsync<{
    id: number;
    title: string;
    color: string;
    sort_order: number;
  }>(
    `SELECT id, title, color, sort_order FROM cycle_goals WHERE challenge_id = ? ORDER BY sort_order ASC, id ASC;`,
    [challenge.id],
  );

  const tasks = await db.getAllAsync<{
    goal_id: number | null;
    title: string;
    description: string | null;
    scheduled_date: string;
    completed: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT goal_id, title, description, scheduled_date, completed, completed_at, created_at, updated_at
     FROM tasks WHERE challenge_id = ? ORDER BY id ASC;`,
    [challenge.id],
  );

  const habits = await db.getAllAsync<{
    id: number;
    goal_id: number | null;
    title: string;
    active: number;
    created_at: string;
  }>(
    `SELECT id, goal_id, title, active, created_at FROM habits WHERE challenge_id = ? ORDER BY id ASC;`,
    [challenge.id],
  );

  const habitIds = habits.map((h) => h.id);
  const schedules: Array<{ old_habit_id: number; weekday: number }> = [];
  const logs: Array<{
    old_habit_id: number;
    log_date: string;
    created_at: string;
  }> = [];

  for (const habitId of habitIds) {
    const sRows = await db.getAllAsync<{ weekday: number }>(
      `SELECT weekday FROM habit_schedules WHERE habit_id = ?;`,
      [habitId],
    );
    for (const s of sRows) {
      schedules.push({ old_habit_id: habitId, weekday: s.weekday });
    }

    const lRows = await db.getAllAsync<{
      log_date: string;
      created_at: string;
    }>(`SELECT log_date, created_at FROM habit_logs WHERE habit_id = ?;`, [
      habitId,
    ]);
    for (const l of lRows) {
      logs.push({
        old_habit_id: habitId,
        log_date: l.log_date,
        created_at: l.created_at,
      });
    }
  }

  const reviews = await db.getAllAsync<{
    week_number: number;
    win_note: string;
    adjustment_note: string;
    updated_at: string;
  }>(
    `SELECT week_number, win_note, adjustment_note, updated_at
     FROM weekly_reviews WHERE challenge_id = ? ORDER BY week_number ASC;`,
    [challenge.id],
  );

  const payload: TwelvBackupPayload = {
    app: "Twelv",
    version: 1,
    exportedAt: getNowIsoLocal(),
    challenge: {
      name: challenge.name,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      created_at: challenge.created_at,
    },
    goals: goals.map((g) => ({
      old_id: g.id,
      title: g.title,
      color: g.color,
      sort_order: g.sort_order,
    })),
    tasks: tasks.map((t) => ({
      old_goal_id: t.goal_id ?? null,
      title: t.title,
      description: t.description ?? null,
      scheduled_date: t.scheduled_date,
      completed: t.completed,
      completed_at: t.completed_at ?? null,
      created_at: t.created_at,
      updated_at: t.updated_at,
    })),
    habits: habits.map((h) => ({
      old_id: h.id,
      old_goal_id: h.goal_id ?? null,
      title: h.title,
      active: h.active,
      created_at: h.created_at,
    })),
    schedules,
    logs,
    weekly_reviews: reviews,
  };

  return JSON.stringify(payload, null, 2);
}

export async function exportBackupToFile(db: SQLiteDatabase): Promise<void> {
  const jsonString = await buildBackupJson(db);
  const fileName = `twelv-backup-${getTodayDateString()}.json`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(jsonString);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("File sharing is unavailable on this device.");
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Save Twelv Backup (.json)",
  });
}

export async function pickAndParseBackupFile(): Promise<TwelvBackupPayload | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets || picked.assets.length === 0) {
    return null;
  }

  const file = new File(picked.assets[0].uri);
  const raw = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Selected file is not valid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as TwelvBackupPayload).app !== "Twelv" ||
    (parsed as TwelvBackupPayload).version !== 1
  ) {
    throw new Error("This file is not a valid Twelv backup.");
  }

  return parsed as TwelvBackupPayload;
}

export async function restoreBackupPayload(
  db: SQLiteDatabase,
  payload: TwelvBackupPayload,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM weekly_reviews;
      DELETE FROM habit_logs;
      DELETE FROM habit_schedules;
      DELETE FROM habits;
      DELETE FROM tasks;
      DELETE FROM cycle_goals;
      DELETE FROM challenges;
    `);

    if (!payload.challenge) {
      return;
    }

    const challengeRes = await db.runAsync(
      `INSERT INTO challenges (name, start_date, end_date, created_at)
       VALUES (?, ?, ?, ?);`,
      [
        payload.challenge.name,
        payload.challenge.start_date,
        payload.challenge.end_date,
        payload.challenge.created_at || getNowIsoLocal(),
      ],
    );
    const newChallengeId = Number(challengeRes.lastInsertRowId);

    const goalIdMap = new Map<number, number>();
    for (const g of payload.goals ?? []) {
      const gRes = await db.runAsync(
        `INSERT INTO cycle_goals (challenge_id, title, color, sort_order)
         VALUES (?, ?, ?, ?);`,
        [newChallengeId, g.title, g.color || "#38BDF8", g.sort_order ?? 0],
      );
      goalIdMap.set(g.old_id, Number(gRes.lastInsertRowId));
    }

    for (const t of payload.tasks ?? []) {
      const mappedGoalId =
        t.old_goal_id !== null && t.old_goal_id !== undefined
          ? (goalIdMap.get(t.old_goal_id) ?? null)
          : null;
      await db.runAsync(
        `INSERT INTO tasks (
           challenge_id, goal_id, title, description, scheduled_date,
           completed, completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newChallengeId,
          mappedGoalId,
          t.title,
          t.description ?? "",
          t.scheduled_date,
          t.completed ? 1 : 0,
          t.completed_at ?? null,
          t.created_at || getNowIsoLocal(),
          t.updated_at || getNowIsoLocal(),
        ],
      );
    }

    const habitIdMap = new Map<number, number>();
    for (const h of payload.habits ?? []) {
      const mappedGoalId =
        h.old_goal_id !== null && h.old_goal_id !== undefined
          ? (goalIdMap.get(h.old_goal_id) ?? null)
          : null;
      const hRes = await db.runAsync(
        `INSERT INTO habits (challenge_id, goal_id, title, active, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [
          newChallengeId,
          mappedGoalId,
          h.title,
          h.active ? 1 : 0,
          h.created_at || getNowIsoLocal(),
        ],
      );
      habitIdMap.set(h.old_id, Number(hRes.lastInsertRowId));
    }

    for (const s of payload.schedules ?? []) {
      const mappedHabitId = habitIdMap.get(s.old_habit_id);
      if (mappedHabitId !== undefined) {
        await db.runAsync(
          `INSERT INTO habit_schedules (habit_id, weekday) VALUES (?, ?);`,
          [mappedHabitId, s.weekday],
        );
      }
    }

    for (const l of payload.logs ?? []) {
      const mappedHabitId = habitIdMap.get(l.old_habit_id);
      if (mappedHabitId !== undefined) {
        await db.runAsync(
          `INSERT INTO habit_logs (habit_id, log_date, created_at) VALUES (?, ?, ?);`,
          [mappedHabitId, l.log_date, l.created_at || getNowIsoLocal()],
        );
      }
    }

    for (const r of payload.weekly_reviews ?? []) {
      await db.runAsync(
        `INSERT INTO weekly_reviews (challenge_id, week_number, win_note, adjustment_note, updated_at)
         VALUES (?, ?, ?, ?, ?);`,
        [
          newChallengeId,
          r.week_number,
          r.win_note ?? "",
          r.adjustment_note ?? "",
          r.updated_at || getNowIsoLocal(),
        ],
      );
    }
  });
}

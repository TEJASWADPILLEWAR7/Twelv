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
  tasks: Array<{
    title: string;
    description: string | null;
    scheduled_date: string;
    scheduled_time?: string | null;
    completed: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  habits: Array<{
    old_id: number;
    title: string;
    active?: number;
    ended_on?: string | null;
    created_at: string;
  }>;
  schedules: Array<{
    old_habit_id: number;
    weekday: number;
    effective_from?: string;
  }>;
  logs: Array<{
    old_habit_id: number;
    log_date: string;
    created_at: string;
  }>;
  weekly_quotes?: Array<{
    week_number: number;
    quote_text: string;
    author: string;
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
      tasks: [],
      habits: [],
      schedules: [],
      logs: [],
      weekly_quotes: [],
    };
    return JSON.stringify(emptyPayload, null, 2);
  }

  const tasks = await db.getAllAsync<{
    title: string;
    description: string | null;
    scheduled_date: string;
    scheduled_time: string | null;
    completed: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT title, description, scheduled_date, scheduled_time, completed, completed_at, created_at, updated_at
     FROM tasks WHERE challenge_id = ? ORDER BY id ASC;`,
    [challenge.id],
  );

  const habitRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM habits WHERE challenge_id = ? ORDER BY id ASC;`,
    [challenge.id],
  );

  const schedCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(habit_schedules);`,
  );
  const hasEffectiveFrom = schedCols.some((c) => c.name === "effective_from");

  const schedules: Array<{
    old_habit_id: number;
    weekday: number;
    effective_from?: string;
  }> = [];
  const logs: Array<{
    old_habit_id: number;
    log_date: string;
    created_at: string;
  }> = [];

  for (const habit of habitRows) {
    const habitId = Number(habit.id);
    if (hasEffectiveFrom) {
      const sRows = await db.getAllAsync<{
        weekday: number;
        effective_from: string;
      }>(
        `SELECT weekday, effective_from FROM habit_schedules WHERE habit_id = ?;`,
        [habitId],
      );
      for (const s of sRows) {
        schedules.push({
          old_habit_id: habitId,
          weekday: s.weekday,
          effective_from: s.effective_from,
        });
      }
    } else {
      const sRows = await db.getAllAsync<{ weekday: number }>(
        `SELECT weekday FROM habit_schedules WHERE habit_id = ?;`,
        [habitId],
      );
      for (const s of sRows) {
        schedules.push({ old_habit_id: habitId, weekday: s.weekday });
      }
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

  const quotes = await db.getAllAsync<{
    week_number: number;
    quote_text: string;
    author: string;
    updated_at: string;
  }>(
    `SELECT week_number, quote_text, author, updated_at
     FROM weekly_quotes WHERE challenge_id = ? ORDER BY week_number ASC;`,
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
    tasks: tasks.map((t) => ({
      title: t.title,
      description: t.description ?? null,
      scheduled_date: t.scheduled_date,
      scheduled_time: t.scheduled_time ?? null,
      completed: t.completed,
      completed_at: t.completed_at ?? null,
      created_at: t.created_at,
      updated_at: t.updated_at,
    })),
    habits: habitRows.map((h) => ({
      old_id: Number(h.id),
      title: String(h.title ?? ""),
      active: typeof h.active === "number" ? h.active : h.ended_on ? 0 : 1,
      ended_on: typeof h.ended_on === "string" ? h.ended_on : null,
      created_at: String(h.created_at ?? ""),
    })),
    schedules,
    logs,
    weekly_quotes: quotes,
  };

  return JSON.stringify(payload, null, 2);
}

export async function exportBackupToFile(db: SQLiteDatabase): Promise<void> {
  const jsonString = await buildBackupJson(db);
  const fileName = "twelv-backup-" + getTodayDateString() + ".json";
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
  const habitCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(habits);`,
  );
  const hasActive = habitCols.some((c) => c.name === "active");
  const hasEndedOn = habitCols.some((c) => c.name === "ended_on");

  const schedCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(habit_schedules);`,
  );
  const hasEffectiveFrom = schedCols.some((c) => c.name === "effective_from");

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM weekly_quotes;
      DELETE FROM habit_logs;
      DELETE FROM habit_schedules;
      DELETE FROM habits;
      DELETE FROM tasks;
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

    for (const t of payload.tasks ?? []) {
      await db.runAsync(
        `INSERT INTO tasks (
           challenge_id, title, description, scheduled_date, scheduled_time,
           completed, completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newChallengeId,
          t.title,
          t.description ?? "",
          t.scheduled_date,
          t.scheduled_time ?? null,
          t.completed ? 1 : 0,
          t.completed_at ?? null,
          t.created_at || getNowIsoLocal(),
          t.updated_at || getNowIsoLocal(),
        ],
      );
    }

    const habitIdMap = new Map<number, number>();
    for (const h of payload.habits ?? []) {
      const cols = ["challenge_id", "title", "created_at"];
      const vals: Array<string | number | null> = [
        newChallengeId,
        h.title,
        h.created_at || getNowIsoLocal(),
      ];
      if (hasActive) {
        cols.push("active");
        vals.push(h.active === 0 ? 0 : 1);
      }
      if (hasEndedOn) {
        cols.push("ended_on");
        vals.push(h.ended_on ?? null);
      }
      const placeholders = cols.map(() => "?").join(", ");
      const hRes = await db.runAsync(
        "INSERT INTO habits (" + cols.join(", ") + ") VALUES (" + placeholders + ");",
        vals,
      );
      habitIdMap.set(h.old_id, Number(hRes.lastInsertRowId));
    }

    for (const s of payload.schedules ?? []) {
      const mappedHabitId = habitIdMap.get(s.old_habit_id);
      if (mappedHabitId !== undefined) {
        if (hasEffectiveFrom) {
          await db.runAsync(
            `INSERT INTO habit_schedules (habit_id, weekday, effective_from) VALUES (?, ?, ?);`,
            [
              mappedHabitId,
              s.weekday,
              s.effective_from || payload.challenge.start_date,
            ],
          );
        } else {
          await db.runAsync(
            `INSERT INTO habit_schedules (habit_id, weekday) VALUES (?, ?);`,
            [mappedHabitId, s.weekday],
          );
        }
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

    for (const q of payload.weekly_quotes ?? []) {
      if (q.quote_text && q.quote_text.trim().length > 0) {
        await db.runAsync(
          `INSERT INTO weekly_quotes (challenge_id, week_number, quote_text, author, updated_at)
           VALUES (?, ?, ?, ?, ?);`,
          [
            newChallengeId,
            q.week_number,
            q.quote_text.trim(),
            (q.author ?? "").trim(),
            q.updated_at || getNowIsoLocal(),
          ],
        );
      }
    }
  });
}

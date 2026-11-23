import type { SQLiteDatabase } from "expo-sqlite";
import { DateString } from "../types";
import { getNowIsoLocal } from "../utils/date";

export interface WeeklyQuote {
  id: number;
  challengeId: number;
  weekNumber: number;
  quoteText: string;
  author: string;
  updatedAt: string;
}

export async function runExtensionMigrations(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    DROP TABLE IF EXISTS cycle_goals;
    DROP TABLE IF EXISTS weekly_reviews;

    CREATE TABLE IF NOT EXISTS weekly_quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      quote_text TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(challenge_id, week_number),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
    );
  `);

  const taskCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(tasks);");
  if (!taskCols.some((col) => col.name === "scheduled_time")) {
    await db.execAsync("ALTER TABLE tasks ADD COLUMN scheduled_time TEXT DEFAULT NULL;");
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

export async function fetchWeeklyQuotesForChallenge(
  db: SQLiteDatabase,
  challengeId: number,
): Promise<WeeklyQuote[]> {
  const rows = await db.getAllAsync<{
    id: number;
    challenge_id: number;
    week_number: number;
    quote_text: string;
    author: string;
    updated_at: string;
  }>(
    `SELECT id, challenge_id, week_number, quote_text, author, updated_at
     FROM weekly_quotes
     WHERE challenge_id = ?
     ORDER BY week_number ASC;`,
    [challengeId],
  );

  return rows.map((r) => ({
    id: r.id,
    challengeId: r.challenge_id,
    weekNumber: r.week_number,
    quoteText: r.quote_text,
    author: r.author,
    updatedAt: r.updated_at,
  }));
}

export async function upsertWeeklyQuoteRecord(
  db: SQLiteDatabase,
  challengeId: number,
  weekNumber: number,
  quoteText: string,
  author: string,
): Promise<void> {
  const trimmedQuote = quoteText.trim();
  if (!trimmedQuote) {
    await db.runAsync(
      `DELETE FROM weekly_quotes WHERE challenge_id = ? AND week_number = ?;`,
      [challengeId, weekNumber],
    );
    return;
  }

  const nowIso = getNowIsoLocal();
  await db.runAsync(
    `INSERT INTO weekly_quotes (challenge_id, week_number, quote_text, author, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(challenge_id, week_number)
     DO UPDATE SET
       quote_text = excluded.quote_text,
       author = excluded.author,
       updated_at = excluded.updated_at;`,
    [challengeId, weekNumber, trimmedQuote, author.trim(), nowIso],
  );
}

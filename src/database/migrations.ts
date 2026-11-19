import * as SQLite from "expo-sqlite";

const LATEST_DB_VERSION = 1;

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= LATEST_DB_VERSION) {
    return;
  }

  await db.withTransactionAsync(async () => {
    if (currentVersion < 1) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS challenges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          challenge_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          scheduled_date TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_challenge_date
          ON tasks (challenge_id, scheduled_date);

        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          challenge_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          created_at TEXT NOT NULL,
          ended_on TEXT,
          FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_habits_challenge
          ON habits (challenge_id);

        CREATE TABLE IF NOT EXISTS habit_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habit_id INTEGER NOT NULL,
          days_of_week TEXT NOT NULL,
          effective_from TEXT NOT NULL,
          UNIQUE (habit_id, effective_from),
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_habit_schedules_habit_date
          ON habit_schedules (habit_id, effective_from);

        CREATE TABLE IF NOT EXISTS habit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habit_id INTEGER NOT NULL,
          log_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE (habit_id, log_date),
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date
          ON habit_logs (habit_id, log_date);
      `);
    }

    await db.execAsync(`PRAGMA user_version = ${LATEST_DB_VERSION};`);
  });
}

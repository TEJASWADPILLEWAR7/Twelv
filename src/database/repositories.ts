import {
  Challenge,
  DateString,
  Habit,
  HabitLog,
  HabitSchedule,
  NewHabitInput,
  NewTaskInput,
  Task,
  UpdateTaskInput,
  Weekday,
} from "../types";
import {
  addDays,
  getChallengeEndDate,
  getNowIsoLocal,
  getTodayDateString,
  maxDate,
} from "../utils/date";
import { getDatabase } from "./client";

interface ChallengeRow {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface TaskRow {
  id: number;
  challenge_id: number;
  title: string;
  description: string | null;
  scheduled_date: string;
  completed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface HabitRow {
  id: number;
  challenge_id: number;
  title: string;
  created_at: string;
  ended_on: string | null;
}

interface HabitScheduleRow {
  id: number;
  habit_id: number;
  days_of_week: string;
  effective_from: string;
}

interface HabitLogRow {
  id: number;
  habit_id: number;
  log_date: string;
  created_at: string;
}

function mapChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    title: row.title,
    description: row.description,
    scheduledDate: row.scheduled_date,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    title: row.title,
    createdAt: row.created_at,
    endedOn: row.ended_on,
  };
}

function mapHabitSchedule(row: HabitScheduleRow): HabitSchedule {
  const parsed = row.days_of_week
    .split(",")
    .filter((value) => value.length > 0)
    .map((value) => Number(value) as Weekday);

  return {
    id: row.id,
    habitId: row.habit_id,
    daysOfWeek: parsed,
    effectiveFrom: row.effective_from,
  };
}

function mapHabitLog(row: HabitLogRow): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    logDate: row.log_date,
    createdAt: row.created_at,
  };
}

export async function fetchActiveChallenge(): Promise<Challenge | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ChallengeRow>(
    "SELECT id, name, start_date, end_date, created_at FROM challenges ORDER BY id DESC LIMIT 1;",
  );
  return row ? mapChallenge(row) : null;
}

export async function createChallengeRecord(
  name: string,
  startDate: DateString,
): Promise<Challenge> {
  const db = await getDatabase();
  const trimmedName = name.trim();
  const endDate = getChallengeEndDate(startDate);
  const createdAt = getNowIsoLocal();

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM challenges;");
    await db.runAsync(
      "INSERT INTO challenges (name, start_date, end_date, created_at) VALUES (?, ?, ?, ?);",
      trimmedName,
      startDate,
      endDate,
      createdAt,
    );
  });

  const created = await fetchActiveChallenge();
  if (!created) {
    throw new Error("Failed to load created challenge.");
  }
  return created;
}

export async function deleteActiveChallengeRecord(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM challenges;");
}

export async function fetchTasksForChallenge(
  challengeId: number,
): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    "SELECT id, challenge_id, title, description, scheduled_date, completed, completed_at, created_at, updated_at FROM tasks WHERE challenge_id = ? ORDER BY scheduled_date ASC, completed ASC, id DESC;",
    challengeId,
  );
  return rows.map(mapTask);
}

export async function createTaskRecord(
  challengeId: number,
  input: NewTaskInput,
): Promise<void> {
  const db = await getDatabase();
  const now = getNowIsoLocal();
  const trimmedTitle = input.title.trim();
  const trimmedDescription = input.description?.trim()
    ? input.description.trim()
    : null;

  await db.runAsync(
    "INSERT INTO tasks (challenge_id, title, description, scheduled_date, completed, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, 0, NULL, ?, ?);",
    challengeId,
    trimmedTitle,
    trimmedDescription,
    input.scheduledDate,
    now,
    now,
  );
}

export async function updateTaskRecord(
  taskId: number,
  input: UpdateTaskInput,
): Promise<void> {
  const db = await getDatabase();
  const now = getNowIsoLocal();
  const trimmedTitle = input.title.trim();
  const trimmedDescription = input.description?.trim()
    ? input.description.trim()
    : null;

  await db.runAsync(
    "UPDATE tasks SET title = ?, description = ?, scheduled_date = ?, updated_at = ? WHERE id = ?;",
    trimmedTitle,
    trimmedDescription,
    input.scheduledDate,
    now,
    taskId,
  );
}

export async function toggleTaskCompletedRecord(
  taskId: number,
  nextCompleted: boolean,
): Promise<void> {
  const db = await getDatabase();
  const now = getNowIsoLocal();
  const completedAt = nextCompleted ? now : null;

  await db.runAsync(
    "UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?;",
    nextCompleted ? 1 : 0,
    completedAt,
    now,
    taskId,
  );
}

export async function deleteTaskRecord(taskId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM tasks WHERE id = ?;", taskId);
}

export async function fetchHabitsData(challengeId: number): Promise<{
  habits: Habit[];
  schedules: HabitSchedule[];
  logs: HabitLog[];
}> {
  const db = await getDatabase();
  const habitRows = await db.getAllAsync<HabitRow>(
    "SELECT id, challenge_id, title, created_at, ended_on FROM habits WHERE challenge_id = ? ORDER BY id ASC;",
    challengeId,
  );

  if (habitRows.length === 0) {
    return { habits: [], schedules: [], logs: [] };
  }

  const scheduleRows = await db.getAllAsync<HabitScheduleRow>(
    "SELECT hs.id, hs.habit_id, hs.days_of_week, hs.effective_from FROM habit_schedules hs INNER JOIN habits h ON h.id = hs.habit_id WHERE h.challenge_id = ? ORDER BY hs.effective_from ASC;",
    challengeId,
  );

  const logRows = await db.getAllAsync<HabitLogRow>(
    "SELECT hl.id, hl.habit_id, hl.log_date, hl.created_at FROM habit_logs hl INNER JOIN habits h ON h.id = hl.habit_id WHERE h.challenge_id = ? ORDER BY hl.log_date ASC;",
    challengeId,
  );

  return {
    habits: habitRows.map(mapHabit),
    schedules: scheduleRows.map(mapHabitSchedule),
    logs: logRows.map(mapHabitLog),
  };
}

export async function createHabitRecord(
  challenge: Challenge,
  input: NewHabitInput,
): Promise<void> {
  const db = await getDatabase();
  const now = getNowIsoLocal();
  const todayStr = getTodayDateString();
  const effectiveFrom = maxDate(todayStr, challenge.startDate);
  const serializedDays = [...input.daysOfWeek].sort((a, b) => a - b).join(",");

  await db.withTransactionAsync(async () => {
    const insertResult = await db.runAsync(
      "INSERT INTO habits (challenge_id, title, created_at, ended_on) VALUES (?, ?, ?, NULL);",
      challenge.id,
      input.title.trim(),
      now,
    );

    await db.runAsync(
      "INSERT INTO habit_schedules (habit_id, days_of_week, effective_from) VALUES (?, ?, ?);",
      insertResult.lastInsertRowId,
      serializedDays,
      effectiveFrom,
    );
  });
}

export async function updateHabitRecord(
  challenge: Challenge,
  habitId: number,
  title: string,
  daysOfWeek: Weekday[],
): Promise<void> {
  const db = await getDatabase();
  const todayStr = getTodayDateString();
  const effectiveFrom = maxDate(todayStr, challenge.startDate);
  const serializedDays = [...daysOfWeek].sort((a, b) => a - b).join(",");

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE habits SET title = ? WHERE id = ?;",
      title.trim(),
      habitId,
    );

    await db.runAsync(
      "INSERT INTO habit_schedules (habit_id, days_of_week, effective_from) VALUES (?, ?, ?) ON CONFLICT(habit_id, effective_from) DO UPDATE SET days_of_week = excluded.days_of_week;",
      habitId,
      serializedDays,
      effectiveFrom,
    );
  });
}

export async function deleteHabitRecord(habit: Habit): Promise<void> {
  const db = await getDatabase();
  const todayStr = getTodayDateString();
  const createdDate = habit.createdAt.slice(0, 10);

  if (createdDate >= todayStr) {
    await db.runAsync("DELETE FROM habits WHERE id = ?;", habit.id);
    return;
  }

  const yesterdayStr = addDays(todayStr, -1);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE habits SET ended_on = ? WHERE id = ?;",
      yesterdayStr,
      habit.id,
    );
    await db.runAsync(
      "DELETE FROM habit_logs WHERE habit_id = ? AND log_date >= ?;",
      habit.id,
      todayStr,
    );
  });
}

export async function toggleHabitLogRecord(
  habitId: number,
  logDate: DateString,
  nextCompleted: boolean,
): Promise<void> {
  const db = await getDatabase();
  if (nextCompleted) {
    const now = getNowIsoLocal();
    await db.runAsync(
      "INSERT OR IGNORE INTO habit_logs (habit_id, log_date, created_at) VALUES (?, ?, ?);",
      habitId,
      logDate,
      now,
    );
  } else {
    await db.runAsync(
      "DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?;",
      habitId,
      logDate,
    );
  }
}

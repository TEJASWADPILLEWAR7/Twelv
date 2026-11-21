import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { getDatabase } from "../database/client";
import {
  assignLatestMatchingTaskGoal,
  CycleGoal,
  fetchGoalsForChallenge,
  fetchHabitGoalMap,
  fetchTaskGoalMap,
  fetchWeeklyReviewsForChallenge,
  NewCycleGoalInput,
  replaceGoalsForChallenge,
  rolloverTasksToDateRecord,
  runExtensionMigrations,
  updateHabitGoalRecord,
  updateTaskGoalRecord,
  upsertWeeklyReviewRecord,
  WeeklyReview,
} from "../database/extensions";
import { runMigrations } from "../database/migrations";
import {
  createChallengeRecord,
  createHabitRecord,
  createTaskRecord,
  deleteActiveChallengeRecord,
  deleteHabitRecord,
  deleteTaskRecord,
  fetchActiveChallenge,
  fetchHabitsData,
  fetchTasksForChallenge,
  toggleHabitLogRecord,
  toggleTaskCompletedRecord,
  updateHabitRecord,
  updateTaskRecord,
} from "../database/repositories";
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
  WeeklySummary,
} from "../types";
import {
  exportBackupToFile,
  pickAndParseBackupFile,
  restoreBackupPayload,
} from "../utils/backupService";
import {
  getActiveWeekNumber,
  getNowIsoLocal,
  getTodayDateString,
} from "../utils/date";
import { computeWeeklySummaries } from "../utils/scoring";
import {
  consumePendingWidgetTaskToggles,
  syncAndroidWidgets,
} from "../utils/widgetSync";

export type { CycleGoal, NewCycleGoalInput, WeeklyReview };

interface AppDataContextValue {
  isReady: boolean;
  error: string | null;
  todayStr: DateString;
  challenge: Challenge | null;
  activeWeekNumber: number | null;
  goals: CycleGoal[];
  taskGoalMap: Record<number, number | null>;
  habitGoalMap: Record<number, number | null>;
  tasks: Task[];
  unfinishedPastTasks: Task[];
  habits: Habit[];
  schedules: HabitSchedule[];
  logs: HabitLog[];
  weeklySummaries: WeeklySummary[];
  weeklyReviews: WeeklyReview[];
  refreshAll: () => Promise<void>;
  createChallenge: (
    name: string,
    startDate: DateString,
    initialGoals?: NewCycleGoalInput[],
  ) => Promise<void>;
  saveCycleGoals: (nextGoals: NewCycleGoalInput[]) => Promise<void>;
  resetChallenge: () => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  editTask: (taskId: number, input: UpdateTaskInput) => Promise<void>;
  setTaskGoal: (taskId: number, goalId: number | null) => Promise<void>;
  setLatestTaskGoal: (
    title: string,
    scheduledDate: DateString,
    goalId: number | null,
  ) => Promise<void>;
  toggleTask: (taskId: number, nextCompleted: boolean) => Promise<void>;
  removeTask: (taskId: number) => Promise<void>;
  rolloverUnfinishedTasks: (taskIds?: number[]) => Promise<number>;
  addHabit: (input: NewHabitInput) => Promise<void>;
  editHabit: (
    habitId: number,
    title: string,
    daysOfWeek: Weekday[],
  ) => Promise<void>;
  setHabitGoal: (habitId: number, goalId: number | null) => Promise<void>;
  removeHabit: (habit: Habit) => Promise<void>;
  toggleHabitLog: (
    habitId: number,
    logDate: DateString,
    nextCompleted: boolean,
  ) => Promise<void>;
  saveWeeklyReview: (
    weekNumber: number,
    winNote: string,
    adjustmentNote: string,
  ) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: () => Promise<boolean>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<DateString>(() =>
    getTodayDateString(),
  );
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [goals, setGoals] = useState<CycleGoal[]>([]);
  const [taskGoalMap, setTaskGoalMap] = useState<Record<number, number | null>>(
    {},
  );
  const [habitGoalMap, setHabitGoalMap] = useState<
    Record<number, number | null>
  >({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [schedules, setSchedules] = useState<HabitSchedule[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const appStateRef = useRef<string>(AppState.currentState ?? "active");

  const applyWidgetTogglesToDb = useCallback(async () => {
    const pendingToggles = await consumePendingWidgetTaskToggles();
    const entries = Object.entries(pendingToggles);
    if (entries.length === 0) {
      return;
    }
    for (const [idStr, nextCompleted] of entries) {
      await toggleTaskCompletedRecord(Number(idStr), nextCompleted);
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    await applyWidgetTogglesToDb();

    const db = await getDatabase();
    const active = await fetchActiveChallenge();
    setChallenge(active);
    setTodayStr(getTodayDateString());

    if (!active) {
      setGoals([]);
      setTaskGoalMap({});
      setHabitGoalMap({});
      setTasks([]);
      setHabits([]);
      setSchedules([]);
      setLogs([]);
      setWeeklyReviews([]);
      return;
    }

    const [
      loadedTasks,
      habitBundle,
      loadedGoals,
      loadedTaskGoals,
      loadedHabitGoals,
      loadedReviews,
    ] = await Promise.all([
      fetchTasksForChallenge(active.id),
      fetchHabitsData(active.id),
      fetchGoalsForChallenge(db, active.id),
      fetchTaskGoalMap(db, active.id),
      fetchHabitGoalMap(db, active.id),
      fetchWeeklyReviewsForChallenge(db, active.id),
    ]);

    setTasks(loadedTasks);
    setHabits(habitBundle.habits);
    setSchedules(habitBundle.schedules);
    setLogs(habitBundle.logs);
    setGoals(loadedGoals);
    setTaskGoalMap(loadedTaskGoals);
    setHabitGoalMap(loadedHabitGoals);
    setWeeklyReviews(loadedReviews);
  }, [applyWidgetTogglesToDb]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const db = await getDatabase();
        await runMigrations(db);
        await runExtensionMigrations(db);
        if (!mounted) {
          return;
        }
        await loadSnapshot();
        if (mounted) {
          setError(null);
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Database initialization error.",
          );
          setIsReady(true);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadSnapshot]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackground =
        appStateRef.current === "inactive" ||
        appStateRef.current === "background";
      appStateRef.current = nextState;

      if (wasBackground && nextState === "active") {
        void loadSnapshot();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadSnapshot]);

  const refreshAll = useCallback(async () => {
    await loadSnapshot();
  }, [loadSnapshot]);

  const createChallenge = useCallback(
    async (
      name: string,
      startDate: DateString,
      initialGoals?: NewCycleGoalInput[],
    ) => {
      await createChallengeRecord(name, startDate);
      const active = await fetchActiveChallenge();
      if (active && initialGoals && initialGoals.length > 0) {
        const db = await getDatabase();
        await replaceGoalsForChallenge(db, active.id, initialGoals);
      }
      await loadSnapshot();
    },
    [loadSnapshot],
  );

  const saveCycleGoals = useCallback(
    async (nextGoals: NewCycleGoalInput[]) => {
      if (!challenge) {
        return;
      }
      const db = await getDatabase();
      await replaceGoalsForChallenge(db, challenge.id, nextGoals);
      await loadSnapshot();
    },
    [challenge, loadSnapshot],
  );

  const resetChallenge = useCallback(async () => {
    await deleteActiveChallengeRecord();
    await loadSnapshot();
  }, [loadSnapshot]);

  const addTask = useCallback(
    async (input: NewTaskInput) => {
      if (!challenge) {
        return;
      }
      await createTaskRecord(challenge.id, input);
      await loadSnapshot();
    },
    [challenge, loadSnapshot],
  );

  const editTask = useCallback(
    async (taskId: number, input: UpdateTaskInput) => {
      await updateTaskRecord(taskId, input);
      await loadSnapshot();
    },
    [loadSnapshot],
  );

  const setTaskGoal = useCallback(
    async (taskId: number, goalId: number | null) => {
      const db = await getDatabase();
      await updateTaskGoalRecord(db, taskId, goalId);
      setTaskGoalMap((prev) => ({ ...prev, [taskId]: goalId }));
    },
    [],
  );

  const setLatestTaskGoal = useCallback(
    async (title: string, scheduledDate: DateString, goalId: number | null) => {
      if (!challenge) {
        return;
      }
      const db = await getDatabase();
      await assignLatestMatchingTaskGoal(
        db,
        challenge.id,
        title,
        scheduledDate,
        goalId,
      );
      await loadSnapshot();
    },
    [challenge, loadSnapshot],
  );

  const toggleTask = useCallback(
    async (taskId: number, nextCompleted: boolean) => {
      const nowIso = getNowIsoLocal();
      setTasks((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? {
                ...item,
                completed: nextCompleted,
                completedAt: nextCompleted ? nowIso : null,
                updatedAt: nowIso,
              }
            : item,
        ),
      );
      try {
        await toggleTaskCompletedRecord(taskId, nextCompleted);
      } catch {
        await loadSnapshot();
      }
    },
    [loadSnapshot],
  );

  const removeTask = useCallback(
    async (taskId: number) => {
      await deleteTaskRecord(taskId);
      await loadSnapshot();
    },
    [loadSnapshot],
  );

  const unfinishedPastTasks = useMemo(() => {
    if (!challenge) {
      return [];
    }
    return tasks
      .filter(
        (t) =>
          !t.completed &&
          t.scheduledDate < todayStr &&
          t.scheduledDate >= challenge.startDate,
      )
      .sort(
        (a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.id - a.id,
      );
  }, [challenge, tasks, todayStr]);

  const rolloverUnfinishedTasks = useCallback(
    async (taskIds?: number[]): Promise<number> => {
      if (!challenge) {
        return 0;
      }
      const targetIds =
        taskIds && taskIds.length > 0
          ? taskIds
          : unfinishedPastTasks.map((t) => t.id);
      if (targetIds.length === 0) {
        return 0;
      }
      const targetDate =
        todayStr > challenge.endDate ? challenge.endDate : todayStr;
      const db = await getDatabase();
      await rolloverTasksToDateRecord(db, targetIds, targetDate);
      await loadSnapshot();
      return targetIds.length;
    },
    [challenge, unfinishedPastTasks, todayStr, loadSnapshot],
  );

  const addHabit = useCallback(
    async (input: NewHabitInput) => {
      if (!challenge) {
        return;
      }
      await createHabitRecord(challenge, input);
      await loadSnapshot();
    },
    [challenge, loadSnapshot],
  );

  const editHabit = useCallback(
    async (habitId: number, title: string, daysOfWeek: Weekday[]) => {
      if (!challenge) {
        return;
      }
      await updateHabitRecord(challenge, habitId, title, daysOfWeek);
      await loadSnapshot();
    },
    [challenge, loadSnapshot],
  );

  const setHabitGoal = useCallback(
    async (habitId: number, goalId: number | null) => {
      const db = await getDatabase();
      await updateHabitGoalRecord(db, habitId, goalId);
      setHabitGoalMap((prev) => ({ ...prev, [habitId]: goalId }));
    },
    [],
  );

  const removeHabit = useCallback(
    async (habit: Habit) => {
      await deleteHabitRecord(habit);
      await loadSnapshot();
    },
    [loadSnapshot],
  );

  const toggleHabitLog = useCallback(
    async (habitId: number, logDate: DateString, nextCompleted: boolean) => {
      const nowIso = getNowIsoLocal();
      setLogs((prev) => {
        if (nextCompleted) {
          const exists = prev.some(
            (item) => item.habitId === habitId && item.logDate === logDate,
          );
          if (exists) {
            return prev;
          }
          return [
            ...prev,
            {
              id: -Date.now(),
              habitId,
              logDate,
              createdAt: nowIso,
            },
          ];
        }
        return prev.filter(
          (item) => !(item.habitId === habitId && item.logDate === logDate),
        );
      });
      try {
        await toggleHabitLogRecord(habitId, logDate, nextCompleted);
      } catch {
        await loadSnapshot();
      }
    },
    [loadSnapshot],
  );

  const saveWeeklyReview = useCallback(
    async (weekNumber: number, winNote: string, adjustmentNote: string) => {
      if (!challenge) {
        return;
      }
      const db = await getDatabase();
      await upsertWeeklyReviewRecord(
        db,
        challenge.id,
        weekNumber,
        winNote,
        adjustmentNote,
      );
      await loadSnapshot();
    },
    [challenge, loadSnapshot],
  );

  const exportBackup = useCallback(async () => {
    const db = await getDatabase();
    await exportBackupToFile(db);
  }, []);

  const importBackup = useCallback(async (): Promise<boolean> => {
    const payload = await pickAndParseBackupFile();
    if (!payload) {
      return false;
    }
    const db = await getDatabase();
    await restoreBackupPayload(db, payload);
    await loadSnapshot();
    return true;
  }, [loadSnapshot]);

  const activeWeekNumber = useMemo(() => {
    if (!challenge) {
      return null;
    }
    return getActiveWeekNumber(challenge.startDate, todayStr);
  }, [challenge, todayStr]);

  const weeklySummaries = useMemo(() => {
    if (!challenge) {
      return [];
    }
    return computeWeeklySummaries(
      challenge,
      tasks,
      habits,
      schedules,
      logs,
      todayStr,
    );
  }, [challenge, tasks, habits, schedules, logs, todayStr]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    syncAndroidWidgets({
      challenge,
      todayStr,
      activeWeekNumber,
      tasks,
      weeklySummaries,
    });
  }, [isReady, challenge, todayStr, activeWeekNumber, tasks, weeklySummaries]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      isReady,
      error,
      todayStr,
      challenge,
      activeWeekNumber,
      goals,
      taskGoalMap,
      habitGoalMap,
      tasks,
      unfinishedPastTasks,
      habits,
      schedules,
      logs,
      weeklySummaries,
      weeklyReviews,
      refreshAll,
      createChallenge,
      saveCycleGoals,
      resetChallenge,
      addTask,
      editTask,
      setTaskGoal,
      setLatestTaskGoal,
      toggleTask,
      removeTask,
      rolloverUnfinishedTasks,
      addHabit,
      editHabit,
      setHabitGoal,
      removeHabit,
      toggleHabitLog,
      saveWeeklyReview,
      exportBackup,
      importBackup,
    }),
    [
      isReady,
      error,
      todayStr,
      challenge,
      activeWeekNumber,
      goals,
      taskGoalMap,
      habitGoalMap,
      tasks,
      unfinishedPastTasks,
      habits,
      schedules,
      logs,
      weeklySummaries,
      weeklyReviews,
      refreshAll,
      createChallenge,
      saveCycleGoals,
      resetChallenge,
      addTask,
      editTask,
      setTaskGoal,
      setLatestTaskGoal,
      toggleTask,
      removeTask,
      rolloverUnfinishedTasks,
      addHabit,
      editHabit,
      setHabitGoal,
      removeHabit,
      toggleHabitLog,
      saveWeeklyReview,
      exportBackup,
      importBackup,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used inside AppDataProvider.");
  }
  return ctx;
}

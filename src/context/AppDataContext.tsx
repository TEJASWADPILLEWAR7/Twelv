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
  getActiveWeekNumber,
  getNowIsoLocal,
  getTodayDateString,
} from "../utils/date";
import { computeWeeklySummaries } from "../utils/scoring";

interface AppDataContextValue {
  isReady: boolean;
  error: string | null;
  todayStr: DateString;
  challenge: Challenge | null;
  activeWeekNumber: number | null;
  tasks: Task[];
  habits: Habit[];
  schedules: HabitSchedule[];
  logs: HabitLog[];
  weeklySummaries: WeeklySummary[];
  refreshAll: () => Promise<void>;
  createChallenge: (name: string, startDate: DateString) => Promise<void>;
  resetChallenge: () => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  editTask: (taskId: number, input: UpdateTaskInput) => Promise<void>;
  toggleTask: (taskId: number, nextCompleted: boolean) => Promise<void>;
  removeTask: (taskId: number) => Promise<void>;
  addHabit: (input: NewHabitInput) => Promise<void>;
  editHabit: (
    habitId: number,
    title: string,
    daysOfWeek: Weekday[],
  ) => Promise<void>;
  removeHabit: (habit: Habit) => Promise<void>;
  toggleHabitLog: (
    habitId: number,
    logDate: DateString,
    nextCompleted: boolean,
  ) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<DateString>(() =>
    getTodayDateString(),
  );
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [schedules, setSchedules] = useState<HabitSchedule[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const appStateRef = useRef<string>(AppState.currentState ?? "active");

  const loadSnapshot = useCallback(async () => {
    const active = await fetchActiveChallenge();
    setChallenge(active);
    setTodayStr(getTodayDateString());

    if (!active) {
      setTasks([]);
      setHabits([]);
      setSchedules([]);
      setLogs([]);
      return;
    }

    const [loadedTasks, habitBundle] = await Promise.all([
      fetchTasksForChallenge(active.id),
      fetchHabitsData(active.id),
    ]);

    setTasks(loadedTasks);
    setHabits(habitBundle.habits);
    setSchedules(habitBundle.schedules);
    setLogs(habitBundle.logs);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const db = await getDatabase();
        await runMigrations(db);
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
        const latestToday = getTodayDateString();
        setTodayStr((prev) => (prev === latestToday ? prev : latestToday));
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const refreshAll = useCallback(async () => {
    await loadSnapshot();
  }, [loadSnapshot]);

  const createChallenge = useCallback(
    async (name: string, startDate: DateString) => {
      await createChallengeRecord(name, startDate);
      await loadSnapshot();
    },
    [loadSnapshot],
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

  const value = useMemo<AppDataContextValue>(
    () => ({
      isReady,
      error,
      todayStr,
      challenge,
      activeWeekNumber,
      tasks,
      habits,
      schedules,
      logs,
      weeklySummaries,
      refreshAll,
      createChallenge,
      resetChallenge,
      addTask,
      editTask,
      toggleTask,
      removeTask,
      addHabit,
      editHabit,
      removeHabit,
      toggleHabitLog,
    }),
    [
      isReady,
      error,
      todayStr,
      challenge,
      activeWeekNumber,
      tasks,
      habits,
      schedules,
      logs,
      weeklySummaries,
      refreshAll,
      createChallenge,
      resetChallenge,
      addTask,
      editTask,
      toggleTask,
      removeTask,
      addHabit,
      editHabit,
      removeHabit,
      toggleHabitLog,
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

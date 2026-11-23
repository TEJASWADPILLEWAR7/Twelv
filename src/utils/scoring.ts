import {
  CategoryScore,
  Challenge,
  DateString,
  Habit,
  HabitLog,
  HabitSchedule,
  Task,
  Weekday,
  WeeklySummary,
  WeekStatus,
} from "../types";
import { addDays, generateTwelveWeeks, getWeekday, minDate } from "./date";

export const TARGET_PERCENTAGE = 85;

export interface HabitStats {
  scheduledCount: number;
  completedCount: number;
  percentage: number;
  currentStreak: number;
}

export interface OverallChallengeStats {
  tasks: CategoryScore;
  habits: CategoryScore;
  taskTargetWeeksCount: number;
  habitTargetWeeksCount: number;
  evaluatedWeeksCount: number;
}

export function calculatePercentage(completed: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((completed / total) * 10000) / 100;
}

export function isTargetMet(completed: number, total: number): boolean {
  if (total <= 0) {
    return false;
  }
  return completed * 100 >= total * TARGET_PERCENTAGE;
}

export function buildCategoryScore(
  completed: number,
  total: number,
): CategoryScore {
  return {
    completed,
    total,
    percentage: calculatePercentage(completed, total),
    targetMet: isTargetMet(completed, total),
  };
}

export function getActiveScheduleForDate(
  schedules: HabitSchedule[],
  habitId: number,
  dateStr: DateString,
): Weekday[] {
  const habitSchedules = schedules
    .filter((item) => item.habitId === habitId)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  if (habitSchedules.length === 0) {
    return [];
  }

  let matched: HabitSchedule | null = null;
  for (const schedule of habitSchedules) {
    if (schedule.effectiveFrom <= dateStr) {
      matched = schedule;
    } else {
      break;
    }
  }

  return matched ? matched.daysOfWeek : [];
}

export function isHabitScheduledOnDate(
  habit: Habit,
  schedules: HabitSchedule[],
  dateStr: DateString,
): boolean {
  if (habit.endedOn !== null && dateStr > habit.endedOn) {
    return false;
  }
  const activeDays = getActiveScheduleForDate(schedules, habit.id, dateStr);
  if (activeDays.length === 0) {
    return false;
  }
  const weekday = getWeekday(dateStr);
  return activeDays.includes(weekday);
}

export function computeHabitStats(
  habit: Habit,
  schedules: HabitSchedule[],
  logs: HabitLog[],
  challengeStartDate: DateString,
  challengeEndDate: DateString,
  todayStr: DateString,
): HabitStats {
  const logDates = new Set<DateString>();
  for (const log of logs) {
    if (log.habitId === habit.id) {
      logDates.add(log.logDate);
    }
  }

  let evaluationEnd = minDate(todayStr, challengeEndDate);
  if (habit.endedOn !== null && habit.endedOn < evaluationEnd) {
    evaluationEnd = habit.endedOn;
  }

  if (evaluationEnd < challengeStartDate) {
    return {
      scheduledCount: 0,
      completedCount: 0,
      percentage: 0,
      currentStreak: 0,
    };
  }

  let scheduledCount = 0;
  let completedCount = 0;
  let cursor = challengeStartDate;

  while (cursor <= evaluationEnd) {
    if (isHabitScheduledOnDate(habit, schedules, cursor)) {
      scheduledCount += 1;
      if (logDates.has(cursor)) {
        completedCount += 1;
      }
    }
    cursor = addDays(cursor, 1);
  }

  let currentStreak = 0;
  let backCursor = evaluationEnd;

  while (backCursor >= challengeStartDate) {
    if (isHabitScheduledOnDate(habit, schedules, backCursor)) {
      if (logDates.has(backCursor)) {
        currentStreak += 1;
      } else if (backCursor < todayStr) {
        break;
      }
    }
    backCursor = addDays(backCursor, -1);
  }

  return {
    scheduledCount,
    completedCount,
    percentage: calculatePercentage(completedCount, scheduledCount),
    currentStreak,
  };
}

export function computeWeeklySummaries(
  challenge: Challenge,
  tasks: Task[],
  habits: Habit[],
  schedules: HabitSchedule[],
  logs: HabitLog[],
  todayStr: DateString,
): WeeklySummary[] {
  const weeks = generateTwelveWeeks(challenge.startDate);
  const completedLogKeys = new Set<string>();
  for (const log of logs) {
    completedLogKeys.add(`${log.habitId}:${log.logDate}`);
  }

  return weeks.map((week) => {
    let status: WeekStatus = "current";
    if (todayStr < week.startDate) {
      status = "upcoming";
    } else if (todayStr > week.endDate) {
      status = "completed";
    }

    if (status === "upcoming") {
      return {
        weekNumber: week.weekNumber,
        startDate: week.startDate,
        endDate: week.endDate,
        status,
        tasks: buildCategoryScore(0, 0),
        habits: buildCategoryScore(0, 0),
      };
    }

    const weekTasks = tasks.filter(
      (task) =>
        task.challengeId === challenge.id &&
        task.scheduledDate >= week.startDate &&
        task.scheduledDate <= week.endDate,
    );

    const completedTasksCount = weekTasks.filter(
      (task) => task.completed,
    ).length;
    const taskScore = buildCategoryScore(
      completedTasksCount,
      weekTasks.length,
    );

    const evaluationEnd =
      status === "completed" ? week.endDate : minDate(week.endDate, todayStr);

    let scheduledOccurrences = 0;
    let completedOccurrences = 0;

    let cursor = week.startDate;
    while (cursor <= evaluationEnd) {
      for (const habit of habits) {
        if (habit.challengeId !== challenge.id) {
          continue;
        }
        if (isHabitScheduledOnDate(habit, schedules, cursor)) {
          scheduledOccurrences += 1;
          if (completedLogKeys.has(`${habit.id}:${cursor}`)) {
            completedOccurrences += 1;
          }
        }
      }
      cursor = addDays(cursor, 1);
    }

    const habitScore = buildCategoryScore(
      completedOccurrences,
      scheduledOccurrences,
    );

    return {
      weekNumber: week.weekNumber,
      startDate: week.startDate,
      endDate: week.endDate,
      status,
      tasks: taskScore,
      habits: habitScore,
    };
  });
}

export function computeOverallChallengeStats(
  weeklySummaries: WeeklySummary[],
): OverallChallengeStats {
  let totalTasksCompleted = 0;
  let totalTasksScheduled = 0;
  let totalHabitsCompleted = 0;
  let totalHabitsScheduled = 0;
  let taskTargetWeeksCount = 0;
  let habitTargetWeeksCount = 0;
  let evaluatedWeeksCount = 0;

  for (const week of weeklySummaries) {
    if (week.status === "upcoming") {
      continue;
    }
    evaluatedWeeksCount += 1;
    totalTasksCompleted += week.tasks.completed;
    totalTasksScheduled += week.tasks.total;
    totalHabitsCompleted += week.habits.completed;
    totalHabitsScheduled += week.habits.total;

    if (week.tasks.targetMet) {
      taskTargetWeeksCount += 1;
    }
    if (week.habits.targetMet) {
      habitTargetWeeksCount += 1;
    }
  }

  return {
    tasks: buildCategoryScore(totalTasksCompleted, totalTasksScheduled),
    habits: buildCategoryScore(totalHabitsCompleted, totalHabitsScheduled),
    taskTargetWeeksCount,
    habitTargetWeeksCount,
    evaluatedWeeksCount,
  };
}

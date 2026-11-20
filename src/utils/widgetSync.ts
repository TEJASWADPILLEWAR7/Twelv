import { NativeModules, Platform } from "react-native";
import { Challenge, DateString, Task, WeeklySummary } from "../types";
import { buildCategoryScore } from "./scoring";

interface WidgetBridgeInterface {
  updateWidgetData: (payloadJson: string) => void;
}

const WidgetBridge: WidgetBridgeInterface | undefined =
  NativeModules.WidgetBridge;

export function syncAndroidWidgets(params: {
  challenge: Challenge | null;
  todayStr: DateString;
  activeWeekNumber: number | null;
  tasks: Task[];
  weeklySummaries: WeeklySummary[];
}): void {
  if (Platform.OS !== "android" || !WidgetBridge) {
    return;
  }

  const { challenge, todayStr, activeWeekNumber, tasks, weeklySummaries } =
    params;

  if (!challenge) {
    WidgetBridge.updateWidgetData(
      JSON.stringify({
        hasChallenge: false,
        weekLabel: "Twelv · Setup",
        remainingCount: 0,
        completedTodayCount: 0,
        totalTodayCount: 0,
        todayTasks: [],
        taskPct: 0,
        taskCompleted: 0,
        taskTotal: 0,
        habitPct: 0,
        habitCompleted: 0,
        habitTotal: 0,
        statusTone: "neutral",
        statusLabel: "Start Cycle",
      }),
    );
    return;
  }

  const todayAllTasks = tasks.filter((t) => t.scheduledDate === todayStr);
  const completedToday = todayAllTasks
    .filter((t) => t.completed)
    .sort((a, b) => a.id - b.id);
  const remainingToday = todayAllTasks
    .filter((t) => !t.completed)
    .sort((a, b) => b.id - a.id);

  const todayScore = buildCategoryScore(
    completedToday.length,
    todayAllTasks.length,
  );

  // Show completed tasks with strikethrough first, while reserving room for remaining tasks (up to 5 rows)
  const maxRows = 5;
  const completedSlice =
    remainingToday.length >= maxRows
      ? []
      : completedToday.slice(0, Math.min(2, maxRows - remainingToday.length));
  const remainingSlice = remainingToday.slice(
    0,
    maxRows - completedSlice.length,
  );

  const widgetTaskItems = [
    ...completedSlice.map((t) => ({ title: t.title, completed: true })),
    ...remainingSlice.map((t) => ({ title: t.title, completed: false })),
  ];

  let currentSummary: WeeklySummary | null = null;
  if (weeklySummaries.length > 0) {
    if (activeWeekNumber !== null) {
      currentSummary = weeklySummaries[activeWeekNumber - 1] ?? null;
    } else if (todayStr < challenge.startDate) {
      currentSummary = weeklySummaries[0];
    } else {
      currentSummary = weeklySummaries[weeklySummaries.length - 1];
    }
  }

  const taskScore = currentSummary?.tasks ?? {
    completed: 0,
    total: 0,
    percentage: 0,
    targetMet: false,
  };
  const habitScore = currentSummary?.habits ?? {
    completed: 0,
    total: 0,
    percentage: 0,
    targetMet: false,
  };

  const hasAnyItems = taskScore.total > 0 || habitScore.total > 0;
  const tasksPassing = taskScore.total === 0 || taskScore.targetMet;
  const habitsPassing = habitScore.total === 0 || habitScore.targetMet;
  const overallMet = hasAnyItems && tasksPassing && habitsPassing;

  const statusTone = !hasAnyItems
    ? "neutral"
    : overallMet
      ? "success"
      : "warning";
  const statusLabel = !hasAnyItems
    ? "85% Goal"
    : overallMet
      ? "85%+ Hit"
      : "Below 85%";

  WidgetBridge.updateWidgetData(
    JSON.stringify({
      hasChallenge: true,
      weekLabel: currentSummary
        ? `Week ${currentSummary.weekNumber} of 12`
        : "12 Week Cycle",
      remainingCount: remainingToday.length,
      completedTodayCount: todayScore.completed,
      totalTodayCount: todayScore.total,
      todayTasks: widgetTaskItems,
      taskPct: taskScore.percentage,
      taskCompleted: taskScore.completed,
      taskTotal: taskScore.total,
      habitPct: habitScore.percentage,
      habitCompleted: habitScore.completed,
      habitTotal: habitScore.total,
      statusTone,
      statusLabel,
    }),
  );
}

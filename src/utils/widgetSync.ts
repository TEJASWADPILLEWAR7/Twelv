import { NativeModules, Platform } from "react-native";
import { Challenge, DateString, Task, WeeklySummary } from "../types";
import { buildCategoryScore } from "./scoring";

interface WidgetBridgeInterface {
  updateWidgetData: (payloadJson: string) => void;
  consumePendingTaskToggles?: () => Promise<string>;
}

const WidgetBridge: WidgetBridgeInterface | undefined =
  NativeModules.WidgetBridge;

export async function consumePendingWidgetTaskToggles(): Promise<
  Record<number, boolean>
> {
  if (Platform.OS !== "android" || !WidgetBridge?.consumePendingTaskToggles) {
    return {};
  }
  try {
    const rawJson = await WidgetBridge.consumePendingTaskToggles();
    if (!rawJson) {
      return {};
    }
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    const result: Record<number, boolean> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const id = Number(key);
      if (Number.isFinite(id) && typeof val === "boolean") {
        result[id] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

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
  const remainingToday = todayAllTasks
    .filter((t) => !t.completed)
    .sort((a, b) => b.id - a.id);
  const completedToday = todayAllTasks
    .filter((t) => t.completed)
    .sort((a, b) => a.id - b.id);

  const todayScore = buildCategoryScore(
    completedToday.length,
    todayAllTasks.length,
  );

  // Uncompleted tasks on top, completed tasks moved downside
  const maxRows = 5;
  const remainingSlice = remainingToday.slice(0, maxRows);
  const completedSlice = completedToday.slice(
    0,
    Math.max(0, maxRows - remainingSlice.length),
  );

  const widgetTaskItems = [
    ...remainingSlice.map((t) => ({
      id: t.id,
      title: t.title,
      completed: false,
    })),
    ...completedSlice.map((t) => ({
      id: t.id,
      title: t.title,
      completed: true,
    })),
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

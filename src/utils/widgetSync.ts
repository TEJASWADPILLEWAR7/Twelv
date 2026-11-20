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
        remainingTasks: [],
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
  const remainingTodayTasks = todayAllTasks
    .filter((t) => !t.completed)
    .sort((a, b) => b.id - a.id);

  const todayScore = buildCategoryScore(
    todayAllTasks.length - remainingTodayTasks.length,
    todayAllTasks.length,
  );

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
      remainingCount: remainingTodayTasks.length,
      completedTodayCount: todayScore.completed,
      totalTodayCount: todayScore.total,
      remainingTasks: remainingTodayTasks.slice(0, 6).map((t) => t.title),
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

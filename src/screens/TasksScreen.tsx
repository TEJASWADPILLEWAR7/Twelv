import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ActiveWeekQuoteBanner } from "../components/ActiveWeekQuoteBanner";
import { Card } from "../components/Card";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenContainer } from "../components/ScreenContainer";
import { StatusBadge } from "../components/StatusBadge";
import { TaskFormModal } from "../components/TaskFormModal";
import { TaskItemRow } from "../components/TaskItemRow";
import { UnfinishedRolloverBanner } from "../components/UnfinishedRolloverBanner";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString, Task } from "../types";
import { formatDateWithWeekday, getWeekNumberForDate } from "../utils/date";
import { buildCategoryScore, TARGET_PERCENTAGE } from "../utils/scoring";

type TaskFilter = "today" | "pending" | "upcoming" | "completed";

const FILTER_TABS: Array<{ key: TaskFilter; label: string }> = [
  { key: "today", label: "Today" },
  { key: "pending", label: "Pending" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

export function TasksScreen() {
  const {
    challenge,
    todayStr,
    activeWeekNumber,
    tasks,
    weeklySummaries,
    addTask,
    editTask,
    toggleTask,
    removeTask,
    unfinishedPastTasks,
  } = useAppData();

  const [filter, setFilter] = useState<TaskFilter>("today");
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const todayStats = useMemo(() => {
    const todayTasks = tasks.filter((t) => t.scheduledDate === todayStr);
    const completedCount = todayTasks.filter((t) => t.completed).length;
    return buildCategoryScore(completedCount, todayTasks.length);
  }, [tasks, todayStr]);

  const currentWeekSummary = useMemo(() => {
    if (weeklySummaries.length === 0) {
      return null;
    }
    if (activeWeekNumber !== null) {
      return weeklySummaries[activeWeekNumber - 1] ?? null;
    }
    if (challenge && todayStr < challenge.startDate) {
      return weeklySummaries[0];
    }
    return weeklySummaries[weeklySummaries.length - 1];
  }, [weeklySummaries, activeWeekNumber, challenge, todayStr]);

  const filteredTasks = useMemo(() => {
    if (filter === "today") {
      return tasks
        .filter((t) => !t.completed && t.scheduledDate === todayStr)
        .sort((a, b) => b.id - a.id);
    }
    if (filter === "pending") {
      return tasks
        .filter((t) => !t.completed)
        .sort(
          (a, b) =>
            a.scheduledDate.localeCompare(b.scheduledDate) || b.id - a.id,
        );
    }
    if (filter === "upcoming") {
      return tasks
        .filter((t) => !t.completed && t.scheduledDate > todayStr)
        .sort(
          (a, b) =>
            a.scheduledDate.localeCompare(b.scheduledDate) || b.id - a.id,
        );
    }
    return tasks
      .filter((t) => t.completed)
      .sort(
        (a, b) =>
          (b.completedAt ?? b.scheduledDate).localeCompare(
            a.completedAt ?? a.scheduledDate,
          ) || b.id - a.id,
      );
  }, [tasks, filter, todayStr]);

  const filterCounts = useMemo(
    () => ({
      today: tasks.filter((t) => !t.completed && t.scheduledDate === todayStr)
        .length,
      pending: tasks.filter((t) => !t.completed).length,
      upcoming: tasks.filter((t) => !t.completed && t.scheduledDate > todayStr)
        .length,
      completed: tasks.filter((t) => t.completed).length,
    }),
    [tasks, todayStr],
  );

  const openCreateModal = useCallback(() => {
    setEditingTask(null);
    setFormVisible(true);
  }, []);

  const openEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setFormVisible(true);
  }, []);

  const handleToggleTask = useCallback(
    (taskId: number, nextCompleted: boolean) => {
      void toggleTask(taskId, nextCompleted);
    },
    [toggleTask],
  );

  const handleRequestDelete = useCallback((task: Task) => {
    setDeletingTask(task);
  }, []);

  if (!challenge) {
    return null;
  }

  async function handleSaveTask(
    title: string,
    description: string,
    scheduledDate: DateString,
  ) {
    if (editingTask) {
      await editTask(editingTask.id, { title, description, scheduledDate });
    } else {
      await addTask({ title, description, scheduledDate });
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTask) {
      return;
    }
    const targetId = deletingTask.id;
    setDeletingTask(null);
    await removeTask(targetId);
  }

  const weekTaskScore = currentWeekSummary?.tasks;
  const weekPct = weekTaskScore?.percentage ?? 0;
  const weekMet = weekTaskScore?.targetMet ?? false;

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.screenTitle}>Tasks</Text>
          <Text numberOfLines={1} style={styles.dateSubtitle}>
            {formatDateWithWeekday(todayStr)}
            {activeWeekNumber !== null
              ? ` · Week ${activeWeekNumber} of 12`
              : ""}
          </Text>
        </View>
        <Pressable style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={styles.addButtonText}>Task</Text>
        </Pressable>
      </View>

      <ActiveWeekQuoteBanner />
      <Card style={styles.statsCard}>
        <View style={styles.statsTopRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>TODAY</Text>
            <Text numberOfLines={1} style={styles.statPrimary}>
              {todayStats.completed}/{todayStats.total}
              <Text style={styles.statPct}> ({todayStats.percentage}%)</Text>
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>
              {currentWeekSummary
                ? `WEEK ${currentWeekSummary.weekNumber}`
                : "WEEK"}
            </Text>
            <Text numberOfLines={1} style={styles.statPrimary}>
              {weekTaskScore
                ? `${weekTaskScore.completed}/${weekTaskScore.total}`
                : "0/0"}
              <Text style={[styles.statPct, weekMet && styles.statPctSuccess]}>
                {" "}
                ({weekPct}%)
              </Text>
            </Text>
          </View>

          <StatusBadge
            label={
              (weekTaskScore?.total ?? 0) === 0
                ? `${TARGET_PERCENTAGE}% Goal`
                : weekMet
                  ? "85%+ Hit"
                  : "Below 85%"
            }
            tone={
              (weekTaskScore?.total ?? 0) === 0
                ? "neutral"
                : weekMet
                  ? "success"
                  : "warning"
            }
          />
        </View>

        <ProgressBar
          percentage={weekPct}
          accentColor={weekMet ? colors.success : colors.primary}
          height={6}
        />
      </Card>

      <View style={styles.filterBar}>
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {tab.label} ({filterCounts[tab.key]})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredTasks}
        ListHeaderComponent={filter === "today" && unfinishedPastTasks.length > 0 ? <UnfinishedRolloverBanner /> : undefined}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TaskItemRow
            task={item}
            todayStr={todayStr}
            weekNumber={getWeekNumberForDate(
              challenge.startDate,
              item.scheduledDate,
            )}
            onToggle={handleToggleTask}
            onEdit={openEditModal}
            onDelete={handleRequestDelete}
            onInstantDelete={handleInstantDelete}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title={
              filter === "today"
                ? todayStats.total > 0
                  ? "All today's tasks completed"
                  : "No tasks scheduled for today"
                : filter === "pending"
                  ? "All caught up"
                  : filter === "upcoming"
                    ? "No upcoming tasks"
                    : "No completed tasks yet"
            }
            description={
              filter === "today"
                ? todayStats.total > 0
                  ? "Completed tasks are shown in the Completed tab."
                  : "Plan your highest-leverage tasks for today to stay above 85% this week."
                : "Tap + Task above to schedule work inside your 12-week cycle."
            }
            actionLabel={filter === "today" ? "Add Today Task" : undefined}
            onAction={filter === "today" ? openCreateModal : undefined}
          />
        }
      />

      <TaskFormModal
        visible={formVisible}
        editingTask={editingTask}
        challengeStartDate={challenge.startDate}
        challengeEndDate={challenge.endDate}
        todayStr={todayStr}
        onSave={handleSaveTask}
        onClose={() => setFormVisible(false)}
      />

      <ConfirmModal
        visible={deletingTask !== null}
        title="Delete Task?"
        message={
          deletingTask
            ? `Remove "${deletingTask.title}"? This will also update that week's task completion total.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
  },
  screenTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  dateSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  addButtonText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.background,
  },
  statsCard: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  statColumn: {
    flexShrink: 1,
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  statLabel: {
    ...typography.micro,
    color: colors.textMuted,
  },
  statPrimary: {
    ...typography.bodyMedium,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statPct: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statPctSuccess: {
    color: colors.success,
  },
  filterBar: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.md,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
  },
  filterPillActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  filterText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
});

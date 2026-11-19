import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { HabitFormModal } from "../components/HabitFormModal";
import { HabitItemRow } from "../components/HabitItemRow";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenContainer } from "../components/ScreenContainer";
import { StatusBadge } from "../components/StatusBadge";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString, Habit, Weekday } from "../types";
import { formatDateWithWeekday, maxDate } from "../utils/date";
import {
  buildCategoryScore,
  computeHabitStats,
  getActiveScheduleForDate,
  HabitStats,
  isHabitScheduledOnDate,
  TARGET_PERCENTAGE,
} from "../utils/scoring";

type HabitFilter = "today" | "all";

const EMPTY_DATE_SET = new Set<DateString>();
const DEFAULT_STATS: HabitStats = {
  scheduledCount: 0,
  completedCount: 0,
  percentage: 0,
  currentStreak: 0,
};

export function HabitsScreen() {
  const {
    challenge,
    todayStr,
    activeWeekNumber,
    habits,
    schedules,
    logs,
    weeklySummaries,
    addHabit,
    editHabit,
    removeHabit,
    toggleHabitLog,
  } = useAppData();

  const [filter, setFilter] = useState<HabitFilter>("today");
  const [formVisible, setFormVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

  const activeHabits = useMemo(
    () => habits.filter((h) => h.endedOn === null || h.endedOn >= todayStr),
    [habits, todayStr],
  );

  const logsByHabit = useMemo(() => {
    const map = new Map<number, Set<DateString>>();
    for (const log of logs) {
      let set = map.get(log.habitId);
      if (!set) {
        set = new Set<DateString>();
        map.set(log.habitId, set);
      }
      set.add(log.logDate);
    }
    return map;
  }, [logs]);

  const activeDaysByHabit = useMemo(() => {
    const map = new Map<number, Weekday[]>();
    if (!challenge) {
      return map;
    }
    const lookupDate = maxDate(todayStr, challenge.startDate);
    for (const habit of activeHabits) {
      map.set(
        habit.id,
        getActiveScheduleForDate(schedules, habit.id, lookupDate),
      );
    }
    return map;
  }, [activeHabits, schedules, challenge, todayStr]);

  const statsByHabit = useMemo(() => {
    const map = new Map<number, HabitStats>();
    if (!challenge) {
      return map;
    }
    for (const habit of activeHabits) {
      map.set(
        habit.id,
        computeHabitStats(
          habit,
          schedules,
          logs,
          challenge.startDate,
          challenge.endDate,
          todayStr,
        ),
      );
    }
    return map;
  }, [activeHabits, schedules, logs, challenge, todayStr]);

  const todayScore = useMemo(() => {
    const scheduledToday = activeHabits.filter((h) =>
      isHabitScheduledOnDate(h, schedules, todayStr),
    );
    const completedToday = scheduledToday.filter((h) =>
      logsByHabit.get(h.id)?.has(todayStr),
    );
    return buildCategoryScore(completedToday.length, scheduledToday.length);
  }, [activeHabits, schedules, todayStr, logsByHabit]);

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

  const displayedHabits = useMemo(() => {
    if (filter === "all") {
      return activeHabits;
    }
    return activeHabits.filter((h) =>
      isHabitScheduledOnDate(h, schedules, todayStr),
    );
  }, [activeHabits, filter, schedules, todayStr]);

  const editingInitialDays: Weekday[] = useMemo(() => {
    if (!editingHabit) {
      return [0, 1, 2, 3, 4, 5, 6];
    }
    return activeDaysByHabit.get(editingHabit.id) ?? [0, 1, 2, 3, 4, 5, 6];
  }, [editingHabit, activeDaysByHabit]);

  const openCreateModal = useCallback(() => {
    setEditingHabit(null);
    setFormVisible(true);
  }, []);

  const openEditModal = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setFormVisible(true);
  }, []);

  const handleRequestDelete = useCallback((habit: Habit) => {
    setDeletingHabit(habit);
  }, []);

  if (!challenge) {
    return null;
  }

  const weekStartDate = currentWeekSummary?.startDate ?? challenge.startDate;
  const weekHabitScore = currentWeekSummary?.habits;
  const weekPct = weekHabitScore?.percentage ?? 0;
  const weekMet = weekHabitScore?.targetMet ?? false;

  async function handleSaveHabit(title: string, daysOfWeek: Weekday[]) {
    if (editingHabit) {
      await editHabit(editingHabit.id, title, daysOfWeek);
    } else {
      await addHabit({ title, daysOfWeek });
    }
  }

  async function handleConfirmDelete() {
    if (!deletingHabit) {
      return;
    }
    const target = deletingHabit;
    setDeletingHabit(null);
    await removeHabit(target);
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Habits</Text>
          <Text style={styles.dateSubtitle}>
            {formatDateWithWeekday(todayStr)}
            {activeWeekNumber !== null
              ? ` · Week ${activeWeekNumber} of 12`
              : ""}
          </Text>
        </View>
        <Pressable style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={styles.addButtonText}>Habit</Text>
        </Pressable>
      </View>

      <Card style={styles.statsCard}>
        <View style={styles.statsTopRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statPrimary}>
              {todayScore.completed}/{todayScore.total}
              <Text style={styles.statPct}> ({todayScore.percentage}%)</Text>
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>
              {currentWeekSummary
                ? `WEEK ${currentWeekSummary.weekNumber} SCORE`
                : "WEEK SCORE"}
            </Text>
            <Text style={styles.statPrimary}>
              {weekHabitScore
                ? `${weekHabitScore.completed}/${weekHabitScore.total}`
                : "0/0"}
              <Text style={[styles.statPct, weekMet && styles.statPctSuccess]}>
                {" "}
                ({weekPct}%)
              </Text>
            </Text>
          </View>

          <StatusBadge
            label={
              (weekHabitScore?.total ?? 0) === 0
                ? `${TARGET_PERCENTAGE}% Goal`
                : weekMet
                  ? "85%+ Hit"
                  : "Below 85%"
            }
            tone={
              (weekHabitScore?.total ?? 0) === 0
                ? "neutral"
                : weekMet
                  ? "success"
                  : "warning"
            }
          />
        </View>

        <ProgressBar
          percentage={weekPct}
          accentColor={weekMet ? colors.success : colors.accentSecondary}
          height={6}
        />
      </Card>

      <View style={styles.filterBar}>
        <Pressable
          onPress={() => setFilter("today")}
          style={[
            styles.filterPill,
            filter === "today" && styles.filterPillActive,
          ]}
        >
          <Text
            style={[
              styles.filterText,
              filter === "today" && styles.filterTextActive,
            ]}
          >
            Today ({todayScore.total})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("all")}
          style={[
            styles.filterPill,
            filter === "all" && styles.filterPillActive,
          ]}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            All Habits ({activeHabits.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={displayedHabits}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <HabitItemRow
            habit={item}
            schedules={schedules}
            activeDays={activeDaysByHabit.get(item.id) ?? []}
            completedDates={logsByHabit.get(item.id) ?? EMPTY_DATE_SET}
            weekStartDate={weekStartDate}
            todayStr={todayStr}
            stats={statsByHabit.get(item.id) ?? DEFAULT_STATS}
            onToggleDate={toggleHabitLog}
            onEdit={openEditModal}
            onDelete={handleRequestDelete}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="repeat-outline"
            title={
              filter === "today" && activeHabits.length > 0
                ? "No habits scheduled today"
                : "No recurring habits yet"
            }
            description={
              filter === "today" && activeHabits.length > 0
                ? "Today is an unscheduled rest day for your active habits. Switch to All Habits to view them."
                : "Create daily or weekday habits to track consistency and hit 85%+ every week."
            }
            actionLabel={
              activeHabits.length === 0 ? "Create First Habit" : undefined
            }
            onAction={activeHabits.length === 0 ? openCreateModal : undefined}
          />
        }
      />

      <HabitFormModal
        visible={formVisible}
        editingHabit={editingHabit}
        initialDays={editingInitialDays}
        onSave={handleSaveHabit}
        onClose={() => setFormVisible(false)}
      />

      <ConfirmModal
        visible={deletingHabit !== null}
        title="Delete Habit?"
        message={
          deletingHabit
            ? `Remove "${deletingHabit.title}"? Past completed week logs remain preserved, while future days will no longer be scheduled.`
            : ""
        }
        confirmLabel="Remove Habit"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingHabit(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
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
    gap: spacing.sm,
  },
  statColumn: {
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
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
    ...typography.caption,
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

import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString, Habit, HabitSchedule, Weekday } from "../types";
import { addDays, formatScheduleSummary, getWeekday } from "../utils/date";
import { HabitStats, isHabitScheduledOnDate } from "../utils/scoring";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

interface HabitItemRowProps {
  habit: Habit;
  schedules: HabitSchedule[];
  activeDays: Weekday[];
  completedDates: Set<DateString>;
  weekStartDate: DateString;
  todayStr: DateString;
  stats: HabitStats;
  onToggleDate: (
    habitId: number,
    dateStr: DateString,
    nextCompleted: boolean,
  ) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

function HabitItemRowBase({
  habit,
  schedules,
  activeDays,
  completedDates,
  weekStartDate,
  todayStr,
  stats,
  onToggleDate,
  onEdit,
  onDelete,
}: HabitItemRowProps) {
  const scheduledToday = isHabitScheduledOnDate(habit, schedules, todayStr);
  const completedToday = completedDates.has(todayStr);

  const weekDates: DateString[] = [];
  for (let i = 0; i < 7; i += 1) {
    weekDates.push(addDays(weekStartDate, i));
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Pressable style={styles.infoArea} onPress={() => onEdit(habit)}>
          <Text numberOfLines={2} style={styles.title}>
            {habit.title}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.scheduleText}>
              {formatScheduleSummary(activeDays)}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text
              style={[
                styles.consistencyText,
                stats.percentage >= 85 &&
                  stats.scheduledCount > 0 &&
                  styles.consistencyHigh,
              ]}
            >
              {stats.completedCount}/{stats.scheduledCount} ({stats.percentage}
              %)
            </Text>
            {stats.currentStreak > 0 ? (
              <>
                <Text style={styles.dot}>·</Text>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={12} color={colors.warning} />
                  <Text style={styles.streakText}>{stats.currentStreak}d</Text>
                </View>
              </>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.rightActions}>
          {scheduledToday ? (
            <Pressable
              onPress={() => onToggleDate(habit.id, todayStr, !completedToday)}
              style={[
                styles.todayButton,
                completedToday && styles.todayButtonCompleted,
              ]}
            >
              <Ionicons
                name={completedToday ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={completedToday ? colors.background : colors.primary}
              />
              <Text
                style={[
                  styles.todayButtonText,
                  completedToday && styles.todayButtonTextCompleted,
                ]}
              >
                {completedToday ? "Done" : "Check"}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.restPill}>
              <Text style={styles.restPillText}>Rest</Text>
            </View>
          )}

          <Pressable
            onPress={() => onDelete(habit)}
            hitSlop={10}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekStrip}>
        {weekDates.map((dateStr) => {
          const scheduled = isHabitScheduledOnDate(habit, schedules, dateStr);
          const completed = completedDates.has(dateStr);
          const isFuture = dateStr > todayStr;
          const isToday = dateStr === todayStr;
          const canToggle = scheduled && (!isFuture || completed);
          const letter = WEEKDAY_LETTERS[getWeekday(dateStr)];

          return (
            <Pressable
              key={dateStr}
              disabled={!canToggle}
              onPress={() => onToggleDate(habit.id, dateStr, !completed)}
              style={[
                styles.dayPill,
                completed && styles.dayPillCompleted,
                !completed && scheduled && !isFuture && styles.dayPillDue,
                !scheduled && styles.dayPillUnscheduled,
                isToday && styles.dayPillTodayBorder,
              ]}
            >
              <Text
                style={[
                  styles.dayPillLetter,
                  completed && styles.dayPillLetterCompleted,
                  !scheduled && styles.dayPillLetterMuted,
                ]}
              >
                {letter}
              </Text>
              {completed ? (
                <Ionicons
                  name="checkmark"
                  size={13}
                  color={colors.background}
                />
              ) : scheduled ? (
                <View
                  style={[
                    styles.statusDot,
                    isFuture ? styles.statusDotFuture : styles.statusDotPending,
                  ]}
                />
              ) : (
                <Text style={styles.dashText}>-</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const HabitItemRow = memo(HabitItemRowBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  infoArea: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  scheduleText: {
    ...typography.micro,
    color: colors.accentSecondary,
  },
  dot: {
    ...typography.micro,
    color: colors.textMuted,
  },
  consistencyText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  consistencyHigh: {
    color: colors.success,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  streakText: {
    ...typography.micro,
    color: colors.warning,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  todayButtonCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  todayButtonText: {
    ...typography.micro,
    color: colors.primary,
  },
  todayButtonTextCompleted: {
    color: colors.background,
    fontWeight: "700",
  },
  restPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  restPillText: {
    ...typography.micro,
    color: colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
  },
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayPill: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayPillCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayPillDue: {
    borderColor: colors.border,
  },
  dayPillUnscheduled: {
    opacity: 0.45,
  },
  dayPillTodayBorder: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  dayPillLetter: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  dayPillLetterCompleted: {
    color: colors.background,
    fontWeight: "700",
  },
  dayPillLetterMuted: {
    color: colors.textMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  statusDotPending: {
    backgroundColor: colors.textMuted,
  },
  statusDotFuture: {
    backgroundColor: colors.border,
  },
  dashText: {
    ...typography.micro,
    color: colors.textMuted,
  },
});

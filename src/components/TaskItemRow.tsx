import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString, Task } from "../types";
import { addDays, formatDateWithWeekday } from "../utils/date";

interface TaskItemRowProps {
  task: Task;
  todayStr: DateString;
  weekNumber: number | null;
  onToggle: (taskId: number, nextCompleted: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskItemRowBase({
  task,
  todayStr,
  weekNumber,
  onToggle,
  onEdit,
  onDelete,
}: TaskItemRowProps) {
  const tomorrowStr = addDays(todayStr, 1);
  const isOverdue = !task.completed && task.scheduledDate < todayStr;
  const isToday = task.scheduledDate === todayStr;

  let dateLabel = formatDateWithWeekday(task.scheduledDate);
  if (isToday) {
    dateLabel = "Today";
  } else if (task.scheduledDate === tomorrowStr) {
    dateLabel = "Tomorrow";
  }

  return (
    <View style={[styles.row, task.completed && styles.rowCompleted]}>
      <Pressable
        onPress={() => onToggle(task.id, !task.completed)}
        hitSlop={8}
        style={styles.checkArea}
      >
        <View
          style={[styles.checkbox, task.completed && styles.checkboxChecked]}
        >
          {task.completed ? (
            <Ionicons name="checkmark" size={16} color={colors.background} />
          ) : null}
        </View>
      </Pressable>

      <Pressable style={styles.bodyArea} onPress={() => onEdit(task)}>
        <Text
          numberOfLines={2}
          style={[styles.title, task.completed && styles.titleCompleted]}
        >
          {task.title}
        </Text>

        {task.description ? (
          <Text numberOfLines={2} style={styles.description}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View
            style={[
              styles.dateBadge,
              isOverdue && styles.dateBadgeOverdue,
              isToday && !task.completed && styles.dateBadgeToday,
            ]}
          >
            <Text
              style={[
                styles.dateBadgeText,
                isOverdue && styles.dateBadgeTextOverdue,
                isToday && !task.completed && styles.dateBadgeTextToday,
              ]}
            >
              {isOverdue ? `Overdue · ${dateLabel}` : dateLabel}
            </Text>
          </View>
          {weekNumber !== null ? (
            <Text style={styles.weekTag}>W{weekNumber}</Text>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        onPress={() => onDelete(task)}
        hitSlop={10}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export const TaskItemRow = memo(TaskItemRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowCompleted: {
    opacity: 0.72,
    borderColor: colors.borderSubtle,
  },
  checkArea: {
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bodyArea: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  dateBadgeToday: {
    backgroundColor: colors.primaryMuted,
  },
  dateBadgeOverdue: {
    backgroundColor: colors.dangerMuted,
  },
  dateBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  dateBadgeTextToday: {
    color: colors.primary,
  },
  dateBadgeTextOverdue: {
    color: colors.danger,
  },
  weekTag: {
    ...typography.micro,
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 4,
  },
});

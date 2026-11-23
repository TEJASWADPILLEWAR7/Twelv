import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString, Task } from "../types";
import { addDays, formatDateWithWeekday } from "../utils/date";
import { formatTime12h } from "../utils/time";

interface TaskItemRowProps {
  task: Task;
  todayStr: DateString;
  weekNumber: number | null;
  onToggle: (taskId: number, nextCompleted: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onInstantDelete?: (taskId: number) => void;
}

function TaskItemRowBase({
  task,
  todayStr,
  weekNumber,
  onToggle,
  onEdit,
  onDelete,
  onInstantDelete,
}: TaskItemRowProps) {
  const tomorrowStr = addDays(todayStr, 1);
  const isOverdue = !task.completed && task.scheduledDate < todayStr;
  const isToday = task.scheduledDate === todayStr;
  const formattedTime = formatTime12h(task.scheduledTime);

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
              {isOverdue ? "Overdue \u00b7 " + dateLabel : dateLabel}
            </Text>
          </View>

          {formattedTime ? (
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={11} color={colors.primary} />
              <Text style={styles.timeBadgeText}>{formattedTime}</Text>
            </View>
          ) : null}

          {weekNumber !== null ? (
            <Text style={styles.weekTag}>W{weekNumber}</Text>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          if (task.completed && onInstantDelete) {
            onInstantDelete(task.id);
          } else {
            onDelete(task);
          }
        }}
        hitSlop={10}
        style={[
          styles.deleteButton,
          task.completed && styles.deleteButtonCompleted,
        ]}
      >
        <Ionicons
          name="trash-outline"
          size={task.completed ? 15 : 18}
          color={task.completed ? colors.danger : colors.textMuted}
        />
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
    opacity: 0.78,
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
    flexWrap: "wrap",
    gap: 6,
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
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  timeBadgeText: {
    ...typography.micro,
    color: colors.primary,
  },
  weekTag: {
    ...typography.micro,
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonCompleted: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerMuted,
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
});

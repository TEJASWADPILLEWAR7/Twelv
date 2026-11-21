import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { formatDateWithWeekday } from "../utils/date";
import { Card } from "./Card";

export function UnfinishedRolloverBanner() {
  const { unfinishedPastTasks, rolloverUnfinishedTasks } = useAppData();
  const [dismissed, setDismissed] = useState(false);
  const [moving, setMoving] = useState(false);

  if (dismissed || unfinishedPastTasks.length === 0) {
    return null;
  }

  const previewTasks = unfinishedPastTasks.slice(0, 3);
  const extraCount = Math.max(
    0,
    unfinishedPastTasks.length - previewTasks.length,
  );

  async function handleMoveAll() {
    setMoving(true);
    try {
      await rolloverUnfinishedTasks();
    } finally {
      setMoving(false);
    }
  }

  async function handleMoveOne(taskId: number) {
    setMoving(true);
    try {
      await rolloverUnfinishedTasks([taskId]);
    } finally {
      setMoving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="refresh-circle" size={20} color={colors.warning} />
          <Text style={styles.title}>
            {unfinishedPastTasks.length} unfinished{" "}
            {unfinishedPastTasks.length === 1 ? "task" : "tasks"} from earlier
          </Text>
        </View>

        <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.list}>
        {previewTasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={styles.taskInfo}>
              <Text numberOfLines={1} style={styles.taskTitle}>
                {task.title}
              </Text>
              <Text style={styles.taskDate}>
                {formatDateWithWeekday(task.scheduledDate)}
              </Text>
            </View>

            <Pressable
              onPress={() => handleMoveOne(task.id)}
              disabled={moving}
              style={styles.singleBtn}
            >
              <Text style={styles.singleBtnText}>+ Today</Text>
            </Pressable>
          </View>
        ))}

        {extraCount > 0 ? (
          <Text style={styles.moreText}>
            +{extraCount} more unfinished tasks
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={handleMoveAll}
        disabled={moving}
        style={[styles.moveAllBtn, moving && styles.disabledBtn]}
      >
        <Ionicons
          name="arrow-forward-circle-outline"
          size={16}
          color={colors.background}
        />
        <Text style={styles.moveAllBtnText}>
          {moving
            ? "Moving..."
            : `Move All (${unfinishedPastTasks.length}) to Today`}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  title: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  list: {
    gap: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 8,
  },
  taskInfo: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  taskDate: {
    ...typography.micro,
    color: colors.textMuted,
    textTransform: "none",
    letterSpacing: 0,
  },
  singleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  singleBtnText: {
    ...typography.micro,
    color: colors.primary,
  },
  moreText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  moveAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: 2,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  moveAllBtnText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.background,
  },
});

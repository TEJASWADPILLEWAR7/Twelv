import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NewCycleGoalInput, useAppData } from "../context/AppDataContext";
import { computeGoalBreakdowns, GOAL_PALETTE } from "../database/extensions";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Card } from "./Card";

export function GoalPillarsCard() {
  const {
    challenge,
    goals,
    tasks,
    taskGoalMap,
    habits,
    habitGoalMap,
    schedules,
    logs,
    saveCycleGoals,
  } = useAppData();

  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<NewCycleGoalInput[]>([]);
  const [saving, setSaving] = useState(false);

  const breakdowns = useMemo(() => {
    if (!challenge || goals.length === 0) {
      return [];
    }
    return computeGoalBreakdowns({
      goals,
      tasks,
      taskGoalMap,
      habits,
      habitGoalMap,
      schedules,
      logs,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    });
  }, [
    challenge,
    goals,
    tasks,
    taskGoalMap,
    habits,
    habitGoalMap,
    schedules,
    logs,
  ]);

  if (!challenge) {
    return null;
  }

  function startEditing() {
    if (goals.length > 0) {
      setDrafts(goals.map((g) => ({ title: g.title, color: g.color })));
    } else {
      setDrafts([{ title: "", color: GOAL_PALETTE[0].hex }]);
    }
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveCycleGoals(drafts);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="flag-outline" size={16} color={colors.primary} />
          <Text style={styles.heading}>12-WEEK GOAL PILLARS</Text>
        </View>

        {!editing ? (
          <Pressable onPress={startEditing} hitSlop={8}>
            <Text style={styles.editLink}>
              {goals.length > 0 ? "Edit" : "+ Set Goals"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <View style={styles.editorBlock}>
          {drafts.map((item, idx) => (
            <View key={idx} style={styles.draftRow}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <TextInput
                value={item.title}
                onChangeText={(txt) =>
                  setDrafts((prev) =>
                    prev.map((d, i) => (i === idx ? { ...d, title: txt } : d)),
                  )
                }
                placeholder={`Goal ${idx + 1}`}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={50}
              />
              {drafts.length > 1 ? (
                <Pressable
                  onPress={() =>
                    setDrafts((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>
          ))}

          {drafts.length < 3 ? (
            <Pressable
              onPress={() =>
                setDrafts((prev) => [
                  ...prev,
                  {
                    title: "",
                    color: GOAL_PALETTE[prev.length % GOAL_PALETTE.length].hex,
                  },
                ])
              }
              style={styles.addMoreBtn}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.addMoreText}>Add Another Goal</Text>
            </Pressable>
          ) : null}

          <View style={styles.editorActions}>
            <Pressable
              onPress={() => setEditing(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={styles.saveBtn}
            >
              <Text style={styles.saveText}>
                {saving ? "Saving..." : "Save Goals"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : breakdowns.length === 0 ? (
        <Text style={styles.emptyText}>
          Define up to 3 core goals to track which priority is hitting 85%+.
        </Text>
      ) : (
        <View style={styles.list}>
          {breakdowns.map(({ goal, tasks: tScore, overallPercentage }) => (
            <View key={goal.id} style={styles.goalRow}>
              <View style={styles.goalTop}>
                <View style={styles.goalLabelRow}>
                  <View style={[styles.dot, { backgroundColor: goal.color }]} />
                  <Text numberOfLines={1} style={styles.goalTitle}>
                    {goal.title}
                  </Text>
                </View>
                <Text style={styles.goalPct}>
                  {tScore.total > 0 ? `${overallPercentage}%` : "No items yet"}
                </Text>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: goal.color,
                      width: `${Math.min(100, overallPercentage)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heading: {
    ...typography.micro,
    color: colors.textMuted,
  },
  editLink: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.sm,
  },
  goalRow: {
    gap: 6,
  },
  goalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  goalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  goalTitle: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  goalPct: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  editorBlock: {
    gap: spacing.xs,
  },
  draftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    color: colors.textPrimary,
    ...typography.caption,
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  addMoreText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.primary,
  },
  editorActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  cancelText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  saveText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.background,
  },
});

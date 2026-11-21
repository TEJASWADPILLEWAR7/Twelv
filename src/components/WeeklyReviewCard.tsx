import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Card } from "./Card";

export function WeeklyReviewCard() {
  const {
    challenge,
    activeWeekNumber,
    weeklySummaries,
    weeklyReviews,
    saveWeeklyReview,
  } = useAppData();

  const defaultWeek = useMemo(() => {
    if (!activeWeekNumber) {
      return 1;
    }
    const isSunday = new Date().getDay() === 0;
    if (isSunday || activeWeekNumber === 1) {
      return activeWeekNumber;
    }
    return Math.max(1, activeWeekNumber - 1);
  }, [activeWeekNumber]);

  const [selectedWeek, setSelectedWeek] = useState<number>(defaultWeek);
  const [winNote, setWinNote] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setSelectedWeek(defaultWeek);
  }, [defaultWeek]);

  useEffect(() => {
    const existing = weeklyReviews.find((r) => r.weekNumber === selectedWeek);
    setWinNote(existing?.winNote ?? "");
    setAdjustmentNote(existing?.adjustmentNote ?? "");
    setSavedNotice(false);
  }, [selectedWeek, weeklyReviews]);

  if (!challenge || weeklySummaries.length === 0) {
    return null;
  }

  const summary =
    weeklySummaries.find((w) => w.weekNumber === selectedWeek) ??
    weeklySummaries[0];
  const hit85 =
    (summary.tasks.total === 0 || summary.tasks.targetMet) &&
    (summary.habits.total === 0 || summary.habits.targetMet) &&
    (summary.tasks.total > 0 || summary.habits.total > 0);

  async function handleSaveReview() {
    setSaving(true);
    try {
      await saveWeeklyReview(selectedWeek, winNote, adjustmentNote);
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="journal-outline" size={16} color={colors.primary} />
          <Text style={styles.heading}>WEEKLY CHECK-IN</Text>
        </View>

        <View style={styles.weekStepper}>
          <Pressable
            onPress={() => setSelectedWeek((w) => Math.max(1, w - 1))}
            disabled={selectedWeek <= 1}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={selectedWeek <= 1 ? colors.textMuted : colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.weekLabel}>Week {selectedWeek}</Text>
          <Pressable
            onPress={() => setSelectedWeek((w) => Math.min(12, w + 1))}
            disabled={selectedWeek >= 12}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={selectedWeek >= 12 ? colors.textMuted : colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreText}>
          Tasks {summary.tasks.percentage}% · Habits {summary.habits.percentage}
          %
        </Text>
        <View
          style={[
            styles.statusPill,
            hit85 ? styles.statusPillSuccess : styles.statusPillWarning,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              { color: hit85 ? colors.success : colors.warning },
            ]}
          >
            {hit85 ? "85%+ Target Hit" : "Target: 85%"}
          </Text>
        </View>
      </View>

      <TextInput
        value={winNote}
        onChangeText={(t) => {
          setWinNote(t);
          if (savedNotice) {
            setSavedNotice(false);
          }
        }}
        placeholder="Biggest win from Week..."
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        maxLength={180}
      />

      <TextInput
        value={adjustmentNote}
        onChangeText={(t) => {
          setAdjustmentNote(t);
          if (savedNotice) {
            setSavedNotice(false);
          }
        }}
        placeholder="1 adjustment to hit 85%+ next week..."
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        maxLength={180}
      />

      <Pressable
        onPress={handleSaveReview}
        disabled={saving}
        style={styles.saveBtn}
      >
        <Text style={styles.saveBtnText}>
          {saving
            ? "Saving..."
            : savedNotice
              ? "Check-In Saved ✓"
              : `Save Week ${selectedWeek} Check-In`}
        </Text>
      </Pressable>
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
  weekStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  weekLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  scoreText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusPillSuccess: {
    backgroundColor: "rgba(52, 211, 153, 0.14)",
  },
  statusPillWarning: {
    backgroundColor: "rgba(251, 191, 36, 0.14)",
  },
  statusPillText: {
    ...typography.micro,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    color: colors.textPrimary,
    ...typography.caption,
  },
  saveBtn: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: 9,
    borderRadius: radius.full,
    alignItems: "center",
  },
  saveBtnText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
});

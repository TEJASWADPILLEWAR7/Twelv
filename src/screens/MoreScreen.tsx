import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { ConfirmModal } from "../components/ConfirmModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenContainer } from "../components/ScreenContainer";
import { StatusBadge } from "../components/StatusBadge";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { diffDays, formatDisplayDate, formatShortDate } from "../utils/date";
import { TARGET_PERCENTAGE } from "../utils/scoring";

export function MoreScreen() {
  const {
    challenge,
    todayStr,
    activeWeekNumber,
    weeklySummaries,
    tasks,
    habits,
    resetChallenge,
  } = useAppData();

  const [resetDialogVisible, setResetDialogVisible] = useState(false);

  const timelineStats = useMemo(() => {
    if (!challenge) {
      return null;
    }
    const totalDays = 84;
    if (todayStr < challenge.startDate) {
      const daysUntilStart = diffDays(todayStr, challenge.startDate);
      return {
        statusText: `Starts in ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"}`,
        elapsedDays: 0,
        remainingDays: totalDays,
        progressPct: 0,
      };
    }
    if (todayStr > challenge.endDate) {
      return {
        statusText: "12-Week Cycle Completed",
        elapsedDays: totalDays,
        remainingDays: 0,
        progressPct: 100,
      };
    }
    const elapsedDays = diffDays(challenge.startDate, todayStr) + 1;
    const remainingDays = totalDays - elapsedDays;
    return {
      statusText: `Week ${activeWeekNumber ?? 1} of 12 Active`,
      elapsedDays,
      remainingDays,
      progressPct: Math.round((elapsedDays / totalDays) * 100),
    };
  }, [challenge, todayStr, activeWeekNumber]);

  const completedWeeksCount = useMemo(
    () => weeklySummaries.filter((w) => w.status === "completed").length,
    [weeklySummaries],
  );

  const upcomingWeeksCount = useMemo(
    () => weeklySummaries.filter((w) => w.status === "upcoming").length,
    [weeklySummaries],
  );

  if (!challenge || !timelineStats) {
    return null;
  }

  async function handleConfirmReset() {
    setResetDialogVisible(false);
    await resetChallenge();
  }

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>Challenge</Text>

        <Card highlighted style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.challengeName}>{challenge.name}</Text>
              <Text style={styles.dateRange}>
                {formatDisplayDate(challenge.startDate)} -{" "}
                {formatDisplayDate(challenge.endDate)}
              </Text>
            </View>
            <StatusBadge
              label={`${TARGET_PERCENTAGE}% Target`}
              tone="success"
            />
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.statusLabel}>{timelineStats.statusText}</Text>
              <Text style={styles.dayCounter}>
                Day {timelineStats.elapsedDays} / 84
              </Text>
            </View>
            <ProgressBar percentage={timelineStats.progressPct} />
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{completedWeeksCount}</Text>
              <Text style={styles.metricLabel}>Completed Wks</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{upcomingWeeksCount}</Text>
              <Text style={styles.metricLabel}>Upcoming Wks</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{tasks.length}</Text>
              <Text style={styles.metricLabel}>Total Tasks</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{habits.length}</Text>
              <Text style={styles.metricLabel}>Habits</Text>
            </View>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>12-Week Schedule</Text>
          <Text style={styles.sectionHint}>7 days per week</Text>
        </View>

        <Card style={styles.weeksCard}>
          {weeklySummaries.map((week, index) => {
            const isLast = index === weeklySummaries.length - 1;
            const tone =
              week.status === "current"
                ? "success"
                : week.status === "completed"
                  ? "neutral"
                  : "info";
            const badgeText =
              week.status === "current"
                ? "Active"
                : week.status === "completed"
                  ? "Completed"
                  : "Upcoming";

            return (
              <View
                key={week.weekNumber}
                style={[styles.weekRow, !isLast && styles.weekRowBorder]}
              >
                <View style={styles.weekLeft}>
                  <Text
                    style={[
                      styles.weekNum,
                      week.status === "current" && styles.weekNumActive,
                    ]}
                  >
                    Week {week.weekNumber}
                  </Text>
                  <Text style={styles.weekDates}>
                    {formatShortDate(week.startDate)} -{" "}
                    {formatShortDate(week.endDate)}
                  </Text>
                </View>
                <StatusBadge label={badgeText} tone={tone} />
              </View>
            );
          })}
        </Card>

        <Card style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.dangerTitle}>Offline Data & Cycle Reset</Text>
          </View>
          <Text style={styles.dangerDescription}>
            All tasks, habits, and check-ins are stored locally on your device.
            Starting a new 12-week challenge permanently clears the current
            cycle.
          </Text>
          <PrimaryButton
            label="Reset & Start New Challenge"
            variant="danger"
            onPress={() => setResetDialogVisible(true)}
          />
        </Card>
      </ScrollView>

      <ConfirmModal
        visible={resetDialogVisible}
        title="Reset 12-Week Challenge?"
        message="This will permanently delete your active challenge, all scheduled tasks, habits, and historical logs. This action cannot be undone."
        confirmLabel="Delete & Reset"
        destructive
        onConfirm={handleConfirmReset}
        onCancel={() => setResetDialogVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  screenTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroTitleWrap: {
    flex: 1,
    gap: 4,
  },
  challengeName: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  dateRange: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressSection: {
    gap: spacing.xs,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    ...typography.caption,
    color: colors.primary,
  },
  dayCounter: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    gap: 2,
  },
  metricValue: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.micro,
    color: colors.textMuted,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  weeksCard: {
    paddingVertical: spacing.xs,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  weekRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  weekLeft: {
    gap: 2,
  },
  weekNum: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  weekNumActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  weekDates: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dangerCard: {
    gap: spacing.md,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dangerTitle: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dangerDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});

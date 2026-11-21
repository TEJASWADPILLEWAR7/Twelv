import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { GoalPillarsCard } from "../components/GoalPillarsCard";
import { WeeklyReviewCard } from "../components/WeeklyReviewCard";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenContainer } from "../components/ScreenContainer";
import { StatusBadge } from "../components/StatusBadge";
import { WeeklyPerformanceChart } from "../components/WeeklyPerformanceChart";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { WeeklySummary } from "../types";
import { diffDays, formatShortDate } from "../utils/date";
import {
  computeOverallChallengeStats,
  TARGET_PERCENTAGE,
} from "../utils/scoring";

function getCategoryBadge(week: WeeklySummary, category: "tasks" | "habits") {
  if (week.status === "upcoming") {
    return { label: "Not started", tone: "neutral" as const };
  }
  const score = category === "tasks" ? week.tasks : week.habits;
  if (score.total === 0) {
    return { label: "No items", tone: "neutral" as const };
  }
  if (score.targetMet) {
    return { label: "85%+ Hit", tone: "success" as const };
  }
  return {
    label: week.status === "current" ? "Below 85%" : "Missed 85%",
    tone:
      week.status === "current" ? ("warning" as const) : ("danger" as const),
  };
}

export function ProgressScreen() {
  const { challenge, todayStr, activeWeekNumber, weeklySummaries } =
    useAppData();

  const overallStats = useMemo(
    () => computeOverallChallengeStats(weeklySummaries),
    [weeklySummaries],
  );

  const cycleDaysElapsed = useMemo(() => {
    if (!challenge) {
      return 0;
    }
    if (todayStr < challenge.startDate) {
      return 0;
    }
    if (todayStr > challenge.endDate) {
      return 84;
    }
    return diffDays(challenge.startDate, todayStr) + 1;
  }, [challenge, todayStr]);

  if (!challenge) {
    return null;
  }

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.screenTitle}>Progress</Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {challenge.name} · Day {cycleDaysElapsed}/84
            </Text>
          </View>
          <StatusBadge
            label={
              activeWeekNumber !== null
                ? `Week ${activeWeekNumber} Active`
                : todayStr < challenge.startDate
                  ? "Upcoming"
                  : "Completed"
            }
            tone="info"
          />
        </View>

        <View style={styles.overallRow}>
          <Card style={styles.overallCard}>
            <Text style={styles.overallCategory}>TASKS OVERALL</Text>
            <Text style={styles.overallPct}>
              {overallStats.tasks.percentage}%
            </Text>
            <Text style={styles.overallRatio}>
              {overallStats.tasks.completed}/{overallStats.tasks.total}{" "}
              completed
            </Text>
            <ProgressBar
              percentage={overallStats.tasks.percentage}
              accentColor={colors.primary}
              height={6}
            />
            <View style={styles.overallFooter}>
              <StatusBadge
                label={
                  overallStats.tasks.total === 0
                    ? `${TARGET_PERCENTAGE}% Goal`
                    : overallStats.tasks.targetMet
                      ? "85%+ Hit"
                      : "Below 85%"
                }
                tone={
                  overallStats.tasks.total === 0
                    ? "neutral"
                    : overallStats.tasks.targetMet
                      ? "success"
                      : "warning"
                }
              />
              <Text style={styles.overallWeeksText}>
                {overallStats.taskTargetWeeksCount}/
                {overallStats.evaluatedWeeksCount} wks
              </Text>
            </View>
          </Card>

          <Card style={styles.overallCard}>
            <Text style={styles.overallCategory}>HABITS OVERALL</Text>
            <Text style={styles.overallPct}>
              {overallStats.habits.percentage}%
            </Text>
            <Text style={styles.overallRatio}>
              {overallStats.habits.completed}/{overallStats.habits.total}{" "}
              check-ins
            </Text>
            <ProgressBar
              percentage={overallStats.habits.percentage}
              accentColor={colors.accentSecondary}
              height={6}
            />
            <View style={styles.overallFooter}>
              <StatusBadge
                label={
                  overallStats.habits.total === 0
                    ? `${TARGET_PERCENTAGE}% Goal`
                    : overallStats.habits.targetMet
                      ? "85%+ Hit"
                      : "Below 85%"
                }
                tone={
                  overallStats.habits.total === 0
                    ? "neutral"
                    : overallStats.habits.targetMet
                      ? "success"
                      : "warning"
                }
              />
              <Text style={styles.overallWeeksText}>
                {overallStats.habitTargetWeeksCount}/
                {overallStats.evaluatedWeeksCount} wks
              </Text>
            </View>
          </Card>
        </View>

        <WeeklyPerformanceChart weeklySummaries={weeklySummaries} />

        <GoalPillarsCard />

        <WeeklyReviewCard />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>12-Week Scorecard</Text>
          <Text style={styles.sectionHint}>Target: {TARGET_PERCENTAGE}%+</Text>
        </View>

        <View style={styles.weeksList}>
          {weeklySummaries.map((week) => {
            const isCurrent = week.status === "current";
            const isUpcoming = week.status === "upcoming";
            const taskBadge = getCategoryBadge(week, "tasks");
            const habitBadge = getCategoryBadge(week, "habits");

            return (
              <Card
                key={week.weekNumber}
                highlighted={isCurrent}
                style={[styles.weekCard, isUpcoming && styles.weekCardUpcoming]}
              >
                <View style={styles.weekCardTop}>
                  <View style={styles.weekTitleGroup}>
                    <Text style={styles.weekHeading}>
                      Week {week.weekNumber}
                    </Text>
                    <Text style={styles.weekRange}>
                      {formatShortDate(week.startDate)} -{" "}
                      {formatShortDate(week.endDate)}
                    </Text>
                  </View>

                  <StatusBadge
                    label={
                      isCurrent
                        ? "In Progress"
                        : isUpcoming
                          ? "Not Started"
                          : "Completed"
                    }
                    tone={
                      isCurrent ? "info" : isUpcoming ? "neutral" : "success"
                    }
                  />
                </View>

                <View style={styles.scoreBlock}>
                  <View style={styles.scoreLine}>
                    <Text style={styles.categoryLabel}>Tasks</Text>
                    <View style={styles.scoreRight}>
                      <Text style={styles.scoreNumbers}>
                        {isUpcoming
                          ? "0/0"
                          : `${week.tasks.completed}/${week.tasks.total} (${week.tasks.percentage}%)`}
                      </Text>
                      <StatusBadge
                        label={taskBadge.label}
                        tone={taskBadge.tone}
                      />
                    </View>
                  </View>
                  <ProgressBar
                    percentage={isUpcoming ? 0 : week.tasks.percentage}
                    accentColor={
                      week.tasks.targetMet ? colors.success : colors.primary
                    }
                    height={5}
                  />
                </View>

                <View style={styles.scoreBlock}>
                  <View style={styles.scoreLine}>
                    <Text style={styles.categoryLabel}>Habits</Text>
                    <View style={styles.scoreRight}>
                      <Text style={styles.scoreNumbers}>
                        {isUpcoming
                          ? "0/0"
                          : `${week.habits.completed}/${week.habits.total} (${week.habits.percentage}%)`}
                      </Text>
                      <StatusBadge
                        label={habitBadge.label}
                        tone={habitBadge.tone}
                      />
                    </View>
                  </View>
                  <ProgressBar
                    percentage={isUpcoming ? 0 : week.habits.percentage}
                    accentColor={
                      week.habits.targetMet
                        ? colors.success
                        : colors.accentSecondary
                    }
                    height={5}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitleGroup: {
    flex: 1,
  },
  screenTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overallRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  overallCard: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  overallCategory: {
    ...typography.micro,
    color: colors.textMuted,
  },
  overallPct: {
    ...typography.title,
    color: colors.textPrimary,
  },
  overallRatio: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  overallFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    gap: 4,
  },
  overallWeeksText: {
    ...typography.micro,
    color: colors.textMuted,
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
    color: colors.warning,
  },
  weeksList: {
    gap: spacing.md,
  },
  weekCard: {
    gap: spacing.md,
  },
  weekCardUpcoming: {
    opacity: 0.65,
  },
  weekCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekTitleGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  weekHeading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  weekRange: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scoreBlock: {
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  scoreLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  scoreRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  scoreNumbers: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

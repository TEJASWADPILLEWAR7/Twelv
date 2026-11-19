import React, { useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { WeeklySummary } from "../types";
import { TARGET_PERCENTAGE } from "../utils/scoring";
import { Card } from "./Card";

type ChartMode = "both" | "tasks" | "habits";

interface WeeklyPerformanceChartProps {
  weeklySummaries: WeeklySummary[];
}

export function WeeklyPerformanceChart({
  weeklySummaries,
}: WeeklyPerformanceChartProps) {
  const [mode, setMode] = useState<ChartMode>("both");
  const [containerWidth, setContainerWidth] = useState<number>(320);

  function handleLayout(event: LayoutChangeEvent) {
    const measured = event.nativeEvent.layout.width;
    if (measured > 0 && Math.abs(measured - containerWidth) > 2) {
      setContainerWidth(measured);
    }
  }

  const chartHeight = 194;
  const paddingTop = 18;
  const paddingBottom = 26;
  const paddingLeft = 32;
  const paddingRight = 10;
  const plotWidth = Math.max(200, containerWidth - paddingLeft - paddingRight);
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const slotWidth = plotWidth / 12;

  function valueToY(pct: number): number {
    const clamped = Math.max(0, Math.min(100, pct));
    return paddingTop + plotHeight * (1 - clamped / 100);
  }

  const y100 = valueToY(100);
  const y85 = valueToY(TARGET_PERCENTAGE);
  const y50 = valueToY(50);
  const y0 = valueToY(0);

  const activeTrendPoints: Array<{ x: number; y: number; value: number }> = [];
  if (mode !== "both") {
    weeklySummaries.forEach((week, index) => {
      if (week.status === "upcoming") {
        return;
      }
      const score = mode === "tasks" ? week.tasks : week.habits;
      if (score.total === 0) {
        return;
      }
      const centerX = paddingLeft + index * slotWidth + slotWidth / 2;
      activeTrendPoints.push({
        x: centerX,
        y: valueToY(score.percentage),
        value: score.percentage,
      });
    });
  }

  const polylinePoints = activeTrendPoints
    .map((pt) => `${pt.x},${pt.y}`)
    .join(" ");
  const singleColor =
    mode === "habits" ? colors.accentSecondary : colors.primary;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>12-Week Trend</Text>
        <View style={styles.toggleGroup}>
          <Pressable
            onPress={() => setMode("both")}
            style={[
              styles.toggleBtn,
              mode === "both" && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "both" && styles.toggleTextActive,
              ]}
            >
              Both
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("tasks")}
            style={[
              styles.toggleBtn,
              mode === "tasks" && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "tasks" && styles.toggleTextActive,
              ]}
            >
              Tasks
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("habits")}
            style={[
              styles.toggleBtn,
              mode === "habits" && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "habits" && styles.toggleTextActive,
              ]}
            >
              Habits
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.legendRow}>
        {mode !== "habits" ? (
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.primary }]}
            />
            <Text style={styles.legendLabel}>Tasks %</Text>
          </View>
        ) : null}
        {mode !== "tasks" ? (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.accentSecondary },
              ]}
            />
            <Text style={styles.legendLabel}>Habits %</Text>
          </View>
        ) : null}
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDash, { backgroundColor: colors.warning }]}
          />
          <Text style={styles.legendLabel}>85% Target</Text>
        </View>
      </View>

      <View onLayout={handleLayout} style={styles.svgWrapper}>
        <Svg width={containerWidth} height={chartHeight}>
          <Line
            x1={paddingLeft}
            y1={y100}
            x2={paddingLeft + plotWidth}
            y2={y100}
            stroke={colors.borderSubtle}
            strokeWidth={1}
          />
          <Line
            x1={paddingLeft}
            y1={y50}
            x2={paddingLeft + plotWidth}
            y2={y50}
            stroke={colors.borderSubtle}
            strokeWidth={1}
          />
          <Line
            x1={paddingLeft}
            y1={y0}
            x2={paddingLeft + plotWidth}
            y2={y0}
            stroke={colors.border}
            strokeWidth={1}
          />

          <Line
            x1={paddingLeft}
            y1={y85}
            x2={paddingLeft + plotWidth}
            y2={y85}
            stroke={colors.warning}
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />

          <SvgText
            x={paddingLeft - 6}
            y={y100 + 4}
            fontSize="10"
            fill={colors.textMuted}
            textAnchor="end"
          >
            100
          </SvgText>
          <SvgText
            x={paddingLeft - 6}
            y={y85 + 3}
            fontSize="10"
            fontWeight="700"
            fill={colors.warning}
            textAnchor="end"
          >
            85%
          </SvgText>
          <SvgText
            x={paddingLeft - 6}
            y={y50 + 4}
            fontSize="10"
            fill={colors.textMuted}
            textAnchor="end"
          >
            50
          </SvgText>
          <SvgText
            x={paddingLeft - 6}
            y={y0 + 3}
            fontSize="10"
            fill={colors.textMuted}
            textAnchor="end"
          >
            0
          </SvgText>

          {weeklySummaries.map((week, index) => {
            const slotX = paddingLeft + index * slotWidth;
            const centerX = slotX + slotWidth / 2;
            const isUpcoming = week.status === "upcoming";

            if (mode === "both") {
              const barWidth = Math.max(4, Math.min(8, (slotWidth - 6) / 2));
              const taskPct = isUpcoming ? 0 : week.tasks.percentage;
              const habitPct = isUpcoming ? 0 : week.habits.percentage;
              const taskHeight =
                isUpcoming || week.tasks.total === 0
                  ? 3
                  : Math.max(3, (taskPct / 100) * plotHeight);
              const habitHeight =
                isUpcoming || week.habits.total === 0
                  ? 3
                  : Math.max(3, (habitPct / 100) * plotHeight);

              return (
                <G key={week.weekNumber}>
                  <Rect
                    x={centerX - barWidth - 1}
                    y={y0 - taskHeight}
                    width={barWidth}
                    height={taskHeight}
                    rx={2}
                    fill={
                      isUpcoming || week.tasks.total === 0
                        ? colors.border
                        : colors.primary
                    }
                  />
                  <Rect
                    x={centerX + 1}
                    y={y0 - habitHeight}
                    width={barWidth}
                    height={habitHeight}
                    rx={2}
                    fill={
                      isUpcoming || week.habits.total === 0
                        ? colors.border
                        : colors.accentSecondary
                    }
                  />
                  <SvgText
                    x={centerX}
                    y={chartHeight - 6}
                    fontSize="10"
                    fontWeight={week.status === "current" ? "700" : "500"}
                    fill={
                      week.status === "current"
                        ? colors.primary
                        : colors.textMuted
                    }
                    textAnchor="middle"
                  >
                    {`W${week.weekNumber}`}
                  </SvgText>
                </G>
              );
            }

            const score = mode === "tasks" ? week.tasks : week.habits;
            const barWidth = Math.max(8, Math.min(16, slotWidth - 8));
            const barHeight =
              isUpcoming || score.total === 0
                ? 3
                : Math.max(3, (score.percentage / 100) * plotHeight);

            return (
              <G key={week.weekNumber}>
                <Rect
                  x={centerX - barWidth / 2}
                  y={y0 - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  fill={
                    isUpcoming || score.total === 0
                      ? colors.border
                      : singleColor
                  }
                  opacity={0.35}
                />
                <SvgText
                  x={centerX}
                  y={chartHeight - 6}
                  fontSize="10"
                  fontWeight={week.status === "current" ? "700" : "500"}
                  fill={
                    week.status === "current" ? singleColor : colors.textMuted
                  }
                  textAnchor="middle"
                >
                  {`W${week.weekNumber}`}
                </SvgText>
              </G>
            );
          })}

          {mode !== "both" && activeTrendPoints.length > 1 ? (
            <Polyline
              fill="none"
              stroke={singleColor}
              strokeWidth={2.5}
              points={polylinePoints}
            />
          ) : null}

          {mode !== "both"
            ? activeTrendPoints.map((pt, idx) => (
                <Circle
                  key={`pt-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={4}
                  fill={
                    pt.value >= TARGET_PERCENTAGE ? colors.success : singleColor
                  }
                  stroke={colors.surface}
                  strokeWidth={1.5}
                />
              ))
            : null}
        </Svg>
      </View>
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
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  toggleGroup: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.surface,
  },
  toggleText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  legendDash: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  legendLabel: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  svgWrapper: {
    width: "100%",
    alignItems: "center",
  },
});

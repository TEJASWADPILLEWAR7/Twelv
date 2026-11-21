import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString } from "../types";
import { formatDateWithWeekday } from "../utils/date";

interface CycleStartCalendarPickerProps {
  value: DateString;
  onChange: (next: DateString) => void;
  todayStr?: DateString;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

function toYmd(year: number, month: number, day: number): DateString {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return (year + "-" + m + "-" + d) as DateString;
}

export function CycleStartCalendarPicker({
  value,
  onChange,
  todayStr,
}: CycleStartCalendarPickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(() => {
    return parseYmd(value)?.year ?? new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parseYmd(value)?.month ?? new Date().getMonth();
  });

  useEffect(() => {
    const parsed = parseYmd(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ key: string; day: number | null; ymd: DateString | null }> = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ key: "lead-" + i, day: null, ymd: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = toYmd(viewYear, viewMonth, d);
      cells.push({ key: "day-" + d, day: d, ymd });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: "trail-" + cells.length, day: null, ymd: null });
    }
    return cells;
  }, [viewYear, viewMonth]);

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const parsedValue = parseYmd(value);
  const displayLabel = parsedValue ? formatDateWithWeekday(value) : value;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setCalendarOpen((prev) => !prev)}
        style={[
          styles.selectorButton,
          calendarOpen && styles.selectorButtonActive,
        ]}
      >
        <View style={styles.selectorLeft}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.selectorText}>{displayLabel}</Text>
        </View>
        <View style={styles.selectorRight}>
          <Text style={styles.isoText}>{value}</Text>
          <Ionicons
            name={calendarOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>

      {calendarOpen ? (
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={8}
              style={styles.monthNavBtn}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </Pressable>

            <Text style={styles.monthTitle}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>

            <Pressable
              onPress={handleNextMonth}
              hitSlop={8}
              style={styles.monthNavBtn}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((wd) => (
              <Text key={wd} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarCells.map((cell) => {
              if (!cell.day || !cell.ymd) {
                return <View key={cell.key} style={styles.dayCell} />;
              }
              const ymd = cell.ymd;
              const isSelected = ymd === value;
              const isToday = Boolean(todayStr && ymd === todayStr);

              return (
                <Pressable
                  key={cell.key}
                  onPress={() => {
                    onChange(ymd);
                    setCalendarOpen(false);
                  }}
                  style={[
                    styles.dayCell,
                    isToday && !isSelected && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      isToday && !isSelected && styles.dayCellTextToday,
                      isSelected && styles.dayCellTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  selectorButtonActive: {
    borderColor: colors.primaryBorder,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectorRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectorText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  isoText: {
    ...typography.micro,
    color: colors.textMuted,
  },
  calendarCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    ...typography.bodyMedium,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayText: {
    width: "14.285%",
    textAlign: "center",
    ...typography.micro,
    color: colors.textMuted,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.285%",
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dayCellTextToday: {
    color: colors.primary,
  },
  dayCellTextSelected: {
    color: colors.background,
    fontWeight: "700",
  },
});

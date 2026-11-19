import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString } from "../types";
import {
  addDays,
  formatLocalDate,
  formatMonthYear,
  getDaysInMonth,
  getFirstDayOfMonthWeekday,
  getTodayDateString,
} from "../utils/date";
import { PrimaryButton } from "./PrimaryButton";

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

interface DatePickerModalProps {
  visible: boolean;
  title: string;
  selectedDate: DateString;
  minDate?: DateString;
  maxDate?: DateString;
  onSelect: (dateStr: DateString) => void;
  onClose: () => void;
}

export function DatePickerModal({
  visible,
  title,
  selectedDate,
  minDate,
  maxDate,
  onSelect,
  onClose,
}: DatePickerModalProps) {
  const [viewYear, setViewYear] = useState<number>(() =>
    Number(selectedDate.slice(0, 4)),
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    Number(selectedDate.slice(5, 7)),
  );

  useEffect(() => {
    if (visible && selectedDate) {
      setViewYear(Number(selectedDate.slice(0, 4)));
      setViewMonth(Number(selectedDate.slice(5, 7)));
    }
  }, [visible, selectedDate]);

  const todayStr = getTodayDateString();
  const tomorrowStr = addDays(todayStr, 1);

  const calendarCells = useMemo(() => {
    const firstWeekday = getFirstDayOfMonthWeekday(viewYear, viewMonth);
    const totalDays = getDaysInMonth(viewYear, viewMonth);
    const cells: Array<DateString | null> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(formatLocalDate(viewYear, viewMonth, day));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [viewYear, viewMonth]);

  function handlePrevMonth() {
    if (viewMonth === 1) {
      setViewYear((prev) => prev - 1);
      setViewMonth(12);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 12) {
      setViewYear((prev) => prev + 1);
      setViewMonth(1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  }

  function isDisabled(dateStr: DateString): boolean {
    if (minDate && dateStr < minDate) {
      return true;
    }
    if (maxDate && dateStr > maxDate) {
      return true;
    }
    return false;
  }

  const todayAllowed = !isDisabled(todayStr);
  const tomorrowAllowed = !isDisabled(tomorrowStr);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {todayAllowed || tomorrowAllowed ? (
            <View style={styles.quickRow}>
              {todayAllowed ? (
                <Pressable
                  style={[
                    styles.quickChip,
                    selectedDate === todayStr && styles.quickChipActive,
                  ]}
                  onPress={() => {
                    onSelect(todayStr);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      selectedDate === todayStr && styles.quickChipTextActive,
                    ]}
                  >
                    Today
                  </Text>
                </Pressable>
              ) : null}
              {tomorrowAllowed ? (
                <Pressable
                  style={[
                    styles.quickChip,
                    selectedDate === tomorrowStr && styles.quickChipActive,
                  ]}
                  onPress={() => {
                    onSelect(tomorrowStr);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      selectedDate === tomorrowStr &&
                        styles.quickChipTextActive,
                    ]}
                  >
                    Tomorrow
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.monthBar}>
            <Pressable
              style={styles.monthArrow}
              onPress={handlePrevMonth}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
            <Text style={styles.monthLabel}>
              {formatMonthYear(viewYear, viewMonth)}
            </Text>
            <Pressable
              style={styles.monthArrow}
              onPress={handleNextMonth}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          <View style={styles.weekHeaderRow}>
            {WEEKDAY_HEADERS.map((label, idx) => (
              <View key={`${label}-${idx}`} style={styles.dayCell}>
                <Text style={styles.weekHeaderText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarCells.map((cellDate, idx) => {
              if (!cellDate) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }
              const disabled = isDisabled(cellDate);
              const selected = cellDate === selectedDate;
              const isToday = cellDate === todayStr;
              const dayNumber = Number(cellDate.slice(8, 10));

              return (
                <Pressable
                  key={cellDate}
                  disabled={disabled}
                  onPress={() => {
                    onSelect(cellDate);
                    onClose();
                  }}
                  style={[
                    styles.dayCell,
                    selected && styles.dayCellSelected,
                    !selected && isToday && styles.dayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayTextDisabled,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {dayNumber}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton label="Close" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  quickChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  quickChipTextActive: {
    color: colors.primary,
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  weekHeaderRow: {
    flexDirection: "row",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  weekHeaderText: {
    ...typography.micro,
    color: colors.textMuted,
  },
  dayText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  dayTextDisabled: {
    color: colors.textMuted,
    opacity: 0.35,
  },
  dayTextSelected: {
    color: colors.background,
    fontWeight: "700",
  },
});

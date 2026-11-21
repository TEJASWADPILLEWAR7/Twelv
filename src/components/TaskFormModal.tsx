import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString, Task } from "../types";
import { formatDateWithWeekday } from "../utils/date";

interface TaskFormModalProps {
  visible: boolean;
  editingTask: Task | null;
  challengeStartDate: DateString;
  challengeEndDate: DateString;
  todayStr: DateString;
  onSave: (
    title: string,
    description: string,
    scheduledDate: DateString,
  ) => Promise<void>;
  onClose: () => void;
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

function parseYmd(ymd: DateString): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
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

function addDaysSimple(ymd: DateString, days: number): DateString {
  const parsed = parseYmd(ymd);
  if (!parsed) {
    return ymd;
  }
  const d = new Date(parsed.year, parsed.month, parsed.day);
  d.setDate(d.getDate() + days);
  return toYmd(d.getFullYear(), d.getMonth(), d.getDate());
}

export function TaskFormModal({
  visible,
  editingTask,
  challengeStartDate,
  challengeEndDate,
  todayStr,
  onSave,
  onClose,
}: TaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState<DateString>(todayStr);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(() => {
    return parseYmd(todayStr)?.year ?? new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parseYmd(todayStr)?.month ?? new Date().getMonth();
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultValidDate =
    todayStr < challengeStartDate
      ? challengeStartDate
      : todayStr > challengeEndDate
        ? challengeEndDate
        : todayStr;

  useEffect(() => {
    if (!visible) {
      return;
    }
    const initialDate = editingTask ? editingTask.scheduledDate : defaultValidDate;
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? "");
    } else {
      setTitle("");
      setDescription("");
    }
    setScheduledDate(initialDate);
    const parsed = parseYmd(initialDate);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    setCalendarOpen(false);
    setError(null);
    setSaving(false);
  }, [visible, editingTask, defaultValidDate]);

  const tomorrowStr = addDaysSimple(todayStr, 1);

  const minParsed = useMemo(() => parseYmd(challengeStartDate), [challengeStartDate]);
  const maxParsed = useMemo(() => parseYmd(challengeEndDate), [challengeEndDate]);

  const canGoPrevMonth = minParsed
    ? viewYear > minParsed.year || (viewYear === minParsed.year && viewMonth > minParsed.month)
    : true;

  const canGoNextMonth = maxParsed
    ? viewYear < maxParsed.year || (viewYear === maxParsed.year && viewMonth < maxParsed.month)
    : true;

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

  function selectDate(ymd: DateString) {
    setScheduledDate(ymd);
    const parsed = parseYmd(ymd);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    if (error) {
      setError(null);
    }
  }

  function handlePrevMonth() {
    if (!canGoPrevMonth) {
      return;
    }
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (!canGoNextMonth) {
      return;
    }
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function toggleCalendar() {
    if (!calendarOpen) {
      const parsed = parseYmd(scheduledDate);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      }
    }
    setCalendarOpen((prev) => !prev);
  }

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Task title is required.");
      return;
    }
    if (
      scheduledDate < challengeStartDate ||
      scheduledDate > challengeEndDate
    ) {
      setError(
        "Date must be between " + challengeStartDate + " and " + challengeEndDate + ".",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed, description.trim(), scheduledDate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>

            <Text style={styles.modalTitle}>
              {editingTask ? "Edit Task" : "New Task"}
            </Text>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.savePill, saving && styles.savePillDisabled]}
            >
              <Text style={styles.savePillText}>
                {saving ? "Saving" : "Save"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formBody}
          >
            <Text style={styles.label}>TASK TITLE</Text>
            <TextInput
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="e.g. Morning workout, Read 20 pages, Plan weekly budget"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={100}
              autoFocus
            />

            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add helpful context or a quick checklist..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
            />

            <Text style={styles.label}>SCHEDULED DATE</Text>
            <View style={styles.quickDateRow}>
              {todayStr >= challengeStartDate &&
              todayStr <= challengeEndDate ? (
                <Pressable
                  onPress={() => {
                    selectDate(todayStr);
                    setCalendarOpen(false);
                  }}
                  style={[
                    styles.quickChip,
                    scheduledDate === todayStr && styles.quickChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      scheduledDate === todayStr && styles.quickChipTextActive,
                    ]}
                  >
                    Today
                  </Text>
                </Pressable>
              ) : null}

              {tomorrowStr >= challengeStartDate &&
              tomorrowStr <= challengeEndDate ? (
                <Pressable
                  onPress={() => {
                    selectDate(tomorrowStr);
                    setCalendarOpen(false);
                  }}
                  style={[
                    styles.quickChip,
                    scheduledDate === tomorrowStr && styles.quickChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      scheduledDate === tomorrowStr &&
                        styles.quickChipTextActive,
                    ]}
                  >
                    Tomorrow
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={toggleCalendar}
              style={[
                styles.dateSelectorButton,
                calendarOpen && styles.dateSelectorButtonActive,
              ]}
            >
              <View style={styles.dateSelectorLeft}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.dateSelectorText}>
                  {formatDateWithWeekday(scheduledDate)}
                </Text>
              </View>
              <Ionicons
                name={calendarOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>

            {calendarOpen ? (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    onPress={handlePrevMonth}
                    disabled={!canGoPrevMonth}
                    hitSlop={8}
                    style={[
                      styles.monthNavBtn,
                      !canGoPrevMonth && styles.monthNavBtnDisabled,
                    ]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={colors.textPrimary}
                    />
                  </Pressable>

                  <Text style={styles.monthTitle}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </Text>

                  <Pressable
                    onPress={handleNextMonth}
                    disabled={!canGoNextMonth}
                    hitSlop={8}
                    style={[
                      styles.monthNavBtn,
                      !canGoNextMonth && styles.monthNavBtnDisabled,
                    ]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textPrimary}
                    />
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
                    const isDisabled =
                      ymd < challengeStartDate || ymd > challengeEndDate;
                    const isSelected = ymd === scheduledDate;
                    const isToday = ymd === todayStr;

                    return (
                      <Pressable
                        key={cell.key}
                        disabled={isDisabled}
                        onPress={() => {
                          selectDate(ymd);
                          setCalendarOpen(false);
                        }}
                        style={[
                          styles.dayCell,
                          isToday && !isSelected && styles.dayCellToday,
                          isSelected && styles.dayCellSelected,
                          isDisabled && styles.dayCellDisabled,
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 9, 17, 0.78)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: "90%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  savePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  savePillDisabled: {
    opacity: 0.6,
  },
  savePillText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.background,
  },
  formBody: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  label: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.textPrimary,
    ...typography.body,
  },
  multilineInput: {
    minHeight: 74,
  },
  quickDateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quickChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  quickChipText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  quickChipTextActive: {
    color: colors.primary,
  },
  dateSelectorButton: {
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
  dateSelectorButtonActive: {
    borderColor: colors.primaryBorder,
  },
  dateSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateSelectorText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
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
  monthNavBtnDisabled: {
    opacity: 0.3,
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
  dayCellDisabled: {
    opacity: 0.25,
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
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});

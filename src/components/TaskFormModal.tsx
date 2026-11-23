import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { formatTime12h, from24Hour, to24Hour } from "../utils/time";

type ScrollViewRef = React.ComponentRef<typeof ScrollView>;

interface TaskFormModalProps {
  visible: boolean;
  editingTask: Task | null;
  existingTasks?: Task[];
  challengeStartDate: DateString;
  challengeEndDate: DateString;
  todayStr: DateString;
  onSave: (
    title: string,
    description: string,
    scheduledDate: DateString,
    scheduledTime: string | null,
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
const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_STEP = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const PERIODS: Array<"AM" | "PM"> = ["AM", "PM"];
const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * 3;

const QUICK_TIME_SLOTS: Array<{ label: string; value: string }> = [
  { label: "7:00 AM", value: "07:00" },
  { label: "8:30 AM", value: "08:30" },
  { label: "9:00 AM", value: "09:00" },
  { label: "10:30 AM", value: "10:30" },
  { label: "12:00 PM", value: "12:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "6:00 PM", value: "18:00" },
  { label: "8:00 PM", value: "20:00" },
  { label: "9:30 PM", value: "21:30" },
];

function parseYmd(
  ymd: DateString,
): { year: number; month: number; day: number } | null {
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

function nearestMinuteIndex(minute: number): number {
  const snapped = Math.round(minute / 5) * 5;
  const normalized = snapped >= 60 ? 55 : snapped;
  const idx = MINUTES_STEP.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

export function TaskFormModal({
  visible,
  editingTask,
  existingTasks,
  challengeStartDate,
  challengeEndDate,
  todayStr,
  onSave,
  onClose,
}: TaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState<DateString>(todayStr);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(() => {
    return parseYmd(todayStr)?.year ?? new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parseYmd(todayStr)?.month ?? new Date().getMonth();
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hourWheelRef = useRef<ScrollViewRef | null>(null);
  const minuteWheelRef = useRef<ScrollViewRef | null>(null);
  const periodWheelRef = useRef<ScrollViewRef | null>(null);

  const defaultValidDate =
    todayStr < challengeStartDate
      ? challengeStartDate
      : todayStr > challengeEndDate
        ? challengeEndDate
        : todayStr;

  const syncWheelsToTime = useCallback(
    (time24: string | null, animated: boolean) => {
      const parts = from24Hour(time24);
      const hIdx = Math.max(0, HOURS_12.indexOf(parts.hour12));
      const mIdx = nearestMinuteIndex(parts.minute);
      const pIdx = parts.period === "PM" ? 1 : 0;

      hourWheelRef.current?.scrollTo({
        y: hIdx * WHEEL_ITEM_HEIGHT,
        animated,
      });
      minuteWheelRef.current?.scrollTo({
        y: mIdx * WHEEL_ITEM_HEIGHT,
        animated,
      });
      periodWheelRef.current?.scrollTo({
        y: pIdx * WHEEL_ITEM_HEIGHT,
        animated,
      });
    },
    [],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    const initialDate = editingTask ? editingTask.scheduledDate : defaultValidDate;
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? "");
      setScheduledTime(editingTask.scheduledTime ?? null);
    } else {
      setTitle("");
      setDescription("");
      setScheduledTime(null);
    }
    setScheduledDate(initialDate);
    const parsed = parseYmd(initialDate);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    setCalendarOpen(false);
    setTimePickerOpen(false);
    setError(null);
    setSaving(false);
  }, [visible, editingTask, defaultValidDate]);

  useEffect(() => {
    if (!timePickerOpen) {
      return;
    }
    const timer = setTimeout(() => {
      syncWheelsToTime(scheduledTime ?? "09:00", false);
    }, 25);
    return () => clearTimeout(timer);
  }, [timePickerOpen]);

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

  const activeTimeParts = useMemo(() => from24Hour(scheduledTime), [scheduledTime]);
  const formattedSelectedTime = useMemo(
    () => formatTime12h(scheduledTime),
    [scheduledTime],
  );

  const conflictingTasks = useMemo(() => {
    if (!scheduledTime || !existingTasks || existingTasks.length === 0) {
      return [];
    }
    return existingTasks.filter(
      (t) =>
        !t.completed &&
        t.scheduledDate === scheduledDate &&
        t.scheduledTime === scheduledTime &&
        (!editingTask || t.id !== editingTask.id),
    );
  }, [scheduledTime, scheduledDate, existingTasks, editingTask]);

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
      setTimePickerOpen(false);
    }
    setCalendarOpen((prev) => !prev);
  }

  function toggleTimePicker() {
    if (!timePickerOpen) {
      if (!scheduledTime) {
        setScheduledTime("09:00");
      }
      setCalendarOpen(false);
    }
    setTimePickerOpen((prev) => !prev);
  }

  function applyExactTime(nextTime24: string, animated = true) {
    setScheduledTime(nextTime24);
    syncWheelsToTime(nextTime24, animated);
  }

  function handleHourWheelSettle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(HOURS_12.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT)));
    const pickedHour = HOURS_12[idx];
    setScheduledTime(to24Hour(pickedHour, activeTimeParts.minute, activeTimeParts.period));
  }

  function handleMinuteWheelSettle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(MINUTES_STEP.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT)));
    const pickedMinute = MINUTES_STEP[idx];
    setScheduledTime(to24Hour(activeTimeParts.hour12, pickedMinute, activeTimeParts.period));
  }

  function handlePeriodWheelSettle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(PERIODS.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT)));
    const pickedPeriod = PERIODS[idx];
    setScheduledTime(to24Hour(activeTimeParts.hour12, activeTimeParts.minute, pickedPeriod));
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
      await onSave(trimmed, description.trim(), scheduledDate, scheduledTime);
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

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.label}>TIME ALLOCATION</Text>
              {scheduledTime ? (
                <Pressable
                  onPress={() => {
                    setScheduledTime(null);
                    setTimePickerOpen(false);
                  }}
                  hitSlop={8}
                  style={styles.anytimeResetPill}
                >
                  <Ionicons name="close" size={12} color={colors.textSecondary} />
                  <Text style={styles.anytimeResetText}>Anytime</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={toggleTimePicker}
              style={[
                styles.dateSelectorButton,
                timePickerOpen && styles.dateSelectorButtonActive,
              ]}
            >
              <View style={styles.dateSelectorLeft}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={formattedSelectedTime ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.dateSelectorText,
                    formattedSelectedTime
                      ? styles.activeTimeSelectorText
                      : styles.mutedSelectorText,
                  ]}
                >
                  {formattedSelectedTime ?? "Anytime (No specific time)"}
                </Text>
              </View>
              <View style={styles.selectorRightGroup}>
                <Text style={styles.selectorActionHint}>
                  {timePickerOpen ? "Done" : formattedSelectedTime ? "Edit" : "Set time"}
                </Text>
                <Ionicons
                  name={timePickerOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            {conflictingTasks.length > 0 && formattedSelectedTime ? (
              <View style={styles.conflictBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={15}
                  color={colors.primary}
                />
                <Text style={styles.conflictText} numberOfLines={2}>
                  {conflictingTasks.length === 1
                    ? "Same time as \"" + conflictingTasks[0].title + "\" (" + formattedSelectedTime + ")"
                    : "Same time as \"" + conflictingTasks[0].title + "\" +" + (conflictingTasks.length - 1) + " more"}
                </Text>
              </View>
            ) : null}

            {timePickerOpen ? (
              <View style={styles.timeWheelCard}>
                <View style={styles.digitalHeader}>
                  <Text style={styles.digitalReadout}>
                    {String(activeTimeParts.hour12).padStart(2, "0")}:
                    {String(activeTimeParts.minute).padStart(2, "0")}
                  </Text>
                  <View style={styles.periodSegment}>
                    {PERIODS.map((p) => {
                      const active = activeTimeParts.period === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() =>
                            applyExactTime(
                              to24Hour(
                                activeTimeParts.hour12,
                                activeTimeParts.minute,
                                p,
                              ),
                            )
                          }
                          style={[
                            styles.periodSegmentBtn,
                            active && styles.periodSegmentBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.periodSegmentText,
                              active && styles.periodSegmentTextActive,
                            ]}
                          >
                            {p}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickSlotsScroll}
                >
                  {QUICK_TIME_SLOTS.map((slot) => {
                    const active = scheduledTime === slot.value;
                    return (
                      <Pressable
                        key={slot.value}
                        onPress={() => applyExactTime(slot.value)}
                        style={[
                          styles.slotChip,
                          active && styles.slotChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotChipText,
                            active && styles.slotChipTextActive,
                          ]}
                        >
                          {slot.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.wheelLabelsRow}>
                  <Text style={styles.wheelColLabel}>HOUR</Text>
                  <Text style={styles.wheelColLabel}>MINUTE</Text>
                  <Text style={styles.wheelColLabel}>AM / PM</Text>
                </View>

                <View style={styles.wheelStage}>
                  <View pointerEvents="none" style={styles.wheelCenterBand} />

                  <ScrollView
                    ref={hourWheelRef}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={handleHourWheelSettle}
                    onScrollEndDrag={(e) => {
                      if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) {
                        handleHourWheelSettle(e);
                      }
                    }}
                    contentContainerStyle={styles.wheelColumnContent}
                    style={styles.wheelColumn}
                  >
                    {HOURS_12.map((h) => {
                      const active = activeTimeParts.hour12 === h;
                      return (
                        <Pressable
                          key={h}
                          onPress={() =>
                            applyExactTime(
                              to24Hour(h, activeTimeParts.minute, activeTimeParts.period),
                            )
                          }
                          style={styles.wheelItem}
                        >
                          <Text
                            style={[
                              styles.wheelItemText,
                              active && styles.wheelItemTextActive,
                            ]}
                          >
                            {String(h).padStart(2, "0")}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.wheelColon}>:</Text>

                  <ScrollView
                    ref={minuteWheelRef}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={handleMinuteWheelSettle}
                    onScrollEndDrag={(e) => {
                      if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) {
                        handleMinuteWheelSettle(e);
                      }
                    }}
                    contentContainerStyle={styles.wheelColumnContent}
                    style={styles.wheelColumn}
                  >
                    {MINUTES_STEP.map((m) => {
                      const active = activeTimeParts.minute === m;
                      return (
                        <Pressable
                          key={m}
                          onPress={() =>
                            applyExactTime(
                              to24Hour(activeTimeParts.hour12, m, activeTimeParts.period),
                            )
                          }
                          style={styles.wheelItem}
                        >
                          <Text
                            style={[
                              styles.wheelItemText,
                              active && styles.wheelItemTextActive,
                            ]}
                          >
                            {String(m).padStart(2, "0")}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <ScrollView
                    ref={periodWheelRef}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={handlePeriodWheelSettle}
                    onScrollEndDrag={(e) => {
                      if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) {
                        handlePeriodWheelSettle(e);
                      }
                    }}
                    contentContainerStyle={styles.wheelColumnContent}
                    style={styles.wheelColumn}
                  >
                    {PERIODS.map((p) => {
                      const active = activeTimeParts.period === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() =>
                            applyExactTime(
                              to24Hour(activeTimeParts.hour12, activeTimeParts.minute, p),
                            )
                          }
                          style={styles.wheelItem}
                        >
                          <Text
                            style={[
                              styles.wheelItemText,
                              active && styles.wheelItemTextActive,
                            ]}
                          >
                            {p}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
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
    maxHeight: "92%",
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  anytimeResetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  anytimeResetText: {
    ...typography.micro,
    color: colors.textSecondary,
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
    minHeight: 68,
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
  selectorRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectorActionHint: {
    ...typography.micro,
    color: colors.textMuted,
  },
  dateSelectorText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  activeTimeSelectorText: {
    color: colors.primary,
    fontWeight: "700",
  },
  mutedSelectorText: {
    color: colors.textSecondary,
  },
  conflictBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  conflictText: {
    flex: 1,
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
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
  timeWheelCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  digitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  digitalReadout: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  periodSegment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  periodSegmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  periodSegmentBtnActive: {
    backgroundColor: colors.primary,
  },
  periodSegmentText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  periodSegmentTextActive: {
    color: colors.background,
  },
  quickSlotsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  slotChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  slotChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  slotChipText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  slotChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  wheelLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 2,
  },
  wheelColLabel: {
    flex: 1,
    textAlign: "center",
    ...typography.micro,
    color: colors.textMuted,
  },
  wheelStage: {
    height: WHEEL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
    position: "relative",
  },
  wheelCenterBand: {
    position: "absolute",
    left: 8,
    right: 8,
    top: WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  wheelColumn: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  wheelColumnContent: {
    paddingVertical: WHEEL_ITEM_HEIGHT,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  wheelItemTextActive: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.primary,
  },
  wheelColon: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    paddingHorizontal: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});

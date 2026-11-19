import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Habit, Weekday } from "../types";
import { PrimaryButton } from "./PrimaryButton";
import { TextField } from "./TextField";

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const MON_FRI: Weekday[] = [1, 2, 3, 4, 5];
const MON_SAT: Weekday[] = [1, 2, 3, 4, 5, 6];
const WEEKENDS: Weekday[] = [0, 6];

const DAY_BUTTONS: Array<{ day: Weekday; shortLabel: string }> = [
  { day: 0, shortLabel: "Sun" },
  { day: 1, shortLabel: "Mon" },
  { day: 2, shortLabel: "Tue" },
  { day: 3, shortLabel: "Wed" },
  { day: 4, shortLabel: "Thu" },
  { day: 5, shortLabel: "Fri" },
  { day: 6, shortLabel: "Sat" },
];

interface HabitFormModalProps {
  visible: boolean;
  editingHabit: Habit | null;
  initialDays: Weekday[];
  onSave: (title: string, daysOfWeek: Weekday[]) => Promise<void>;
  onClose: () => void;
}

function sameDays(a: Weekday[], b: Weekday[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export function HabitFormModal({
  visible,
  editingHabit,
  initialDays,
  onSave,
  onClose,
}: HabitFormModalProps) {
  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<Weekday[]>(ALL_DAYS);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingHabit) {
        setTitle(editingHabit.title);
        setSelectedDays(initialDays.length > 0 ? initialDays : ALL_DAYS);
      } else {
        setTitle("");
        setSelectedDays(ALL_DAYS);
      }
      setTitleError(null);
      setDaysError(null);
      setSaving(false);
    }
  }, [visible, editingHabit, initialDays]);

  function toggleDay(day: Weekday) {
    setDaysError(null);
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Habit name is required.");
      return;
    }
    if (selectedDays.length === 0) {
      setDaysError("Select at least one day of the week.");
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed, selectedDays);
      onClose();
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editingHabit ? "Edit Habit" : "New Recurring Habit"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formBody}
          >
            <TextField
              label="Habit Name"
              placeholder="e.g. Study DSA for 90 mins"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (titleError) {
                  setTitleError(null);
                }
              }}
              errorText={titleError}
              maxLength={80}
              autoFocus={!editingHabit}
            />

            <View style={styles.scheduleSection}>
              <Text style={styles.sectionLabel}>Schedule</Text>

              <View style={styles.presetRow}>
                <Pressable
                  style={[
                    styles.presetChip,
                    sameDays(selectedDays, ALL_DAYS) && styles.presetChipActive,
                  ]}
                  onPress={() => {
                    setSelectedDays(ALL_DAYS);
                    setDaysError(null);
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      sameDays(selectedDays, ALL_DAYS) &&
                        styles.presetTextActive,
                    ]}
                  >
                    Every day
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.presetChip,
                    sameDays(selectedDays, MON_SAT) && styles.presetChipActive,
                  ]}
                  onPress={() => {
                    setSelectedDays(MON_SAT);
                    setDaysError(null);
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      sameDays(selectedDays, MON_SAT) &&
                        styles.presetTextActive,
                    ]}
                  >
                    Mon - Sat
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.presetChip,
                    sameDays(selectedDays, MON_FRI) && styles.presetChipActive,
                  ]}
                  onPress={() => {
                    setSelectedDays(MON_FRI);
                    setDaysError(null);
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      sameDays(selectedDays, MON_FRI) &&
                        styles.presetTextActive,
                    ]}
                  >
                    Mon - Fri
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.presetChip,
                    sameDays(selectedDays, WEEKENDS) && styles.presetChipActive,
                  ]}
                  onPress={() => {
                    setSelectedDays(WEEKENDS);
                    setDaysError(null);
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      sameDays(selectedDays, WEEKENDS) &&
                        styles.presetTextActive,
                    ]}
                  >
                    Weekends
                  </Text>
                </Pressable>
              </View>

              <View style={styles.daysGrid}>
                {DAY_BUTTONS.map(({ day, shortLabel }) => {
                  const active = selectedDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[
                        styles.dayButton,
                        active && styles.dayButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          active && styles.dayButtonTextActive,
                        ]}
                      >
                        {shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {daysError ? (
                <Text style={styles.errorText}>{daysError}</Text>
              ) : null}

              {editingHabit ? (
                <Text style={styles.scheduleNote}>
                  Schedule changes apply from today forward. Past week scores
                  remain preserved.
                </Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label="Cancel"
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <PrimaryButton
                label={
                  saving
                    ? "Saving..."
                    : editingHabit
                      ? "Save Changes"
                      : "Create Habit"
                }
                onPress={handleSubmit}
                disabled={saving}
                style={styles.actionBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  formBody: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  scheduleSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  presetText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.primary,
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: spacing.xs,
  },
  dayButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: colors.background,
    fontWeight: "700",
  },
  errorText: {
    ...typography.micro,
    color: colors.danger,
  },
  scheduleNote: {
    ...typography.micro,
    color: colors.textMuted,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});

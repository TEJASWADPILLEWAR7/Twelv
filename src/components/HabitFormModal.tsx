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
  TextInput,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Habit, Weekday } from "../types";
import { PrimaryButton } from "./PrimaryButton";

interface HabitFormModalProps {
  visible: boolean;
  editingHabit: Habit | null;
  initialDays: Weekday[];
  onSave: (title: string, daysOfWeek: Weekday[]) => Promise<void>;
  onClose: () => void;
}

const DAY_OPTIONS: Array<{ day: Weekday; short: string }> = [
  { day: 0, short: "Sun" },
  { day: 1, short: "Mon" },
  { day: 2, short: "Tue" },
  { day: 3, short: "Wed" },
  { day: 4, short: "Thu" },
  { day: 5, short: "Fri" },
  { day: 6, short: "Sat" },
];

export function HabitFormModal({
  visible,
  editingHabit,
  initialDays,
  onSave,
  onClose,
}: HabitFormModalProps) {
  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<Weekday[]>(initialDays);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(editingHabit ? editingHabit.title : "");
    setSelectedDays(
      initialDays.length > 0 ? initialDays : [0, 1, 2, 3, 4, 5, 6],
    );
    setErrorMessage(null);
    setSaving(false);
  }, [visible, editingHabit, initialDays]);

  function toggleDay(day: Weekday) {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  const canSave = title.trim().length > 0 && selectedDays.length > 0 && !saving;

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setErrorMessage("Enter a habit name.");
      return;
    }
    if (selectedDays.length === 0) {
      setErrorMessage("Select at least one day of the week.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await onSave(trimmed, selectedDays);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save habit.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.heading}>
              {editingHabit ? "Edit Habit" : "New Habit"}
            </Text>

            <View style={styles.headerActions}>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSave}
                style={[
                  styles.headerSavePill,
                  !canSave && styles.headerSavePillDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.headerSaveText,
                    !canSave && styles.headerSaveTextDisabled,
                  ]}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </Pressable>

              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Habit Name</Text>
              <TextInput
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                placeholder="e.g., 45 min deep work session"
                placeholderTextColor={colors.textMuted}
                autoFocus={!editingHabit}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.daysHeader}>
                <Text style={styles.label}>Repeat Days</Text>
                <View style={styles.presetRow}>
                  <Pressable
                    onPress={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                    style={styles.presetBtn}
                  >
                    <Text style={styles.presetText}>Every day</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedDays([1, 2, 3, 4, 5])}
                    style={styles.presetBtn}
                  >
                    <Text style={styles.presetText}>Weekdays</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.daysRow}>
                {DAY_OPTIONS.map((item) => {
                  const active = selectedDays.includes(item.day);
                  return (
                    <Pressable
                      key={item.day}
                      onPress={() => toggleDay(item.day)}
                      style={[styles.dayPill, active && styles.dayPillActive]}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          active && styles.dayPillTextActive,
                        ]}
                      >
                        {item.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <PrimaryButton
              label={
                saving
                  ? "Saving..."
                  : editingHabit
                    ? "Save Changes"
                    : "Create Habit"
              }
              onPress={handleSubmit}
              disabled={!canSave}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "88%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerSavePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  headerSavePillDisabled: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSaveText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.background,
  },
  headerSaveTextDisabled: {
    color: colors.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
  },
  daysHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  presetRow: {
    flexDirection: "row",
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  presetText: {
    ...typography.micro,
    color: colors.primary,
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  dayPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayPillText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  dayPillTextActive: {
    color: colors.background,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});

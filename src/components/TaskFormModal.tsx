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
import { DateString, Task } from "../types";
import {
  addDays,
  clampDate,
  formatDisplayDate,
  getWeekNumberForDate,
  isDateWithinRange,
} from "../utils/date";
import { DatePickerModal } from "./DatePickerModal";
import { PrimaryButton } from "./PrimaryButton";
import { TextField } from "./TextField";

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

export function TaskFormModal({
  visible,
  editingTask,
  challengeStartDate,
  challengeEndDate,
  todayStr,
  onSave,
  onClose,
}: TaskFormModalProps) {
  const defaultDate = clampDate(todayStr, challengeStartDate, challengeEndDate);
  const tomorrowStr = addDays(todayStr, 1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState<DateString>(defaultDate);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description ?? "");
        setScheduledDate(editingTask.scheduledDate);
      } else {
        setTitle("");
        setDescription("");
        setScheduledDate(
          clampDate(todayStr, challengeStartDate, challengeEndDate),
        );
      }
      setTitleError(null);
      setSaving(false);
    }
  }, [visible, editingTask, todayStr, challengeStartDate, challengeEndDate]);

  const weekNum = getWeekNumberForDate(challengeStartDate, scheduledDate);
  const canPickToday = isDateWithinRange(
    todayStr,
    challengeStartDate,
    challengeEndDate,
  );
  const canPickTomorrow = isDateWithinRange(
    tomorrowStr,
    challengeStartDate,
    challengeEndDate,
  );

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Task title is required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed, description, scheduledDate);
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
              {editingTask ? "Edit Task" : "New Task"}
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
              label="Task Title"
              placeholder="What needs to get done?"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (titleError) {
                  setTitleError(null);
                }
              }}
              errorText={titleError}
              maxLength={120}
              autoFocus={!editingTask}
            />

            <TextField
              label="Notes (Optional)"
              placeholder="Add details or context..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={300}
              style={styles.notesInput}
            />

            <View style={styles.dateGroup}>
              <View style={styles.dateLabelRow}>
                <Text style={styles.dateLabel}>Scheduled Date</Text>
                {weekNum !== null ? (
                  <Text style={styles.weekBadge}>Week {weekNum}</Text>
                ) : null}
              </View>

              <Pressable
                style={styles.dateField}
                onPress={() => setDatePickerOpen(true)}
              >
                <View style={styles.dateFieldLeft}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.dateValue}>
                    {formatDisplayDate(scheduledDate)}
                  </Text>
                </View>
                <Text style={styles.changeText}>Select</Text>
              </Pressable>

              {canPickToday || canPickTomorrow ? (
                <View style={styles.quickChips}>
                  {canPickToday ? (
                    <Pressable
                      style={[
                        styles.chip,
                        scheduledDate === todayStr && styles.chipActive,
                      ]}
                      onPress={() => setScheduledDate(todayStr)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          scheduledDate === todayStr && styles.chipTextActive,
                        ]}
                      >
                        Today
                      </Text>
                    </Pressable>
                  ) : null}
                  {canPickTomorrow ? (
                    <Pressable
                      style={[
                        styles.chip,
                        scheduledDate === tomorrowStr && styles.chipActive,
                      ]}
                      onPress={() => setScheduledDate(tomorrowStr)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          scheduledDate === tomorrowStr &&
                            styles.chipTextActive,
                        ]}
                      >
                        Tomorrow
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
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
                    : editingTask
                      ? "Save Changes"
                      : "Add Task"
                }
                onPress={handleSubmit}
                disabled={saving}
                style={styles.actionBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={datePickerOpen}
        title="Schedule Task Date"
        selectedDate={scheduledDate}
        minDate={challengeStartDate}
        maxDate={challengeEndDate}
        onSelect={setScheduledDate}
        onClose={() => setDatePickerOpen(false)}
      />
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
  notesInput: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  dateGroup: {
    gap: spacing.xs,
  },
  dateLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  weekBadge: {
    ...typography.micro,
    color: colors.primary,
  },
  dateField: {
    minHeight: 48,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  changeText: {
    ...typography.caption,
    color: colors.primary,
  },
  quickChips: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
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

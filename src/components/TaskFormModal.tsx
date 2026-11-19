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
import { DateString, Task } from "../types";
import {
  clampDate,
  formatDateWithWeekday,
  getWeekNumberForDate,
} from "../utils/date";
import { DatePickerModal } from "./DatePickerModal";
import { PrimaryButton } from "./PrimaryButton";

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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState<DateString>(defaultDate);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
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
    setErrorMessage(null);
    setSaving(false);
  }, [visible, editingTask, todayStr, challengeStartDate, challengeEndDate]);

  const weekNumber = getWeekNumberForDate(challengeStartDate, scheduledDate);
  const canSave = title.trim().length > 0 && !saving;

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Enter a task title.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await onSave(trimmedTitle, description.trim(), scheduledDate);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save task.",
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
              {editingTask ? "Edit Task" : "New Task"}
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
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                placeholder="What needs to get done?"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                autoFocus={!editingTask}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add details or context..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[styles.input, styles.notesInput]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.dateLabelRow}>
                <Text style={styles.label}>Scheduled Date</Text>
                {weekNumber !== null ? (
                  <Text style={styles.weekIndicator}>Week {weekNumber}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => setDatePickerVisible(true)}
                style={styles.dateSelector}
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
                <Text style={styles.selectText}>Select</Text>
              </Pressable>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <PrimaryButton
              label={
                saving
                  ? "Saving..."
                  : editingTask
                    ? "Save Changes"
                    : "Create Task"
              }
              onPress={handleSubmit}
              disabled={!canSave}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={datePickerVisible}
        title="Scheduled Date"
        selectedDate={scheduledDate}
        minDate={challengeStartDate}
        maxDate={challengeEndDate}
        onSelect={(date) => {
          setScheduledDate(date);
          setDatePickerVisible(false);
        }}
        onClose={() => setDatePickerVisible(false)}
      />
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
    gap: 6,
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
  notesInput: {
    minHeight: 76,
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekIndicator: {
    ...typography.micro,
    color: colors.primary,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
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
  selectText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.primary,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});

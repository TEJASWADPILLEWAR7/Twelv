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
import { useAppData } from "../context/AppDataContext";
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

function addDaysSimple(ymd: DateString, days: number): DateString {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    return ymd;
  }
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as DateString;
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
  const { goals, taskGoalMap, setTaskGoal, setLatestTaskGoal } = useAppData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState<DateString>(todayStr);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
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
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? "");
      setScheduledDate(editingTask.scheduledDate);
      setSelectedGoalId(taskGoalMap[editingTask.id] ?? null);
    } else {
      setTitle("");
      setDescription("");
      setScheduledDate(defaultValidDate);
      setSelectedGoalId(null);
    }
    setError(null);
    setSaving(false);
  }, [visible, editingTask, defaultValidDate, taskGoalMap]);

  const tomorrowStr = addDaysSimple(todayStr, 1);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Task title is required.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      setError("Use YYYY-MM-DD date format.");
      return;
    }
    if (
      scheduledDate < challengeStartDate ||
      scheduledDate > challengeEndDate
    ) {
      setError(
        `Date must be between ${challengeStartDate} and ${challengeEndDate}.`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed, description.trim(), scheduledDate);
      if (editingTask) {
        await setTaskGoal(editingTask.id, selectedGoalId);
      } else if (selectedGoalId !== null) {
        await setLatestTaskGoal(trimmed, scheduledDate, selectedGoalId);
      }
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

            {goals.length > 0 ? (
              <>
                <Text style={styles.label}>GOAL PILLAR</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.goalChipsRow}
                >
                  <Pressable
                    onPress={() => setSelectedGoalId(null)}
                    style={[
                      styles.goalChip,
                      selectedGoalId === null && styles.goalChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.goalChipText,
                        selectedGoalId === null && styles.goalChipTextActive,
                      ]}
                    >
                      General
                    </Text>
                  </Pressable>

                  {goals.map((goal) => {
                    const active = selectedGoalId === goal.id;
                    return (
                      <Pressable
                        key={goal.id}
                        onPress={() => setSelectedGoalId(goal.id)}
                        style={[
                          styles.goalChip,
                          active && styles.goalChipActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.goalDot,
                            { backgroundColor: goal.color },
                          ]}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.goalChipText,
                            active && styles.goalChipTextActive,
                          ]}
                        >
                          {goal.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

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
                  onPress={() => setScheduledDate(todayStr)}
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
                  onPress={() => setScheduledDate(tomorrowStr)}
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

            <TextInput
              value={scheduledDate}
              onChangeText={(val) => {
                setScheduledDate(val as DateString);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={10}
              autoCapitalize="none"
            />

            {/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) ? (
              <Text style={styles.datePreview}>
                {formatDateWithWeekday(scheduledDate)}
              </Text>
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
    maxHeight: "88%",
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
  goalChipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    maxWidth: 180,
  },
  goalChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  goalChipText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  goalChipTextActive: {
    color: colors.primary,
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
  datePreview: {
    ...typography.caption,
    color: colors.primary,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});

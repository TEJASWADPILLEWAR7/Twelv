import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/Card";
import { DatePickerModal } from "../components/DatePickerModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString } from "../types";
import {
  addDays,
  formatDisplayDate,
  formatShortDate,
  generateTwelveWeeks,
  getChallengeEndDate,
  getTodayDateString,
  getWeekday,
} from "../utils/date";

const CHALLENGE_IDEAS = [
  "Become a Better Developer",
  "12-Week Deep Execution Sprint",
  "Master DSA & System Design",
];

function getNextMonday(fromDate: DateString): DateString {
  const weekday = getWeekday(fromDate);
  const daysUntilMonday = weekday === 1 ? 7 : (8 - weekday) % 7;
  return addDays(fromDate, daysUntilMonday);
}

export function ChallengeSetupScreen() {
  const insets = useSafeAreaInsets();
  const { createChallenge } = useAppData();
  const todayStr = getTodayDateString();
  const nextMondayStr = useMemo(() => getNextMonday(todayStr), [todayStr]);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<DateString>(todayStr);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const endDate = useMemo(() => getChallengeEndDate(startDate), [startDate]);
  const weeks = useMemo(() => generateTwelveWeeks(startDate), [startDate]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError("Enter a challenge name with at least 2 characters.");
      return;
    }
    setNameError(null);
    setSubmitting(true);
    try {
      await createChallenge(trimmed, startDate);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroBlock}>
          <View style={styles.badgePill}>
            <Ionicons name="flame" size={14} color={colors.primary} />
            <Text style={styles.badgeText}>12 WEEK YEAR SYSTEM</Text>
          </View>
          <Text style={styles.heroTitle}>Start Your 12-Week Challenge</Text>
          <Text style={styles.heroSubtitle}>
            Replace scattered task lists, habit trackers, and paper scorecards
            with one offline execution engine targeting 85%+ every week.
          </Text>
        </View>

        <Card style={styles.formCard}>
          <TextField
            label="Challenge Name"
            placeholder="e.g. Become a Better Developer"
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (nameError) {
                setNameError(null);
              }
            }}
            errorText={nameError}
            maxLength={60}
            returnKeyType="done"
          />

          <View style={styles.ideasRow}>
            {CHALLENGE_IDEAS.map((idea) => (
              <Pressable
                key={idea}
                style={styles.ideaChip}
                onPress={() => {
                  setName(idea);
                  setNameError(null);
                }}
              >
                <Text style={styles.ideaChipText}>{idea}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dateSection}>
            <Text style={styles.fieldLabel}>Start Date</Text>
            <Pressable
              style={styles.dateSelector}
              onPress={() => setPickerVisible(true)}
            >
              <View style={styles.dateSelectorLeft}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.dateSelectorValue}>
                  {formatDisplayDate(startDate)}
                </Text>
              </View>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>

            <View style={styles.presetRow}>
              <Pressable
                style={[
                  styles.presetChip,
                  startDate === todayStr && styles.presetChipActive,
                ]}
                onPress={() => setStartDate(todayStr)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    startDate === todayStr && styles.presetChipTextActive,
                  ]}
                >
                  Start Today
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.presetChip,
                  startDate === nextMondayStr && styles.presetChipActive,
                ]}
                onPress={() => setStartDate(nextMondayStr)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    startDate === nextMondayStr && styles.presetChipTextActive,
                  ]}
                >
                  Next Monday ({formatShortDate(nextMondayStr)})
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>

        <Card highlighted style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>12-Week Cycle Preview</Text>
            <Text style={styles.summaryDuration}>84 Days</Text>
          </View>

          <View style={styles.boundaryRow}>
            <View style={styles.boundaryCol}>
              <Text style={styles.boundaryLabel}>WEEK 1 STARTS</Text>
              <Text style={styles.boundaryValue}>
                {formatDisplayDate(startDate)}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
            <View style={styles.boundaryColRight}>
              <Text style={styles.boundaryLabel}>WEEK 12 ENDS</Text>
              <Text style={styles.boundaryValue}>
                {formatDisplayDate(endDate)}
              </Text>
            </View>
          </View>

          <View style={styles.weekPreviewStrip}>
            <Text style={styles.weekPreviewText}>
              Week 1: {formatShortDate(weeks[0].startDate)} -{" "}
              {formatShortDate(weeks[0].endDate)}
            </Text>
            <Text style={styles.weekPreviewText}>
              Week 12: {formatShortDate(weeks[11].startDate)} -{" "}
              {formatShortDate(weeks[11].endDate)}
            </Text>
          </View>
        </Card>

        <PrimaryButton
          label={
            submitting ? "Creating Challenge..." : "Launch 12-Week Challenge"
          }
          onPress={handleCreate}
          disabled={submitting}
        />
      </ScrollView>

      <DatePickerModal
        visible={pickerVisible}
        title="Select Challenge Start Date"
        selectedDate={startDate}
        onSelect={setStartDate}
        onClose={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  heroBlock: {
    gap: spacing.sm,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.micro,
    color: colors.primary,
  },
  heroTitle: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  formCard: {
    gap: spacing.md,
  },
  ideasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  ideaChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  ideaChipText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  dateSection: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dateSelector: {
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
  dateSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateSelectorValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  changeLink: {
    ...typography.caption,
    color: colors.primary,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  presetChipText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  summaryDuration: {
    ...typography.caption,
    color: colors.primary,
  },
  boundaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  boundaryCol: {
    gap: 2,
  },
  boundaryColRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  boundaryLabel: {
    ...typography.micro,
    color: colors.textMuted,
  },
  boundaryValue: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  weekPreviewStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  weekPreviewText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

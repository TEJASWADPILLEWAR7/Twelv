import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card } from "../components/Card";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { DateString } from "../types";
import { formatDateWithWeekday } from "../utils/date";

const UNIVERSAL_CYCLE_PRESETS: Array<{
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    title: "Health & Fitness Reset",
    subtitle: "Workouts, nutrition, sleep & daily movement",
    icon: "fitness-outline",
  },
  {
    title: "Career & Skill Growth",
    subtitle: "Focused work, portfolio & professional milestones",
    icon: "briefcase-outline",
  },
  {
    title: "Financial Discipline",
    subtitle: "Savings targets, budgeting & expense control",
    icon: "wallet-outline",
  },
  {
    title: "Read, Learn & Focus",
    subtitle: "Daily reading, courses & distraction-free blocks",
    icon: "book-outline",
  },
  {
    title: "Daily Routine Mastery",
    subtitle: "Morning habits, consistency & personal balance",
    icon: "sunny-outline",
  },
  {
    title: "Creative Project Sprint",
    subtitle: "Writing, design, content or personal passion work",
    icon: "color-palette-outline",
  },
];

function parseLocalYmd(ymd: DateString): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toLocalYmd(date: Date): DateString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return (y + "-" + m + "-" + d) as DateString;
}

function addDaysLocal(ymd: DateString, days: number): DateString {
  const parsed = parseLocalYmd(ymd);
  if (!parsed) {
    return ymd;
  }
  parsed.setDate(parsed.getDate() + days);
  return toLocalYmd(parsed);
}

function getNextMondayLocal(ymd: DateString): DateString {
  const parsed = parseLocalYmd(ymd);
  if (!parsed) {
    return ymd;
  }
  const day = parsed.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  parsed.setDate(parsed.getDate() + diff);
  return toLocalYmd(parsed);
}

export function ChallengeSetupScreen() {
  const { todayStr, createChallenge, importBackup } = useAppData();

  const [cycleName, setCycleName] = useState("");
  const [startDate, setStartDate] = useState<DateString>(todayStr);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextMondayStr = useMemo(() => getNextMondayLocal(todayStr), [todayStr]);

  const endDatePreview = useMemo(() => {
    const valid = parseLocalYmd(startDate);
    if (!valid) {
      return null;
    }
    return addDaysLocal(startDate, 83);
  }, [startDate]);

  async function handleStartCycle() {
    const trimmed = cycleName.trim();
    if (!trimmed) {
      setErrorText("Give your 12-week cycle a focus title.");
      return;
    }
    if (!parseLocalYmd(startDate)) {
      setErrorText("Enter a valid start date in YYYY-MM-DD format.");
      return;
    }

    setErrorText(null);
    setSubmitting(true);
    try {
      await createChallenge(trimmed, startDate);
    } catch (err) {
      setErrorText(
        err instanceof Error ? err.message : "Could not start cycle.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestoreBackup() {
    try {
      const restored = await importBackup();
      if (restored) {
        Alert.alert("Backup Restored", "Your 12-week cycle has been loaded.");
      }
    } catch (err) {
      Alert.alert(
        "Restore Failed",
        err instanceof Error ? err.message : "Could not read backup file.",
      );
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.heroBlock}>
            <View style={styles.topActionRow}>
              <View style={styles.badge}>
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.badgeText}>12 WEEK EXECUTION SYSTEM</Text>
              </View>

              <Pressable
                onPress={handleRestoreBackup}
                style={styles.restoreChip}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.restoreChipText}>Restore Backup</Text>
              </Pressable>
            </View>

            <Text style={styles.title}>Start your next 12 weeks</Text>
            <Text style={styles.subtitle}>
              Turn a year-sized ambition into 84 focused days of clear weekly
              tasks and consistent daily habits.
            </Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.label}>CYCLE FOCUS TITLE</Text>
            <TextInput
              value={cycleName}
              onChangeText={(text) => {
                setCycleName(text);
                if (errorText) {
                  setErrorText(null);
                }
              }}
              placeholder="e.g. Health & Fitness Reset, Career Growth..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={60}
              returnKeyType="done"
            />

            <Text style={styles.presetHeading}>POPULAR STARTING IDEAS</Text>
            <View style={styles.presetGrid}>
              {UNIVERSAL_CYCLE_PRESETS.map((preset) => {
                const selected = cycleName.trim() === preset.title;
                return (
                  <Pressable
                    key={preset.title}
                    onPress={() => {
                      setCycleName(preset.title);
                      setErrorText(null);
                    }}
                    style={[
                      styles.presetCard,
                      selected && styles.presetCardSelected,
                    ]}
                  >
                    <View style={styles.presetHeader}>
                      <Ionicons
                        name={preset.icon}
                        size={16}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.presetTitle,
                          selected && styles.presetTitleSelected,
                        ]}
                      >
                        {preset.title}
                      </Text>
                    </View>
                    <Text numberOfLines={2} style={styles.presetSubtitle}>
                      {preset.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>START DATE</Text>
            <View style={styles.datePresetRow}>
              <Pressable
                onPress={() => {
                  setStartDate(todayStr);
                  setErrorText(null);
                }}
                style={[
                  styles.dateChip,
                  startDate === todayStr && styles.dateChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    startDate === todayStr && styles.dateChipTextActive,
                  ]}
                >
                  Today
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setStartDate(nextMondayStr);
                  setErrorText(null);
                }}
                style={[
                  styles.dateChip,
                  startDate === nextMondayStr && styles.dateChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    startDate === nextMondayStr && styles.dateChipTextActive,
                  ]}
                >
                  Next Monday
                </Text>
              </Pressable>
            </View>

            <TextInput
              value={startDate}
              onChangeText={(val) => {
                setStartDate(val as DateString);
                if (errorText) {
                  setErrorText(null);
                }
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={10}
            />

            {endDatePreview ? (
              <View style={styles.windowBanner}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.windowText}>
                  84-day cycle: {formatDateWithWeekday(startDate)} ->{" "}
                  {formatDateWithWeekday(endDatePreview)}
                </Text>
              </View>
            ) : null}

            {errorText ? (
              <Text style={styles.errorText}>{errorText}</Text>
            ) : null}

            <Pressable
              onPress={handleStartCycle}
              disabled={submitting}
              style={[
                styles.launchButton,
                submitting && styles.launchButtonDisabled,
              ]}
            >
              <Text style={styles.launchButtonText}>
                {submitting ? "Launching..." : "Launch 12-Week Cycle"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.background}
              />
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  topActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.micro,
    color: colors.primary,
  },
  restoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  restoreChipText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.primary,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  formCard: {
    gap: spacing.md,
  },
  label: {
    ...typography.micro,
    color: colors.textMuted,
  },
  presetHeading: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: 2,
  },
  presetGrid: {
    gap: spacing.xs,
  },
  presetCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 3,
  },
  presetCardSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  presetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  presetTitle: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  presetTitleSelected: {
    color: colors.primary,
  },
  presetSubtitle: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "none",
    letterSpacing: 0,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    ...typography.body,
  },
  datePresetRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
  },
  dateChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  dateChipText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dateChipTextActive: {
    color: colors.primary,
  },
  windowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  windowText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  launchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  launchButtonDisabled: {
    opacity: 0.6,
  },
  launchButtonText: {
    ...typography.bodyMedium,
    fontWeight: "700",
    color: colors.background,
  },
});

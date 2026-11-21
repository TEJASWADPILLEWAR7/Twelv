import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Card } from "./Card";

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function WeeklyQuoteManagerCard() {
  const { activeWeekNumber, weeklyQuotes, saveWeeklyQuote } = useAppData();
  const [selectedWeek, setSelectedWeek] = useState<number>(
    activeWeekNumber ?? 1,
  );
  const [quoteText, setQuoteText] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (activeWeekNumber) {
      setSelectedWeek(activeWeekNumber);
    }
  }, [activeWeekNumber]);

  useEffect(() => {
    const existing = weeklyQuotes.find((q) => q.weekNumber === selectedWeek);
    setQuoteText(existing?.quoteText ?? "");
    setAuthor(existing?.author ?? "");
    setSavedFlag(false);
  }, [selectedWeek, weeklyQuotes]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveWeeklyQuote(selectedWeek, quoteText, author);
      setSavedFlag(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.title}>Weekly Inspiration Quotes</Text>
        </View>
        {savedFlag ? <Text style={styles.savedText}>Saved</Text> : null}
      </View>

      <Text style={styles.description}>
        Set a personal quote for each week. The active week&apos;s quote appears
        at the top of your Tasks view.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekRow}
      >
        {WEEKS.map((wk) => {
          const active = wk === selectedWeek;
          const hasQuote = weeklyQuotes.some(
            (q) => q.weekNumber === wk && q.quoteText.trim().length > 0,
          );
          return (
            <Pressable
              key={wk}
              onPress={() => setSelectedWeek(wk)}
              style={[styles.weekPill, active && styles.weekPillActive]}
            >
              <Text
                style={[
                  styles.weekPillText,
                  active && styles.weekPillTextActive,
                ]}
              >
                W{wk}
              </Text>
              {hasQuote ? (
                <View
                  style={[
                    styles.dot,
                    active && styles.dotActive,
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <TextInput
        value={quoteText}
        onChangeText={(t) => {
          setQuoteText(t);
          if (savedFlag) {
            setSavedFlag(false);
          }
        }}
        placeholder={"Enter inspiration quote for Week " + selectedWeek + "..."}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.quoteInput]}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
        maxLength={180}
      />

      <View style={styles.bottomRow}>
        <TextInput
          value={author}
          onChangeText={(t) => {
            setAuthor(t);
            if (savedFlag) {
              setSavedFlag(false);
            }
          }}
          placeholder="Author (optional)"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.authorInput]}
          maxLength={50}
        />

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving" : "Save W" + selectedWeek}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  savedText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.primary,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  weekRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  weekPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  weekPillActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  weekPillText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  weekPillTextActive: {
    color: colors.primary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    color: colors.textPrimary,
    ...typography.caption,
  },
  quoteInput: {
    minHeight: 56,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  authorInput: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.background,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";

export function ActiveWeekQuoteBanner() {
  const { activeWeekNumber, weeklyQuotes } = useAppData();

  if (!activeWeekNumber) {
    return null;
  }

  const current = weeklyQuotes.find(
    (q) => q.weekNumber === activeWeekNumber && q.quoteText.trim().length > 0,
  );

  if (!current) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <Text numberOfLines={3} style={styles.quoteText}>
          "{current.quoteText.trim()}"
        </Text>
        <Text numberOfLines={1} style={styles.metaText}>
          WEEK {activeWeekNumber} INSPIRATION
          {current.author.trim() ? " - " + current.author.trim() : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  quoteText: {
    ...typography.caption,
    fontStyle: "italic",
    color: colors.textPrimary,
    lineHeight: 18,
  },
  metaText: {
    ...typography.micro,
    color: colors.textMuted,
  },
});

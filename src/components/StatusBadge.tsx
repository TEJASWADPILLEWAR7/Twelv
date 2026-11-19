import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, toneBackground[tone]]}>
      <Text style={[styles.text, toneText[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  text: {
    ...typography.micro,
  },
});

const toneBackground = StyleSheet.create({
  success: { backgroundColor: colors.successMuted },
  warning: { backgroundColor: colors.warningMuted },
  danger: { backgroundColor: colors.dangerMuted },
  neutral: { backgroundColor: colors.surfaceElevated },
  info: { backgroundColor: colors.accentSecondaryMuted },
});

const toneText = StyleSheet.create({
  success: { color: colors.success },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
  neutral: { color: colors.textSecondary },
  info: { color: colors.accentSecondary },
});

import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius } from "../theme/tokens";

interface ProgressBarProps {
  percentage: number;
  accentColor?: string;
  height?: number;
}

export function ProgressBar({
  percentage,
  accentColor = colors.primary,
  height = 8,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: accentColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
  },
});

import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme/tokens";

interface ScreenContainerProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.outer,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: Math.max(insets.bottom, 12) + 74,
        },
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    paddingHorizontal: spacing.lg,
  },
});

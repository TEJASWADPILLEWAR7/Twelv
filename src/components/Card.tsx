import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
}

export function Card({ children, style, highlighted = false }: CardProps) {
  return (
    <View style={[styles.card, highlighted && styles.highlighted, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  highlighted: {
    borderColor: colors.primaryBorder,
  },
});

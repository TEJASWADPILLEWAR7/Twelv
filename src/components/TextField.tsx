import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";

interface TextFieldProps extends TextInputProps {
  label: string;
  errorText?: string | null;
}

export function TextField({
  label,
  errorText,
  style,
  ...rest
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, Boolean(errorText) && styles.inputError, style]}
        {...rest}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 48,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    ...typography.micro,
    color: colors.danger,
  },
});

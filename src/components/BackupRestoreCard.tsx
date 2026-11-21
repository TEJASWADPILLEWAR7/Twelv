import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppData } from "../context/AppDataContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { Card } from "./Card";

export function BackupRestoreCard() {
  const { exportBackup, importBackup } = useAppData();
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      await exportBackup();
    } catch (err) {
      Alert.alert(
        "Export Failed",
        err instanceof Error ? err.message : "Unable to export backup.",
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmImport() {
    Alert.alert(
      "Restore Backup?",
      "Importing a .json backup will replace your current 12-week cycle data on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose File",
          onPress: async () => {
            setBusy(true);
            try {
              const restored = await importBackup();
              if (restored) {
                Alert.alert("Success", "Your Twelv backup has been restored.");
              }
            } catch (err) {
              Alert.alert(
                "Import Failed",
                err instanceof Error ? err.message : "Invalid backup file.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons
          name="shield-checkmark-outline"
          size={16}
          color={colors.primary}
        />
        <Text style={styles.heading}>LOCAL DATA BACKUP</Text>
      </View>

      <Text style={styles.desc}>
        All data lives offline on your phone. Export a .json snapshot anytime so
        you never lose an 84-day cycle when switching devices or reinstalling.
      </Text>

      <View style={styles.btnRow}>
        <Pressable
          onPress={handleExport}
          disabled={busy}
          style={[styles.actionBtn, styles.exportBtn]}
        >
          <Ionicons
            name="download-outline"
            size={16}
            color={colors.background}
          />
          <Text style={styles.exportText}>Export .json</Text>
        </Pressable>

        <Pressable
          onPress={confirmImport}
          disabled={busy}
          style={[styles.actionBtn, styles.importBtn]}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={styles.importText}>Restore .json</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heading: {
    ...typography.micro,
    color: colors.textMuted,
  },
  desc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  exportBtn: {
    backgroundColor: colors.primary,
  },
  exportText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.background,
  },
  importBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  importText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
});

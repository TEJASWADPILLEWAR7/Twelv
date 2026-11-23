import * as Updates from "expo-updates";
import { useEffect as useOtaEffect } from "react";
import { Alert as RNAlert } from "react-native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppDataProvider } from "./src/context/AppDataContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  useOtaEffect(() => {
    async function checkForOtaUpdate() {
      if (__DEV__) {
        return;
      }
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          RNAlert.alert(
            "Update Available",
            "A new update for Twelv is ready. Restart now to apply changes?",
            [
              { text: "Later", style: "cancel" },
              { text: "Update Now", onPress: () => void Updates.reloadAsync() },
            ],
          );
        }
      } catch {
        // Stay silent when offline
      }
    }
    void checkForOtaUpdate();
  }, []);

  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AppDataProvider>
    </SafeAreaProvider>
  );
}

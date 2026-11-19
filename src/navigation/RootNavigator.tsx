import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FloatingTabBar } from "../components/FloatingTabBar";
import { useAppData } from "../context/AppDataContext";
import { ChallengeSetupScreen } from "../screens/ChallengeSetupScreen";
import { HabitsScreen } from "../screens/HabitsScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { ProgressScreen } from "../screens/ProgressScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { colors, typography } from "../theme/tokens";

export type RootTabParamList = {
  Tasks: undefined;
  Habits: undefined;
  Progress: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  const { isReady, error, challenge } = useAppData();

  if (!isReady) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Storage Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!challenge) {
    return <ChallengeSetupScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
        }}
      >
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    ...typography.heading,
    color: colors.danger,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

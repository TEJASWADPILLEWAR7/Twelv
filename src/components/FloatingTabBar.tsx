import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius } from "../theme/tokens";

function getTabIconName(
  routeName: string,
  focused: boolean,
): keyof typeof Ionicons.glyphMap {
  if (routeName === "Tasks") {
    return focused ? "checkmark-circle" : "checkmark-circle-outline";
  }
  if (routeName === "Habits") {
    return focused ? "repeat" : "repeat-outline";
  }
  if (routeName === "Progress") {
    return focused ? "bar-chart" : "bar-chart-outline";
  }
  return focused ? "grid" : "grid-outline";
}

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: Math.max(insets.bottom, 12) + 8,
        },
      ]}
    >
      <View style={styles.pillContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconName = getTabIconName(route.name, isFocused);

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          }

          function onLongPress() {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={
                options.tabBarAccessibilityLabel ?? route.name
              }
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.squircleButton,
                isFocused && styles.squircleButtonActive,
                pressed && styles.squircleButtonPressed,
              ]}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? colors.background : colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  squircleButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  squircleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  squircleButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});

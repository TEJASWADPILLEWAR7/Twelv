import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text } from "react-native";
import { colors, typography } from "../theme/tokens";

interface StartupSplashProps {
  isReady: boolean;
  hasError: boolean;
}

export function StartupSplash({ isReady, hasError }: StartupSplashProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const [minDurationDone, setMinDurationDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setMinDurationDone(true);
    }, 650);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale]);

  useEffect(() => {
    if ((!isReady || !minDurationDone) && !hasError) {
      return;
    }

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1.04,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setHidden(true);
      }
    });
  }, [isReady, minDurationDone, hasError, overlayOpacity, logoScale]);

  if (hidden) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={[
          styles.brandBlock,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../../assets/Twelv.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Twelv</Text>
        <Text style={styles.subtitle}>12 Week Execution</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  brandBlock: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 20,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
    letterSpacing: 0.5,
    color: colors.textPrimary,
    marginTop: 6,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

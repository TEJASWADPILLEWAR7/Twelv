export const colors = {
  background: "#0B0D10",
  surface: "#14181F",
  surfaceElevated: "#1C222B",
  surfacePressed: "#242B36",
  border: "#262E3A",
  borderSubtle: "#1D232D",
  primary: "#10B981",
  primaryMuted: "rgba(16, 185, 129, 0.14)",
  primaryBorder: "rgba(16, 185, 129, 0.35)",
  textPrimary: "#F3F5F8",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  success: "#10B981",
  successMuted: "rgba(16, 185, 129, 0.15)",
  warning: "#F59E0B",
  warningMuted: "rgba(245, 158, 11, 0.15)",
  danger: "#EF4444",
  dangerMuted: "rgba(239, 68, 68, 0.15)",
  accentSecondary: "#38BDF8",
  accentSecondaryMuted: "rgba(56, 189, 248, 0.14)",
  overlay: "rgba(0, 0, 0, 0.72)",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  hero: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  micro: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.4,
  },
} as const;

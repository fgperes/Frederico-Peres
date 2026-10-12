import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {description ? <Text style={styles.headerDescription}>{description}</Text> : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.violet600} />
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

type BadgeColor = "violet" | "green" | "amber" | "red" | "stone";

export function Badge({ children, color = "stone" }: { children: ReactNode; color?: BadgeColor }) {
  return (
    <View style={[styles.badge, badgeColorStyles[color].badge]}>
      <Text style={[styles.badgeText, badgeColorStyles[color].text]}>{children}</Text>
    </View>
  );
}

const badgeColorStyles: Record<BadgeColor, { badge: object; text: object }> = {
  violet: { badge: { backgroundColor: colors.violet100 }, text: { color: colors.violet700 } },
  green: { badge: { backgroundColor: "#dcfce7" }, text: { color: colors.green600 } },
  amber: { badge: { backgroundColor: "#fef3c7" }, text: { color: "#92400e" } },
  red: { badge: { backgroundColor: "#fee2e2" }, text: { color: colors.red600 } },
  stone: { badge: { backgroundColor: colors.stone100 }, text: { color: colors.stone600 } },
};

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.violet600 : colors.white} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.buttonTextSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.stone900,
  },
  headerDescription: {
    fontSize: 14,
    color: colors.stone500,
    marginTop: spacing.xs,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: colors.stone500,
    fontSize: 14,
    textAlign: "center",
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  errorBanner: {
    backgroundColor: "#fee2e2",
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.red600,
    fontSize: 14,
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    backgroundColor: colors.violet600,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  buttonDanger: {
    backgroundColor: colors.red600,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: colors.violet600,
  },
});

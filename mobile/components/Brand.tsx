import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";
import { colors, spacing } from "@/lib/theme";

// Mesma marca "Elo" do logo web (src/components/brand/logo.tsx), recriada em SVG nativo.
export function LogoMark({ size = 28, color = colors.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect
        x={14}
        y={38}
        width={44}
        height={24}
        rx={12}
        fill="none"
        stroke={color}
        strokeWidth={8}
        transform="rotate(-18 36 50)"
      />
      <Rect
        x={42}
        y={38}
        width={44}
        height={24}
        rx={12}
        fill="none"
        stroke={color}
        strokeWidth={8}
        transform="rotate(18 64 50)"
      />
    </Svg>
  );
}

export function PeopleWordmark({
  size = 18,
  color = colors.white,
  accentColor = colors.violet200,
}: {
  size?: number;
  color?: string;
  accentColor?: string;
}) {
  return (
    <Text style={{ fontSize: size, fontWeight: "700", color }}>
      people
      <Text style={{ color: accentColor }}>4</Text>
      people
    </Text>
  );
}

export function AppHeader() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.bar}>
        <LogoMark size={24} />
        <PeopleWordmark size={17} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.violet600,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});

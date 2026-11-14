import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Rect } from "react-native-svg";
import { Bell, MessageCircle, Moon, Sun } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { spacing } from "@/lib/theme";
import { useThemeMode, useToggleTheme } from "@/lib/theme-context";

// Mesma marca "Elo" do logo web (src/components/brand/logo.tsx), recriada em SVG nativo.
export function LogoMark({ size = 28, color = "#ffffff" }: { size?: number; color?: string }) {
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
  color = "#ffffff",
  accentColor = "#ddd6fe",
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
  const { token } = useAuth();
  const mode = useThemeMode();
  const toggleTheme = useToggleTheme();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.get<{ items: { count: number }[]; unreadMessages: number }>(
        "/api/mobile/notificacoes",
        token
      );
      setUnreadNotifications(result.items.reduce((sum, item) => sum + item.count, 0));
      setUnreadMessages(result.unreadMessages);
    } catch {
      // Cabeçalho não deve bloquear a navegação por causa de contadores.
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <LogoMark size={24} />
          <PeopleWordmark size={17} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleTheme}>
            {mode === "dark" ? <Sun color="#ffffff" size={20} /> : <Moon color="#ffffff" size={20} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/mensagens")}>
            <MessageCircle color="#ffffff" size={20} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages > 9 ? "9+" : unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/notificacoes")}>
            <Bell color="#ffffff" size={20} />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#7c3aed",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
});

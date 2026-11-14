import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import {
  Banknote,
  CalendarClock,
  CalendarOff,
  Fingerprint,
  LayoutDashboard,
  Plane,
  User,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { AppHeader } from "@/components/Brand";

export default function TabsLayout() {
  const { isLoading, token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.violet600} />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <AppHeader />,
        tabBarActiveTintColor: colors.violet600,
        tabBarInactiveTintColor: colors.stone400,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Início", tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="ausencias"
        options={{ title: "Ausências", tabBarIcon: ({ color, size }) => <CalendarOff color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="ferias"
        options={{ title: "Férias", tabBarIcon: ({ color, size }) => <Plane color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="payroll"
        options={{ title: "Vencim.", tabBarIcon: ({ color, size }) => <Banknote color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="horario"
        options={{ title: "Horário", tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="picagens"
        options={{ title: "Picagens", tabBarIcon: ({ color, size }) => <Fingerprint color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.white,
    },
  });
}

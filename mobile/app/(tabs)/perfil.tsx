import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { colors, radii, spacing } from "@/lib/theme";

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{(user?.name ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "—"}</Text>
        <Text style={styles.email}>{user?.email ?? "—"}</Text>

        {user?.roleLabels && user.roleLabels.length > 0 && (
          <View style={styles.roles}>
            {user.roleLabels.map((label) => (
              <View key={label} style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {user?.mustChangePassword && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              É necessário alterar a password — esta funcionalidade fica disponível numa próxima atualização da app.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color={colors.red600} size={18} />
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.stone50,
  },
  content: {
    padding: spacing.lg,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.violet600,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  avatarInitial: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "700",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.stone900,
    marginTop: spacing.md,
  },
  email: {
    fontSize: 14,
    color: colors.stone500,
    marginTop: spacing.xs,
  },
  roles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
    justifyContent: "center",
  },
  roleBadge: {
    backgroundColor: colors.violet100,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: colors.violet700,
    fontSize: 12,
    fontWeight: "600",
  },
  warning: {
    backgroundColor: colors.violet50,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    width: "100%",
  },
  warningText: {
    color: colors.stone600,
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  logoutText: {
    color: colors.red600,
    fontWeight: "600",
    fontSize: 15,
  },
});

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays, Clock3, FileWarning, Plane } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, radii, spacing } from "@/lib/theme";

type Shift = { date: string; startTime: string; endTime: string } | null;

type DashboardData = {
  nextShift: Shift;
  feriasDisponiveis: number | null;
  pendingAbsences: number;
  unjustifiedDeviations: number;
  upcomingAbsences: { id: string; startDate: string; endDate: string; typeName: string; isVacation: boolean }[];
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function DashboardScreen() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await api.get<DashboardData>("/api/mobile/dashboard", token);
    setData(result);
  }, [token]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
      >
        <Text style={styles.greeting}>Olá{firstName ? `, ${firstName}` : ""}</Text>
        <Text style={styles.subtitle}>O resumo do teu dia</Text>

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.violet600} />
        ) : data ? (
          <View style={styles.cards}>
            <View style={styles.card}>
              <View style={[styles.iconBadge, { backgroundColor: colors.violet100 }]}>
                <Clock3 color={colors.violet600} size={20} />
              </View>
              <Text style={styles.cardLabel}>Próximo turno</Text>
              <Text style={styles.cardValue}>
                {data.nextShift
                  ? `${formatDate(data.nextShift.date)} · ${data.nextShift.startTime}–${data.nextShift.endTime}`
                  : "Sem turnos agendados"}
              </Text>
            </View>

            <View style={styles.card}>
              <View style={[styles.iconBadge, { backgroundColor: colors.violet100 }]}>
                <Plane color={colors.violet600} size={20} />
              </View>
              <Text style={styles.cardLabel}>Férias disponíveis</Text>
              <Text style={styles.cardValue}>
                {data.feriasDisponiveis !== null ? `${data.feriasDisponiveis} dias` : "—"}
              </Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardLabel}>Ausências pendentes</Text>
                <Text style={styles.cardValueSmall}>{data.pendingAbsences}</Text>
              </View>
              <View style={[styles.card, styles.halfCard]}>
                <View style={styles.inlineLabel}>
                  <FileWarning color={colors.amber500} size={16} />
                  <Text style={styles.cardLabel}>Desvios por justificar</Text>
                </View>
                <Text style={styles.cardValueSmall}>{data.unjustifiedDeviations}</Text>
              </View>
            </View>

            {data.upcomingAbsences.length > 0 && (
              <View style={styles.card}>
                <View style={styles.inlineLabel}>
                  <CalendarDays color={colors.violet600} size={18} />
                  <Text style={styles.cardLabel}>As minhas próximas ausências</Text>
                </View>
                {data.upcomingAbsences.slice(0, 5).map((a) => (
                  <Text key={a.id} style={styles.listItem}>
                    {a.typeName} · {formatDate(a.startDate)}
                    {a.endDate !== a.startDate ? ` – ${formatDate(a.endDate)}` : ""}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
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
  },
  greeting: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.stone900,
  },
  subtitle: {
    fontSize: 15,
    color: colors.stone500,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  loading: {
    marginTop: spacing.xl,
  },
  cards: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  cardLabel: {
    fontSize: 13,
    color: colors.stone500,
    fontWeight: "500",
  },
  cardValue: {
    fontSize: 17,
    color: colors.stone900,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  cardValueSmall: {
    fontSize: 22,
    color: colors.stone900,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  inlineLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  listItem: {
    fontSize: 13,
    color: colors.stone600,
    marginTop: spacing.sm,
  },
});

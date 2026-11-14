import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CalendarDays, ClipboardCheck, Clock3, FileWarning, Plane } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { radii, spacing, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { ErrorBanner } from "@/components/ui";

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<DashboardData>("/api/mobile/dashboard", token);
    setData(result);
    try {
      const approvals = await api.get<{ canApprove: boolean; items: unknown[] }>("/api/mobile/aprovacoes", token);
      setPendingApprovals(approvals.canApprove ? approvals.items.length : null);
    } catch {
      // Cartão opcional — uma falha aqui não deve impedir o resto do Início de aparecer.
      setPendingApprovals(null);
    }
  }, [token]);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
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
  const nextDayOff = data?.upcomingAbsences.find((a) => a.isVacation) ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
      >
        <Text style={styles.greeting}>Olá{firstName ? `, ${firstName}` : ""}</Text>
        <Text style={styles.subtitle}>O resumo do teu dia</Text>

        {error ? <ErrorBanner message={error} /> : null}

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.violet600} />
        ) : data ? (
          <View style={styles.cards}>
            {pendingApprovals !== null && (
              <TouchableOpacity style={styles.card} onPress={() => router.push("/aprovacoes")}>
                <View style={[styles.iconBadge, { backgroundColor: colors.violet100 }]}>
                  <ClipboardCheck color={colors.violet600} size={20} />
                </View>
                <Text style={styles.cardLabel}>Pedidos pendentes</Text>
                <Text style={styles.cardValueSmall}>{pendingApprovals}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)/horario")}>
              <View style={[styles.iconBadge, { backgroundColor: colors.violet100 }]}>
                <Clock3 color={colors.violet600} size={20} />
              </View>
              <Text style={styles.cardLabel}>Próximo turno</Text>
              <Text style={styles.cardValue}>
                {data.nextShift
                  ? `${formatDate(data.nextShift.date)} · ${data.nextShift.startTime}–${data.nextShift.endTime}`
                  : "Sem turnos agendados"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)/horario")}>
              <View style={[styles.iconBadge, { backgroundColor: colors.violet100 }]}>
                <Plane color={colors.violet600} size={20} />
              </View>
              <Text style={styles.cardLabel}>Próxima folga</Text>
              <Text style={styles.cardValue}>{nextDayOff ? formatDate(nextDayOff.startDate) : "Sem férias marcadas"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push("/(tabs)/ausencias")}>
              <Text style={styles.ctaButtonText}>Pedir ausência</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)/ferias")}>
              <View style={[styles.iconBadge, { backgroundColor: colors.violet100 }]}>
                <Plane color={colors.violet600} size={20} />
              </View>
              <Text style={styles.cardLabel}>Férias disponíveis</Text>
              <Text style={styles.cardValue}>
                {data.feriasDisponiveis !== null ? `${data.feriasDisponiveis} dias` : "—"}
              </Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.card, styles.halfCard]}
                onPress={() => router.push("/(tabs)/ausencias")}
              >
                <Text style={styles.cardLabel}>Ausências pendentes</Text>
                <Text style={styles.cardValueSmall}>{data.pendingAbsences}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.card, styles.halfCard]}
                onPress={() => router.push("/(tabs)/picagens")}
              >
                <View style={styles.inlineLabel}>
                  <FileWarning color={colors.amber500} size={16} />
                  <Text style={styles.cardLabel}>Desvios por justificar</Text>
                </View>
                <Text style={styles.cardValueSmall}>{data.unjustifiedDeviations}</Text>
              </TouchableOpacity>
            </View>

            {data.upcomingAbsences.length > 0 && (
              <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)/ausencias")}>
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
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
  ctaButton: {
    backgroundColor: colors.violet600,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaButtonText: {
    color: colors.onColor,
    fontSize: 15,
    fontWeight: "600",
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
}

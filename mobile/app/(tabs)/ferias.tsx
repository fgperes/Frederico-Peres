import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { colors, radii, spacing } from "@/lib/theme";
import { MONTH_NAMES, WEEKDAY_LABELS } from "@/lib/dates";
import { Card, ErrorBanner, LoadingView, PageHeader } from "@/components/ui";

type Headcount = { entitled: number; carryOver: number; total: number; marked: number; approved: number; saldo: number };
type DayMark = { status: "PENDING" | "APPROVED" | "CANCEL_PENDING" };
type HistoryRow = Headcount & { year: number };

type FeriasData = {
  year: number;
  headcount: Headcount;
  planned: number;
  marks: Record<string, DayMark>;
  holidayDates: Record<string, string>;
  history: HistoryRow[];
};

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function markColor(status: DayMark["status"] | undefined): { bg: string; text: string } | null {
  if (status === "APPROVED") return { bg: colors.green600, text: colors.white };
  if (status === "CANCEL_PENDING") return { bg: colors.stone400, text: colors.white };
  if (status === "PENDING") return { bg: colors.amber500, text: colors.white };
  return null;
}

export default function FeriasScreen() {
  const { token } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [data, setData] = useState<FeriasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingDay, setTogglingDay] = useState<string | null>(null);

  const load = useCallback(
    async (targetYear: number) => {
      const result = await api.get<FeriasData>(`/api/mobile/ferias?year=${targetYear}`, token);
      setData(result);
    },
    [token]
  );

  useEffect(() => {
    setLoading(true);
    load(year)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [load, year]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(year);
    } finally {
      setRefreshing(false);
    }
  };

  const shiftMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setMonth(newMonth);
    if (newYear !== year) setYear(newYear);
  };

  const toggleDay = async (dateKey: string, status: DayMark["status"] | undefined) => {
    const doToggle = async () => {
      setTogglingDay(dateKey);
      try {
        const result = await api.post<{ error?: string }>("/api/mobile/ferias/toggle-dia", { dates: [dateKey] }, token);
        if (result.error) {
          Alert.alert("Erro", result.error);
          return;
        }
        await load(year);
      } catch (e) {
        Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível atualizar o dia.");
      } finally {
        setTogglingDay(null);
      }
    };

    if (status === "APPROVED") {
      Alert.alert("Pedir cancelamento", "Este dia já está aprovado. Quer pedir o cancelamento?", [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: doToggle },
      ]);
      return;
    }
    await doToggle();
  };

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7; // 0 = Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [year, month]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
      >
        <PageHeader title="Férias" description="Toque num dia para marcar ou desmarcar." />

        {error ? <ErrorBanner message={error} /> : null}

        {loading || !data ? (
          <LoadingView />
        ) : (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <SummaryItem label="Direito" value={data.headcount.total} />
                <SummaryItem label="Marcados" value={data.headcount.marked} />
                <SummaryItem label="Saldo" value={data.headcount.saldo} highlight />
              </View>
            </Card>

            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navButton}>
                <ChevronLeft color={colors.stone600} size={22} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navButton}>
                <ChevronRight color={colors.stone600} size={22} />
              </TouchableOpacity>
            </View>

            <Card>
              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((w) => (
                  <Text key={w} style={styles.weekdayLabel}>
                    {w}
                  </Text>
                ))}
              </View>
              {weeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((d, di) => {
                    if (d === null) return <View key={di} style={styles.dayCell} />;
                    const dateKey = toDateKey(year, month, d);
                    const mark = data.marks[dateKey];
                    const isHoliday = Boolean(data.holidayDates[dateKey]);
                    const colorSet = markColor(mark?.status);
                    const isToggling = togglingDay === dateKey;
                    return (
                      <TouchableOpacity
                        key={di}
                        style={styles.dayCell}
                        disabled={isToggling}
                        onPress={() => toggleDay(dateKey, mark?.status)}
                      >
                        <View
                          style={[
                            styles.dayCircle,
                            colorSet && { backgroundColor: colorSet.bg },
                            !colorSet && isHoliday && styles.dayCircleHoliday,
                          ]}
                        >
                          <Text style={[styles.dayText, colorSet && { color: colorSet.text }]}>{d}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </Card>

            <View style={styles.legend}>
              <LegendItem color={colors.amber500} label="Pendente" />
              <LegendItem color={colors.green600} label="Aprovado" />
              <LegendItem color={colors.stone400} label="A cancelar" />
            </View>

            {data.history.length > 0 && (
              <Card style={styles.historyCard}>
                <Text style={styles.historyTitle}>Histórico</Text>
                {data.history.map((row) => (
                  <View key={row.year} style={styles.historyRow}>
                    <Text style={styles.historyYear}>{row.year}</Text>
                    <Text style={styles.historyValue}>
                      {row.marked}/{row.total} dias · saldo {row.saldo}
                    </Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, highlight && { color: colors.violet600 }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.stone50,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    marginTop: -spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.stone900,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.stone500,
    marginTop: 2,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  navButton: {
    padding: spacing.xs,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.stone900,
    minWidth: 140,
    textAlign: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: colors.stone400,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleHoliday: {
    backgroundColor: colors.violet50,
  },
  dayText: {
    fontSize: 13,
    color: colors.stone600,
  },
  legend: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.stone500,
  },
  historyCard: {
    gap: spacing.xs,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.stone900,
    marginBottom: spacing.xs,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.stone100,
  },
  historyYear: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.stone600,
  },
  historyValue: {
    fontSize: 13,
    color: colors.stone500,
  },
});

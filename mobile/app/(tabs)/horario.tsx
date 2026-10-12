import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, radii, spacing } from "@/lib/theme";
import { addDays, formatDateWeekday, getWeekStart, toDateKey } from "@/lib/dates";
import { Card, EmptyState, ErrorBanner, LoadingView, PageHeader } from "@/components/ui";

type Shift = { id: string; startTime: string; endTime: string; status: string; template: { name: string; color: string } | null };
type DayEntry = {
  date: string;
  shifts: Shift[];
  absence: { label: string; isVacation: boolean } | null;
  holiday: string | null;
};
type HorarioData = { weekStart: string; week: DayEntry[] };

export default function HorarioScreen() {
  const { token } = useAuth();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [data, setData] = useState<HorarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (ws: Date) => {
      const result = await api.get<HorarioData>(`/api/mobile/horario?week=${toDateKey(ws)}`, token);
      setData(result);
    },
    [token]
  );

  useEffect(() => {
    setLoading(true);
    load(weekStart)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [load, weekStart]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(weekStart);
    } finally {
      setRefreshing(false);
    }
  };

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${formatDateWeekday(weekStart.toISOString())} – ${formatDateWeekday(weekEnd.toISOString())}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
      >
        <PageHeader title="Horário" description="O seu horário semanal." />

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.navButton} onPress={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft color={colors.stone600} size={22} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity style={styles.navButton} onPress={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight color={colors.stone600} size={22} />
          </TouchableOpacity>
        </View>

        {loading || !data ? (
          <LoadingView />
        ) : data.week.every((d) => d.shifts.length === 0 && !d.absence && !d.holiday) ? (
          <EmptyState message="Sem turnos nesta semana." />
        ) : (
          <View style={styles.days}>
            {data.week.map((day) => (
              <Card key={day.date} style={styles.dayCard}>
                <Text style={styles.dayLabel}>{formatDateWeekday(day.date)}</Text>
                {day.holiday ? (
                  <Text style={styles.holidayLabel}>Feriado · {day.holiday}</Text>
                ) : day.absence ? (
                  <Text style={styles.absenceLabel}>{day.absence.label}</Text>
                ) : day.shifts.length > 0 ? (
                  day.shifts.map((s) => (
                    <View key={s.id} style={styles.shiftRow}>
                      <View style={[styles.shiftDot, { backgroundColor: s.template?.color ?? colors.violet500 }]} />
                      <Text style={styles.shiftText}>
                        {s.startTime}–{s.endTime}
                        {s.template ? ` · ${s.template.name}` : ""}
                      </Text>
                      {s.status === "DRAFT" && <Text style={styles.draftTag}>rascunho</Text>}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyDay}>Folga</Text>
                )}
              </Card>
            ))}
          </View>
        )}
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
    gap: spacing.md,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  navButton: {
    padding: spacing.xs,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.stone900,
    minWidth: 160,
    textAlign: "center",
  },
  days: {
    gap: spacing.sm,
  },
  dayCard: {
    gap: spacing.xs,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.stone500,
    textTransform: "capitalize",
  },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shiftDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  shiftText: {
    fontSize: 14,
    color: colors.stone900,
  },
  draftTag: {
    fontSize: 11,
    color: colors.amber500,
    fontWeight: "600",
  },
  absenceLabel: {
    fontSize: 14,
    color: colors.violet600,
    fontWeight: "500",
  },
  holidayLabel: {
    fontSize: 14,
    color: colors.stone500,
    fontWeight: "500",
  },
  emptyDay: {
    fontSize: 14,
    color: colors.stone400,
  },
});

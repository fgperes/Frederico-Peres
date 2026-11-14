import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { radii, spacing, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { MONTH_NAMES, WEEKDAY_LABELS } from "@/lib/dates";
import { Card, ErrorBanner, LoadingView, PageHeader, PrimaryButton, SuccessBanner } from "@/components/ui";

type Feedback = { type: "error" | "success"; text: string };

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

function markColor(colors: ThemeColors, status: DayMark["status"] | undefined): { bg: string; text: string } | null {
  if (status === "APPROVED") return { bg: colors.green600, text: colors.onColor };
  if (status === "CANCEL_PENDING") return { bg: colors.stone400, text: colors.onColor };
  if (status === "PENDING") return { bg: colors.amber500, text: colors.onColor };
  return null;
}

export default function FeriasScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [data, setData] = useState<FeriasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingDay, setTogglingDay] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);

  const load = useCallback(
    async (targetYear: number) => {
      const result = await api.get<FeriasData>(`/api/mobile/ferias?year=${targetYear}`, token);
      setData(result);
    },
    [token]
  );

  useEffect(() => {
    setLoading(true);
    setFeedback(null);
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
      setFeedback(null);
      try {
        const result = await api.post<{ error?: string }>("/api/mobile/ferias/toggle-dia", { dates: [dateKey] }, token);
        if (result.error) {
          setFeedback({ type: "error", text: result.error });
          return;
        }
        await load(year);
        setFeedback({ type: "success", text: "Pedido atualizado." });
      } catch (e) {
        setFeedback({
          type: "error",
          text: e instanceof ApiError ? e.message : "Não foi possível atualizar o dia.",
        });
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
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
      >
        <View style={styles.listHeader}>
          <PageHeader title="Férias" description="Toque num dia para marcar ou desmarcar." />
          <TouchableOpacity style={styles.addButton} onPress={() => setRequestModalVisible(true)}>
            <Plus color={colors.onColor} size={20} />
          </TouchableOpacity>
        </View>

        {error ? (
          <ErrorBanner message={error} />
        ) : feedback ? (
          feedback.type === "error" ? (
            <ErrorBanner message={feedback.text} />
          ) : (
            <SuccessBanner message={feedback.text} />
          )
        ) : null}

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
                    const colorSet = markColor(colors, mark?.status);
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

      {data && (
        <VacationRequestModal
          visible={requestModalVisible}
          onClose={() => setRequestModalVisible(false)}
          year={year}
          initialMonth={month}
          marks={data.marks}
          holidayDates={data.holidayDates}
          headcount={data.headcount}
          planned={data.planned}
          token={token}
          reload={() => load(year)}
          onSuccess={(message) => {
            setRequestModalVisible(false);
            setFeedback({ type: "success", text: message });
          }}
        />
      )}
    </SafeAreaView>
  );

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
}

function VacationRequestModal({
  visible,
  onClose,
  year,
  initialMonth,
  marks,
  holidayDates,
  headcount,
  planned,
  token,
  reload,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  year: number;
  initialMonth: number;
  marks: Record<string, DayMark>;
  holidayDates: Record<string, string>;
  headcount: Headcount;
  planned: number;
  token: string | null;
  reload: () => Promise<void>;
  onSuccess: (message: string) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (visible) {
      setMonth(initialMonth);
      setSelected(new Set());
      setError(null);
    }
  }, [visible, initialMonth]);

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [year, month]);

  const atFirstMonth = month === 0;
  const atLastMonth = month === 11;

  function toggleSelect(dateKey: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  function handleClose() {
    setSelected(new Set());
    setError(null);
    onClose();
  }

  const newSelections = Array.from(selected).filter((iso) => !marks[iso]).length;
  const projectedAvailable = headcount.saldo - newSelections;

  async function handleSubmit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<{ error?: string; updated?: number; failed?: { date: string; error: string }[] }>(
        "/api/mobile/ferias/toggle-dia",
        { dates: Array.from(selected) },
        token
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.updated) {
        setError(result.failed?.[0]?.error ?? "Não foi possível marcar os dias selecionados.");
        return;
      }
      await reload();
      setSelected(new Set());
      if (result.failed && result.failed.length > 0) {
        setError(`${result.updated} dia(s) atualizado(s). Falhou: ${result.failed.map((f) => f.date).join(", ")}.`);
        return;
      }
      onSuccess(
        result.updated === 1 ? "Pedido de 1 dia de férias enviado." : `Pedido de ${result.updated} dias de férias enviado.`
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível submeter o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, highlight && { color: colors.red600 }]}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pedir férias</Text>
          <TouchableOpacity onPress={handleClose}>
            <X color={colors.stone500} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {error ? <ErrorBanner message={error} /> : null}

          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => !atFirstMonth && setMonth((m) => m - 1)}
              disabled={atFirstMonth}
              style={styles.navButton}
            >
              <ChevronLeft color={atFirstMonth ? colors.stone200 : colors.stone600} size={22} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <TouchableOpacity
              onPress={() => !atLastMonth && setMonth((m) => m + 1)}
              disabled={atLastMonth}
              style={styles.navButton}
            >
              <ChevronRight color={atLastMonth ? colors.stone200 : colors.stone600} size={22} />
            </TouchableOpacity>
          </View>

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
                const mark = marks[dateKey];
                const cellDate = new Date(year, month, d);
                const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                const isPast = cellDate < today;
                const holidayLabel = holidayDates[dateKey];
                const isHoliday = Boolean(holidayLabel) && !mark;
                const disabled = isWeekend || isPast || isHoliday;
                const isSelected = selected.has(dateKey);
                const colorSet = markColor(colors, mark?.status);
                return (
                  <TouchableOpacity
                    key={di}
                    style={styles.dayCell}
                    disabled={disabled}
                    onPress={() => toggleSelect(dateKey, disabled)}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        colorSet && !isSelected && { backgroundColor: colorSet.bg },
                        !colorSet && isHoliday && styles.dayCircleHoliday,
                        isSelected && styles.dayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          colorSet && !isSelected && { color: colorSet.text },
                          isSelected && styles.dayTextSelected,
                          disabled && !colorSet && styles.dayTextDisabled,
                        ]}
                      >
                        {d}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={styles.statsRow}>
            <Stat label="Aprovados" value={headcount.approved} />
            <Stat label="Por marcar" value={planned} />
            <Stat label="Disponíveis" value={projectedAvailable} highlight={projectedAvailable < 0} />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleClose} disabled={submitting}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Guardar" onPress={handleSubmit} loading={submitting} disabled={selected.size === 0} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
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
      gap: spacing.md,
    },
    listHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    addButton: {
      backgroundColor: colors.violet600,
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
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
      borderRadius: 16,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    dayCircleHoliday: {
      backgroundColor: colors.violet50,
    },
    dayCircleSelected: {
      backgroundColor: colors.violet600,
    },
    dayText: {
      fontSize: 13,
      color: colors.stone600,
    },
    dayTextSelected: {
      color: colors.onColor,
      fontWeight: "700",
    },
    dayTextDisabled: {
      color: colors.stone200,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.stone200,
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
      borderRadius: 5,
      overflow: "hidden",
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
    modalSafeArea: {
      flex: 1,
      backgroundColor: colors.white,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.stone200,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.stone900,
    },
    modalBody: {
      padding: spacing.lg,
    },
    modalFooter: {
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.stone200,
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.stone200,
      borderRadius: radii.sm,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: colors.stone600,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

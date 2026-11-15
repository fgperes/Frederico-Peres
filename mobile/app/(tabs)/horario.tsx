import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { spacing, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import {
  addDays,
  getIsoWeekNumber,
  MONTH_ABBREV,
  timeToMinutes,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { Card, EmptyState, ErrorBanner, LoadingView, PageHeader, PrimaryButton, SuccessBanner } from "@/components/ui";
import { getWritableCalendarId, addShiftToCalendar } from "@/lib/calendar";

type Shift = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  editedAfterPublish: boolean;
  template: { name: string; color: string; breakMins: number } | null;
};
type DayEntry = {
  date: string;
  shifts: Shift[];
  absence: { label: string; isVacation: boolean } | null;
  holiday: string | null;
  workMedicineTime: string | null;
};
type HorarioData = { weekStart: string; week: DayEntry[] };

const HOUR_START = 7;
const HOUR_END = 23;
const HOUR_RANGE_MIN = (HOUR_END - HOUR_START) * 60;
const HOUR_TICKS = [7, 12, 18, 23];

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function timelinePosition(startTime: string, endTime: string): { leftPct: number; widthPct: number } {
  const startMin = timeToMinutes(startTime) - HOUR_START * 60;
  const endMin = timeToMinutes(endTime) - HOUR_START * 60;
  const leftPct = clampPct((startMin / HOUR_RANGE_MIN) * 100);
  const rightPct = clampPct((endMin / HOUR_RANGE_MIN) * 100);
  return { leftPct, widthPct: Math.max(rightPct - leftPct, 4) };
}

// Mesmo "chipTint" da grelha de Escalas na app web (schedule-grid.tsx):
// fundo e contorno derivados da cor do modelo a baixa opacidade, texto na
// própria cor do modelo. Sem modelo válido, cai nos tons neutros do tema
// (equivalente ao "violeta por omissão" da web, mas já preparado para tema
// escuro em vez de um hex fixo).
function chipTint(colors: ThemeColors, hex: string | undefined): { bg: string; border: string; text: string } {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { bg: colors.violet100, border: colors.violet200, text: colors.violet700 };
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    border: `rgba(${r}, ${g}, ${b}, 0.35)`,
    text: hex,
  };
}

// Mesma semântica da web: ponto de estado no canto do chip — alterado
// depois de publicado (vermelho), publicado (verde), ou rascunho (âmbar).
function statusDotColor(colors: ThemeColors, status: string, editedAfterPublish: boolean): string {
  if (editedAfterPublish) return colors.red500;
  return status === "PUBLISHED" ? colors.green600 : colors.amber500;
}

// Mesma fórmula que a app web usa em shiftDurationHours (src/lib/schedule.ts):
// desconta a pausa (breakMins) do modelo de turno, nunca fica negativa.
function shiftDurationMinutes(startTime: string, endTime: string, breakMins: number): number {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  const minutes = diff > 0 ? diff : diff + 24 * 60;
  return Math.max(0, minutes - breakMins);
}

function formatHours(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hours} h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

function weekRangeLabel(weekStart: Date, weekEnd: Date): string {
  const d1 = weekStart.getDate();
  const d2 = weekEnd.getDate();
  const m1 = MONTH_ABBREV[weekStart.getMonth()];
  const m2 = MONTH_ABBREV[weekEnd.getMonth()];
  return m1 === m2 ? `${d1} – ${d2} ${m2}` : `${d1} ${m1} – ${d2} ${m2}`;
}

export default function HorarioScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [weekStart, setWeekStart] = useState(() => getMonday());
  const [data, setData] = useState<HorarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"lista" | "grelha">("lista");
  const [addingWeekToCalendar, setAddingWeekToCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarSuccess, setCalendarSuccess] = useState<string | null>(null);

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
  const todayKey = toDateKey(new Date());
  const weekIncludesToday = data ? data.week.some((d) => d.date === todayKey) : false;

  const stats = useMemo(() => {
    if (!data) return { hours: "0 h", turnos: 0, folgas: 0 };
    let totalMinutes = 0;
    let turnos = 0;
    let folgas = 0;
    for (const day of data.week) {
      turnos += day.shifts.length;
      for (const s of day.shifts) totalMinutes += shiftDurationMinutes(s.startTime, s.endTime, s.template?.breakMins ?? 0);
      if (day.shifts.length === 0 && !day.absence && !day.holiday) folgas++;
    }
    return { hours: formatHours(totalMinutes), turnos, folgas };
  }, [data]);

  const legend = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, { name: string; color: string }>();
    for (const day of data.week) {
      for (const s of day.shifts) {
        const name = s.template?.name ?? "Turno";
        const color = s.template?.color ?? colors.violet500;
        seen.set(`${name}-${color}`, { name, color });
      }
    }
    return Array.from(seen.values());
  }, [data, colors.violet500]);

  const openShift = (shiftId: string) => router.push(`/horario/turno/${shiftId}`);

  const addWeekToCalendar = async () => {
    if (!data) return;
    const shifts = data.week.flatMap((day) => day.shifts.map((s) => ({ day, s })));
    if (shifts.length === 0) return;

    setAddingWeekToCalendar(true);
    setCalendarError(null);
    setCalendarSuccess(null);
    try {
      const calendarId = await getWritableCalendarId();
      let added = 0;
      for (const { day, s } of shifts) {
        try {
          await addShiftToCalendar(calendarId, {
            date: day.date,
            startTime: s.startTime,
            endTime: s.endTime,
            title: s.template?.name ?? "Turno",
          });
          added++;
        } catch {
          // continua os restantes — um turno que falhe não deve travar os outros
        }
      }
      if (added === shifts.length) {
        setCalendarSuccess(
          added === 1 ? "1 turno adicionado ao calendário." : `${added} turnos adicionados ao calendário.`
        );
      } else if (added > 0) {
        setCalendarError(`Apenas ${added} de ${shifts.length} turno(s) foram adicionados ao calendário.`);
      } else {
        setCalendarError("Não foi possível adicionar os turnos ao calendário.");
      }
    } catch (e) {
      setCalendarError(e instanceof Error ? e.message : "Não foi possível adicionar ao calendário.");
    } finally {
      setAddingWeekToCalendar(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
      >
        <PageHeader title="Horário" description="O seu horário semanal." />

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.weekHeader}>
          <View>
            <Text style={styles.weekNumber}>SEMANA {getIsoWeekNumber(weekStart)}</Text>
            <Text style={styles.weekRange}>{weekRangeLabel(weekStart, weekEnd)}</Text>
          </View>
          <View style={styles.weekNavButtons}>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft color={colors.stone600} size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight color={colors.stone600} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {loading || !data ? (
          <LoadingView />
        ) : data.week.every((d) => d.shifts.length === 0 && !d.absence && !d.holiday && !d.workMedicineTime) ? (
          <EmptyState message="Sem turnos nesta semana." />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard colors={colors} label="Planeadas" value={stats.hours} />
              <StatCard colors={colors} label="Turnos" value={String(stats.turnos)} />
              <StatCard colors={colors} label="Folgas" value={String(stats.folgas)} />
            </View>

            <View style={styles.segmented}>
              <TouchableOpacity
                style={[styles.segTab, viewMode === "lista" && styles.segTabActive]}
                onPress={() => setViewMode("lista")}
              >
                <Text style={[styles.segTabText, viewMode === "lista" && styles.segTabTextActive]}>Lista</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segTab, viewMode === "grelha" && styles.segTabActive]}
                onPress={() => setViewMode("grelha")}
              >
                <Text style={[styles.segTabText, viewMode === "grelha" && styles.segTabTextActive]}>Grelha</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarButtonWrap}>
              <PrimaryButton
                label="Adicionar semana ao calendário"
                variant="secondary"
                loading={addingWeekToCalendar}
                onPress={addWeekToCalendar}
              />
            </View>
            {calendarError ? <ErrorBanner message={calendarError} /> : null}
            {calendarSuccess ? <SuccessBanner message={calendarSuccess} /> : null}

            {viewMode === "lista" ? (
              <ListaView data={data} colors={colors} styles={styles} todayKey={todayKey} onPressShift={openShift} />
            ) : (
              <GrelhaView
                data={data}
                colors={colors}
                styles={styles}
                todayKey={todayKey}
                legend={legend}
                showNowLine={weekIncludesToday}
                onPressShift={openShift}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function StatCard({ colors, label, value }: { colors: ThemeColors; label: string; value: string }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ListaView({
  data,
  colors,
  styles,
  todayKey,
  onPressShift,
}: {
  data: HorarioData;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  todayKey: string;
  onPressShift: (id: string) => void;
}) {
  return (
    <Card style={styles.listaCard}>
      <View style={styles.hourTicksRow}>
        {HOUR_TICKS.map((h) => (
          <Text
            key={h}
            style={[
              styles.hourTick,
              { left: `${clampPct(((h - HOUR_START) / (HOUR_END - HOUR_START)) * 100)}%` },
            ]}
          >
            {h}h
          </Text>
        ))}
      </View>

      {data.week.map((day, index) => {
        const isToday = day.date === todayKey;
        const weekday = WEEKDAY_LABELS[index]?.toUpperCase() ?? "";
        const dayNum = new Date(`${day.date}T00:00:00`).getDate();

        return (
          <View key={day.date} style={[styles.listRow, isToday && styles.listRowToday]}>
            <View style={styles.listDayCol}>
              <Text style={styles.listWeekday}>{weekday}</Text>
              <View style={[styles.listDayBadge, isToday && styles.listDayBadgeToday]}>
                <Text style={[styles.listDayNumber, isToday && styles.listDayNumberToday]}>{dayNum}</Text>
              </View>
            </View>

            <View style={styles.listTrack}>
              {day.holiday ? (
                <View style={styles.listTrackMuted}>
                  <Text style={styles.listMutedText} numberOfLines={1}>
                    Feriado · {day.holiday}
                  </Text>
                </View>
              ) : day.absence ? (
                <View style={styles.listTrackMuted}>
                  <Text style={styles.listMutedText} numberOfLines={1}>
                    {day.absence.label}
                  </Text>
                </View>
              ) : day.shifts.length > 0 ? (
                <View style={styles.listTrackBase}>
                  {day.shifts.map((s) => {
                    const { leftPct, widthPct } = timelinePosition(s.startTime, s.endTime);
                    const tint = chipTint(colors, s.template?.color);
                    const dot = statusDotColor(colors, s.status, s.editedAfterPublish);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.listBlock,
                          { left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: tint.bg, borderColor: tint.border },
                        ]}
                        onPress={() => onPressShift(s.id)}
                      >
                        <View style={[styles.statusDot, { backgroundColor: dot }]} />
                        <Text style={[styles.listBlockTime, { color: tint.text }]} numberOfLines={1}>
                          {s.startTime} – {s.endTime}
                        </Text>
                        {s.template?.name && (
                          <Text style={styles.listBlockLabel} numberOfLines={1}>
                            {s.template.name}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.listFolgaWrap}>
                  <Text style={styles.listMutedText}>Folga</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      {data.week.some((d) => d.workMedicineTime) && (
        <View style={styles.workMedicineBlock}>
          {data.week
            .filter((d) => d.workMedicineTime)
            .map((d) => (
              <Text key={d.date} style={styles.workMedicineLabel}>
                Medicina do trabalho · {WEEKDAY_LABELS[data.week.indexOf(d)]} · {d.workMedicineTime}
              </Text>
            ))}
        </View>
      )}
    </Card>
  );
}

function GrelhaView({
  data,
  colors,
  styles,
  todayKey,
  legend,
  showNowLine,
  onPressShift,
}: {
  data: HorarioData;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  todayKey: string;
  legend: { name: string; color: string }[];
  showNowLine: boolean;
  onPressShift: (id: string) => void;
}) {
  const now = new Date();
  const nowPct = clampPct(((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / HOUR_RANGE_MIN) * 100);
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <Card style={styles.grelhaCard}>
      <View style={styles.legendRow}>
        {legend.map((item) => (
          <View key={`${item.name}-${item.color}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.name}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={styles.legendDotFolga} />
          <Text style={styles.legendLabel}>Folga</Text>
        </View>
      </View>

      <View style={styles.gridHeaderRow}>
        <View style={styles.gridAxisSpacer} />
        {data.week.map((day, index) => {
          const isToday = day.date === todayKey;
          const dayNum = new Date(`${day.date}T00:00:00`).getDate();
          return (
            <View key={day.date} style={styles.gridHeaderCol}>
              <Text style={styles.gridHeaderWeekday}>{WEEKDAY_LABELS[index]?.toUpperCase()}</Text>
              <View style={[styles.gridHeaderBadge, isToday && styles.gridHeaderBadgeToday]}>
                <Text style={[styles.gridHeaderDay, isToday && styles.gridHeaderDayToday]}>{dayNum}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.gridBody}>
        <View style={styles.gridAxis}>
          {HOUR_TICKS.map((h) => (
            <Text
              key={h}
              style={[styles.gridAxisLabel, { top: `${clampPct(((h - HOUR_START) / (HOUR_END - HOUR_START)) * 100)}%` }]}
            >
              {h}
            </Text>
          ))}
        </View>

        {data.week.map((day, index) => {
          const isToday = day.date === todayKey;
          return (
            <View key={day.date} style={[styles.gridDayCol, isToday && styles.gridDayColToday]}>
              {day.holiday || day.absence ? (
                <Text style={styles.gridEmptyLabel} numberOfLines={1}>
                  {day.holiday ? "Feriado" : day.absence?.label}
                </Text>
              ) : day.shifts.length === 0 ? (
                <Text style={styles.gridEmptyLabel}>Folga</Text>
              ) : (
                day.shifts.map((s) => {
                  const { leftPct: topPct, widthPct: heightPct } = timelinePosition(s.startTime, s.endTime);
                  const tint = chipTint(colors, s.template?.color);
                  const dot = statusDotColor(colors, s.status, s.editedAfterPublish);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.gridBar,
                        { top: `${topPct}%`, height: `${heightPct}%`, backgroundColor: tint.bg, borderColor: tint.border },
                      ]}
                      onPress={() => onPressShift(s.id)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: dot }]} />
                      <Text style={[styles.gridBarTime, { color: tint.text }]}>{s.startTime}</Text>
                      {s.template?.name && (
                        <Text style={styles.gridBarName} numberOfLines={1}>
                          {s.template.name}
                        </Text>
                      )}
                      <Text style={[styles.gridBarTime, { color: tint.text }]}>{s.endTime}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          );
        })}

        {showNowLine && (
          <View style={[styles.nowLine, { top: `${nowPct}%` }]} pointerEvents="none">
            <View style={styles.nowPill}>
              <Text style={styles.nowPillText}>{nowLabel}</Text>
            </View>
          </View>
        )}
      </View>
    </Card>
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
    weekHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    weekNumber: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.violet600,
      letterSpacing: 1,
    },
    weekRange: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.stone900,
      marginTop: 2,
    },
    weekNavButtons: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    navButton: {
      padding: spacing.xs,
      backgroundColor: colors.white,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    statsRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.stone200,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.stone900,
    },
    statLabel: {
      fontSize: 11,
      color: colors.stone500,
      marginTop: 2,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: colors.stone100,
      borderRadius: 999,
      padding: 3,
    },
    calendarButtonWrap: {
      marginTop: spacing.sm,
    },
    segTab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 999,
      alignItems: "center",
    },
    segTabActive: {
      backgroundColor: colors.white,
    },
    segTabText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.stone500,
    },
    segTabTextActive: {
      color: colors.violet700,
    },

    // Lista
    listaCard: {
      gap: spacing.sm,
    },
    hourTicksRow: {
      height: 14,
      marginLeft: 48,
    },
    hourTick: {
      position: "absolute",
      fontSize: 10,
      color: colors.stone400,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 10,
    },
    listRowToday: {
      backgroundColor: colors.violet50,
    },
    listDayCol: {
      width: 40,
      alignItems: "center",
    },
    listWeekday: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.stone500,
    },
    listDayBadge: {
      marginTop: 2,
      width: 22,
      height: 22,
      borderRadius: 11,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    listDayBadgeToday: {
      backgroundColor: colors.violet600,
    },
    listDayNumber: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.stone600,
    },
    listDayNumberToday: {
      color: colors.onColor,
    },
    listTrack: {
      flex: 1,
      height: 52,
    },
    listTrackBase: {
      flex: 1,
      backgroundColor: colors.stone100,
      borderRadius: 10,
      overflow: "hidden",
      position: "relative",
    },
    listTrackMuted: {
      flex: 1,
      backgroundColor: colors.stone100,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    listFolgaWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listMutedText: {
      fontSize: 12,
      color: colors.stone400,
      fontWeight: "500",
      fontStyle: "italic",
    },
    listBlock: {
      position: "absolute",
      top: 0,
      bottom: 0,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 4,
      justifyContent: "center",
    },
    listBlockTime: {
      fontSize: 11,
      fontWeight: "700",
    },
    listBlockLabel: {
      fontSize: 10,
      fontWeight: "500",
      color: colors.stone500,
    },
    statusDot: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 6,
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    workMedicineBlock: {
      marginTop: spacing.xs,
      gap: 2,
    },
    workMedicineLabel: {
      fontSize: 11,
      color: colors.green600,
      fontWeight: "600",
    },

    // Grelha
    grelhaCard: {
      gap: spacing.sm,
    },
    legendRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      overflow: "hidden",
    },
    legendDotFolga: {
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.stone400,
    },
    legendLabel: {
      fontSize: 11,
      color: colors.stone500,
    },
    gridHeaderRow: {
      flexDirection: "row",
    },
    gridAxisSpacer: {
      width: 22,
    },
    gridHeaderCol: {
      flex: 1,
      alignItems: "center",
    },
    gridHeaderWeekday: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.stone500,
    },
    gridHeaderBadge: {
      marginTop: 2,
      width: 22,
      height: 22,
      borderRadius: 11,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    gridHeaderBadgeToday: {
      backgroundColor: colors.violet600,
    },
    gridHeaderDay: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.stone600,
    },
    gridHeaderDayToday: {
      color: colors.onColor,
    },
    gridBody: {
      flexDirection: "row",
      height: 380,
      position: "relative",
    },
    gridAxis: {
      width: 22,
    },
    gridAxisLabel: {
      position: "absolute",
      fontSize: 9,
      color: colors.stone400,
    },
    gridDayCol: {
      flex: 1,
      marginHorizontal: 2,
      backgroundColor: colors.stone100,
      borderRadius: 8,
      position: "relative",
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    gridDayColToday: {
      backgroundColor: colors.violet50,
    },
    gridEmptyLabel: {
      fontSize: 10,
      color: colors.stone400,
      fontWeight: "500",
      fontStyle: "italic",
      transform: [{ rotate: "-90deg" }],
    },
    gridBar: {
      position: "absolute",
      left: 0,
      right: 0,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      paddingVertical: 4,
      justifyContent: "space-between",
    },
    gridBarTime: {
      fontSize: 9,
      fontWeight: "700",
    },
    gridBarName: {
      fontSize: 9,
      fontWeight: "500",
      color: colors.stone500,
      transform: [{ rotate: "-90deg" }],
    },
    nowLine: {
      position: "absolute",
      left: 22,
      right: 0,
      height: 2,
      backgroundColor: colors.red600,
    },
    nowPill: {
      position: "absolute",
      left: 0,
      top: -8,
      backgroundColor: colors.red600,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    nowPillText: {
      fontSize: 9,
      color: colors.onColor,
      fontWeight: "700",
    },
  });
}

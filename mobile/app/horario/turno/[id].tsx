import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { MapPin, Hourglass, Coffee } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { radii, spacing, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { timeToMinutes } from "@/lib/dates";
import { listWritableCalendars, addShiftToCalendar, type WritableCalendar } from "@/lib/calendar";
import { Card, ErrorBanner, LoadingView, PrimaryButton, SuccessBanner } from "@/components/ui";
import { CalendarAccountPicker } from "@/components/CalendarAccountPicker";

type ShiftDetail = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  template: { name: string; color: string } | null;
  breakStart: string | null;
  breakMins: number;
  locationName: string | null;
  colleagues: { id: string; name: string }[];
};

const AVATAR_PALETTE = ["#8b5cf6", "#16a34a", "#f59e0b", "#0ea5e9", "#f43f5e"];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeAt(dateIso: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

// Mesma fórmula que a app web usa em shiftDurationHours (src/lib/schedule.ts):
// desconta a pausa (breakMins) do modelo de turno, nunca fica negativa.
function formatDuration(startTime: string, endTime: string, breakMins: number): string {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  const rawMinutes = diff > 0 ? diff : diff + 24 * 60;
  const minutes = Math.max(0, rawMinutes - breakMins);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

export default function TurnoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<ShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarSuccess, setCalendarSuccess] = useState<string | null>(null);
  const [calendarChoices, setCalendarChoices] = useState<WritableCalendar[] | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<ShiftDetail>(`/api/mobile/horario/turno/${id}`, token);
    setData(result);
  }, [id, token]);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [load]);

  const handleAddToCalendar = async () => {
    if (!data) return;
    setAddingToCalendar(true);
    setCalendarError(null);
    setCalendarSuccess(null);
    try {
      const calendars = await listWritableCalendars();
      if (calendars.length === 1) {
        await addToCalendar(calendars[0]);
      } else {
        setCalendarChoices(calendars);
        setAddingToCalendar(false);
      }
    } catch (e) {
      setCalendarError(e instanceof Error ? e.message : "Não foi possível adicionar ao calendário.");
      setAddingToCalendar(false);
    }
  };

  const addToCalendar = async (calendar: WritableCalendar) => {
    if (!data) return;
    setCalendarChoices(null);
    setAddingToCalendar(true);
    try {
      await addShiftToCalendar(calendar.id, {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        title: data.template?.name ?? "Turno",
        location: data.locationName,
      });
      setCalendarSuccess(`Adicionado ao calendário "${calendar.label}".`);
    } catch (e) {
      setCalendarError(e instanceof Error ? e.message : "Não foi possível adicionar ao calendário.");
    } finally {
      setAddingToCalendar(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Turno", headerShown: true }} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Turno", headerShown: true }} />
        <View style={styles.body}>
          <ErrorBanner message={error ?? "Erro desconhecido."} />
        </View>
      </SafeAreaView>
    );
  }

  const start = timeAt(data.date, data.startTime);
  const end = timeAt(data.date, data.endTime);
  const now = new Date();
  const status = now < start ? "SCHEDULED" : now > end ? "DONE" : "ONGOING";
  const statusLabel = status === "SCHEDULED" ? "Agendado" : status === "ONGOING" ? "Em curso" : "Concluído";
  const progress = status === "ONGOING" ? Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()))) : 0;
  const remainingMin = status === "ONGOING" ? Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000)) : 0;
  const headerColor = data.template?.color ?? colors.violet500;
  const dateLabel = capitalize(
    new Date(`${data.date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    })
  );
  const breakLabel =
    data.breakMins > 0 && data.breakStart
      ? `${data.breakStart} – ${(() => {
          const [h, m] = data.breakStart!.split(":").map(Number);
          const total = h * 60 + m + data.breakMins;
          return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
        })()}`
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ title: data.template?.name ?? "Turno", headerShown: true }} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.heroCard, { backgroundColor: headerColor }]}>
          <View style={styles.heroHeaderRow}>
            <Text style={styles.heroName}>{data.template?.name ?? "Turno"}</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.heroTime}>
            {data.startTime} – {data.endTime}
          </Text>
          <Text style={styles.heroDate}>{dateLabel}</Text>

          {status === "ONGOING" && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Início {data.startTime}</Text>
                <Text style={styles.progressLabel}>
                  {remainingMin > 0 ? `Faltam ${remainingMin} min` : "A terminar"}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Card style={styles.detailsCard}>
          {data.locationName && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <MapPin color={colors.stone500} size={16} />
                <Text style={styles.detailLabel}>Local</Text>
              </View>
              <Text style={styles.detailValue}>{data.locationName}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Hourglass color={colors.stone500} size={16} />
              <Text style={styles.detailLabel}>Duração</Text>
            </View>
            <Text style={styles.detailValue}>{formatDuration(data.startTime, data.endTime, data.breakMins)}</Text>
          </View>
          {breakLabel && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Coffee color={colors.stone500} size={16} />
                <Text style={styles.detailLabel}>Pausa</Text>
              </View>
              <Text style={styles.detailValue}>{breakLabel}</Text>
            </View>
          )}
        </Card>

        {data.colleagues.length > 0 && (
          <Card style={styles.colleaguesCard}>
            <Text style={styles.colleaguesTitle}>Neste turno</Text>
            <View style={styles.colleaguesRow}>
              {data.colleagues.map((c, index) => {
                const initials = c.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p.charAt(0).toUpperCase())
                  .join("");
                const firstName = c.name.split(" ")[0];
                const avatarColor = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
                return (
                  <View key={c.id} style={styles.colleagueItem}>
                    <View style={[styles.colleagueAvatar, { backgroundColor: avatarColor }]}>
                      <Text style={styles.colleagueInitials}>{initials}</Text>
                    </View>
                    <Text style={styles.colleagueName} numberOfLines={1}>
                      {firstName}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {calendarError ? <ErrorBanner message={calendarError} /> : null}
        {calendarSuccess ? <SuccessBanner message={calendarSuccess} /> : null}

        <PrimaryButton
          label="Adicionar ao calendário"
          variant="secondary"
          loading={addingToCalendar}
          onPress={handleAddToCalendar}
        />
      </ScrollView>

      <CalendarAccountPicker
        visible={calendarChoices !== null}
        calendars={calendarChoices ?? []}
        onSelect={addToCalendar}
        onClose={() => setCalendarChoices(null)}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.stone50,
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    heroCard: {
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    heroHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.onColor,
    },
    heroBadge: {
      backgroundColor: "rgba(255,255,255,0.25)",
      borderRadius: radii.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    heroBadgeText: {
      color: colors.onColor,
      fontSize: 11,
      fontWeight: "700",
    },
    heroTime: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.onColor,
      marginTop: spacing.sm,
    },
    heroDate: {
      fontSize: 14,
      color: colors.onColor,
      opacity: 0.85,
      marginTop: 2,
      textTransform: "capitalize",
    },
    progressWrap: {
      marginTop: spacing.md,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.3)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.onColor,
      borderRadius: 3,
    },
    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.xs,
    },
    progressLabel: {
      fontSize: 11,
      color: colors.onColor,
      opacity: 0.9,
    },
    detailsCard: {
      gap: spacing.sm,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    detailLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.stone500,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.stone900,
    },
    colleaguesCard: {
      gap: spacing.sm,
    },
    colleaguesTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.stone900,
    },
    colleaguesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
    },
    colleagueItem: {
      alignItems: "center",
      width: 56,
    },
    colleagueAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    colleagueInitials: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
    colleagueName: {
      fontSize: 11,
      color: colors.stone600,
      marginTop: 4,
    },
  });
}

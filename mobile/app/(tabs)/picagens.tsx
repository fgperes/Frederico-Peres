import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { colors, radii, spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/dates";
import { Badge, Card, EmptyState, ErrorBanner, LoadingView, PageHeader, PrimaryButton } from "@/components/ui";

type ClockPhase = "NOT_CLOCKED_IN" | "WORKING" | "MEAL_AVAILABLE" | "ON_MEAL" | "AFTER_MEAL" | "CLOCKED_OUT";
type MealStatus = {
  phase: ClockPhase;
  showMealButtons: boolean;
  hoursUntilMealAvailable: number | null;
} | null;

type TimeClockEntry = {
  id: string;
  type: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
  timestamp: string;
  hasDeviation: boolean;
  deviationType: string | null;
  justification: string | null;
  justificationStatus: string | null;
};

const TYPE_LABELS: Record<TimeClockEntry["type"], string> = {
  CLOCK_IN: "Entrada",
  CLOCK_OUT: "Saída",
  BREAK_START: "Início Refeição",
  BREAK_END: "Fim Refeição",
};

type ButtonType = TimeClockEntry["type"];

function buildButtons(status: MealStatus): { type: ButtonType; label: string; enabled: boolean; color: string }[] {
  const phase = status?.phase ?? "NOT_CLOCKED_IN";
  const showMealButtons = status?.showMealButtons ?? true;

  const buttons: { type: ButtonType; label: string; enabled: boolean; color: string }[] = [
    { type: "CLOCK_IN", label: "Entrada", enabled: phase === "NOT_CLOCKED_IN" || phase === "CLOCKED_OUT", color: colors.green600 },
  ];

  if (showMealButtons && (phase === "WORKING" || phase === "MEAL_AVAILABLE")) {
    buttons.push({ type: "BREAK_START", label: "Início Refeição", enabled: phase === "MEAL_AVAILABLE", color: colors.amber500 });
  }
  if (phase === "ON_MEAL") {
    buttons.push({ type: "BREAK_END", label: "Fim Refeição", enabled: true, color: colors.amber500 });
  }

  buttons.push({
    type: "CLOCK_OUT",
    label: "Saída",
    enabled: phase === "WORKING" || phase === "MEAL_AVAILABLE" || phase === "AFTER_MEAL",
    color: colors.red600,
  });

  return buttons;
}

async function getLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? undefined,
    };
  } catch {
    return null;
  }
}

export default function PicagensScreen() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [mealStatus, setMealStatus] = useState<MealStatus>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clocking, setClocking] = useState<ButtonType | null>(null);
  const [justifyEntry, setJustifyEntry] = useState<TimeClockEntry | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<{ entries: TimeClockEntry[]; mealStatus: MealStatus }>("/api/mobile/picagens", token);
    setEntries(result.entries);
    setMealStatus(result.mealStatus);
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

  const handleClock = async (type: ButtonType) => {
    setClocking(type);
    try {
      const coords = await getLocation();
      await api.post("/api/mobile/picagens", { type, ...coords }, token);
      await load();
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível registar a picagem.");
    } finally {
      setClocking(null);
    }
  };

  const buttons = buildButtons(mealStatus);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        contentContainerStyle={styles.list}
        data={entries}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
        ListHeaderComponent={
          <View style={styles.listHeaderWrap}>
            <PageHeader title="Picagens" description="Registe a sua entrada, saída e pausas." />
            {error ? <ErrorBanner message={error} /> : null}
            {loading ? (
              <LoadingView />
            ) : (
              <View style={styles.buttonRow}>
                {buttons.map((b) => (
                  <TouchableOpacity
                    key={b.type}
                    style={[styles.clockButton, { backgroundColor: b.color }, !b.enabled && styles.clockButtonDisabled]}
                    disabled={!b.enabled || clocking !== null}
                    onPress={() => handleClock(b.type)}
                  >
                    <Text style={styles.clockButtonText}>{clocking === b.type ? "A registar…" : b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.historyTitle}>Últimas picagens</Text>
          </View>
        }
        ListEmptyComponent={!loading ? <EmptyState message="Ainda não há picagens registadas." /> : null}
        renderItem={({ item }) => (
          <Card style={styles.entryItem}>
            <View style={styles.entryRow}>
              <Text style={styles.entryType}>{TYPE_LABELS[item.type]}</Text>
              <Text style={styles.entryTime}>{formatDateTime(item.timestamp)}</Text>
            </View>
            {item.hasDeviation && (
              <View style={styles.deviationRow}>
                <Badge color={item.justificationStatus === "APPROVED" ? "green" : item.justificationStatus === "REJECTED" ? "red" : "amber"}>
                  {item.deviationType === "LATE"
                    ? "Atraso"
                    : item.deviationType === "EARLY_LEAVE"
                      ? "Saída antecipada"
                      : item.deviationType === "OVERTIME"
                        ? "Horas extra"
                        : "Desvio"}
                </Badge>
                {!item.justification ? (
                  <TouchableOpacity onPress={() => setJustifyEntry(item)}>
                    <Text style={styles.justifyLink}>Justificar</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.justificationText}>{item.justification}</Text>
                )}
              </View>
            )}
          </Card>
        )}
      />

      {justifyEntry && (
        <JustifyModal
          entry={justifyEntry}
          token={token}
          onClose={() => setJustifyEntry(null)}
          onSuccess={async () => {
            setJustifyEntry(null);
            await load();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function JustifyModal({
  entry,
  token,
  onClose,
  onSuccess,
}: {
  entry: TimeClockEntry;
  token: string | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError("Indique uma justificação.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/mobile/picagens/${entry.id}/justificar`, { justification: text.trim() }, token);
      await onSuccess();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível submeter a justificação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Justificar desvio</Text>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.stone500} size={22} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          {error ? <ErrorBanner message={error} /> : null}
          <Text style={styles.label}>
            {TYPE_LABELS[entry.type]} · {formatDateTime(entry.timestamp)}
          </Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Explique o motivo do desvio"
            placeholderTextColor={colors.stone400}
            value={text}
            onChangeText={setText}
          />
          <View style={{ marginTop: spacing.lg }}>
            <PrimaryButton label="Submeter" onPress={handleSubmit} loading={submitting} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.stone50,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  listHeaderWrap: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  clockButton: {
    flexGrow: 1,
    paddingVertical: 16,
    borderRadius: radii.sm,
    alignItems: "center",
    minWidth: "45%",
  },
  clockButtonDisabled: {
    opacity: 0.35,
  },
  clockButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.stone900,
  },
  entryItem: {
    gap: spacing.xs,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryType: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.stone900,
  },
  entryTime: {
    fontSize: 13,
    color: colors.stone500,
  },
  deviationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  justifyLink: {
    color: colors.violet600,
    fontSize: 13,
    fontWeight: "600",
  },
  justificationText: {
    fontSize: 13,
    color: colors.stone500,
    fontStyle: "italic",
    flexShrink: 1,
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.stone600,
    marginBottom: spacing.sm,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: radii.sm,
    padding: spacing.md,
    fontSize: 14,
    color: colors.stone900,
    textAlignVertical: "top",
    minHeight: 100,
  },
});

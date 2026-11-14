import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { spacing, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { Badge, Card, EmptyState, ErrorBanner, LoadingView, PrimaryButton, SuccessBanner } from "@/components/ui";

type PendingKind = "VACATION_PENDING" | "VACATION_CANCEL" | "ABSENCE";
type PendingItem = {
  key: string;
  kind: PendingKind;
  typeLabel: string;
  startDate: string;
  endDate: string;
  days: number;
  dates: string[];
  absenceId: string | null;
};

function badgeColor(kind: PendingKind): "violet" | "amber" {
  return kind === "VACATION_CANCEL" ? "amber" : "violet";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PedidosPendentesScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cancelingKey, setCancelingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<{ items: PendingItem[] }>("/api/mobile/pedidos-pendentes", token);
    setItems(result.items);
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

  const doCancel = async (item: PendingItem) => {
    setCancelingKey(item.key);
    setError(null);
    setSuccess(null);
    try {
      const result =
        item.kind === "ABSENCE"
          ? await api.post<{ error?: string }>(`/api/mobile/ausencias/${item.absenceId}/cancelar`, {}, token)
          : await api.post<{ error?: string }>("/api/mobile/ferias/toggle-dia", { dates: item.dates }, token);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Pedido cancelado.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível cancelar o pedido.");
    } finally {
      setCancelingKey(null);
    }
  };

  const confirmCancel = (item: PendingItem) => {
    Alert.alert("Cancelar pedido", "Tem a certeza que quer cancelar este pedido?", [
      { text: "Não", style: "cancel" },
      { text: "Sim, cancelar", style: "destructive", onPress: () => doCancel(item) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Pedidos pendentes", headerShown: true }} />
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(i) => i.key}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
          ListHeaderComponent={
            error || success ? (
              <View style={styles.header}>
                {error ? <ErrorBanner message={error} /> : null}
                {success ? <SuccessBanner message={success} /> : null}
              </View>
            ) : null
          }
          ListEmptyComponent={<EmptyState message="Sem pedidos pendentes." />}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <Badge color={badgeColor(item.kind)}>{item.typeLabel}</Badge>
              <Text style={styles.dates}>
                {formatDate(item.startDate)}
                {item.endDate !== item.startDate ? ` – ${formatDate(item.endDate)}` : ""} · {item.days} dia(s)
              </Text>
              <View style={styles.actionButton}>
                <PrimaryButton
                  label="Cancelar pedido"
                  variant="danger"
                  loading={cancelingKey === item.key}
                  onPress={() => confirmCancel(item)}
                />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.stone50,
    },
    list: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    header: {
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    item: {
      gap: spacing.xs,
    },
    dates: {
      fontSize: 13,
      color: colors.stone600,
    },
    actionButton: {
      marginTop: spacing.sm,
    },
  });
}

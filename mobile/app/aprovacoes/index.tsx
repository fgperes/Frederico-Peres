import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { spacing, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { Badge, Card, EmptyState, ErrorBanner, LoadingView, PrimaryButton, SuccessBanner } from "@/components/ui";

type ApprovalKind = "VACATION_PERIOD" | "VACATION_CANCEL" | "ABSENCE";
type ApprovalItem = {
  key: string;
  kind: ApprovalKind;
  absenceIds: string[];
  employeeName: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  days: number;
};

function badgeColor(kind: ApprovalKind): "violet" | "amber" {
  return kind === "VACATION_CANCEL" ? "amber" : "violet";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AprovacoesScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [decidingKey, setDecidingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<{ canApprove: boolean; items: ApprovalItem[] }>("/api/mobile/aprovacoes", token);
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

  const decide = async (item: ApprovalItem, decision: "APPROVED" | "REJECTED") => {
    setDecidingKey(item.key);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.post<{ error?: string }>(
        "/api/mobile/aprovacoes",
        { kind: item.kind, absenceIds: item.absenceIds, decision },
        token
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(decision === "APPROVED" ? "Pedido aprovado." : "Pedido rejeitado.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível decidir o pedido.");
    } finally {
      setDecidingKey(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Aprovações", headerShown: true }} />
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
          ListEmptyComponent={<EmptyState message="Sem pedidos pendentes de aprovação." />}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <Badge color={badgeColor(item.kind)}>{item.typeLabel}</Badge>
              <Text style={styles.employeeName}>{item.employeeName}</Text>
              <Text style={styles.dates}>
                {formatDate(item.startDate)}
                {item.endDate !== item.startDate ? ` – ${formatDate(item.endDate)}` : ""} · {item.days} dia(s)
              </Text>
              <View style={styles.actions}>
                <View style={styles.actionButton}>
                  <PrimaryButton
                    label="Rejeitar"
                    variant="danger"
                    loading={decidingKey === item.key}
                    onPress={() => decide(item, "REJECTED")}
                  />
                </View>
                <View style={styles.actionButton}>
                  <PrimaryButton
                    label="Aprovar"
                    variant="success"
                    loading={decidingKey === item.key}
                    onPress={() => decide(item, "APPROVED")}
                  />
                </View>
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
    employeeName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.stone900,
    },
    dates: {
      fontSize: 13,
      color: colors.stone600,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });
}

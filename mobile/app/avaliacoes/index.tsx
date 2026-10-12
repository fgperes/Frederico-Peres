import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import { formatDateShort } from "@/lib/dates";
import { Badge, Card, EmptyState, ErrorBanner, LoadingView } from "@/components/ui";

type EvaluationSummary = {
  id: string;
  status: string;
  scheduledDate: string;
  selfCompletedAt: string | null;
  managerCompletedAt: string | null;
  template: { name: string; hasSelfEvaluation: boolean };
};

export default function AvaliacoesScreen() {
  const { token } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<{ evaluations: EvaluationSummary[] }>("/api/mobile/avaliacoes", token);
    setEvaluations(result.evaluations);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Avaliações", headerShown: true }} />
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={evaluations}
          keyExtractor={(e) => e.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
          ListHeaderComponent={error ? <ErrorBanner message={error} /> : null}
          ListEmptyComponent={<EmptyState message="Ainda não tem avaliações." />}
          renderItem={({ item }) => {
            const pendingSelf = item.template.hasSelfEvaluation && !item.selfCompletedAt;
            return (
              <TouchableOpacity onPress={() => router.push(`/avaliacoes/${item.id}`)}>
                <Card style={styles.item}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.template.name}</Text>
                    {pendingSelf ? <Badge color="amber">Por preencher</Badge> : <Badge color="stone">{item.status}</Badge>}
                  </View>
                  <Text style={styles.itemDate}>{formatDateShort(item.scheduledDate)}</Text>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
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
  item: {
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.stone900,
  },
  itemDate: {
    fontSize: 13,
    color: colors.stone500,
  },
});

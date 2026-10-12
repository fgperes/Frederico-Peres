import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Bell } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import { Card, EmptyState, ErrorBanner, LoadingView } from "@/components/ui";

type NotificationItem = { id: string; label: string; count: number };

export default function NotificacoesScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<{ items: NotificationItem[]; unreadMessages: number }>(
      "/api/mobile/notificacoes",
      token
    );
    setItems(result.items);
    setUnreadMessages(result.unreadMessages);
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
      <Stack.Screen options={{ title: "Notificações", headerShown: true }} />
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
          ListHeaderComponent={
            <View style={styles.header}>
              {error ? <ErrorBanner message={error} /> : null}
              {unreadMessages > 0 && (
                <Card style={styles.messageCard}>
                  <Text style={styles.messageText}>
                    Tem {unreadMessages} mensagem{unreadMessages > 1 ? "s" : ""} por ler.
                  </Text>
                </Card>
              )}
            </View>
          }
          ListEmptyComponent={<EmptyState message="Sem notificações de momento." />}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <Bell color={colors.violet600} size={18} />
              <Text style={styles.itemLabel}>{item.label}</Text>
              {item.count > 1 && <Text style={styles.itemCount}>{item.count}</Text>}
            </Card>
          )}
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
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  messageCard: {
    backgroundColor: colors.violet50,
    borderColor: colors.violet200,
  },
  messageText: {
    color: colors.violet700,
    fontSize: 13,
    fontWeight: "500",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.stone900,
  },
  itemCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.violet600,
  },
});

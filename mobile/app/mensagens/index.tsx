import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { spacing, radii, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { Card, EmptyState, ErrorBanner, LoadingView, PrimaryButton, SuccessBanner } from "@/components/ui";

type Recipient = { id: string; name: string; email: string };
type InboxMessage = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  sender: { name: string };
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function MensagensScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<"inbox" | "compose">("inbox");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    const result = await api.get<{ recipients: Recipient[]; messages: InboxMessage[] }>("/api/mobile/mensagens", token);
    setRecipients(result.recipients);
    setMessages(result.messages);
  }, [token]);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (recipients.length > 0 && !recipientId) setRecipientId(recipients[0].id);
  }, [recipients, recipientId]);

  const handleOpenMessage = async (message: InboxMessage) => {
    if (message.readAt) return;
    try {
      await api.post(`/api/mobile/mensagens/${message.id}/ler`, {}, token);
      await load();
    } catch {
      // Falha a marcar como lida não impede a leitura da mensagem.
    }
  };

  const handleSend = async () => {
    if (!recipientId) {
      setSendError("Selecione um destinatário.");
      return;
    }
    if (!body.trim()) {
      setSendError("Escreva uma mensagem.");
      return;
    }
    setSubmitting(true);
    setSendError(null);
    setSent(false);
    try {
      const result = await api.post<{ error?: string }>(
        "/api/mobile/mensagens",
        { recipientId, body: body.trim() },
        token
      );
      if (result.error) {
        setSendError(result.error);
        return;
      }
      setBody("");
      setSent(true);
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Mensagens", headerShown: true }} />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "inbox" && styles.tabButtonActive]}
          onPress={() => setTab("inbox")}
        >
          <Text style={[styles.tabButtonText, tab === "inbox" && styles.tabButtonTextActive]}>Recebidas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === "compose" && styles.tabButtonActive]}
          onPress={() => setTab("compose")}
        >
          <Text style={[styles.tabButtonText, tab === "compose" && styles.tabButtonTextActive]}>Nova</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingView />
      ) : tab === "inbox" ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={error ? <ErrorBanner message={error} /> : null}
          ListEmptyComponent={<EmptyState message="Sem mensagens recebidas." />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleOpenMessage(item)}>
              <Card style={[styles.messageItem, !item.readAt && styles.messageItemUnread]}>
                <View style={styles.messageItemHeader}>
                  <Text style={styles.messageSender}>{item.sender.name}</Text>
                  {!item.readAt && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.messageBody}>{item.body}</Text>
                <Text style={styles.messageDate}>{formatDateTime(item.createdAt)}</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.compose}>
          {recipients.length === 0 ? (
            <EmptyState message="Não há destinatários disponíveis para o seu perfil." />
          ) : (
            <>
              <Text style={styles.label}>Destinatário</Text>
              <View style={styles.recipientList}>
                {recipients.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.recipientChip, recipientId === r.id && styles.recipientChipSelected]}
                    onPress={() => setRecipientId(r.id)}
                  >
                    <Text
                      style={[styles.recipientChipText, recipientId === r.id && styles.recipientChipTextSelected]}
                    >
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Mensagem</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={5}
                maxLength={1000}
                placeholder="Escreva a sua mensagem..."
                placeholderTextColor={colors.stone400}
                value={body}
                onChangeText={setBody}
              />

              {sendError ? <ErrorBanner message={sendError} /> : null}
              {sent && <SuccessBanner message="Mensagem enviada." />}

              <View style={{ marginTop: spacing.md }}>
                <PrimaryButton label="Enviar" onPress={handleSend} loading={submitting} />
              </View>
            </>
          )}
        </View>
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
    tabs: {
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.lg,
      paddingBottom: 0,
    },
    tabButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radii.sm,
      alignItems: "center",
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    tabButtonActive: {
      backgroundColor: colors.violet600,
      borderColor: colors.violet600,
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.stone600,
    },
    tabButtonTextActive: {
      color: colors.onColor,
    },
    list: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    messageItem: {
      gap: spacing.xs,
    },
    messageItemUnread: {
      backgroundColor: colors.violet50,
      borderColor: colors.violet200,
    },
    messageItemHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    messageSender: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.stone900,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: colors.violet600,
    },
    messageBody: {
      fontSize: 14,
      color: colors.stone600,
    },
    messageDate: {
      fontSize: 12,
      color: colors.stone400,
    },
    compose: {
      flex: 1,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.stone600,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    recipientList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    recipientChip: {
      borderWidth: 1,
      borderColor: colors.stone200,
      borderRadius: radii.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    recipientChipSelected: {
      backgroundColor: colors.violet600,
      borderColor: colors.violet600,
    },
    recipientChipText: {
      fontSize: 13,
      color: colors.stone600,
    },
    recipientChipTextSelected: {
      color: colors.onColor,
      fontWeight: "600",
    },
    textArea: {
      borderWidth: 1,
      borderColor: colors.stone200,
      borderRadius: radii.sm,
      padding: spacing.md,
      fontSize: 14,
      color: colors.stone900,
      textAlignVertical: "top",
      minHeight: 120,
    },
  });
}

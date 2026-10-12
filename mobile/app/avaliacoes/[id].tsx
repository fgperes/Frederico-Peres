import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { colors, radii, spacing } from "@/lib/theme";
import { Badge, Card, ErrorBanner, LoadingView, PrimaryButton } from "@/components/ui";

type Option = { id: string; label: string; order: number };
type Question = {
  id: string;
  order: number;
  text: string;
  type: "SCALE" | "SINGLE_CHOICE" | "TEXT";
  scaleMin: number | null;
  scaleMax: number | null;
  options: Option[];
};
type Answer = { questionId: string; respondent: string; rawValue: number | null; selectedOptionId: string | null; textValue: string | null };
type EvaluationDetail = {
  id: string;
  status: string;
  template: { name: string; hasSelfEvaluation: boolean; questions: Question[] };
  answers: Answer[];
};

type AnswerDraft = { rawValue?: number; selectedOptionId?: string; textValue?: string };

export default function AvaliacaoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<EvaluationDetail | null>(null);
  const [canSubmitSelf, setCanSubmitSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, AnswerDraft>>({});

  const load = useCallback(async () => {
    const result = await api.get<{ evaluation: EvaluationDetail; canSubmitSelf: boolean }>(
      `/api/mobile/avaliacoes/${id}`,
      token
    );
    setData(result.evaluation);
    setCanSubmitSelf(result.canSubmitSelf);
    const existing: Record<string, AnswerDraft> = {};
    for (const a of result.evaluation.answers) {
      if (a.respondent !== "SELF") continue;
      existing[a.questionId] = {
        rawValue: a.rawValue ?? undefined,
        selectedOptionId: a.selectedOptionId ?? undefined,
        textValue: a.textValue ?? undefined,
      };
    }
    setDrafts(existing);
  }, [id, token]);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [load]);

  const handleSubmit = async () => {
    if (!data) return;
    const answers = data.template.questions.map((q) => ({ questionId: q.id, ...drafts[q.id] }));
    setSubmitting(true);
    try {
      const result = await api.post<{ error?: string }>(
        `/api/mobile/avaliacoes/${id}/autoavaliacao`,
        { answers },
        token
      );
      if (result.error) {
        Alert.alert("Erro", result.error);
        return;
      }
      Alert.alert("Autoavaliação submetida", "Obrigado por preencher a sua autoavaliação.");
      await load();
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível submeter.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ title: data?.template.name ?? "Avaliação", headerShown: true }} />
      {loading ? (
        <LoadingView />
      ) : error || !data ? (
        <View style={styles.body}>
          <ErrorBanner message={error ?? "Erro desconhecido."} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Badge color={canSubmitSelf ? "amber" : "stone"}>{canSubmitSelf ? "Por preencher" : "Autoavaliação concluída"}</Badge>

          {data.template.questions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((q) => (
              <Card key={q.id} style={styles.questionCard}>
                <Text style={styles.questionText}>{q.text}</Text>

                {q.type === "SCALE" && (
                  <View style={styles.scaleRow}>
                    {Array.from(
                      { length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 },
                      (_, i) => (q.scaleMin ?? 1) + i
                    ).map((n) => (
                      <TouchableOpacity
                        key={n}
                        disabled={!canSubmitSelf}
                        style={[styles.scaleOption, drafts[q.id]?.rawValue === n && styles.scaleOptionSelected]}
                        onPress={() => setDrafts((d) => ({ ...d, [q.id]: { rawValue: n } }))}
                      >
                        <Text
                          style={[
                            styles.scaleOptionText,
                            drafts[q.id]?.rawValue === n && styles.scaleOptionTextSelected,
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {q.type === "SINGLE_CHOICE" && (
                  <View style={styles.optionsList}>
                    {q.options
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((o) => (
                        <TouchableOpacity
                          key={o.id}
                          disabled={!canSubmitSelf}
                          style={[styles.choiceRow, drafts[q.id]?.selectedOptionId === o.id && styles.choiceRowSelected]}
                          onPress={() => setDrafts((d) => ({ ...d, [q.id]: { selectedOptionId: o.id } }))}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              drafts[q.id]?.selectedOptionId === o.id && styles.choiceTextSelected,
                            ]}
                          >
                            {o.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}

                {q.type === "TEXT" && (
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={3}
                    editable={canSubmitSelf}
                    placeholder="Escreva a sua resposta"
                    placeholderTextColor={colors.stone400}
                    value={drafts[q.id]?.textValue ?? ""}
                    onChangeText={(text) => setDrafts((d) => ({ ...d, [q.id]: { textValue: text } }))}
                  />
                )}
              </Card>
            ))}

          {canSubmitSelf && (
            <PrimaryButton label="Submeter autoavaliação" onPress={handleSubmit} loading={submitting} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.stone50,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  questionCard: {
    gap: spacing.sm,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.stone900,
  },
  scaleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  scaleOption: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.stone200,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleOptionSelected: {
    backgroundColor: colors.violet600,
    borderColor: colors.violet600,
  },
  scaleOptionText: {
    fontSize: 15,
    color: colors.stone600,
  },
  scaleOptionTextSelected: {
    color: colors.white,
    fontWeight: "700",
  },
  optionsList: {
    gap: spacing.xs,
  },
  choiceRow: {
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  choiceRowSelected: {
    borderColor: colors.violet600,
    backgroundColor: colors.violet50,
  },
  choiceText: {
    fontSize: 14,
    color: colors.stone600,
  },
  choiceTextSelected: {
    color: colors.violet700,
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
    minHeight: 80,
  },
});

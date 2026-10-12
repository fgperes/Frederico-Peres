import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Plus, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { colors, radii, spacing } from "@/lib/theme";
import { formatDateShort, toDateKey } from "@/lib/dates";
import { Badge, Card, EmptyState, ErrorBanner, LoadingView, PageHeader, PrimaryButton } from "@/components/ui";

type AbsenceType = { id: string; name: string; unitType: string; requiresDocument: boolean };
type Absence = {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string | null;
  absenceType: { name: string };
};

function statusBadge(status: string) {
  if (status === "APPROVED") return <Badge color="green">Aprovada</Badge>;
  if (status === "REJECTED") return <Badge color="red">Rejeitada</Badge>;
  if (status === "CANCELLED") return <Badge color="stone">Cancelada</Badge>;
  return <Badge color="amber">Pendente</Badge>;
}

export default function AusenciasScreen() {
  const { token } = useAuth();
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    const result = await api.get<{ absenceTypes: AbsenceType[]; absences: Absence[] }>(
      "/api/mobile/ausencias",
      token
    );
    setAbsenceTypes(result.absenceTypes);
    setAbsences(result.absences);
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

  const handleCancel = (id: string) => {
    Alert.alert("Cancelar pedido", "Tem a certeza que quer cancelar este pedido de ausência?", [
      { text: "Não", style: "cancel" },
      {
        text: "Sim, cancelar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/mobile/ausencias/${id}/cancelar`, {}, token);
            await load();
          } catch (e) {
            Alert.alert("Erro", e instanceof ApiError ? e.message : "Não foi possível cancelar.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.listHeader}>
        <PageHeader title="Ausências" description="Pedidos de ausência e respetivo estado." />
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Plus color={colors.white} size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={absences}
          keyExtractor={(a) => a.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
          ListHeaderComponent={error ? <ErrorBanner message={error} /> : null}
          ListEmptyComponent={<EmptyState message="Ainda não tem pedidos de ausência." />}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemType}>{item.absenceType.name}</Text>
                {statusBadge(item.status)}
              </View>
              <Text style={styles.itemDates}>
                {formatDateShort(item.startDate)}
                {item.endDate !== item.startDate ? ` – ${formatDateShort(item.endDate)}` : ""} · {item.days} dia(s)
              </Text>
              {item.reason ? <Text style={styles.itemReason}>{item.reason}</Text> : null}
              {item.status === "PENDING" && (
                <TouchableOpacity onPress={() => handleCancel(item.id)}>
                  <Text style={styles.cancelLink}>Cancelar pedido</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        />
      )}

      <RequestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        absenceTypes={absenceTypes}
        token={token}
        onSuccess={async () => {
          setModalVisible(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function RequestModal({
  visible,
  onClose,
  absenceTypes,
  token,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  absenceTypes: AbsenceType[];
  token: string | null;
  onSuccess: () => Promise<void>;
}) {
  const [typeId, setTypeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && absenceTypes.length > 0 && !typeId) setTypeId(absenceTypes[0].id);
  }, [visible, absenceTypes, typeId]);

  const handleSubmit = async () => {
    if (!typeId) {
      setError("Selecione um tipo de ausência.");
      return;
    }
    if (endDate < startDate) {
      setError("A data final não pode ser anterior à data inicial.");
      return;
    }
    const dates: string[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      dates.push(toDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<{ error?: string }>(
        "/api/mobile/ausencias",
        { absenceTypeId: typeId, dates, reason: reason || undefined },
        token
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setReason("");
      await onSuccess();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível submeter o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pedir ausência</Text>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.stone500} size={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          {error ? <ErrorBanner message={error} /> : null}

          <Text style={styles.label}>Tipo de ausência</Text>
          <View style={styles.typeList}>
            {absenceTypes.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, typeId === t.id && styles.typeChipSelected]}
                onPress={() => setTypeId(t.id)}
              >
                <Text style={[styles.typeChipText, typeId === t.id && styles.typeChipTextSelected]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Data inicial</Text>
          <DateTimePicker
            value={startDate}
            mode="date"
            display="compact"
            onChange={(_, date) => date && setStartDate(date)}
          />

          <Text style={styles.label}>Data final</Text>
          <DateTimePicker
            value={endDate}
            mode="date"
            display="compact"
            onChange={(_, date) => date && setEndDate(date)}
          />

          <Text style={styles.label}>Motivo (opcional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            placeholder="Descreva o motivo, se aplicável"
            placeholderTextColor={colors.stone400}
            value={reason}
            onChangeText={setReason}
          />

          <View style={{ marginTop: spacing.lg }}>
            <PrimaryButton label="Submeter pedido" onPress={handleSubmit} loading={submitting} />
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
  listHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.violet600,
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm,
  },
  item: {
    gap: spacing.xs,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemType: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.stone900,
  },
  itemDates: {
    fontSize: 13,
    color: colors.stone600,
  },
  itemReason: {
    fontSize: 13,
    color: colors.stone500,
    fontStyle: "italic",
  },
  cancelLink: {
    color: colors.red600,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.xs,
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
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.stone600,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  typeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typeChipSelected: {
    backgroundColor: colors.violet600,
    borderColor: colors.violet600,
  },
  typeChipText: {
    fontSize: 13,
    color: colors.stone600,
  },
  typeChipTextSelected: {
    color: colors.white,
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

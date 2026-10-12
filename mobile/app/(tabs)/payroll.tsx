import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Download, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, API_BASE_URL, getToken } from "@/lib/api";
import { colors, radii, spacing } from "@/lib/theme";
import { MONTH_NAMES } from "@/lib/dates";
import { Card, EmptyState, ErrorBanner, LoadingView, PageHeader, PrimaryButton } from "@/components/ui";

type PayslipSummary = { year: number; month: number; grossTotal: number; netTotal: number; employerCost: number; generatedAt: string };
type PayrollListData = { baseSalary: number | null; weeklyHours: number | null; payslips: PayslipSummary[] };
type PayslipLine = { label: string; value: number };
type PayslipDetail = {
  employeeName: string;
  jobTitle: string;
  year: number;
  month: number;
  generatedAt: string;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  grossTotal: number;
  netTotal: number;
  employerCost: number;
  workedHours: number;
  workedDays: number;
  ytdGross: number;
  ytdIrs: number;
  ytdSocialSecurity: number;
};

function fmt(value: number): string {
  return `${value.toFixed(2)} €`;
}

export default function PayrollScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<PayrollListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null);

  const load = useCallback(async () => {
    const result = await api.get<PayrollListData>("/api/mobile/payroll", token);
    setData(result);
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={data?.payslips ?? []}
          keyExtractor={(p) => `${p.year}-${p.month}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet600} />}
          ListHeaderComponent={
            <View style={styles.listHeaderWrap}>
              <PageHeader title="Vencimento" description="Histórico dos seus recibos de vencimento." />
              {error ? <ErrorBanner message={error} /> : null}
            </View>
          }
          ListEmptyComponent={<EmptyState message="Ainda não há recibos gerados." />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelected({ year: item.year, month: item.month })}>
              <Card style={styles.item}>
                <View>
                  <Text style={styles.itemPeriod}>
                    {MONTH_NAMES[item.month - 1]} {item.year}
                  </Text>
                  <Text style={styles.itemGross}>Bruto {fmt(item.grossTotal)}</Text>
                </View>
                <Text style={styles.itemNet}>{fmt(item.netTotal)}</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {selected && (
        <PayslipDetailModal
          year={selected.year}
          month={selected.month}
          token={token}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
  );
}

function PayslipDetailModal({
  year,
  month,
  token,
  onClose,
}: {
  year: number;
  month: number;
  token: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api
      .get<PayslipDetail>(`/api/mobile/payroll/${year}/${month}`, token)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Não foi possível carregar o recibo."))
      .finally(() => setLoading(false));
  }, [year, month, token]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const currentToken = token ?? (await getToken());
      const destination = new Directory(Paths.cache);
      const file = await File.downloadFileAsync(
        `${API_BASE_URL}/api/mobile/payroll/${year}/${month}/pdf`,
        destination,
        { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : undefined, idempotent: true }
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
      } else {
        Alert.alert("Transferido", `Recibo guardado em ${file.uri}`);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível transferir o PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.stone500} size={22} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingView />
        ) : error || !detail ? (
          <View style={styles.modalBody}>
            <ErrorBanner message={error ?? "Erro desconhecido."} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Vencimentos</Text>
              {detail.earnings.map((l, i) => (
                <LineRow key={i} label={l.label} value={l.value} />
              ))}
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Descontos</Text>
              {detail.deductions.map((l, i) => (
                <LineRow key={i} label={l.label} value={l.value} />
              ))}
            </Card>

            <Card style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total bruto</Text>
                <Text style={styles.totalValue}>{fmt(detail.grossTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelBig}>Total líquido</Text>
                <Text style={styles.totalValueBig}>{fmt(detail.netTotal)}</Text>
              </View>
            </Card>

            <PrimaryButton
              label="Transferir / partilhar PDF"
              onPress={handleDownload}
              loading={downloading}
              variant="secondary"
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function LineRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, value < 0 && { color: colors.red600 }]}>{fmt(value)}</Text>
    </View>
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
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPeriod: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.stone900,
  },
  itemGross: {
    fontSize: 13,
    color: colors.stone500,
    marginTop: 2,
  },
  itemNet: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.violet600,
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
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.stone900,
    marginBottom: spacing.xs,
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.stone100,
  },
  lineLabel: {
    fontSize: 13,
    color: colors.stone600,
    flex: 1,
  },
  lineValue: {
    fontSize: 13,
    color: colors.stone900,
    fontWeight: "500",
  },
  totalsCard: {
    gap: spacing.xs,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 13,
    color: colors.stone500,
  },
  totalValue: {
    fontSize: 13,
    color: colors.stone900,
    fontWeight: "500",
  },
  totalLabelBig: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.stone900,
  },
  totalValueBig: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.violet600,
  },
});

import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar as CalendarIcon } from "lucide-react-native";
import { radii, spacing, type ThemeColors } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import type { WritableCalendar } from "@/lib/calendar";

// Modal simples para escolher em qual calendário/conta do dispositivo
// guardar o(s) turno(s) — só aparece quando há mais do que um calendário
// disponível (com um só, usa-se logo esse, sem perguntar).
export function CalendarAccountPicker({
  visible,
  calendars,
  onSelect,
  onClose,
}: {
  visible: boolean;
  calendars: WritableCalendar[];
  onSelect: (calendar: WritableCalendar) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Adicionar a qual calendário?</Text>
          {calendars.map((c) => (
            <TouchableOpacity key={c.id} style={styles.row} onPress={() => onSelect(c)}>
              <CalendarIcon color={colors.violet600} size={18} />
              <Text style={styles.rowText} numberOfLines={1}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(28, 25, 23, 0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    sheet: {
      backgroundColor: colors.white,
      borderRadius: radii.lg,
      padding: spacing.lg,
      width: "100%",
      maxWidth: 360,
      gap: spacing.xs,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.stone900,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.stone200,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    rowText: {
      flex: 1,
      fontSize: 14,
      color: colors.stone900,
    },
    cancelButton: {
      marginTop: spacing.sm,
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    cancelText: {
      color: colors.violet600,
      fontWeight: "600",
      fontSize: 14,
    },
  });
}

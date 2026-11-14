import { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors, radii, spacing } from "@/lib/theme";
import { MONTH_NAMES, WEEKDAY_LABELS } from "@/lib/dates";

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Seletor de data próprio, consistente com o calendário da app (ver Férias),
// em vez do DateTimePicker nativo do Android, que estava a dar problemas.
export function DateField({
  label,
  value,
  onChange,
  minDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const openPicker = () => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const weeks = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const firstWeekday = (first.getDay() + 6) % 7; // 0 = Segunda
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [viewYear, viewMonth]);

  const formatted = value.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.fieldButton} onPress={openPicker}>
        <Calendar color={colors.violet600} size={18} />
        <Text style={styles.fieldText}>{formatted}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navButton}>
                <ChevronLeft color={colors.stone600} size={22} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navButton}>
                <ChevronRight color={colors.stone600} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((w) => (
                <Text key={w} style={styles.weekdayLabel}>
                  {w}
                </Text>
              ))}
            </View>

            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((d, di) => {
                  if (d === null) return <View key={di} style={styles.dayCell} />;
                  const cellDate = new Date(viewYear, viewMonth, d);
                  const isSelected = sameDay(cellDate, value);
                  const isDisabled = minDate ? cellDate < startOfDay(minDate) : false;
                  return (
                    <TouchableOpacity
                      key={di}
                      style={styles.dayCell}
                      disabled={isDisabled}
                      onPress={() => {
                        onChange(cellDate);
                        setOpen(false);
                      }}
                    >
                      <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                            isDisabled && styles.dayTextDisabled,
                          ]}
                        >
                          {d}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity style={styles.closeButton} onPress={() => setOpen(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.stone600,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  fieldButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  fieldText: {
    fontSize: 15,
    color: colors.stone900,
    textTransform: "capitalize",
  },
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
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  navButton: {
    padding: spacing.xs,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.stone900,
    minWidth: 140,
    textAlign: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: colors.stone400,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: colors.violet600,
  },
  dayText: {
    fontSize: 13,
    color: colors.stone600,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: "700",
  },
  dayTextDisabled: {
    color: colors.stone200,
  },
  closeButton: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    color: colors.violet600,
    fontWeight: "600",
    fontSize: 14,
  },
});

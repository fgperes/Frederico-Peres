"use client";

import { useState, useTransition } from "react";
import { MapPin, X } from "lucide-react";
import { clockAction, dismissMealReminder, type GeoCoords } from "@/app/(app)/picagens/actions";
import type { MealStatus } from "@/lib/meal-rules";

type ButtonType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

type ButtonSpec = {
  type: ButtonType;
  label: string;
  color: string;
  enabled: boolean;
  hint?: string;
};

// Geolocalização (opcional): se o utilizador recusar ou o browser não
// suportar, a picagem prossegue na mesma sem localização associada.
function getLocation(): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  });
}

function buildButtons(status: MealStatus): ButtonSpec[] {
  const { phase, showMealButtons, hoursUntilMealAvailable } = status;

  const buttons: ButtonSpec[] = [
    {
      type: "CLOCK_IN",
      label: "Entrada",
      color: "bg-emerald-600 hover:bg-emerald-700",
      enabled: phase === "NOT_CLOCKED_IN" || phase === "CLOCKED_OUT",
    },
  ];

  if (showMealButtons && (phase === "WORKING" || phase === "MEAL_AVAILABLE")) {
    buttons.push({
      type: "BREAK_START",
      label: "Início Refeição",
      color: "bg-amber-500 hover:bg-amber-600",
      enabled: phase === "MEAL_AVAILABLE",
      hint:
        phase === "WORKING" && hoursUntilMealAvailable != null
          ? `Disponível daqui a ${hoursUntilMealAvailable.toFixed(1)}h`
          : undefined,
    });
  }

  if (phase === "ON_MEAL") {
    buttons.push({
      type: "BREAK_END",
      label: "Fim Refeição",
      color: "bg-amber-600 hover:bg-amber-700",
      enabled: true,
    });
  }

  buttons.push({
    type: "CLOCK_OUT",
    label: "Saída",
    color: "bg-rose-600 hover:bg-rose-700",
    enabled: phase === "WORKING" || phase === "MEAL_AVAILABLE" || phase === "AFTER_MEAL",
  });

  return buttons;
}

const FALLBACK_STATUS: MealStatus = {
  phase: "NOT_CLOCKED_IN",
  showMealButtons: true,
  dailyHours: 8,
  elapsedHours: 0,
  hoursUntilMealAvailable: null,
  showReminder: false,
  shiftId: null,
};

export function ClockWidget({
  compact = false,
  status = FALLBACK_STATUS,
}: {
  compact?: boolean;
  status?: MealStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState<ButtonType | null>(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  async function handleClick(type: ButtonType) {
    setLocating(type);
    const coords = await getLocation();
    setLocating(null);
    startTransition(() => {
      clockAction(type, coords);
    });
  }

  function handleDismissReminder() {
    setReminderDismissed(true);
    if (status.shiftId) {
      startTransition(() => {
        dismissMealReminder(status.shiftId!);
      });
    }
  }

  const buttons = buildButtons(status);
  const showReminder = status.showReminder && !reminderDismissed;

  return (
    <div>
      {showReminder && (
        <div className="mb-3 flex items-start justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
          <span>
            Já leva mais de 5h em turno sem pausa para refeição. O seu gestor de RH e
            supervisor foram avisados para ajustar a escala.
          </span>
          <button
            type="button"
            onClick={handleDismissReminder}
            title="Dispensar lembrete"
            className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/20"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3 sm:grid-cols-4"}>
        {buttons.map((b) => (
          <button
            key={b.type}
            disabled={pending || locating !== null || !b.enabled}
            title={b.hint}
            onClick={() => handleClick(b.type)}
            className={`rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-40 ${b.color}`}
          >
            {locating === b.type ? "A localizar..." : b.label}
          </button>
        ))}
      </div>
      {buttons.some((b) => b.hint) && (
        <p className="mt-2 text-xs text-stone-500">
          {buttons.find((b) => b.hint)?.hint}
        </p>
      )}
      {!compact && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-500">
          <MapPin size={13} />
          A localização é pedida ao browser e associada ao registo, se autorizada.
        </p>
      )}
    </div>
  );
}

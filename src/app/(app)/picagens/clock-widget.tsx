"use client";

import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { clockAction, type GeoCoords } from "./actions";

const BUTTONS: { type: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END"; label: string; color: string }[] = [
  { type: "CLOCK_IN", label: "Entrada", color: "bg-emerald-600 hover:bg-emerald-700" },
  { type: "BREAK_START", label: "Início Pausa", color: "bg-amber-500 hover:bg-amber-600" },
  { type: "BREAK_END", label: "Fim Pausa", color: "bg-amber-600 hover:bg-amber-700" },
  { type: "CLOCK_OUT", label: "Saída", color: "bg-rose-600 hover:bg-rose-700" },
];

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

export function ClockWidget() {
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState<string | null>(null);

  async function handleClick(type: (typeof BUTTONS)[number]["type"]) {
    setLocating(type);
    const coords = await getLocation();
    setLocating(null);
    startTransition(() => {
      clockAction(type, coords);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BUTTONS.map((b) => (
          <button
            key={b.type}
            disabled={pending || locating !== null}
            onClick={() => handleClick(b.type)}
            className={`rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60 ${b.color}`}
          >
            {locating === b.type ? "A localizar..." : b.label}
          </button>
        ))}
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-500">
        <MapPin size={13} />
        A localização é pedida ao browser e associada ao registo, se autorizada.
      </p>
    </div>
  );
}

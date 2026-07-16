"use client";

import { useState } from "react";
import { MapPin, X } from "lucide-react";

export function LocationButton({
  latitude,
  longitude,
  accuracy,
}: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}) {
  const [open, setOpen] = useState(false);

  const delta = 0.006;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",");
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const externalUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline"
      >
        <MapPin size={12} />
        Ver localização
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  Local da picagem
                </p>
                <p className="text-xs text-stone-500">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  {accuracy ? ` · precisão ±${Math.round(accuracy)}m` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <X size={16} />
              </button>
            </div>
            <iframe
              title="Mapa da localização da picagem"
              src={embedUrl}
              className="h-80 w-full border-0"
            />
            <div className="border-t border-stone-200 px-4 py-2.5 text-right">
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-violet-700 hover:underline"
              >
                Abrir no OpenStreetMap →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

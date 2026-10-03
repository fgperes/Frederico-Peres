"use client";

import { useState, type ReactNode } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const STEP = 0.1;

export function OrganogramaZoomWrapper({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-stone-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-stone-700 dark:bg-stone-900/90">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - STEP).toFixed(2)))}
          disabled={zoom <= MIN_ZOOM}
          className="flex h-7 w-7 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-stone-800"
          aria-label="Reduzir zoom"
        >
          <ZoomOut size={15} />
        </button>
        <span className="w-10 text-center text-xs font-medium text-stone-600 dark:text-stone-300">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + STEP).toFixed(2)))}
          disabled={zoom >= MAX_ZOOM}
          className="flex h-7 w-7 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-stone-800"
          aria-label="Aumentar zoom"
        >
          <ZoomIn size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-700" />
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          aria-label="Repor zoom"
        >
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="overflow-x-auto pb-2">
        <div
          className="origin-top transition-transform"
          style={{ transform: `scale(${zoom})`, width: "max-content", minWidth: "100%" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

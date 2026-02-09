"use client";

import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";
import type { Transformation } from "@/lib/types";

interface Props {
  transformations: Transformation[];
}

export default function TransformationsPanel({ transformations }: Props) {
  if (transformations.length === 0) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-700/50 backdrop-blur-md p-4">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase flex items-center gap-1.5 mb-3">
          <Zap className="h-4 w-4" />
          Active Transformations
        </h2>
        <p className="text-xs text-zinc-600 italic">
          No transformations active. Start a session to see live style changes.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-700/50 backdrop-blur-md p-4">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase flex items-center gap-1.5 mb-3">
        <Zap className="h-4 w-4 text-amber-400" />
        Active Transformations
      </h2>
      <div className="space-y-2.5">
        {transformations.map((t, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  t.intensity > 0.6
                    ? "#f97316"
                    : t.intensity > 0.3
                    ? "#facc15"
                    : "#6b7280",
              }}
            />
            <div className="min-w-0">
              <span className="text-xs font-medium text-zinc-300">
                {t.name}
              </span>
              <p className="text-[11px] text-zinc-500 leading-tight">
                {t.value}
              </p>
            </div>
            {/* Intensity indicator */}
            <div className="ml-auto shrink-0 w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(t.intensity * 100)}%`,
                  backgroundColor:
                    t.intensity > 0.6
                      ? "#f97316"
                      : t.intensity > 0.3
                      ? "#facc15"
                      : "#6b7280",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

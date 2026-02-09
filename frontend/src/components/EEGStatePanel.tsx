"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Brain, Activity, BatteryLow, Wifi } from "lucide-react";
import type { NeuroState, StateHistoryPoint } from "@/lib/types";

interface Props {
  state: NeuroState;
  history: StateHistoryPoint[];
  connected: boolean;
}

function StateBar({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-zinc-300">
          {icon}
          {label}
        </span>
        <span className="font-mono text-xs" style={{ color }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function EEGStatePanel({ state, history, connected }: Props) {
  const qualityLabel =
    state.quality > 0.8
      ? "OPTIMAL"
      : state.quality > 0.5
      ? "GOOD"
      : state.quality > 0.3
      ? "FAIR"
      : "POOR";

  const qualityColor =
    state.quality > 0.8
      ? "text-emerald-400"
      : state.quality > 0.5
      ? "text-yellow-400"
      : "text-red-400";

  const chartData = useMemo(
    () =>
      history.map((p, i) => ({
        i,
        calm: +(p.calm * 100).toFixed(0),
        activation: +(p.activation * 100).toFixed(0),
        fatigue: +(p.fatigue * 100).toFixed(0),
      })),
    [history]
  );

  return (
    <Card className="bg-zinc-900/60 border-zinc-700/50 backdrop-blur-md p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
          Neurophysiological State
        </h2>
        <Badge
          variant="outline"
          className={`text-xs ${
            connected
              ? "border-emerald-500/50 text-emerald-400"
              : "border-red-500/50 text-red-400"
          }`}
        >
          {connected ? "LIVE" : "OFFLINE"}
        </Badge>
      </div>

      {/* Signal Quality */}
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-zinc-300">
          <Wifi className="h-3.5 w-3.5" />
          Signal Quality
        </span>
        <span className={`font-mono text-xs font-medium ${qualityColor}`}>
          {Math.round(state.quality * 100)}% [{qualityLabel}]
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-emerald-500 to-cyan-400"
          style={{ width: `${Math.round(state.quality * 100)}%` }}
        />
      </div>

      {/* State Bars */}
      <div className="space-y-3 pt-1">
        <StateBar
          label="Calm"
          value={state.calm}
          color="#a78bfa"
          icon={<Brain className="h-3.5 w-3.5" />}
        />
        <StateBar
          label="Activation"
          value={state.activation}
          color="#f97316"
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <StateBar
          label="Fatigue"
          value={state.fatigue}
          color="#60a5fa"
          icon={<BatteryLow className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Temporal Chart */}
      {chartData.length > 2 && (
        <div className="pt-2">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">
            Last 30 seconds
          </p>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="i" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ display: "none" }}
                />
                <Line
                  type="monotone"
                  dataKey="calm"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="activation"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fatigue"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 justify-center mt-1">
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-violet-400" /> Calm
            </span>
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> Activation
            </span>
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Fatigue
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

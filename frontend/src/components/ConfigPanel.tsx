"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings2, Sparkles } from "lucide-react";
import type { SessionConfig, SessionMode, EngineMode } from "@/lib/types";

interface Props {
  onConfigure: (config: SessionConfig) => void;
  connected: boolean;
  sessionActive: boolean;
}

export default function ConfigPanel({
  onConfigure,
  connected,
  sessionActive,
}: Props) {
  const [theme, setTheme] = useState("a nighttime walk through a quiet city");
  const [mode, setMode] = useState<SessionMode>("generator");
  const [baseText, setBaseText] = useState("");
  const [sensitivity, setSensitivity] = useState(1.0);
  const [engineMode, setEngineMode] = useState<EngineMode>("balanced");

  const handleApply = () => {
    onConfigure({ theme, mode, baseText, sensitivity, engineMode });
  };

  return (
    <Card className="bg-zinc-900/60 border-zinc-700/50 backdrop-blur-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase flex items-center gap-1.5">
          <Settings2 className="h-4 w-4" />
          Configuration
        </h2>
        <Badge
          variant="outline"
          className={`text-[10px] ${
            sessionActive
              ? "border-cyan-500/50 text-cyan-400"
              : "border-zinc-600 text-zinc-500"
          }`}
        >
          {sessionActive ? "SESSION ACTIVE" : "IDLE"}
        </Badge>
      </div>

      {/* Theme */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 font-medium">
          Theme / Scene
        </label>
        <textarea
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          rows={2}
          disabled={sessionActive}
          className="w-full rounded-md bg-zinc-800/80 border border-zinc-700/60 text-sm text-zinc-200 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-zinc-600 disabled:opacity-50"
          placeholder="Describe the scene or topic..."
        />
      </div>

      {/* Mode */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 font-medium">Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("generator")}
            disabled={sessionActive}
            className={`flex-1 text-xs py-2 rounded-md border transition-colors ${
              mode === "generator"
                ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-300"
                : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-300"
            } disabled:opacity-50`}
          >
            Generator
          </button>
          <button
            onClick={() => setMode("editor")}
            disabled={sessionActive}
            className={`flex-1 text-xs py-2 rounded-md border transition-colors ${
              mode === "editor"
                ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-300"
            } disabled:opacity-50`}
          >
            Editor
          </button>
        </div>
      </div>

      {/* Base text for editor mode */}
      {mode === "editor" && (
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-medium">
            Base Text
          </label>
          <textarea
            value={baseText}
            onChange={(e) => setBaseText(e.target.value)}
            rows={4}
            disabled={sessionActive}
            className="w-full rounded-md bg-zinc-800/80 border border-zinc-700/60 text-sm text-zinc-200 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder:text-zinc-600 disabled:opacity-50 font-serif"
            placeholder="Paste text to transform..."
          />
        </div>
      )}

      {/* Sensitivity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400 font-medium">
            Sensitivity
          </label>
          <span className="text-xs font-mono text-zinc-500">
            {(sensitivity * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          value={[sensitivity * 100]}
          min={10}
          max={200}
          step={5}
          onValueChange={([v]) => setSensitivity(v / 100)}
          disabled={sessionActive}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>Conservative</span>
          <span>Experimental</span>
        </div>
      </div>

      {/* Engine Mode */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 font-medium">
          Response Style
        </label>
        <div className="flex gap-1.5">
          {(["conservative", "balanced", "experimental"] as EngineMode[]).map(
            (m) => (
              <button
                key={m}
                onClick={() => setEngineMode(m)}
                disabled={sessionActive}
                className={`flex-1 text-[10px] py-1.5 rounded-md border transition-colors capitalize ${
                  engineMode === m
                    ? "bg-zinc-700/50 border-zinc-500/50 text-zinc-200"
                    : "bg-zinc-800/30 border-zinc-700/30 text-zinc-600 hover:text-zinc-400"
                } disabled:opacity-50`}
              >
                {m}
              </button>
            )
          )}
        </div>
      </div>

      {/* Apply */}
      <Button
        onClick={handleApply}
        disabled={!connected || !theme.trim()}
        className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-sm"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        {sessionActive ? "Update Config" : "Apply Configuration"}
      </Button>
    </Card>
  );
}

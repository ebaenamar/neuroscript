"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings2, Sparkles, Play, Check } from "lucide-react";
import type { SessionConfig, SessionMode } from "@/lib/types";

interface Props {
  onConfigure: (config: SessionConfig) => void;
  onStartSession: (config: SessionConfig) => void;
  connected: boolean;
  sessionActive: boolean;
  isStopped: boolean;
}

export default function ConfigPanel({
  onConfigure,
  onStartSession,
  connected,
  sessionActive,
  isStopped,
}: Props) {
  const [theme, setTheme] = useState("a nighttime walk through a quiet city");
  const [mode, setMode] = useState<SessionMode>("generator");
  const [baseText, setBaseText] = useState("");
  const [sensitivity, setSensitivity] = useState(1.0);
  const [updateFeedback, setUpdateFeedback] = useState(false);

  const getConfig = (): SessionConfig => ({ theme, mode, baseText, sensitivity });

  const handleStart = () => {
    onStartSession(getConfig());
  };

  const handleUpdate = () => {
    onConfigure(getConfig());
    setUpdateFeedback(true);
    setTimeout(() => setUpdateFeedback(false), 1500);
  };

  const sensitivityLabel =
    sensitivity <= 0.5
      ? "Conservative"
      : sensitivity <= 1.0
      ? "Balanced"
      : sensitivity <= 1.5
      ? "Responsive"
      : "Experimental";

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
          {sessionActive ? "SESSION ACTIVE" : isStopped ? "STOPPED" : "IDLE"}
        </Badge>
      </div>

      {/* Mode selector */}
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

      {/* Mode-specific inputs */}
      {mode === "generator" ? (
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-medium">
            Theme / Scene
          </label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            rows={3}
            className="w-full rounded-md bg-zinc-800/80 border border-zinc-700/60 text-sm text-zinc-200 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-zinc-600"
            placeholder="Describe the scene, setting, or topic to write about..."
          />
          <p className="text-[10px] text-zinc-600">
            The LLM builds a coherent narrative around this theme, modulated by your EEG state.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-xs text-violet-400 font-medium">
              Text to Transform
            </label>
            <textarea
              value={baseText}
              onChange={(e) => setBaseText(e.target.value)}
              rows={5}
              className="w-full rounded-md bg-zinc-800/80 border border-violet-700/40 text-sm text-zinc-200 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder:text-zinc-600 font-serif"
              placeholder="Paste or write the text you want to restyle..."
            />
            <p className="text-[10px] text-zinc-600">
              The LLM rewrites this text each cycle, reshaping its form based on your EEG state.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 font-medium">
              Tone / Context <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-md bg-zinc-800/80 border border-zinc-700/60 text-sm text-zinc-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder:text-zinc-600"
              placeholder="e.g. noir, melancholic, surreal..."
            />
          </div>
        </>
      )}

      {/* EEG Sensitivity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400 font-medium">
            EEG Sensitivity
          </label>
          <span className="text-xs font-mono text-zinc-500">
            {(sensitivity * 100).toFixed(0)}% — {sensitivityLabel}
          </span>
        </div>
        <Slider
          value={[sensitivity * 100]}
          min={10}
          max={200}
          step={5}
          onValueChange={([v]) => setSensitivity(v / 100)}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>Conservative</span>
          <span>Balanced</span>
          <span>Experimental</span>
        </div>
        <p className="text-[10px] text-zinc-600">
          How strongly EEG state changes affect writing style.
        </p>
      </div>

      {/* Action buttons */}
      {isStopped ? (
        <p className="text-[10px] text-zinc-500 text-center">
          Use Continue Writing or New Session below.
          You can edit config before continuing.
        </p>
      ) : !sessionActive ? (
        <Button
          onClick={handleStart}
          disabled={!connected || (mode === "generator" && !theme.trim()) || (mode === "editor" && !baseText.trim())}
          className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-sm"
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Start Writing
        </Button>
      ) : (
        <Button
          onClick={handleUpdate}
          disabled={!connected || (mode === "generator" && !theme.trim()) || (mode === "editor" && !baseText.trim())}
          variant="outline"
          className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm"
        >
          {updateFeedback ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              <span className="text-emerald-400">Updated — next paragraph</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Update Config
            </>
          )}
        </Button>
      )}
    </Card>
  );
}

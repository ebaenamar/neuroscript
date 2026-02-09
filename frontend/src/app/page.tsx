"use client";

import { useNeuroSocket } from "@/hooks/useNeuroSocket";
import { useTTS } from "@/hooks/useTTS";
import EEGStatePanel from "@/components/EEGStatePanel";
import TextOutput from "@/components/TextOutput";
import ConfigPanel from "@/components/ConfigPanel";
import TransformationsPanel from "@/components/TransformationsPanel";
import { Brain, AlertCircle } from "lucide-react";

export default function Home() {
  const neuro = useNeuroSocket();
  const tts = useTTS();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-zinc-800/60 px-6 py-3 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              NeuroScript
            </h1>
            <p className="text-[10px] text-zinc-500 -mt-0.5">
              Neurophysiologically Adaptive Writing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {neuro.error && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {neuro.error}
            </span>
          )}
          <div
            className={`h-2 w-2 rounded-full ${
              neuro.connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="text-[10px] text-zinc-500 font-mono">
            {neuro.connected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
      </header>

      {/* Main 3-column layout */}
      <main className="flex-1 grid grid-cols-[280px_1fr_300px] gap-4 p-4 overflow-hidden max-h-[calc(100vh-53px)]">
        {/* Left column: Config */}
        <div className="space-y-4 overflow-y-auto pr-1">
          <ConfigPanel
            onConfigure={neuro.configure}
            onStartSession={neuro.startWithConfig}
            connected={neuro.connected}
            sessionActive={neuro.sessionId !== null}
          />
        </div>

        {/* Center: Text output */}
        <div className="overflow-hidden">
          <TextOutput
            completedParagraphs={neuro.completedParagraphs}
            isReceiving={neuro.isReceiving}
            isPaused={neuro.isPaused}
            isSpeaking={tts.isSpeaking}
            ttsPaused={tts.isPaused}
            onSpeak={tts.speak}
            onStopSpeak={tts.stop}
            onPauseResumeSpeak={tts.pauseResume}
            onPause={neuro.pause}
            onResume={neuro.resume}
            onStop={neuro.stop}
            sessionId={neuro.sessionId}
          />
        </div>

        {/* Right column: EEG state + Transformations */}
        <div className="space-y-4 overflow-y-auto pl-1">
          <EEGStatePanel
            state={neuro.eegState}
            history={neuro.stateHistory}
            connected={neuro.connected}
          />
          <TransformationsPanel transformations={neuro.transformations} />
        </div>
      </main>
    </div>
  );
}

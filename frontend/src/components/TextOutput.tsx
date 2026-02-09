"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Loader2,
  PenLine,
} from "lucide-react";
import { useTypewriter } from "@/hooks/useTypewriter";

interface Props {
  paragraphs: string[];
  streamingText: string;
  isGenerating: boolean;
  isPaused: boolean;
  // TTS
  isSpeaking: boolean;
  ttsPaused: boolean;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  onPauseResumeSpeak: () => void;
  // Controls
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  sessionId: string | null;
}

export default function TextOutput({
  paragraphs,
  streamingText,
  isGenerating,
  isPaused,
  isSpeaking,
  ttsPaused,
  onSpeak,
  onStopSpeak,
  onPauseResumeSpeak,
  onStart,
  onPause,
  onResume,
  onStop,
  sessionId,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [wordDelayMs, setWordDelayMs] = useState(0); // 0 = instant

  const { displayedText, isTyping, pendingWords } = useTypewriter(
    streamingText,
    wordDelayMs,
    isGenerating
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [paragraphs, displayedText]);

  const allText = [...paragraphs, streamingText].filter(Boolean).join("\n\n");

  const speedLabel =
    wordDelayMs === 0
      ? "Instant"
      : wordDelayMs < 200
      ? "Fast"
      : wordDelayMs < 600
      ? "Slow"
      : wordDelayMs < 1500
      ? "Pensive"
      : "Meditative";

  return (
    <Card className="bg-zinc-900/60 border-zinc-700/50 backdrop-blur-md flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
          Generated Text
        </h2>
        <div className="flex items-center gap-2">
          {(isGenerating || isTyping) && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400">
              {isTyping ? (
                <PenLine className="h-3 w-3" />
              ) : (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {isTyping ? `Typing... (${pendingWords} words queued)` : "Receiving..."}
            </span>
          )}
        </div>
      </div>

      {/* Text area */}
      <ScrollArea className="flex-1 px-4 pb-2">
        <div className="prose prose-invert prose-sm max-w-none py-2 font-serif leading-relaxed">
          {paragraphs.length === 0 && !streamingText && (
            <p className="text-zinc-600 italic">
              Configure a theme and press Start to begin generating...
            </p>
          )}
          {paragraphs.map((p, i) => (
            <p key={i} className="text-zinc-200 mb-4">
              {p}
            </p>
          ))}
          {displayedText && (
            <p className="text-zinc-100 mb-4">
              {displayedText}
              {(isGenerating || isTyping) && (
                <span className="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Writing Speed Slider */}
      <div className="border-t border-zinc-800/50 px-4 pt-2.5 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
            Writing Speed
          </label>
          <span className="text-[10px] font-mono text-zinc-500">
            {wordDelayMs === 0 ? "Instant" : `${wordDelayMs}ms/word`} — {speedLabel}
          </span>
        </div>
        <Slider
          value={[wordDelayMs]}
          min={0}
          max={3000}
          step={50}
          onValueChange={([v]) => setWordDelayMs(v)}
          className="w-full"
        />
        <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
          <span>Instant</span>
          <span>Meditative</span>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!sessionId ? (
            <Button
              size="sm"
              onClick={onStart}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Start
            </Button>
          ) : isPaused ? (
            <Button
              size="sm"
              onClick={onResume}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Resume
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onPause}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              <Pause className="h-3.5 w-3.5 mr-1" />
              Pause
            </Button>
          )}

          {sessionId && (
            <Button
              size="sm"
              variant="outline"
              onClick={onStop}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* TTS controls */}
          {allText && (
            <>
              {isSpeaking ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onPauseResumeSpeak}
                    className="text-zinc-400 hover:text-zinc-200"
                    title={ttsPaused ? "Resume speech" : "Pause speech"}
                  >
                    {ttsPaused ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      <Pause className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onStopSpeak}
                    className="text-red-400 hover:text-red-300"
                    title="Stop speech"
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSpeak(allText)}
                  className="text-zinc-400 hover:text-zinc-200"
                  title="Read aloud"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}

          {paragraphs.length > 0 && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(allText).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="text-zinc-400 hover:text-zinc-200"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const blob = new Blob([allText], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `neuroscript_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-violet-600 hover:bg-violet-500 text-white"
                title="Save text as file"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

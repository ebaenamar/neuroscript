"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Typewriter hook: takes full received text and drip-feeds it word by word.
 * @param sourceText - The full text received so far (from WebSocket streaming)
 * @param delayMs - Milliseconds between each word (0 = instant)
 * @param isActive - Whether typewriter is actively receiving (isGenerating)
 */
export function useTypewriter(
  sourceText: string,
  delayMs: number,
  isActive: boolean
) {
  const [displayedWordCount, setDisplayedWordCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sourceWords = sourceText ? sourceText.split(/(\s+)/) : [];
  const totalTokens = sourceWords.length;

  // When speed is 0 (instant), show everything immediately
  useEffect(() => {
    if (delayMs === 0) {
      setDisplayedWordCount(totalTokens);
      return;
    }
  }, [delayMs, totalTokens]);

  // Advance the word counter one step at a time
  useEffect(() => {
    if (delayMs === 0) return;

    // If we're already caught up, nothing to do
    if (displayedWordCount >= totalTokens) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start interval if not running
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setDisplayedWordCount((prev) => {
          const next = prev + 1;
          return next;
        });
      }, delayMs);
    }

    return () => {
      // Don't clear on every render, only on unmount or delay change
    };
  }, [delayMs, totalTokens, displayedWordCount]);

  // Reset interval when delay changes
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (delayMs > 0 && displayedWordCount < totalTokens) {
      timerRef.current = setInterval(() => {
        setDisplayedWordCount((prev) => prev + 1);
      }, delayMs);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delayMs]);

  // Reset when source text is cleared (new generation starts)
  useEffect(() => {
    if (sourceText === "") {
      setDisplayedWordCount(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [sourceText]);

  // Build the displayed string from the word tokens shown so far
  const displayedText = sourceWords.slice(0, displayedWordCount).join("");
  const isTyping = delayMs > 0 && displayedWordCount < totalTokens;
  const pendingWords = totalTokens - displayedWordCount;

  return { displayedText, isTyping, pendingWords };
}

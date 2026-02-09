"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Queue-based typewriter hook.
 *
 * Takes an array of completed paragraphs from the WebSocket and reveals them
 * word-by-word at the chosen speed. When speed is 0 all text appears instantly.
 *
 * Uses STATE (not refs) for revealedCount so paragraph transitions trigger
 * re-renders and the next paragraph is picked up automatically.
 */
export function useTypewriter(
  completedParagraphs: string[],
  delayMs: number
) {
  const [revealedParagraphs, setRevealedParagraphs] = useState<string[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordsRef = useRef<string[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset when completedParagraphs is cleared (new session)
  useEffect(() => {
    if (completedParagraphs.length === 0) {
      clearTimer();
      setRevealedParagraphs([]);
      setRevealedCount(0);
      setTypingText("");
      setWordIndex(0);
      setIsTyping(false);
      wordsRef.current = [];
    }
  }, [completedParagraphs.length, clearTimer]);

  // Pick next paragraph to type when available
  // Deps: revealedCount (state), completedParagraphs, delayMs — all trigger re-renders
  useEffect(() => {
    // Nothing new to reveal
    if (revealedCount >= completedParagraphs.length) return;
    // Already typing
    if (isTyping) return;

    if (delayMs === 0) {
      // Instant mode: reveal all pending paragraphs at once
      const pending = completedParagraphs.slice(revealedCount);
      setRevealedParagraphs((prev) => [...prev, ...pending]);
      setRevealedCount(completedParagraphs.length);
      setTypingText("");
      return;
    }

    // Start typing the next paragraph word by word
    const paragraph = completedParagraphs[revealedCount];
    const words = paragraph.split(/(\s+)/);
    wordsRef.current = words;
    setWordIndex(1); // Start at 1 so first word shows immediately
    setTypingText(words.slice(0, 1).join(""));
    setIsTyping(true);

    clearTimer();
    timerRef.current = setInterval(() => {
      setWordIndex((prev) => prev + 1);
    }, delayMs);

  }, [revealedCount, completedParagraphs, delayMs, isTyping, clearTimer]);

  // Advance displayed text as wordIndex increments
  useEffect(() => {
    if (!isTyping) return;
    const words = wordsRef.current;

    if (wordIndex >= words.length) {
      // Paragraph fully revealed → move to revealed list
      clearTimer();
      const finishedText = words.join("");
      setRevealedParagraphs((prev) => [...prev, finishedText]);
      setRevealedCount((prev) => prev + 1);
      setTypingText("");
      setWordIndex(0);
      setIsTyping(false);
    } else if (wordIndex > 0) {
      setTypingText(words.slice(0, wordIndex).join(""));
    }
  }, [wordIndex, isTyping, clearTimer]);

  // When delay changes mid-typing, restart interval at new speed
  useEffect(() => {
    if (!isTyping) return;

    if (delayMs === 0) {
      // Switched to instant: finish current + all pending immediately
      clearTimer();
      const remaining = completedParagraphs.slice(revealedCount);
      setRevealedParagraphs((prev) => [...prev, ...remaining]);
      setRevealedCount(completedParagraphs.length);
      setTypingText("");
      setWordIndex(0);
      setIsTyping(false);
      return;
    }

    // Restart interval at new speed
    clearTimer();
    timerRef.current = setInterval(() => {
      setWordIndex((prev) => prev + 1);
    }, delayMs);
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const pendingParagraphs = completedParagraphs.length - revealedCount - (isTyping ? 1 : 0);
  const pendingWords = isTyping ? Math.max(0, wordsRef.current.length - wordIndex) : 0;
  const allText = [...revealedParagraphs, typingText].filter(Boolean).join("\n\n");

  return {
    revealedParagraphs,
    typingText,
    isTyping,
    pendingParagraphs: Math.max(0, pendingParagraphs),
    pendingWords,
    allText,
  };
}

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
  delayMs: number,
  isPaused: boolean
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

  const startTimer = useCallback((delay: number) => {
    clearTimer();
    if (delay > 0) {
      timerRef.current = setInterval(() => {
        setWordIndex((prev) => prev + 1);
      }, delay);
    }
  }, [clearTimer]);

  // Flush: instantly reveal all remaining text (used on Stop)
  const flush = useCallback(() => {
    clearTimer();
    const remaining = completedParagraphs.slice(revealedCount);
    if (remaining.length > 0) {
      setRevealedParagraphs((prev) => [...prev, ...remaining]);
      setRevealedCount(completedParagraphs.length);
    }
    setTypingText("");
    setWordIndex(0);
    setIsTyping(false);
  }, [clearTimer, completedParagraphs, revealedCount]);

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

  // Pause/resume the interval
  useEffect(() => {
    if (isPaused) {
      clearTimer();
    } else if (isTyping && delayMs > 0) {
      startTimer(delayMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  // Pick next paragraph to type when available
  useEffect(() => {
    if (revealedCount >= completedParagraphs.length) return;
    if (isTyping) return;
    if (isPaused) return;

    if (delayMs === 0) {
      const pending = completedParagraphs.slice(revealedCount);
      setRevealedParagraphs((prev) => [...prev, ...pending]);
      setRevealedCount(completedParagraphs.length);
      setTypingText("");
      return;
    }

    const paragraph = completedParagraphs[revealedCount];
    const words = paragraph.split(/(\s+)/);
    wordsRef.current = words;
    setWordIndex(1);
    setTypingText(words.slice(0, 1).join(""));
    setIsTyping(true);
    startTimer(delayMs);

  }, [revealedCount, completedParagraphs, delayMs, isTyping, isPaused, startTimer]);

  // Advance displayed text as wordIndex increments
  useEffect(() => {
    if (!isTyping) return;
    const words = wordsRef.current;

    if (wordIndex >= words.length) {
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
    if (!isTyping || isPaused) return;

    if (delayMs === 0) {
      clearTimer();
      const remaining = completedParagraphs.slice(revealedCount);
      setRevealedParagraphs((prev) => [...prev, ...remaining]);
      setRevealedCount(completedParagraphs.length);
      setTypingText("");
      setWordIndex(0);
      setIsTyping(false);
      return;
    }

    startTimer(delayMs);
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
    flush,
  };
}

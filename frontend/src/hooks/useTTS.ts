"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
}

export function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    voices: [],
    selectedVoice: "",
  });

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      const englishVoices = v.filter((voice) => voice.lang.startsWith("en"));
      setState((s) => ({
        ...s,
        voices: englishVoices.length > 0 ? englishVoices : v,
        selectedVoice:
          s.selectedVoice ||
          (englishVoices.length > 0 ? englishVoices[0].name : v[0]?.name || ""),
      }));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      window.speechSynthesis.cancel();

      if (!text.trim()) return;

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = state.voices.find((v) => v.name === state.selectedVoice);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onstart = () =>
        setState((s) => ({ ...s, isSpeaking: true, isPaused: false }));
      utterance.onend = () =>
        setState((s) => ({ ...s, isSpeaking: false, isPaused: false }));
      utterance.onerror = () =>
        setState((s) => ({ ...s, isSpeaking: false, isPaused: false }));

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [state.voices, state.selectedVoice]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setState((s) => ({ ...s, isSpeaking: false, isPaused: false }));
  }, []);

  const pauseResume = useCallback(() => {
    if (state.isPaused) {
      window.speechSynthesis.resume();
      setState((s) => ({ ...s, isPaused: false }));
    } else {
      window.speechSynthesis.pause();
      setState((s) => ({ ...s, isPaused: true }));
    }
  }, [state.isPaused]);

  const setVoice = useCallback((name: string) => {
    setState((s) => ({ ...s, selectedVoice: name }));
  }, []);

  return {
    ...state,
    speak,
    stop,
    pauseResume,
    setVoice,
  };
}

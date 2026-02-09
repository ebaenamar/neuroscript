"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NeuroState,
  Transformation,
  StateHistoryPoint,
  WSIncoming,
  WSOutgoing,
  SessionConfig,
} from "@/lib/types";

const WS_URL = "ws://localhost:8000/ws";
const HISTORY_MAX = 60; // 30 seconds at 0.5s interval

export interface NeuroSocketState {
  connected: boolean;
  eegState: NeuroState;
  stateHistory: StateHistoryPoint[];
  transformations: Transformation[];
  completedParagraphs: string[];
  isReceiving: boolean;
  isPaused: boolean;
  isStopped: boolean;
  sessionId: string | null;
  error: string | null;
}

export function useNeuroSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const unmounted = useRef(false);

  const [state, setState] = useState<NeuroSocketState>({
    connected: false,
    eegState: { calm: 0.5, activation: 0.5, fatigue: 0.2, quality: 0 },
    stateHistory: [],
    transformations: [],
    completedParagraphs: [],
    isReceiving: false,
    isPaused: true,
    isStopped: false,
    sessionId: null,
    error: null,
  });

  const send = useCallback((msg: WSOutgoing) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (unmounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 1000;
      setState((s) => ({ ...s, connected: true, error: null }));
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, connected: false }));
      if (!unmounted.current) {
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 10000);
          connect();
        }, reconnectDelay.current);
      }
    };

    ws.onerror = () => {
      setState((s) => ({ ...s, error: "WebSocket connection failed" }));
    };

    ws.onmessage = (event) => {
      const msg: WSIncoming = JSON.parse(event.data);

      switch (msg.type) {
        case "eeg_state":
          setState((s) => {
            const point: StateHistoryPoint = {
              timestamp: msg.timestamp,
              ...msg.state,
            };
            const history = [...s.stateHistory, point].slice(-HISTORY_MAX);
            return { ...s, eegState: msg.state, stateHistory: history };
          });
          break;

        case "transformations":
          setState((s) => ({ ...s, transformations: msg.items }));
          break;

        case "text_start":
          setState((s) => ({ ...s, isReceiving: true }));
          break;

        case "text_chunk":
          break;

        case "text_end":
          setState((s) => ({
            ...s,
            completedParagraphs: [...s.completedParagraphs, msg.full_text],
            isReceiving: false,
          }));
          break;

        case "started":
          setState((s) => ({
            ...s,
            sessionId: msg.sessionId,
            isPaused: false,
            isStopped: false,
            // Only clear paragraphs on fresh start, keep them on continue
            completedParagraphs: msg.continued ? s.completedParagraphs : [],
          }));
          break;

        case "paused":
          setState((s) => ({ ...s, isPaused: true }));
          break;

        case "resumed":
          setState((s) => ({ ...s, isPaused: false }));
          break;

        case "stopped":
          setState((s) => ({
            ...s,
            isPaused: true,
            isStopped: s.completedParagraphs.length > 0,
            isReceiving: false,
            sessionId: null,
          }));
          break;

        case "error":
          setState((s) => ({ ...s, error: msg.message }));
          break;

        case "export":
          if (msg.format === "text") {
            const blob = new Blob([msg.content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `neuroscript_session.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }
          break;
      }
    };
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const configure = useCallback(
    (config: SessionConfig) => {
      send({ type: "configure", ...config });
    },
    [send]
  );

  const start = useCallback(() => send({ type: "start" }), [send]);
  const startWithConfig = useCallback(
    (config: SessionConfig) => {
      send({ type: "start", ...config });
    },
    [send]
  );
  const continueSession = useCallback(
    () => {
      send({ type: "start", continueSession: true });
    },
    [send]
  );
  const newSession = useCallback(() => {
    setState((s) => ({ ...s, completedParagraphs: [], isStopped: false }));
  }, []);
  const pause = useCallback(() => send({ type: "pause" }), [send]);
  const resume = useCallback(() => send({ type: "resume" }), [send]);
  const stop = useCallback(() => send({ type: "stop" }), [send]);
  const exportText = useCallback(() => send({ type: "export_text" }), [send]);
  const calibrateStart = useCallback(
    () => send({ type: "calibrate_start" }),
    [send]
  );
  const calibrateEnd = useCallback(
    () => send({ type: "calibrate_end" }),
    [send]
  );

  return {
    ...state,
    configure,
    start,
    startWithConfig,
    continueSession,
    newSession,
    pause,
    resume,
    stop,
    exportText,
    calibrateStart,
    calibrateEnd,
  };
}

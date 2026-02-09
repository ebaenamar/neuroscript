export interface NeuroState {
  calm: number;
  activation: number;
  fatigue: number;
  quality: number;
}

export interface Transformation {
  name: string;
  value: string;
  intensity: number;
}

export interface StateHistoryPoint {
  timestamp: number;
  calm: number;
  activation: number;
  fatigue: number;
  quality: number;
}

export type SessionMode = "generator" | "editor";

export interface SessionConfig {
  theme: string;
  mode: SessionMode;
  baseText: string;
  sensitivity: number;
}

// WebSocket message types
export type WSIncoming =
  | { type: "eeg_state"; state: NeuroState; timestamp: number }
  | { type: "transformations"; items: Transformation[] }
  | { type: "text_start" }
  | { type: "text_chunk"; chunk: string }
  | { type: "text_end"; full_text: string }
  | { type: "configured"; theme: string; mode: string }
  | { type: "started"; sessionId: string }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "stopped"; savedTo?: string }
  | { type: "calibrating" }
  | { type: "calibrated"; success: boolean }
  | { type: "export"; format: string; content: string }
  | { type: "error"; message: string };

export type WSOutgoing =
  | { type: "configure" } & Partial<SessionConfig>
  | { type: "start" } & Partial<SessionConfig>
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "export_text" }
  | { type: "calibrate_start" }
  | { type: "calibrate_end" };

"""Session Manager: Records sessions with neuro state metadata, supports export"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from llm.literary_engine import NeuroState


@dataclass
class SessionEntry:
    """Single entry in a session timeline"""
    timestamp: float
    state: Dict[str, float]
    text: str
    transformations: List[Dict[str, Any]]


class SessionManager:
    """Manages recording, storage, and export of writing sessions."""

    def __init__(self, sessions_dir: str = "sessions"):
        self.sessions_dir = Path(sessions_dir)
        self.sessions_dir.mkdir(exist_ok=True)
        self.current_session: Optional[Dict[str, Any]] = None
        self.entries: List[SessionEntry] = []

    def start_session(self, theme: str, mode: str) -> str:
        """Start a new writing session. Returns session_id."""
        session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.current_session = {
            "id": session_id,
            "theme": theme,
            "mode": mode,
            "started_at": datetime.now().isoformat(),
            "ended_at": None,
        }
        self.entries = []
        return session_id

    def add_entry(self, state: NeuroState, text: str, transformations: list):
        """Record a generation event."""
        entry = SessionEntry(
            timestamp=time.time(),
            state={
                "calm": state.calm,
                "activation": state.activation,
                "fatigue": state.fatigue,
                "quality": state.quality,
            },
            text=text,
            transformations=[
                {"name": t.name, "value": t.value, "intensity": t.intensity}
                for t in transformations
            ],
        )
        self.entries.append(entry)

    def end_session(self) -> Optional[str]:
        """End current session and save to disk. Returns file path."""
        if not self.current_session:
            return None
        self.current_session["ended_at"] = datetime.now().isoformat()
        session_data = {
            **self.current_session,
            "entries": [asdict(e) for e in self.entries],
        }
        filepath = self.sessions_dir / f"session_{self.current_session['id']}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)
        self.current_session = None
        self.entries = []
        return str(filepath)

    def export_text(self) -> str:
        """Export all generated text as plain text."""
        return "\n\n".join(e.text for e in self.entries if e.text)

    def list_sessions(self) -> List[Dict[str, str]]:
        """List all saved sessions."""
        sessions = []
        for f in sorted(self.sessions_dir.glob("session_*.json"), reverse=True):
            try:
                with open(f, "r") as fh:
                    data = json.load(fh)
                    sessions.append({
                        "id": data["id"],
                        "theme": data["theme"],
                        "started_at": data["started_at"],
                        "entries_count": len(data.get("entries", [])),
                    })
            except Exception:
                continue
        return sessions

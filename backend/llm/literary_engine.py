"""Literary Engine: Maps 4D neurophysiological state vector to literary style instructions"""

from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class NeuroState:
    """4D neurophysiological state vector"""
    calm: float = 0.5       # 0 (agitated) → 1 (very calm)
    activation: float = 0.5  # 0 (apathetic) → 1 (hyperactive)
    fatigue: float = 0.2     # 0 (fresh) → 1 (exhausted)
    quality: float = 0.8     # 0 (noisy signal) → 1 (clean signal)


@dataclass
class LiteraryTransformation:
    """Active transformation applied to text"""
    name: str
    value: str
    intensity: float  # 0-1


class LiteraryEngine:
    """Translates neurophysiological state into literary style prompts for the LLM."""

    def __init__(self, sensitivity: float = 1.0, mode: str = "balanced"):
        self.sensitivity = sensitivity  # 0.1 (conservative) → 2.0 (experimental)
        self.mode = mode  # "conservative", "balanced", "experimental"
        self._previous_text: str = ""

    def build_system_prompt(self, state: NeuroState, theme: str, base_text: str = "", is_editor: bool = False) -> Tuple[str, str, List[LiteraryTransformation]]:
        """Build system and user prompts from neuro state.

        Returns: (system_prompt, user_prompt, active_transformations)
        """
        transformations = self._compute_transformations(state)
        style_instructions = self._transformations_to_instructions(transformations)

        system_prompt = (
            "You are NeuroScript, a literary engine that writes prose whose formal qualities — "
            "sentence length, rhythm, sensory density, syntactic coherence, ellipsis — are "
            "controlled by real-time neurophysiological parameters. "
            "CRITICAL RULES:\n"
            "1. NEVER mention emotions, feelings, or mental states explicitly.\n"
            "2. NEVER describe the writing process or the system.\n"
            "3. Let the FORM of the language embody the state, not the content.\n"
            "4. Write in English.\n"
            "5. Produce exactly ONE paragraph (3-8 sentences).\n"
            "6. Maintain thematic coherence with the given scene/topic.\n\n"
            f"CURRENT STYLE PARAMETERS:\n{style_instructions}"
        )

        if is_editor and base_text:
            user_prompt = (
                f"Theme/Scene: {theme}\n\n"
                f"Base text to transform:\n\"{base_text}\"\n\n"
                "Rewrite this text applying the style parameters above. "
                "Keep the same meaning but reshape the form."
            )
        else:
            context = ""
            if self._previous_text:
                context = f"\nPrevious paragraph (continue from here):\n\"{self._previous_text}\"\n"
            user_prompt = (
                f"Theme/Scene: {theme}\n{context}\n"
                "Write the next paragraph. Apply the style parameters strictly."
            )

        return system_prompt, user_prompt, transformations

    def update_context(self, generated_text: str):
        """Store last generated text for continuity."""
        self._previous_text = generated_text.strip()

    def reset_context(self):
        """Clear context for new session."""
        self._previous_text = ""

    def _compute_transformations(self, state: NeuroState) -> List[LiteraryTransformation]:
        """Map neuro state to concrete literary transformations."""
        s = self.sensitivity
        t: List[LiteraryTransformation] = []

        # --- Sentence length ---
        if state.calm > 0.6:
            length_mod = min((state.calm - 0.5) * 2 * s, 1.0)
            t.append(LiteraryTransformation(
                name="Sentence length",
                value=f"Long with subordinates (+{int(length_mod*60)}%)",
                intensity=length_mod,
            ))
        elif state.activation > 0.6:
            frag_mod = min((state.activation - 0.5) * 2 * s, 1.0)
            t.append(LiteraryTransformation(
                name="Sentence length",
                value=f"Short, fragmented (-{int(frag_mod*50)}%)",
                intensity=frag_mod,
            ))

        # --- Rhythm ---
        if state.calm > 0.65:
            t.append(LiteraryTransformation(
                name="Rhythm",
                value="Sustained, flowing",
                intensity=min(state.calm * s, 1.0),
            ))
        elif state.activation > 0.65:
            t.append(LiteraryTransformation(
                name="Rhythm",
                value="Staccato, abrupt",
                intensity=min(state.activation * s, 1.0),
            ))

        # --- Sensory density ---
        density = (state.activation * 0.6 + state.calm * 0.4) * s
        density = min(max(density, 0.0), 1.0)
        if density > 0.5:
            t.append(LiteraryTransformation(
                name="Sensory density",
                value=f"High ({int(density*100)}%)",
                intensity=density,
            ))
        else:
            t.append(LiteraryTransformation(
                name="Sensory density",
                value=f"Low ({int(density*100)}%)",
                intensity=1.0 - density,
            ))

        # --- Verb tense ---
        if state.calm > 0.7:
            t.append(LiteraryTransformation(
                name="Verb tense",
                value="Present continuous / durative",
                intensity=state.calm,
            ))
        elif state.activation > 0.7:
            t.append(LiteraryTransformation(
                name="Verb tense",
                value="Immediate present / imperative",
                intensity=state.activation,
            ))
        elif state.fatigue > 0.5:
            t.append(LiteraryTransformation(
                name="Verb tense",
                value="Infinitive / past historic",
                intensity=state.fatigue,
            ))

        # --- Coherence ---
        if state.fatigue > 0.5:
            incoherence = min((state.fatigue - 0.3) * s, 1.0)
            t.append(LiteraryTransformation(
                name="Coherence",
                value=f"Reduced — associative drift ({int(incoherence*100)}%)",
                intensity=incoherence,
            ))
        else:
            coherence = min((1.0 - state.fatigue) * s, 1.0)
            t.append(LiteraryTransformation(
                name="Coherence",
                value=f"High — logical ({int(coherence*100)}%)",
                intensity=coherence,
            ))

        # --- Ellipsis ---
        if state.fatigue > 0.55:
            ellipsis_level = min((state.fatigue - 0.4) * 1.5 * s, 1.0)
            t.append(LiteraryTransformation(
                name="Ellipsis",
                value=f"Frequent — omitted subjects/verbs ({int(ellipsis_level*100)}%)",
                intensity=ellipsis_level,
            ))
        else:
            t.append(LiteraryTransformation(
                name="Ellipsis",
                value="None — complete syntax",
                intensity=0.0,
            ))

        # --- Signal noise contamination ---
        if state.quality < 0.5:
            noise = min((1.0 - state.quality) * s, 1.0)
            t.append(LiteraryTransformation(
                name="Signal noise",
                value=f"Repetitions, syntax contamination ({int(noise*100)}%)",
                intensity=noise,
            ))

        return t

    def _transformations_to_instructions(self, transformations: List[LiteraryTransformation]) -> str:
        """Convert transformations list to natural language instructions."""
        lines = []
        for tr in transformations:
            lines.append(f"- {tr.name}: {tr.value}")
        return "\n".join(lines)

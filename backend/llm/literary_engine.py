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
        self._story_history: List[str] = []
        self._paragraph_count: int = 0

    def build_system_prompt(self, state: NeuroState, theme: str, base_text: str = "", is_editor: bool = False) -> Tuple[str, str, List[LiteraryTransformation]]:
        """Build system and user prompts from neuro state.

        Returns: (system_prompt, user_prompt, active_transformations)
        """
        transformations = self._compute_transformations(state)
        style_instructions = self._transformations_to_instructions(transformations)

        base_rules = (
            "You are NeuroScript, a literary engine that writes prose whose formal qualities — "
            "sentence length, rhythm, sensory density, syntactic coherence, ellipsis — are "
            "controlled by real-time neurophysiological parameters. "
            "CRITICAL RULES:\n"
            "1. NEVER mention emotions, feelings, or mental states explicitly.\n"
            "2. NEVER describe the writing process or the system.\n"
            "3. Let the FORM of the language embody the state, not the content.\n"
            "4. Write in English.\n"
            "5. Produce exactly ONE paragraph (3-8 sentences).\n"
        )

        if is_editor and base_text:
            system_prompt = (
                base_rules +
                "6. You are REWRITING an existing text. Preserve its meaning but reshape the form.\n"
                "7. Each rewrite should feel fresh — vary the approach based on the style parameters.\n\n"
                f"CURRENT STYLE PARAMETERS:\n{style_instructions}"
            )
        else:
            narrative_instructions = self._get_narrative_instructions()
            system_prompt = (
                base_rules +
                "6. You are writing a COHERENT NARRATIVE. Every paragraph must logically continue the story.\n"
                "7. Introduce and develop CHARACTERS with names. Keep them consistent.\n"
                "8. Build PLOT with cause and effect. Events must connect.\n"
                "9. NEVER repeat or rephrase what was already written. Always advance the story.\n\n"
                f"NARRATIVE STAGE: {narrative_instructions}\n\n"
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
            story_context = self._build_story_context()
            user_prompt = (
                f"Theme/Scene: {theme}\n\n"
                f"{story_context}"
                "Write the NEXT paragraph. Advance the plot. Apply the style parameters strictly. "
                "Do NOT repeat or summarize what came before."
            )

        return system_prompt, user_prompt, transformations

    def update_context(self, generated_text: str):
        """Append generated text to story history."""
        text = generated_text.strip()
        if text:
            self._story_history.append(text)
            self._paragraph_count += 1

    def reset_context(self):
        """Clear context for new session."""
        self._story_history = []
        self._paragraph_count = 0

    def _get_narrative_instructions(self) -> str:
        """Return stage-appropriate narrative instructions."""
        n = self._paragraph_count
        if n == 0:
            return (
                "OPENING — This is the FIRST paragraph. Establish the setting vividly. "
                "Introduce a main character by NAME. Set the tone and atmosphere. "
                "Hint at a situation or tension that will develop."
            )
        elif n == 1:
            return (
                "INTRODUCTION — Second paragraph. Deepen the character. Introduce a second "
                "character or element of conflict. Begin building narrative tension. "
                "Ground the reader in the physical space."
            )
        elif n <= 4:
            return (
                "DEVELOPMENT — Develop the plot. Advance character interactions. "
                "Introduce complications or new story elements. Build toward a turning point. "
                "Each paragraph must move the story FORWARD."
            )
        elif n <= 7:
            return (
                "RISING ACTION — Intensify the conflict or tension. Characters must face "
                "obstacles or make decisions. The stakes should feel higher. "
                "Show consequences of earlier actions."
            )
        else:
            return (
                "CONTINUATION — Continue developing the narrative with new events and turns. "
                "Keep characters consistent. Introduce new complications if needed. "
                "Maintain momentum and avoid repetition."
            )

    def _build_story_context(self) -> str:
        """Build story context from history, using a sliding window for long stories."""
        if not self._story_history:
            return ""

        parts = []
        history = self._story_history

        # For long stories, keep first paragraph (establishes setting/characters)
        # plus the last few paragraphs for recent context
        if len(history) > 5:
            parts.append(f"[Opening paragraph]:\n\"{history[0]}\"\n")
            parts.append(f"[... {len(history) - 4} paragraphs omitted ...]\n")
            for i, p in enumerate(history[-3:], len(history) - 2):
                parts.append(f"[Paragraph {i}]:\n\"{p}\"\n")
        else:
            for i, p in enumerate(history, 1):
                parts.append(f"[Paragraph {i}]:\n\"{p}\"\n")

        return "STORY SO FAR:\n" + "\n".join(parts) + "\n"

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

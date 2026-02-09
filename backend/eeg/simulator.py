"""EEG Simulator: Generates realistic EEG-like data for testing without hardware"""

import asyncio
import numpy as np
import time
from typing import Callable, Optional

from config import settings
from llm.literary_engine import NeuroState


class EEGSimulator:
    """Generates synthetic EEG data with realistic band power fluctuations."""

    def __init__(self):
        self.fs = settings.eeg_sample_rate
        self.n_channels = settings.eeg_n_channels
        self.update_interval = settings.eeg_update_interval
        self._running = False
        self._time = 0.0
        self._drift_phase = np.random.uniform(0, 2 * np.pi, 4)

    def generate_segment(self, duration: float = None) -> np.ndarray:
        """Generate a segment of synthetic EEG data.

        Args:
            duration: seconds of data to generate (default: eeg_buffer_seconds)

        Returns:
            np.ndarray shape (n_channels, n_samples)
        """
        if duration is None:
            duration = settings.eeg_buffer_seconds
        n_samples = int(self.fs * duration)
        t = np.linspace(self._time, self._time + duration, n_samples, endpoint=False)
        self._time += duration

        data = np.zeros((self.n_channels, n_samples))

        drift_speed = 0.05
        calm_mod = 0.5 + 0.4 * np.sin(drift_speed * self._time + self._drift_phase[0])
        act_mod = 0.5 + 0.4 * np.sin(drift_speed * self._time * 1.3 + self._drift_phase[1])
        fatigue_mod = 0.3 + 0.3 * np.sin(drift_speed * self._time * 0.7 + self._drift_phase[2])

        for ch in range(self.n_channels):
            phase_offset = ch * 0.5
            delta = 0.8 * fatigue_mod * np.sin(2 * np.pi * 2.0 * t + phase_offset)
            theta = 0.6 * fatigue_mod * np.sin(2 * np.pi * 6.0 * t + phase_offset)
            alpha = 1.2 * calm_mod * np.sin(2 * np.pi * 10.0 * t + phase_offset)
            beta = 0.5 * act_mod * np.sin(2 * np.pi * 20.0 * t + phase_offset)
            gamma = 0.2 * act_mod * np.sin(2 * np.pi * 38.0 * t + phase_offset)
            noise = 0.15 * np.random.randn(n_samples)

            data[ch] = delta + theta + alpha + beta + gamma + noise

        return data

    async def stream(self, callback: Callable[[np.ndarray], None], stop_event: Optional[asyncio.Event] = None):
        """Continuously generate and emit EEG segments.

        Args:
            callback: called with each data segment (n_channels, n_samples)
            stop_event: set to stop streaming
        """
        self._running = True
        while self._running:
            if stop_event and stop_event.is_set():
                break
            segment = self.generate_segment(duration=self.update_interval)
            callback(segment)
            await asyncio.sleep(self.update_interval)

    def stop(self):
        self._running = False

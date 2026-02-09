"""EEG Signal Processor: Extracts band power and computes 4D neurophysiological state vector"""

import numpy as np
from scipy import signal as sig
from typing import Dict, Tuple
from collections import deque

from config import settings
from llm.literary_engine import NeuroState


class SignalProcessor:
    """Converts raw EEG data into the 4D NeuroState vector."""

    def __init__(self):
        self.fs = settings.eeg_sample_rate
        self.n_channels = settings.eeg_n_channels
        self.bands = {
            "delta": settings.band_delta,
            "theta": settings.band_theta,
            "alpha": settings.band_alpha,
            "beta": settings.band_beta,
            "gamma": settings.band_gamma,
        }
        self.smoothing = settings.smoothing_factor
        self._prev_state = NeuroState()
        self._baseline: Dict[str, float] = {}
        self._calibrating = False
        self._calibration_powers: list = []

    def compute_band_power(self, data: np.ndarray, band: Tuple[float, float]) -> float:
        """Compute average power in a frequency band across all channels.

        Args:
            data: shape (n_channels, n_samples)
            band: (low_freq, high_freq) in Hz
        """
        powers = []
        nperseg = min(self.fs, data.shape[1])
        for ch in range(min(data.shape[0], self.n_channels)):
            freqs, psd = sig.welch(data[ch], fs=self.fs, nperseg=nperseg)
            mask = (freqs >= band[0]) & (freqs <= band[1])
            if mask.any():
                powers.append(np.trapezoid(psd[mask], freqs[mask]))
        return float(np.mean(powers)) if powers else 0.0

    def compute_all_bands(self, data: np.ndarray) -> Dict[str, float]:
        """Compute power for all frequency bands."""
        return {name: self.compute_band_power(data, band) for name, band in self.bands.items()}

    def compute_signal_quality(self, data: np.ndarray) -> float:
        """Estimate signal quality (0-1) from signal-to-noise ratio."""
        if data.size == 0:
            return 0.0
        channel_qualities = []
        for ch in range(min(data.shape[0], self.n_channels)):
            ch_data = data[ch]
            rms = np.sqrt(np.mean(ch_data ** 2))
            std = np.std(ch_data)
            if rms < 1e-10:
                channel_qualities.append(0.0)
                continue
            peak_to_rms = np.max(np.abs(ch_data)) / (rms + 1e-10)
            saturation = np.mean(np.abs(ch_data) > np.percentile(np.abs(ch_data), 99))
            quality = 1.0
            if peak_to_rms > 10:
                quality *= 0.5
            if saturation > 0.05:
                quality *= 0.5
            if std < 1e-6:
                quality = 0.1
            channel_qualities.append(min(max(quality, 0.0), 1.0))
        return float(np.mean(channel_qualities))

    def bands_to_state(self, band_powers: Dict[str, float], quality: float) -> NeuroState:
        """Convert band powers to the 4D NeuroState vector."""
        total = sum(band_powers.values()) + 1e-10

        alpha_rel = band_powers["alpha"] / total
        beta_rel = band_powers["beta"] / total
        theta_rel = band_powers["theta"] / total
        delta_rel = band_powers["delta"] / total
        gamma_rel = band_powers["gamma"] / total

        calm_raw = (alpha_rel * 2.5 + (1.0 - beta_rel) * 0.5)
        activation_raw = (beta_rel * 2.0 + gamma_rel * 1.5)
        fatigue_raw = (theta_rel * 2.0 + delta_rel * 1.5)

        calm = min(max(calm_raw, 0.0), 1.0)
        activation = min(max(activation_raw, 0.0), 1.0)
        fatigue = min(max(fatigue_raw, 0.0), 1.0)

        if self._baseline:
            base_total = sum(self._baseline.values()) + 1e-10
            base_alpha = self._baseline["alpha"] / base_total
            base_beta = self._baseline["beta"] / base_total
            base_theta = self._baseline["theta"] / base_total
            calm = min(max(calm + (alpha_rel - base_alpha) * 3, 0.0), 1.0)
            activation = min(max(activation + (beta_rel - base_beta) * 3, 0.0), 1.0)
            fatigue = min(max(fatigue + (theta_rel - base_theta) * 3, 0.0), 1.0)

        new_state = NeuroState(
            calm=calm,
            activation=activation,
            fatigue=fatigue,
            quality=quality,
        )
        return self._smooth(new_state)

    def process(self, data: np.ndarray) -> NeuroState:
        """Full pipeline: raw EEG data → NeuroState.

        Args:
            data: shape (n_channels, n_samples)
        """
        band_powers = self.compute_all_bands(data)
        quality = self.compute_signal_quality(data)

        if self._calibrating:
            self._calibration_powers.append(band_powers)

        return self.bands_to_state(band_powers, quality)

    def start_calibration(self):
        """Begin collecting baseline data."""
        self._calibrating = True
        self._calibration_powers = []

    def finish_calibration(self) -> bool:
        """Finish calibration and set baseline from collected data."""
        self._calibrating = False
        if not self._calibration_powers:
            return False
        self._baseline = {}
        for band_name in self.bands:
            self._baseline[band_name] = float(
                np.mean([p[band_name] for p in self._calibration_powers])
            )
        return True

    def _smooth(self, new: NeuroState) -> NeuroState:
        """Apply exponential moving average smoothing."""
        a = self.smoothing
        smoothed = NeuroState(
            calm=a * new.calm + (1 - a) * self._prev_state.calm,
            activation=a * new.activation + (1 - a) * self._prev_state.activation,
            fatigue=a * new.fatigue + (1 - a) * self._prev_state.fatigue,
            quality=a * new.quality + (1 - a) * self._prev_state.quality,
        )
        self._prev_state = smoothed
        return smoothed

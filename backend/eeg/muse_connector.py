"""Muse EEG Connector: Connects to Muse headband via LSL (Lab Streaming Layer)"""

import asyncio
import logging
import numpy as np
from typing import Callable, Optional
from collections import deque

from config import settings

logger = logging.getLogger(__name__)

try:
    from pylsl import StreamInlet, resolve_stream
    LSL_AVAILABLE = True
except ImportError:
    LSL_AVAILABLE = False
    logger.warning("pylsl not available. Install with: pip install pylsl")


class MuseConnector:
    """Connects to Muse EEG headband via muselsl/LSL."""

    CHANNEL_NAMES = ["TP9", "AF7", "AF8", "TP10"]

    def __init__(self):
        self.fs = settings.eeg_sample_rate
        self.n_channels = settings.eeg_n_channels
        self.update_interval = settings.eeg_update_interval
        self.inlet: Optional[object] = None
        self._running = False
        self._buffer = deque(maxlen=self.fs * settings.eeg_buffer_seconds)

    def connect(self) -> bool:
        """Find and connect to a Muse EEG LSL stream."""
        if not LSL_AVAILABLE:
            logger.error("pylsl not installed. Cannot connect to Muse.")
            return False

        try:
            logger.info("Searching for Muse EEG stream...")
            streams = resolve_stream("type", "EEG", timeout=10.0)
            if not streams:
                logger.error("No EEG streams found. Start muselsl first: muselsl stream")
                return False

            self.inlet = StreamInlet(streams[0])
            info = streams[0]
            logger.info(
                f"Connected to Muse stream: {info.name()} "
                f"({info.channel_count()} ch @ {info.nominal_srate()} Hz)"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Muse: {e}")
            return False

    def disconnect(self):
        """Disconnect from LSL stream."""
        if self.inlet:
            self.inlet.close_stream()
            self.inlet = None
            logger.info("Disconnected from Muse stream")

    async def stream(self, callback: Callable[[np.ndarray], None], stop_event: Optional[asyncio.Event] = None):
        """Continuously read EEG data and emit segments via callback.

        Args:
            callback: called with each data segment (n_channels, n_samples)
            stop_event: set to stop streaming
        """
        if not self.inlet:
            logger.error("Not connected. Call connect() first.")
            return

        self._running = True
        samples_needed = int(self.fs * self.update_interval)

        while self._running:
            if stop_event and stop_event.is_set():
                break

            collected = []
            while len(collected) < samples_needed:
                try:
                    sample, timestamp = self.inlet.pull_sample(timeout=1.0)
                    if sample:
                        collected.append(sample[:self.n_channels])
                except Exception as e:
                    logger.error(f"LSL read error: {e}")
                    await asyncio.sleep(0.01)
                    break

            if collected:
                data = np.array(collected).T  # (n_channels, n_samples)
                callback(data)

            await asyncio.sleep(0.01)

    def stop(self):
        self._running = False

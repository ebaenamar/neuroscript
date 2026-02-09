"""NeuroScript Central Configuration"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # ZhipuAI / GLM-4.7
    zhipuai_api_key: str = Field(default="", env="ZHIPUAI_API_KEY")
    zhipuai_model: str = Field(default="glm-4.7", env="ZHIPUAI_MODEL")
    zhipuai_base_url: str = Field(
        default="https://open.bigmodel.cn/api/paas/v4",
        env="ZHIPUAI_BASE_URL",
    )

    # EEG source: "simulator" | "muse"
    eeg_source: str = Field(default="simulator", env="EEG_SOURCE")

    # EEG processing
    eeg_sample_rate: int = 256  # Muse sample rate
    eeg_n_channels: int = 4  # Muse channels: TP9, AF7, AF8, TP10
    eeg_update_interval: float = 0.5  # State vector update every 500ms
    eeg_buffer_seconds: int = 5  # Band power analysis window

    # Frequency bands (Hz)
    band_delta: tuple = (0.5, 4.0)
    band_theta: tuple = (4.0, 8.0)
    band_alpha: tuple = (8.0, 13.0)
    band_beta: tuple = (13.0, 30.0)
    band_gamma: tuple = (30.0, 45.0)

    # Literary engine
    generation_interval: float = 12.0  # Seconds between paragraphs
    smoothing_factor: float = 0.3  # EMA smoothing for state vector

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

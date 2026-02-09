"""ZhipuAI GLM-4.7 Client with streaming support"""

import asyncio
import httpx
import json
import logging
from typing import AsyncGenerator, Optional

from config import settings

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2.0

logger = logging.getLogger(__name__)


class ZhipuClient:
    """Client for ZhipuAI GLM-4.7 API (OpenAI-compatible format)"""

    def __init__(self):
        self.api_key = settings.zhipuai_api_key
        self.model = settings.zhipuai_model
        self.base_url = settings.zhipuai_base_url
        self.endpoint = f"{self.base_url}/chat/completions"

    def _build_payload(self, system_prompt, user_prompt, temperature, max_tokens, stream=False):
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "thinking": {"type": "disabled"},
        }
        if stream:
            payload["stream"] = True
        return payload

    def _headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.85,
        max_tokens: int = 1024,
    ) -> str:
        """Non-streaming generation with retry. Returns complete text."""
        payload = self._build_payload(system_prompt, user_prompt, temperature, max_tokens)
        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.endpoint, json=payload, headers=self._headers()
                    )
                    if response.status_code == 429:
                        delay = RETRY_BASE_DELAY * (2 ** attempt)
                        logger.warning(f"Rate limited (429). Retrying in {delay}s (attempt {attempt+1}/{MAX_RETRIES})")
                        await asyncio.sleep(delay)
                        continue
                    response.raise_for_status()
                    data = response.json()
                    msg = data["choices"][0]["message"]
                    return msg.get("content") or msg.get("reasoning_content") or ""
            except httpx.HTTPStatusError:
                raise
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_BASE_DELAY)
                    continue
                raise
        raise Exception("Max retries exceeded for GLM-4.7 API")

    async def generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.85,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        """Streaming generation with retry. Yields text chunks."""
        payload = self._build_payload(system_prompt, user_prompt, temperature, max_tokens, stream=True)
        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    async with client.stream(
                        "POST", self.endpoint, json=payload, headers=self._headers()
                    ) as response:
                        if response.status_code == 429:
                            delay = RETRY_BASE_DELAY * (2 ** attempt)
                            logger.warning(f"Rate limited (429). Retrying in {delay}s (attempt {attempt+1}/{MAX_RETRIES})")
                            await asyncio.sleep(delay)
                            continue
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line or not line.startswith("data:"):
                                continue
                            data_str = line[len("data:"):].strip()
                            if data_str == "[DONE]":
                                return
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content") or delta.get("reasoning_content") or ""
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
                        return  # Stream completed successfully
            except httpx.HTTPStatusError:
                raise
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_BASE_DELAY)
                    continue
                raise

    async def test_connection(self) -> dict:
        """Test API connectivity. Returns status dict."""
        try:
            result = await self.generate(
                system_prompt="You are a helpful assistant.",
                user_prompt="Say 'NeuroScript connected' in exactly 3 words.",
                max_tokens=20,
            )
            return {"status": "ok", "response": result, "model": self.model}
        except Exception as e:
            logger.error(f"GLM-4.7 connection test failed: {e}")
            return {"status": "error", "error": str(e), "model": self.model}

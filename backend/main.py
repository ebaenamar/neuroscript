"""NeuroScript Backend: FastAPI server with WebSocket for real-time EEG → Literary generation"""

import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from eeg.simulator import EEGSimulator
from eeg.signal_processor import SignalProcessor
from llm.zhipu_client import ZhipuClient
from llm.literary_engine import LiteraryEngine, NeuroState
from session.manager import SessionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="NeuroScript API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared state
llm_client = ZhipuClient()
session_mgr = SessionManager()


@app.get("/api/health")
async def health():
    return {"status": "ok", "model": settings.zhipuai_model, "eeg_source": settings.eeg_source}


@app.get("/api/test-llm")
async def test_llm():
    return await llm_client.test_connection()


@app.get("/api/sessions")
async def list_sessions():
    return session_mgr.list_sessions()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """Main WebSocket: streams EEG state and generated text to the frontend."""
    await ws.accept()
    logger.info("WebSocket client connected")

    # Per-connection state
    processor = SignalProcessor()
    engine = LiteraryEngine()
    simulator = EEGSimulator()
    stop_event = asyncio.Event()
    current_state = NeuroState()
    generating = False
    paused = True
    theme = ""
    mode = "generator"
    base_text = ""
    session_active = False

    async def eeg_loop():
        """Continuously stream EEG state to the client."""
        nonlocal current_state
        def on_segment(data):
            nonlocal current_state
            current_state = processor.process(data)

        if settings.eeg_source == "simulator":
            await simulator.stream(on_segment, stop_event)
        else:
            from eeg.muse_connector import MuseConnector
            connector = MuseConnector()
            if connector.connect():
                await connector.stream(on_segment, stop_event)
            else:
                await ws.send_json({"type": "error", "message": "Failed to connect to Muse EEG"})

    async def state_broadcast_loop():
        """Send EEG state to frontend every update interval."""
        while not stop_event.is_set():
            await ws.send_json({
                "type": "eeg_state",
                "state": {
                    "calm": round(current_state.calm, 3),
                    "activation": round(current_state.activation, 3),
                    "fatigue": round(current_state.fatigue, 3),
                    "quality": round(current_state.quality, 3),
                },
                "timestamp": time.time(),
            })
            await asyncio.sleep(settings.eeg_update_interval)

    async def generation_loop():
        """Generate text paragraphs based on current EEG state."""
        nonlocal generating
        while not stop_event.is_set():
            if paused or not theme:
                await asyncio.sleep(0.5)
                continue

            generating = True
            try:
                is_editor = mode == "editor"
                system_prompt, user_prompt, transformations = engine.build_system_prompt(
                    current_state, theme, base_text=base_text, is_editor=is_editor
                )

                # Send active transformations
                await ws.send_json({
                    "type": "transformations",
                    "items": [
                        {"name": t.name, "value": t.value, "intensity": round(t.intensity, 2)}
                        for t in transformations
                    ],
                })

                # Stream text generation — finish at sentence boundary on pause/stop
                full_text = ""
                finish_at_sentence = False
                await ws.send_json({"type": "text_start"})
                async for chunk in llm_client.generate_stream(
                    system_prompt, user_prompt, max_tokens=500
                ):
                    if stop_event.is_set():
                        break
                    full_text += chunk
                    await ws.send_json({"type": "text_chunk", "chunk": chunk})
                    if paused:
                        finish_at_sentence = True
                    if finish_at_sentence:
                        stripped = full_text.rstrip()
                        if stripped and stripped[-1] in '.!?;':
                            break

                await ws.send_json({"type": "text_end", "full_text": full_text})
                if not is_editor:
                    engine.update_context(full_text)

                # Record in session
                if session_active:
                    session_mgr.add_entry(current_state, full_text, transformations)

            except Exception as e:
                logger.error(f"Generation error: {e}")
                await ws.send_json({"type": "error", "message": str(e)})

            generating = False
            # Wait before next generation
            await asyncio.sleep(settings.generation_interval)

    # Start background tasks
    eeg_task = asyncio.create_task(eeg_loop())
    broadcast_task = asyncio.create_task(state_broadcast_loop())
    gen_task = asyncio.create_task(generation_loop())

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type", "")

            if msg_type == "configure":
                theme = msg.get("theme", theme)
                mode = msg.get("mode", mode)
                base_text = msg.get("baseText", base_text)
                engine.sensitivity = msg.get("sensitivity", engine.sensitivity)
                logger.info(f"Configured: theme='{theme}', mode={mode}, sensitivity={engine.sensitivity}")
                await ws.send_json({"type": "configured", "theme": theme, "mode": mode})

            elif msg_type == "start":
                # Accept inline config so frontend can send config+start in one step
                if "theme" in msg:
                    theme = msg["theme"]
                if "mode" in msg:
                    mode = msg["mode"]
                if "baseText" in msg:
                    base_text = msg["baseText"]
                if "sensitivity" in msg:
                    engine.sensitivity = msg["sensitivity"]
                is_continue = msg.get("continueSession", False)
                if not is_continue:
                    engine.reset_context()
                paused = False
                session_active = True
                session_id = session_mgr.start_session(theme, mode)
                await ws.send_json({"type": "started", "sessionId": session_id, "continued": is_continue})
                logger.info(f"Generation {'continued' if is_continue else 'started'}: session={session_id}, theme='{theme}', mode={mode}")

            elif msg_type == "pause":
                paused = True
                await ws.send_json({"type": "paused"})

            elif msg_type == "resume":
                paused = False
                await ws.send_json({"type": "resumed"})

            elif msg_type == "stop":
                paused = True
                if session_active:
                    filepath = session_mgr.end_session()
                    session_active = False
                    await ws.send_json({"type": "stopped", "savedTo": filepath})
                else:
                    await ws.send_json({"type": "stopped"})

            elif msg_type == "export_text":
                text = session_mgr.export_text()
                await ws.send_json({"type": "export", "format": "text", "content": text})

            elif msg_type == "calibrate_start":
                processor.start_calibration()
                await ws.send_json({"type": "calibrating"})

            elif msg_type == "calibrate_end":
                success = processor.finish_calibration()
                await ws.send_json({"type": "calibrated", "success": success})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        stop_event.set()
        for task in [eeg_task, broadcast_task, gen_task]:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)

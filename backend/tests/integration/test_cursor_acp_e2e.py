from __future__ import annotations

import asyncio
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

import httpx
import websockets


@unittest.skipUnless(
    os.getenv("VELPOS_RUN_CURSOR_ACP_E2E") == "1",
    "set VELPOS_RUN_CURSOR_ACP_E2E=1 to run Cursor ACP end-to-end test against a running backend",
)
class TestCursorAcpEndToEnd(unittest.IsolatedAsyncioTestCase):
    """Opt-in E2E: REST create session(provider=cursor) + WebSocket send_prompt."""

    async def test_cursor_session_websocket_reply(self) -> None:
        if not shutil.which("agent"):
            self.skipTest("Cursor CLI `agent` executable not found in PATH")

        base_url = os.getenv("VELPOS_E2E_BASE_URL", "http://localhost:8083").rstrip("/")
        ws_base = base_url.replace("https://", "wss://").replace("http://", "ws://")

        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = str(Path(temp_dir).resolve())
            (Path(project_dir) / "README.md").write_text("# Velpos Cursor E2E\n", encoding="utf-8")

            async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
                try:
                    health = await client.get("/api/health")
                    health.raise_for_status()
                except Exception as exc:
                    self.skipTest(f"Backend not reachable at {base_url}: {exc}")

                create_resp = await client.post(
                    "/api/sessions",
                    json={
                        "model": "auto",
                        "provider": "cursor",
                        "project_dir": project_dir,
                        "name": "cursor-e2e",
                    },
                )
                create_resp.raise_for_status()
                payload = create_resp.json()
                self.assertEqual(0, payload.get("code"), payload)
                session_id = payload["data"]["session_id"]
                self.assertEqual("cursor", payload["data"].get("provider"))

            ws_url = f"{ws_base}/ws/{session_id}"
            assistant_text = ""
            async with websockets.connect(ws_url, open_timeout=10) as websocket:
                connected = json.loads(await asyncio.wait_for(websocket.recv(), timeout=10))
                self.assertEqual("connected", connected.get("event"))

                await websocket.send(
                    json.dumps(
                        {
                            "action": "send_prompt",
                            "prompt": "Reply with exactly: e2e-ok",
                        }
                    )
                )

                deadline = asyncio.get_running_loop().time() + 120
                while asyncio.get_running_loop().time() < deadline:
                    raw = await asyncio.wait_for(websocket.recv(), timeout=30)
                    event = json.loads(raw)
                    if event.get("event") != "message":
                        continue
                    data = event.get("data") or {}
                    if data.get("type") != "assistant":
                        continue
                    content = data.get("content") or {}
                    blocks = content.get("blocks") or []
                    for block in blocks:
                        if block.get("type") == "text":
                            assistant_text += block.get("text") or ""
                    if not assistant_text and isinstance(content.get("text"), str):
                        assistant_text += content["text"]
                    if assistant_text.strip():
                        break

            self.assertTrue(
                assistant_text.strip(),
                "WebSocket did not receive assistant text; check backend logs and Cursor auth",
            )


if __name__ == "__main__":
    unittest.main()

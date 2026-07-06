from __future__ import annotations

import os
from pathlib import Path
import shutil
import tempfile
import unittest

from infr.client.acp.acp_gateway import AcpGateway
from infr.client.acp.provider import AgentProviderConfig


@unittest.skipUnless(
    os.getenv("VELPOS_RUN_CURSOR_ACP_TEST") == "1",
    "set VELPOS_RUN_CURSOR_ACP_TEST=1 to run real Cursor ACP smoke test",
)
class TestCursorAcpSmoke(unittest.IsolatedAsyncioTestCase):
    """Opt-in smoke test for a locally authenticated Cursor CLI.

    This test intentionally stays outside the default unit-test suite because it
    starts a real `agent acp` process and requires local Cursor authentication.
    """

    async def test_cursor_agent_acp_simple_prompt(self) -> None:
        agent_path = shutil.which("agent")
        if not agent_path:
            self.skipTest("Cursor CLI `agent` executable not found in PATH")

        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            (workspace / "README.md").write_text("# Velpos ACP smoke\n", encoding="utf-8")
            gateway = AcpGateway(
                AgentProviderConfig(
                    name="cursor",
                    transport="stdio",
                    command=agent_path,
                    args=["acp"],
                    auth_method="cursor_login",
                    default_model="auto",
                    env={"CURSOR_API_KEY": os.getenv("CURSOR_API_KEY", "")},
                )
            )

            try:
                messages = [
                    message
                    async for message in gateway.connect(
                        session_id="smoke",
                        model="auto",
                        prompt="Reply with exactly: ok",
                        cwd=str(workspace),
                    )
                ]
            finally:
                await gateway.disconnect("smoke")

        self.assertTrue(
            messages,
            "Cursor ACP returned no mapped messages; check Cursor CLI auth and ACP protocol output",
        )

from __future__ import annotations

from typing import Any
import unittest
from pathlib import Path

from infr.client.acp.acp_gateway import AcpGateway
from infr.client.acp.provider import AgentProviderConfig


class FakeTransport:
    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = list(responses)
        self.sent: list[dict[str, Any]] = []
        self.started = False
        self.closed = False

    async def start(self) -> None:
        self.started = True

    async def send_json(self, payload: dict[str, Any]) -> None:
        self.sent.append(payload)

    async def receive_json(self) -> dict[str, Any]:
        if not self.responses:
            raise RuntimeError("no fake ACP responses queued")
        return self.responses.pop(0)

    async def close(self) -> None:
        self.closed = True


class TestAcpGatewayCancel(unittest.IsolatedAsyncioTestCase):
    def _provider(self) -> AgentProviderConfig:
        return AgentProviderConfig(
            name="cursor",
            transport="stdio",
            command="agent",
            args=["acp"],
            default_model="auto",
        )

    async def test_interrupt_sends_session_cancel_notification(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)
        _ = [message async for message in gateway.connect("velpos-1", "auto", "hi", cwd="/tmp/project")]

        await gateway.interrupt("velpos-1")

        cancel_messages = [item for item in transport.sent if item.get("method") == "session/cancel"]
        self.assertEqual(1, len(cancel_messages))
        self.assertNotIn("id", cancel_messages[0])
        self.assertEqual("acp-session-1", cancel_messages[0]["params"]["sessionId"])
        self.assertEqual("interrupted", gateway.get_state("velpos-1"))

    async def test_initialize_declares_fs_and_terminal_capabilities(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)
        _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        initialize = transport.sent[0]
        capabilities = initialize["params"]["clientCapabilities"]
        self.assertTrue(capabilities["fs"]["readTextFile"])
        self.assertTrue(capabilities["fs"]["writeTextFile"])
        self.assertTrue(capabilities["terminal"])

    async def test_handles_fs_read_request_during_prompt(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            sample = Path(temp_dir) / "README.md"
            sample.write_text("hello workspace", encoding="utf-8")
            transport = FakeTransport(
                [
                    {"jsonrpc": "2.0", "id": 1, "result": {}},
                    {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                    {
                        "jsonrpc": "2.0",
                        "id": 99,
                        "method": "fs/read_text_file",
                        "params": {"sessionId": "acp-session-1", "path": str(sample)},
                    },
                    {"jsonrpc": "2.0", "method": "session/update", "params": {"update": {"type": "agent_message_chunk", "text": "done"}}},
                    {"jsonrpc": "2.0", "id": 3, "result": {}},
                ]
            )
            gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)
            messages = [message async for message in gateway.connect("velpos-1", "auto", "hi", cwd=temp_dir)]

        fs_responses = [item for item in transport.sent if item.get("id") == 99]
        self.assertEqual(1, len(fs_responses))
        self.assertEqual("hello workspace", fs_responses[0]["result"]["content"])
        self.assertEqual("done", messages[0]["content"]["blocks"][0]["text"])


if __name__ == "__main__":
    unittest.main()

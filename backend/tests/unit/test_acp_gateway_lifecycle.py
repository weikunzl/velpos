from __future__ import annotations

from typing import Any
import unittest

from infr.client.acp.acp_gateway import AcpGateway
from infr.client.acp.provider import AgentProviderConfig


class FakeTransport:
    """Deterministic in-memory transport for AcpGateway lifecycle tests."""

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


class TestAcpGatewayLifecycle(unittest.IsolatedAsyncioTestCase):
    def _provider(self) -> AgentProviderConfig:
        return AgentProviderConfig(
            name="cursor",
            transport="stdio",
            command="agent",
            args=["acp"],
            default_model="auto",
        )

    async def test_connect_initializes_session_and_yields_mapped_updates(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {"protocolVersion": 1}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "method": "session/update", "params": {"update": {"type": "agent_message_chunk", "text": "hello"}}},
                {"jsonrpc": "2.0", "id": 3, "result": {"stopReason": "end_turn"}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)

        messages = [message async for message in gateway.connect("velpos-1", "auto", "hi", cwd="/tmp/project")]

        self.assertTrue(transport.started)
        self.assertTrue(gateway.is_connected("velpos-1"))
        self.assertEqual("connected", gateway.get_state("velpos-1"))
        self.assertEqual("auto", gateway.get_connected_model("velpos-1"))
        self.assertEqual("_meta", messages[0]["message_type"])
        self.assertEqual("acp-session-1", messages[0]["sdk_session_id"])
        self.assertEqual([{"type": "text", "text": "hello"}], messages[1]["content"]["blocks"])
        self.assertEqual("result", messages[-1]["message_type"])
        self.assertEqual(["initialize", "session/new", "session/prompt"], [item["method"] for item in transport.sent])
        self.assertEqual("/tmp/project", transport.sent[1]["params"]["cwd"])
        self.assertEqual([], transport.sent[1]["params"]["mcpServers"])
        self.assertEqual("acp-session-1", transport.sent[2]["params"]["sessionId"])
        self.assertEqual([{"type": "text", "text": "hi"}], transport.sent[2]["params"]["prompt"])
        self.assertEqual("acp-session-1", gateway.get_cached_sdk_session_id("velpos-1"))

    async def test_connect_accepts_legacy_claude_kwargs_without_forwarding_them(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)

        _ = [
            message
            async for message in gateway.connect(
                "velpos-1",
                "auto",
                "hi",
                enable_file_checkpointing=True,
            )
        ]

        self.assertEqual(["initialize", "session/new", "session/prompt"], [item["method"] for item in transport.sent])

    async def test_auth_method_sends_authenticate_before_session_new(self) -> None:
        provider = AgentProviderConfig(
            name="cursor",
            transport="stdio",
            command="agent",
            args=["acp"],
            auth_method="cursor_login",
            default_model="auto",
        )
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {}},
                {"jsonrpc": "2.0", "id": 3, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "id": 4, "result": {}},
            ]
        )
        gateway = AcpGateway(provider, transport_factory=lambda _provider: transport)

        _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        self.assertEqual(["initialize", "authenticate", "session/new", "session/prompt"], [item["method"] for item in transport.sent])
        self.assertEqual({"methodId": "cursor_login"}, transport.sent[1]["params"])

    async def test_send_query_reuses_existing_connection(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
                {"jsonrpc": "2.0", "method": "session/update", "params": {"update": {"type": "agent_message_chunk", "text": "again"}}},
                {"jsonrpc": "2.0", "id": 4, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)
        _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        messages = [message async for message in gateway.send_query("velpos-1", "again")]

        self.assertEqual("session/prompt", transport.sent[-1]["method"])
        self.assertEqual([{"type": "text", "text": "again"}], transport.sent[-1]["params"]["prompt"])
        self.assertEqual("again", messages[0]["content"]["blocks"][0]["text"])
        self.assertEqual("result", messages[-1]["message_type"])

    async def test_connect_uses_session_load_when_sdk_session_id_provided(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {}},
                {"jsonrpc": "2.0", "method": "session/update", "params": {"update": {"type": "agent_message_chunk", "text": "resumed"}}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)

        messages = [
            message
            async for message in gateway.connect(
                "velpos-1",
                "auto",
                "hi",
                cwd="/tmp/project",
                sdk_session_id="acp-session-existing",
            )
        ]

        self.assertEqual(["initialize", "session/load", "session/prompt"], [item["method"] for item in transport.sent])
        self.assertEqual("acp-session-existing", transport.sent[1]["params"]["sessionId"])
        self.assertEqual("acp-session-existing", messages[0]["sdk_session_id"])
        self.assertEqual("resumed", messages[1]["content"]["blocks"][0]["text"])

    async def test_connect_falls_back_to_session_new_when_load_fails(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "error": {"message": "session not found"}},
                {"jsonrpc": "2.0", "id": 3, "result": {"sessionId": "acp-session-fresh"}},
                {"jsonrpc": "2.0", "id": 4, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)

        messages = [
            message
            async for message in gateway.connect(
                "velpos-1",
                "auto",
                "hi",
                sdk_session_id="acp-session-missing",
            )
        ]

        self.assertEqual(
            ["initialize", "session/load", "session/new", "session/prompt"],
            [item["method"] for item in transport.sent],
        )
        self.assertTrue(messages[0].get("resume_failed"))
        self.assertEqual("acp-session-fresh", messages[1]["sdk_session_id"])

    async def test_idle_disconnect_closes_inactive_connection(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)
        _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        await gateway._idle_disconnect("velpos-1")

        self.assertTrue(transport.closed)
        self.assertFalse(gateway.is_connected("velpos-1"))
        self.assertEqual("acp-session-1", gateway.get_cached_sdk_session_id("velpos-1"))

    async def test_disconnect_closes_transport_and_clears_state(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)
        _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        await gateway.disconnect("velpos-1")

        self.assertTrue(transport.closed)
        self.assertFalse(gateway.is_connected("velpos-1"))
        self.assertEqual("idle", gateway.get_state("velpos-1"))

    async def test_send_query_without_connection_fails_clearly(self) -> None:
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: FakeTransport([]))

        with self.assertRaisesRegex(RuntimeError, "No active ACP connection for session velpos-1"):
            _ = [message async for message in gateway.send_query("velpos-1", "hi")]

    async def test_rpc_error_fails_clearly(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "error": {"message": "bad initialize"}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)

        with self.assertRaisesRegex(RuntimeError, "ACP request initialize failed: bad initialize"):
            _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

    async def test_connect_error_closes_transport(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "error": {"message": "bad initialize"}},
            ]
        )
        gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)

        with self.assertRaisesRegex(RuntimeError, "bad initialize"):
            _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        self.assertTrue(transport.closed)
        self.assertFalse(gateway.is_connected("velpos-1"))


if __name__ == "__main__":
    unittest.main()

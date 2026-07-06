from __future__ import annotations

from typing import Any
import unittest

from infr.client.acp.acp_gateway import AcpGateway
from infr.client.acp.provider import AgentProviderConfig


class FakeTransport:
    """Fake transport that records responses sent by AcpGateway."""

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


class TestAcpGatewayPermission(unittest.IsolatedAsyncioTestCase):
    def _provider(self) -> AgentProviderConfig:
        return AgentProviderConfig(
            name="cursor",
            transport="stdio",
            command="agent",
            args=["acp"],
            default_model="auto",
        )

    async def _connected_gateway(self, transport: FakeTransport, timeout: float = 1.0) -> AcpGateway:
        gateway = AcpGateway(
            self._provider(),
            transport_factory=lambda _provider: transport,
            user_response_timeout=timeout,
        )
        return gateway

    async def test_permission_request_allow_sends_allow_result(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {
                    "jsonrpc": "2.0",
                    "id": 90,
                    "method": "session/request_permission",
                    "params": {"toolName": "write_file", "toolInput": {"path": "a.txt"}},
                },
                {"jsonrpc": "2.0", "method": "session/update", "params": {"update": {"type": "agent_message_chunk", "text": "ok"}}},
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        events: list[dict[str, Any]] = []
        gateway = await self._connected_gateway(transport)
        gateway.set_broadcast_fn(lambda _sid, event: events.append(event))

        async def run_prompt() -> list[dict[str, Any]]:
            return [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        task = self._asyncio_create_task(run_prompt())
        await self._wait_for(lambda: bool(events))

        self.assertEqual("permission_request", events[0]["event"])
        self.assertEqual("write_file", events[0]["tool_name"])
        resolved = await gateway.resolve_user_response("velpos-1", {"decision": "allow"})
        messages = await task

        self.assertTrue(resolved)
        self.assertEqual("ok", messages[0]["content"]["blocks"][0]["text"])
        self.assertEqual("result", messages[-1]["message_type"])
        permission_response = [item for item in transport.sent if item.get("id") == 90][0]
        self.assertEqual({"outcome": "allow"}, permission_response["result"])

    async def test_permission_request_deny_sends_deny_result(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {
                    "jsonrpc": "2.0",
                    "id": 90,
                    "method": "session/request_permission",
                    "params": {"toolName": "write_file", "toolInput": {"path": "a.txt"}},
                },
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = await self._connected_gateway(transport)
        gateway.set_broadcast_fn(lambda _sid, _event: None)

        async def run_prompt() -> list[dict[str, Any]]:
            return [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        task = self._asyncio_create_task(run_prompt())
        await self._wait_for(lambda: gateway.is_waiting_for_user_input("velpos-1"))
        await gateway.resolve_user_response("velpos-1", {"decision": "deny", "message": "not allowed"})
        await task

        permission_response = [item for item in transport.sent if item.get("id") == 90][0]
        self.assertEqual({"outcome": "deny", "message": "not allowed"}, permission_response["result"])

    async def test_permission_timeout_denies_request(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {
                    "jsonrpc": "2.0",
                    "id": 90,
                    "method": "session/request_permission",
                    "params": {"toolName": "write_file", "toolInput": {}},
                },
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        gateway = await self._connected_gateway(transport, timeout=0.01)
        gateway.set_broadcast_fn(lambda _sid, _event: None)

        _ = [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        permission_response = [item for item in transport.sent if item.get("id") == 90][0]
        self.assertEqual("deny", permission_response["result"]["outcome"])
        self.assertIn("timeout", permission_response["result"]["message"].lower())

    async def test_cursor_ask_question_maps_to_user_choice_request(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {
                    "jsonrpc": "2.0",
                    "id": 91,
                    "method": "cursor/ask_question",
                    "params": {"questions": [{"id": "q1", "prompt": "Continue?"}]},
                },
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        events: list[dict[str, Any]] = []
        gateway = await self._connected_gateway(transport)
        gateway.set_broadcast_fn(lambda _sid, event: events.append(event))

        async def run_prompt() -> list[dict[str, Any]]:
            return [message async for message in gateway.connect("velpos-1", "auto", "hi")]

        task = self._asyncio_create_task(run_prompt())
        await self._wait_for(lambda: bool(events))
        await gateway.resolve_user_response("velpos-1", {"answers": {"q1": "yes"}})
        await task

        self.assertEqual("user_choice_request", events[0]["event"])
        self.assertEqual([{"id": "q1", "prompt": "Continue?"}], events[0]["questions"])
        choice_response = [item for item in transport.sent if item.get("id") == 91][0]
        self.assertEqual({"answers": {"q1": "yes"}}, choice_response["result"])

    async def test_permission_request_reads_nested_tool_call_payload(self) -> None:
        transport = FakeTransport(
            [
                {"jsonrpc": "2.0", "id": 1, "result": {}},
                {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                {
                    "jsonrpc": "2.0",
                    "id": 90,
                    "method": "session/request_permission",
                    "params": {
                        "toolCall": {
                            "title": "write_file",
                            "rawInput": {"path": "a.txt"},
                        }
                    },
                },
                {"jsonrpc": "2.0", "id": 3, "result": {}},
            ]
        )
        events: list[dict[str, Any]] = []
        gateway = await self._connected_gateway(transport)
        gateway.set_broadcast_fn(lambda _sid, event: events.append(event))

        task = self._asyncio_create_task(
            self._collect_messages(gateway.connect("velpos-1", "auto", "hi"))
        )
        await self._wait_for(lambda: bool(events))
        await gateway.resolve_user_response("velpos-1", {"decision": "allow"})
        await task

        self.assertEqual("write_file", events[0]["tool_name"])
        self.assertIn("a.txt", events[0]["tool_input"])

    async def _collect_messages(self, stream):
        return [message async for message in stream]

    async def _wait_for(self, predicate, attempts: int = 20) -> None:
        for _ in range(attempts):
            if predicate():
                return
            await self._asyncio_sleep(0.01)
        self.fail("condition was not met")

    def _asyncio_create_task(self, coro):
        import asyncio

        return asyncio.create_task(coro)

    async def _asyncio_sleep(self, seconds: float) -> None:
        import asyncio

        await asyncio.sleep(seconds)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

from typing import Any, AsyncIterator
import unittest

from domain.session.acl.agent_gateway import AgentCapability, AgentGateway, NormalizedMessage
from infr.client.routing_agent_gateway import RoutingAgentGateway


class FakeGateway(AgentGateway):
    """Small real AgentGateway implementation used to test routing behavior."""

    def __init__(self, name: str, capabilities: set[AgentCapability] | None = None) -> None:
        self.name = name
        self._capabilities = capabilities or set()
        self.connected: set[str] = set()
        self.interrupted: list[str] = []
        self.disconnected: list[str] = []

    def capabilities(self) -> set[AgentCapability]:
        return set(self._capabilities)

    async def connect(
        self,
        session_id: str,
        model: str,
        prompt: str,
        cwd: str = "",
        sdk_session_id: str | None = None,
        system_prompt: str | None = None,
        mcp_servers: dict | None = None,
        max_turns: int | None = None,
        max_budget_usd: float | None = None,
    ) -> AsyncIterator[NormalizedMessage]:
        self.connected.add(session_id)
        yield {"message_type": "_meta", "content": {"provider": self.name}}

    async def open_connection(
        self,
        session_id: str,
        model: str,
        cwd: str = "",
        sdk_session_id: str | None = None,
    ) -> None:
        self.connected.add(session_id)

    async def send_query(self, session_id: str, prompt: str) -> AsyncIterator[NormalizedMessage]:
        yield {"message_type": "_meta", "content": {"provider": self.name, "prompt": prompt}}

    async def interrupt(self, session_id: str) -> None:
        self.interrupted.append(session_id)

    async def disconnect(self, session_id: str) -> None:
        self.disconnected.append(session_id)
        self.connected.discard(session_id)

    async def set_model(self, session_id: str, model: str) -> None:
        return None

    async def set_permission_mode(self, session_id: str, mode: str) -> None:
        return None

    async def get_models(self) -> list[dict[str, Any]]:
        return [{"value": self.name, "displayName": self.name}]

    def is_connected(self, session_id: str) -> bool:
        return session_id in self.connected


class TestRoutingAgentGateway(unittest.IsolatedAsyncioTestCase):
    def _gateway(self) -> RoutingAgentGateway:
        return RoutingAgentGateway(
            default_provider="claude",
            backends={
                "claude": FakeGateway("claude", {AgentCapability.COMPACT}),
                "cursor": FakeGateway("cursor", {AgentCapability.MODELS}),
            },
        )

    def test_unbound_sessions_use_default_provider(self) -> None:
        gateway = self._gateway()

        self.assertEqual("claude", gateway.get_session_provider("s1"))
        self.assertIn(AgentCapability.COMPACT, gateway.capabilities_for_session("s1"))

    def test_can_bind_session_to_provider(self) -> None:
        gateway = self._gateway()

        gateway.bind_session_provider("s1", "cursor")

        self.assertEqual("cursor", gateway.get_session_provider("s1"))
        self.assertIn(AgentCapability.MODELS, gateway.capabilities_for_session("s1"))
        self.assertNotIn(AgentCapability.COMPACT, gateway.capabilities_for_session("s1"))

    def test_unknown_provider_fails_with_clear_error(self) -> None:
        gateway = self._gateway()

        with self.assertRaisesRegex(ValueError, "Unknown agent provider: missing"):
            gateway.bind_session_provider("s1", "missing")

    async def test_routes_async_operations_to_bound_backend(self) -> None:
        gateway = self._gateway()
        gateway.bind_session_provider("s1", "cursor")

        messages = [msg async for msg in gateway.connect("s1", "auto", "hello")]
        await gateway.interrupt("s1")
        await gateway.disconnect("s1")

        self.assertEqual({"provider": "cursor"}, messages[0]["content"])
        cursor_backend = gateway.backends["cursor"]
        self.assertEqual(["s1"], cursor_backend.interrupted)
        self.assertEqual(["s1"], cursor_backend.disconnected)


if __name__ == "__main__":
    unittest.main()

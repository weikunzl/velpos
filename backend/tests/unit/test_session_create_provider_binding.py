from __future__ import annotations

import unittest

from application.session.session_application_service import SessionApplicationService


class FakeRoutingGateway:
    def __init__(self) -> None:
        self.bindings: list[tuple[str, str]] = []
        self.permission_modes: list[tuple[str, str]] = []

    def bind_session_provider(self, session_id: str, provider: str) -> None:
        self.bindings.append((session_id, provider))

    async def set_permission_mode(self, session_id: str, mode: str) -> None:
        self.permission_modes.append((session_id, mode))


class TestSessionCreateProviderBinding(unittest.TestCase):
    def _service(self, gateway: FakeRoutingGateway) -> SessionApplicationService:
        return SessionApplicationService(
            session_repository=None,
            claude_agent_gateway=gateway,
            connection_manager=None,
        )

    def test_bind_agent_provider_delegates_to_routing_gateway(self) -> None:
        gateway = FakeRoutingGateway()
        service = self._service(gateway)

        service._bind_agent_provider("s1", "cursor")

        self.assertEqual([("s1", "cursor")], gateway.bindings)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import unittest

from application.session.session_query_engine import SessionQueryEngine
from domain.session.model.session import Session


class FakeRoutingGateway:
    def __init__(self) -> None:
        self.bindings: list[tuple[str, str]] = []

    def bind_session_provider(self, session_id: str, provider: str) -> None:
        self.bindings.append((session_id, provider))


class FakePlainGateway:
    pass


class TestAgentProviderBinding(unittest.TestCase):
    def _engine(self, gateway) -> SessionQueryEngine:
        return SessionQueryEngine(
            session_repository=None,
            claude_agent_gateway=gateway,
            connection_manager=None,
            recorder=None,
            stream_consumer=None,
            save_session_fn=None,
            reconnect_db_session_fn=None,
            accept_or_reject_sdk_session_id_fn=None,
            resolve_resume_sdk_session_id_fn=None,
            refresh_context_usage_fn=None,
        )

    def test_binds_provider_when_gateway_supports_routing(self) -> None:
        gateway = FakeRoutingGateway()
        engine = self._engine(gateway)
        session = Session.create(model="auto", provider="cursor")

        engine._bind_agent_provider(session)

        self.assertEqual([(session.session_id, "cursor")], gateway.bindings)

    def test_plain_gateway_is_ignored_for_backward_compatibility(self) -> None:
        engine = self._engine(FakePlainGateway())
        session = Session.create(model="auto", provider="cursor")

        engine._bind_agent_provider(session)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import unittest

from application.session.session_application_service import SessionApplicationService
from domain.shared.business_exception import BusinessException


class FakeRoutingGateway:
    def provider_names(self) -> list[str]:
        return ["claude", "cursor"]


class FakePlainGateway:
    pass


class TestSessionProviderValidation(unittest.TestCase):
    def _service(self, gateway) -> SessionApplicationService:
        return SessionApplicationService(
            session_repository=None,
            claude_agent_gateway=gateway,
            connection_manager=None,
        )

    def test_unknown_provider_fails_before_session_creation(self) -> None:
        service = self._service(FakeRoutingGateway())

        with self.assertRaisesRegex(BusinessException, "Unsupported agent provider: missing"):
            service._validate_agent_provider("missing")

    def test_known_provider_passes(self) -> None:
        service = self._service(FakeRoutingGateway())

        service._validate_agent_provider("cursor")

    def test_plain_gateway_keeps_backward_compatibility(self) -> None:
        service = self._service(FakePlainGateway())

        service._validate_agent_provider("custom")


if __name__ == "__main__":
    unittest.main()

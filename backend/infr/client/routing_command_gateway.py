from __future__ import annotations

from typing import Any

from domain.session.acl.command_gateway import CommandGateway


class RoutingCommandGateway(CommandGateway):
    """Route command discovery to provider-specific gateways."""

    def __init__(self, default_provider: str, backends: dict[str, CommandGateway]) -> None:
        if default_provider not in backends:
            raise ValueError(f"Unknown default command provider: {default_provider}")
        self.default_provider = default_provider
        self.backends = dict(backends)

    async def get_commands(self, cwd: str, provider: str | None = None) -> list[dict[str, Any]]:
        backend = self.backends.get(provider or self.default_provider)
        if backend is None:
            raise ValueError(f"Unknown command provider: {provider}")
        return await backend.get_commands(cwd)

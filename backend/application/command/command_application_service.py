from __future__ import annotations

import logging
from typing import Any

from domain.session.acl.command_gateway import CommandGateway

logger = logging.getLogger(__name__)


class CommandApplicationService:

    def __init__(self, command_gateway: CommandGateway) -> None:
        self._command_gateway = command_gateway

    async def list_commands(self, cwd: str, provider: str | None = None) -> list[dict[str, Any]]:
        logger.info("Listing commands for cwd=%s provider=%s", cwd, provider or "default")
        return await self._command_gateway.get_commands(cwd, provider=provider)

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class CommandGateway(ABC):

    @abstractmethod
    async def get_commands(self, cwd: str, provider: str | None = None) -> list[dict[str, Any]]:
        """Retrieve available agent commands/skills for the given project directory.

        Returns:
            List of dicts, each with at least 'name' and 'description'.
        """
        ...

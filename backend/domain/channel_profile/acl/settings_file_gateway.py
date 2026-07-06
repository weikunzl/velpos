from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class SettingsFileGateway(ABC):

    @abstractmethod
    async def read_settings(self) -> dict[str, Any]:
        """Read ~/.claude/settings.json and parse to dict.

        Returns an empty dict if the file does not exist.
        """
        ...

    @abstractmethod
    async def write_settings(self, data: dict[str, Any]) -> None:
        """Serialize the complete dict as JSON and write to ~/.claude/settings.json.

        Should use an atomic write strategy (write to a temp file then rename).
        """
        ...

    @abstractmethod
    async def update_env_section(self, env_vars: dict[str, str]) -> None:
        """Replace the "env" section of settings.json with env_vars.

        Reads the current settings.json, replaces the "env" key with the
        provided env_vars (clearing stale keys), then writes back.
        """
        ...

    @abstractmethod
    async def sync_default_model(self, model: str) -> None:
        """Sync DEFAULT_MODEL to .env file and running process environment.

        Called when a channel profile is activated, so that new sessions
        created via the API use this profile's model by default.
        """
        ...

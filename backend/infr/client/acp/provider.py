from __future__ import annotations

"""ACP provider configuration loading.

Provider configuration is deliberately kept independent from FastAPI and the
database so unit tests can exercise provider validation without starting the
application stack.
"""

from dataclasses import dataclass, field
import os
from pathlib import Path
import re
from typing import Any

import yaml


SUPPORTED_TRANSPORTS = {"stdio", "http"}
ENV_PATTERN = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}")


@dataclass(frozen=True)
class AgentProviderConfig:
    """Configuration for one ACP-capable provider.

    Args:
        name: Provider key used by Velpos sessions.
        transport: Transport type. ``stdio`` is used by Cursor today; ``http``
            is reserved for future remote ACP transports.
        command: Executable for stdio providers.
        args: Command arguments for stdio providers.
        endpoint: Remote ACP endpoint for future http providers.
        auth_method: Optional ACP authentication method identifier.
        default_model: Model value Velpos should use when a session has none.
        env: Environment variables injected into provider process/transport.
    """

    name: str
    transport: str
    command: str | None = None
    args: list[str] = field(default_factory=list)
    endpoint: str | None = None
    auth_method: str | None = None
    default_model: str = "auto"
    env: dict[str, str] = field(default_factory=dict)


class AgentProviderRegistry:
    """In-memory registry of configured ACP providers."""

    def __init__(self, providers: dict[str, AgentProviderConfig]) -> None:
        self._providers = dict(providers)

    def get(self, name: str) -> AgentProviderConfig:
        """Return a provider config.

        Raises:
            ValueError: If the provider is not configured.
        """
        try:
            return self._providers[name]
        except KeyError as exc:
            raise ValueError(f"Unknown agent provider: {name}") from exc

    def names(self) -> list[str]:
        """Return configured provider names in deterministic order."""
        return sorted(self._providers)


def load_agent_providers(path: str | Path) -> AgentProviderRegistry:
    """Load and validate ACP provider configuration from YAML.

    Args:
        path: YAML file containing a top-level ``providers`` mapping.

    Returns:
        Provider registry.

    Raises:
        ValueError: If the file shape or provider config is invalid.
    """
    config_path = Path(path)
    raw = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    providers_raw = raw.get("providers")
    if not isinstance(providers_raw, dict):
        raise ValueError("agent provider config requires a providers mapping")

    providers: dict[str, AgentProviderConfig] = {}
    for name, payload in providers_raw.items():
        if not isinstance(name, str) or not isinstance(payload, dict):
            raise ValueError("each agent provider must be a mapping")
        providers[name] = _parse_provider(name, payload)

    return AgentProviderRegistry(providers)


def _parse_provider(name: str, payload: dict[str, Any]) -> AgentProviderConfig:
    transport = str(payload.get("transport") or "").strip()
    if transport not in SUPPORTED_TRANSPORTS:
        raise ValueError(f"Unsupported ACP transport: {transport}")

    command = payload.get("command")
    if transport == "stdio" and not command:
        raise ValueError(f"stdio provider {name} requires command")

    endpoint = payload.get("endpoint")
    if transport == "http" and not endpoint:
        raise ValueError(f"http provider {name} requires endpoint")

    args_raw = payload.get("args") or []
    if not isinstance(args_raw, list):
        raise ValueError(f"provider {name} args must be a list")

    env_raw = payload.get("env") or {}
    if not isinstance(env_raw, dict):
        raise ValueError(f"provider {name} env must be a mapping")

    return AgentProviderConfig(
        name=name,
        transport=transport,
        command=str(command) if command else None,
        args=[str(item) for item in args_raw],
        endpoint=str(endpoint) if endpoint else None,
        auth_method=str(payload["auth_method"]) if payload.get("auth_method") else None,
        default_model=str(payload.get("default_model") or "auto"),
        env={str(key): _expand_env_value(str(value)) for key, value in env_raw.items()},
    )


def _expand_env_value(value: str) -> str:
    """Expand ``${VAR}`` placeholders using process environment values."""

    def replace(match: re.Match[str]) -> str:
        return os.environ.get(match.group(1), "")

    return ENV_PATTERN.sub(replace, value)

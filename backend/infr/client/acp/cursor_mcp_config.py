from __future__ import annotations

import json
import logging
import os
from pathlib import Path
import re
from typing import Any

logger = logging.getLogger(__name__)

_ENV_VAR_PATTERN = re.compile(r"\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}")
_SIMPLE_VAR_PATTERN = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}")


def load_merged_cursor_mcp_servers(cwd: str) -> dict[str, Any]:
    """Merge user-level and project-level ``.cursor/mcp.json`` configs.

    Project entries override user entries with the same server name.
    """
    merged: dict[str, Any] = {}
    for config_path in _mcp_config_paths(cwd):
        try:
            payload = json.loads(config_path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            continue
        except Exception:
            logger.warning("Failed to read Cursor MCP config: %s", config_path, exc_info=True)
            continue
        servers = payload.get("mcpServers")
        if isinstance(servers, dict):
            merged.update(servers)
    return merged


def cursor_mcp_servers_for_acp(cwd: str) -> list[dict[str, Any]]:
    """Return ACP ``mcpServers`` payload entries from Cursor config files."""
    workspace = Path(cwd).resolve() if cwd else None
    entries: list[dict[str, Any]] = []
    for name, config in load_merged_cursor_mcp_servers(cwd).items():
        if not isinstance(config, dict):
            continue
        entry = _to_acp_entry(name, config, workspace)
        if entry is not None:
            entries.append(entry)
    return entries


def resolve_acp_mcp_servers(
    mcp_servers: dict | list | None,
    cwd: str = "",
) -> list[Any]:
    """Resolve MCP servers for ACP ``session/new`` / ``session/load``.

    - Explicit ACP list entries override cwd-based entries with the same name.
    - Claude-style in-process dict servers cannot be forwarded to Cursor ACP, so
      Cursor ``mcp.json`` entries are loaded from ``cwd`` when available.
    """
    unnamed: list[dict[str, Any]] = []
    by_name: dict[str, dict[str, Any]] = {}

    if cwd:
        for entry in cursor_mcp_servers_for_acp(cwd):
            name = entry.get("name")
            if isinstance(name, str) and name:
                by_name[name] = entry

    if isinstance(mcp_servers, list):
        for entry in mcp_servers:
            if not isinstance(entry, dict):
                continue
            name = entry.get("name")
            if isinstance(name, str) and name:
                by_name[name] = entry
            else:
                unnamed.append(entry)

    return unnamed + list(by_name.values())


def _mcp_config_paths(cwd: str) -> list[Path]:
    paths: list[Path] = []
    home_config = Path.home() / ".cursor" / "mcp.json"
    if home_config.exists():
        paths.append(home_config)
    if cwd:
        project_config = Path(cwd).resolve() / ".cursor" / "mcp.json"
        if project_config.exists():
            paths.append(project_config)
    return paths


def _to_acp_entry(
    name: str,
    config: dict[str, Any],
    workspace: Path | None,
) -> dict[str, Any] | None:
    url = config.get("url")
    if url:
        resolved_url = _resolve_config_value(str(url), workspace)
        headers = _headers_payload(config.get("headers"), workspace)
        transport = str(config.get("type") or "").lower()
        if transport == "sse" or resolved_url.rstrip("/").endswith("/sse"):
            return {"name": name, "url": resolved_url, "headers": headers}
        return {"name": name, "url": resolved_url, "headers": headers}

    command = config.get("command")
    if not command:
        logger.warning("Skipping MCP server %s: missing command or url", name)
        return None

    args_raw = config.get("args") or []
    args = [
        _resolve_config_value(str(item), workspace)
        for item in (args_raw if isinstance(args_raw, list) else [])
    ]
    return {
        "name": name,
        "command": _resolve_config_value(str(command), workspace),
        "args": args,
        "env": _env_payload(config.get("env"), workspace),
    }


def _env_payload(raw: Any, workspace: Path | None) -> list[dict[str, str]]:
    if not isinstance(raw, dict):
        return []
    return [
        {
            "name": str(key),
            "value": _resolve_config_value(str(value), workspace),
        }
        for key, value in raw.items()
    ]


def _headers_payload(raw: Any, workspace: Path | None) -> list[dict[str, str]]:
    if not isinstance(raw, dict):
        return []
    return [
        {
            "name": str(key),
            "value": _resolve_config_value(str(value), workspace),
        }
        for key, value in raw.items()
    ]


def _resolve_config_value(value: str, workspace: Path | None) -> str:
    if not value:
        return value

    def replace_env(match: re.Match[str]) -> str:
        return os.environ.get(match.group(1), "")

    resolved = _ENV_VAR_PATTERN.sub(replace_env, value)
    home = str(Path.home())
    workspace_path = str(workspace) if workspace else ""
    workspace_name = workspace.name if workspace else ""
    replacements = {
        "userHome": home,
        "workspaceFolder": workspace_path,
        "workspaceFolderBasename": workspace_name,
        "pathSeparator": os.sep,
        "/": os.sep,
    }

    def replace_simple(match: re.Match[str]) -> str:
        key = match.group(1)
        if key in replacements:
            return replacements[key]
        return match.group(0)

    return _SIMPLE_VAR_PATTERN.sub(replace_simple, resolved)

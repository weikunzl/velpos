from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from domain.session.acl.command_gateway import CommandGateway as CommandGatewayPort
from infr.client.acp.cursor_mcp_config import load_merged_cursor_mcp_servers

logger = logging.getLogger(__name__)

_SKILL_ROOTS = (
    (".cursor", "skills"),
    (".cursor", "skills-cursor"),
)


class CursorCommandGateway(CommandGatewayPort):
    """Discover Cursor Agent skills from local SKILL.md files."""

    async def get_commands(self, cwd: str, provider: str | None = None) -> list[dict[str, Any]]:
        logger.info("Discovering Cursor skills for cwd=%s", cwd)
        by_name: dict[str, dict[str, Any]] = {}

        for root in _skill_search_roots(cwd):
            if not root.is_dir():
                continue
            for skill_dir in sorted(root.iterdir()):
                if not skill_dir.is_dir():
                    continue
                skill_md = skill_dir / "SKILL.md"
                if not skill_md.is_file():
                    continue
                command = _parse_skill_md(skill_md, fallback_name=skill_dir.name)
                if command is None:
                    continue
                by_name[command["name"]] = command

        commands = sorted(by_name.values(), key=lambda item: item["name"])
        mcp_commands = _discover_mcp_commands(cwd)
        if mcp_commands:
            commands.extend(mcp_commands)
        logger.info(
            "Discovered %d Cursor skills and %d MCP servers",
            len(by_name),
            len(mcp_commands),
        )
        return commands


def _skill_search_roots(cwd: str) -> list[Path]:
    roots: list[Path] = []
    home_cursor = Path.home() / ".cursor"
    for parts in _SKILL_ROOTS:
        roots.append(home_cursor.joinpath(*parts[1:]))
    if cwd:
        project_root = Path(cwd).resolve()
        for parts in _SKILL_ROOTS:
            roots.append(project_root.joinpath(*parts))
    return roots


def _parse_skill_md(path: Path, fallback_name: str) -> dict[str, Any] | None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        logger.warning("Failed to read skill file: %s", path)
        return None

    frontmatter = _read_frontmatter(text)
    name = str(frontmatter.get("name") or fallback_name).strip()
    if not name:
        return None

    description = str(frontmatter.get("description") or "").strip()
    disable_model_invocation = frontmatter.get("disable-model-invocation", False)
    return {
        "name": name,
        "description": description,
        "type": "skill",
        # User slash invocation is independent from model auto-invocation.
        "isUserInvocable": True,
        "modelInvocable": not bool(disable_model_invocation),
        "argumentHint": "",
    }


def _discover_mcp_commands(cwd: str) -> list[dict[str, Any]]:
    commands: list[dict[str, Any]] = []
    for name, config in sorted(load_merged_cursor_mcp_servers(cwd).items()):
        if not isinstance(config, dict):
            continue
        command = _parse_mcp_server(name, config)
        if command is not None:
            commands.append(command)
    return commands


def _parse_mcp_server(name: str, config: dict[str, Any]) -> dict[str, Any] | None:
    server_name = str(name).strip()
    if not server_name:
        return None

    url = config.get("url")
    command = config.get("command")
    if url:
        description = f"Remote MCP · {_short_value(str(url))}"
    elif command:
        description = f"stdio MCP · {_short_value(str(command))}"
    else:
        description = "MCP server"

    return {
        "name": server_name,
        "description": description,
        "type": "mcp",
        "isUserInvocable": False,
        "argumentHint": "",
    }


def _short_value(value: str, limit: int = 72) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def _read_frontmatter(text: str) -> dict[str, Any]:
    if not text.startswith("---"):
        return {}
    try:
        _, raw_frontmatter, _ = text.split("---", 2)
    except ValueError:
        return {}
    data = yaml.safe_load(raw_frontmatter) or {}
    return data if isinstance(data, dict) else {}

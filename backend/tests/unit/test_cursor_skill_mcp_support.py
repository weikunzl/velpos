from __future__ import annotations

import json
import tempfile
import unittest
import unittest.mock
from pathlib import Path
from typing import Any

from infr.client.acp.acp_gateway import AcpGateway
from infr.client.acp.cursor_mcp_config import (
    cursor_mcp_servers_for_acp,
    load_merged_cursor_mcp_servers,
    resolve_acp_mcp_servers,
)
from infr.client.acp.provider import AgentProviderConfig
from infr.client.cursor_command_gateway import CursorCommandGateway
from infr.client.routing_command_gateway import RoutingCommandGateway


class TestCursorMcpConfig(unittest.TestCase):
    def test_load_merged_cursor_mcp_servers_prefers_project_over_user(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            home_cursor = root / "home" / ".cursor"
            project_cursor = root / "project" / ".cursor"
            home_cursor.mkdir(parents=True)
            project_cursor.mkdir(parents=True)
            (home_cursor / "mcp.json").write_text(
                json.dumps(
                    {
                        "mcpServers": {
                            "shared": {"command": "echo", "args": ["user"]},
                            "user-only": {"command": "echo", "args": ["user-only"]},
                        }
                    }
                ),
                encoding="utf-8",
            )
            (project_cursor / "mcp.json").write_text(
                json.dumps(
                    {
                        "mcpServers": {
                            "shared": {"command": "echo", "args": ["project"]},
                            "project-only": {"url": "http://localhost:3000/mcp"},
                        }
                    }
                ),
                encoding="utf-8",
            )

            original_home = Path.home
            try:
                Path.home = lambda: root / "home"  # type: ignore[method-assign]
                merged = load_merged_cursor_mcp_servers(str(root / "project"))
            finally:
                Path.home = original_home  # type: ignore[method-assign]

        self.assertEqual(["project"], merged["shared"]["args"])
        self.assertEqual("user-only", merged["user-only"]["args"][0])
        self.assertEqual("http://localhost:3000/mcp", merged["project-only"]["url"])

    def test_cursor_mcp_servers_for_acp_converts_stdio_and_http(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir)
            cursor_dir = project / ".cursor"
            cursor_dir.mkdir()
            (cursor_dir / "mcp.json").write_text(
                json.dumps(
                    {
                        "mcpServers": {
                            "local": {
                                "command": "python",
                                "args": ["${workspaceFolder}/server.py"],
                                "env": {"TOKEN": "${env:TEST_TOKEN}"},
                            },
                            "remote": {
                                "url": "https://example.com/mcp",
                                "headers": {"Authorization": "Bearer ${env:API_TOKEN}"},
                            },
                        }
                    }
                ),
                encoding="utf-8",
            )

            import os

            with unittest.mock.patch.dict(os.environ, {"TEST_TOKEN": "abc", "API_TOKEN": "xyz"}):
                payload = cursor_mcp_servers_for_acp(str(project))

        self.assertEqual(2, len(payload))
        stdio = next(item for item in payload if item["name"] == "local")
        self.assertEqual("python", stdio["command"])
        self.assertEqual([str(project / "server.py")], stdio["args"])
        self.assertEqual([{"name": "TOKEN", "value": "abc"}], stdio["env"])
        remote = next(item for item in payload if item["name"] == "remote")
        self.assertEqual("https://example.com/mcp", remote["url"])
        self.assertEqual([{"name": "Authorization", "value": "Bearer xyz"}], remote["headers"])

    def test_resolve_acp_mcp_servers_passes_through_explicit_list(self) -> None:
        explicit = [{"name": "inline", "command": "echo", "args": [], "env": []}]
        self.assertEqual(explicit, resolve_acp_mcp_servers(explicit, cwd=""))

    def test_resolve_acp_mcp_servers_merges_explicit_over_cwd(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir)
            cursor_dir = project / ".cursor"
            cursor_dir.mkdir()
            (cursor_dir / "mcp.json").write_text(
                json.dumps(
                    {
                        "mcpServers": {
                            "shared": {"command": "echo", "args": ["from-file"]},
                            "file-only": {"command": "echo", "args": ["file-only"]},
                        }
                    }
                ),
                encoding="utf-8",
            )
            explicit = [{"name": "shared", "command": "python", "args": ["inline.py"], "env": []}]
            payload = resolve_acp_mcp_servers(explicit, cwd=str(project))

        by_name = {item["name"]: item for item in payload}
        self.assertEqual("python", by_name["shared"]["command"])
        self.assertEqual(["file-only"], by_name["file-only"]["args"])


class TestCursorCommandGateway(unittest.IsolatedAsyncioTestCase):
    async def test_discovers_cursor_skills_from_skill_md(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            home = root / "home"
            home.mkdir()
            skill_dir = root / "project" / ".cursor" / "skills" / "demo-skill"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text(
                "---\n"
                "name: demo-skill\n"
                "description: Demo Cursor skill\n"
                "---\n"
                "# Demo\n",
                encoding="utf-8",
            )

            original_home = Path.home
            try:
                Path.home = lambda: home  # type: ignore[method-assign]
                gateway = CursorCommandGateway()
                commands = await gateway.get_commands(str(root / "project"))
            finally:
                Path.home = original_home  # type: ignore[method-assign]

        self.assertEqual(1, len(commands))
        self.assertEqual("demo-skill", commands[0]["name"])
        self.assertEqual("skill", commands[0]["type"])
        self.assertEqual("Demo Cursor skill", commands[0]["description"])
        self.assertTrue(commands[0]["isUserInvocable"])

    async def test_disable_model_invocation_keeps_user_invocable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            home = root / "home"
            home.mkdir()
            skill_dir = root / "project" / ".cursor" / "skills" / "manual-skill"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text(
                "---\n"
                "name: manual-skill\n"
                "description: Manual only skill\n"
                "disable-model-invocation: true\n"
                "---\n",
                encoding="utf-8",
            )

            original_home = Path.home
            try:
                Path.home = lambda: home  # type: ignore[method-assign]
                gateway = CursorCommandGateway()
                commands = await gateway.get_commands(str(root / "project"))
            finally:
                Path.home = original_home  # type: ignore[method-assign]

        skills = [item for item in commands if item["type"] == "skill"]
        self.assertEqual(1, len(skills))
        self.assertTrue(skills[0]["isUserInvocable"])
        self.assertFalse(skills[0]["modelInvocable"])

    async def test_project_skill_overrides_user_skill(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            home = root / "home"
            project = root / "project"
            for base, description in ((home, "User skill"), (project, "Project skill")):
                skill_dir = base / ".cursor" / "skills" / "shared-skill"
                skill_dir.mkdir(parents=True)
                (skill_dir / "SKILL.md").write_text(
                    "---\n"
                    "name: shared-skill\n"
                    f"description: {description}\n"
                    "---\n",
                    encoding="utf-8",
                )

            original_home = Path.home
            try:
                Path.home = lambda: home  # type: ignore[method-assign]
                gateway = CursorCommandGateway()
                commands = await gateway.get_commands(str(project))
            finally:
                Path.home = original_home  # type: ignore[method-assign]

        self.assertEqual(1, len(commands))
        self.assertEqual("Project skill", commands[0]["description"])

    async def test_discovers_mcp_servers_from_cursor_mcp_json(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            home = root / "home"
            home.mkdir()
            project = root / "project"
            cursor_dir = project / ".cursor"
            cursor_dir.mkdir(parents=True)
            (cursor_dir / "mcp.json").write_text(
                json.dumps(
                    {
                        "mcpServers": {
                            "demo": {"command": "echo", "args": ["hello"]},
                            "remote": {"url": "https://example.com/mcp"},
                        }
                    }
                ),
                encoding="utf-8",
            )

            original_home = Path.home
            try:
                Path.home = lambda: home  # type: ignore[method-assign]
                gateway = CursorCommandGateway()
                commands = await gateway.get_commands(str(project))
            finally:
                Path.home = original_home  # type: ignore[method-assign]

        mcp_commands = [item for item in commands if item["type"] == "mcp"]
        self.assertEqual(2, len(mcp_commands))
        self.assertEqual("demo", mcp_commands[0]["name"])
        self.assertIn("stdio MCP", mcp_commands[0]["description"])
        self.assertFalse(mcp_commands[0]["isUserInvocable"])
        self.assertEqual("remote", mcp_commands[1]["name"])
        self.assertIn("Remote MCP", mcp_commands[1]["description"])


class _FakeCommandGateway:
    def __init__(self, label: str) -> None:
        self.label = label
        self.last_cwd = ""

    async def get_commands(self, cwd: str, provider: str | None = None) -> list[dict[str, Any]]:
        self.last_cwd = cwd
        return [{"name": self.label, "type": "skill", "description": cwd}]


class TestRoutingCommandGateway(unittest.IsolatedAsyncioTestCase):
    async def test_routes_cursor_provider_to_cursor_gateway(self) -> None:
        claude = _FakeCommandGateway("claude-cmd")
        cursor = _FakeCommandGateway("cursor-skill")
        gateway = RoutingCommandGateway(
            default_provider="claude",
            backends={"claude": claude, "cursor": cursor},
        )

        commands = await gateway.get_commands("/tmp/project", provider="cursor")

        self.assertEqual("cursor-skill", commands[0]["name"])
        self.assertEqual("/tmp/project", cursor.last_cwd)


class FakeTransport:
    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = list(responses)
        self.sent: list[dict[str, Any]] = []
        self.started = False
        self.closed = False

    async def start(self) -> None:
        self.started = True

    async def send_json(self, payload: dict[str, Any]) -> None:
        self.sent.append(payload)

    async def receive_json(self) -> dict[str, Any]:
        if not self.responses:
            raise RuntimeError("no fake ACP responses queued")
        return self.responses.pop(0)

    async def close(self) -> None:
        self.closed = True


class TestAcpGatewayMcpPayload(unittest.IsolatedAsyncioTestCase):
    def _provider(self) -> AgentProviderConfig:
        return AgentProviderConfig(
            name="cursor",
            transport="stdio",
            command="agent",
            args=["acp"],
            default_model="auto",
        )

    async def test_connect_forwards_project_mcp_servers(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir)
            cursor_dir = project / ".cursor"
            cursor_dir.mkdir()
            (cursor_dir / "mcp.json").write_text(
                json.dumps(
                    {
                        "mcpServers": {
                            "demo": {"command": "echo", "args": ["hello"]},
                        }
                    }
                ),
                encoding="utf-8",
            )

            transport = FakeTransport(
                [
                    {"jsonrpc": "2.0", "id": 1, "result": {"protocolVersion": 1}},
                    {"jsonrpc": "2.0", "id": 2, "result": {"sessionId": "acp-session-1"}},
                    {"jsonrpc": "2.0", "id": 3, "result": {"stopReason": "end_turn"}},
                ]
            )
            gateway = AcpGateway(self._provider(), transport_factory=lambda _provider: transport)

            _ = [message async for message in gateway.connect("velpos-1", "auto", "hi", cwd=str(project))]

            mcp_payload = transport.sent[1]["params"]["mcpServers"]
            self.assertEqual(1, len(mcp_payload))
            self.assertEqual("demo", mcp_payload[0]["name"])
            self.assertEqual("echo", mcp_payload[0]["command"])

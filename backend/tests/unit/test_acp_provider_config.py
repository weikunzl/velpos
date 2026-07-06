from __future__ import annotations

import os
from pathlib import Path
import tempfile
import unittest

from infr.client.acp.provider import load_agent_providers


class TestAcpProviderConfig(unittest.TestCase):
    def _write_config(self, content: str) -> Path:
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        path = Path(temp_dir.name) / "agent_providers.yaml"
        path.write_text(content, encoding="utf-8")
        return path

    def test_loads_cursor_stdio_provider(self) -> None:
        path = self._write_config(
            """
providers:
  cursor:
    transport: stdio
    command: agent
    args: [acp]
    auth_method: cursor_login
    default_model: auto
"""
        )

        registry = load_agent_providers(path)

        cursor = registry.get("cursor")
        self.assertEqual("cursor", cursor.name)
        self.assertEqual("stdio", cursor.transport)
        self.assertEqual("agent", cursor.command)
        self.assertEqual(["acp"], cursor.args)
        self.assertEqual("cursor_login", cursor.auth_method)
        self.assertEqual("auto", cursor.default_model)

    def test_expands_environment_variables_in_env_values(self) -> None:
        path = self._write_config(
            """
providers:
  cursor:
    transport: stdio
    command: agent
    args: [acp]
    env:
      CURSOR_API_KEY: ${CURSOR_API_KEY}
"""
        )
        old_value = os.environ.get("CURSOR_API_KEY")
        os.environ["CURSOR_API_KEY"] = "test-key"
        self.addCleanup(self._restore_env, "CURSOR_API_KEY", old_value)

        registry = load_agent_providers(path)

        self.assertEqual({"CURSOR_API_KEY": "test-key"}, registry.get("cursor").env)

    def test_unsupported_transport_fails_clearly(self) -> None:
        path = self._write_config(
            """
providers:
  remote:
    transport: ftp
    endpoint: ftp://example.invalid/acp
"""
        )

        with self.assertRaisesRegex(ValueError, "Unsupported ACP transport: ftp"):
            load_agent_providers(path)

    def test_stdio_provider_requires_command(self) -> None:
        path = self._write_config(
            """
providers:
  cursor:
    transport: stdio
    args: [acp]
"""
        )

        with self.assertRaisesRegex(ValueError, "stdio provider cursor requires command"):
            load_agent_providers(path)

    @staticmethod
    def _restore_env(name: str, old_value: str | None) -> None:
        if old_value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = old_value


if __name__ == "__main__":
    unittest.main()

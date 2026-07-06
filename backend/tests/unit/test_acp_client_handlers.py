from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from infr.client.acp.client_handlers import AcpClientHandlers


class TestAcpClientHandlers(unittest.IsolatedAsyncioTestCase):
    async def test_read_and_write_text_file_within_workspace(self) -> None:
        handlers = AcpClientHandlers()
        with tempfile.TemporaryDirectory() as temp_dir:
            cwd = Path(temp_dir)
            await handlers.write_text_file(str(cwd), "notes.txt", "line1\nline2\nline3\n")
            content = await handlers.read_text_file(str(cwd), "notes.txt", line=2, limit=1)
            self.assertEqual("line2\n", content)

    async def test_rejects_paths_outside_workspace(self) -> None:
        handlers = AcpClientHandlers()
        with tempfile.TemporaryDirectory() as temp_dir:
            with self.assertRaises(ValueError):
                await handlers.read_text_file(temp_dir, "/etc/passwd")

    async def test_command_terminal_lifecycle(self) -> None:
        handlers = AcpClientHandlers()
        with tempfile.TemporaryDirectory() as temp_dir:
            terminal_id = await handlers.create_terminal(
                cwd=temp_dir,
                command="python3",
                args=["-c", "print('hello-acp')"],
            )
            exit_info = await handlers.wait_for_terminal_exit(terminal_id)
            output = await handlers.terminal_output(terminal_id)
            await handlers.release_terminal(terminal_id)

        self.assertEqual(0, exit_info["exitCode"])
        self.assertIn("hello-acp", output["output"])


if __name__ == "__main__":
    unittest.main()

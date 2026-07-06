from __future__ import annotations

import sys
import unittest

from infr.client.acp.transport import StdioTransport


class TestStdioTransport(unittest.IsolatedAsyncioTestCase):
    async def test_sends_and_receives_newline_delimited_json(self) -> None:
        script = (
            "import json, os, sys\n"
            "line = sys.stdin.readline()\n"
            "payload = json.loads(line)\n"
            "print(json.dumps({'echo': payload, 'env': os.environ.get('ACP_TEST_ENV')}), flush=True)\n"
        )
        transport = StdioTransport(
            command=sys.executable,
            args=["-u", "-c", script],
            env={"ACP_TEST_ENV": "works"},
        )

        await transport.start()
        try:
            await transport.send_json({"jsonrpc": "2.0", "id": 1})
            response = await transport.receive_json()
        finally:
            await transport.close()

        self.assertEqual({"jsonrpc": "2.0", "id": 1}, response["echo"])
        self.assertEqual("works", response["env"])

    async def test_invalid_json_from_process_fails_clearly(self) -> None:
        transport = StdioTransport(
            command=sys.executable,
            args=["-u", "-c", "print('not-json', flush=True)"],
        )

        await transport.start()
        try:
            with self.assertRaisesRegex(ValueError, "Invalid JSON from ACP process"):
                await transport.receive_json()
        finally:
            await transport.close()

    async def test_close_terminates_running_process(self) -> None:
        transport = StdioTransport(
            command=sys.executable,
            args=["-u", "-c", "import time; time.sleep(30)"],
        )

        await transport.start()
        process = transport.process
        self.assertIsNotNone(process)
        self.assertIsNone(process.returncode)

        await transport.close()

        self.assertIsNotNone(process.returncode)

    async def test_send_before_start_fails_clearly(self) -> None:
        transport = StdioTransport(command=sys.executable, args=["-u", "-c", "pass"])

        with self.assertRaisesRegex(RuntimeError, "ACP transport is not started"):
            await transport.send_json({"jsonrpc": "2.0"})


if __name__ == "__main__":
    unittest.main()

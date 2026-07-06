from __future__ import annotations

"""Transport primitives for ACP providers."""

import asyncio
import json
import os
from typing import Any, Protocol


class AcpTransport(Protocol):
    """Minimal async transport required by AcpGateway."""

    async def start(self) -> None:
        """Open the transport."""
        ...

    async def send_json(self, payload: dict[str, Any]) -> None:
        """Send one JSON message."""
        ...

    async def receive_json(self) -> dict[str, Any]:
        """Receive one JSON message."""
        ...

    async def close(self) -> None:
        """Close the transport and release resources."""
        ...


class StdioTransport:
    """Newline-delimited JSON transport over a subprocess stdio pair.

    Args:
        command: Executable to spawn.
        args: Command arguments.
        env: Extra environment values for the child process.
        stderr_limit: Number of stderr lines retained for diagnostics.
    """

    def __init__(
        self,
        command: str,
        args: list[str] | None = None,
        env: dict[str, str] | None = None,
        stderr_limit: int = 500,
    ) -> None:
        self.command = command
        self.args = list(args or [])
        self.env = dict(env or {})
        self.stderr_limit = stderr_limit
        self.stderr_lines: list[str] = []
        self.process: asyncio.subprocess.Process | None = None
        self._stderr_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        """Spawn the subprocess and start stderr collection."""
        if self.process is not None and self.process.returncode is None:
            return

        child_env = os.environ.copy()
        child_env.update(self.env)
        self.process = await asyncio.create_subprocess_exec(
            self.command,
            *self.args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=child_env,
        )
        self._stderr_task = asyncio.create_task(self._collect_stderr())

    async def send_json(self, payload: dict[str, Any]) -> None:
        """Send one JSON message followed by a newline."""
        process = self._require_process()
        if process.stdin is None:
            raise RuntimeError("ACP transport stdin is unavailable")

        data = json.dumps(payload, separators=(",", ":")).encode("utf-8") + b"\n"
        process.stdin.write(data)
        await process.stdin.drain()

    async def receive_json(self) -> dict[str, Any]:
        """Read and parse one newline-delimited JSON object."""
        process = self._require_process()
        if process.stdout is None:
            raise RuntimeError("ACP transport stdout is unavailable")

        line = await process.stdout.readline()
        if not line:
            raise RuntimeError("ACP process closed stdout")

        raw = line.decode("utf-8", errors="replace").strip()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON from ACP process: {raw[:200]}") from exc
        if not isinstance(payload, dict):
            raise ValueError("Invalid JSON from ACP process: expected object")
        return payload

    async def close(self) -> None:
        """Terminate the subprocess and stop background stderr collection."""
        process = self.process
        if process is None:
            return

        if process.stdin is not None and not process.stdin.is_closing():
            process.stdin.close()

        if process.returncode is None:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()

        if self._stderr_task is not None:
            self._stderr_task.cancel()
            try:
                await self._stderr_task
            except asyncio.CancelledError:
                pass
            self._stderr_task = None

    def _require_process(self) -> asyncio.subprocess.Process:
        if self.process is None or self.process.returncode is not None:
            raise RuntimeError("ACP transport is not started")
        return self.process

    async def _collect_stderr(self) -> None:
        process = self.process
        if process is None or process.stderr is None:
            return

        while True:
            line = await process.stderr.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace").rstrip()
            self.stderr_lines.append(text)
            if len(self.stderr_lines) > self.stderr_limit:
                del self.stderr_lines[: len(self.stderr_lines) - self.stderr_limit]

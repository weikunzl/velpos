from __future__ import annotations

"""ACP Client-side handlers for fs and terminal capabilities."""

import asyncio
import contextlib
import os
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class _CommandTerminal:
    terminal_id: str
    process: asyncio.subprocess.Process
    output: str = ""
    truncated: bool = False
    output_byte_limit: int | None = None
    exit_code: int | None = None
    signal: str | None = None
    _read_task: asyncio.Task[None] | None = field(default=None, repr=False)


class AcpClientHandlers:
    """Server-side ACP Client handlers backed by local workspace and subprocesses."""

    def __init__(self) -> None:
        self._terminals: dict[str, _CommandTerminal] = {}

    @staticmethod
    def resolve_workspace_path(cwd: str, path: str) -> Path:
        root = Path(cwd).expanduser().resolve()
        target = Path(path).expanduser()
        if not target.is_absolute():
            target = (root / target).resolve()
        else:
            target = target.resolve()
        if root != target and root not in target.parents:
            raise ValueError(f"Path is outside workspace: {path}")
        return target

    async def read_text_file(
        self,
        cwd: str,
        path: str,
        line: int | None = None,
        limit: int | None = None,
    ) -> str:
        file_path = self.resolve_workspace_path(cwd, path)
        if not file_path.is_file():
            raise FileNotFoundError(f"File not found: {path}")

        text = await asyncio.to_thread(file_path.read_text, "utf-8", "replace")
        lines = text.splitlines(keepends=True)
        if line is not None:
            start = max(line - 1, 0)
            lines = lines[start:]
        if limit is not None:
            lines = lines[: max(limit, 0)]
        return "".join(lines)

    async def write_text_file(self, cwd: str, path: str, content: str) -> None:
        file_path = self.resolve_workspace_path(cwd, path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(file_path.write_text, content, "utf-8")

    async def create_terminal(
        self,
        cwd: str,
        command: str,
        args: list[str] | None = None,
        env: list[dict[str, str]] | None = None,
        terminal_cwd: str | None = None,
        output_byte_limit: int | None = None,
    ) -> str:
        resolved_cwd = terminal_cwd or cwd
        if resolved_cwd:
            resolved_cwd = str(Path(resolved_cwd).expanduser().resolve())
        child_env = os.environ.copy()
        for item in env or []:
            name = item.get("name")
            if name:
                child_env[str(name)] = str(item.get("value") or "")

        process = await asyncio.create_subprocess_exec(
            command,
            *(args or []),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=resolved_cwd or None,
            env=child_env,
        )
        terminal_id = uuid.uuid4().hex
        session = _CommandTerminal(
            terminal_id=terminal_id,
            process=process,
            output_byte_limit=output_byte_limit,
        )
        session._read_task = asyncio.create_task(self._collect_terminal_output(session))
        self._terminals[terminal_id] = session
        return terminal_id

    async def terminal_output(self, terminal_id: str) -> dict[str, Any]:
        session = self._require_terminal(terminal_id)
        exit_status = self._terminal_exit_status(session)
        return {
            "output": session.output,
            "truncated": session.truncated,
            "exitStatus": exit_status,
        }

    async def wait_for_terminal_exit(self, terminal_id: str) -> dict[str, Any]:
        session = self._require_terminal(terminal_id)
        if session.process.returncode is None:
            await session.process.wait()
            if session._read_task is not None:
                await session._read_task
            session.exit_code = session.process.returncode
        return {
            "exitCode": session.exit_code,
            "signal": session.signal,
        }

    async def kill_terminal(self, terminal_id: str) -> None:
        session = self._terminals.get(terminal_id)
        if session is None or session.process.returncode is not None:
            return
        session.process.kill()
        await session.process.wait()
        session.exit_code = session.process.returncode
        if session._read_task is not None:
            await session._read_task

    async def release_terminal(self, terminal_id: str) -> None:
        session = self._terminals.pop(terminal_id, None)
        if session is None:
            return
        if session.process.returncode is None:
            session.process.kill()
            await session.process.wait()
        if session._read_task is not None:
            session._read_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await session._read_task

    def _require_terminal(self, terminal_id: str) -> _CommandTerminal:
        session = self._terminals.get(terminal_id)
        if session is None:
            raise KeyError(f"Terminal not found: {terminal_id}")
        return session

    @staticmethod
    def _terminal_exit_status(session: _CommandTerminal) -> dict[str, Any] | None:
        if session.process.returncode is None and session.exit_code is None:
            return None
        return {
            "exitCode": session.exit_code if session.exit_code is not None else session.process.returncode,
            "signal": session.signal,
        }

    async def _collect_terminal_output(self, session: _CommandTerminal) -> None:
        stdout = session.process.stdout
        if stdout is None:
            return
        while True:
            chunk = await stdout.read(4096)
            if not chunk:
                break
            text = chunk.decode("utf-8", errors="replace")
            session.output += text
            if session.output_byte_limit is not None:
                encoded = session.output.encode("utf-8", errors="replace")
                if len(encoded) > session.output_byte_limit:
                    session.output = encoded[-session.output_byte_limit :].decode("utf-8", errors="replace")
                    session.truncated = True
        if session.process.returncode is None:
            session.exit_code = await session.process.wait()
        else:
            session.exit_code = session.process.returncode

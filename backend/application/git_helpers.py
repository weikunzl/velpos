from __future__ import annotations

import asyncio
import subprocess
from dataclasses import dataclass


@dataclass(frozen=True)
class GitResult:
    returncode: int
    stdout: str
    stderr: str

    @property
    def ok(self) -> bool:
        return self.returncode == 0


async def run_git(dir_path: str, *args: str) -> GitResult:
    proc = await asyncio.create_subprocess_exec(
        "git", "-C", dir_path, *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return GitResult(
        returncode=proc.returncode or 0,
        stdout=stdout.decode().strip() if stdout else "",
        stderr=stderr.decode().strip() if stderr else "",
    )


async def get_current_git_branch(project_dir: str) -> str:
    if not project_dir:
        return ""
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            ["git", "-C", project_dir, "rev-parse", "--abbrev-ref", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except Exception:
        return ""

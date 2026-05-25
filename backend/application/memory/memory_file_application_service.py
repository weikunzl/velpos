from __future__ import annotations

import asyncio
import os
from pathlib import Path

from domain.shared.business_exception import BusinessException


class MemoryFileApplicationService:
    """Application service for Claude Code project memory file CRUD."""

    @staticmethod
    def _get_memory_dir(project_dir: str) -> Path | None:
        """Resolve the Claude Code project memory directory for a given project_dir."""
        from claude_agent_sdk._internal.sessions import _canonicalize_path, _find_project_dir

        canonical = _canonicalize_path(project_dir)
        proj_dir = _find_project_dir(canonical)
        if proj_dir is None:
            return None
        return proj_dir / "memory"

    async def list_files(self, project_dir: str) -> dict:
        """List all memory files with preview."""
        mem_dir = self._get_memory_dir(project_dir)
        if mem_dir is None or not mem_dir.exists():
            return {"files": [], "index": ""}

        def _scan():
            files = []
            for f in sorted(mem_dir.iterdir()):
                if f.is_file() and f.suffix == ".md" and f.name != "MEMORY.md":
                    try:
                        text = f.read_text(encoding="utf-8")
                        preview = text[:200] + ("..." if len(text) > 200 else "")
                        files.append({"name": f.name, "preview": preview, "size": len(text)})
                    except Exception:
                        files.append({"name": f.name, "preview": "(read error)", "size": 0})
            index_path = mem_dir / "MEMORY.md"
            index_content = ""
            if index_path.exists():
                try:
                    index_content = index_path.read_text(encoding="utf-8")
                except Exception:
                    pass
            return files, index_content

        files, index_content = await asyncio.to_thread(_scan)
        return {"files": files, "index": index_content}

    async def read_index(self, project_dir: str) -> str:
        """Read MEMORY.md index file."""
        mem_dir = self._get_memory_dir(project_dir)
        if mem_dir is None:
            return ""

        index_path = mem_dir / "MEMORY.md"
        if not index_path.exists():
            return ""

        return await asyncio.to_thread(index_path.read_text, "utf-8")

    async def read_file(self, project_dir: str, filename: str) -> dict:
        """Read a specific memory file."""
        mem_dir = self._get_memory_dir(project_dir)
        if mem_dir is None:
            raise BusinessException("Memory directory not found")

        file_path = mem_dir / filename
        if not file_path.resolve().is_relative_to(mem_dir.resolve()):
            raise BusinessException("Invalid filename")

        if not file_path.exists() or not file_path.is_file():
            raise BusinessException("File not found")

        content = await asyncio.to_thread(file_path.read_text, "utf-8")
        return {"name": filename, "content": content}

    async def write_file(self, project_dir: str, filename: str, content: str) -> dict:
        """Create or update a memory file."""
        mem_dir = self._get_memory_dir(project_dir)
        if mem_dir is None:
            raise BusinessException("Memory directory not found")

        file_path = mem_dir / filename
        if not file_path.resolve().is_relative_to(mem_dir.resolve()):
            raise BusinessException("Invalid filename")

        def _write():
            os.makedirs(mem_dir, exist_ok=True)
            file_path.write_text(content, encoding="utf-8")

        await asyncio.to_thread(_write)
        return {"name": filename}

    async def write_index(self, project_dir: str, content: str) -> dict:
        """Update MEMORY.md index file."""
        mem_dir = self._get_memory_dir(project_dir)
        if mem_dir is None:
            raise BusinessException("Memory directory not found")

        def _write():
            os.makedirs(mem_dir, exist_ok=True)
            index_path = mem_dir / "MEMORY.md"
            index_path.write_text(content, encoding="utf-8")

        await asyncio.to_thread(_write)
        return {"name": "MEMORY.md"}

    async def delete_file(self, project_dir: str, filename: str) -> dict:
        """Delete a memory file."""
        mem_dir = self._get_memory_dir(project_dir)
        if mem_dir is None:
            raise BusinessException("Memory directory not found")

        file_path = mem_dir / filename
        if not file_path.resolve().is_relative_to(mem_dir.resolve()):
            raise BusinessException("Invalid filename")

        if not file_path.exists():
            raise BusinessException("File not found")

        await asyncio.to_thread(file_path.unlink)
        return {"name": filename}

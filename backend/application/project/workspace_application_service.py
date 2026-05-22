from __future__ import annotations

import asyncio
import io
import logging
import os
import re
import zipfile
from pathlib import Path
from typing import Any

from application.git_helpers import run_git
from domain.project.repository.project_repository import ProjectRepository
from domain.shared.business_exception import BusinessException

logger = logging.getLogger(__name__)


class WorkspaceApplicationService:

    def __init__(
        self,
        project_repository: ProjectRepository,
    ) -> None:
        self._project_repository = project_repository

    async def _get_project(self, project_id: str):
        project = await self._project_repository.find_by_id(project_id)
        if project is None:
            raise BusinessException("Project not found", "PROJECT_NOT_FOUND")
        return project

    async def list_workspace_files(
        self,
        project_id: str,
        changed_only: bool = False,
        keyword: str = "",
    ) -> list[dict[str, Any]]:
        project = await self._get_project(project_id)
        root = Path(project.dir_path).resolve()
        statuses = await self._workspace_git_status(root)
        keyword = keyword.strip().lower()
        files: list[dict[str, Any]] = []

        paths = [root / p for p in statuses] if changed_only else [p for p in root.rglob("*") if p.is_file()]
        for path in paths:
            resolved = path.resolve()
            if not self._is_inside_project(root, resolved):
                continue
            if any(part in {".git", "node_modules", "__pycache__", ".venv", "dist"} for part in resolved.relative_to(root).parts):
                continue
            rel_path = resolved.relative_to(root).as_posix()
            if keyword and keyword not in rel_path.lower():
                continue
            try:
                stat = resolved.stat()
            except FileNotFoundError:
                continue
            files.append({
                "path": rel_path,
                "type": "file",
                "size": stat.st_size,
                "git_status": statuses.get(rel_path, ""),
                "is_changed": rel_path in statuses,
            })

        files.sort(key=lambda item: (not item["is_changed"], item["path"]))
        return files[:500]

    async def read_workspace_file(self, project_id: str, path: str) -> dict[str, Any]:
        project = await self._get_project(project_id)
        root = Path(project.dir_path).resolve()
        file_path = self._resolve_workspace_path(root, path)
        if not file_path.is_file():
            raise BusinessException("File not found", "FILE_NOT_FOUND")

        raw = await asyncio.to_thread(file_path.read_bytes)
        rel_path = file_path.relative_to(root).as_posix()
        return self._workspace_content_response(rel_path, raw)

    async def read_workspace_file_raw(self, project_id: str, path: str) -> Path:
        project = await self._get_project(project_id)
        root = Path(project.dir_path).resolve()
        file_path = self._resolve_workspace_path(root, path)
        if not file_path.is_file():
            raise BusinessException("File not found", "FILE_NOT_FOUND")
        return file_path

    async def get_workspace_diff(self, project_id: str, path: str) -> dict[str, Any]:
        project = await self._get_project(project_id)
        root = Path(project.dir_path).resolve()
        file_path = self._resolve_workspace_path(root, path)
        rel_path = file_path.relative_to(root).as_posix()
        if not os.path.isdir(root / ".git"):
            return {"path": rel_path, "patch": "", "truncated": False}

        result = await run_git(str(root), "diff", "--", rel_path)
        patch = result.stdout if result.ok else ""
        max_patch_len = 12000
        return {
            "path": rel_path,
            "patch": patch[:max_patch_len],
            "truncated": len(patch) > max_patch_len,
        }

    async def list_workspace_file_history(
        self,
        project_id: str,
        path: str,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        project = await self._get_project(project_id)
        root = Path(project.dir_path).resolve()
        file_path = self._resolve_workspace_path(root, path)
        rel_path = file_path.relative_to(root).as_posix()
        if not os.path.isdir(root / ".git"):
            return []

        result = await run_git(
            str(root), "log", "--follow", f"--max-count={limit}",
            "--format=%H%x1f%h%x1f%ct%x1f%an%x1f%s", "--", rel_path,
        )
        if not result.ok:
            return []
        commits: list[dict[str, Any]] = []
        for line in result.stdout.splitlines():
            parts = line.split("\x1f", 4)
            if len(parts) != 5:
                continue
            full_hash, short_hash, commit_time, author_name, message = parts
            commits.append({
                "ref": full_hash,
                "hash": full_hash,
                "short_hash": short_hash,
                "commit_time": int(commit_time or 0),
                "author_name": author_name,
                "message": message,
            })
        return commits

    async def read_workspace_file_at_ref(
        self,
        project_id: str,
        path: str,
        ref: str,
    ) -> dict[str, Any]:
        project = await self._get_project(project_id)
        root = Path(project.dir_path).resolve()
        file_path = self._resolve_workspace_path(root, path)
        rel_path = file_path.relative_to(root).as_posix()
        if not os.path.isdir(root / ".git"):
            raise BusinessException("Not a git repository", "NOT_GIT_REPO")
        proc = await asyncio.create_subprocess_exec(
            "git", "-C", str(root), "show", f"{ref}:{rel_path}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return {
                "path": rel_path,
                "content": "",
                "encoding": "utf-8",
                "size": 0,
                "truncated": False,
                "is_binary": False,
                "missing": True,
            }
        return self._workspace_content_response(rel_path, stdout)

    async def export_workspace_selection(
        self,
        project_id: str,
        paths: list[str],
    ) -> tuple[str, bytes]:
        project = await self._get_project(project_id)
        root = Path(project.dir_path).resolve()
        normalized_paths = [path.strip().strip("/") for path in paths if path and path.strip()]
        if not normalized_paths:
            raise BusinessException("No files selected", "NO_WORKSPACE_SELECTION")

        targets: list[Path] = []
        for path in normalized_paths:
            target = self._resolve_workspace_path(root, path)
            if not target.exists():
                raise BusinessException(f"Workspace path not found: {path}", "WORKSPACE_PATH_NOT_FOUND")
            targets.append(target)

        def build_zip() -> bytes:
            buffer = io.BytesIO()
            written: set[str] = set()
            with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
                for target in targets:
                    if target.is_file():
                        self._write_workspace_zip_file(root, target, archive, written)
                    elif target.is_dir():
                        if self._should_skip_workspace_path(root, target):
                            continue
                        rel_dir = target.relative_to(root).as_posix().rstrip("/")
                        if rel_dir and rel_dir not in written:
                            archive.writestr(f"{rel_dir}/", b"")
                            written.add(rel_dir)
                        for child in target.rglob("*"):
                            if child.is_file():
                                self._write_workspace_zip_file(root, child, archive, written)
            return buffer.getvalue()

        content = await asyncio.to_thread(build_zip)
        if not content:
            raise BusinessException("Selected paths contain no files", "EMPTY_WORKSPACE_SELECTION")
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", project.name).strip("-._") or "workspace"
        return f"{safe_name}-export.zip", content

    def _should_skip_workspace_path(self, root: Path, path: Path) -> bool:
        return any(part in {".git", "node_modules", "__pycache__", ".venv", "dist"} for part in path.relative_to(root).parts)

    def _write_workspace_zip_file(
        self,
        root: Path,
        path: Path,
        archive: zipfile.ZipFile,
        written: set[str],
    ) -> None:
        resolved = path.resolve()
        if not self._is_inside_project(root, resolved):
            return
        rel_path = resolved.relative_to(root).as_posix()
        if self._should_skip_workspace_path(root, resolved):
            return
        if rel_path in written:
            return
        archive.write(resolved, rel_path)
        written.add(rel_path)

    def _workspace_content_response(self, rel_path: str, raw: bytes) -> dict[str, Any]:
        max_size = 200_000
        is_binary = b"\0" in raw[:4096]
        content = "" if is_binary else raw[:max_size].decode("utf-8", errors="replace")
        return {
            "path": rel_path,
            "content": content,
            "encoding": "binary" if is_binary else "utf-8",
            "size": len(raw),
            "truncated": len(raw) > max_size,
            "is_binary": is_binary,
        }

    async def _workspace_git_status(self, root: Path) -> dict[str, str]:
        if not os.path.isdir(root / ".git"):
            return {}
        result = await run_git(str(root), "status", "--porcelain")
        if not result.ok:
            return {}
        statuses: dict[str, str] = {}
        for line in result.stdout.splitlines():
            if len(line) < 4:
                continue
            status = line[:2].strip()
            path = line[3:]
            if " -> " in path:
                path = path.split(" -> ", 1)[1]
            statuses[path] = status
        return statuses

    @staticmethod
    def _is_inside_project(root: Path, path: Path) -> bool:
        return path == root or root in path.parents

    def _resolve_workspace_path(self, root: Path, path: str) -> Path:
        target = (root / path).resolve()
        if not self._is_inside_project(root, target):
            raise BusinessException("Path is outside project", "INVALID_WORKSPACE_PATH")
        return target

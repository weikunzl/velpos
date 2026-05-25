from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path, PurePosixPath

from domain.shared.business_exception import BusinessException


class RuleFileApplicationService:
    """Application service for Claude Code project rule file CRUD."""

    @staticmethod
    def _get_rules_dir(project_dir: str) -> Path | None:
        project_path = Path(project_dir).expanduser().resolve()
        if not project_path.is_dir():
            return None
        return project_path / ".claude" / "rules"

    @staticmethod
    def _resolve_rule_file(rules_dir: Path, rule_path: str) -> Path | None:
        path = PurePosixPath(rule_path)
        if not rule_path or path.is_absolute() or path.suffix.lower() != ".md" or ".." in path.parts:
            return None
        file_path = (rules_dir / Path(*path.parts)).resolve()
        rules_root = rules_dir.resolve()
        if not file_path.is_relative_to(rules_root):
            return None
        return file_path

    @staticmethod
    def _validate_rule_paths(paths: list[str]) -> list[str] | None:
        cleaned = []
        for item in paths:
            value = item.strip()
            path = PurePosixPath(value)
            if not value or path.is_absolute() or ".." in path.parts:
                return None
            cleaned.append(value)
        return cleaned

    @staticmethod
    def _parse_rule_markdown(raw: str) -> tuple[list[str], str]:
        if not raw.startswith("---\n"):
            return [], raw
        end = raw.find("\n---", 4)
        if end < 0:
            return [], raw
        frontmatter = raw[4:end].splitlines()
        content_start = end + len("\n---")
        if raw[content_start:content_start + 1] == "\n":
            content_start += 1
        paths = []
        in_paths = False
        for line in frontmatter:
            stripped = line.strip()
            if stripped == "paths:":
                in_paths = True
                continue
            if in_paths and stripped.startswith("-"):
                paths.append(stripped[1:].strip().strip('"').strip("'"))
            elif in_paths and stripped:
                in_paths = False
        return paths, raw[content_start:]

    @staticmethod
    def _compose_rule_markdown(content: str, paths: list[str]) -> str:
        if not paths:
            return content
        lines = ["---", "paths:"]
        lines.extend(f"  - {json.dumps(path, ensure_ascii=False)}" for path in paths)
        lines.append("---")
        lines.append(content)
        return "\n".join(lines)

    @staticmethod
    def _rule_to_dict(file_path: Path, rules_dir: Path) -> dict:
        raw = file_path.read_text(encoding="utf-8")
        paths, content = RuleFileApplicationService._parse_rule_markdown(raw)
        relative_path = file_path.relative_to(rules_dir).as_posix()
        return {
            "path": relative_path,
            "name": file_path.name,
            "content": content,
            "paths": paths,
            "size": len(raw),
            "updated_time": file_path.stat().st_mtime,
        }

    async def list_rules(self, project_dir: str) -> list[dict]:
        """List all rule files in the project."""
        rules_dir = self._get_rules_dir(project_dir)
        if rules_dir is None or not rules_dir.exists():
            return []

        def _scan():
            result = []
            for file_path in sorted(rules_dir.rglob("*.md")):
                if file_path.is_file():
                    result.append(self._rule_to_dict(file_path, rules_dir))
            return result

        return await asyncio.to_thread(_scan)

    async def read_rule(self, project_dir: str, rule_path: str) -> dict:
        """Read a specific rule file."""
        rules_dir = self._get_rules_dir(project_dir)
        if rules_dir is None:
            raise BusinessException("Project directory not found")
        file_path = self._resolve_rule_file(rules_dir, rule_path)
        if file_path is None:
            raise BusinessException("Invalid rule path")
        if not file_path.exists() or not file_path.is_file():
            raise BusinessException("Rule not found")
        return await asyncio.to_thread(self._rule_to_dict, file_path, rules_dir)

    async def write_rule(self, project_dir: str, rule_path: str, content: str, paths: list[str]) -> dict:
        """Create or update a rule file."""
        rules_dir = self._get_rules_dir(project_dir)
        if rules_dir is None:
            raise BusinessException("Project directory not found")
        file_path = self._resolve_rule_file(rules_dir, rule_path)
        if file_path is None:
            raise BusinessException("Invalid rule path")
        validated_paths = self._validate_rule_paths(paths)
        if validated_paths is None:
            raise BusinessException("Invalid paths")

        def _write():
            os.makedirs(file_path.parent, exist_ok=True)
            file_path.write_text(self._compose_rule_markdown(content, validated_paths), encoding="utf-8")
            return self._rule_to_dict(file_path, rules_dir)

        return await asyncio.to_thread(_write)

    async def delete_rule(self, project_dir: str, rule_path: str) -> str:
        """Delete a rule file. Returns the deleted rule path."""
        rules_dir = self._get_rules_dir(project_dir)
        if rules_dir is None:
            raise BusinessException("Project directory not found")
        file_path = self._resolve_rule_file(rules_dir, rule_path)
        if file_path is None:
            raise BusinessException("Invalid rule path")
        if not file_path.exists() or not file_path.is_file():
            raise BusinessException("Rule not found")

        await asyncio.to_thread(file_path.unlink)
        return rule_path

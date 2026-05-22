from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import Any, Awaitable, Callable

from domain.shared.async_utils import safe_create_task
from application.project.command.init_plugin_command import InitPluginCommand
from application.session.command.run_query_command import RunQueryCommand
from application.session.session_application_service import SessionApplicationService
from domain.project.model.plugin_init_status import PluginInitStatus
from domain.project.model.plugin_type import PluginType
from domain.project.model.project import Project
from domain.project.repository.project_repository import ProjectRepository
from domain.shared.business_exception import BusinessException
from infr.im.lark.lark_init_spec import PLUGIN_INIT_SPECS

logger = logging.getLogger(__name__)

_SECTION_BEGIN = "# === VP {tag} ==="
_SECTION_END = "# === End VP {tag} ==="


def _write_claude_md_section(path: str, tag: str, content: str) -> None:
    existing = ""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            existing = f.read()

    begin = _SECTION_BEGIN.format(tag=tag)
    end = _SECTION_END.format(tag=tag)
    section = f"\n{begin}\n{content}\n{end}\n"

    pattern = re.compile(
        re.escape(begin) + r".*?" + re.escape(end),
        re.DOTALL,
    )
    if pattern.search(existing):
        updated = pattern.sub(section.strip(), existing)
    else:
        updated = existing.rstrip() + "\n" + section if existing.strip() else section.lstrip("\n")

    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)


def _remove_claude_md_section(path: str, tag: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        existing = f.read()

    begin = _SECTION_BEGIN.format(tag=tag)
    end = _SECTION_END.format(tag=tag)
    pattern = re.compile(
        r"\n?" + re.escape(begin) + r".*?" + re.escape(end) + r"\n?",
        re.DOTALL,
    )
    updated = pattern.sub("", existing)
    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)


class PluginInitApplicationService:

    def __init__(
        self,
        project_repository: ProjectRepository,
        session_service_factory: Callable[[], Awaitable[SessionApplicationService]],
        lark_config: Any = None,
    ) -> None:
        self._project_repository = project_repository
        self._session_service_factory = session_service_factory
        self._lark_config = lark_config

    async def reset_plugin(self, project_id: str, plugin_type_str: str) -> Project:
        project = await self._project_repository.find_by_id(project_id)
        if project is None:
            raise BusinessException("Project not found", "PROJECT_NOT_FOUND")
        plugin_type = PluginType(plugin_type_str)
        project.reset_plugin(plugin_type)
        await self._project_repository.save(project)

        claude_md_path = os.path.join(project.dir_path, "CLAUDE.md")
        await asyncio.to_thread(_remove_claude_md_section, claude_md_path, f"Plugin:{plugin_type.value}")

        logger.info("Plugin reset: project=%s, type=%s", project_id, plugin_type.value)
        return project

    async def init_plugin(self, command: InitPluginCommand) -> Project:
        project = await self._project_repository.find_by_id(command.project_id)
        if project is None:
            raise BusinessException("Project not found", "PROJECT_NOT_FOUND")

        plugin_type = PluginType(command.plugin_type)

        if project.get_plugin_init_status(plugin_type) == PluginInitStatus.INITIALIZING:
            raise BusinessException(
                "Plugin init is already in progress", "PLUGIN_ALREADY_RUNNING"
            )

        spec = PLUGIN_INIT_SPECS.get(plugin_type)
        if spec is None:
            raise BusinessException(
                f"Unknown plugin type: {command.plugin_type}", "UNKNOWN_PLUGIN_TYPE"
            )

        await self._check_prerequisites(spec, project.dir_path)

        api_base_url = ""
        if self._lark_config:
            api_base_url = self._lark_config.api_base_url
        claude_md_content = spec.claude_md_template.format(api_base_url=api_base_url)
        claude_md_path = os.path.join(project.dir_path, "CLAUDE.md")
        await asyncio.to_thread(os.makedirs, project.dir_path, exist_ok=True)
        await asyncio.to_thread(_write_claude_md_section, claude_md_path, f"Plugin:{plugin_type.value}", claude_md_content)

        init_session_id = command.session_id

        project.start_plugin_init(plugin_type, init_session_id)
        await self._project_repository.save(project)

        init_md_content = self._read_init_md(spec.init_md_path)
        if init_md_content:
            init_md_content = init_md_content.replace(
                "PF_API_BASE_URL", api_base_url
            ).replace(
                "PF_SESSION_ID", init_session_id
            )
            safe_create_task(
                self._send_plugin_init_prompt(
                    init_session_id, init_md_content,
                    command.project_id, plugin_type,
                )
            )

        logger.info(
            "Plugin init started: project=%s, type=%s, session=%s",
            project.id, plugin_type.value, init_session_id,
        )
        return project

    async def _check_prerequisites(self, spec, project_dir: str) -> None:
        for cmd in spec.prereq_commands:
            try:
                proc = await asyncio.create_subprocess_shell(
                    cmd,
                    cwd=project_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await proc.communicate()
                if proc.returncode != 0:
                    hint = f" Install: {spec.prereq_install}" if spec.prereq_install else ""
                    raise BusinessException(
                        f"Prerequisite check failed: `{cmd}` exited with code {proc.returncode}.{hint}",
                        "PREREQ_FAILED",
                    )
            except FileNotFoundError:
                hint = f" Install: {spec.prereq_install}" if spec.prereq_install else ""
                raise BusinessException(
                    f"Prerequisite not found: `{cmd}`.{hint}",
                    "PREREQ_FAILED",
                )

    @staticmethod
    def _read_init_md(path: str) -> str:
        if not path:
            return ""
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        full_path = os.path.join(backend_dir, path)
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("Init MD not found: %s", full_path)
            return ""

    async def _send_plugin_init_prompt(
        self, init_session_id: str, init_md_content: str,
        project_id: str, plugin_type: PluginType,
    ) -> None:
        svc = None
        try:
            svc = await self._session_service_factory()
            await svc.set_permission_mode(init_session_id, "bypassPermissions")
            try:
                await svc.run_claude_query(
                    RunQueryCommand(session_id=init_session_id, prompt=init_md_content)
                )
            finally:
                await svc.set_permission_mode(init_session_id, "default")
            await svc.commit()

            logger.info(
                "Plugin init prompt sent: project=%s, type=%s (awaiting explicit completion)",
                project_id, plugin_type.value,
            )
        except Exception:
            logger.error(
                "Failed to send plugin init prompt: session=%s",
                init_session_id, exc_info=True,
            )
            try:
                await self._auto_fail_plugin_init(project_id, plugin_type)
            except Exception:
                logger.warning(
                    "Auto-fail plugin init failed: project=%s", project_id, exc_info=True
                )
        finally:
            if svc is not None:
                await svc.close()

    async def _auto_fail_plugin_init(
        self, project_id: str, plugin_type: PluginType,
    ) -> None:
        from infr.config.database import async_session_factory
        from infr.repository.project_repository_impl import ProjectRepositoryImpl

        async with async_session_factory() as db_session:
            repo = ProjectRepositoryImpl(db_session)
            project = await repo.find_by_id(project_id)
            if project is None:
                return
            if project.get_plugin_init_status(plugin_type) == PluginInitStatus.INITIALIZING:
                project.fail_plugin_init(plugin_type)
                await repo.save(project)
                await db_session.commit()
                logger.info(
                    "Plugin init auto-failed: project=%s, type=%s",
                    project_id, plugin_type.value,
                )

    async def complete_plugin_init(
        self, project_id: str, plugin_type_str: str,
    ) -> Project:
        project = await self._project_repository.find_by_id(project_id)
        if project is None:
            raise BusinessException("Project not found", "PROJECT_NOT_FOUND")

        plugin_type = PluginType(plugin_type_str)

        if project.get_plugin_init_status(plugin_type) != PluginInitStatus.INITIALIZING:
            raise BusinessException(
                "Plugin init is not in progress", "PLUGIN_NOT_INITIALIZING"
            )

        project.complete_plugin_init(plugin_type)
        await self._project_repository.save(project)
        logger.info(
            "Plugin init completed: project=%s, type=%s",
            project_id, plugin_type.value,
        )
        return project

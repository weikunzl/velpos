from __future__ import annotations

import logging
from typing import Any, TYPE_CHECKING

from claude_agent_sdk import create_sdk_mcp_server, tool

if TYPE_CHECKING:
    from application.team_task.team_coordinator_service import TeamCoordinatorService

logger = logging.getLogger(__name__)


def _mcp_ok(text: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": text}]}


def _mcp_err(text: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": text}], "is_error": True}


def create_team_coordinator_mcp(
    coordinator_service: "TeamCoordinatorService",
    project_id: str,
    coordinator_session_id: str,
    trace_id: str = "",
) -> Any:
    """Create an in-process MCP server with team coordination tools.

    This MCP is injected into the coordinator session so Claude can dispatch
    tasks to team members.
    """

    @tool(
        "team_dispatch",
        "Dispatch a sub-task to a team member by role. "
        "The worker will execute the task and return a result summary.",
        {
            "role": str,
            "prompt": str,
            "context": str,
        },
    )
    async def team_dispatch(args: dict[str, Any]) -> dict[str, Any]:
        role = args.get("role", "")
        prompt = args.get("prompt", "")
        context = args.get("context", "")

        if not role or not prompt:
            return _mcp_err("Error: both 'role' and 'prompt' are required.")

        try:
            result = await coordinator_service.dispatch_task(
                main_project_id=project_id,
                coordinator_session_id=coordinator_session_id,
                target_role=role,
                prompt=prompt,
                context=context,
                trace_id=trace_id,
            )
            return _mcp_ok(result)
        except Exception as e:
            logger.error(
                "team_dispatch failed: project=%s, role=%s, error=%s",
                project_id, role, e,
                exc_info=True,
            )
            return _mcp_err(f"Dispatch failed: {e}")

    @tool(
        "team_task_status",
        "Check the status of all dispatched tasks for the current coordinator session.",
        {},
    )
    async def team_task_status(_args: dict[str, Any]) -> dict[str, Any]:
        try:
            status_text = await coordinator_service.get_tasks_status(
                coordinator_session_id=coordinator_session_id,
            )
            return _mcp_ok(status_text)
        except Exception as e:
            return _mcp_err(f"Status check failed: {e}")

    @tool(
        "team_dispatch_batch",
        "Dispatch multiple independent sub-tasks in parallel. "
        "Use this when tasks have no dependencies between them. "
        "Respects the team's max_concurrent setting.",
        {
            "tasks": list,
        },
    )
    async def team_dispatch_batch(args: dict[str, Any]) -> dict[str, Any]:
        tasks_input = args.get("tasks", [])
        if not tasks_input or not isinstance(tasks_input, list):
            return _mcp_err("Error: 'tasks' must be a non-empty list.")

        try:
            results = await coordinator_service.dispatch_batch(
                main_project_id=project_id,
                coordinator_session_id=coordinator_session_id,
                tasks_input=tasks_input,
                trace_id=trace_id,
            )
            combined = "\n\n---\n\n".join(
                f"## Task {i+1}: {tasks_input[i].get('role', '?')}\n\n{r}"
                for i, r in enumerate(results)
            )
            return _mcp_ok(combined)
        except Exception as e:
            logger.error(
                "team_dispatch_batch failed: project=%s, error=%s",
                project_id, e,
                exc_info=True,
            )
            return _mcp_err(f"Batch dispatch failed: {e}")

    server = create_sdk_mcp_server(
        name="team_coordinator",
        version="1.0.0",
        tools=[team_dispatch, team_dispatch_batch, team_task_status],
    )
    return server


def create_team_worker_mcp(
    coordinator_service: "TeamCoordinatorService",
    worker_session_id: str,
) -> Any:
    """Create an in-process MCP server for a worker session (collaboration mode).

    Provides the `team_ask_coordinator` tool so workers can request help.
    """

    @tool(
        "team_ask_coordinator",
        "Ask the coordinator for help. The coordinator will route your question "
        "to the appropriate team member and return the answer.",
        {
            "question": str,
            "target_role": str,
        },
    )
    async def team_ask_coordinator(args: dict[str, Any]) -> dict[str, Any]:
        question = args.get("question", "")
        target_role = args.get("target_role", "")

        if not question:
            return _mcp_err("Error: 'question' is required.")

        try:
            answer = await coordinator_service.handle_help_request(
                worker_session_id=worker_session_id,
                question=question,
                target_role=target_role,
            )
            return _mcp_ok(answer)
        except Exception as e:
            logger.error(
                "team_ask_coordinator failed: worker=%s, error=%s",
                worker_session_id, e,
                exc_info=True,
            )
            return _mcp_err(f"Help request failed: {e}")

    server = create_sdk_mcp_server(
        name="team_worker",
        version="1.0.0",
        tools=[team_ask_coordinator],
    )
    return server

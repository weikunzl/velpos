from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from claude_agent_sdk.types import HookMatcher

logger = logging.getLogger(__name__)

NotifyImFn = Callable[[str, str], Awaitable[None]]


def create_worker_hooks(
    task_id: str,
    worker_session_id: str,
    role: str,
    notify_im_fn: NotifyImFn | None = None,
) -> dict[str, list[HookMatcher]]:
    """Build SDK hooks dict for a team worker session.

    Currently registers a Stop hook that sends an IM notification
    when the worker completes.
    """
    hooks: dict[str, list[HookMatcher]] = {}

    async def on_stop(hook_input: Any, tool_use_id: str | None, context: Any) -> dict[str, Any]:
        if notify_im_fn:
            try:
                summary = f"[Team] {role} task completed (task_id={task_id})"
                await notify_im_fn(worker_session_id, summary)
            except Exception:
                logger.warning("Hook notify_im failed for task %s", task_id, exc_info=True)
        return {"continue": True}

    hooks["Stop"] = [
        HookMatcher(hooks=[on_stop]),
    ]

    return hooks

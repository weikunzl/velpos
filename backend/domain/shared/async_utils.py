from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


class KeyedLockPool:
    """Async lock pool keyed by string ID with bounded size and eviction."""

    def __init__(self, max_size: int = 500) -> None:
        self._locks: dict[str, asyncio.Lock] = {}
        self._guard = asyncio.Lock()
        self._max_size = max_size

    async def acquire(self, key: str) -> asyncio.Lock:
        async with self._guard:
            lock = self._locks.get(key)
            if lock is None:
                if len(self._locks) >= self._max_size:
                    stale = [k for k, v in self._locks.items() if not v.locked()]
                    for k in stale[: max(len(stale) // 2, 1)]:
                        del self._locks[k]
                lock = asyncio.Lock()
                self._locks[key] = lock
            return lock

    async def release(self, key: str) -> None:
        async with self._guard:
            lock = self._locks.get(key)
            if lock and not lock.locked():
                self._locks.pop(key, None)


def safe_create_task(coro, *, name: str | None = None) -> asyncio.Task:
    """Create an asyncio task with automatic exception logging.

    Fire-and-forget tasks created with plain ``asyncio.create_task`` silently
    swallow exceptions (Python only emits "Task exception was never retrieved"
    on GC).  This wrapper attaches a done-callback that logs any unhandled
    exception at ERROR level.
    """
    task = asyncio.create_task(coro, name=name)

    def _log_exception(t: asyncio.Task) -> None:
        if t.cancelled():
            return
        exc = t.exception()
        if exc is not None:
            logger.error(
                "Unhandled exception in background task %s: %s",
                t.get_name(),
                exc,
                exc_info=exc,
            )

    task.add_done_callback(_log_exception)
    return task

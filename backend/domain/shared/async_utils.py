from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


class KeyedLockPool:
    """Async lock pool keyed by string ID with bounded size and eviction."""

    def __init__(self, max_size: int = 500) -> None:
        self._locks: dict[str, asyncio.Lock] = {}
        self._refcounts: dict[str, int] = {}
        self._guard = asyncio.Lock()
        self._max_size = max_size

    async def acquire(self, key: str) -> asyncio.Lock:
        async with self._guard:
            lock = self._locks.get(key)
            if lock is None:
                if len(self._locks) >= self._max_size:
                    stale = [
                        k for k, v in self._locks.items()
                        if not v.locked() and self._refcounts.get(k, 0) == 0
                    ]
                    for k in stale[: max(len(stale) // 2, 1)]:
                        del self._locks[k]
                        self._refcounts.pop(k, None)
                lock = asyncio.Lock()
                self._locks[key] = lock
            self._refcounts[key] = self._refcounts.get(key, 0) + 1
            return lock

    async def unref(self, key: str) -> None:
        """Decrement reference count for a key after the lock is no longer needed."""
        async with self._guard:
            count = self._refcounts.get(key, 0) - 1
            if count <= 0:
                self._refcounts.pop(key, None)
            else:
                self._refcounts[key] = count

    async def release(self, key: str) -> None:
        async with self._guard:
            lock = self._locks.get(key)
            if lock and not lock.locked() and self._refcounts.get(key, 0) == 0:
                self._locks.pop(key, None)
                self._refcounts.pop(key, None)


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

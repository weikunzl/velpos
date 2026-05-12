from __future__ import annotations

from enum import Enum


class TeamTaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    WAITING_FOR_HELP = "waiting_for_help"

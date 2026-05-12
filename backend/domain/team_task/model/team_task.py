from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any



from domain.team_task.model.team_task_status import TeamTaskStatus


@dataclass
class TeamTask:
    _task_id: str
    _main_project_id: str
    _coordinator_session_id: str
    _target_project_id: str
    _target_role: str
    _worker_session_id: str = ""
    _prompt: str = ""
    _context: str = ""
    _status: TeamTaskStatus = TeamTaskStatus.PENDING
    _result_summary: str = ""
    _result_data: dict[str, Any] = field(default_factory=dict)
    _error_message: str = ""
    _parent_task_id: str = ""
    _depth: int = 0
    _pipeline_step: int = -1
    _trace_id: str = ""
    _created_at: datetime = field(default_factory=datetime.now)
    _completed_at: datetime | None = None
    _duration_ms: int = 0
    _cost_usd: float = 0.0

    @property
    def task_id(self) -> str:
        return self._task_id

    @property
    def main_project_id(self) -> str:
        return self._main_project_id

    @property
    def coordinator_session_id(self) -> str:
        return self._coordinator_session_id

    @property
    def target_project_id(self) -> str:
        return self._target_project_id

    @property
    def target_role(self) -> str:
        return self._target_role

    @property
    def worker_session_id(self) -> str:
        return self._worker_session_id

    @property
    def prompt(self) -> str:
        return self._prompt

    @property
    def context(self) -> str:
        return self._context

    @property
    def status(self) -> TeamTaskStatus:
        return self._status

    @property
    def result_summary(self) -> str:
        return self._result_summary

    @property
    def result_data(self) -> dict[str, Any]:
        return dict(self._result_data)

    @property
    def error_message(self) -> str:
        return self._error_message

    @property
    def parent_task_id(self) -> str:
        return self._parent_task_id

    @property
    def depth(self) -> int:
        return self._depth

    @property
    def pipeline_step(self) -> int:
        return self._pipeline_step

    @property
    def trace_id(self) -> str:
        return self._trace_id

    @property
    def created_at(self) -> datetime:
        return self._created_at

    @property
    def completed_at(self) -> datetime | None:
        return self._completed_at

    @property
    def duration_ms(self) -> int:
        return self._duration_ms

    @property
    def cost_usd(self) -> float:
        return self._cost_usd

    @property
    def is_completed(self) -> bool:
        return self._status == TeamTaskStatus.COMPLETED

    @property
    def is_running(self) -> bool:
        return self._status in (TeamTaskStatus.RUNNING, TeamTaskStatus.WAITING_FOR_HELP)

    @classmethod
    def create(
        cls,
        main_project_id: str,
        coordinator_session_id: str,
        target_project_id: str,
        target_role: str,
        prompt: str = "",
        context: str = "",
        parent_task_id: str = "",
        depth: int = 0,
        pipeline_step: int = -1,
        trace_id: str = "",
    ) -> TeamTask:
        return cls(
            _task_id=uuid.uuid4().hex[:8],
            _main_project_id=main_project_id,
            _coordinator_session_id=coordinator_session_id,
            _target_project_id=target_project_id,
            _target_role=target_role,
            _prompt=prompt,
            _context=context,
            _status=TeamTaskStatus.PENDING,
            _parent_task_id=parent_task_id,
            _depth=depth,
            _pipeline_step=pipeline_step,
            _trace_id=trace_id,
            _created_at=datetime.now(),
        )

    @classmethod
    def reconstitute(
        cls,
        task_id: str,
        main_project_id: str,
        coordinator_session_id: str,
        target_project_id: str,
        target_role: str,
        worker_session_id: str = "",
        prompt: str = "",
        context: str = "",
        status: TeamTaskStatus = TeamTaskStatus.PENDING,
        result_summary: str = "",
        result_data: dict[str, Any] | None = None,
        error_message: str = "",
        parent_task_id: str = "",
        depth: int = 0,
        pipeline_step: int = -1,
        trace_id: str = "",
        created_at: datetime | None = None,
        completed_at: datetime | None = None,
        duration_ms: int = 0,
        cost_usd: float = 0.0,
    ) -> TeamTask:
        return cls(
            _task_id=task_id,
            _main_project_id=main_project_id,
            _coordinator_session_id=coordinator_session_id,
            _target_project_id=target_project_id,
            _target_role=target_role,
            _worker_session_id=worker_session_id,
            _prompt=prompt,
            _context=context or "",
            _status=status,
            _result_summary=result_summary,
            _result_data=result_data or {},
            _error_message=error_message,
            _parent_task_id=parent_task_id,
            _depth=depth,
            _pipeline_step=pipeline_step,
            _trace_id=trace_id,
            _created_at=created_at or datetime.now(),
            _completed_at=completed_at,
            _duration_ms=duration_ms,
            _cost_usd=cost_usd,
        )

    def start(self, worker_session_id: str) -> None:
        if self._status != TeamTaskStatus.PENDING:
            raise ValueError(f"Cannot start task in {self._status.value} status")
        self._worker_session_id = worker_session_id
        self._status = TeamTaskStatus.RUNNING

    def complete(self, result_summary: str, cost_usd: float = 0.0, duration_ms: int = 0, result_data: dict[str, Any] | None = None) -> None:
        if self._status not in (TeamTaskStatus.RUNNING, TeamTaskStatus.WAITING_FOR_HELP):
            raise ValueError(f"Cannot complete task in {self._status.value} status")
        self._result_summary = result_summary
        self._result_data = result_data or {}
        self._status = TeamTaskStatus.COMPLETED
        self._completed_at = datetime.now()
        self._duration_ms = duration_ms
        self._cost_usd = cost_usd

    def fail(self, error_message: str) -> None:
        if self._status not in (TeamTaskStatus.RUNNING, TeamTaskStatus.WAITING_FOR_HELP):
            raise ValueError(f"Cannot fail task in {self._status.value} status")
        self._error_message = error_message
        self._status = TeamTaskStatus.FAILED
        self._completed_at = datetime.now()

    def cancel(self) -> None:
        if self._status in (TeamTaskStatus.COMPLETED, TeamTaskStatus.FAILED, TeamTaskStatus.CANCELLED):
            return
        self._status = TeamTaskStatus.CANCELLED
        self._completed_at = datetime.now()

    def wait_for_help(self) -> None:
        if self._status != TeamTaskStatus.RUNNING:
            raise ValueError(f"Cannot wait for help in {self._status.value} status")
        self._status = TeamTaskStatus.WAITING_FOR_HELP

    def resume_from_help(self) -> None:
        if self._status != TeamTaskStatus.WAITING_FOR_HELP:
            raise ValueError(f"Cannot resume from help in {self._status.value} status")
        self._status = TeamTaskStatus.RUNNING

    def to_timeline_entry(self) -> dict[str, Any]:
        return {
            "task_id": self._task_id,
            "target_project_id": self._target_project_id,
            "target_role": self._target_role,
            "worker_session_id": self._worker_session_id,
            "prompt": self._prompt,
            "status": self._status.value,
            "result_summary": self._result_summary,
            "result_data": self._result_data,
            "error_message": self._error_message,
            "pipeline_step": self._pipeline_step,
            "depth": self._depth,
            "parent_task_id": self._parent_task_id,
            "trace_id": self._trace_id,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "completed_at": self._completed_at.isoformat() if self._completed_at else None,
            "duration_ms": self._duration_ms,
            "cost_usd": self._cost_usd,
        }

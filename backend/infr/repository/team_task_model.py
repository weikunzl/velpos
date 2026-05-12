from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from infr.config.base import Base


class TeamTaskModel(Base):
    __tablename__ = "team_tasks"

    task_id: Mapped[str] = mapped_column(
        String(8), primary_key=True,
    )
    main_project_id: Mapped[str] = mapped_column(
        String(8), nullable=False, index=True,
    )
    coordinator_session_id: Mapped[str] = mapped_column(
        String(8), nullable=False, index=True,
    )
    target_project_id: Mapped[str] = mapped_column(
        String(8), nullable=False,
    )
    target_role: Mapped[str] = mapped_column(
        String(64), nullable=False,
    )
    worker_session_id: Mapped[str] = mapped_column(
        String(8), nullable=False, default="", server_default="",
    )
    prompt: Mapped[str] = mapped_column(
        Text, nullable=False, default="",
    )
    context_json: Mapped[str] = mapped_column(
        Text, nullable=False, default="",
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", server_default="pending",
    )
    result_summary: Mapped[str] = mapped_column(
        Text, nullable=False, default="",
    )
    result_data_json: Mapped[str] = mapped_column(
        JSON, nullable=True,
    )
    error_message: Mapped[str] = mapped_column(
        Text, nullable=False, default="",
    )
    parent_task_id: Mapped[str] = mapped_column(
        String(8), nullable=False, default="", server_default="",
    )
    depth: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
    )
    pipeline_step: Mapped[int] = mapped_column(
        Integer, nullable=False, default=-1, server_default="-1",
    )
    trace_id: Mapped[str] = mapped_column(
        String(8), nullable=False, default="", server_default="",
    )
    created_time: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now,
    )
    completed_time: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True,
    )
    duration_ms: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
    )
    cost_usd: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0, server_default="0",
    )

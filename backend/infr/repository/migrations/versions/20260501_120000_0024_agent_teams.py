"""Add agent teams support.

Revision ID: 0024_agent_teams
Revises: 0023_session_timeline_events
Create Date: 2026-05-01 12:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "0024_agent_teams"
down_revision = "0023_session_timeline_events"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = DATABASE() "
            "AND table_name = :table AND column_name = :column"
        ),
        {"table": table_name, "column": column_name},
    )
    return result.scalar() > 0


def _table_exists(table_name: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = :table"
        ),
        {"table": table_name},
    )
    return result.scalar() > 0


def upgrade() -> None:
    if not _column_exists("projects", "project_type"):
        op.add_column(
            "projects",
            sa.Column(
                "project_type",
                sa.String(16),
                nullable=False,
                server_default="single",
            ),
        )

    if not _column_exists("projects", "team_config_json"):
        op.add_column(
            "projects",
            sa.Column("team_config_json", mysql.JSON, nullable=True),
        )

    if not _column_exists("sessions", "team_task_id"):
        op.add_column(
            "sessions",
            sa.Column(
                "team_task_id",
                sa.String(8),
                nullable=False,
                server_default="",
            ),
        )

    if not _table_exists("team_tasks"):
        op.create_table(
            "team_tasks",
            sa.Column("task_id", sa.String(8), primary_key=True),
            sa.Column("main_project_id", sa.String(8), nullable=False),
            sa.Column("coordinator_session_id", sa.String(8), nullable=False),
            sa.Column("target_project_id", sa.String(8), nullable=False),
            sa.Column("target_role", sa.String(64), nullable=False),
            sa.Column(
                "worker_session_id",
                sa.String(8),
                nullable=False,
                server_default="",
            ),
            sa.Column("prompt", sa.Text, nullable=False),
            sa.Column("context_json", mysql.JSON, nullable=True),
            sa.Column(
                "status",
                sa.String(32),
                nullable=False,
                server_default="pending",
            ),
            sa.Column("result_summary", sa.Text, nullable=False),
            sa.Column("error_message", sa.Text, nullable=False),
            sa.Column(
                "parent_task_id",
                sa.String(8),
                nullable=False,
                server_default="",
            ),
            sa.Column(
                "depth", sa.Integer, nullable=False, server_default="0"
            ),
            sa.Column(
                "pipeline_step", sa.Integer, nullable=False, server_default="-1"
            ),
            sa.Column(
                "created_time", sa.DateTime, nullable=False,
            ),
            sa.Column("completed_time", sa.DateTime, nullable=True),
            sa.Column(
                "duration_ms", sa.Integer, nullable=False, server_default="0"
            ),
            sa.Column(
                "cost_usd", sa.Float, nullable=False, server_default="0"
            ),
        )
        op.create_index(
            "ix_team_tasks_main_project_id",
            "team_tasks",
            ["main_project_id"],
        )
        op.create_index(
            "ix_team_tasks_coordinator_session_id",
            "team_tasks",
            ["coordinator_session_id"],
        )


def downgrade() -> None:
    op.drop_table("team_tasks")
    op.drop_column("sessions", "team_task_id")
    op.drop_column("projects", "team_config_json")
    op.drop_column("projects", "project_type")

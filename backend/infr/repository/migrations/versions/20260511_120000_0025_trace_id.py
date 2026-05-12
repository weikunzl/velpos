"""Add trace_id to sessions and team_tasks.

Revision ID: 0025_trace_id
Revises: 5d755a80f252
Create Date: 2026-05-11 12:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0025_trace_id"
down_revision = "5d755a80f252"
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


def upgrade() -> None:
    if not _column_exists("sessions", "trace_id"):
        op.add_column(
            "sessions",
            sa.Column(
                "trace_id",
                sa.String(8),
                nullable=False,
                server_default="",
            ),
        )

    if not _column_exists("team_tasks", "trace_id"):
        op.add_column(
            "team_tasks",
            sa.Column(
                "trace_id",
                sa.String(8),
                nullable=False,
                server_default="",
            ),
        )


def downgrade() -> None:
    if _column_exists("team_tasks", "trace_id"):
        op.drop_column("team_tasks", "trace_id")
    if _column_exists("sessions", "trace_id"):
        op.drop_column("sessions", "trace_id")

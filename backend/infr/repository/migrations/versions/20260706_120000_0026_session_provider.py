"""Add provider to sessions.

Revision ID: 0026_session_provider
Revises: 0025_trace_id
Create Date: 2026-07-06 12:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0026_session_provider"
down_revision = "0025_trace_id"
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
    if not _column_exists("sessions", "provider"):
        op.add_column(
            "sessions",
            sa.Column(
                "provider",
                sa.String(32),
                nullable=False,
                server_default="claude",
            ),
        )


def downgrade() -> None:
    if _column_exists("sessions", "provider"):
        op.drop_column("sessions", "provider")

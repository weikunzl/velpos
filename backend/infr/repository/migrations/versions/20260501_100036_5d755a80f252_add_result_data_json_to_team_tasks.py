"""add result_data_json to team_tasks

Revision ID: 5d755a80f252
Revises: 0024_agent_teams
Create Date: 2026-05-01 10:00:36.770876

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5d755a80f252'
down_revision: Union[str, None] = '0024_agent_teams'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('team_tasks', sa.Column('result_data_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('team_tasks', 'result_data_json')

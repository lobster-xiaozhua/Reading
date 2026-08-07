"""add admin role_key and fulltext index

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-07 08:00:00.000000

- admins 表新增 role_key 字段（默认 super-admin）
- novels 表新增 FULLTEXT 索引
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("admins", sa.Column("role_key", sa.String(32), server_default="super-admin"))
    op.create_index("idx_novels_title_author_ft", "novels", ["title", "author_name"], mysql_prefix="FULLTEXT")


def downgrade() -> None:
    op.drop_index("idx_novels_title_author_ft", table_name="novels")
    op.drop_column("admins", "role_key")
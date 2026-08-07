"""add composite indexes for hot queries

Revision ID: a1b2c3d4e5f6
Revises: 0f79be455b42
Create Date: 2026-08-07 07:20:00.000000

添加核心查询复合索引，消除全表扫描：
- novels: (status, category, click_count) 分类分页
- novels: (status, click_count) 热门/排行榜
- novels: (status, is_completed) 完成筛选
- chapters: (novel_id, status) 章节列表
- comments: (novel_id, status, likes) 评论列表按点赞排序
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "0f79be455b42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index("idx_novels_status_cat_click", "novels", ["status", "category", "click_count"])
    op.create_index("idx_novels_status_click", "novels", ["status", "click_count"])
    op.create_index("idx_novels_status_completed", "novels", ["status", "is_completed"])
    op.create_index("idx_chapters_novel_status", "chapters", ["novel_id", "status"])
    op.create_index("idx_comments_novel_status_likes", "comments", ["novel_id", "status", "likes"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_comments_novel_status_likes", table_name="comments")
    op.drop_index("idx_chapters_novel_status", table_name="chapters")
    op.drop_index("idx_novels_status_completed", table_name="novels")
    op.drop_index("idx_novels_status_click", table_name="novels")
    op.drop_index("idx_novels_status_cat_click", table_name="novels")
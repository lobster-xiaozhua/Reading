"""章节仓储（§4.2.2）。"""

from sqlalchemy import func, or_, select

from app.models.novel import Chapter
from app.repositories.base import BaseRepository


class ChapterRepository(BaseRepository[Chapter]):
    model = Chapter

    async def list_by_novel(self, novel_id: int, status: str | None = None) -> list[Chapter]:
        """获取指定作品的全部章节，可按状态筛选。"""
        stmt = select(Chapter).where(Chapter.novel_id == novel_id, Chapter.deleted == 0)
        if status:
            stmt = stmt.where(Chapter.status == status)
        stmt = stmt.order_by(Chapter.index)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_novel_paged(
        self,
        novel_id: int,
        page: int = 1,
        page_size: int = 20,
        search_key: str = "",
        status: str = "all",
        sort_by: str = "index",
    ) -> tuple[list[Chapter], int, int]:
        """分页获取章节列表，支持搜索/状态筛选/排序。

        Returns:
            (章节列表, 总条数, 总字数)
        """
        base = select(Chapter).where(Chapter.novel_id == novel_id, Chapter.deleted == 0)
        count = select(func.count(Chapter.id)).where(
            Chapter.novel_id == novel_id, Chapter.deleted == 0
        )
        if search_key:
            like = f"%{search_key}%"
            condition = or_(Chapter.title.like(like))
            base = base.where(condition)
            count = count.where(condition)
        if status and status != "all":
            base = base.where(Chapter.status == status)
            count = count.where(Chapter.status == status)

        total = (await self.session.execute(count)).scalar() or 0

        if sort_by == "updatedAt":
            base = base.order_by(Chapter.updated_at.desc())
        else:
            base = base.order_by(Chapter.index)

        base = base.offset((page - 1) * page_size).limit(page_size)
        rows = (await self.session.execute(base)).scalars().all()

        words = select(func.coalesce(func.sum(Chapter.word_count), 0)).where(
            Chapter.novel_id == novel_id, Chapter.deleted == 0
        )
        total_words = (await self.session.execute(words)).scalar() or 0

        return list(rows), total, total_words

    async def get_neighbor(self, novel_id: int, index: int, direction: str) -> Chapter | None:
        """获取指定章节的上一章或下一章（prev/next）。"""
        if direction == "prev":
            stmt = (
                select(Chapter)
                .where(
                    Chapter.novel_id == novel_id,
                    Chapter.index < index,
                    Chapter.deleted == 0,
                    Chapter.status == "published",
                )
                .order_by(Chapter.index.desc())
                .limit(1)
            )
        else:
            stmt = (
                select(Chapter)
                .where(
                    Chapter.novel_id == novel_id,
                    Chapter.index > index,
                    Chapter.deleted == 0,
                    Chapter.status == "published",
                )
                .order_by(Chapter.index.asc())
                .limit(1)
            )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_neighbors(
        self, novel_id: int, index: int
    ) -> tuple[Chapter | None, Chapter | None]:
        """一次查询获取上一章和下一章（单 SQL 代替 2 次独立查询）。"""
        prev_id = (
            select(Chapter.id)
            .where(
                Chapter.novel_id == novel_id,
                Chapter.index < index,
                Chapter.deleted == 0,
                Chapter.status == "published",
            )
            .order_by(Chapter.index.desc())
            .limit(1)
            .scalar_subquery()
        )
        next_id = (
            select(Chapter.id)
            .where(
                Chapter.novel_id == novel_id,
                Chapter.index > index,
                Chapter.deleted == 0,
                Chapter.status == "published",
            )
            .order_by(Chapter.index.asc())
            .limit(1)
            .scalar_subquery()
        )
        stmt = select(Chapter).where(Chapter.id.in_([prev_id, next_id]))
        result = await self.session.execute(stmt)
        chapters = list(result.scalars().all())
        prev_ch = next((c for c in chapters if c.index < index), None)
        next_ch = next((c for c in chapters if c.index > index), None)
        return prev_ch, next_ch

    async def get_latest(self, novel_id: int) -> Chapter | None:
        """获取指定作品的最新已发布章节。"""
        stmt = (
            select(Chapter)
            .where(
                Chapter.novel_id == novel_id,
                Chapter.deleted == 0,
                Chapter.status == "published",
            )
            .order_by(Chapter.index.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_latest_batch(self, novel_ids: list[int]) -> dict[int, Chapter]:
        """批量获取多部作品的最新已发布章节，返回 {novel_id: chapter} 映射。"""
        if not novel_ids:
            return {}
        from sqlalchemy import and_
        from sqlalchemy import func as sa_func
        from sqlalchemy import select as sa_select
        max_index = (
            sa_select(
                Chapter.novel_id,
                sa_func.max(Chapter.index).label("max_index"),
            )
            .where(
                Chapter.novel_id.in_(novel_ids),
                Chapter.deleted == 0,
                Chapter.status == "published",
            )
            .group_by(Chapter.novel_id)
            .subquery()
        )
        stmt = (
            sa_select(Chapter)
            .join(
                max_index,
                and_(
                    Chapter.novel_id == max_index.c.novel_id,
                    Chapter.index == max_index.c.max_index,
                ),
            )
        )
        result = await self.session.execute(stmt)
        return {ch.novel_id: ch for ch in result.scalars().all()}

    async def reorder(self, novel_id: int, ordered_ids: list[int]) -> None:
        """重排章节顺序（两步更新避免唯一约束冲突）。"""
        # 第一步：全部移至负索引临时区
        for temp_index, cid in enumerate(ordered_ids):
            stmt = select(Chapter).where(Chapter.id == cid, Chapter.novel_id == novel_id)
            result = await self.session.execute(stmt)
            ch = result.scalars().first()
            if ch:
                ch.index = -(temp_index + 1)
        await self.session.flush()

        # 第二步：写入最终正序索引
        for new_index, cid in enumerate(ordered_ids):
            stmt = select(Chapter).where(Chapter.id == cid, Chapter.novel_id == novel_id)
            result = await self.session.execute(stmt)
            ch = result.scalars().first()
            if ch:
                ch.index = new_index
        await self.session.flush()

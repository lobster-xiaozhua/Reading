"""章节仓储（§4.2.2）。"""

from sqlalchemy import and_, func, or_, select

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

    async def get_by_ids(self, ids: list[int], *, include_deleted: bool = False) -> list[Chapter]:
        """根据 ID 批量获取章节，保持输入顺序。"""
        if not ids:
            return []
        stmt = select(Chapter).where(Chapter.id.in_(ids))
        if not include_deleted:
            stmt = stmt.where(Chapter.deleted == 0)
        result = await self.session.execute(stmt)
        by_id = {c.id: c for c in result.scalars().all()}
        return [by_id[i] for i in ids if i in by_id]

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

    async def get_latest_batch(self, novel_ids: list[int]) -> dict[int, Chapter]:
        """批量获取多部作品的最新已发布章节，返回 {novel_id: chapter} 映射。"""
        if not novel_ids:
            return {}
        max_index = (
            select(
                Chapter.novel_id,
                func.max(Chapter.index).label("max_index"),
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
            select(Chapter)
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
        """重排章节顺序（两步更新避免唯一约束冲突）。

        两步均在当前事务内 flush（未 commit），最终 commit 原子生效；
        第一步先移到负索引临时区，避免唯一约束中间态冲突。
        """
        if not ordered_ids:
            return
        result = await self.session.execute(
            select(Chapter).where(
                Chapter.id.in_(ordered_ids), Chapter.novel_id == novel_id
            )
        )
        chapters = {c.id: c for c in result.scalars().all()}

        # 第一步：写入负索引临时区
        for temp_index, cid in enumerate(ordered_ids):
            ch = chapters.get(cid)
            if ch:
                ch.index = -(temp_index + 1)
        await self.session.flush()

        # 第二步：写入最终正序索引
        for new_index, cid in enumerate(ordered_ids):
            ch = chapters.get(cid)
            if ch:
                ch.index = new_index
        await self.session.flush()

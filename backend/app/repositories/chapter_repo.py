"""章节仓储（§4.2.2）。"""

from sqlalchemy import select

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
